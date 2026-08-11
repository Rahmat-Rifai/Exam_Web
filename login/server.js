const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(__dirname, 'database.json');
const HOMEPAGE_DIR = path.join(__dirname, '..', 'homepage');
const SOAL_DIR = path.join(__dirname, '..', 'Soal');
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

// Daftar ujian yang dikenal sistem
const EXAMS = {
    matematika: { nama: 'Matematika', ikon: '📐' },
    indonesia: { nama: 'Bahasa Indonesia', ikon: '📖' },
    inggris: { nama: 'Bahasa Inggris', ikon: '🌍' }
};

// Pengaturan default setiap ujian
const DEFAULT_EXAMS = {
    matematika: { nama: 'Ujian Akhir Matematika', aktif: true, waktuMenit: 30 },
    indonesia: { nama: 'Ujian Literasi Bahasa Indonesia', aktif: true, waktuMenit: 30 },
    inggris: { nama: 'English Literacy Test', aktif: true, waktuMenit: 30 }
};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Blokir akses langsung ke file sensitif
app.use((req, res, next) => {
    const blocked = ['/database.json', '/server.js', '/server.log', '/package.json', '/package-lock.json'];
    if (blocked.includes(req.path)) {
        return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    next();
});

app.use(express.static(__dirname));
app.use('/homepage', express.static(HOMEPAGE_DIR));
app.use('/Soal', express.static(SOAL_DIR));
app.use('/admin', express.static(ADMIN_DIR));

// ===== Helper database =====
function defaultDb() {
    return {
        users: [],
        tokens: [],
        results: [],
        pengaturan: { exams: JSON.parse(JSON.stringify(DEFAULT_EXAMS)) }
    };
}

function readDatabase() {
    try {
        const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
        const def = defaultDb();
        // Pastikan struktur baru selalu ada (migrasi otomatis)
        data.users = data.users || [];
        data.tokens = data.tokens || [];
        data.results = data.results || [];
        data.pengaturan = data.pengaturan || def.pengaturan;
        data.pengaturan.exams = Object.assign({}, def.pengaturan.exams, data.pengaturan.exams);
        return data;
    } catch (err) {
        return defaultDb();
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error menulis database:', err);
        return false;
    }
}

function nextId(list) {
    return list.length > 0 ? Math.max(...list.map(x => x.id)) + 1 : 1;
}

// ===== Helper autentikasi =====
function getCurrentUser(req) {
    const userId = parseInt(req.get('x-user-id'), 10);
    if (!userId) return null;
    const db = readDatabase();
    return db.users.find(u => u.id === userId) || null;
}

function requireAdmin(req, res) {
    const user = getCurrentUser(req);
    if (!user || user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang bisa mengakses.' });
        return null;
    }
    return user;
}

function tanpaPassword(user) {
    const { password, ...rest } = user;
    return rest;
}

// ===== API: Register (selalu berlevel siswa) =====
app.post('/api/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Semua field harus diisi!' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Password tidak cocok!' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter!' });
    }

    const database = readDatabase();

    if (database.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Username sudah terdaftar!' });
    }
    if (database.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
    }

    const newUser = {
        id: nextId(database.users),
        username: username.trim(),
        email: email.trim(),
        password: password, // Dalam praktik nyata, gunakan hashing!
        role: 'siswa',
        blocked: false,
        createdAt: new Date().toISOString().split('T')[0]
    };

    database.users.push(newUser);

    if (writeDatabase(database)) {
        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil! Silakan login.',
            user: tanpaPassword(newUser)
        });
    } else {
        res.status(500).json({ success: false, message: 'Gagal menyimpan data!' });
    }
});

// ===== API: Login =====
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password harus diisi!' });
    }

    const database = readDatabase();
    const user = database.users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Username atau password salah!' });
    }
    if (user.blocked) {
        return res.status(403).json({ success: false, message: 'Akun kamu sedang diblokir oleh admin. Hubungi panitia!' });
    }

    res.status(200).json({
        success: true,
        message: 'Login berhasil!',
        user: tanpaPassword(user)
    });
});

// ===== API publik: status ujian (untuk beranda siswa) =====
app.get('/api/exams', (req, res) => {
    const db = readDatabase();
    const list = {};
    for (const kode in EXAMS) {
        list[kode] = Object.assign({ kode: kode, ikon: EXAMS[kode].ikon }, db.pengaturan.exams[kode]);
    }
    res.json(list);
});

