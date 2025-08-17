# Supabase Setup Guide for BoilerAI

## Quick Setup Instructions

### 1. Create Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: "BoilerAI" 
4. Database Password: Choose a strong password
5. Region: Choose closest to your location
6. Wait for project creation (~2 minutes)

### 2. Get API Keys
1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the **Project URL** (looks like: `https://abcdefgh.supabase.co`)
3. Copy the **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

### 3. Update Environment Variables
Update your `.env` file with the values from step 2:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

### 4. Set Up Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the SQL from `supabase-schema.sql` (see below)
4. Click **Run**

### 5. Enable Authentication
1. Go to **Authentication** > **Settings**
2. Under **Site URL**, add: `http://localhost:3000`
3. Under **Redirect URLs**, add: `http://localhost:3000/**`
4. Save changes

## Database Schema

Here's the complete SQL schema to run in Supabase:

```sql
-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create users table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{"theme": "system", "notifications": true}'::jsonb,
    transcript_data JSONB,
    academic_plan JSONB,
    has_api_key BOOLEAN DEFAULT FALSE,
    api_key_updated_at TIMESTAMP WITH TIME ZONE
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    prerequisites TEXT[],
    department TEXT NOT NULL,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create academic_plans table
CREATE TABLE public.academic_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    major TEXT NOT NULL,
    concentration TEXT,
    graduation_date DATE,
    semesters JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE public.transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT,
    parsed_data JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for courses (public read access)
CREATE POLICY "Anyone can view courses" ON public.courses
    FOR SELECT USING (true);

-- RLS Policies for academic_plans
CREATE POLICY "Users can view own academic plans" ON public.academic_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own academic plans" ON public.academic_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own academic plans" ON public.academic_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own academic plans" ON public.academic_plans
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transcripts
CREATE POLICY "Users can view own transcripts" ON public.transcripts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcripts" ON public.transcripts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcripts" ON public.transcripts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcripts" ON public.transcripts
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_courses_code ON public.courses(course_code);
CREATE INDEX idx_courses_department ON public.courses(department);
CREATE INDEX idx_academic_plans_user_id ON public.academic_plans(user_id);
CREATE INDEX idx_transcripts_user_id ON public.transcripts(user_id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at column
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
CREATE TRIGGER handle_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_courses
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_academic_plans
    BEFORE UPDATE ON public.academic_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_transcripts
    BEFORE UPDATE ON public.transcripts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## Testing the Setup

1. Restart your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Try registering with a `@purdue.edu` email
4. Check your email for verification link
5. After verification, you should be able to log in

## Troubleshooting

### Common Issues:

1. **"Invalid URL" Error**: Make sure your `VITE_SUPABASE_URL` starts with `https://`
2. **"Invalid API Key" Error**: Double-check your `VITE_SUPABASE_ANON_KEY`
3. **"Email not confirmed"**: Check your email spam folder for verification email
4. **RLS Errors**: Make sure you ran the complete SQL schema including policies

### Development Mode Bypass:
If you want to skip Supabase setup for now, the app will automatically use development mode with a mock user. No setup required!

## Next Steps

After Supabase is configured:
1. The blank screen issue will be completely resolved
2. Real user authentication will work
3. Data will persist between sessions
4. You can deploy to production easily