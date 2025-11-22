-- Enable public read access for journey tracking

-- Allow anyone to view journeys (for public tracking links)
CREATE POLICY "Anyone can view journeys"
ON public.journeys
FOR SELECT
USING (true);

-- Allow anyone to view journey contacts (for public tracking links)
CREATE POLICY "Anyone can view journey contacts"
ON public.journey_contacts
FOR SELECT
USING (true);

-- Allow anyone to view journey checkins (for public tracking links)
CREATE POLICY "Anyone can view journey checkins"
ON public.journey_checkins
FOR SELECT
USING (true);

-- Allow anyone to view profiles (for public tracking links)
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);