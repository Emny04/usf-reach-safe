import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Journey {
  id: string;
  start_name: string;
  dest_name: string;
  eta_time: string;
  status: string;
  start_time: string;
}

interface Profile {
  usf_campus_mode: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('usf_campus_mode')
        .eq('id', user?.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch active journey
      const { data: journeyData } = await supabase
        .from('journeys')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (journeyData) {
        setActiveJourney(journeyData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Welcome back!</CardTitle>
              <CardDescription>Stay safe with Safe Reach</CardDescription>
            </div>
            {profile?.usf_campus_mode && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                USF Mode
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Active Journey or Start New */}
      {activeJourney ? (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Active Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{activeJourney.start_name}</p>
                <p className="text-sm text-muted-foreground">to</p>
                <p className="font-medium">{activeJourney.dest_name}</p>
              </div>
            </div>

            {activeJourney.eta_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  ETA: {formatDistanceToNow(new Date(activeJourney.eta_time), { addSuffix: true })}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/journey/${activeJourney.id}`)}
                className="flex-1"
              >
                View Journey
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Journey</CardTitle>
            <CardDescription>Start a new journey to track your safety</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/start-journey')}
              className="w-full"
              size="lg"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Start a Journey
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer transition-colors hover:bg-accent/5" onClick={() => navigate('/contacts')}>
          <CardHeader>
            <CardTitle className="text-lg">Trusted Contacts</CardTitle>
            <CardDescription>Manage your emergency contacts</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-accent/5" onClick={() => navigate('/safe-places')}>
          <CardHeader>
            <CardTitle className="text-lg">Safe Places</CardTitle>
            <CardDescription>Add locations you trust</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Safety Tip */}
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Safety Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Always keep your phone charged and share your journey with trusted contacts when walking alone,
            especially at night.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
