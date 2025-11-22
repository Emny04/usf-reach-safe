import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface JourneyControlsProps {
  remainingDistance: number; // in meters
  estimatedArrival: string; // ISO date string
  unsafeZones: number; // count of unsafe zones on route
  onEndJourney: () => void;
}

/**
 * JourneyControls - Bottom card showing journey status and controls
 * Displays remaining distance, ETA, safety warnings, and end journey button
 */
export const JourneyControls = ({
  remainingDistance,
  estimatedArrival,
  unsafeZones,
  onEndJourney,
}: JourneyControlsProps) => {
  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Calculate time remaining
  const getTimeRemaining = (eta: string): string => {
    const now = new Date();
    const etaDate = new Date(eta);
    const diffMs = etaDate.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);

    if (diffMins < 1) {
      return 'Arriving now';
    } else if (diffMins < 60) {
      return `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-[1000] rounded-t-2xl border-t-2 border-border shadow-2xl">
      <CardContent className="space-y-4 p-6">
        {/* Journey stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Remaining distance */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Distance</p>
              <p className="text-lg font-bold">{formatDistance(remainingDistance)}</p>
            </div>
          </div>

          {/* ETA */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-lg font-bold">{getTimeRemaining(estimatedArrival)}</p>
            </div>
          </div>
        </div>

        {/* Safety status */}
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          {unsafeZones > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-sm">
                Route passes through <span className="font-semibold">{unsafeZones}</span> unsafe zone{unsafeZones > 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              <p className="text-sm">Route appears safe</p>
            </>
          )}
        </div>

        {/* End journey button */}
        <Button
          onClick={onEndJourney}
          variant="default"
          size="lg"
          className="w-full"
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          I Arrived Safely
        </Button>

        {/* Status badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="border-success text-success">
            <div className="mr-2 h-2 w-2 rounded-full bg-success animate-pulse" />
            Journey Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
