import { useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';

interface MapPickerProps {
  onLocationSelect: (address: string, lat: number, lng: number) => void;
  initialCenter?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 28.0587, // USF Tampa campus
  lng: -82.4139,
};

export const MapPicker = ({ onLocationSelect, initialCenter }: MapPickerProps) => {
  const { isLoaded } = useGoogleMaps();
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarker({ lat, lng });

      // Reverse geocode to get address
      const geocoder = new google.maps.Geocoder();
      try {
        const result = await geocoder.geocode({ location: { lat, lng } });
        if (result.results[0]) {
          onLocationSelect(result.results[0].formatted_address, lat, lng);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    },
    [onLocationSelect]
  );

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter || defaultCenter}
        zoom={15}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>
      <p className="text-sm text-muted-foreground mt-2">
        Click anywhere on the map to set your destination
      </p>
    </div>
  );
};
