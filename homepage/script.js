const API_URL = 'http://localhost:3000/api';

// Cek autentikasi saat halaman dimuat
window.addEventListener('load', function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = localStorage.getItem('currentUser');

    if (isLoggedIn !== 'true' || !currentUser) {
        // Belum login, redirect ke halaman login
        window.location.href = '/';
        return;
    }

    // Sudah login, tampilkan info user
    const user = JSON.parse(currentUser);
    document.getElementById('displayUsername').textContent = user.username;
    document.getElementById('displayAvatar').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('greetingName').textContent = user.username;
    document.getElementById('userInfoHeader').style.display = 'flex';

    // Jika admin, tampilkan link ke dashboard admin
    if (user.role === 'admin') {
        document.getElementById('adminLink').style.display = 'inline-flex';
    }

    // Ambil status ujian dari server
    muatStatusUjian();
});

// ===== Status ujian (aktif / nonaktif) =====
function muatStatusUjian() {
    fetch(API_URL + '/exams')
        .then(r => r.json())
        .then(data => {
            document.querySelectorAll('.exam-card').forEach(card => {
                const kode = card.dataset.kode;
                const exam = data[kode];
                if (!exam) return;

                const badge = card.querySelector('.exam-status-badge');
                const link = card.querySelector('.btn-start');

                if (exam.aktif) {
                    badge.classList.remove('hidden');
                } else {
                    badge.textContent = '● Nonaktif';
                    badge.classList.remove('active');
                    badge.classList.add('inactive');
                    badge.classList.remove('hidden');
                    card.classList.add('disabled');
                    if (link) {
                        link.classList.add('disabled-link');
                        link.removeAttribute('href');
                        link.addEventListener('click', e => e.preventDefault());
                        link.textContent = 'Ujian Dinonaktifkan';
                    }
                }
            });
        })
        .catch(() => { /* server mati — biarkan default */ });
}

// Fungsi logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

console.log('Homepage script loaded');
