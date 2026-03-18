import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
require("dotenv").config();

export async function POST(req, context) {
    try {
      console.log("📌 Iniciando carga de clientes...");
      const startTime = Date.now();

      const { params } = context;
      const resolvedParams = await params;

      if (!resolvedParams || !resolvedParams.id) {
        console.error("❌ Error: ID de campaña no válido");
        return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
      }

      const campanhaId = Number(resolvedParams.id);
      if (isNaN(campanhaId)) {
        console.error("❌ Error: El ID de la campaña no es un número válido");
        return NextResponse.json({ error: "El ID de la campaña no es un número válido" }, { status: 400 });
      }

      console.log(`✅ ID de campaña recibido: ${campanhaId}`);

      const formData = await req.formData();
      const file = formData.get("archivo");

      if (!file) {
        console.error("❌ Error: No se proporcionó ningún archivo");
        return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
      }

      console.log(`📌 Archivo recibido: ${file.name}`);

      const buffer = Buffer.from(await file.arrayBuffer());
      let clientes = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        console.log("📌 Procesando archivo Excel...");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        clientes = XLSX.utils.sheet_to_json(sheet);
      } else {
        console.error("❌ Error: Formato de archivo no válido");
        return NextResponse.json({ error: "Formato de archivo no válido. Debe ser .xlsx o .csv" }, { status: 400 });
      }

      if (clientes.length === 0) {
        console.error("❌ Error: El archivo está vacío o tiene formato incorrecto");
        return NextResponse.json({ error: "El archivo está vacío o no tiene formato válido" }, { status: 400 });
      }

      console.log(`📌 Clientes cargados desde archivo: ${clientes.length} registros`);

      // Normalizar todos los números de una vez
      const clientesNormalizados = clientes
        .filter(c => c.Numero && c.Nombre)
        .map(cliente => {
          let numero = String(cliente.Numero).trim();
          if (!numero.startsWith("+51")) {
            numero = `+51${numero}`;
          }
          return {
            ...cliente,
            celularNormalizado: numero
          };
        });

      if (clientesNormalizados.length === 0) {
        console.warn("⚠️ No hay clientes válidos para procesar");
        return NextResponse.json({
          message: "No hay clientes válidos en el archivo",
          clientes: []
        });
      }

      const celulares = clientesNormalizados.map(c => c.celularNormalizado);
      console.log(`📊 Total de clientes a procesar: ${celulares.length}`);

      // Traer todos los clientes existentes en UN SOLO query
      console.log("🔍 Consultando clientes existentes en PostgreSQL...");
      const existingClientes = await prisma.cliente.findMany({
        where: { celular: { in: celulares } }
      });
      const clientesMap = new Map(existingClientes.map(c => [c.celular, c]));
      console.log(`✅ Encontrados ${existingClientes.length} clientes existentes en PostgreSQL`);

      // Crear nuevos clientes en PostgreSQL con createMany (batch)
      const nuevosClientes = clientesNormalizados
        .filter(c => !clientesMap.has(c.celularNormalizado))
        .map(c => ({
          celular: c.celularNormalizado,
          nombre: c.Nombre,
          documento_identidad: "",
          tipo_documento: "Desconocido",
          estado: "no contactado",
          gestor: c.Asesor || null
        }));

      let clientesCreados = [];
      if (nuevosClientes.length > 0) {
        console.log(`🔹 Creando ${nuevosClientes.length} nuevos clientes en PostgreSQL...`);
        try {
          await prisma.cliente.createMany({
            data: nuevosClientes,
            skipDuplicates: true
          });

          // Volver a consultar para obtener los IDs
          clientesCreados = await prisma.cliente.findMany({
            where: { celular: { in: nuevosClientes.map(c => c.celular) } }
          });

          // Actualizar el mapa
          clientesCreados.forEach(c => clientesMap.set(c.celular, c));
          console.log(`✅ ${clientesCreados.length} clientes creados en PostgreSQL`);
        } catch (err) {
          console.error("❌ Error al crear clientes en PostgreSQL:", err);
        }
      }

      // Consultar relaciones cliente_campanha existentes en UN SOLO query
      const clienteIds = Array.from(clientesMap.values()).map(c => c.cliente_id);
      console.log("🔍 Consultando relaciones cliente-campaña existentes...");
      const existingRelaciones = await prisma.cliente_campanha.findMany({
        where: {
          cliente_id: { in: clienteIds },
          campanha_id: campanhaId
        }
      });
      const relacionesSet = new Set(existingRelaciones.map(r => r.cliente_id));
      console.log(`✅ Encontradas ${existingRelaciones.length} relaciones existentes`);

      // Crear relaciones cliente_campanha con createMany (batch)
      const nuevasRelaciones = clienteIds
        .filter(id => !relacionesSet.has(id))
        .map(id => ({
          cliente_id: id,
          campanha_id: campanhaId
        }));

      if (nuevasRelaciones.length > 0) {
        console.log(`🔹 Creando ${nuevasRelaciones.length} nuevas relaciones cliente-campaña...`);
        try {
          await prisma.cliente_campanha.createMany({
            data: nuevasRelaciones,
            skipDuplicates: true
          });
          console.log(`✅ ${nuevasRelaciones.length} relaciones creadas`);
        } catch (err) {
          console.error("❌ Error al crear relaciones:", err);
        }
      }

      // Construir resultado final
      const clientesProcesados = [];
      clientesNormalizados.forEach(c => {
        const cliente = clientesMap.get(c.celularNormalizado);
        if (cliente) {
          clientesProcesados.push({
            cliente_id: cliente.cliente_id,
            nombre: cliente.nombre,
            celular: cliente.celular,
            gestor: cliente.gestor
          });
        }
      });

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;

      console.log(`✅ Carga de clientes completada con éxito. Total procesados: ${clientesProcesados.length} en ${totalTime}s`);

      return NextResponse.json({
        message: `Clientes procesados con éxito en la campaña ${campanhaId}`,
        clientes: clientesProcesados,
        tiempoTotal: `${totalTime}s`
      });
    } catch (error) {
      console.error("❌ Error al cargar clientes:", error);
      return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 });
    }
  }

// Obtener clientes de una campaña
export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const clientes = await prisma.cliente_campanha.findMany({
      where: { campanha_id: parseInt(resolvedParams.id) },
      include: { cliente: true },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Eliminar cliente de campaña
export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const { cliente_id } = await req.json();
    await prisma.cliente_campanha.deleteMany({
      where: { campanha_id: parseInt(resolvedParams.id), cliente_id },
    });

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
