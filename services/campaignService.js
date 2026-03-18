import axiosInstance from "./api";

const API_URL = "/campaings";

const CLOUD_RUN_URL = "https://envios-meta-service-react-763512810578.us-west1.run.app";


export const getCampaigns = async (page = 1, pageSize = 10) => {
    const response = await axiosInstance.get(`${API_URL}?page=${page}&pageSize=${pageSize}`);
    return response.data;
};

export const getTemplates = async () => {
    const response = await axiosInstance.get("/templates");
    return response.data;
};

export const createCampaign = async (campaignData) => {
  return await axiosInstance.post(API_URL, {
      nombre_campanha: campaignData.nombre_campanha,
      descripcion: campaignData.descripcion,
      template_id: campaignData.template_id, // 📌 Asegurar que es un número
      fecha_fin: campaignData.fecha_fin || null, // 📌 Asegurar que sea null si no tiene fecha
  });
};

export const sendCampaign = async (campaignId) => {
    return await axiosInstance.post(`${API_URL}/${campaignId}/enviar`);
};

export const deleteCampaign = async (campaignId) => {
    return await axiosInstance.delete(`${API_URL}/${campaignId}`);
};


// 🔹 Obtener detalle de una campaña con clientes paginados
export const getCampaignById = async (id, page = 1, pageSize = 10) => {
    const response = await axiosInstance.get(`/campaings/${id}/clientes`, {
      params: { page, pageSize },
    });
    return response.data;
  };

// 🔹 Eliminar un cliente de una campaña
export const removeClientFromCampaign = async (id, clientId) => {
    const response = await axiosInstance.delete(`/campaings/${id}/clientes`, {
      data: { cliente_id: clientId },
    });
    return response.data;
  };
  

  export const updateCampaign = async (campaignId, campaignData) => {
    try {
      const response = await axiosInstance.put(`/campaings/${campaignId}`, campaignData);
      return response.data;
    } catch (error) {
      console.error("❌ Error al actualizar campaña:", error);
      throw new Error(error.response?.data?.error || "Error al actualizar la campaña");
    }
  };

  export const sendCampaignMessages = async (campaignId) => {
    try {
      const response = await fetch(`${CLOUD_RUN_URL}/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId: campaignId,
          callbackUrl: `${window.location.origin}/api/campaings/${campaignId}/callback`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error al enviar campaña via Cloud Function:", error);
      throw error;
    }
  };
 
export const getGestores = async () => {
  const res = await axiosInstance.get("/gestor");
  return res.data;
};

export const getClientesPorGestor = async (gestor) => {
  const res = await axiosInstance.post("/clientes-por-gestor", { gestor });
  return res.data;
};

export const addClientesACampanha = async (campaignId, clientIds) => {
  try {
    const response = await axiosInstance.post(`/campaings/add-clients/${campaignId}`, {
      clientIds,
    });
    console.log("✅ Resumen desde servidor:", response.data.resumen);
    return response.data;
  } catch (error) {
    console.error("❌ Error en el servicio addClientesACampanha:", error);
    throw error;
  }
};