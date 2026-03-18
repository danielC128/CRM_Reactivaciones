"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useCampaignDetail from "@/hooks/useCampaignDetail";
import {
  Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody,
  Card, CardContent, Divider, IconButton, Chip, Grid, Paper, Avatar, Fade
} from "@mui/material";
import CustomDataGrid from "@/app/components/CustomDataGrid";
import {
  ArrowBack, Send, Delete, Campaign, Schedule,
  Group, Message, CheckCircle, Error, Info, Warning,
  Phone, Person, Business, DateRange, Assessment
} from "@mui/icons-material";
import { addClientesACampanha, getClientesPorGestor, getGestores } from "../../../../services/campaignService";
import axiosInstance from "../../../../services/api";
import ContactoStats from "@/app/components/ContactoStats";
const CampaignDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id;

  const [openSelectModal, setOpenSelectModal] = useState(false);
  const [gestores, setGestores] = useState([]);
  const [selectedGestor, setSelectedGestor] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);

  const {
    campaign,
    pagination,
    setPagination,
    clients: campaignClients,
    loading,
    error,
    fetchCampaignDetail,
    handleRemoveClient,
    handleSendCampaign,
    snackbar,
    campaignStats,
    sendingInProgress,
  } = useCampaignDetail(campaignId);

  useEffect(() => {
    getGestores().then(setGestores);
    console.log("GESTORES:", gestores);

  }, []);

  useEffect(() => {

    if (campaignId) {
      fetchCampaignDetail();
    }
    console.log("camapla", campaign);
  }, [campaignId]);

  const handleChangeGestor = async (value) => {
    setSelectedGestor(value);
    const clientes = await getClientesPorGestor(value);
    setFilteredClients(clientes);
    setSelectedClientIds([]); // resetear selección
  };
  function dividirEnLotes(array, tamañoLote) {
    const lotes = [];
    for (let i = 0; i < array.length; i += tamañoLote) {
      lotes.push(array.slice(i, i + tamañoLote));
    }
    return lotes;
  }



  return (
    <Fade in timeout={800}>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fbff 0%, #e9f4f8 50%, #f0f9ff 100%)',
        p: 2
      }}>
        <Box width="100%" maxWidth="1400px" margin="auto">
          {loading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="60vh">
              <CircularProgress size={60} sx={{ color: '#007391', mb: 2 }} />
              <Typography variant="h6" color="#007391">Cargando detalles de la campaña...</Typography>
            </Box>
          ) : error ? (
            <Fade in>
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(244, 67, 54, 0.1)',
                  '& .MuiAlert-icon': { fontSize: '2rem' }
                }}
              >
                {error}
              </Alert>
            </Fade>
          ) : (
            <>
              {/* HEADER PRINCIPAL CON GRADIENTE */}
              <Fade in timeout={1000}>
                <Paper 
                  elevation={0}
                  sx={{
                    background: 'linear-gradient(135deg, #007391 0%, #005c6b 50%, #254e59 100%)',
                    color: 'white',
                    borderRadius: 3,
                    p: 4,
                    mb: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255, 255, 255, 0.1)',
                      opacity: 0.8,
                      transform: 'skewY(-1deg)',
                      transformOrigin: 'top left'
                    }
                  }}
                >
                  <Box position="relative" zIndex={1}>
                    <Grid container alignItems="center" spacing={3}>
                      <Grid item>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            width: 60, 
                            height: 60,
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <Campaign sx={{ fontSize: '2rem', color: 'white' }} />
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography 
                          variant="h3" 
                          fontWeight="bold" 
                          sx={{ 
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            mb: 1
                          }}
                        >
                          {campaign?.nombre_campanha}
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            opacity: 0.9,
                            fontWeight: 300
                          }}
                        >
                          Detalle de Campaña WhatsApp
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Chip 
                          label={campaign?.estado_campanha || "Activa"}
                          sx={{
                            bgcolor: 'rgba(56, 142, 60, 0.8)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            px: 2,
                            py: 1,
                            backdropFilter: 'blur(10px)'
                          }}
                          icon={<CheckCircle />}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Fade>

              {/* INFORMACIÓN DE LA CAMPAÑA CON CARDS ELEGANTES */}
              <Fade in timeout={1200}>
                <Grid container spacing={3} mb={4}>
                  {/* Card Principal de Información */}
                  <Grid item xs={12} lg={8}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        border: '1px solid rgba(0, 115, 145, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 115, 145, 0.08)',
                        overflow: 'hidden'
                      }}
                    >
                      <Box 
                        sx={{
                          background: 'linear-gradient(135deg, #007391 0%, #005c6b 100%)',
                          color: 'white',
                          p: 3
                        }}
                      >
                        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Info /> Información de la Campaña
                        </Typography>
                      </Box>
                      
                      <CardContent sx={{ p: 4 }}>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Message sx={{ color: '#007391', mr: 2 }} />
                              <Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                  DESCRIPCIÓN
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {campaign?.descripcion || "Sin descripción"}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <DateRange sx={{ color: '#007391', mr: 2 }} />
                              <Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                  FECHA DE CREACIÓN
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {campaign?.fecha_creacion ? new Date(campaign.fecha_creacion).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  }) : "N/A"}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Schedule sx={{ color: '#007391', mr: 2 }} />
                              <Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                  FECHA FIN
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {campaign?.fecha_fin ? new Date(campaign.fecha_fin).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  }) : "No definida"}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Group sx={{ color: '#007391', mr: 2 }} />
                              <Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                  NÚMERO DE CLIENTES
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#007391' }}>
                                  {pagination.total.toLocaleString()}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 3, borderColor: 'rgba(0, 115, 145, 0.1)' }} />
                        
                        {/* Template Information */}
                        <Box 
                          sx={{ 
                            bgcolor: 'rgba(0, 115, 145, 0.03)',
                            borderRadius: 2,
                            p: 3,
                            border: '1px solid rgba(0, 115, 145, 0.1)'
                          }}
                        >
                          <Typography variant="h6" sx={{ color: '#007391', mb: 2, fontWeight: 600 }}>
                            📝 Template de Mensaje
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                NOMBRE DEL TEMPLATE
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {campaign?.template?.nombre_template || "No asignado"}
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                CONTENIDO DEL MENSAJE
                              </Typography>
                              <Paper 
                                sx={{ 
                                  p: 2, 
                                  bgcolor: '#f8f9fa', 
                                  border: '1px solid #e9ecef',
                                  borderRadius: 2,
                                  mt: 1
                                }}
                              >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                  {campaign?.template?.mensaje || "No definido"}
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>
                        </Box>
                      </CardContent>
                    </Paper>
                  </Grid>
                  
                  {/* Panel de Métricas Rápidas */}
                  <Grid item xs={12} lg={4}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Paper 
                          elevation={0}
                          sx={{ 
                            p: 3, 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                            color: 'white',
                            textAlign: 'center'
                          }}
                        >
                          <Assessment sx={{ fontSize: '3rem', mb: 1, opacity: 0.8 }} />
                          <Typography variant="h4" fontWeight="bold">
                            {pagination.total}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Total de Contactos
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Paper 
                          elevation={0}
                          sx={{ 
                            p: 3, 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                            color: 'white',
                            textAlign: 'center'
                          }}
                        >
                          <Phone sx={{ fontSize: '3rem', mb: 1, opacity: 0.8 }} />
                          <Typography variant="h4" fontWeight="bold">
                            WhatsApp
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Canal de Comunicación
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Fade>

              {/* BOTONES DE ACCIÓN CON MEJOR DISEÑO */}
              <Fade in timeout={1400}>
                <Box 
                  display="flex" 
                  justifyContent="space-between" 
                  flexWrap="wrap"
                  gap={2}
                  my={3}
                  p={3}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 3,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={() => router.push("/campaigns")}
                    size="large"
                    sx={{ 
                      background: 'linear-gradient(135deg, #254e59 0%, #1a363d 100%)',
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 20px rgba(37, 78, 89, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 25px rgba(37, 78, 89, 0.4)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                    startIcon={<ArrowBack />}
                  >
                    Volver a Campañas
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={handleSendCampaign}
                    disabled={sendingInProgress}
                    size="large"
                    sx={{ 
                      background: sendingInProgress 
                        ? 'linear-gradient(135deg, #ccc 0%, #aaa 100%)' 
                        : 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      boxShadow: sendingInProgress 
                        ? 'none'
                        : '0 4px 20px rgba(56, 142, 60, 0.3)',
                      '&:hover': {
                        transform: sendingInProgress ? 'none' : 'translateY(-2px)',
                        boxShadow: sendingInProgress 
                          ? 'none'
                          : '0 6px 25px rgba(56, 142, 60, 0.4)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                    startIcon={sendingInProgress ? <CircularProgress size={20} color="inherit" /> : <Send />}
                  >
                    {sendingInProgress ? "Enviando Mensajes..." : "Enviar Campaña"}
                  </Button>
                </Box>
              </Fade>

              {/* 🔹 ESTADÍSTICAS DE CAMPAÑA */}
              {/*<Fade in timeout={1600}>
                <Box mb={4}>
                  <CampaignStatsCard 
                    campaignStats={campaignStats} 
                    sendingInProgress={sendingInProgress} 
                  />
                </Box>
              </Fade>*/}

              {/* 🔹 TABLA DE CLIENTES CON DISEÑO MEJORADO */}
              <Fade in timeout={1800}>
                <Paper 
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                    border: '1px solid rgba(0, 115, 145, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 115, 145, 0.08)',
                    overflow: 'hidden',
                    mb: 4
                  }}
                >
                  <Box 
                    sx={{
                      background: 'linear-gradient(135deg, #007391 0%, #005c6b 100%)',
                      color: 'white',
                      p: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    <Group />
                    <Typography variant="h5" fontWeight="bold">
                      Lista de Clientes ({pagination.total})
                    </Typography>
                  </Box>
                  
                  <Box p={3}>
                    <CustomDataGrid
                      pagination={pagination}
                      setPagination={setPagination}
                      rows={campaignClients}
                      totalRows={pagination.total}
                      columns={[
                        { 
                          field: "id", 
                          headerName: "ID Cliente", 
                          flex: 1,
                          renderHeader: () => (
                            <Typography fontWeight="bold" color="#007391">
                              ID Cliente
                            </Typography>
                          )
                        },
                        { 
                          field: "nombre", 
                          headerName: "Nombre", 
                          flex: 1,
                          renderHeader: () => (
                            <Typography fontWeight="bold" color="#007391">
                              <Person sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                              Nombre
                            </Typography>
                          )
                        },
                        { 
                          field: "celular", 
                          headerName: "Celular", 
                          flex: 1,
                          renderHeader: () => (
                            <Typography fontWeight="bold" color="#007391">
                              <Phone sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                              Celular
                            </Typography>
                          )
                        },
                        { 
                          field: "gestor", 
                          headerName: "Gestor", 
                          flex: 1,
                          renderHeader: () => (
                            <Typography fontWeight="bold" color="#007391">
                              <Business sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                              Gestor
                            </Typography>
                          )
                        },
                        {
                          field: "acciones",
                          headerName: "Acciones",
                          flex: 1,
                          renderHeader: () => (
                            <Typography fontWeight="bold" color="#007391">
                              Acciones
                            </Typography>
                          ),
                          renderCell: (params) => (
                            <IconButton
                              onClick={() => handleRemoveClient(params.row.id)}
                              sx={{ 
                                color: "#D32F2F",
                                '&:hover': {
                                  bgcolor: 'rgba(211, 47, 47, 0.1)',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Delete />
                            </IconButton>
                          ),
                        },
                      ]}
                    />
                  </Box>
                </Paper>
              </Fade>

              {/* MODALES Y DIÁLOGOS */}
              <Dialog
                open={openSelectModal} 
                onClose={() => setOpenSelectModal(false)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                  sx: {
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
                  }
                }}
              >
                <DialogTitle sx={{ 
                  bgcolor: '#007391', 
                  color: 'white', 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.3rem'
                }}>
                  <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Seleccionar Clientes por Gestor
                </DialogTitle>
                <DialogContent sx={{ p: 4 }}>
                  <Box marginBottom={3}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#007391' }}>
                      Seleccionar Gestor:
                    </Typography>
                    <select
                      value={selectedGestor}
                      onChange={(e) => handleChangeGestor(e.target.value)}
                      style={{ 
                        width: "100%", 
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid #007391',
                        fontSize: '1rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Selecciona un gestor</option>
                      {gestores.map((g, index) => (
                        <option key={index} value={g}>{g}</option>
                      ))}
                    </select>
                  </Box>
                  
                  <Box display="flex" justifyContent="flex-end" gap={2} mb={3}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const allIds = filteredClients.map((c) => c.cliente_id);
                        setSelectedClientIds(allIds);
                      }}
                      sx={{ 
                        borderColor: '#388e3c',
                        color: '#388e3c',
                        '&:hover': { borderColor: '#2e7d32', bgcolor: 'rgba(56, 142, 60, 0.05)' }
                      }}
                    >
                      Seleccionar todos
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedClientIds([])}
                      sx={{ 
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        '&:hover': { borderColor: '#f57c00', bgcolor: 'rgba(255, 152, 0, 0.05)' }
                      }}
                    >
                      Deseleccionar todos
                    </Button>
                  </Box>
                  
                  <Paper elevation={0} sx={{ border: '1px solid rgba(0, 115, 145, 0.2)', borderRadius: 2 }}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'rgba(0, 115, 145, 0.05)' }}>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell><Typography fontWeight="bold" color="#007391">ID</Typography></TableCell>
                          <TableCell><Typography fontWeight="bold" color="#007391">Nombre</Typography></TableCell>
                          <TableCell><Typography fontWeight="bold" color="#007391">Celular</Typography></TableCell>
                          <TableCell><Typography fontWeight="bold" color="#007391">Gestor</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredClients.map((cliente) => (
                          <TableRow 
                            key={cliente.cliente_id}
                            sx={{ 
                              '&:hover': { bgcolor: 'rgba(0, 115, 145, 0.02)' },
                              '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 115, 145, 0.01)' }
                            }}
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedClientIds.includes(cliente.cliente_id)}
                                onChange={() => {
                                  setSelectedClientIds((prev) =>
                                    prev.includes(cliente.cliente_id)
                                      ? prev.filter((id) => id !== cliente.cliente_id)
                                      : [...prev, cliente.cliente_id]
                                  );
                                }}
                                style={{ transform: 'scale(1.2)' }}
                              />
                            </TableCell>
                            <TableCell>{cliente.cliente_id}</TableCell>
                            <TableCell>{cliente.nombre}</TableCell>
                            <TableCell>{cliente.celular}</TableCell>
                            <TableCell>{cliente.gestor}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 2 }}>
                  <Button 
                    onClick={() => setOpenSelectModal(false)}
                    variant="outlined"
                    sx={{ 
                      borderColor: '#007391',
                      color: '#007391',
                      '&:hover': { borderColor: '#005c6b', bgcolor: 'rgba(0, 115, 145, 0.05)' }
                    }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const lotes = dividirEnLotes(selectedClientIds, 100);
                        for (const lote of lotes) {
                          await axiosInstance.post(`/campaings/add-clients/${campaignId}`, {
                            clientIds: lote,
                          });
                        }
                        setOpenSelectModal(false);
                        fetchCampaignDetail();
                        alert("✅ Clientes agregados por lotes.");
                      } catch (err) {
                        console.error("❌ Error al agregar clientes por gestor:", err);
                        alert("❌ Error al agregar clientes. Revisa consola.");
                      }
                    }}
                    variant="contained"
                    disabled={selectedClientIds.length === 0}
                    sx={{ 
                      background: selectedClientIds.length === 0 
                        ? '#ccc' 
                        : 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                      '&:hover': { 
                        background: selectedClientIds.length === 0 
                          ? '#ccc' 
                          : 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)'
                      }
                    }}
                  >
                    Agregar a campaña ({selectedClientIds.length})
                  </Button>
                </DialogActions>
              </Dialog>

              {snackbar}

            </>
          )}
          
          {campaignId && (
            <Fade in timeout={2000}>
              <Box mt={4}>
                <ContactoStats campaignId={campaignId} />
              </Box>
            </Fade>
          )}
        </Box>
      </Box>
    </Fade>
  );
};

export default CampaignDetailPage;
