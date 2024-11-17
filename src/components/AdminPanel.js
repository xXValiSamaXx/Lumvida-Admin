import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from '@firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Importaciones para el mapa
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const AdminPanel = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [filterType, setFilterType] = useState('day');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

    // Nuevos estados para el mapa y estadísticas
    const [mapCenter] = useState([25.6866, -100.3161]); // Coordenadas de Monterrey
    const [reportMarkers, setReportMarkers] = useState([]);
    const [coloniaStats, setColoniaStats] = useState([]);
  
    // Función para obtener el icono del marcador
    const getMarkerIcon = (category) => {
      return L.icon({
        iconUrl: '/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });
    };
  
    // Función para manejar el clic en un marcador
    const handleMarkerClick = (marker) => {
      const report = reports.find(r => r.id === marker.id);
      if (report) {
        setSelectedReport(report);
      }
    };

  useEffect(() => {
    const reportsRef = collection(db, 'reportes');
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData = [];
      const markers = [];
      const coloniaStatsTemp = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const report = {
          id: doc.id,
          ...data,
          fechaFormateada: formatFirestoreTimestamp(data.fecha)
        };
        reportsData.push(report);

        // Procesar marcadores si hay ubicación
        if (data.ubicacion) {
          markers.push({
            id: doc.id,
            lat: data.ubicacion.latitud,
            lng: data.ubicacion.longitud,
            category: data.categoria,
            address: data.direccion,
            status: data.estado
          });
        }

        // Procesar estadísticas por colonia
        if (data.colonia) {
          if (!coloniaStatsTemp[data.colonia]) {
            coloniaStatsTemp[data.colonia] = {
              colonia: data.colonia,
              totalReportes: 0,
              resueltos: 0
            };
          }
          coloniaStatsTemp[data.colonia].totalReportes++;
          if (data.estado === 'Resuelto') {
            coloniaStatsTemp[data.colonia].resueltos++;
          }
        }
      });

      setReports(reportsData);
      setReportMarkers(markers);
      setColoniaStats(Object.values(coloniaStatsTemp));
      applyFilters(reportsData, filterType, category);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterType, category]);

  const getProxyUrl = (url) => {
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const generatePDF = async (report) => {
    try {
      console.log('Iniciando generación de PDF para reporte:', report.id);
      const doc = new jsPDF();
      
      // Configuración del documento
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.text('Reporte de Incidente', 105, 20, { align: 'center' });
      
      // Información detallada
      doc.setFontSize(12);
      let y = 40;
      
      // Agregando información básica con manejo de undefined
      doc.text(`Tipo de Reporte: ${report.categoria || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Fecha y Hora: ${report.fechaFormateada || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Dirección: ${report.direccion || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Estado: ${report.estado || 'No especificado'}`, 20, y);
      y += 10;
      
      // Manejar comentarios largos con wrapping
      const comentario = report.comentario || 'Sin comentario';
      const comentarioLines = doc.splitTextToSize(comentario, 170);
      doc.text(comentarioLines, 20, y);
      y += (comentarioLines.length * 7) + 3;
      
      if (report.ubicacion) {
        doc.text(`Ubicación: ${report.ubicacion.latitud}, ${report.ubicacion.longitud}`, 20, y);
        y += 10;
      }
      
      // Manejo de imagen centrada
      if (report.foto) {
        console.log('Procesando imagen del reporte...');
        try {
          let imageUrl = report.foto;
          if (!imageUrl.startsWith('data:image')) {
            imageUrl = getProxyUrl(report.foto);
          }
          
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          const imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Obtener dimensiones de la página
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          // Reiniciar la posición Y para la imagen
          y = -20; // Posición vertical fija desde arriba
          
          // Definir dimensiones para la imagen rotada
          const imageWidth = 180;  // Ancho de la imagen
          const imageHeight = 120; // Alto de la imagen
          
          // Calcular posición X para centrar
          const xPos = (pageWidth - imageWidth) / 2;
          
          // Agregar la imagen rotada y centrada
          doc.addImage(
            imageData,
            'JPEG',
            xPos,
            y,
            imageWidth,
            imageHeight,
            null,
            'FAST',
            -90
          );
          
        } catch (error) {
          console.error('Error al procesar la imagen:', error);
          doc.text('Error al cargar la imagen', 20, y);
          y += 10;
        }
      }
      
      console.log('Guardando PDF...');
      doc.save(`reporte-${report.id}.pdf`);
      console.log('PDF guardado exitosamente');
      
    } catch (error) {
      console.error('Error general al generar el PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const applyFilters = (reportsToFilter = reports, type = filterType, cat = category) => {
    let filtered = [...reportsToFilter];
    
    // Filtro por tiempo
    const now = new Date();
    
    filtered = filtered.filter(report => {
      if (!report.fecha) return false;
      const reportDate = new Date(report.fecha.seconds * 1000);
      
      switch (type) {
        case 'day': {
          return reportDate.getDate() === now.getDate() &&
                 reportDate.getMonth() === now.getMonth() &&
                 reportDate.getFullYear() === now.getFullYear();
        }
        case 'month': {
          return reportDate.getMonth() === now.getMonth() &&
                 reportDate.getFullYear() === now.getFullYear();
        }
        case 'year': {
          return reportDate.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    });

    if (cat !== 'all' && cat !== 'todos') {
      filtered = filtered.filter(report => 
        report.categoria && report.categoria.trim().toLowerCase() === cat.trim().toLowerCase()
      );
    }

    setFilteredReports(filtered);
  };

  const handleFilterTypeChange = (newType) => {
    setFilterType(newType);
    applyFilters(reports, newType, category);
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    applyFilters(reports, filterType, newCategory);
  };

  const handleCloseModal = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedReport(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Panel Administrativo LumVida</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <select 
            className="select w-full p-2 border rounded"
            value={filterType}
            onChange={(e) => handleFilterTypeChange(e.target.value)}
          >
            <option value="day">Por Día</option>
            <option value="month">Por Mes</option>
            <option value="year">Por Año</option>
          </select>
          
          <select 
            className="select w-full p-2 border rounded"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="Alumbrado Público">Alumbrado Público</option>
            <option value="Bacheo">Bacheo</option>
            <option value="Basura acumulada">Basura acumulada</option>
            <option value="Drenajes Obstruidos">Drenajes Obstruidos</option>
          </select>
        </div>
  
        {/* Contenedor principal con grid responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sección de Estadísticas por colonia */}
          <div className="w-full h-full overflow-auto">
            <h2 className="text-xl font-semibold mb-4">Estadísticas por colonia</h2>
            <div className="space-y-4">
              {/* Tabla de estadísticas */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Colonia
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Reportes
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resueltos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coloniaStats.map((stat, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.colonia}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.totalReportes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.resueltos}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  
          {/* Contenedor del mapa con altura fija y scroll independiente */}
          <div className="w-full h-[400px] md:h-[500px] relative overflow-hidden border rounded-lg">
            <div className="absolute inset-0">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {reportMarkers.map((marker) => (
                  <Marker
                    key={marker.id}
                    position={[marker.lat, marker.lng]}
                    icon={getMarkerIcon(marker.category)}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-semibold">{marker.category}</h3>
                        <p>{marker.address}</p>
                        <p>Estado: {marker.status}</p>
                        <button
                          onClick={() => handleMarkerClick(marker)}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
  
        {loading ? (
          <div className="text-center py-4">
            <p>Cargando reportes...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-4">
            <p>No se encontraron reportes con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div 
                key={report.id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{report.categoria}</h3>
                    <p className="text-sm text-gray-500">{report.fechaFormateada}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      generatePDF(report);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {selectedReport && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={handleCloseModal}
          >
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
              <button 
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
              
              <div className="mt-2">
                <h2 className="text-xl font-bold mb-4">{selectedReport.categoria}</h2>
                <div className="space-y-2">
                  <p><strong>Fecha:</strong> {selectedReport.fechaFormateada}</p>
                  <p><strong>Dirección:</strong> {selectedReport.direccion}</p>
                  <p><strong>Estado:</strong> {selectedReport.estado}</p>
                  <p><strong>Comentario:</strong> {selectedReport.comentario || 'Sin comentario'}</p>
                  {selectedReport.ubicacion && (
                    <p><strong>Ubicación:</strong> {selectedReport.ubicacion.latitud}, {selectedReport.ubicacion.longitud}</p>
                  )}
                  {selectedReport.foto && (
                    <img 
                      src={selectedReport.foto} 
                      alt="Reporte" 
                      className="mt-4 rounded-lg max-w-full h-auto"
                    />
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => generatePDF(selectedReport)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Generar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;