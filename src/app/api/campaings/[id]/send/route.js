import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import db from "@/lib/firebase";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(req, context) {
  try {
    const params = await context.params;
    const campaignId = parseInt(params.id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
    }

    // Obtener la campaña con su template y clientes asociados
    const campaign = await prisma.campanha.findUnique({
      where: { campanha_id: campaignId },
      include: { template: true, cliente_campanha: { include: { cliente: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (!campaign.template || !campaign.template.template_content_sid) {
      return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
    }

    const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    const sentMessages = [];

    const promises = campaign.cliente_campanha.map(async ({ cliente, cliente_campanha_id }) => {
      if (!cliente || !cliente.celular) {
        console.warn(`⚠ Cliente ${cliente?.nombre || "Desconocido"} no tiene un número válido.`);
        return;
      }

      let celularFormatted = `whatsapp:${cliente.celular.trim()}`;
      const contentSid = campaign.template.template_content_sid;

      let messagePayload = {
        from: twilioWhatsAppNumber,
        to: celularFormatted,
        contentSid,
        statusCallback: "https://crmreactivaciones.vercel.app/api/twilio/status"
      };

      if (campaign.template.parametro) {
        messagePayload.contentVariables = JSON.stringify({
          1: cliente.nombre,
        });
      }

      try {
        // Enviar el mensaje con Twilio
        const message = await client.messages.create(messagePayload);
        console.log(`📨 Mensaje enviado a ${cliente.celular}: ${message.sid}`);

        // Actualizar estado en cliente_campanha
        await prisma.cliente_campanha.update({
          where: { cliente_campanha_id },
          data: {
            message_sid: message.sid,
            message_status: message.status,
            last_update: new Date(),
          },
        });

        // Guardar mensaje en Firestore
        await db.collection("reactivaciones").add({
          celular: cliente.celular,
          fecha: new Date(),
          id_bot: "reactivaciones",
          id_cliente: cliente.cliente_id,
          mensaje: campaign.template.mensaje,
          sender: false,
        });

        sentMessages.push({ to: cliente.celular, status: "sent", sid: message.sid });
      } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${cliente.celular}:`, error);
        sentMessages.push({ to: cliente.celular, status: "failed", error: error.message });
      }
    });

    // Esperar todas las promesas
    await Promise.all(promises);

    return NextResponse.json({ success: true, sentMessages });
  } catch (error) {
    console.error("❌ Error en el envío de mensajes con Twilio:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
