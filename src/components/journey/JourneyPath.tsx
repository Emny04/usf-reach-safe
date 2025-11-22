import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';

interface JourneyPathProps {
  map: L.Map;
  start: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/**
 * JourneyPath - Displays the route from current location to destination
 * Uses Leaflet Routing Machine with OSRM for realistic walking routes
 * Updates automatically as the user moves
 */
export const JourneyPath = ({ map, start, destination }: JourneyPathProps) => {
  const routingControlRef = useRef<L.Routing.Control | null>(null);
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

    // Remove old routing control and marker
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Create routing control with OSRM
    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot' // Walking route
      }),
      lineOptions: {
        styles: [{ color: '#10b981', weight: 5, opacity: 0.7 }],
        extendToWaypoints: false,
        missingRouteTolerance: 0
      },
      addWaypoints: false,
      show: false, // Hide the instruction panel
      fitSelectedRoutes: true,
      routeWhileDragging: false
    }).addTo(map);

    // Add destination marker
    destinationMarkerRef.current = L.marker(
      [destination.lat, destination.lng],
      { icon: destinationIcon }
    ).addTo(map);

    // Cleanup
    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
    };
  }, [map, start.lat, start.lng, destination.lat, destination.lng]);

  return null;
};
