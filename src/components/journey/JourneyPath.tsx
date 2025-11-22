import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface JourneyPathProps {
  map: L.Map;
  start: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/**
 * JourneyPath - Displays the route from current location to destination
 * Updates automatically as the user moves
 * Uses a simple straight line for now (can be upgraded to OSRM routing)
 */
export const JourneyPath = ({ map, start, destination }: JourneyPathProps) => {
  const pathRef = useRef<L.Polyline | null>(null);
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

  useEffect(() => {
    if (!map) return;

    // Remove old path and marker
    if (pathRef.current) {
      pathRef.current.remove();
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
    }

    // Draw straight line from start to destination
    const coordinates: [number, number][] = [
      [start.lat, start.lng],
      [destination.lat, destination.lng],
    ];

    // Create polyline path
    pathRef.current = L.polyline(coordinates, {
      color: '#10b981', // Green color
      weight: 4,
      opacity: 0.7,
      lineJoin: 'round',
      dashArray: '10, 10', // Dashed line
    }).addTo(map);

    // Add destination marker
    destinationMarkerRef.current = L.marker(
      [destination.lat, destination.lng],
      { icon: destinationIcon }
    ).addTo(map);

    // Fit map to show both start and destination
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup
    return () => {
      if (pathRef.current) {
        pathRef.current.remove();
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
      }
    };
  }, [map, start.lat, start.lng, destination.lat, destination.lng]);

  return null;
};
