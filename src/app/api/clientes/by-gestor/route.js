// pages/api/clients/by-gestor.js
import prisma from "@/lib/prisma"; // Asegúrate de tener esto configurado

export default async function handler(req, res) {
  if (req.method === "GET") {
    const gestores = await prisma.cliente.findMany({
      where: { gestor: { not: "" } },
      distinct: ["gestor"],
      select: { gestor: true },
    });
    return res.status(200).json(gestores.map(g => g.gestor));
  }

  if (req.method === "POST") {
    const { gestor } = req.body;
    const clientes = await prisma.cliente.findMany({
      where: { gestor },
      select: {
        cliente_id: true,
        nombre: true,
        celular: true,
        gestor: true,
      },
    });
    return res.status(200).json(clientes);
  }

  return res.status(405).json({ error: "Método no permitido" });
}

