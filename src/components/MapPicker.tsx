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

const CurrentLocationIcon = L.divIcon({
  className: 'custom-current-location-marker',
  html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
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
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
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
      
      // Remove old destination marker if exists
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
      }
      
      // Add new destination marker
      destinationMarkerRef.current = L.marker([lat, lng]).addTo(map);
      
      // Draw route if we have current location
      if (currentLocation) {
        drawRoute(map, currentLocation, { lat, lng });
      }
      
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

  // Draw route between two points
  const drawRoute = async (
    map: L.Map,
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    try {
      // Remove old route if exists
      if (routeLineRef.current) {
        routeLineRef.current.remove();
      }

      // Get route from OSRM
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
        
        // Draw route line
        routeLineRef.current = L.polyline(coordinates, {
          color: '#10b981',
          weight: 4,
          opacity: 0.7,
          lineJoin: 'round'
        }).addTo(map);
        
        // Fit map to show both markers and route
        const bounds = L.latLngBounds([
          [origin.lat, origin.lng],
          [destination.lat, destination.lng]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  // Add/update current location marker
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      // Remove old current location marker if exists
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
      }
      
      // Add marker for current location with custom icon
      currentLocationMarkerRef.current = L.marker(
        [currentLocation.lat, currentLocation.lng],
        { icon: CurrentLocationIcon }
      ).addTo(mapRef.current);

      // Center map on current location only if no destination is set
      if (!markerPosition) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
      }
    }
  }, [currentLocation, markerPosition]);

  // Re-add destination marker and route if position is set (for example after parent re-render)
  useEffect(() => {
    if (mapRef.current && markerPosition) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker([markerPosition.lat, markerPosition.lng]).addTo(mapRef.current);
      }
      
      // Redraw route if we have current location
      if (currentLocation) {
        drawRoute(mapRef.current, currentLocation, markerPosition);
      }
    }
  }, [markerPosition, currentLocation]);

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
            Your location is shown in blue. Click anywhere to set your destination and see the walking route.
          </>
        ) : (
          'Click anywhere on the map to set your destination'
        )}
      </p>
    </div>
  );
};
