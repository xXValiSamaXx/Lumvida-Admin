import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, LayersControl } from 'react-leaflet';
import { collection, query, onSnapshot } from '@firebase/firestore';
import { db } from '../firebase';
import { icons } from './CustomIcons';
import HeatmapLayer from './HeatmapLayer';
import 'leaflet/dist/leaflet.css';
import { getCachedLocationDetails } from './geocodingService';

const { BaseLayer} = LayersControl;

const IncidentsMap = () => {
  // Recuperar la última ubicación conocida del localStorage o usar la predeterminada
  const getInitialMapCenter = () => {
    const savedLocation = localStorage.getItem('lastKnownLocation');
    return savedLocation ? JSON.parse(savedLocation) : [20.5887, -87.3187];
  };

  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(getInitialMapCenter());
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [initialZoom] = useState(14);
  const [locationInitialized, setLocationInitialized] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [mapType, setMapType] = useState('streets');
  const [showStatistics, setShowStatistics] = useState(true);

  const categories = [
    'all',
    'Alumbrado Público',
    'Bacheo',
    'Basura acumulada',
    'Drenajes Obstruidos'
  ];

  // Manejar la ubicación del usuario
  useEffect(() => {
    if (!locationInitialized && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = [latitude, longitude];
          setMapCenter(newLocation);
          localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
          setLocationInitialized(true);
        },
        (error) => {
          console.error("Error getting location:", error);
          const savedLocation = localStorage.getItem('lastKnownLocation');
          if (savedLocation) {
            setMapCenter(JSON.parse(savedLocation));
          }
          setLocationInitialized(true);
        }
      );
    }
  }, [locationInitialized]);

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

  // Obtener datos de Firestore
  useEffect(() => {
    const reportsRef = collection(db, 'reportes');
    const q = query(reportsRef);
  
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const locationPromises = [];
  
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ubicacion?.latitud && data.ubicacion?.longitud) {
          const locationPromise = getCachedLocationDetails(
            data.ubicacion.latitud,
            data.ubicacion.longitud,
            data.direccion || ''
          ).then(locationDetails => ({
            id: doc.id,
            ...data,
            fechaFormateada: formatFirestoreTimestamp(data.fecha),
            position: [data.ubicacion.latitud, data.ubicacion.longitud],
            colonia: locationDetails.colonia,
            codigoPostal: locationDetails.codigoPostal,
            ciudad: locationDetails.ciudad,
            estado: locationDetails.estado
          }));
  
          locationPromises.push(locationPromise);
        }
      });
  
      try {
        const resolvedReports = await Promise.all(locationPromises);
        setIncidents(resolvedReports);
        setFilteredIncidents(resolvedReports);
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener detalles de ubicación:", error);
        setError("Error al cargar los detalles de ubicación");
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching data:", error);
      setError(error.message);
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);

  // Filtrar incidencias
  useEffect(() => {
    let filtered = [...incidents];
    
    if (!selectedCategories.includes('all')) {
      filtered = filtered.filter(incident => 
        selectedCategories.includes(incident.categoria)
      );
    }

    setFilteredIncidents(filtered);
  }, [incidents, selectedCategories]);

  const handleCategoryChange = (categoria) => {
    setSelectedCategories(prev => {
      if (categoria === 'all') {
        return ['all'];
      }
      const newCategories = prev.filter(cat => cat !== 'all');
      if (newCategories.includes(categoria)) {
        return newCategories.filter(cat => cat !== categoria);
      } else {
        return [...newCategories, categoria];
      }
    });
  };

  // Preparar datos para el mapa de calor
  const getHeatmapData = () => {
    console.log('Preparando datos para el mapa de calor...');
    const heatmapData = filteredIncidents.map(incident => ({
      lat: incident.position[0],
      lng: incident.position[1],
      intensity: 1,
    }));
    console.log('Datos del mapa de calor:', heatmapData);
    return heatmapData;
  };

