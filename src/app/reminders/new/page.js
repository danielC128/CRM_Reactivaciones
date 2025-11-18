"use client";

import { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Button,
  Divider,
  Box, Autocomplete
} from "@mui/material";
import axiosInstance from "../../../../services/api";
import { useEffect } from "react";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid } from "@mui/x-data-grid";

export default function CampaignPage() {
  const [campaignName, setCampaignName] = useState("");
  //const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("BD_SegmentacionFinal");
  const [columns, setColumns] = useState([]);
  const [template, setTemplate] = useState("");
  // const [clientSegment, setClientSegment] = useState("");
  // const [cluster, setCluster] = useState("");
  // const [strategy, setStrategy] = useState("");
  // const [fecha, setFecha] = useState("");
  // const [linea, setLinea] = useState("");
  const [clientSegments, setClientSegments] = useState([]);//nuevo
  const [asesoresSeleccionados, setAsesoresSeleccionados] = useState([]);//nuevo
  const [clustersSeleccionados, setClustersSeleccionados] = useState([]); // ✅ NUEVO
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState([]); // ✅ NUEVO
  const [segments, setSegments] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [clusters, setClusters] = useState([]); // ✅ NUEVO  
  const [zonas, setZonas] = useState([]); // ✅ NUEVO
  const [tipoCampaña, setTipoCampaña] = useState("Fidelizacion");
  const [variable2, setVariable2] = useState("");
  const [sendDate, setSendDate] = useState(null);
  const [sendTime, setSendTime] = useState(null);
  const [templates, setTemplates] = useState([]); // Para almacenar las plantillas obtenidas
  const [loadingColumns, setLoadingColumns] = useState(false);  // Estado para saber si estamos cargando las columnas
  const [clients, setClients] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState({
    segmento: 'segmentacion',  // Fijo con valor 'segmentacion'
    cluster: 'Cluster',        // Fijo con valor 'cluster'
    estrategia: 'gestion',     // Fijo con valor 'gestion'
    fechaCuota: 'Fec_Venc_Cuota', // Fijo con valor 'Fec_Venc_Cuota'
    linea: 'Linea'
  });
  // Datos simulados
  const [databases, setDatabases] = useState([]); // ✅ CAMBIO: useDatabases -> setDatabases
  const [availableTables, setAvailableTables] = useState([]); // ✅ NUEVO: tablas disponibles
  const [currentFilterColumns, setCurrentFilterColumns] = useState({ // ✅ NUEVO: columnas actuales para filtros
    segment: null,
    asesor: null,
    cluster: null, // ✅ NUEVO
    zona: null // ✅ NUEVO
  });

  //const [segments, setSegments] = useState([]);
  const [strategies, setStrategyValues] = useState([]);
  const [fechaCuotaColumn, setFechaCuotaColumnValues] = useState([]);
  const [lineaValue, setLineaValues] = useState([]);
  const variables = ["Variable 1", "Variable 2", "Variable 3"];
  // al inicio: yomi
  const [placeholders, setPlaceholders] = useState([])            // e.g. [ "1", "2", ... ]
  const [variableMappings, setVariableMappings] = useState({})    // { "1": "nombre", "2": "telefono", … }


  useEffect(() => {
    const boot = async () => {
      try {
        setLoadingColumns(true);
        
        // ✅ 1. Cargar tablas disponibles dinámicamente
        const tablesRes = await axiosInstance.get("/bigquery");
        const tables = tablesRes.data.tables || [];
        setAvailableTables(tables);
        setDatabases(tables.map(t => t.name)); // Para el Autocomplete
        
        // ✅ 2. Cargar valores por defecto si hay tabla seleccionada
        if (selectedDatabase && tables.find(t => t.name === selectedDatabase)) {
          await loadTableData(selectedDatabase);
        } else if (tables.length > 0) {
          // Seleccionar primera tabla disponible
          const firstTable = tables[0].name;
          setSelectedDatabase(firstTable);
          await loadTableData(firstTable);
        }
        
      } catch (e) {
        console.error('❌ Error en boot:', e);
      } finally {
        setLoadingColumns(false);
      }
    };
    const fetchTemplates = async () => {
      try {
        const response = await axiosInstance.get("/plantillas"); // Solicitud GET al endpoint de plantillas
        setTemplates(response.data); // Guarda las plantillas en el estado
        console.log("Plantillas obtenidas:", response.data);
      } catch (error) {
        console.error("Error al obtener plantillas:", error);
      }
    };
    boot();
    fetchTemplates();
  }, []); // ✅ Sin selectedDatabase para evitar bucle

  // ✅ NUEVA FUNCIÓN: Cargar datos de tabla dinámicamente
  const loadTableData = async (tableName) => {
    try {
      setLoadingColumns(true);
      console.log(`🔄 Cargando datos de tabla: ${tableName}`);
      
      // 1. Primero obtener esquema de columnas
      const schemaRes = await axiosInstance.get("/bigquery/columns", {
        params: { table: tableName }
      });
      
      const availableColumns = schemaRes.data.columns || [];
      setColumns(availableColumns);
      
      console.log('📋 Columnas disponibles:', availableColumns.map(c => c.name));
      
      // 2. Buscar columnas comunes para filtros
      const columnNames = availableColumns.map(c => c.name);
      const filterColumns = [];
      
      console.log('🔍 Todas las columnas disponibles:', columnNames);
      
      // Buscar posibles columnas de segmento - AMPLIAR BÚSQUEDA
      const segmentCols = [
        'Segmento', 'segmento', 'SEGMENTO', 
        'segmentacion', 'Segmentacion', 'SEGMENTACION',
        'segment', 'Segment', 'SEGMENT',
        'tipo_segmento', 'Tipo_Segmento', 'TIPO_SEGMENTO',
        'categoria', 'Categoria', 'CATEGORIA',
        'clasificacion', 'Clasificacion', 'CLASIFICACION'
      ];
      const segmentCol = segmentCols.find(col => columnNames.includes(col));
      if (segmentCol) {
        filterColumns.push(segmentCol);
        console.log('✅ Columna de segmento encontrada:', segmentCol);
      } else {
        console.log('❌ No se encontró columna de segmento. Buscando en:', segmentCols);
        console.log('📋 Columnas que SÍ existen:', columnNames);
      }
      
      // Buscar posibles columnas de asesor
      const asesorCols = [
        'Asesor', 'asesor', 'ASESOR',
        'gestor', 'Gestor', 'GESTOR', 
        'advisor', 'Advisor', 'ADVISOR',
        'vendedor', 'Vendedor', 'VENDEDOR',
        'ejecutivo', 'Ejecutivo', 'EJECUTIVO'
      ];
      const asesorCol = asesorCols.find(col => columnNames.includes(col));
      if (asesorCol) {
        filterColumns.push(asesorCol);
        console.log('✅ Columna de asesor encontrada:', asesorCol);
      } else {
        console.log('❌ No se encontró columna de asesor. Buscando en:', asesorCols);
      }
      
      // Buscar posibles columnas de cluster
      const clusterCols = [
        'cluster', 'Cluster', 'CLUSTER',
        'grupo', 'Grupo', 'GRUPO',
        'tipo_cluster', 'Tipo_Cluster', 'TIPO_CLUSTER'
      ];
      const clusterCol = clusterCols.find(col => columnNames.includes(col));
      if (clusterCol) {
        filterColumns.push(clusterCol);
        console.log('✅ Columna de cluster encontrada:', clusterCol);
      } else {
        console.log('❌ No se encontró columna de cluster. Buscando en:', clusterCols);
      }
      
      // Buscar posibles columnas de zona
      const zonaCols = [
        'zona', 'Zona', 'ZONA',
        'region', 'Region', 'REGION',
        'area', 'Area', 'AREA',
        'territorio', 'Territorio', 'TERRITORIO'
      ];
      const zonaCol = zonaCols.find(col => columnNames.includes(col));
      if (zonaCol) {
        filterColumns.push(zonaCol);
        console.log('✅ Columna de zona encontrada:', zonaCol);
      } else {
        console.log('❌ No se encontró columna de zona. Buscando en:', zonaCols);
      }
      
      console.log('🎯 Columnas para filtros encontradas:', filterColumns);
      
      // 3. Si no hay columnas para filtros, intentar detectar automáticamente
      if (filterColumns.length === 0) {
        console.log('🔍 Intentando detección automática de columnas...');
        
        // Buscar columnas con pocos valores únicos (posibles categorías)
        for (const col of columnNames.slice(0, 10)) { // Solo las primeras 10 para no sobrecargar
          if (col.toLowerCase().includes('seg') || 
              col.toLowerCase().includes('tipo') || 
              col.toLowerCase().includes('categoria') ||
              col.toLowerCase().includes('clasificacion')) {
            console.log(`🎯 Detectada posible columna de segmento: ${col}`);
            filterColumns.push(col);
            break; // Solo tomar la primera que encuentre
          }
        }
      }
      
      // 4. Si hay columnas para filtros, obtener valores únicos
      if (filterColumns.length > 0) {
        const valuesRes = await axiosInstance.get("/bigquery/columns", {
          params: { 
            table: tableName,
            columns: filterColumns.join(',') // Solo columnas que existen
          }
        });
        
        const uniqueValues = valuesRes.data.uniqueValues || {};
        
        // Asignar valores únicos a los estados (más inteligente)
        let segmentValues = [];
        let asesorValues = [];
        let clusterValues = [];
        let zonaValues = [];
        
        // Buscar valores de segmento (usar primera columna encontrada)
        const firstSegmentCol = Object.keys(uniqueValues).find(col => 
          segmentCol && col === segmentCol || 
          col.toLowerCase().includes('seg') ||
          col.toLowerCase().includes('tipo') ||
          col.toLowerCase().includes('categoria')
        );
        if (firstSegmentCol) {
          segmentValues = uniqueValues[firstSegmentCol] || [];
        }
        
        // Buscar valores de asesor
        const firstAsesorCol = Object.keys(uniqueValues).find(col => 
          asesorCol && col === asesorCol ||
          col.toLowerCase().includes('asesor') ||
          col.toLowerCase().includes('gestor') ||
          col.toLowerCase().includes('vendedor')
        );
        if (firstAsesorCol) {
          asesorValues = uniqueValues[firstAsesorCol] || [];
        }
        
        // Buscar valores de cluster
        const firstClusterCol = Object.keys(uniqueValues).find(col => 
          clusterCol && col === clusterCol ||
          col.toLowerCase().includes('cluster') ||
          col.toLowerCase().includes('grupo')
        );
        if (firstClusterCol) {
          clusterValues = uniqueValues[firstClusterCol] || [];
        }
        
        // Buscar valores de zona
        const firstZonaCol = Object.keys(uniqueValues).find(col => 
          zonaCol && col === zonaCol ||
          col.toLowerCase().includes('zona') ||
          col.toLowerCase().includes('region') ||
          col.toLowerCase().includes('area')
        );
        if (firstZonaCol) {
          zonaValues = uniqueValues[firstZonaCol] || [];
        }
        
        setSegments(segmentValues);
        setAsesores(asesorValues);
        setClusters(clusterValues);
        setZonas(zonaValues);
        
        // Guardar las columnas que se están usando
        setCurrentFilterColumns({
          segment: firstSegmentCol || segmentCol,
          asesor: firstAsesorCol || asesorCol,
          cluster: firstClusterCol || clusterCol,
          zona: firstZonaCol || zonaCol
        });
        
        console.log('✅ Valores únicos cargados:', {
          segmento: `${firstSegmentCol || segmentCol}: ${segmentValues.length} valores`,
          asesor: `${firstAsesorCol || asesorCol}: ${asesorValues.length} valores`,
          cluster: `${firstClusterCol || clusterCol}: ${clusterValues.length} valores`,
          zona: `${firstZonaCol || zonaCol}: ${zonaValues.length} valores`
        });
      } else {
        console.log('⚠️ No se encontraron columnas de filtro estándar');
        console.log('📊 Tabla actual:', tableName);
        console.log('📋 Todas las columnas disponibles:', columnNames);
        
        // Mostrar alerta al usuario con las columnas disponibles
        const columnList = columnNames.join(', ');
        console.warn(`⚠️ COLUMNAS DISPONIBLES EN ${tableName}: ${columnList}`);
        
        setSegments([]);
        setAsesores([]);
        setClusters([]);
        setZonas([]);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos de tabla:', error);
      console.error('Detalles del error:', error.response?.data);
      setSegments([]);
      setAsesores([]);
      setClusters([]);
      setZonas([]);
    } finally {
      setLoadingColumns(false);
    }
  };

 
  //YOMI
  const handleTemplateChange = event => {
    const tplId = event.target.value
    setTemplate(tplId)

    // Buscamos la plantilla en nuestro array
    const tpl = templates.find(t => t.id === tplId)
    if (tpl) {
      // extraemos todos los {{n}}
      const matches = [...tpl.mensaje.matchAll(/{{\s*(\d+)\s*}}/g)]
        .map(m => m[1])
      const uniq = Array.from(new Set(matches))
      setPlaceholders(uniq)             // e.g. ["1"]
      setVariableMappings({})           // resetea anteriores selecciones
    } else {
      setPlaceholders([])
    }
  }

  const handleSubmit = async () => {
    // if (!campaignName) {
    //   alert("Ingresa el nombre de la campaña.");
    //   return;
    // }
    // if (!clients.length) {
    //   alert("No hay clientes para agregar a la campaña.");
    //   return;
    // }

  
    // try {
    //   // 1) crear campaña
    //   const createRes = await axiosInstance.post("/campaings", {
    //     nombre_campanha: campaignName,
    //     descripcion: "Descripción de campaña",
    //     template_id: Number(template) || null,
    //     clients: clients,
    //     fecha_inicio: sendDate,
    //     fecha_fin: null,
    //     variableMappings,
    //   });

    //   // tu POST /api/campaings devuelve { message, campanha }
    //   const campanhaId = createRes.data?.campanha?.campanha_id;
    //   if (!campanhaId) throw new Error("No se recibió campanha_id al crear la campaña.");

    //   // 2) asociar clientes a la campaña
    //   await axiosInstance.post(`/campaings/add-clients/${campanhaId}`, {
    //     clients, // ← ya normalizados
    //   });

    //   alert("Campaña creada y clientes asociados exitosamente.");
    // } catch (error) {
    //   console.error("❌ Error al crear campaña o asociar clientes:", {
    //     status: error.response?.status,
    //     url: error.response?.config?.url,
    //     data: error.response?.data || error.message,
    //   });
    //   alert("Hubo un problema al crear la campaña o asociar los clientes.");
    // }
    if (clients.length === 0) {
      alert("No hay clientes para agregar a la campaña.");
      return;
    }

    const campaignData = {
      nombre_campanha: campaignName,
      descripcion: "Descripción de campaña",
      template_id: template,
      fecha_inicio: sendDate,
      fecha_fin: sendTime,
      clients: clients,  // Aquí envías toda la información de los clientes
      variableMappings,
    };

    try {
      // Enviar solicitud para crear la campaña
      const response = await axiosInstance.post("/campaings/add-clients", campaignData);

      const campanhaId = response.data.campanha_id;  // Obtener el ID de la campaña creada

      console.log("Campaña creada con ID:", campanhaId);

      // Ahora los clientes serán automáticamente asociados con la campaña
      alert("Campaña creada y clientes asociados exitosamente.");
    } catch (error) {
      console.error("Error al crear campaña o agregar clientes:", error);
      alert("Hubo un problema al crear la campaña o agregar los clientes.");
    }
  };

  const handleDatabaseChange = async (event, value) => {
    if (!value) return;
    
    setSelectedDatabase(value);
    console.log(`🎯 Cambiando a tabla: ${value}`);
    
    // Limpiar datos anteriores
    setClients([]);
    setClientSegments([]);
    setAsesoresSeleccionados([]);
    setClustersSeleccionados([]);
    setZonasSeleccionadas([]);
    
    // Cargar nuevos datos
    await loadTableData(value);
  };
  // Colores base para usar en estilos
  const colors = {
    primaryBlue: "#007391",
    darkBlue: "#254e59",
    yellowAccent: "#FFD54F", // amarillo suave
    lightBlueBg: "#E3F2FD", // azul claro para fondo preview
    white: "#fff",
  };

  
    const applyFilters = async () => {
      if (!selectedDatabase) {
        alert('Por favor selecciona una tabla primero');
        return;
      }
      
      try {
        setLoadingColumns(true);
        console.log(`🔍 Aplicando filtros en tabla: ${selectedDatabase}`);
        
        const filters = [];
        if (clientSegments.length > 0 && currentFilterColumns.segment) {
          filters.push({ 
            type: 'segmento', 
            value: clientSegments,
            column: currentFilterColumns.segment // ✅ Columna real
          });
        }
        if (asesoresSeleccionados.length > 0 && currentFilterColumns.asesor) {
          filters.push({ 
            type: 'asesor', 
            value: asesoresSeleccionados,
            column: currentFilterColumns.asesor // ✅ Columna real  
          });
        }
        if (clustersSeleccionados.length > 0 && currentFilterColumns.cluster) {
          filters.push({ 
            type: 'cluster', 
            value: clustersSeleccionados,
            column: currentFilterColumns.cluster // ✅ NUEVO
          });
        }
        if (zonasSeleccionadas.length > 0 && currentFilterColumns.zona) {
          filters.push({ 
            type: 'zona', 
            value: zonasSeleccionadas,
            column: currentFilterColumns.zona // ✅ NUEVO
          });
        }
        
        // ✅ ENVIAR TABLA DINÁMICAMENTE
        const { data } = await axiosInstance.post('/bigquery/filtrar', { 
          table: selectedDatabase, // ✅ NUEVO: tabla dinámica
          filters 
        });
        
        const rows = data.rows || [];
        setClients(rows);
        console.log(`✅ Clientes obtenidos: ${rows.length}`);
        
      } catch (e) {
        console.error('❌ Error aplicando filtros:', e);
        alert('Ocurrió un problema al aplicar los filtros');
      } finally {
        setLoadingColumns(false);
      }
    };



  
   const columnsgrid = [
    { field: 'Codigo_Asociado', headerName: 'Código Asociado', width: 170 },
    { field: 'documento_identidad', headerName: 'N° Doc', width: 140 },
    { field: 'nombre', headerName: 'Nombres', width: 200 },
    { field: 'celular', headerName: 'Teléfono', width: 150 },
    { field: 'Segmento', headerName: 'Segmento', width: 150 },
    { field: 'Cluster', headerName: 'Cluster', width: 120 },
    { field: 'zona_filtro', headerName: 'Zona', width: 120 },
    { field: 'email', headerName: 'Correo', width: 220 },
    { field: 'gestor', headerName: 'Asesor', width: 180 },
    { field: 'Producto', headerName: 'Producto', width: 180 },
  ];
  // ---------------------------------------------------------------------------


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container
        maxWidth="lg"
        sx={{
          mt: 4,
          mb: 6,
          bgcolor: "#F0F7FA",
          borderRadius: 3,
          boxShadow: 3,
          p: { xs: 2, sm: 4 },
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: colors.primaryBlue,
            fontWeight: "700",
            mb: 4,
            textAlign: "center",
            letterSpacing: "0.05em",
          }}
        >
          Crear Campaña
        </Typography>

        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            bgcolor: colors.white,
          }}
        >
          {/* DATOS BASICOS */}
          <Typography
            variant="h6"
            sx={{ color: colors.darkBlue, fontWeight: "700", mb: 3, borderBottom: `3px solid ${colors.primaryBlue}`, pb: 1 }}
          >
            Datos Básicos
          </Typography>

          <Grid container spacing={4} mb={5}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nombre de la campaña"
                fullWidth
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                sx={{ bgcolor: colors.white, borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'darkBlue', fontWeight: 600 }}></InputLabel>
                <Autocomplete
                  value={selectedDatabase}
                  onChange={handleDatabaseChange}
                  options={databases}
                  renderInput={(params) => <TextField {...params} label="Base de Datos" />}
                  isOptionEqualToValue={(option, value) => option === value}  // Asegura que las opciones coincidan con el valor
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 2,
                    "& .MuiSelect-select": { fontWeight: 600 },
                  }}
                  disableClearable  // No permite borrar la selección
                  freeSolo  // Permite escribir texto que no está en las opciones (útil para búsqueda)
                />
              </FormControl>
            </Grid> 




          </Grid>

          <Divider sx={{ mb: 5 }} />

          
          <Typography variant="h6" sx={{ /* ...estilos... */ }}>Segmentación</Typography>
          
          {/* 🐛 DEBUG: Mostrar columnas disponibles */}
          {columns.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                🔍 DEBUG - Columnas disponibles en {selectedDatabase}:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8em' }}>
                {columns.map(c => c.name).join(', ')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8em', color: 'green' }}>
                ✅ Filtros activos: {currentFilterColumns.segment ? `Segmento: ${currentFilterColumns.segment}` : '❌ Sin segmento'} | 
                {currentFilterColumns.asesor ? ` Asesor: ${currentFilterColumns.asesor}` : ' ❌ Sin asesor'} |
                {currentFilterColumns.cluster ? ` Cluster: ${currentFilterColumns.cluster}` : ' ❌ Sin cluster'} |
                {currentFilterColumns.zona ? ` Zona: ${currentFilterColumns.zona}` : ' ❌ Sin zona'}
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={4} mb={5}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Segmento</InputLabel>
                <Select
                  multiple
                  value={clientSegments}
                  onChange={e => setClientSegments(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Segmento"
                  renderValue={selected => selected.join(', ')}
                >
                  {segments.map(seg => (
                    <MenuItem
                      key={seg}
                      value={seg}
                      sx={clientSegments.includes(seg) ? { bgcolor: '#0677f8ff', color: '#020202ff', fontWeight: 'bold' } : {}}
                    >
                      {seg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Asesor</InputLabel>
                <Select
                  multiple
                  value={asesoresSeleccionados}
                  onChange={e => setAsesoresSeleccionados(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Asesor"
                  renderValue={selected => selected.join(', ')}
                >
                  {asesores.map(a => (
                    <MenuItem
                      key={a}
                      value={a}
                      sx={asesoresSeleccionados.includes(a) ? { bgcolor: '#0677f8ff', color: '#020202ff', fontWeight: 'bold' } : {}}
                    >
                      {a}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Cluster</InputLabel>
                <Select
                  multiple
                  value={clustersSeleccionados}
                  onChange={e => setClustersSeleccionados(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Cluster"
                  renderValue={selected => selected.join(', ')}
                >
                  {clusters.map(cluster => (
                    <MenuItem
                      key={cluster}
                      value={cluster}
                      sx={clustersSeleccionados.includes(cluster) ? { bgcolor: '#0677f8ff', color: '#020202ff', fontWeight: 'bold' } : {}}
                    >
                      {cluster}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Zona</InputLabel>
                <Select
                  multiple
                  value={zonasSeleccionadas}
                  onChange={e => setZonasSeleccionadas(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Zona"
                  renderValue={selected => selected.join(', ')}
                >
                  {zonas.map(zona => (
                    <MenuItem
                      key={zona}
                      value={zona}
                      sx={zonasSeleccionadas.includes(zona) ? { bgcolor: '#0677f8ff', color: '#020202ff', fontWeight: 'bold' } : {}}
                    >
                      {zona}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={applyFilters}>Aplicar Filtros</Button>
            </Grid>
          </Grid>


          <Divider sx={{ mb: 5 }} />
          <Box sx={{ height: 400, width: '100%' }}>
            {loadingColumns ? (
              <CircularProgress sx={{ display: "block", margin: "0 auto" }} /> // Mostrar cargando
            ) : (
              
                <DataGrid
                  rows={clients.map((r, i) => ({ ...r, id: `${r.N_Doc || i}-${r.Codigo_Asociado || 'X'}` }))}
                  columns={columnsgrid}
                  pageSize={5}
                  rowsPerPageOptions={[5,10,20]}
                  pagination
                  checkboxSelection
                  disableSelectionOnClick
                  loading={loadingColumns}
                />

            )}
          </Box>
          <Divider sx={{ mb: 5 }} />

          

          <Divider sx={{ mb: 5 }} />

          {/* PLANTILLA Y VISTA PREVIA */}
          <Typography
            variant="h6"
            sx={{ color: colors.darkBlue, fontWeight: "700", mb: 3, borderBottom: `3px solid ${colors.primaryBlue}`, pb: 1 }}
          >
            Plantilla de Mensaje
          </Typography>

          <Grid container spacing={4} mb={5}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: "#254e59", fontWeight: 600 }}>Seleccionar Plantilla</InputLabel>
                <Select
                  value={template}  // Este es el id de la plantilla seleccionada
                  onChange={handleTemplateChange}
                  label="Seleccionar Plantilla"
                  sx={{ bgcolor: "#fff", borderRadius: 2, "& .MuiSelect-select": { fontWeight: 600 } }}
                >
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nombre_template} {/* Aquí se muestra el nombre de la plantilla */}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* yomi */}
            {placeholders.map(idx => (
              <Grid item xs={12} sm={4} key={idx}>
                <FormControl fullWidth>
                  <InputLabel>Variable {idx}</InputLabel>
                  <Select
                    value={variableMappings[idx] || ""}
                    onChange={e =>
                      setVariableMappings(vm => ({ ...vm, [idx]: e.target.value }))
                    }
                    label={`Variable ${idx}`}
                  >
                    {/* usamos columnsgrid para poblar los campos de la tabla */}
                    {columnsgrid.map(col => (
                      <MenuItem key={col.field} value={col.field}>
                        {col.headerName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            {/* yomi termina*/}
            <Grid item xs={12} sm={6}>
              {template && (
                <Card
                  sx={{
                    bgcolor: "#E3F2FD",  // Usando el color de fondo claro
                    p: 3,
                    minHeight: 140,
                    borderRadius: 3,
                    border: "1.5px solid #007391",  // Color de borde
                    boxShadow: "0 4px 12px rgba(0, 115, 145, 0.15)",  // Sombra para darle profundidad
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" mb={1} color="#254e59">
                    Vista previa
                  </Typography>
                  <Typography variant="body1" color="#254e59">
                    {/* Aquí buscamos la plantilla seleccionada por id y mostramos su mensaje */}
                    {templates.find((t) => t.id === template)?.mensaje}
                  </Typography>
                </Card>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ mb: 5 }} />

          

          <Box textAlign="center" mt={6}>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: colors.yellowAccent,
                color: colors.darkBlue,
                fontWeight: "700",
                px: 6,
                py: 1.5,
                borderRadius: 3,
                "&:hover": {
                  bgcolor: "#FFC107",
                },
              }}
              onClick={handleSubmit}
            >
              Crear Campaña
            </Button>
          </Box>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}
