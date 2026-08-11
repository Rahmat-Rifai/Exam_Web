const API_URL = 'http://localhost:3000/api';

// ===== Utility: Toast =====
let toastTimer = null;

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');

    toast.className = 'toast ' + type;
    icon.innerHTML = type === 'success'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    msg.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== Utility: Set button loading =====
function setButtonLoading(buttonId, isLoading, label) {
    const btn = document.getElementById(buttonId);
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Memproses...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-label">' + label + '</span>';
    }
}

// ===== Switch form (tab) =====
function switchForm(formType) {
    const loginBox = document.getElementById('loginBox');
    const registerBox = document.getElementById('registerBox');
    const successBox = document.getElementById('successBox');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    successBox.style.display = 'none';

    if (formType === 'login') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

// ===== Toggle password visibility =====
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.querySelector('.eye-open').style.display = isHidden ? 'none' : 'block';
    btn.querySelector('.eye-closed').style.display = isHidden ? 'block' : 'none';
}

// ===== Lupa password =====
function forgotPassword(e) {
    e.preventDefault();
    showToast('Hubungi admin untuk mereset password kamu.', 'error');
}

// ===== LOGIN FORM =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        showToast('Username dan password harus diisi!', 'error');
        return;
    }
    if (username.length < 3) {
        showToast('Username minimal 3 karakter!', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password minimal 6 karakter!', 'error');
        return;
    }

    setButtonLoading('loginButton', true, 'Masuk');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');

            // Simpan sesi
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('isLoggedIn', 'true');
            if (document.getElementById('loginRemember').checked) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            // Tampilkan halaman sukses
            showLoginSuccess(data.user);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Gagal terhubung ke server. Pastikan server berjalan!', 'error');
    } finally {
        setButtonLoading('loginButton', false, 'Masuk');
    }
});

// ===== REGISTER FORM =====
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

    // Validasi client-side
    if (!username || !email || !password || !confirmPassword) {
        showToast('Semua field harus diisi!', 'error');
        return;
    }
    if (username.length < 3) {
        showToast('Username minimal 3 karakter!', 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Format email tidak valid!', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password minimal 6 karakter!', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showToast('Password tidak cocok!', 'error');
        return;
    }

    setButtonLoading('registerButton', true, 'Buat Akun');

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('registerForm').reset();

            setTimeout(() => {
                switchForm('login');
                document.getElementById('loginUsername').value = username;
            }, 1200);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Gagal terhubung ke server. Pastikan server berjalan!', 'error');
    } finally {
        setButtonLoading('registerButton', false, 'Buat Akun');
    }
});

// ===== Tampilkan halaman sukses + redirect =====
let redirectTimer = null;

function showLoginSuccess(user) {
    switchForm('login'); // sembunyikan box lain
    const successBox = document.getElementById('successBox');
    successBox.style.display = 'block';

    const isAdmin = user.role === 'admin';
    document.getElementById('successTitle').textContent = isAdmin ? 'Login Admin Berhasil! 🛡️' : 'Login Berhasil! 🎉';
    document.getElementById('successMessage').textContent = isAdmin
        ? `Selamat datang, ${user.username}. Kamu masuk sebagai Admin.`
        : `Selamat datang kembali, ${user.username}!`;

    const lanjutBtn = document.querySelector('#successBox .btn-primary .btn-label');
    if (lanjutBtn) {
        lanjutBtn.textContent = isAdmin ? 'Lanjut ke Dashboard Admin →' : 'Lanjut ke Beranda →';
    }
    document.getElementById('successUsername').textContent = user.username;
    document.getElementById('successEmail').textContent = user.email;

    // Countdown redirect ke homepage
    let detik = 3;
    const countdown = document.getElementById('countdown');
    countdown.textContent = detik;

    clearInterval(redirectTimer);
    redirectTimer = setInterval(() => {
        detik--;
        countdown.textContent = detik;
        if (detik <= 0) {
            clearInterval(redirectTimer);
            goToHomepage();
        }
    }, 1000);
}

function goToHomepage() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role === 'admin') {
        window.location.href = '/admin/index.html';
    } else {
        window.location.href = '/homepage/index.html';
    }
}

function nextDestination() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.role === 'admin' ? '/admin/index.html' : '/homepage/index.html';
}

// ===== Muat username yang diingat =====
window.addEventListener('load', () => {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
        document.getElementById('loginUsername').value = remembered;
        document.getElementById('loginRemember').checked = true;
    }

    // Jika sudah login, langsung ke tujuan sesuai role
    if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('currentUser')) {
        window.location.href = nextDestination();
    }
});

console.log('App loaded! Jalankan server: node server.js (http://localhost:3000)');
