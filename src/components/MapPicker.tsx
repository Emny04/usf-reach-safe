import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onLocationSelect: (address: string, lat: number, lng: number) => void;
  initialCenter?: { lat: number; lng: number };
}

const defaultCenter = { lat: 28.0587, lng: -82.4139 }; // USF Tampa campus

export const MapPicker = ({ onLocationSelect, initialCenter }: MapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = initialCenter || defaultCenter;
    
    // Initialize map
    const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 15);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Handle map clicks
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // Update marker position state
      setMarkerPosition({ lat, lng });
      
      // Remove old marker if exists
      if (markerRef.current) {
        markerRef.current.remove();
      }
      
      // Add new marker
      markerRef.current = L.marker([lat, lng]).addTo(map);
      
      // Reverse geocode using Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        onLocationSelect(data.display_name || 'Unknown location', lat, lng);
      } catch (error) {
        console.error('Geocoding error:', error);
        onLocationSelect('Unknown location', lat, lng);
      }
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only initialize once

  // Re-add marker if position is set (for example after parent re-render)
  useEffect(() => {
    if (mapRef.current && markerPosition && !markerRef.current) {
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng]).addTo(mapRef.current);
    }
  }, [markerPosition]);

  return (
    <div className="w-full">
      <div 
        ref={mapContainerRef}
        style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      />
      <p className="text-sm text-muted-foreground mt-2">
        Click anywhere on the map to set your destination
      </p>
    </div>
  );
};
