import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface EmergencyButtonProps {
  onClick: () => void;
}

/**
 * EmergencyButton - Floating red emergency button
 * Shows confirmation dialog before triggering emergency alert
 */
export const EmergencyButton = ({ onClick }: EmergencyButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);

  const handleEmergency = () => {
    setShowDialog(false);
    onClick();
  };

  return (
    <>
      {/* Floating emergency button - top right of map */}
      <button
        onClick={() => setShowDialog(true)}
        className="absolute top-4 right-4 z-[1000] h-14 w-14 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
        title="Emergency Alert"
      >
        {/* Pulsing ring animation */}
        <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
        
        {/* Icon */}
        <AlertTriangle className="h-6 w-6 text-destructive-foreground relative z-10" />
      </button>

      {/* Confirmation dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Emergency Alert
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              This will immediately notify all your emergency contacts that you need help.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleEmergency}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Send Emergency Alert
            </Button>
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
