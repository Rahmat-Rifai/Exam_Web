# UjianKu - Platform Ujian Sekolah Online

Platform ujian sekolah berbasis web: login berlevel (siswa & admin), token ujian yang dikelola admin, dan penilaian otomatis. UI memakai palet monokrom dua warna (ink/paper).

## Fitur

### Untuk Siswa
- Registrasi & login akun siswa
- Beranda dengan daftar ujian + status aktif/nonaktif
- Token ujian wajib dimasukkan sebelum mulai (diberikan admin)
- 45 soal pilihan ganda di 3 mata pelajaran (15 soal per mapel, 30 menit)
- Timer hitung mundur (auto-kumpul saat waktu habis), navigasi nomor, progress bar
- Penilaian otomatis: skor, statistik benar/salah/kosong, dan pembahasan per soal salah
- Nilai tersimpan ke server

### Untuk Admin
- Dashboard admin (level akun `admin`)
- Kelola Ujian - aktifkan/nonaktifkan ujian & atur durasi
- Generate Token - buat token per mapel (jumlah & masa berlaku), salin, nonaktifkan, hapus
- Siswa & Admin - buat akun, blokir/buka blokir, reset password, hapus
- Hasil Ujian - pantau nilai siswa + statistik ringkasan

## Struktur Project

```
Exam_Web/
├── login/              # Backend Express + halaman login
│   ├── server.js       #   Server & seluruh API (port 3000)
│   ├── database.json   #   Database (users, tokens, results, pengaturan)
│   ├── index.html      #   Halaman login/registrasi utama
│   ├── login.html      #   Halaman login mandiri (opsional)
│   └── style.css
├── homepage/           # Beranda siswa (kartu ujian + status)
├── Soal/               # Mesin ujian bersama + halaman soal
│   ├── script.js       #   Engine: token gate, timer, navigasi, scoring
│   ├── soal.html       #   Bahasa Indonesia (15 soal)
│   ├── soal-matematika.html   # Matematika (15 soal)
│   ├── soal-inggris.html      # Bahasa Inggris (15 soal)
│   └── style.css
├── admin/              # Dashboard admin
│   ├── index.html
│   ├── script.js
│   └── style.css
└── README.md
```

## Menjalankan

Prasyarat: [Node.js](https://nodejs.org) (v16+).

```bash
# 1. Install dependensi (folder login)
cd login
npm install

# 2. Jalankan server
node server.js

# 3. Buka aplikasi di http://localhost:3000
```

Server Express melayani folder statis (`/homepage`, `/Soal`, `/admin`) dan API di port `3000`.

## Akun Demo

| Username | Password | Level |
|----------|----------|-------|
| `admin` | `admin123` | Admin |
| `superadmin` | `super123` | Admin |
| `preview_test` | `secret123` | Siswa |

Akun siswa bisa dibuat lewat tab **Daftar** di halaman login.

## Alur Penggunaan

**Siswa:** login/daftar -> beranda -> klik *Mulai Ujian* -> masukkan **token** dari admin -> kerjakan soal -> *Selesai Ujian* -> lihat skor & pembahasan -> nilai tersimpan.

**Admin:** login -> dashboard -> **Kelola Ujian** (aktifkan & atur durasi) -> **Token Ujian** (generate & bagikan) -> **Hasil Ujian** (pantau nilai).

> Token bersifat **sekali pakai per siswa** dan punya masa berlaku. Jika ujian dinonaktifkan, semua token ditolak. Siswa yang sama boleh mengulang dengan token yang sama selama masih berlaku.

## API

Semua endpoint ada di `http://localhost:3000/api`. Endpoint admin membaca header `x-user-id`.

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/register` | Registrasi siswa |
| POST | `/api/login` | Login (mengembalikan `role`) |
| GET | `/api/exams` | Status semua ujian (publik) |
| POST | `/api/token/validate` | Validasi token ujian (siswa) |
| POST | `/api/results` | Simpan hasil ujian (siswa) |
| GET | `/api/results/me` | Hasil ujian milik sendiri |
| GET | `/api/admin/stats` | Statistik ringkas dashboard |
| GET/POST | `/api/admin/exams` | Kelola pengaturan ujian |
| GET/POST | `/api/admin/tokens` | Kelola token |
| GET/POST | `/api/admin/users` | Kelola akun |
| GET | `/api/admin/results` | Seluruh hasil ujian |

## Catatan Keamanan (untuk produksi)

Project ini demo/akademik. Sebelum dipakai produksi:
1. **Password plaintext** di `database.json` -> hash (mis. bcrypt).
2. **Autentikasi API** memakai header `x-user-id` dari client -> ganti dengan session/JWT. Header saat ini bisa dipalsukan.
3. Token memakai `crypto.randomBytes` - aman, tapi siapkan rotasi & penarikan token.
