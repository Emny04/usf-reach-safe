-- Create table to store location history for journey breadcrumb trail
CREATE TABLE public.journey_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accuracy DOUBLE PRECISION
);

-- Enable RLS
ALTER TABLE public.journey_locations ENABLE ROW LEVEL SECURITY;

-- Allow users to insert location history for their own journeys
CREATE POLICY "Users can insert journey locations"
ON public.journey_locations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journeys
    WHERE journeys.id = journey_locations.journey_id
    AND journeys.user_id = auth.uid()
  )
);

-- Allow anyone to view journey locations (for public tracking)
CREATE POLICY "Anyone can view journey locations"
ON public.journey_locations
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_journey_locations_journey_id ON public.journey_locations(journey_id);
CREATE INDEX idx_journey_locations_timestamp ON public.journey_locations(timestamp);

-- Enable realtime for journey locations
ALTER TABLE public.journey_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_locations;