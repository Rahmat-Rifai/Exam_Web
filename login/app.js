const API_URL = 'http://localhost:3000/api';

// Switch between login dan register form
function switchForm(formType) {
    const loginBox = document.getElementById('loginBox');
    const registerBox = document.getElementById('registerBox');
    
    if (formType === 'login') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
        clearMessages();
    } else if (formType === 'register') {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
        clearMessages();
    }
}

// Kembali ke login
function backToLogin() {
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('successBox').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// Clear semua messages
function clearMessages() {
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('loginMessage').classList.remove('success', 'error', 'loading');
    document.getElementById('registerMessage').innerHTML = '';
    document.getElementById('registerMessage').classList.remove('success', 'error', 'loading');
}

// Show message
function showMessage(elementId, message, type) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
}

// LOGIN FORM
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    showMessage('loginMessage', 'Sedang login...', 'loading');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('loginMessage', data.message, 'success');
            
            // Simpan user info
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('isLoggedIn', 'true');
            
            setTimeout(() => {
                showLoginSuccess(data.user);
            }, 1000);
        } else {
            showMessage('loginMessage', data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('loginMessage', 'Gagal terhubung ke server!', 'error');
    }
});

// REGISTER FORM
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
    
    // Validasi client-side
    if (!username || !email || !password || !confirmPassword) {
        showMessage('registerMessage', 'Semua field harus diisi!', 'error');
        return;
    }
    
    if (username.length < 3) {
        showMessage('registerMessage', 'Username minimal 3 karakter!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('registerMessage', 'Password minimal 6 karakter!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('registerMessage', 'Password tidak cocok!', 'error');
        return;
    }
    
    showMessage('registerMessage', 'Sedang mendaftar...', 'loading');
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('registerMessage', data.message, 'success');
            document.getElementById('registerForm').reset();
            
            setTimeout(() => {
                switchForm('login');
                showMessage('loginMessage', 'Silakan login dengan akun baru Anda!', 'success');
                document.getElementById('loginUsername').value = username;
            }, 1500);
        } else {
            showMessage('registerMessage', data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('registerMessage', 'Gagal terhubung ke server!', 'error');
    }
});

// Show success page
function showLoginSuccess(user) {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById('successBox').style.display = 'block';
    
    document.getElementById('successMessage').textContent = `Selamat datang, ${user.username}!`;
    document.getElementById('successUsername').textContent = user.username;
    document.getElementById('successEmail').textContent = user.email;
    
    // Redirect ke homepage setelah 2 detik
    setTimeout(() => {
        window.location.href = '/homepage/index.html';
    }, 2000);
}

// Check jika sudah login
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');
    
    if (isLoggedIn === 'true' && currentUser) {
        // Sudah login, redirect ke homepage
        window.location.href = '/homepage/index.html';
    }
});

console.log('App loaded! Server harus berjalan di http://localhost:3000');
console.log('Run: node server.js');
