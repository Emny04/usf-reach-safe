import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
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

const defaultCenter: LatLngExpression = [28.0587, -82.4139]; // USF Tampa campus

function LocationMarker({ onLocationSelect }: { onLocationSelect: (address: string, lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click: async (e) => {
      setPosition(e.latlng);
      
      // Reverse geocode using Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`
        );
        const data = await response.json();
        onLocationSelect(data.display_name || 'Unknown location', e.latlng.lat, e.latlng.lng);
      } catch (error) {
        console.error('Geocoding error:', error);
        onLocationSelect('Unknown location', e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return position === null ? null : <Marker position={position} />;
}

const MapContent = ({ onLocationSelect }: { onLocationSelect: (address: string, lat: number, lng: number) => void }) => {
  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <LocationMarker onLocationSelect={onLocationSelect} />
    </>
  );
};

export const MapPicker = ({ onLocationSelect, initialCenter }: MapPickerProps) => {
  const center: LatLngExpression = initialCenter 
    ? [initialCenter.lat, initialCenter.lng]
    : defaultCenter;

  return (
    <div className="w-full">
      <div style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}>
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
          <MapContent onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Click anywhere on the map to set your destination
      </p>
    </div>
  );
};
