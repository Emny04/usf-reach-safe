-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  usf_campus_mode BOOLEAN DEFAULT false,
  default_checkin_interval INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Create safe_places table
CREATE TABLE public.safe_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_usf_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on safe_places
ALTER TABLE public.safe_places ENABLE ROW LEVEL SECURITY;

-- Safe places policies
CREATE POLICY "Users can view own safe places"
  ON public.safe_places FOR SELECT
  USING (auth.uid() = user_id OR is_usf_recommended = true);

CREATE POLICY "Users can insert own safe places"
  ON public.safe_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own safe places"
  ON public.safe_places FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own safe places"
  ON public.safe_places FOR DELETE
  USING (auth.uid() = user_id);

-- Create journeys table with status enum
CREATE TYPE journey_status AS ENUM ('active', 'completed_safe', 'alert_triggered');

CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_name TEXT NOT NULL,
  start_address TEXT NOT NULL,
  dest_name TEXT NOT NULL,
  dest_address TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  eta_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status journey_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on journeys
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

-- Journeys policies
CREATE POLICY "Users can view own journeys"
  ON public.journeys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journeys"
  ON public.journeys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journeys"
  ON public.journeys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journeys"
  ON public.journeys FOR DELETE
  USING (auth.uid() = user_id);

-- Create journey_contacts table
CREATE TABLE public.journey_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on journey_contacts
ALTER TABLE public.journey_contacts ENABLE ROW LEVEL SECURITY;

-- Journey contacts policies
CREATE POLICY "Users can view journey contacts"
  ON public.journey_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = journey_contacts.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert journey contacts"
  ON public.journey_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = journey_contacts.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

-- Create journey_checkins table with response enum
CREATE TYPE checkin_response AS ENUM ('yes', 'no', 'no_response');

CREATE TABLE public.journey_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  response checkin_response NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on journey_checkins
ALTER TABLE public.journey_checkins ENABLE ROW LEVEL SECURITY;

-- Journey checkins policies
CREATE POLICY "Users can view journey checkins"
  ON public.journey_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = journey_checkins.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert journey checkins"
  ON public.journey_checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = journey_checkins.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

-- Create notifications_log table
CREATE TYPE notification_type AS ENUM ('start', 'checkin_alert', 'arrival_safe', 'danger_alert');

CREATE TABLE public.notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications_log
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Notifications log policies
CREATE POLICY "Users can view notifications"
  ON public.notifications_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = notifications_log.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notifications"
  ON public.notifications_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys
      WHERE journeys.id = notifications_log.journey_id
      AND journeys.user_id = auth.uid()
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_safe_places_updated_at
  BEFORE UPDATE ON public.safe_places
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample USF recommended safe places
INSERT INTO public.safe_places (name, address, latitude, longitude, is_usf_recommended, user_id)
VALUES
  ('USF Library', '4202 E Fowler Ave, Tampa, FL 33620', 28.058889, -82.414444, true, NULL),
  ('Marshall Student Center', '4202 E Fowler Ave, Tampa, FL 33620', 28.065000, -82.416667, true, NULL),
  ('USF Campus Police', '4202 E Fowler Ave, Tampa, FL 33620', 28.060000, -82.415000, true, NULL),
  ('Juniper-Poplar Hall', '4202 E Fowler Ave, Tampa, FL 33620', 28.057778, -82.418889, true, NULL),
  ('Student Health Services', '4202 E Fowler Ave, Tampa, FL 33620', 28.062222, -82.413333, true, NULL);