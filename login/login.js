document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('message');
    
    // Validasi input
    if (username === '' || password === '') {
        showMessage('Semua field harus diisi!', 'error');
        return;
    }
    
    if (username.length < 3) {
        showMessage('Username minimal 3 karakter!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password minimal 6 karakter!', 'error');
        return;
    }
    
    // Simulasi login (bisa diganti dengan API call)
    // Contoh: username: admin, password: admin123
    if (username === 'admin' && password === 'admin123') {
        showMessage('Login berhasil! Selamat datang, ' + username, 'success');
        console.log('Login berhasil dengan username:', username);
        
        // Simpan di localStorage jika "Ingat saya" dipilih
        if (document.getElementById('remember').checked) {
            localStorage.setItem('rememberedUsername', username);
            console.log('Username disimpan di localStorage');
        }
        
        // Redirect setelah 2 detik (opsional)
        setTimeout(() => {
            // window.location.href = '../index.html';
        }, 2000);
    } else {
        showMessage('Username atau password salah!', 'error');
        console.log('Login gagal');
    }
    
    // Clear password field
    document.getElementById('password').value = '';
});

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
}

// Load remembered username saat halaman dibuka
window.addEventListener('load', function() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('remember').checked = true;
    }
});

console.log('Login script berhasil dimuat');
console.log('Akun demo - Username: admin, Password: admin123');
