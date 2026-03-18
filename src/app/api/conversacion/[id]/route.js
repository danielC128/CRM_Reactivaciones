import { NextResponse } from "next/server";
import db from "@/lib/firebase";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";

export async function GET(request, context) {
  try {
    let celularFormatted;
    const params = await context.params;
    const { id } = params;

    let registro;
    let esTelefono = false;

    console.log("id es: ", id);

    // Buscar cliente en Prisma (PostgreSQL)
    if (/^\d+$/.test(id)) {
      const cliente = await prisma.cliente.findUnique({
        where: { cliente_id: parseInt(id) },
        select: {
          cliente_id: true,
          nombre: true,
          apellido: true,
          celular: true,
        },
      });

      if (!cliente) {
        return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 });
      }
      celularFormatted = cliente.celular.trim();
      if (!celularFormatted.startsWith("+51")) {
        celularFormatted = `+51${celularFormatted}`;
      }
      registro = cliente;
      esTelefono = false;
    } else if (/^\+51\d+$/.test(id)) {
      celularFormatted = id;
      if (!celularFormatted.startsWith("+51")) {
        celularFormatted = `+51${celularFormatted}`;
      }
      const nuevo = await prisma.campanha_temporal.findFirst({
        where: { celular: id },
        select: {
          nombre: true,
          celular: true,
        },
      });
      registro = nuevo;
      esTelefono = true;
    } else {
      return NextResponse.json(
        { message: "Formato de ID inválido" },
        { status: 400 }
      );
    }

    // Consultar Firestore: Obtener mensajes del cliente
    let celularSinMas = celularFormatted.startsWith("+") ? celularFormatted.slice(1) : celularFormatted;
    let celularesParaBuscar = [celularFormatted, celularSinMas];
    const mensajesRef = db.collection("reactivaciones")
      .where("celular", "in", celularesParaBuscar)
      .where("id_bot", "in", ["reactivaciones", "reactivaciones"]);

    console.log("📞 Buscando mensajes para celular:", celularFormatted);

    const mensajesSnap = await mensajesRef.get();
    console.log("📊 Cantidad de documentos encontrados:", mensajesSnap.size);

    // Extraer datos y asegurar que `fecha` es un objeto Date
    const mensajes = mensajesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fecha: doc.data().fecha?._seconds
        ? new Date(doc.data().fecha._seconds * 1000)
        : null,
    }));

    // Mapear a formato final
    const mensajesFormateados = mensajes
      .sort((a, b) => (a.fecha > b.fecha ? 1 : -1))
      .map(msg => ({
        ...msg,
        sender: msg.sender === true || msg.sender === "true",
        fecha: msg.fecha
          ? msg.fecha.toLocaleString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Fecha no disponible",
      }));

    console.log(mensajesFormateados);

    const clientePayload = esTelefono
      ? {
          cliente_id: null,
          nombreCompleto: registro.nombre,
          celular: registro.celular,
        }
      : {
          cliente_id: registro.cliente_id,
          nombreCompleto: `${registro.nombre} ${registro.apellido}`,
          celular: registro.celular,
        };

    return NextResponse.json({
      cliente: clientePayload,
      conversaciones: mensajesFormateados,
    });
  } catch (error) {
    console.error("Error al obtener conversaciones del cliente:", error);
    return NextResponse.json(
      { message: "Error interno del servidor al obtener las conversaciones" },
      { status: 500 }
    );
  }
}
