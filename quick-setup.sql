-- Quick Supabase Setup for BoilerAI
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor > Run

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage bucket for transcripts
INSERT INTO storage.buckets (id, name, public) VALUES ('transcripts', 'transcripts', false) ON CONFLICT DO NOTHING;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{"theme": "system", "notifications": true}'::jsonb,
    transcript_data JSONB,
    academic_plan JSONB,
    has_api_key BOOLEAN DEFAULT FALSE,
    api_key_updated_at TIMESTAMPTZ,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@purdue\.edu$'),
    CONSTRAINT valid_name CHECK (length(name) >= 2 AND length(name) <= 100)
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 6),
    prerequisites TEXT[],
    department TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 100 AND level < 800),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create academic_plans table
CREATE TABLE IF NOT EXISTS public.academic_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    major TEXT NOT NULL,
    concentration TEXT,
    graduation_date DATE,
    semesters JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    parsed_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for academic_plans
DROP POLICY IF EXISTS "Users can manage own academic plans" ON public.academic_plans;
CREATE POLICY "Users can manage own academic plans" ON public.academic_plans USING (auth.uid() = user_id);

-- RLS Policies for transcripts
DROP POLICY IF EXISTS "Users can manage own transcripts" ON public.transcripts;
CREATE POLICY "Users can manage own transcripts" ON public.transcripts USING (auth.uid() = user_id);

-- RLS Policies for courses (public read)
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT TO authenticated USING (true);

-- Storage policies for transcripts
DROP POLICY IF EXISTS "Users can upload own transcripts" ON storage.objects;
CREATE POLICY "Users can upload own transcripts" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own transcripts" ON storage.objects;
CREATE POLICY "Users can view own transcripts" ON storage.objects FOR SELECT USING (
  bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample courses
INSERT INTO public.courses (course_code, title, description, credits, prerequisites, department, level) VALUES
('CS180', 'Problem Solving and Object-Oriented Programming', 'Introduction to programming and problem solving using Java.', 4, '{}', 'Computer Science', 100),
('CS240', 'Programming in C', 'The C programming language, structure and style.', 3, '{"CS180"}', 'Computer Science', 200),
('MA161', 'Analytic Geometry and Calculus I', 'Introduction to differential and integral calculus.', 5, '{}', 'Mathematics', 100),
('MA162', 'Analytic Geometry and Calculus II', 'Continuation of MA 161.', 5, '{"MA161"}', 'Mathematics', 100)
ON CONFLICT (course_code) DO NOTHING;