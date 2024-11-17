// geocodingService.js
const locationCache = new Map();

const extractCodigoPostal = (direccion) => {
  if (!direccion || typeof direccion !== 'string') return null;
  const cpMatch = direccion.match(/\b(\d{5})\b/);
  return cpMatch ? cpMatch[1] : null;
};

const getLocationFromGeoNames = async (codigoPostal) => {
  try {
    const response = await fetch(
      `https://secure.geonames.org/postalCodeLookupJSON?postalcode=${codigoPostal}&country=MX&username=valisama`
    );

    if (!response.ok) {
      throw new Error('Error en la respuesta de GeoNames');
    }

    const data = await response.json();
    
    if (data && data.postalcodes && data.postalcodes.length > 0) {
      const place = data.postalcodes[0];
      return {
        colonia: place.placeName || 'Sin especificar',
        codigoPostal: codigoPostal,
        ciudad: place.adminName3 || 'Chetumal',
        estado: place.adminName1 || 'Quintana Roo',
        municipio: place.adminName2 || 'Othón P. Blanco',
        colonias: data.postalcodes.map(p => p.placeName).filter(Boolean)
      };
    }
    
    throw new Error('No se encontraron datos para este código postal');
  } catch (error) {
    console.error('Error al obtener datos de GeoNames:', error);
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

    // Extraer código postal de la dirección
    const codigoPostal = extractCodigoPostal(direccion);
    
    if (codigoPostal) {
      // Intentar obtener datos de GeoNames
      const geonamesData = await getLocationFromGeoNames(codigoPostal);
      
      if (geonamesData) {
        // Si tenemos múltiples colonias, intentar encontrar la correcta basándonos en la dirección
        let coloniaSeleccionada = geonamesData.colonia;
        if (geonamesData.colonias && geonamesData.colonias.length > 0) {
          // Si la dirección contiene el nombre de alguna colonia, usamos esa
          const coloniaEnDireccion = geonamesData.colonias.find(col => 
            direccion.toLowerCase().includes(col.toLowerCase())
          );
          if (coloniaEnDireccion) {
            coloniaSeleccionada = coloniaEnDireccion;
          }
        }

        const locationDetails = {
          colonia: coloniaSeleccionada,
          codigoPostal: geonamesData.codigoPostal,
          ciudad: geonamesData.ciudad,
          estado: geonamesData.estado,
          municipio: geonamesData.municipio,
          direccionCompleta: direccion,
          todasLasColonias: geonamesData.colonias
        };

        // Guardar en caché
        locationCache.set(key, locationDetails);
        return locationDetails;
      }
    }

    // Si no podemos obtener datos de GeoNames, usar valores por defecto
    return {
      colonia: 'Sin especificar',
      codigoPostal: codigoPostal || 'Sin especificar',
      ciudad: 'Chetumal',
      estado: 'Quintana Roo',
      municipio: 'Othón P. Blanco',
      direccionCompleta: direccion,
      todasLasColonias: []
    };

  } catch (error) {
    console.error('Error en getCachedLocationDetails:', error);
    return {
      colonia: 'Sin especificar',
      codigoPostal: 'Sin especificar',
      ciudad: 'Chetumal',
      estado: 'Quintana Roo',
      municipio: 'Othón P. Blanco',
      direccionCompleta: 'Sin dirección',
      todasLasColonias: []
    };
  }
};