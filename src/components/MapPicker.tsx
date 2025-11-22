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
  const currentLocationMarkerRef = useRef<L.Circle | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = currentLocation || initialCenter || defaultCenter;
    
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
  }, [currentLocation, initialCenter, onLocationSelect]);

  // Add/update current location marker
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      // Remove old current location marker if exists
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
      }
      
      // Add blue circle for current location
      currentLocationMarkerRef.current = L.circle(
        [currentLocation.lat, currentLocation.lng],
        {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          radius: 50,
          weight: 2
        }
      ).addTo(mapRef.current);

      // Center map on current location
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
    }
  }, [currentLocation]);

  // Re-add destination marker if position is set (for example after parent re-render)
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
        {currentLocation ? (
          <>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Your location is shown in blue. Click anywhere on the map to set your destination.
          </>
        ) : (
          'Click anywhere on the map to set your destination'
        )}
      </p>
    </div>
  );
};
