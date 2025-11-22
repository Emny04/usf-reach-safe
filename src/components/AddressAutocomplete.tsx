import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: any) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter address",
  className,
  id,
}: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&countrycodes=us&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        toast.error('Failed to fetch address suggestions');
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectSuggestion = (suggestion: NominatimResult) => {
    setInputValue(suggestion.display_name);
    onChange(suggestion.display_name, {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className={className}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              {suggestion.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
