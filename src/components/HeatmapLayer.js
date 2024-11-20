import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';

const HeatmapLayer = ({ points, options = {} }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points) return;

    // Agrupar puntos por ubicación
    const locationIntensities = {};
    points.forEach(point => {
      const key = `${point.lat}-${point.lng}`;
      if (!locationIntensities[key]) {
        locationIntensities[key] = {
          lat: point.lat,
          lng: point.lng,
          count: 0,
        };
      }
      locationIntensities[key].count += 1;
    });

    // Encontrar el máximo de reportes
    const counts = Object.values(locationIntensities).map(loc => loc.count);
    const maxCount = Math.max(...counts, 1); // Aseguramos que no sea 0
    const minCount = Math.min(...counts, 1);

    // Convertir a puntos de calor
    const heatPoints = Object.values(locationIntensities).map(location => {
      // Normalización mejorada para pocos puntos
      const normalizedCount = (location.count - minCount) / (maxCount - minCount || 1);
      
      return [
        location.lat,
        location.lng,
        // Aumentamos la intensidad base para que sea más visible
        Math.max(0.5, normalizedCount)
      ];
    });

    console.log('Puntos procesados para el mapa de calor:', heatPoints);

    const defaultOptions = {
      radius: 35,          // Radio base más grande
      blur: 25,           // Más blur para mejor visibilidad
      maxZoom: 18,
      max: 1.0,
      minOpacity: 0.6,    // Opacidad mínima más alta
      gradient: {
        0.0: 'blue',      // Empieza con azul desde el principio
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        0.9: 'orange',
        1.0: 'red'
      }
    };

    try {
      const heatLayer = L.heatLayer(heatPoints, {
        ...defaultOptions,
        ...options
      });

      map.addLayer(heatLayer);
      console.log('Capa de calor añadida al mapa');

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