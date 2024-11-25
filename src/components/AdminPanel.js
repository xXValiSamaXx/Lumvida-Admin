import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from '@firebase/firestore';
import { Bell, Filter, MapPin } from 'lucide-react';
import NotificationSystem from './NotificationSystem';
import { useReportStats } from '../hooks/useReportStats';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addImageToPDF } from '../utils/pdfUtils';

const AdminPanel = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterType, setFilterType] = useState('month');
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const stats = useReportStats();

  const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const reportsRef = collection(db, 'reportes');
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsData.push({
          id: doc.id,
          ...data,
          fechaFormateada: formatFirestoreTimestamp(data.fecha)
        });
      });
      setReports(reportsData);
      applyFilters(reportsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const applyFilters = (reportsToFilter = reports) => {
    let filtered = [...reportsToFilter];
    
    // Filtro por tiempo
    const now = new Date();
    filtered = filtered.filter(report => {
      if (!report.fecha) return false;
      const reportDate = new Date(report.fecha.seconds * 1000);
      
      switch (filterType) {
        case 'month': {
          return reportDate.getMonth() === now.getMonth() &&
                 reportDate.getFullYear() === now.getFullYear();
        }
        case 'week': {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return reportDate >= oneWeekAgo;
        }
        case 'day': {
          return reportDate.getDate() === now.getDate() &&
                 reportDate.getMonth() === now.getMonth() &&
                 reportDate.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    });
    
    if (category !== 'all') {
      filtered = filtered.filter(report => 
        report.categoria === category
      );
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.folio?.toString().toLowerCase().includes(search) ||
        report.categoria?.toLowerCase().includes(search) ||
        report.direccion?.toLowerCase().includes(search) ||
        report.estado?.toLowerCase().includes(search)
      );
    }
    
    filtered.sort((a, b) => b.fecha.seconds - a.fecha.seconds);
    setFilteredReports(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filterType, category, searchTerm]);

  const generatePDF = async (report) => {
    try {
      const doc = new jsPDF();
      
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.text('Reporte de Incidente', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      let y = 40;
      
      doc.text(`Folio: ${report.folio || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Tipo de Reporte: ${report.categoria || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Fecha y Hora: ${report.fechaFormateada || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Dirección: ${report.direccion || 'No especificado'}`, 20, y);
      y += 10;
      doc.text(`Estado: ${report.estado || 'No especificado'}`, 20, y);
      y += 10;
      
      const comentario = report.comentario || 'Sin comentario';
      const comentarioLines = doc.splitTextToSize(comentario, 170);
      doc.text(comentarioLines, 20, y);
      y += (comentarioLines.length * 7) + 3;
      
      if (report.ubicacion) {
        doc.text(`Ubicación: ${report.ubicacion.latitud}, ${report.ubicacion.longitud}`, 20, y);
        y += 10;
      }
      
      if (report.foto) {
        try {
          y = await addImageToPDF(doc, report.foto, y);
        } catch (error) {
          console.error('Error al procesar la imagen:', error);
          doc.text('Error al cargar la imagen', 20, y);
          y += 10;
        }
      }
      
      doc.save(`reporte-${report.folio || report.id}.pdf`);
      
    } catch (error) {
      console.error('Error general al generar el PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b">
        <div className="container flex h-16 items-center px-10">
          <h1 className="text-2xl font-bold">Panel Administrativo LumVida</h1>
          <div className="ml-auto flex items-center gap-4">
          </div>
          <NotificationSystem />
        </div>
      </header>

      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <select
              className="w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="month">Por Mes</option>
              <option value="week">Por Semana</option>
              <option value="day">Por Día</option>
            </select>
            <select
              className="w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="Alumbrado Público">Alumbrado Público</option>
              <option value="Bacheo">Bacheo</option>
              <option value="Basura acumulada">Basura acumulada</option>
              <option value="Drenajes Obstruidos">Drenajes Obstruidos</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Buscar reportes..."
              className="max-w-xs rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              onClick={() => applyFilters()}
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Total Reportes
              </h3>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              {stats.totalChange > 0 ? '+' : ''}{stats.totalChange}% desde el último mes
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Pendientes
              </h3>
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-gray-500">
              {stats.pendingChange > 0 ? '+' : ''}{stats.pendingChange}% desde el último mes
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Completados
              </h3>
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-gray-500">
              {stats.completedChange > 0 ? '+' : ''}{stats.completedChange}% desde el último mes
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Reportes Recientes</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <p>Cargando reportes...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-4">
                  <p>No se encontraron reportes con los filtros seleccionados</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <h3 className="font-medium">{report.categoria}</h3>
                        <span className="text-sm text-gray-500">
                          Folio: {report.folio || 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {report.fechaFormateada}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        {report.direccion}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span 
                        className={`px-3 py-1 rounded-full text-sm text-white ${
                          report.estado?.toLowerCase() === 'pendiente' ? 'bg-yellow-500' :
                          report.estado?.toLowerCase() === 'completado' ? 'bg-green-500' :
                          'bg-gray-500'
                        }`}
                      >
                        {report.estado || 'pendiente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {selectedReport && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedReport.categoria}
                {selectedReport.folio && ` - Folio: ${selectedReport.folio}`}
              </h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">Fecha:</span>
                    <span>{selectedReport.fechaFormateada}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">Dirección:</span>
                    <span>{selectedReport.direccion}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">Estado:</span>
                    <span className={`px-3 py-1 rounded-full text-sm text-white ${
                      selectedReport.estado?.toLowerCase() === 'pendiente' ? 'bg-yellow-500' :
                      selectedReport.estado?.toLowerCase() === 'completado' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}>
                      {selectedReport.estado || 'pendiente'}
                    </span>
                  </div>
                  {selectedReport.ubicacion && (
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Ubicación:</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {selectedReport.ubicacion.latitud}, {selectedReport.ubicacion.longitud}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 border-b pb-2">
                    <span className="font-medium">Comentarios:</span>
                    <span className="text-gray-600">
                      {selectedReport.comentario || 'Sin comentarios'}
                    </span>
                  </div>
                </div>
                
                {selectedReport.foto && (
                  <div>
                    <h4 className="font-medium mb-2">Imagen del Reporte</h4>
                    <div className="relative h-64 overflow-hidden rounded-lg">
                      <img
                        src={selectedReport.foto}
                        alt="Reporte"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-4 pt-4 mt-4 border-t">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setSelectedReport(null)}
                >
                  Cerrar
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                  onClick={() => generatePDF(selectedReport)}
                >
                  Generar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;