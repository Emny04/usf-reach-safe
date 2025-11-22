import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, MapPin, Users, Clock, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Shield className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-4xl font-bold md:text-6xl">Safe Reach</h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Walk safely with real-time journey tracking and emergency alerts. Let your trusted contacts know you're safe.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="text-lg">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <MapPin className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Live Location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Share your real-time location with trusted contacts during your journey
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <Clock className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Safety Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Periodic safety check-ins to ensure you're okay during your walk
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Emergency Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Instant alerts to your contacts if you need help or don't respond
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CheckCircle className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">USF Campus Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pre-loaded USF safe locations and optimized for campus safety
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-3xl font-bold">How It Works</h2>
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                1
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Start Your Journey</h3>
                <p className="text-muted-foreground">
                  Enter your destination and select trusted contacts to notify
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                2
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Stay Connected</h3>
                <p className="text-muted-foreground">
                  Share your live location and respond to periodic safety check-ins
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                3
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Arrive Safely</h3>
                <p className="text-muted-foreground">
                  Mark yourself as safe when you arrive, or trigger an emergency alert if needed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="mx-auto max-w-2xl border-primary/50 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Walk Safely?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Join students and community members who trust Safe Reach for their safety
              </p>
              <Button size="lg" onClick={() => navigate('/auth?tab=signup')}>
                Create Free Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
