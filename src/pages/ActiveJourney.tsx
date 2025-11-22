import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Users, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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

export default function ActiveJourney() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [checkInTimer, setCheckInTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }
    fetchJourneyData();
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