// Remplaza la función getNeighborhoodStats actual con esta:
const getNeighborhoodStats = () => {
    const stats = filteredIncidents.reduce((acc, incident) => {
      // Usar la colonia del incidente
      const colonia = incident.colonia || incident.direccion || 'Sin especificar';
  
      // Inicializar estadísticas para esta colonia si no existe
      if (!acc[colonia]) {
        acc[colonia] = {
          total: 0,
          categorias: [],
          ubicacion: incident.position
        };
      }
  
      // Incrementar contador total
      acc[colonia].total++;
      
      // Actualizar estadísticas de categoría
      const categoria = incident.categoria || 'Sin categoría';
      const existingCategoria = acc[colonia].categorias.find(cat => cat.categoria === categoria);
      
      if (existingCategoria) {
        existingCategoria.count++;
      } else {
        acc[colonia].categorias.push({
          categoria,
          count: 1
        });
      }
      
      return acc;
    }, {});
  
    // Ordenar las colonias por total de incidentes y calcular porcentajes
    return Object.entries(stats)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([colonia, data]) => {
        // Calcular porcentajes para cada categoría
        const categoriasWithPercentages = data.categorias.map(cat => ({
          ...cat,
          percentage: (cat.count / data.total) * 100
        }));
  
        return [
          colonia,
          {
            ...data,
            categorias: categoriasWithPercentages.sort((a, b) => b.count - a.count)
          }
        ];
      });
  };

  if (loading || !locationInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full p-4">
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
        {/* Header y Controles */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Título y Controles Principales */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Mapa de Incidencias</h1>
            
            {/* Controles de Visualización */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${showHeatmap 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <span className="mr-2">🔥</span>
                {showHeatmap ? 'Ocultar Mapa de Calor' : 'Mostrar Mapa de Calor'}
              </button>
  
              <button
                onClick={() => setMapType(prev => prev === 'streets' ? 'satellite' : 'streets')}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${mapType === 'satellite' 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <span className="mr-2">🗺️</span>
                {mapType === 'satellite' ? 'Vista Calles' : 'Vista Satélite'}
              </button>
            </div>
          </div>
  
          {/* Filtros de Categorías */}
          <div className="flex flex-wrap gap-2">
            {categories.map((categoria) => (
              <button
                key={categoria}
                onClick={() => handleCategoryChange(categoria)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${selectedCategories.includes(categoria) 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {categoria === 'all' ? 'Todas' : categoria}
              </button>
            ))}
          </div>
  
          {/* Contadores por Categoría */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              filteredIncidents.reduce((acc, inc) => {
                const categoria = inc.categoria || 'Sin categoría';
                acc[categoria] = (acc[categoria] || 0) + 1;
                return acc;
              }, {})
            ).map(([categoria, count]) => (
              <span 
                key={categoria}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {categoria}: {count}
              </span>
            ))}
          </div>
        </div>
  
        {/* Contenedor principal para Estadísticas y Mapa */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Panel de Estadísticas */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Estadísticas por Colonia</h2>
                <button
                  onClick={() => setShowStatistics(!showStatistics)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {showStatistics ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
  
              {showStatistics && (
                <div className="space-y-4">
                  {/* Grid de estadísticas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getNeighborhoodStats().slice(0, 6).map(([colonia, stats]) => (
                      <div key={colonia} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-gray-900">{colonia}</h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Total: {stats.total}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {stats.categorias.map(cat => (
                            <div key={cat.categoria} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">{cat.categoria}</span>
                              <span className="text-gray-900 font-medium">{cat.count}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-2">
                          {stats.categorias.map(cat => (
                            <div key={cat.categoria} className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
  
                  {/* Resumen general */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Resumen General</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {getNeighborhoodStats().length}
                        </div>
                        <div className="text-sm text-gray-600">Colonias Afectadas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredIncidents.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Incidentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {getNeighborhoodStats()[0]?.[0] || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Colonia Más Afectada</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Object.keys(
                            filteredIncidents.reduce((acc, inc) => {
                              acc[inc.categoria] = true;
                              return acc;
                            }, {})
                          ).length}
                        </div>
                        <div className="text-sm text-gray-600">Tipos de Incidentes</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          {/* Contenedor del Mapa */}
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
            <MapContainer
              key={`${mapCenter[0]}-${mapCenter[1]}-${mapType}`}
              center={mapCenter}
              zoom={initialZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="topright" />
              
              <LayersControl position="topright">
                <BaseLayer checked={mapType === 'streets'} name="Calles">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                </BaseLayer>
                <BaseLayer checked={mapType === 'satellite'} name="Satélite">
                  <TileLayer
                    url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    maxZoom={20}
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    attribution="&copy; Google Maps"
                  />
                </BaseLayer>
              </LayersControl>
  
              {showHeatmap && (
                <HeatmapLayer
                  points={getHeatmapData()}
                  options={{
                    radius: 25,
                    blur: 15,
                    maxZoom: 20,
                    max: 1.0,
                    minOpacity: 0.3
                  }}
                />
              )}
  
              {filteredIncidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={incident.position}
                  icon={icons[incident.categoria] || icons['Alumbrado Público']}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">{incident.categoria}</h3>
                      {incident.comentario && (
                        <p className="text-gray-600 mb-2">{incident.comentario}</p>
                      )}
                      <p className="text-sm text-gray-500 mb-1">
                        📍 {incident.direccion || 'Dirección no disponible'}
                      </p>
                      {incident.colonia && (
                        <p className="text-sm text-gray-500 mb-1">
                          🏘️ {incident.colonia}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">
                          {incident.fechaFormateada}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentsMap;