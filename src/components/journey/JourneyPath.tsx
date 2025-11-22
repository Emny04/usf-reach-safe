import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface JourneyPathProps {
  map: L.Map;
  start: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/**
 * JourneyPath - Displays the route from current location to destination
 * Uses Mapbox Directions API with walking mode for accurate pedestrian routes
 * Updates automatically as the user moves
 */
export const JourneyPath = ({ map, start, destination }: JourneyPathProps) => {
  const destinationMarkerRef = useRef<L.Marker | null>(null);

  // Destination marker icon (red pin)
  const destinationIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41">
        <path fill="#ef4444" stroke="#fff" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
      </svg>
    `),
    iconSize: [30, 48],
    iconAnchor: [15, 48],
  });

  // Mapbox walking route drawer (adapted for Vite env)
  async function drawWalkingRoute(
    mapInstance: L.Map,
    startPoint: { lat: number; lng: number },
    endPoint: { lat: number; lng: number }
  ) {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

    if (!token) {
      console.error('Mapbox token not configured; walking route cannot be drawn');
      return;
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?geometries=geojson&overview=full&access_token=${token}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return;

    const coords = data.routes[0].geometry.coordinates.map(
      (c: number[]) => [c[1], c[0]]
    );

    // Prevent overlapping routes by tracking currentRoute on window
    const w = window as any;
    if (w.currentRoute) {
      mapInstance.removeLayer(w.currentRoute);
    }

    w.currentRoute = L.polyline(coords, {
      color: '#00a86b',
      weight: 5,
    }).addTo(mapInstance);

    mapInstance.fitBounds(w.currentRoute.getBounds(), { padding: [50, 50] });
  }

  useEffect(() => {
    if (!map) return;

    let mounted = true;

    // Remove old destination marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Draw walking route and destination marker
    (async () => {
      await drawWalkingRoute(map, start, destination);
      if (!mounted) return;

      destinationMarkerRef.current = L.marker(
        [destination.lat, destination.lng],
        { icon: destinationIcon }
      ).addTo(map);
    })();

    return () => {
      mounted = false;
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
    };
  }, [map, start.lat, start.lng, destination.lat, destination.lng]);

  return null;
};
