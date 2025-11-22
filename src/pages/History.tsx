import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Journey {
  id: string;
  start_name: string;
  dest_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchJourneys();
  }, [user, navigate]);

  const fetchJourneys = async () => {
    try {
      const { data, error } = await supabase
        .from('journeys')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setJourneys(data || []);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed_safe') return 'success';
    if (status === 'alert_triggered') return 'destructive';
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed_safe') return <CheckCircle className="h-4 w-4" />;
    if (status === 'alert_triggered') return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (loading) {
    return <div className="py-12 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Journey History</h1>
        <p className="text-muted-foreground">View your past journeys</p>
      </div>

      {journeys.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No journeys yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Start your first journey to see it here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {journeys.map((journey) => (
            <Card
              key={journey.id}
              className="cursor-pointer transition-colors hover:bg-accent/5"
              onClick={() => {
                if (journey.status === 'active') {
                  navigate(`/journey/${journey.id}`);
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-1 h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{journey.start_name}</p>
                        <p className="text-sm text-muted-foreground">to</p>
                        <p className="font-medium">{journey.dest_name}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(journey.status) as any}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(journey.status)}
                        {journey.status.replace('_', ' ')}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {format(new Date(journey.start_time), 'MMM d, yyyy h:mm a')}
                    </span>
                    {journey.end_time && (
                      <>
                        <span>•</span>
                        <span>
                          Duration:{' '}
                          {formatDistanceToNow(new Date(journey.start_time), {
                            addSuffix: false,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
