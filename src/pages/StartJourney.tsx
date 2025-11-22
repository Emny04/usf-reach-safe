import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Navigation, Clock } from 'lucide-react';
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
  const [destType, setDestType] = useState<'place' | 'custom'>('place');
  const [destPlaceId, setDestPlaceId] = useState('');
  const [destCustom, setDestCustom] = useState('');
  const [duration, setDuration] = useState('20');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

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
        .select('id, name, address')
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
    }

    if (!startName || !destName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const eta = addMinutes(now, parseInt(duration));

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
                <Input
                  id="startCustom"
                  value={startCustom}
                  onChange={(e) => setStartCustom(e.target.value)}
                  placeholder="Enter address or landmark"
                  required
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
                <Input
                  id="destCustom"
                  value={destCustom}
                  onChange={(e) => setDestCustom(e.target.value)}
                  placeholder="Enter address or landmark"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ETA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estimated Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="180"
                required
              />
            </div>
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

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Starting Journey...' : 'Start Journey'}
        </Button>
      </form>
    </div>
  );
}
