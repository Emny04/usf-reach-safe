import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, MapPin, Clock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';

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
  const { isLoaded } = useGoogleMaps();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 28.0587, lng: -82.4139 }); // USF Tampa

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

  const fetchJourney = async () => {
    try {
      const { data, error } = await supabase
        .from('journeys')
        .select(`
          *,
          profiles!inner(name, phone),
          journey_contacts(contacts(name, phone)),
          journey_checkins(timestamp, response)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setJourney(data as any);
      
      // Use current location if available, otherwise geocode destination
      if (data?.current_latitude && data?.current_longitude) {
        setMapCenter({ 
          lat: data.current_latitude, 
          lng: data.current_longitude 
        });
      } else if (isLoaded && data?.dest_address) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: data.dest_address }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            const location = results[0].geometry.location;
            setMapCenter({ lat: location.lat(), lng: location.lng() });
          }
        });
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
        {isLoaded && (
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
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '300px', borderRadius: '0.5rem' }}
                center={mapCenter}
                zoom={15}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              >
                <Marker 
                  position={mapCenter}
                  icon={journey.current_latitude ? {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#00b894',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  } : undefined}
                />
              </GoogleMap>
            </CardContent>
          </Card>
        )}

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
