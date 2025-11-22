import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (red pin for destination)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DestinationIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Green icon for starting point
const StartIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41">
      <path fill="#10b981" stroke="#fff" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
    </svg>
  `),
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom blue dot icon for current location
const CurrentLocationIcon = L.divIcon({
  className: 'custom-location-marker',
  html: `<div style="
    background-color: #3b82f6;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

L.Marker.prototype.options.icon = DestinationIcon;

interface MapPickerProps {
  onLocationSelect: (address: string, lat: number, lng: number) => void;
  startLocation?: { lat: number; lng: number } | null;
  initialCenter?: { lat: number; lng: number };
}

const defaultCenter = { lat: 28.0587, lng: -82.4139 }; // USF Tampa campus

export const MapPicker = ({ onLocationSelect, startLocation, initialCenter }: MapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeDrawn, setRouteDrawn] = useState(false);

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

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = currentLocation || initialCenter || defaultCenter;
    
    try {
      // Initialize map
      const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 15);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Wait for map to be ready
      map.whenReady(() => {
        setMapReady(true);
      });

      // Handle map clicks
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setMarkerPosition({ lat, lng });
        setRouteDrawn(false);
        
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
        map.remove();
        mapRef.current = null;
        setMapReady(false);
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Add current location marker when map is ready (only if no startLocation provided)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !currentLocation || startLocation) return;

    // Remove old marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }

    // Add new marker
    try {
      currentLocationMarkerRef.current = L.marker(
        [currentLocation.lat, currentLocation.lng],
        { icon: CurrentLocationIcon }
      ).addTo(mapRef.current);

      // Center on location if no destination set
      if (!markerPosition) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
      }
    } catch (error) {
      console.error('Error adding current location marker:', error);
    }
  }, [currentLocation, mapReady, markerPosition, startLocation]);

  // Add starting point marker when provided
  useEffect(() => {
    if (!mapRef.current || !mapReady || !startLocation) return;

    // Remove old start marker
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
    }

    // Remove current location marker if showing start location instead
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }

    try {
      // Add green starting point marker
      startMarkerRef.current = L.marker(
        [startLocation.lat, startLocation.lng],
        { icon: StartIcon }
      ).addTo(mapRef.current);

      // Center on start location if no destination set
      if (!markerPosition) {
        mapRef.current.setView([startLocation.lat, startLocation.lng], 15);
      }
    } catch (error) {
      console.error('Error adding start marker:', error);
    }
  }, [startLocation, mapReady, markerPosition]);

  // Add destination marker and route when position is set
  useEffect(() => {
    if (!mapRef.current || !mapReady || !markerPosition || routeDrawn) return;

    try {
      // Remove old destination marker
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
      }

      // Add new destination marker (red)
      destinationMarkerRef.current = L.marker([markerPosition.lat, markerPosition.lng], {
        icon: DestinationIcon
      }).addTo(mapRef.current);

      // Draw route from start location (or current location) to destination
      const origin = startLocation || currentLocation;
      if (origin && !routeDrawn) {
        drawRoute(origin, markerPosition);
      }
    } catch (error) {
      console.error('Error adding destination marker:', error);
    }
  }, [markerPosition, currentLocation, startLocation, mapReady, routeDrawn]);

  // Draw route between two points using Mapbox walking directions
  const drawRoute = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    if (!mapRef.current || !mapReady || routeDrawn) return;

    try {
      // Remove old route polyline before drawing a new one
      if (routeLineRef.current) {
        mapRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

      // If Mapbox token is missing, fall back to a straight line
      if (!mapboxToken) {
        console.error('Mapbox token not configured, using fallback straight route');
        const fallbackCoords: [number, number][] = [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ];

        routeLineRef.current = L.polyline(fallbackCoords, {
          color: '#00a86b',
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
          padding: [50, 50],
        });

        setRouteDrawn(true);
        return;
      }

      // Mapbox walking directions endpoint (must include "mapbox/walking")
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('Mapbox Directions error:', response.status, response.statusText);
      }

      const data = await response.json();

      if (data.routes && data.routes[0] && data.routes[0].geometry) {
        // Parse GeoJSON geometry into [lat, lng] pairs
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );

        routeLineRef.current = L.polyline(coords, {
          color: '#00a86b',
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);

        // Fit bounds to only this walking route
        mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
          padding: [50, 50],
        });

        setRouteDrawn(true);
      } else {
        console.warn('No walking route returned from Mapbox, using fallback');
        const fallbackCoords: [number, number][] = [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ];

        routeLineRef.current = L.polyline(fallbackCoords, {
          color: '#00a86b',
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
          padding: [50, 50],
        });

        setRouteDrawn(true);
      }
    } catch (error) {
      console.error('Error drawing walking route, using fallback:', error);

      if (mapRef.current) {
        const fallbackCoords: [number, number][] = [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ];

        routeLineRef.current = L.polyline(fallbackCoords, {
          color: '#00a86b',
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
          padding: [50, 50],
        });

        setRouteDrawn(true);
      }
    }
  };

  return (
    <div className="w-full">
      <div 
        ref={mapContainerRef}
        style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
      />
      <p className="text-sm text-muted-foreground mt-2">
        {startLocation ? (
          <>
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2 align-middle"></span>
            <span className="font-medium">Green pin</span> = Starting point • 
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mx-2 align-middle"></span>
            <span className="font-medium">Red pin</span> = Destination
          </>
        ) : currentLocation ? (
          <>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 align-middle"></span>
            Your location is shown in blue. Click anywhere to set your destination and see the walking route.
          </>
        ) : (
          'Click anywhere on the map to set your destination'
        )}
      </p>
    </div>
  );
};
