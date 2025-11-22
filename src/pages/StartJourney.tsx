import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapPicker } from '@/components/MapPicker';
import { calculateTravelTime } from '@/utils/calculateETA';
import { MapPin, Navigation, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addMinutes } from 'date-fns';

interface Contact {
  id: string;
  name: string;
}

interface SafePlace {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export default function StartJourney() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [startType, setStartType] = useState<'current' | 'place' | 'custom'>('current');
  const [startPlaceId, setStartPlaceId] = useState('');
  const [startCustom, setStartCustom] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destType, setDestType] = useState<'place' | 'custom' | 'map'>('place');
  const [destPlaceId, setDestPlaceId] = useState('');
  const [destCustom, setDestCustom] = useState('');
  const [destMapAddress, setDestMapAddress] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [routeSteps, setRouteSteps] = useState<Array<{
    instruction: string;
    distance: number;
    duration: number;
    maneuver_type?: string;
    maneuver_modifier?: string;
  }>>([]);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatingETA, setCalculatingETA] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    
    // Get user's current location on mount if using current location
    if (startType === 'current' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStartCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    } else if (startType !== 'current') {
      // Clear startCoords when not using current location
      setStartCoords(null);
    }
  }, [user, navigate, startType]);

  const fetchData = async () => {
    try {
      // Fetch contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, name, is_default')
        .eq('user_id', user?.id);

      if (contactsData) {
        setContacts(contactsData);
        // Auto-select default contacts
        const defaultIds = contactsData
          .filter(c => c.is_default)
          .map(c => c.id);
        setSelectedContacts(new Set(defaultIds));
      }

      // Fetch safe places
      const { data: placesData } = await supabase
        .from('safe_places')
        .select('id, name, address, latitude, longitude')
        .or(`user_id.eq.${user?.id},is_usf_recommended.eq.true`);

      if (placesData) {
        setSafePlaces(placesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const toggleContact = (id: string) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedContacts(newSet);
  };

  const calculateETA = async (origin: string | { lat: number; lng: number }, destination: string | { lat: number; lng: number }) => {
    if (!origin || !destination) return;
    
    setCalculatingETA(true);
    try {
      const result = await calculateTravelTime(origin, destination);
      if (result) {
        setCalculatedDuration(result.duration);
        setCalculatedDistance(result.distance);
        setRouteSteps(result.steps);
        const distanceInMiles = (result.distance * 0.000621371).toFixed(2);
        toast.success(`Route calculated: ${result.duration} min walk • ${distanceInMiles} mi`);
      } else {
        setCalculatedDuration(20); // Default fallback
        setCalculatedDistance(null);
        toast.info('Could not calculate exact time, using estimate');
      }
    } catch (error) {
      console.error('ETA calculation error:', error);
      setCalculatedDuration(20); // Default fallback
      setCalculatedDistance(null);
      toast.info('Could not calculate exact time, using estimate');
    } finally {
      setCalculatingETA(false);
    }
  };

  // Auto-calculate ETA when both start and destination are set
  useEffect(() => {
    const calculateRouteETA = async () => {
      let origin: string | { lat: number; lng: number } | null = null;
      let destination: string | { lat: number; lng: number } | null = null;

      // Get origin - use stored coords or geolocation for current location
      if (startType === 'current') {
        if (startCoords) {
          origin = startCoords;
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setStartCoords(coords);
            },
            (error) => {
              console.error('Geolocation error:', error);
              toast.error('Could not get your location');
            }
          );
          return; // Wait for coords to be set
        }
      } else if (startType === 'place' && startPlaceId) {
        const place = safePlaces.find(p => p.id === startPlaceId);
        if (place) {
          // Use stored coordinates if available
          if (place.latitude && place.longitude) {
            const coords = { lat: place.latitude, lng: place.longitude };
            setStartCoords(coords);
            origin = coords;
          } else {
            origin = place.address;
          }
        }
      } else if (startType === 'custom' && startCustom) {
        // Geocode custom address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startCustom)}&limit=1`
          );
          const data = await response.json();
          if (data[0]) {
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            setStartCoords(coords);
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
        origin = startCustom;
      }

      // Get destination - use stored coords when available
      if (destType === 'place' && destPlaceId) {
        const place = safePlaces.find(p => p.id === destPlaceId);
        if (place) {
          if (place.latitude && place.longitude) {
            destination = { lat: place.latitude, lng: place.longitude };
          } else {
            destination = place.address;
          }
        }
      } else if (destType === 'custom' && destCustom) {
        destination = destCustom;
      } else if (destType === 'map') {
        if (destCoords) {
          destination = destCoords;
        } else if (destMapAddress) {
          destination = destMapAddress;
        }
      }

      if (origin && destination) {
        await calculateETA(origin, destination);
      }
    };

    calculateRouteETA();
  }, [startType, startPlaceId, startCustom, startCoords, destType, destPlaceId, destCustom, destMapAddress, destCoords, safePlaces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedContacts.size === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    // Determine start location
    let startName = '';
    let startAddress = '';

    if (startType === 'current') {
      startName = 'Current Location';
      startAddress = 'Current Location';
    } else if (startType === 'place' && startPlaceId) {
      const place = safePlaces.find(p => p.id === startPlaceId);
      if (place) {
        startName = place.name;
        startAddress = place.address;
      }
    } else if (startType === 'custom' && startCustom) {
      startName = startCustom;
      startAddress = startCustom;
    }

    // Determine destination
    let destName = '';
    let destAddress = '';

    if (destType === 'place' && destPlaceId) {
      const place = safePlaces.find(p => p.id === destPlaceId);
      if (place) {
        destName = place.name;
        destAddress = place.address;
      }
    } else if (destType === 'custom' && destCustom) {
      destName = destCustom;
      destAddress = destCustom;
    } else if (destType === 'map' && destMapAddress) {
      destName = destMapAddress;
      destAddress = destMapAddress;
    }

    if (!startName || !destName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const duration = calculatedDuration || 20; // Use calculated or fallback
      const eta = addMinutes(now, duration);

      // Create journey
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .insert({
          user_id: user?.id,
          start_name: startName,
          start_address: startAddress,
          dest_name: destName,
          dest_address: destAddress,
          start_time: now.toISOString(),
          eta_time: eta.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (journeyError) throw journeyError;

      // Add journey contacts
      const contactInserts = Array.from(selectedContacts).map(contactId => ({
        journey_id: journeyData.id,
        contact_id: contactId,
      }));

      const { error: contactError } = await supabase
        .from('journey_contacts')
        .insert(contactInserts);

      if (contactError) throw contactError;

      // Create notification log for journey start
      const notificationInserts = Array.from(selectedContacts).map(contactId => ({
        journey_id: journeyData.id,
        contact_id: contactId,
        type: 'start' as const,
        message: `Journey started from ${startName} to ${destName}`,
      }));

      await supabase.from('notifications_log').insert(notificationInserts);

      // Save route steps if available
      if (routeSteps.length > 0) {
        const stepsInserts = routeSteps.map((step, index) => ({
          journey_id: journeyData.id,
          step_number: index + 1,
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
          maneuver_type: step.maneuver_type,
          maneuver_modifier: step.maneuver_modifier,
        }));

        await supabase.from('journey_steps').insert(stepsInserts);
      }

      toast.success('Journey started! Your contacts have been notified.');
      navigate(`/journey/${journeyData.id}`);
    } catch (error: any) {
      console.error('Error starting journey:', error);
      toast.error('Failed to start journey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Start a Journey</h1>
        <p className="text-muted-foreground">Let your contacts know you're on the move</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Starting Point */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Starting Point
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={startType} onValueChange={(v: any) => setStartType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Location</SelectItem>
                  <SelectItem value="place">Saved Place</SelectItem>
                  <SelectItem value="custom">Custom Address</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {startType === 'place' && (
              <div className="space-y-2">
                <Label>Select Place</Label>
                <Select value={startPlaceId} onValueChange={setStartPlaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a place" />
                  </SelectTrigger>
                  <SelectContent>
                    {safePlaces.map(place => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {startType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="startCustom">Address</Label>
                <AddressAutocomplete
                  id="startCustom"
                  value={startCustom}
                  onChange={(address) => setStartCustom(address)}
                  placeholder="Start typing an address..."
                  className="h-12"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={destType} onValueChange={(v: any) => setDestType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="place">Saved Place</SelectItem>
                  <SelectItem value="custom">Custom Address</SelectItem>
                  <SelectItem value="map">Pick on Map</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {destType === 'place' && (
              <div className="space-y-2">
                <Label>Select Place</Label>
                <Select value={destPlaceId} onValueChange={setDestPlaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a place" />
                  </SelectTrigger>
                  <SelectContent>
                    {safePlaces.map(place => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {destType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="destCustom">Address</Label>
                <AddressAutocomplete
                  id="destCustom"
                  value={destCustom}
                  onChange={(address) => setDestCustom(address)}
                  placeholder="Where are you going..."
                  className="h-12"
                />
              </div>
            )}

            {destType === 'map' && (
              <div className="space-y-2">
                <MapPicker
                  startLocation={startCoords}
                  onLocationSelect={(address, lat, lng) => {
                    setDestMapAddress(address);
                    setDestCoords({ lat, lng });
                  }}
                />
                {destMapAddress && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Selected location:</p>
                    <p className="text-sm text-muted-foreground">{destMapAddress}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ETA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estimated Arrival Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculatingETA ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Calculating travel time...</span>
              </div>
            ) : calculatedDuration ? (
              <div className="space-y-2">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Estimated walking time</p>
                  <p className="text-2xl font-bold">{calculatedDuration} minutes</p>
                  {calculatedDistance && (
                    <p className="text-sm text-muted-foreground">
                      Distance: {(calculatedDistance * 0.000621371).toFixed(2)} miles
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    ETA: {addMinutes(new Date(), calculatedDuration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set your destination to calculate travel time
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Notify Contacts</CardTitle>
            <CardDescription>Select who should receive updates</CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contacts found. <button type="button" onClick={() => navigate('/contacts')} className="text-primary underline">Add contacts</button>
              </p>
            ) : (
              <div className="space-y-3">
                {contacts.map(contact => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <Label htmlFor={contact.id} className="flex-1 cursor-pointer">
                      {contact.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg" disabled={loading}>
          {loading ? 'Starting Journey...' : 'Start Journey'}
        </Button>
      </form>
    </div>
  );
}