// ===== API: Validasi token ujian (siswa) =====
app.post('/api/token/validate', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    }
    if (user.blocked) {
        return res.status(403).json({ success: false, message: 'Akun kamu sedang diblokir oleh admin.' });
    }

    const { kode, token } = req.body;
    if (!kode || !token) {
        return res.status(400).json({ success: false, message: 'Token tidak boleh kosong!' });
    }

    const db = readDatabase();
    const exam = db.pengaturan.exams[kode];
    if (!exam) {
        return res.status(400).json({ success: false, message: 'Ujian tidak dikenal!' });
    }
    if (!exam.aktif) {
        return res.status(403).json({ success: false, message: 'Ujian ini sedang dinonaktifkan oleh admin.' });
    }

    const t = db.tokens.find(x => x.token === token.trim().toUpperCase() && x.kode === kode);
    if (!t) {
        return res.status(400).json({ success: false, message: 'Token tidak ditemukan. Periksa kembali token kamu!' });
    }
    if (!t.aktif) {
        return res.status(403).json({ success: false, message: 'Token ini sudah dinonaktifkan oleh admin. Minta token baru!' });
    }
    if (new Date(t.ekspired) < new Date()) {
        return res.status(403).json({ success: false, message: 'Token sudah kadaluarsa. Minta token baru ke admin!' });
    }
    if (t.dipakaiOleh && t.dipakaiOleh.userId !== user.id) {
        return res.status(403).json({ success: false, message: 'Token ini sudah digunakan oleh siswa lain.' });
    }

    // Tandai terpakai oleh user ini (user yang sama boleh mengulang selama masa berlaku)
    t.dipakaiOleh = {
        userId: user.id,
        username: user.username,
        dipakaiPada: new Date().toISOString()
    };
    writeDatabase(db);

    res.json({
        success: true,
        message: 'Token valid! Selamat mengerjakan.',
        waktuMenit: exam.waktuMenit
    });
});

// ===== API: Simpan hasil ujian (siswa) =====
app.post('/api/results', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    }

    const { kode, skor, benar, salah, kosong, jumlah } = req.body;
    if (!EXAMS[kode]) {
        return res.status(400).json({ success: false, message: 'Ujian tidak dikenal!' });
    }

    const db = readDatabase();
    const result = {
        id: nextId(db.results),
        userId: user.id,
        username: user.username,
        kode: kode,
        namaUjian: db.pengaturan.exams[kode].nama,
        skor: Math.max(0, Math.min(100, parseInt(skor, 10) || 0)),
        benar: parseInt(benar, 10) || 0,
        salah: parseInt(salah, 10) || 0,
        kosong: parseInt(kosong, 10) || 0,
        jumlah: parseInt(jumlah, 10) || 0,
        tanggal: new Date().toISOString()
    };

    db.results.push(result);
    writeDatabase(db);

    res.status(201).json({ success: true, message: 'Hasil ujian tersimpan!', result });
});

// ===== API: Hasil ujian milik sendiri (siswa) =====
app.get('/api/results/me', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });

    const db = readDatabase();
    const hasil = db.results
        .filter(r => r.userId === user.id)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    res.json(hasil);
});

// =====================================================================
// =========================== API ADMIN ===============================
// =====================================================================

// ---- Statistik ringkas ----
app.get('/api/admin/stats', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const siswa = db.users.filter(u => u.role !== 'admin');
    const admins = db.users.filter(u => u.role === 'admin');
    const tokensTerpakai = db.tokens.filter(t => t.dipakaiOleh).length;
    const skorList = db.results.map(r => r.skor);
    const rataRata = skorList.length ? Math.round(skorList.reduce((a, b) => a + b, 0) / skorList.length) : 0;

    const perExam = {};
    for (const kode in EXAMS) {
        const hasil = db.results.filter(r => r.kode === kode);
        perExam[kode] = {
            ...db.pengaturan.exams[kode],
            ikon: EXAMS[kode].ikon,
            jumlahHasil: hasil.length,
            rataRata: hasil.length ? Math.round(hasil.reduce((a, b) => a + b.skor, 0) / hasil.length) : 0
        };
    }

    res.json({
        totalSiswa: siswa.length,
        totalAdmin: admins.length,
        totalUsers: db.users.length,
        totalToken: db.tokens.length,
        tokenTerpakai: tokensTerpakai,
        tokenAktif: db.tokens.filter(t => t.aktif && !t.dipakaiOleh && new Date(t.ekspired) > new Date()).length,
        totalHasil: db.results.length,
        rataRata: rataRata,
        exams: perExam
    });
});

// ---- Kelola ujian ----
app.get('/api/admin/exams', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const list = {};
    for (const kode in EXAMS) {
        list[kode] = Object.assign({ kode: kode, ikon: EXAMS[kode].ikon }, db.pengaturan.exams[kode]);
    }
    res.json(list);
});

app.post('/api/admin/exams/:kode', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { kode } = req.params;
    if (!EXAMS[kode]) return res.status(400).json({ success: false, message: 'Ujian tidak dikenal!' });

    const db = readDatabase();
    const exam = db.pengaturan.exams[kode];

    if (typeof req.body.aktif === 'boolean') exam.aktif = req.body.aktif;
    if (req.body.waktuMenit) {
        const w = parseInt(req.body.waktuMenit, 10);
        if (w >= 1 && w <= 180) exam.waktuMenit = w;
    }
    if (req.body.nama && typeof req.body.nama === 'string') exam.nama = req.body.nama.trim();

    writeDatabase(db);
    res.json({ success: true, message: 'Pengaturan ujian diperbarui!', exam });
});

