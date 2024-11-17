import L from 'leaflet';

// Crear iconos SVG personalizados
const createCustomIcon = (svg) => {
  return L.divIcon({
    html: svg,
    className: 'custom-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export const icons = {
  'Alumbrado Público': createCustomIcon(`
    <svg viewBox="0 0 24 24" width="32" height="32" fill="white" style="background-color: rgba(0,0,0,0.6); border-radius: 50%; padding: 6px;">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
    </svg>
  `),
  
  'Bacheo': createCustomIcon(`
    <svg viewBox="0 0 24 24" width="32" height="32" fill="white" style="background-color: rgba(0,0,0,0.6); border-radius: 50%; padding: 6px;">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  `),
  
  'Basura acumulada': createCustomIcon(`
    <svg viewBox="0 0 24 24" width="32" height="32" fill="white" style="background-color: rgba(0,0,0,0.6); border-radius: 50%; padding: 6px;">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  `),
  
  'Drenajes Obstruidos': createCustomIcon(`
    <svg viewBox="0 0 24 24" width="32" height="32" fill="white" style="background-color: rgba(0,0,0,0.6); border-radius: 50%; padding: 6px;">
      <path d="M5.5 2C3.56 2 2 3.56 2 5.5v13C2 20.44 3.56 22 5.5 22H16l6-6V5.5C22 3.56 20.44 2 18.5 2h-13z M15 20v-1.5c0-1.38-1.12-2.5-2.5-2.5S10 17.12 10 18.5V20H5.5c-.83 0-1.5-.67-1.5-1.5S4.67 17 5.5 17h13.17L15 20z M17.23 10H6.77C6.34 10 6 10.34 6 10.77v2.46c0 .43.34.77.77.77h10.46c.43 0 .77-.34.77-.77v-2.46c0-.43-.34-.77-.77-.77z"/>
    </svg>
  `)
};