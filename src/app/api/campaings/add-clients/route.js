import { NextResponse } from "next/server";
import admin from "firebase-admin"; // Usar Firebase Admin para Firestore
import prisma from "@/lib/prisma"; // Prisma para la base de datos relacional (PostgreSQL)

let db;
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS); // Credenciales de Firebase
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  db = admin.firestore();
} catch (error) {
  console.warn("⚠️ Firebase initialization failed:", error.message);
  // Continue without Firebase if credentials are not available
}
const normalizeAmountAsString = (val) => {
  if (val === null || val === undefined || val === "") return null;
  // quita símbolos y deja números, coma o punto
  return String(val).trim().replace(/[^\d.,-]/g, "");
};
function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS(req) {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function POST(req, context) {
  try {
    const body = await req.json();
    const { nombre_campanha, descripcion, template_id, fecha_inicio, fecha_fin, clients, variableMappings } = body;
    //const seeds = [];
    // Validaciones básicas
    if (!nombre_campanha) {
      return NextResponse.json({ error: "nombre_campanha es requerido" }, { status: 400 });
    }
    
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: "clients debe ser un array" }, { status: 400 });
    }
    
    // Cargamos el mensaje base de la plantilla (una sola vez)
    let tplMensaje = ""
    if (template_id) {
      const tpl = await prisma.template.findUnique({
        where: { id: parseInt(template_id) }
      })
      tplMensaje = tpl?.mensaje || ""
    }
    
    // Preparar datos
    const finalFechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
    const finalFechaFin = fecha_fin ? new Date(fecha_fin) : null;
    const finalDescripcion = descripcion || "Descripción no proporcionada";
    const finalTemplateId = template_id ? parseInt(template_id) : null;
    const finalEstadoCampanha = "activa";
    const finalMensajeCliente = "Mensaje predeterminado";
    
    // OPTIMIZACIÓN 1: Preparar todos los números de teléfono de una vez
    const telefonos = clients.map(client => {
      const telefono = client.celular;
      return telefono ? "+51" + telefono.toString().replace(/\s+/g, "") : null;
    }).filter(Boolean);

    // ⚡ OPTIMIZACIÓN 2: Pre-compilar expresiones regulares (evita crear 5000+ RegExp)
    const regexCache = {};
    if (variableMappings) {
      for (const idx of Object.keys(variableMappings)) {
        regexCache[idx] = new RegExp(`{{\\s*${idx}\\s*}}`, "g");
      }
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Crear la campaña
      const campanha = await prisma.campanha.create({
        data: {
          nombre_campanha,
          descripcion: finalDescripcion,
          template_id: finalTemplateId,
          fecha_inicio: finalFechaInicio,
          fecha_fin: finalFechaFin,
          estado_campanha: finalEstadoCampanha,
          mensaje_cliente: finalMensajeCliente,
          variable_mappings: variableMappings,
        },
      });

      if (clients.length > 0) {
        // ⚡ OPTIMIZACIÓN 3: Preparar TODOS los datos de clientes de una vez
        const todosLosDatos = [];

        for (const clientData of clients) {
          const {Codigo_Asociado, documento_identidad, nombre, Apellido_Paterno, celular, Segmento, email, Zona, gestor, Producto} = clientData;
          const finalNombre = nombre || "Nombre desconocido";
          const finalApellido = Apellido_Paterno || "Apellido desconocido";
          const finalCelular = celular ? "+51" + celular.toString().replace(/\s+/g, "") : null;
          const finalEmail = email && email.trim() !== "" ? email : null;
          const finalDNI = documento_identidad || "";
          const finalSegmento = Segmento || "";
          const finalZona = Zona || "";
          const finalGestor = gestor || "";
          const finalProducto = Producto || "";
          const finalCodAsociado = Codigo_Asociado || "";

          if (!finalCelular) continue;

          todosLosDatos.push({
            nombre: finalNombre,
            apellido: finalApellido,
            documento_identidad: finalDNI,
            celular: finalCelular,
            email: finalEmail,
            categoria_no_interes: " ",
            bound: false,
            estado: " ",
            observacion: "Observación no proporcionada",
            score: "no_score",
            gestor: finalGestor,
            Segmento: finalSegmento,
            Zona: finalZona,
            Codigo_Asociado: finalCodAsociado,
            Producto: finalProducto,
          });
        }

        // ⚡ MEGA OPTIMIZACIÓN: Crear TODOS en un batch con skipDuplicates
        // Esto reemplaza los 800 UPDATEs individuales que causaban el cuello de botella
        console.log(`⚡ Creando ${todosLosDatos.length} clientes en modo ultra rápido...`);

        const [_, todosClientesConId] = await Promise.all([
          // Insertar todos (los duplicados se ignoran automáticamente)
          prisma.cliente.createMany({
            data: todosLosDatos,
            skipDuplicates: true
          }),
          // Obtener todos los clientes (existentes + nuevos) en paralelo
          prisma.cliente.findMany({
            where: { celular: { in: telefonos } },
            select: { cliente_id: true, celular: true }
          })
        ]);

        console.log(`✅ ${todosClientesConId.length} clientes listos para asociar`);

        // Crear mapa para búsqueda rápida
        const clientesMap = new Map(todosClientesConId.map(c => [c.celular, c]));

        // ⚡ PREPARAR ASOCIACIONES y MENSAJES (sin Firestore dentro de la transacción)
        const asociacionesParaCrear = [];
        const mensajesPersonalizados = []; // Para Firestore después

        for (const clientData of clients) {
          const { celular } = clientData;
          const finalCelular = celular ? "+51" + celular.toString().replace(/\s+/g, "") : null;
          if (!finalCelular) continue;

          const cliente = clientesMap.get(finalCelular);
          if (!cliente) continue;

          // Asociación
          asociacionesParaCrear.push({
            cliente_id: cliente.cliente_id,
            campanha_id: campanha.campanha_id,
          });

          // ⚡ Personalizar mensaje usando RegEx pre-compiladas (evita crear RegExp en cada iteración)
          let mensajePersonalizado = tplMensaje;
          for (const [idx, campo] of Object.entries(variableMappings || {})) {
            const valor = clientData[campo] || "";
            mensajePersonalizado = mensajePersonalizado.replace(regexCache[idx], valor);
          }

          // Guardar para Firestore (fuera de la transacción)
          mensajesPersonalizados.push({
            celular: finalCelular,
            cliente_id: cliente.cliente_id,
            mensaje: mensajePersonalizado
          });
        }

        // ⚡ Inserción masiva de asociaciones
        if (asociacionesParaCrear.length > 0) {
          await prisma.cliente_campanha.createMany({
            data: asociacionesParaCrear,
            skipDuplicates: true
          });
        }

        // ⚡ RETORNAR mensajes para procesarlos FUERA de la transacción
        return {
          campanha,
          clientsProcessed: clients.length,
          mensajesPersonalizados
        };
      }

      return {
        campanha,
        clientsProcessed: 0,
        mensajesPersonalizados: []
      };
    },
    {
      timeout: 2000000,
      maxWait: 200000
    }
  );

  // ⚡ OPTIMIZACIÓN CRÍTICA: Firestore FUERA de la transacción (no bloqueante)
  // Esto evita que Firestore bloquee la respuesta al usuario
  if (db && result.mensajesPersonalizados && result.mensajesPersonalizados.length > 0) {
    console.log(`🔥 Guardando ${result.mensajesPersonalizados.length} mensajes en Firestore (async)...`);
    const fecha = new Date();
    const firestoreBatch = db.batch();

    result.mensajesPersonalizados.forEach(({ celular, cliente_id, mensaje }) => {
      const docRef = db.collection("reactivaciones").doc(celular);
      firestoreBatch.set(docRef, {
        celular,
        fecha: admin.firestore.Timestamp.fromDate(fecha),
        id_bot: "reactivaciones",
        id_cliente: cliente_id,
        mensaje: mensaje || "Mensaje inicial de la campaña",
        sender: "false",
      });
    });

    // Ejecutar sin await para no bloquear la respuesta (fire-and-forget)
    firestoreBatch.commit()
      .then(() => console.log(`✅ Firestore: ${result.mensajesPersonalizados.length} mensajes guardados`))
      .catch(err => console.error("⚠️ Error en Firestore (no crítico):", err.message));
  }

  // --- Llamada única al bot para sembrar memoria en el checkpointer ---
  // --- Llamada única al bot para sembrar memoria en el checkpointer ---
