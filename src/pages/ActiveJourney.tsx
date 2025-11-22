import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Users, CheckCircle, AlertTriangle, Shield, Share2, Copy, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import RouteSteps from '@/components/RouteSteps';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Journey {
  id: string;
  start_name: string;
  dest_name: string;
  eta_time: string;
  status: string;
  start_time: string;
}

interface Contact {
  id: string;
  name: string;
}

interface CheckIn {
  id: string;
  response: string;
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

export default function ActiveJourney() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [checkInTimer, setCheckInTimer] = useState<NodeJS.Timeout | null>(null);
  const [locationHistory, setLocationHistory] = useState<Array<{ latitude: number; longitude: number; timestamp: string }>>([]);
  
  // Map refs
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const currentMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  
  // Live location tracking
  const { location, error: locationError } = useLocationTracking(id, journey?.status === 'active');

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }
    fetchJourneyData();

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
      supabase.removeChannel(locationsChannel);
    };
  }, [user, id, navigate]);

  useEffect(() => {
    // Set up periodic check-ins (every 3 minutes)
    if (journey && journey.status === 'active') {
      const timer = setInterval(() => {
        setShowCheckInDialog(true);
      }, 3 * 60 * 1000); // 3 minutes

      setCheckInTimer(timer);

      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [journey]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !journey) return;

    // Initialize map if not already created
    if (!mapRef.current) {
      const defaultCenter: [number, number] = [28.0587, -82.4139]; // USF Tampa
      mapRef.current = L.map(mapContainerRef.current).setView(defaultCenter, 15);
      
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
  }, [journey]);

  // Update map with markers and path
  useEffect(() => {
    if (!mapRef.current || !journey) return;

    // Add destination marker
    if (!destinationMarkerRef.current) {
      // Geocode destination to get coordinates
      const geocodeDestination = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(journey.dest_name)}&limit=1`
          );
          const data = await response.json();
          if (data[0]) {
            const destCoords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            
            const destIcon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                background-color: #ef4444;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            destinationMarkerRef.current = L.marker(destCoords, { icon: destIcon }).addTo(mapRef.current);
            destinationMarkerRef.current.bindPopup(`<b>Destination:</b><br>${journey.dest_name}`);
            
            // Center map on destination initially
            if (!location) {
              mapRef.current.setView(destCoords, 15);
            }
          }
        } catch (error) {
          console.error('Error geocoding destination:', error);
        }
      };

      geocodeDestination();
    }

    // Update current location marker
    if (location) {
      const currentCoords: [number, number] = [location.latitude, location.longitude];
      
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setLatLng(currentCoords);
      } else {
        const currentIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: #22c55e;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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

        currentMarkerRef.current = L.marker(currentCoords, { icon: currentIcon }).addTo(mapRef.current);
        currentMarkerRef.current.bindPopup('<b>Your Current Location</b>');
      }

      // Center map on current location
      mapRef.current.setView(currentCoords, 16);
    }

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
    }
  }, [location, journey, locationHistory]);

  const fetchJourneyData = async () => {
    try {
      // Fetch journey
      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', id)
        .single();

      if (journeyError) throw journeyError;
      setJourney(journeyData);

      // Fetch journey contacts
      const { data: contactsData } = await supabase
        .from('journey_contacts')
        .select('contact_id, contacts(id, name)')
        .eq('journey_id', id);

      if (contactsData) {
        const contactsList = contactsData
          .map(jc => (jc.contacts as unknown as Contact))
          .filter(c => c !== null);
        setContacts(contactsList);
      }

      // Fetch check-ins
      const { data: checkInsData } = await supabase
        .from('journey_checkins')
        .select('*')
        .eq('journey_id', id)
        .order('timestamp', { ascending: false });

      if (checkInsData) {
        setCheckIns(checkInsData);
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

      // Fetch location history for breadcrumb trail
      const { data: locationsData } = await supabase
        .from('journey_locations')
        .select('latitude, longitude, timestamp')
        .eq('journey_id', id)
        .order('timestamp', { ascending: true });

      if (locationsData) {
        setLocationHistory(locationsData);
      }
    } catch (error) {
      console.error('Error fetching journey data:', error);
      toast.error('Failed to load journey data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (response: 'yes' | 'no') => {
    try {
      // Record check-in
      await supabase.from('journey_checkins').insert({
        journey_id: id,
        response,
      });

      if (response === 'no') {
        // Update journey status to alert
        await supabase
          .from('journeys')
          .update({ status: 'alert_triggered' })
          .eq('id', id);

        // Create danger notifications
        const notificationInserts = contacts.map(contact => ({
          journey_id: id,
          contact_id: contact.id,
          type: 'danger_alert' as const,
          message: `ALERT: User indicated they are NOT safe!`,
        }));

        await supabase.from('notifications_log').insert(notificationInserts);

        toast.error('Alert sent to your contacts!');
        fetchJourneyData();
      } else {
        toast.success('Check-in recorded');
        fetchJourneyData();
      }

      setShowCheckInDialog(false);
    } catch (error) {
      console.error('Error recording check-in:', error);
      toast.error('Failed to record check-in');
    }
  };

  const handleArrivedSafely = async () => {
    if (!confirm('Mark journey as complete?')) return;

    try {
      await supabase
        .from('journeys')
        .update({
          status: 'completed_safe',
          end_time: new Date().toISOString(),
        })
        .eq('id', id);

      // Create safe arrival notifications
      const notificationInserts = contacts.map(contact => ({
        journey_id: id,
        contact_id: contact.id,
        type: 'arrival_safe' as const,
        message: `User has arrived safely at ${journey?.dest_name}`,
      }));

      await supabase.from('notifications_log').insert(notificationInserts);

      toast.success('Journey completed! Your contacts have been notified.');
      navigate('/');
    } catch (error) {
      console.error('Error completing journey:', error);
      toast.error('Failed to complete journey');
    }
  };

  const handleNotSafe = async () => {
    if (!confirm('This will send an ALERT to all your contacts. Are you sure?')) return;

    try {
      await supabase
        .from('journeys')
        .update({ status: 'alert_triggered' })
        .eq('id', id);

      // Record check-in
      await supabase.from('journey_checkins').insert({
        journey_id: id,
        response: 'no',
      });

      // Create danger notifications
      const notificationInserts = contacts.map(contact => ({
        journey_id: id,
        contact_id: contact.id,
        type: 'danger_alert' as const,
        message: `EMERGENCY ALERT: User indicated they are NOT safe!`,
      }));

      await supabase.from('notifications_log').insert(notificationInserts);

      toast.error('Emergency alert sent to your contacts!');
      fetchJourneyData();
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Failed to send alert');
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading...</div>;
  }

  if (!journey) {
    return (
      <div className="py-12 text-center">
        <p>Journey not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }

  const isActive = journey.status === 'active';
  const isAlert = journey.status === 'alert_triggered';
  const lastCheckIn = checkIns[0];
  const trackingUrl = `${window.location.origin}/track/${id}`;

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      toast.success('Tracking link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareTrackingLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Track My Journey - Safe Reach',
          text: `I'm on my way. Track my journey here:`,
          url: trackingUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      copyTrackingLink();
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Journey Status</h1>
        <Badge
          variant={isAlert ? 'destructive' : isActive ? 'default' : 'secondary'}
          className="mt-2"
        >
          {journey.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Live Location Status */}
      {isActive && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-success" />
              Live Location Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your location is being shared with your contacts in real-time
                </p>
              </div>
            ) : locationError ? (
              <div className="text-sm text-destructive">
                Location tracking unavailable. Please enable location permissions.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Acquiring location...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Map */}
      {journey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Journey Map
            </CardTitle>
            <CardDescription>
              {location ? 'Live location and destination' : 'Destination location'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={mapContainerRef}
              style={{ height: '300px', width: '100%', borderRadius: '0.5rem' }}
            />
          </CardContent>
        </Card>
      )}

      {/* Shareable Tracking Link */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Journey Status
          </CardTitle>
          <CardDescription>
            Share this link with anyone to let them track your journey in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={trackingUrl}
              readOnly
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyTrackingLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={shareTrackingLink}
            variant="default"
            className="w-full"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
        </CardContent>
      </Card>

      {/* Journey Details */}
      <Card className={isAlert ? 'border-destructive/50 bg-destructive/5' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="font-medium">{journey.start_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">To</p>
            <p className="font-medium">{journey.dest_name}</p>
          </div>
          {journey.eta_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                ETA: {formatDistanceToNow(new Date(journey.eta_time), { addSuffix: true })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Notified Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{contact.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Steps */}
      {routeSteps.length > 0 && <RouteSteps steps={routeSteps} />}

      {/* Last Check-in */}
      {lastCheckIn && (
        <Card>
          <CardHeader>
            <CardTitle>Last Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {lastCheckIn.response === 'yes' ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {lastCheckIn.response === 'yes' ? 'Safe' : 'Not Safe'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lastCheckIn.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {isActive && (
        <div className="space-y-3">
          <Button
            onClick={handleArrivedSafely}
            variant="success"
            size="lg"
            className="w-full"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            I Arrived Safely
          </Button>
          <Button
            onClick={handleNotSafe}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            <AlertTriangle className="mr-2 h-5 w-5" />
            I'm Not Safe
          </Button>
        </div>
      )}

      {/* Check-in Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Safety Check-in
            </DialogTitle>
            <DialogDescription>
              Are you safe?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => handleCheckIn('yes')}
              variant="success"
              size="lg"
              className="w-full"
            >
              Yes, I'm Safe
            </Button>
            <Button
              onClick={() => handleCheckIn('no')}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              No, I Need Help
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
