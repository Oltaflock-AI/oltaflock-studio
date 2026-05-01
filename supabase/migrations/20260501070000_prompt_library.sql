-- Prompt Library: user-saved + admin-curated prompt presets with thumbnails

create table if not exists public.prompt_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  is_curated boolean not null default false,
  title text not null,
  prompt text not null,
  category text not null check (category in
    ('product','portrait','scene','logo','lifestyle','other')),
  thumbnail_url text not null,
  mode text not null check (mode in ('image','video','image-to-image','image-to-video')),
  generation_type text not null check (generation_type in
    ('text-to-image','text-to-video','image-to-image','image-to-video')),
  model text not null,
  model_params jsonb,
  source_generation_id uuid references public.generations(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint prompt_library_owner_or_curated check (
    (is_curated = true and user_id is null) or
    (is_curated = false and user_id is not null)
  )
);

create index if not exists prompt_library_user_idx on public.prompt_library_items(user_id);
create index if not exists prompt_library_curated_idx on public.prompt_library_items(is_curated);
create index if not exists prompt_library_category_idx on public.prompt_library_items(category);

alter table public.prompt_library_items enable row level security;

create policy "library_select_own_or_curated"
  on public.prompt_library_items
  for select
  using (is_curated = true or auth.uid() = user_id);

create policy "library_insert_own"
  on public.prompt_library_items
  for insert
  with check (auth.uid() = user_id and is_curated = false);

create policy "library_update_own"
  on public.prompt_library_items
  for update
  using (auth.uid() = user_id and is_curated = false);

create policy "library_delete_own"
  on public.prompt_library_items
  for delete
  using (auth.uid() = user_id and is_curated = false);

-- Seed curated prompts (thumbnails are public sample URLs; admin can replace later)
insert into public.prompt_library_items
  (is_curated, title, prompt, category, thumbnail_url, mode, generation_type, model)
values
  (
    true,
    'Studio product shot — clean white',
    'Professional product photograph on a seamless white studio background, soft diffused lighting from above, subtle shadow beneath the product, ultra-sharp focus, e-commerce ready, 8K, photorealistic, centered composition.',
    'product',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    'image',
    'text-to-image',
    'nano-banana-pro'
  ),
  (
    true,
    'Lifestyle product on marble',
    'A premium product placed on white Carrara marble countertop with soft morning sunlight streaming from the left, minimal styling, blurred background of a modern kitchen, cinematic depth of field, magazine quality photography.',
    'lifestyle',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
    'image',
    'text-to-image',
    'seedream-4.5'
  ),
  (
    true,
    'Editorial portrait — cinematic',
    'Cinematic close-up portrait of a person, dramatic Rembrandt lighting, shallow depth of field, 85mm lens look, neutral background, skin texture sharp, editorial fashion magazine style, color graded warm tones.',
    'portrait',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
    'image',
    'text-to-image',
    'nano-banana-pro'
  ),
  (
    true,
    'Golden-hour landscape scene',
    'Sweeping cinematic landscape at golden hour, low sun rays casting long shadows, atmospheric haze, vibrant warm color palette, ultra-wide composition, photorealistic detail, National Geographic style.',
    'scene',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    'image',
    'text-to-image',
    'flux-flex-pro'
  ),
  (
    true,
    'Minimal modern logo mark',
    'Minimal vector logo mark on solid pastel background, geometric shapes, clean lines, single accent color, balanced negative space, modern brand identity, flat design, centered.',
    'logo',
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
    'image',
    'text-to-image',
    'flux-flex'
  ),
  (
    true,
    'Hero lifestyle scene — coffee morning',
    'Cozy lifestyle scene of a person enjoying coffee by a sunlit window, hands cradling a ceramic mug, soft bokeh background of plants, warm tones, candid documentary feel, shot on 50mm lens.',
    'lifestyle',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'image',
    'text-to-image',
    'seedream-4.5'
  ),
  (
    true,
    'E-commerce flat lay',
    'Top-down flat lay of product surrounded by complementary props on textured pastel paper background, even soft lighting, organized composition, vibrant colors, social-media ready square crop.',
    'product',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    'image',
    'text-to-image',
    'nano-banana-pro'
  ),
  (
    true,
    'Moody studio portrait',
    'Moody low-key studio portrait against deep charcoal backdrop, single side rim light, dramatic shadows, contemplative expression, fine art photography, monochrome with subtle warm highlights.',
    'portrait',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
    'image',
    'text-to-image',
    'flux-flex-pro'
  );
