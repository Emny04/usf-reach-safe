import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';

interface JourneyPathProps {
  map: L.Map;
  start: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/**
 * JourneyPath - Displays the route from current location to destination
 * Uses Mapbox Directions API with walking mode for accurate campus routes
 * Updates automatically as the user moves
 */
export const JourneyPath = ({ map, start, destination }: JourneyPathProps) => {
  const routePolylineRef = useRef<L.Polyline | null>(null);
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

  /**
   * Fetch walking route from Mapbox Directions API
   * Returns array of [lat, lng] coordinates or null on error
   */
  const fetchWalkingRoute = async (
    start: { lat: number; lng: number },
    dest: { lat: number; lng: number }
  ): Promise<[number, number][] | null> => {
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      
      if (!mapboxToken) {
        console.error('Mapbox token not configured');
        return null;
      }

      // Mapbox uses [lng, lat] order
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.lng},${start.lat};${dest.lng},${dest.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox API error:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        console.error('No routes found');
        return null;
      }

      // Extract coordinates and convert from [lng, lat] to [lat, lng]
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: number[]) => [c[1], c[0]] as [number, number]
      );

      return coords;
    } catch (error) {
      console.error('Error fetching walking route:', error);
      return null;
    }
  };

  /**
   * Draw a fallback straight line if Mapbox routing fails
   */
  const drawFallbackRoute = (
    start: { lat: number; lng: number },
    dest: { lat: number; lng: number }
  ): L.Polyline => {
    return L.polyline(
      [[start.lat, start.lng], [dest.lat, dest.lng]],
      { color: '#10b981', weight: 5, opacity: 0.7 }
    );
  };

  useEffect(() => {
    if (!map) return;

    let mounted = true;

    // Clean up old route and marker
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Fetch and draw the walking route
    const drawRoute = async () => {
      const routeCoords = await fetchWalkingRoute(start, destination);

      if (!mounted) return;

      if (routeCoords && routeCoords.length > 0) {
        // Draw Mapbox walking route
        routePolylineRef.current = L.polyline(routeCoords, {
          color: '#00a86b',
          weight: 5,
          opacity: 0.8
        }).addTo(map);

        // Fit map bounds to route with padding
        map.fitBounds(routePolylineRef.current.getBounds(), { 
          padding: [50, 50],
          maxZoom: 17
        });
      } else {
        // Fallback: draw straight line if Mapbox fails
        console.warn('Using fallback straight-line route');
        routePolylineRef.current = drawFallbackRoute(start, destination).addTo(map);
        
        map.fitBounds(routePolylineRef.current.getBounds(), { 
          padding: [50, 50],
          maxZoom: 17
        });

        toast.error('No walking path found, showing direct route');
      }

      // Add destination marker
      destinationMarkerRef.current = L.marker(
        [destination.lat, destination.lng],
        { icon: destinationIcon }
      ).addTo(map);
    };

    drawRoute();

    // Cleanup on unmount or dependencies change
    return () => {
      mounted = false;
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
    };
  }, [map, start.lat, start.lng, destination.lat, destination.lng]);

  return null;
};
