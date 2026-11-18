# 💰 Expense Tracker (Finansiku)

Aplikasi pelacak keuangan pribadi dan bisnis yang dinamis, modern, dan responsif dengan dukungan multi-platform (**Web & Android APK**) serta sinkronisasi awan (*cloud realtime*) menggunakan **Supabase**.

---

## 📁 Struktur Direktori Proyek

```text
Expense Tracker/
├── Expense Tracker.html        # File web standalone siap pakai (klik ganda / Live Server)
├── index.html                  # Alias web standalone untuk web server
├── ExpenseTracker-debug.apk    # File instalasi aplikasi Android terbaru
├── Expense Tracker Logo.png    # Aset logo resolusi tinggi
├── Credential.txt              # Catatan kredensial basis data
│
└── Expense-Tracker/            # Source code utama (Node.js, Vite, Capacitor)
    ├── android/                # Proyek Android Native & Gradle (Capacitor)
    ├── database/               # Skrip SQL & skema basis data Supabase
    │   ├── supabase_transaksi.sql # Skema tabel 'transaksi' terstruktur
    │   ├── supabase_schema.sql    # Skema cadangan tabel 'sync_data'
    │   └── et_backup.json         # Contoh berkas cadangan data
    ├── dist/                   # Hasil build web produksi (Vite)
    ├── public/                 # Aset statis (logo, favicon)
    ├── scripts/                # Skrip otomatisasi (build APK, standalone, ikon)
    │   ├── build-apk.js        # Kompilasi otomatis APK Android via Gradle
    │   ├── create-standalone.js# Kompilasi HTML mandiri (inline JS, CSS, Base64)
    │   ├── generate-icons.js   # Generator ikon launcher Android berbagai densitas
    │   └── rekap-excel.js      # Generator rekap laporan Excel
    ├── src/                    # Kode sumber frontend
    │   ├── app.js              # Logika aplikasi, state, kalkulasi, & event
    │   ├── supabase.js         # Konfigurasi klien Supabase & Realtime Sync
    │   └── index.css           # Styling tampilan modern (Glassmorphism & Dark Mode)
    ├── .env                    # Kredensial lingkungan lokal (Supabase URL & API Key)
    ├── .env.example            # Contoh konfigurasi environment
    ├── capacitor.config.json   # Konfigurasi Capacitor untuk integrasi Android
    ├── package.json            # Daftar dependensi & perintah npm
    └── vite.config.js          # Konfigurasi Vite bundler
```

---

## 🚀 Perintah yang Tersedia (NPM Scripts)

Jalankan perintah ini di dalam folder `Expense-Tracker/`:

```bash
# 1. Menjalankan server pengembangan (Hot Reload)
npm run dev

# 2. Build web produksi & sinkronisasi otomatis ke file standalone
npm run build

# 3. Sinkronisasi aset web ke proyek Android Capacitor
npm run android:build

# 4. Kompilasi APK Android Debug secara otomatis
npm run android:apk

# 5. Menjalankan skrip rekap otomatis laporan Excel
npm run rekap
```

---

## ⚡ Sinkronisasi Basis Data Supabase

Aplikasi terhubung ke basis data Supabase secara otomatis di latar belakang:
- **Tabel `transaksi`**: Menyimpan setiap transaksi dalam baris kolom terpisah (`kategori`, `jenis`, `nama`, `jumlah_uang`, `tanggal`, `catatan`).
- **Tabel `sync_data`**: Menyimpan *state* penuh untuk sinkronisasi multi-perangkat secara realtime.

Skrip SQL lengkap untuk membuat tabel dapat dilihat di folder [`Expense-Tracker/database/supabase_transaksi.sql`](./database/supabase_transaksi.sql).
