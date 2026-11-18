-- ==============================================================================
-- SKRIP SQL SUPABASE: TABEL TRANSAKSI TERSTRUKTUR (EXPENSE TRACKER)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor (icon >_ di menu kiri)
-- ==============================================================================

-- 1. Buat Tabel 'transaksi' dengan kolom terpisah & mudah dibaca
create table if not exists public.transaksi (
  id text primary key,
  kategori text not null,                -- 'Pemasukan' atau 'Pengeluaran'
  jenis text,                            -- Jenis Kategori (misal: Gaji / Pekerjaan, Makanan & Minuman)
  nama text not null,                    -- Nama transaksi / Deskripsi
  jumlah_uang bigint not null default 0, -- Nominal uang dalam rupiah
  tanggal text not null,                 -- Tanggal transaksi (format: YYYY-MM-DD)
  catatan text,                          -- Catatan tambahan (opsional)
  sync_code text default 'FN-UTAMA',     -- Kode perangkat sinkronisasi
  created_at timestamptz default now()   -- Waktu pembuatan
);

-- 2. Aktifkan Row Level Security (RLS)
alter table public.transaksi enable row level security;

-- 3. Berikan izin akses baca & tulis penuh (anon & authenticated)
drop policy if exists "Akses penuh publik untuk transaksi" on public.transaksi;
create policy "Akses penuh publik untuk transaksi" on public.transaksi
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Aktifkan Fitur Realtime Supabase untuk tabel transaksi
alter publication supabase_realtime add table public.transaksi;

-- Selesai! Tabel 'transaksi' siap digunakan dan akan langsung terisi data terstruktur.
