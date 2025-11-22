import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, ArrowRight, Flag, MoveRight, CornerDownLeft } from 'lucide-react';
import { formatDistance } from '@/utils/calculateDistance';

interface RouteStep {
  step_number: number;
  instruction: string;
  distance: number;
  duration: number;
  maneuver_type?: string;
  maneuver_modifier?: string;
}

interface RouteStepsProps {
  steps: RouteStep[];
}

const getManeuverIcon = (maneuverType?: string) => {
  switch (maneuverType) {
    case 'depart':
      return <Flag className="h-4 w-4 text-success" />;
    case 'arrive':
      return <Flag className="h-4 w-4 text-primary" />;
    case 'turn':
      return <CornerDownLeft className="h-4 w-4" />;
    case 'continue':
      return <ArrowRight className="h-4 w-4" />;
    default:
      return <MoveRight className="h-4 w-4" />;
  }
};

export default function RouteSteps({ steps }: RouteStepsProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Turn-by-Turn Directions
        </CardTitle>
        <CardDescription>
          Follow these {steps.length} steps to reach your destination
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.step_number}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {getManeuverIcon(step.maneuver_type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-sm leading-relaxed">{step.instruction}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDistance(step.distance)}</span>
                  {step.duration > 0 && (
                    <>
                      <span>•</span>
                      <span>{Math.ceil(step.duration / 60)} min</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {step.step_number}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
