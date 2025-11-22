-- Create table to store route steps/instructions for journeys
CREATE TABLE public.journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  duration DOUBLE PRECISION NOT NULL,
  maneuver_type TEXT,
  maneuver_modifier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;

-- Allow users to insert steps for their own journeys
CREATE POLICY "Users can insert journey steps"
ON public.journey_steps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journeys
    WHERE journeys.id = journey_steps.journey_id
    AND journeys.user_id = auth.uid()
  )
);

-- Allow anyone to view journey steps (for public tracking)
CREATE POLICY "Anyone can view journey steps"
ON public.journey_steps
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_journey_steps_journey_id ON public.journey_steps(journey_id);
CREATE INDEX idx_journey_steps_step_number ON public.journey_steps(step_number);