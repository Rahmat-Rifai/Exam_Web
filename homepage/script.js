// Cek autentikasi saat halaman dimuat
window.addEventListener('load', function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');
    
    if (isLoggedIn !== 'true' || !currentUser) {
        // Belum login, redirect ke login page (root path)
        window.location.href = '/';
        return;
    }
    
    // Sudah login, tampilkan info user
    const user = JSON.parse(currentUser);
    document.getElementById('displayUsername').textContent = user.username;
    document.getElementById('userInfoHeader').style.display = 'flex';
});

// Fungsi logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

console.log('Homepage script loaded');
