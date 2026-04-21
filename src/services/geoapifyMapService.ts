import { GEOAPIFY_API_KEY } from '../constants/api';

/**
 * Generate Geoapify Static Map URL for location display
 * @param lat - Latitude
 * @param lng - Longitude
 * @param width - Map width in pixels (default: 260)
 * @param height - Map height in pixels (default: 180)
 * @param zoom - Zoom level (default: 15)
 * @returns Geoapify Static Map URL
 */
export function getGeoapifyMapUrl(
  lat: number,
  lng: number,
  width: number = 260,
  height: number = 180,
  zoom: number = 15
): string {
  // Geoapify Static Maps API
  // Style: dark theme similar to WhatsApp
  const style = 'osm-bright'; // or 'osm-liberty', 'dark-matter', 'klokantech-basic'
  
  const url = `https://maps.geoapify.com/v1/staticmap?` +
    `style=${style}` +
    `&width=${width}` +
    `&height=${height}` +
    `&center=lonlat:${lng},${lat}` +
    `&zoom=${zoom}` +
    `&apiKey=${GEOAPIFY_API_KEY}`;

  return url;
}

/**
 * Generate Geoapify Static Map URL with custom marker
 * @param lat - Latitude
 * @param lng - Longitude
 * @param markerColor - Marker color in hex (default: #ff0000)
 * @param width - Map width in pixels (default: 260)
 * @param height - Map height in pixels (default: 180)
 * @returns Geoapify Static Map URL
 */
export function getGeoapifyMapUrlWithCustomMarker(
  lat: number,
  lng: number,
  markerColor: string = '#ff0000',
  width: number = 260,
  height: number = 180
): string {
  const color = markerColor.replace('#', '%23');
  return getGeoapifyMapUrl(lat, lng, width, height, 15)
    .replace('color:%23ff0000', `color:%23${color}`)
    .replace('color:#ff0000', `color:%23${color}`);
}

