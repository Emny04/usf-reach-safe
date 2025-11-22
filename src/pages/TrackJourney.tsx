import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, MapPin, Clock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface JourneyData {
  id: string;
  start_name: string;
  start_address: string;
  dest_name: string;
  dest_address: string;
  start_time: string;
  eta_time: string | null;
  end_time: string | null;
  status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  location_updated_at: string | null;
  profiles: {
    name: string;
    phone: string | null;
  };
  journey_contacts: Array<{
    contacts: {
      name: string;
      phone: string;
    };
  }>;
  journey_checkins: Array<{
    timestamp: string;
    response: string;
  }>;
}

export default function TrackJourney() {
  const { id } = useParams<{ id: string }>();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 28.0587, lng: -82.4139 });
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    fetchJourney();
    
    // Subscribe to journey updates
    const channel = supabase
      .channel(`public-journey-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journeys',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchJourney();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Initialize and update map
  useEffect(() => {
    if (!mapContainerRef.current || !journey) return;

    // Initialize map if not already created
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([mapCenter.lat, mapCenter.lng], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    // Update map center and marker
    if (mapRef.current) {
      mapRef.current.setView([mapCenter.lat, mapCenter.lng], 15);
      
      // Remove old marker
      if (markerRef.current) {
        markerRef.current.remove();
      }
      
      // Add new marker
      markerRef.current = L.marker([mapCenter.lat, mapCenter.lng]).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapCenter, journey]);

  const fetchJourney = async () => {
    try {
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select(`
          *,
          journey_contacts(contacts(name, phone)),
          journey_checkins(timestamp, response)
        `)
        .eq('id', id)
        .single();

      if (journeyError) throw journeyError;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', journeyData.user_id)
        .single();

      const data = {
        ...journeyData,
        profiles: profileData || { name: 'Unknown User', phone: null }
      };

      if (!data) throw new Error('Journey not found');
      
      setJourney(data as any);
      
      // Use current location if available, otherwise geocode destination
      if (data?.current_latitude && data?.current_longitude) {
        setMapCenter({ lat: data.current_latitude, lng: data.current_longitude });
      } else if (data?.dest_address) {
        // Geocode destination using Nominatim
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.dest_address)}&limit=1`
          );
          const geoData = await response.json();
          if (geoData[0]) {
            setMapCenter({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load journey');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading journey...</p>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Journey Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This journey link may be invalid or the journey has been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (journey.status) {
      case 'active':
        return <Badge className="bg-primary">Active Journey</Badge>;
      case 'completed_safe':
        return <Badge className="bg-success">Arrived Safely</Badge>;
      case 'alert_triggered':
        return <Badge variant="destructive">⚠️ Alert Triggered</Badge>;
      default:
        return <Badge variant="outline">{journey.status}</Badge>;
    }
  };

  const lastCheckin = journey.journey_checkins.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Safe Reach Journey Tracker</CardTitle>
            <div className="mt-2">{getStatusBadge()}</div>
          </CardHeader>
        </Card>

        {/* Traveler Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Traveler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-medium">{journey.profiles.name}</p>
            {journey.profiles.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {journey.profiles.phone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Journey Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">From</p>
              <p className="font-medium">{journey.start_name}</p>
              <p className="text-sm text-muted-foreground">{journey.start_address}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">To</p>
              <p className="font-medium">{journey.dest_name}</p>
              <p className="text-sm text-muted-foreground">{journey.dest_address}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Started: {new Date(journey.start_time).toLocaleString()}</span>
            </div>
            {journey.eta_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>ETA: {new Date(journey.eta_time).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map with Live Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {journey.current_latitude ? 'Current Location' : 'Destination'}
            </CardTitle>
            {journey.location_updated_at && (
              <CardDescription>
                Updated {new Date(journey.location_updated_at).toLocaleString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={mapContainerRef}
              style={{ height: '300px', width: '100%', borderRadius: '0.5rem' }}
            />
          </CardContent>
        </Card>

        {/* Last Check-in */}
        {lastCheckin && (
          <Card>
            <CardHeader>
              <CardTitle>Last Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {new Date(lastCheckin.timestamp).toLocaleString()}
              </p>
              <p className="mt-1">
                Status:{' '}
                <span className={lastCheckin.response === 'yes' ? 'text-success' : 'text-destructive'}>
                  {lastCheckin.response === 'yes' ? '✓ Safe' : '✗ Not Safe'}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contacts Notified</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {journey.journey_contacts.map((jc, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="font-medium">{jc.contacts.name}</span>
                  <span className="text-sm text-muted-foreground">{jc.contacts.phone}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
