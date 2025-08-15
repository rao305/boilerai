-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
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
    
    -- Add constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@purdue\.edu$'),
    CONSTRAINT valid_name CHECK (length(name) >= 2 AND length(name) <= 100)
);

-- Create courses table
CREATE TABLE public.courses (
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
CREATE TABLE public.academic_plans (
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
CREATE TABLE public.transcripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    parsed_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_courses_code ON public.courses(course_code);
CREATE INDEX idx_courses_department ON public.courses(department);
CREATE INDEX idx_academic_plans_user_id ON public.academic_plans(user_id);
CREATE INDEX idx_transcripts_user_id ON public.transcripts(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_plans_updated_at BEFORE UPDATE ON public.academic_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON public.transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Academic plans policies
CREATE POLICY "Users can view own academic plans" ON public.academic_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own academic plans" ON public.academic_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own academic plans" ON public.academic_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own academic plans" ON public.academic_plans FOR DELETE USING (auth.uid() = user_id);

-- Transcripts policies
CREATE POLICY "Users can view own transcripts" ON public.transcripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transcripts" ON public.transcripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transcripts" ON public.transcripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transcripts" ON public.transcripts FOR DELETE USING (auth.uid() = user_id);

-- Courses are publicly readable but only admins can modify
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT TO authenticated USING (true);

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
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to sync email verification status
CREATE OR REPLACE FUNCTION public.handle_user_email_verification()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync email verification
CREATE OR REPLACE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_verification();

-- Storage bucket for transcript files
INSERT INTO storage.buckets (id, name, public) VALUES ('transcripts', 'transcripts', false);

-- Storage policy for transcripts
CREATE POLICY "Users can upload own transcripts" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own transcripts" ON storage.objects FOR SELECT USING (
  bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own transcripts" ON storage.objects FOR DELETE USING (
  bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]
);