import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { toast } from 'sonner';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter address",
  className,
  id,
}: AddressAutocompleteProps) => {
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          setInputValue(place.formatted_address);
          onChange(place.formatted_address, place);
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places:', error);
      toast.error('Failed to initialize address autocomplete');
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  if (!isLoaded) {
    return (
      <Input
        type="text"
        placeholder="Loading Google Maps..."
        disabled
        className={className}
      />
    );
  }

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      placeholder={placeholder}
      value={inputValue}
      onChange={handleInputChange}
      className={className}
    />
  );
};
