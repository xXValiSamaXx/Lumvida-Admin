import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

// Importar leaflet.heat después de importar L
import 'leaflet.heat/dist/leaflet-heat.js';

const HeatmapLayer = ({ points, options = {} }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points) return;

    const defaultOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 20,
      max: 1.0,
      minOpacity: 0.3,
      gradient: {
        0.4: 'blue',
        0.6: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    };

    // Verificar si los puntos son válidos
    const validPoints = points.filter(point => 
      point.lat && point.lng && !isNaN(point.lat) && !isNaN(point.lng)
    );

    console.log('Puntos válidos para el mapa de calor:', validPoints);

    try {
      const heatLayer = L.heatLayer(
        validPoints.map(point => [point.lat, point.lng, point.intensity || 1]),
        { ...defaultOptions, ...options }
      );

      map.addLayer(heatLayer);

      return () => {
        map.removeLayer(heatLayer);
      };
    } catch (error) {
      console.error('Error al crear el mapa de calor:', error);
    }
  }, [map, points, options]);

  return null;
};

export default HeatmapLayer;