import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LiveLocationMarkerProps {
  map: L.Map;
  location: { lat: number; lng: number };
}

/**
 * LiveLocationMarker - Displays user's current location as a blue pulsing dot
 * Updates in real-time as the user moves
 */
export const LiveLocationMarker = ({ map, location }: LiveLocationMarkerProps) => {
  const markerRef = useRef<L.Marker | null>(null);

  // Custom blue dot icon for live location
  const liveLocationIcon = L.divIcon({
    className: 'live-location-marker',
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
      ">
        <!-- Pulsing outer ring -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background-color: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        "></div>
        <!-- Inner blue dot -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background-color: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.3;
          }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Update marker position when location changes
  useEffect(() => {
    if (!map) return;

    // Remove old marker if exists
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create new marker at current location
    markerRef.current = L.marker([location.lat, location.lng], {
      icon: liveLocationIcon,
      zIndexOffset: 1000, // Ensure it's on top
    }).addTo(map);

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, location.lat, location.lng]);

  return null;
};
