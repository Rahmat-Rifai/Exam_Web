const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(__dirname, 'database.json');
const HOMEPAGE_DIR = path.join(__dirname, '..', 'homepage');
const SOAL_DIR = path.join(__dirname, '..', 'Soal');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/homepage', express.static(HOMEPAGE_DIR));
app.use('/Soal', express.static(SOAL_DIR));

// Fungsi untuk membaca database
function readDatabase() {
    try {
        const data = fs.readFileSync(DATABASE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error membaca database:', err);
        return { users: [] };
    }
}

// Fungsi untuk menulis database
function writeDatabase(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error menulis database:', err);
        return false;
    }
}

// API: Register
app.post('/api/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Validasi
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

    // Cek username sudah ada
    if (database.users.some(user => user.username === username)) {
        return res.status(400).json({ success: false, message: 'Username sudah terdaftar!' });
    }

    // Cek email sudah ada
    if (database.users.some(user => user.email === email)) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
    }

    // Buat user baru
    const newUser = {
        id: database.users.length > 0 ? Math.max(...database.users.map(u => u.id)) + 1 : 1,
        username: username,
        email: email,
        password: password, // Dalam praktik nyata, gunakan hashing!
        createdAt: new Date().toISOString().split('T')[0]
    };

    database.users.push(newUser);

    if (writeDatabase(database)) {
        res.status(201).json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan login.',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } else {
        res.status(500).json({ success: false, message: 'Gagal menyimpan data!' });
    }
});

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password harus diisi!' });
    }

    const database = readDatabase();
    const user = database.users.find(u => u.username === username && u.password === password);

    if (user) {
        res.status(200).json({ 
            success: true, 
            message: 'Login berhasil!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Username atau password salah!' });
    }
});

// API: Get all users (untuk testing)
app.get('/api/users', (req, res) => {
    const database = readDatabase();
    const usersWithoutPassword = database.users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPassword);
});

// Server mulai
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Database file: ' + DATABASE_FILE);
});
