import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, MapPin, Clock, User, Phone, TrendingUp, Route } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateTotalDistance, formatDistance, formatSpeed } from '@/utils/calculateDistance';
import { formatDistanceToNow } from 'date-fns';
import RouteSteps from '@/components/RouteSteps';

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

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface RouteStep {
  step_number: number;
  instruction: string;
  distance: number;
  duration: number;
  maneuver_type?: string;
  maneuver_modifier?: string;
}

export default function TrackJourney() {
  const { id } = useParams<{ id: string }>();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 28.0587, lng: -82.4139 });
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    fetchJourney();
    
    // Subscribe to journey updates for real-time location tracking
    const journeyChannel = supabase
      .channel(`public-journey-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'journeys',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setJourney((prev) => {
            if (!prev) return prev;
            return { ...prev, ...newData };
          });
          
          // Update map center if location changed
          if (newData.current_latitude && newData.current_longitude) {
            setMapCenter({ lat: newData.current_latitude, lng: newData.current_longitude });
          }
        }
      )
      .subscribe();

    // Subscribe to location history updates for breadcrumb trail
    const locationsChannel = supabase
      .channel(`journey-locations-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'journey_locations',
          filter: `journey_id=eq.${id}`,
        },
        (payload) => {
          const newLocation = payload.new as any;
          setLocationHistory((prev) => [...prev, {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            timestamp: newLocation.timestamp,
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(journeyChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, [id]);

  // Initialize and update map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already created
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([mapCenter.lat, mapCenter.lng], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center and marker when location changes
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.setView([mapCenter.lat, mapCenter.lng], 15);
    
    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
    }
    
    // Add new marker with custom color for live tracking
    const isLiveTracking = journey?.current_latitude && journey?.current_longitude;
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${isLiveTracking ? '#22c55e' : '#ef4444'};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isLiveTracking ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}
      "></div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    
    markerRef.current = L.marker([mapCenter.lat, mapCenter.lng], { icon }).addTo(mapRef.current);

    // Draw breadcrumb trail
    if (locationHistory.length > 1) {
      // Remove old path
      if (pathRef.current) {
        pathRef.current.remove();
      }

      // Create path from location history
      const pathCoordinates: [number, number][] = locationHistory.map(loc => [loc.latitude, loc.longitude]);
      
      pathRef.current = L.polyline(pathCoordinates, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1,
      }).addTo(mapRef.current);

      // Fit map to show entire path
      if (pathCoordinates.length > 0) {
        mapRef.current.fitBounds(pathRef.current.getBounds(), { padding: [50, 50] });
      }
    }
  }, [mapCenter, journey?.current_latitude, journey?.current_longitude, locationHistory]);

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

      // Fetch location history for breadcrumb trail
      const { data: locationsData } = await supabase
        .from('journey_locations')
        .select('latitude, longitude, timestamp')
        .eq('journey_id', id)
        .order('timestamp', { ascending: true });

      if (locationsData) {
        setLocationHistory(locationsData);
      }

      // Fetch route steps
      const { data: stepsData } = await supabase
        .from('journey_steps')
        .select('*')
        .eq('journey_id', id)
        .order('step_number', { ascending: true });

      if (stepsData) {
        setRouteSteps(stepsData);
      }
      
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

  // Calculate journey statistics
  const journeyStats = useMemo(() => {
    if (locationHistory.length < 2) {
      return { distance: 0, avgSpeed: 0, duration: 0 };
    }

    const distance = calculateTotalDistance(locationHistory);
    const startTime = new Date(locationHistory[0].timestamp).getTime();
    const endTime = new Date(locationHistory[locationHistory.length - 1].timestamp).getTime();
    const durationSeconds = (endTime - startTime) / 1000;
    const avgSpeed = durationSeconds > 0 ? distance / durationSeconds : 0;

    return {
      distance,
      avgSpeed,
      duration: durationSeconds,
    };
  }, [locationHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">SafeReach Journey Tracker</CardTitle>
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

        {/* Journey Statistics */}
        {locationHistory.length >= 2 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Journey Statistics
              </CardTitle>
              <CardDescription>Real-time tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Route className="h-4 w-4" />
                    <span className="text-sm">Distance Traveled</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDistance(journeyStats.distance)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Average Speed</span>
                  </div>
                  <p className="text-2xl font-bold">{formatSpeed(journeyStats.avgSpeed)}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Journey Duration</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDistanceToNow(new Date(journey.start_time), { addSuffix: false })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map with Live Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {journey.current_latitude ? 'Live Location' : 'Destination'}
            </CardTitle>
            {journey.current_latitude && journey.current_longitude ? (
              <CardDescription className="flex items-center gap-2">
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                </span>
                Live tracking active
                {journey.location_updated_at && (
                  <span className="text-muted-foreground">
                    • Updated {new Date(journey.location_updated_at).toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            ) : (
              <CardDescription>Showing destination - live tracking not started</CardDescription>
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

        {/* Route Steps */}
        {routeSteps.length > 0 && <RouteSteps steps={routeSteps} />}
      </div>
    </div>
  );
}
