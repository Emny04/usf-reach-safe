import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
}

export const useLocationTracking = (journeyId: string | undefined, isActive: boolean) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!journeyId || !isActive) return;

    let watchId: number;

    const startTracking = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        toast.error('Location tracking not available');
        return;
      }

      // Request location permission and start watching
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          setLocation(newLocation);
          setError(null);

          // Update location in database
          try {
            await supabase
              .from('journeys')
              .update({
                current_latitude: newLocation.latitude,
                current_longitude: newLocation.longitude,
                location_updated_at: new Date().toISOString(),
              })
              .eq('id', journeyId);
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        },
        (err) => {
          console.error('Location error:', err);
          setError(err.message);
          
          if (err.code === err.PERMISSION_DENIED) {
            toast.error('Location permission denied. Please enable location access.');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    };

    startTracking();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [journeyId, isActive]);

  return { location, error };
};
