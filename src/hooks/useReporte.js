import { useState, useEffect, useMemo } from "react";
import { getReporte } from "../../services/reporteService";
import { startOfDay, endOfDay } from "date-fns";

const useReporte = () => {
  const [estadosData, setEstadosData] = useState([]);
  const [totalEstadosData, setTotalEstadosData] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [sortModel, setSortModel] = useState([]);

  useEffect(() => {
    fetchEstadosData();
  }, [startDate, endDate, pagination, sortModel]);
  
  const fetchEstadosData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReporte(
        startDate.toISOString(),
        endDate.toISOString(),
        pagination.page,
        pagination.pageSize,
        sortModel
      );
  
  
      if (!data || !data.estados) {
        throw new Error("Datos de API vacíos o incorrectos");
      }
  
      setEstadosData(data.estados); // Asegúrate de que el estado esté siendo actualizado
      setTotalEstadosData(data.totalLeads);
    } catch (err) {
      console.error("Error al obtener reporte:", err);
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };


  const reporteConPorcentajes = useMemo(() => {
    if (!estadosData || totalEstadosData === 0) return [];
  
    // Usamos Object.entries para recorrer el objeto
    return Object.entries(estadosData).map(([estado, datos]) => {
      // Cálculo del porcentaje usando datos.total y totalEstadosData
      const porcentaje = (totalEstadosData > 0 && datos.total > 0)
        ? ((datos.total / totalEstadosData) * 100).toFixed(2)
        : "0";

      return {
        id: estado,  // Usamos el nombre del estado como id
        estado,
        estadoPorcentaje: porcentaje,  // Calculamos el porcentaje correctamente
        total: datos.total,
        converge: datos.converge,
        recencia: datos.recencia,
        intensity: datos.intensity,
        accion: datos.accion, // Acciones (vacías por ahora)
      };
    });
  }, [estadosData, totalEstadosData]);

  return {
    estadosData: reporteConPorcentajes,
    totalEstadosData,
    loading,
    error,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    pagination,
    setPagination,
    sortModel,
    setSortModel,
  };
};

export default useReporte;




