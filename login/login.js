const API_URL = 'http://localhost:3000/api';

// ===== Toast =====
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

// ===== Toggle password =====
function togglePassword(btn) {
    const input = document.getElementById('password');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.querySelector('.eye-open').style.display = isHidden ? 'none' : 'block';
    btn.querySelector('.eye-closed').style.display = isHidden ? 'block' : 'none';
}

// ===== Set button loading =====
function setButtonLoading(isLoading) {
    const btn = document.getElementById('loginButton');
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Memproses...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-label">Masuk</span>';
    }
}

// ===== Submit login =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

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

    setButtonLoading(true);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');

            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('isLoggedIn', 'true');

            if (document.getElementById('remember').checked) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            // Redirect sesuai role
            setTimeout(() => {
                window.location.href = data.user.role === 'admin' ? '/admin/index.html' : '/homepage/index.html';
            }, 1200);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Gagal terhubung ke server. Pastikan server berjalan!', 'error');
    } finally {
        setButtonLoading(false);
    }
});

// ===== Muat username yang diingat =====
window.addEventListener('load', () => {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
        document.getElementById('username').value = remembered;
        document.getElementById('remember').checked = true;
    }

    // Sudah login? Langsung ke tujuan sesuai role
    if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('currentUser')) {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        window.location.href = u.role === 'admin' ? '/admin/index.html' : '/homepage/index.html';
    }
});

console.log('Login script loaded. Server: node server.js (http://localhost:3000)');
