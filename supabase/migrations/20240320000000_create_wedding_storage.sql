-- Create storage bucket for wedding memories
insert into storage.buckets (id, name, public)
values ('wedding-uploads', 'wedding-uploads', true)
on conflict (id) do nothing;

-- Set up storage policies for the wedding-uploads bucket
-- Allow public access to read files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'wedding-uploads' );

-- Allow public access to upload files
create policy "Public Upload"
on storage.objects for insert
with check ( bucket_id = 'wedding-uploads' );

-- Create media table to track metadata
create table if not exists public.media (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  type text not null,
  size bigint not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.media enable row level security;

-- Create policies for media table
create policy "Allow public insert to media"
on public.media for insert
with check ( true );

create policy "Allow public select from media"
on public.media for select
using ( true );

-- Index for performance
create index if not exists media_created_at_idx on public.media (created_at desc);