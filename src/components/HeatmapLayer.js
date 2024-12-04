import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';

const HeatmapLayer = ({ points, options = {} }) => {
  const map = useMap();
  const layerRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Verificar que el mapa esté listo
  useEffect(() => {
    const checkMapReady = () => {
      const container = map.getContainer();
      const hasSize = container.clientHeight > 0 && container.clientWidth > 0;
      const isLoaded = map._loaded;
      return hasSize && isLoaded;
    };

    if (checkMapReady()) {
      setIsMapReady(true);
    } else {
      const waitForMap = setInterval(() => {
        if (checkMapReady()) {
          setIsMapReady(true);
          clearInterval(waitForMap);
        }
      }, 100);

      return () => clearInterval(waitForMap);
    }
  }, [map]);

  useEffect(() => {
    if (!isMapReady || !points || !Array.isArray(points) || points.length === 0) {
      return;
    }

    // Función para inicializar la capa de calor
    const initializeHeatmap = () => {
      try {
        // Validar puntos y filtrar inválidos
        const validPoints = points.filter(point => 
          point && 
          typeof point.lat === 'number' && 
          typeof point.lng === 'number' &&
          !isNaN(point.lat) && 
          !isNaN(point.lng)
        );

        if (validPoints.length === 0) {
          console.warn('HeatmapLayer: No hay puntos válidos para mostrar');
          return;
        }

        // Agrupar puntos por ubicación
        const locationIntensities = {};
        validPoints.forEach(point => {
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
        const maxCount = Math.max(...counts, 1);
        const minCount = Math.min(...counts, 1);

        // Convertir a puntos de calor con validación adicional
        const heatPoints = Object.values(locationIntensities)
          .map(location => {
            const normalizedCount = (location.count - minCount) / (maxCount - minCount || 1);
            return [
              location.lat,
              location.lng,
              Math.max(0.3, normalizedCount) // Reducido el valor mínimo para mayor contraste
            ];
          })
          .filter(point => point && point.length === 3);

        const defaultOptions = {
          radius: 25, // Reducido para mejor detalle
          blur: 15,   // Reducido para mejor definición
          maxZoom: 18,
          max: 1.0,
          minOpacity: 0.3,
          gradient: {
            0.0: '#3388ff',  // Azul más suave
            0.4: '#00ff00',  // Verde
            0.6: '#ffff00',  // Amarillo
            0.8: '#ff9900',  // Naranja
            1.0: '#ff0000'   // Rojo
          }
        };

        // Limpiar capa anterior si existe
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
        }

        // Crear nueva capa con las opciones combinadas
        const mergedOptions = { ...defaultOptions, ...options };
        const heatLayer = L.heatLayer(heatPoints, mergedOptions);

        // Guardar referencia y añadir al mapa
        layerRef.current = heatLayer;
        map.addLayer(heatLayer);

      } catch (error) {
        console.error('Error al crear el mapa de calor:', error);
      }
    };

    // Asegurarse de que el mapa esté en un estado estable
    requestAnimationFrame(() => {
      map.invalidateSize();
      initializeHeatmap();
    });

    // Cleanup
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [isMapReady, map, points, options]);

  return null;
};

export default HeatmapLayer;