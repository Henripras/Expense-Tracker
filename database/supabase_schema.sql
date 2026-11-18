-- ==========================================================
-- SKRIP SQL SUPABASE UNTUK FINANSIKU (EXPENSE TRACKER)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Buat Tabel sync_data untuk menyimpan transaksi, anggaran, dan keranjang belanja
create table if not exists public.sync_data (
  sync_code text primary key,
  transactions jsonb default '[]'::jsonb,
  budgets jsonb default '{}'::jsonb,
  cart_items jsonb default '[]'::jsonb,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 2. Aktifkan Row Level Security (RLS)
alter table public.sync_data enable row level security;

-- 3. Berikan Akses Publik (Anonim) untuk Membaca dan Menyimpan Data Sinkronisasi
drop policy if exists "Akses penuh anon untuk sync data" on public.sync_data;
create policy "Akses penuh anon untuk sync data" on public.sync_data
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Aktifkan Fitur Realtime Supabase untuk tabel sync_data
-- Agar setiap perubahan data di Website/APK langsung tersinkronkan dalam hitungan milidetik
alter publication supabase_realtime add table public.sync_data;

-- Selesai! Tabel siap digunakan untuk sinkronisasi realtime.
