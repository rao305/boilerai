-- Complete Supabase Fix - Run this to get 6/6 tests passing
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor > Run

-- 1. Fix Storage Bucket Creation
DELETE FROM storage.buckets WHERE id = 'transcripts';
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, avif_autodetection)
VALUES ('transcripts', 'transcripts', false, 52428800, '["application/pdf","image/png","image/jpeg","text/plain","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]', false);

-- 2. Clear existing storage policies
DROP POLICY IF EXISTS "Users can upload own transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own transcripts" ON storage.objects;

-- 3. Create proper storage policies
CREATE POLICY "Users can upload own transcripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own transcripts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own transcripts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Ensure RLS is properly enabled and configured
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreate all RLS policies to ensure they work
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own academic plans" ON public.academic_plans;
DROP POLICY IF EXISTS "Users can manage own transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

-- Users policies
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Academic plans policies
CREATE POLICY "Users can view own academic plans"
ON public.academic_plans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own academic plans"
ON public.academic_plans FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own academic plans"
ON public.academic_plans FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own academic plans"
ON public.academic_plans FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Transcripts policies
CREATE POLICY "Users can view own transcripts"
ON public.transcripts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcripts"
ON public.transcripts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcripts"
ON public.transcripts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcripts"
ON public.transcripts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Courses policies (public read for authenticated users)
CREATE POLICY "Authenticated users can view courses"
ON public.courses FOR SELECT
TO authenticated
USING (true);

-- 6. Add sample courses if they don't exist
INSERT INTO public.courses (course_code, title, description, credits, prerequisites, department, level) VALUES
('CS180', 'Problem Solving and Object-Oriented Programming', 'Introduction to programming and problem solving using Java.', 4, '{}', 'Computer Science', 180),
('CS240', 'Programming in C', 'The C programming language, structure and style.', 3, '{"CS180"}', 'Computer Science', 240),
('CS250', 'Computer Architecture', 'Introduction to computer architecture and assembly language.', 4, '{"CS180"}', 'Computer Science', 250),
('MA161', 'Analytic Geometry and Calculus I', 'Introduction to differential and integral calculus.', 5, '{}', 'Mathematics', 161),
('MA162', 'Analytic Geometry and Calculus II', 'Continuation of MA 161.', 5, '{"MA161"}', 'Mathematics', 162),
('PHYS172', 'Modern Mechanics', 'Introductory physics course covering mechanics.', 5, '{"MA161"}', 'Physics', 172)
ON CONFLICT (course_code) DO NOTHING;

-- 7. Ensure user creation trigger is working
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = NEW.email_confirmed_at IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department);
CREATE INDEX IF NOT EXISTS idx_academic_plans_user_id ON public.academic_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);