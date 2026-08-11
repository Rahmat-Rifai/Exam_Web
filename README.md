# 🎓 UjianKu — Platform Ujian Sekolah Online

Platform ujian sekolah berbasis web dengan **login berlevel (siswa & admin)**, **token ujian yang dikelola admin**, **kontrol penuh jalannya ujian**, dan **penilaian otomatis**. Seluruh UI mengikuti sistem desain monokrom pada [`design.md`](./design.md).

## ✨ Fitur

### Untuk Siswa
- Registrasi & login akun siswa
- Beranda dengan daftar ujian + status aktif/nonaktif
- **Token ujian** wajib dimasukkan sebelum ujian dimulai (token diberikan admin)
- 45 soal pilihan ganda di 3 mata pelajaran (15 soal per mapel, 30 menit)
- Timer hitung mundur (auto-kumpul saat waktu habis), navigasi nomor soal, progress bar
- Penilaian otomatis: skor, statistik benar/salah/kosong, dan pembahasan per soal salah
- Nilai otomatis tersimpan ke server

### Untuk Admin
- Dashboard admin lengkap (akun berlevel `admin`)
- **Kelola Ujian** — aktifkan/nonaktifkan ujian & atur durasi (berlaku langsung)
- **Generate Token** — buat token per mata pelajaran (jumlah & masa berlaku), salin, nonaktifkan, hapus
- **Siswa & Admin** — buat akun baru (pilih level), blokir/buka blokir, reset password, hapus
- **Hasil Ujian** — pantau seluruh nilai siswa + statistik ringkasan

## 🗂️ Struktur Project

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
├── design.md           # Sistem desain yang dipakai semua UI
└── README.md
```

## 🚀 Menjalankan

**Prasyarat:** [Node.js](https://nodejs.org) (v16+).

```bash
# 1. Install dependensi (folder login)
cd login
npm install

# 2. Jalankan server
node server.js

# 3. Buka aplikasi
#    http://localhost:3000
```

Server Express melayani semua folder statis (`/homepage`, `/Soal`, `/admin`) dan API di port `3000`.

## 👤 Akun Demo

| Username | Password | Level |
|----------|----------|-------|
| `admin` | `admin123` | Admin (redirect ke dashboard) |
| `superadmin` | `super123` | Admin |
| `preview_test` | `secret123` | Siswa |

Akun siswa juga bisa dibuat lewat tab **Daftar** di halaman login.

## 🧭 Alur Penggunaan

**Siswa:** login/daftar → beranda → klik *Mulai Ujian* → masukkan **token** dari admin → kerjakan soal → *Selesai Ujian* → lihat skor & pembahasan → nilai tersimpan otomatis.

**Admin:** login → dashboard → **Kelola Ujian** (aktifkan & atur durasi) → **Token Ujian** (generate & bagikan ke siswa) → **Hasil Ujian** (pantau nilai).

> 💡 Token bersifat **sekali pakai per siswa** dan memiliki masa berlaku. Jika ujian dinonaktifkan, semua token otomatis ditolak. Siswa yang sama boleh mengulang ujian dengan token yang sama selama masa berlakunya.

## 🔌 API

Semua endpoint di bawah `http://localhost:3000/api`. Endpoint admin wajib mengirim header `x-user-id` dari akun berlevel admin.

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/register` | Registrasi siswa |
| POST | `/api/login` | Login (mengembalikan `role`) |
| GET | `/api/exams` | Status semua ujian (publik) |
| POST | `/api/token/validate` | Validasi token ujian (siswa) |
| POST | `/api/results` | Simpan hasil ujian (siswa) |
| GET | `/api/results/me` | Hasil ujian milik sendiri |
| GET | `/api/admin/stats` | Statistik ringkas dashboard |
| GET/POST | `/api/admin/exams` · `/api/admin/exams/:kode` | Kelola pengaturan ujian |
| GET/POST | `/api/admin/tokens` · `/:id/toggle` · `DELETE /:id` | Kelola token |
| GET/POST | `/api/admin/users` · `/:id/toggle-block` · `/:id/reset-password` · `DELETE /:id` | Kelola akun |
| GET | `/api/admin/results` | Seluruh hasil ujian |

## 🎨 Sistem Desain

Semua halaman (login, homepage, ujian, dashboard admin) memakai palet dua warna dari [`design.md`](./design.md):

- **Ink** `#141413` — teks, border, tombol, surface gelap
- **Paper** `#faf9f5` — latar krem hangat
- Tanpa gradien/aksen warna; fokus aksesibel 2px outline, `prefers-reduced-motion`, breakpoint `768px`

## ⚠️ Catatan Keamanan (untuk produksi)

Project ini bertujuan demo/akademik. Sebelum dipakai produksi, perbaiki:
1. **Password plaintext** di `database.json` → hash dengan bcrypt.
2. **Autentikasi API** memakai header `x-user-id` dari client → ganti dengan session/JWT.
3. **Token random** memakai `crypto.randomBytes` — sudah aman, tapi pastikan rotasi & penarikan token berkala.