// try {
//   if (!seeds.length) {
//     console.log("🌱 No hay seeds para enviar.");
//   } else {
//     const BOT_URL = "https://cloudbot-763512810578.us-west4.run.app";
//     const resp = await fetch(`${BOT_URL}/seed-campaign-memory`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ mode: "append", entries: seeds }),
//     });

//     let bodyOnce = null; // leemos una sola vez
//     const ct = resp.headers.get("content-type") || "";

//     if (ct.includes("application/json")) {
//       bodyOnce = await resp.json().catch(() => null);
//     } else {
//       bodyOnce = await resp.text().catch(() => null);
//     }

//     if (!resp.ok) {
//       console.warn("⚠️ Seeding falló:", resp.status, bodyOnce);
//     } else {
//       console.log("🌱 Seeding OK:", bodyOnce);
//     }
//   }
// } catch (e) {
//   console.warn("⚠️ No se pudo sembrar el checkpointer:", e?.message || e);
// }


    const response = NextResponse.json({
      message: "Campaña y clientes creados con éxito",
      campanha: result.campanha,
      clientsProcessed: result.clientsProcessed,
    });

    return addCorsHeaders(response);
    
  } catch (error) {
    console.error("❌ Error:", error);
    const errorResponse = NextResponse.json({
      error: "Error al crear la campaña o agregar clientes",
      details: error.message,
    }, { status: 500 });

    return addCorsHeaders(errorResponse);
  }
}
