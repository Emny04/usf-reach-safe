-- Add location tracking fields to journeys table
ALTER TABLE public.journeys 
ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;