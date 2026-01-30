-- Create storage bucket for image uploads (Image → Image)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generation-uploads', 'generation-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access for uploaded images
CREATE POLICY "Public read access for generation uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'generation-uploads');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generation-uploads');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generation-uploads');