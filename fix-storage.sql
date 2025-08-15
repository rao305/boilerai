-- Fix Storage Bucket Creation
-- Run this in Supabase Dashboard > SQL Editor

-- Create the transcripts bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('transcripts', 'transcripts', false, 52428800, '{"application/pdf","image/png","image/jpeg","text/plain"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transcripts bucket
CREATE POLICY IF NOT EXISTS "Users can upload own transcripts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view own transcripts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete own transcripts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transcripts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);