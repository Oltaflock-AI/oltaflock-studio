-- Replace placeholder Unsplash thumbnails with Oltaflock-generated samples
-- for the 3 rows where generation succeeded. Rows 4-8 still carry Unsplash
-- placeholders; see PR body for details on manual replacement.

update public.prompt_library_items
  set thumbnail_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_39FTDHJJzxjJhX73f8C5PxDFRyT/hf_20260515_070119_915dc4cd-cd67-434f-b706-c5e8f0eef504.png'
  where is_curated = true and title = 'Studio product shot — clean white';

update public.prompt_library_items
  set thumbnail_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_39FTDHJJzxjJhX73f8C5PxDFRyT/hf_20260515_070139_4692d8f5-43e4-492b-adc6-81a5a4cba1e1.png'
  where is_curated = true and title = 'Lifestyle product on marble';

update public.prompt_library_items
  set thumbnail_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_39FTDHJJzxjJhX73f8C5PxDFRyT/hf_20260515_070207_a29b9f4e-7ab0-4090-9f61-53d57c027b80.png'
  where is_curated = true and title = 'Editorial portrait — cinematic';
