-- Allow public read access to contacts that are associated with journeys
-- This enables the public journey tracking link to show emergency contact names and phones
CREATE POLICY "Anyone can view journey-associated contacts"
ON public.contacts
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM journey_contacts
    WHERE journey_contacts.contact_id = contacts.id
  )
);