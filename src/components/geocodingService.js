const locationCache = new Map();

const extractLocationInfo = (addressComponents) => {
  let info = {
    colonia: '',
    codigoPostal: '',
    ciudad: '',
    estado: '',
    route: '', // calle
    streetNumber: '' // número
  };

  for (const component of addressComponents) {
    const types = component.types;

    if (types.includes('route')) {
      info.route = component.long_name;
    }
    else if (types.includes('street_number')) {
      info.streetNumber = component.long_name;
    }
    else if (types.includes('sublocality_level_1') || 
             types.includes('neighborhood') || 
             types.includes('sublocality')) {
      info.colonia = component.long_name;
    }
    else if (types.includes('postal_code')) {
      info.codigoPostal = component.long_name;
    }
    else if (types.includes('locality')) {
      info.ciudad = component.long_name;
    }
    else if (types.includes('administrative_area_level_1')) {
      info.estado = component.long_name;
    }
  }

  return info;
};

const getLocationFromGoogle = async (latitud, longitud) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitud},${longitud}&key=AIzaSyD_sitGGMIJT0rDtKWuP18_lbEXQPC0cpk&language=es`
    );

    if (!response.ok) {
      throw new Error('Error en la respuesta de Google Maps');
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const todasLasColonias = new Set();
      let locationInfo = null;
      
      // Analizar todos los resultados para encontrar la mejor información
      for (const result of data.results) {
        const currentInfo = extractLocationInfo(result.address_components);
        
        if (currentInfo.colonia) {
          todasLasColonias.add(currentInfo.colonia);
        }
        
        // Guardar la primera información completa que encontremos
        if (!locationInfo && currentInfo.route) {
          locationInfo = currentInfo;
        }
      }

      // Si no encontramos información específica, usar el primer resultado
      if (!locationInfo) {
        locationInfo = extractLocationInfo(data.results[0].address_components);
      }

      // Si aún no tenemos colonia, intentar extraerla del formatted_address
      if (todasLasColonias.size === 0 && data.results[0].formatted_address) {
        const addressParts = data.results[0].formatted_address.split(',');
        if (addressParts.length > 1) {
          // Intentar usar la segunda parte como colonia
          const posibleColonia = addressParts[1].trim();
          if (posibleColonia && !posibleColonia.match(/^\d/)) { // Evitar usar números como colonia
            todasLasColonias.add(posibleColonia);
          }
        }
      }

      // Construir la dirección completa si tenemos calle y número
      let direccionPrimaria = '';
      if (locationInfo.route) {
        direccionPrimaria = locationInfo.route;
        if (locationInfo.streetNumber) {
          direccionPrimaria += ` ${locationInfo.streetNumber}`;
        }
      }

      return {
        colonia: Array.from(todasLasColonias)[0] || direccionPrimaria || 'Sin especificar',
        codigoPostal: locationInfo.codigoPostal || 'Sin especificar',
        ciudad: locationInfo.ciudad || 'Chetumal',
        estado: locationInfo.estado || 'Quintana Roo',
        municipio: 'Othón P. Blanco',
        direccionCompleta: data.results[0].formatted_address,
        todasLasColonias: Array.from(todasLasColonias),
        direccionPrimaria: direccionPrimaria
      };
    }
    
    throw new Error('No se encontraron datos para estas coordenadas');
  } catch (error) {
    console.error('Error al obtener datos de Google Maps:', error);
    return null;
  }
};

export const getCachedLocationDetails = async (latitud, longitud, direccion = '') => {
  try {
    const key = `${latitud},${longitud}`;
    
    // Verificar caché
    if (locationCache.has(key)) {
      return locationCache.get(key);
    }

    // Obtener datos usando geocodificación inversa
    const locationData = await getLocationFromGoogle(latitud, longitud);
    
    if (locationData) {
      // Guardar en caché
      locationCache.set(key, locationData);
      return locationData;
    }

    // Si no podemos obtener datos, usar valores por defecto
    return {
      colonia: direccion || 'Sin especificar',
      codigoPostal: 'Sin especificar',
      ciudad: 'Chetumal',
      estado: 'Quintana Roo',
      municipio: 'Othón P. Blanco',
      direccionCompleta: direccion,
      todasLasColonias: [],
      direccionPrimaria: ''
    };

  } catch (error) {
    console.error('Error en getCachedLocationDetails:', error);
    return {
      colonia: direccion || 'Sin especificar',
      codigoPostal: 'Sin especificar',
      ciudad: 'Chetumal',
      estado: 'Quintana Roo',
      municipio: 'Othón P. Blanco',
      direccionCompleta: direccion,
      todasLasColonias: [],
      direccionPrimaria: ''
    };
  }
};