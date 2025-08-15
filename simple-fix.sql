-- Simple targeted fix - run this step by step in Supabase SQL Editor

-- Step 1: Create storage bucket manually
INSERT INTO storage.buckets (id, name) 
VALUES ('transcripts', 'transcripts') 
ON CONFLICT (id) DO NOTHING;

-- Step 2: Add sample courses
INSERT INTO public.courses (course_code, title, description, credits, prerequisites, department, level) VALUES
('CS180', 'Problem Solving and Object-Oriented Programming', 'Java programming course', 4, '{}', 'Computer Science', 180),
('MA161', 'Calculus I', 'Differential and integral calculus', 5, '{}', 'Mathematics', 161)
ON CONFLICT (course_code) DO NOTHING;

-- Step 3: Enable RLS and add simple policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_users_policy" ON public.users FOR ALL TO authenticated USING (auth.uid() = id);