// ---- Kelola token ----
app.get('/api/admin/tokens', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const tokens = db.tokens
        .slice()
        .sort((a, b) => new Date(b.dibuat) - new Date(a.dibuat))
        .map(t => ({
            ...t,
            namaUjian: db.pengaturan.exams[t.kode] ? db.pengaturan.exams[t.kode].nama : t.kode,
            ikon: EXAMS[t.kode] ? EXAMS[t.kode].ikon : '📝'
        }));
    res.json(tokens);
});

app.post('/api/admin/tokens', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { kode, jumlah = 1, masaBerlakuMenit = 60 } = req.body;
    if (!EXAMS[kode]) return res.status(400).json({ success: false, message: 'Ujian tidak dikenal!' });

    const db = readDatabase();
    const n = Math.min(Math.max(parseInt(jumlah, 10) || 1, 1), 100);
    const masa = Math.min(Math.max(parseInt(masaBerlakuMenit, 10) || 60, 5), 10080); // 5 menit - 7 hari
    const prefix = kode === 'matematika' ? 'MTK' : kode === 'indonesia' ? 'BIN' : 'BIG';

    const dibuat = [];
    for (let i = 0; i < n; i++) {
        let code;
        do {
            code = prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        } while (db.tokens.some(t => t.token === code));

        const token = {
            id: nextId(db.tokens),
            token: code,
            kode: kode,
            dibuat: new Date().toISOString(),
            ekspired: new Date(Date.now() + masa * 60000).toISOString(),
            dipakaiOleh: null,
            aktif: true
        };
        db.tokens.push(token);
        dibuat.push(token);
    }

    writeDatabase(db);
    res.status(201).json({
        success: true,
        message: `${dibuat.length} token berhasil dibuat!`,
        tokens: dibuat
    });
});

app.post('/api/admin/tokens/:id/toggle', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const t = db.tokens.find(x => x.id === parseInt(req.params.id, 10));
    if (!t) return res.status(404).json({ success: false, message: 'Token tidak ditemukan!' });

    t.aktif = !t.aktif;
    writeDatabase(db);
    res.json({ success: true, message: t.aktif ? 'Token diaktifkan kembali.' : 'Token dinonaktifkan.', token: t });
});

app.delete('/api/admin/tokens/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const id = parseInt(req.params.id, 10);
    const idx = db.tokens.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Token tidak ditemukan!' });

    db.tokens.splice(idx, 1);
    writeDatabase(db);
    res.json({ success: true, message: 'Token dihapus.' });
});

// ---- Kelola pengguna ----
app.get('/api/admin/users', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    res.json(db.users.map(tanpaPassword));
});

app.post('/api/admin/users', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Username, email, dan password wajib diisi!' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter!' });
    }

    const db = readDatabase();
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Username sudah terdaftar!' });
    }
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
    }

    const newUser = {
        id: nextId(db.users),
        username: username.trim(),
        email: email.trim(),
        password: password,
        role: role === 'admin' ? 'admin' : 'siswa',
        blocked: false,
        createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    writeDatabase(db);
    res.status(201).json({ success: true, message: 'Pengguna berhasil ditambahkan!', user: tanpaPassword(newUser) });
});

app.post('/api/admin/users/:id/toggle-block', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const user = db.users.find(u => u.id === parseInt(req.params.id, 10));
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan!' });
    if (user.id === admin.id) {
        return res.status(400).json({ success: false, message: 'Kamu tidak bisa memblokir akun sendiri!' });
    }

    user.blocked = !user.blocked;
    writeDatabase(db);
    res.json({ success: true, message: user.blocked ? `Akun ${user.username} diblokir.` : `Akun ${user.username} diaktifkan kembali.`, user: tanpaPassword(user) });
});

app.post('/api/admin/users/:id/reset-password', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const user = db.users.find(u => u.id === parseInt(req.params.id, 10));
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan!' });

    const password = req.body.password;
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter!' });
    }

    user.password = password;
    writeDatabase(db);
    res.json({ success: true, message: `Password ${user.username} berhasil direset.` });
});

app.delete('/api/admin/users/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const id = parseInt(req.params.id, 10);
    if (id === admin.id) {
        return res.status(400).json({ success: false, message: 'Kamu tidak bisa menghapus akun sendiri!' });
    }

    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan!' });

    const [removed] = db.users.splice(idx, 1);
    writeDatabase(db);
    res.json({ success: true, message: `Akun ${removed.username} dihapus.` });
});

// ---- Kelola hasil ujian ----
app.get('/api/admin/results', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const db = readDatabase();
    const hasil = db.results
        .slice()
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .map(r => ({ ...r, ikon: EXAMS[r.kode] ? EXAMS[r.kode].ikon : '📝' }));
    res.json(hasil);
});

// ===== Server mulai =====
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Database file: ' + DATABASE_FILE);
});
