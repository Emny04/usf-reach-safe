import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveLocationMarker } from './LiveLocationMarker';
import { JourneyPath } from './JourneyPath';
import { EmergencyButton } from './EmergencyButton';

interface MapContainerProps {
  destination: { lat: number; lng: number };
  currentLocation: { lat: number; lng: number } | null;
  onEmergency: () => void;
}

/**
 * MapContainer - Main map component that displays the journey
 * Handles map initialization, centering, and coordinates child components
 */
export const MapContainer = ({ destination, currentLocation, onEmergency }: MapContainerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Create map centered on destination initially
      const map = L.map(mapContainerRef.current).setView(
        [destination.lat, destination.lng],
        15
      );

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.whenReady(() => {
        setMapReady(true);
      });

      mapRef.current = map;

      // Cleanup on unmount
      return () => {
        map.remove();
        mapRef.current = null;
        setMapReady(false);
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [destination.lat, destination.lng]);

  // Auto-center on user's current location when it updates
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !mapReady) return;

    // Smoothly pan to current location
    mapRef.current.panTo([currentLocation.lat, currentLocation.lng], {
      animate: true,
      duration: 0.5,
    });
  }, [currentLocation, mapReady]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Live location marker overlay */}
      {mapReady && currentLocation && (
        <LiveLocationMarker
          map={mapRef.current!}
          location={currentLocation}
        />
      )}

      {/* Journey path overlay */}
      {mapReady && currentLocation && (
        <JourneyPath
          map={mapRef.current!}
          start={currentLocation}
          destination={destination}
        />
      )}

      {/* Emergency button overlay */}
      <EmergencyButton onClick={onEmergency} />

      {/* Recenter button */}
      {currentLocation && (
        <button
          onClick={() => {
            if (mapRef.current && currentLocation) {
              mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15, {
                animate: true,
              });
            }
          }}
          className="absolute bottom-4 right-4 z-[1000] p-3 bg-background border border-border rounded-full shadow-lg hover:bg-accent transition-colors"
          title="Recenter on my location"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </div>
  );
};
