-- Enable realtime for journeys table to support live location tracking
ALTER TABLE public.journeys REPLICA IDENTITY FULL;

-- The journeys table is already in the supabase_realtime publication by default,
-- but let's ensure it explicitly
ALTER PUBLICATION supabase_realtime ADD TABLE public.journeys;