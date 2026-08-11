const API_URL = 'http://localhost:3000/api';

// ===== Cek autentikasi admin =====
window.addEventListener('load', function () {
    if (localStorage.getItem('isLoggedIn') !== 'true' || !localStorage.getItem('currentUser')) {
        window.location.href = '/';
        return;
    }
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.role !== 'admin') {
        alert('Halaman ini khusus admin.');
        window.location.href = '/homepage/index.html';
        return;
    }
    document.getElementById('adminName').textContent = user.username;
    document.getElementById('adminAvatar').textContent = user.username.charAt(0).toUpperCase();

    initNav();
    initGenerateForm();
    initSearch();
    initModals();
    refreshAll();
});

// ===== Helper =====
function headers() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return { 'Content-Type': 'application/json', 'x-user-id': user.id };
}

async function api(path, options = {}) {
    const res = await fetch(API_URL + path, { ...options, headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.success) {
        throw new Error(data.message || 'Terjadi kesalahan.');
    }
    return data;
}

let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');
    toast.className = 'toast ' + type;
    icon.innerHTML = type === 'success'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    msg.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function esc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
}

function fmtTanggal(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function statusToken(t) {
    if (!t.aktif) return { cls: 'gray', txt: 'Nonaktif' };
    if (new Date(t.ekspired) < new Date()) return { cls: 'amber', txt: 'Kadaluarsa' };
    if (t.dipakaiOleh) return { cls: 'indigo', txt: 'Dipakai' };
    return { cls: 'green', txt: 'Aktif' };
}

// ===== Navigasi =====
function initNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showSection(btn.dataset.section);
        });
    });
    document.querySelectorAll('[data-goto]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === btn.dataset.goto));
            showSection(btn.dataset.goto);
        });
    });
}

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + name).classList.add('active');
    if (name === 'overview') loadOverview();
    if (name === 'exams') loadExams();
    if (name === 'tokens') loadTokens();
    if (name === 'users') loadUsers();
    if (name === 'results') loadResults();
}

function refreshAll() { loadOverview(); }

// ===== Ringkasan =====
async function loadOverview() {
    try {
        const s = await api('/admin/stats');
        const cards = [
            { ico: '👥', value: s.totalSiswa, label: 'Total Siswa', sub: s.totalAdmin + ' admin' },
            { ico: '📚', value: Object.values(s.exams).filter(e => e.aktif).length + '/' + Object.keys(s.exams).length, label: 'Ujian Aktif', sub: 'dari semua ujian' },
            { ico: '🎫', value: s.tokenTerpakai + '/' + s.totalToken, label: 'Token Terpakai', sub: s.tokenAktif + ' token aktif' },
            { ico: '📈', value: s.totalHasil, label: 'Ujian Dikumpulkan', sub: 'rata-rata ' + s.rataRata }
        ];
        document.getElementById('statCards').innerHTML = cards.map(c => `
            <div class="stat-card">
                <div class="stat-ico">${c.ico}</div>
                <div class="stat-value">${c.value}</div>
                <div class="stat-label">${c.label}</div>
                <div class="stat-sub">${c.sub}</div>
            </div>`).join('');

        document.getElementById('overviewExams').innerHTML = Object.entries(s.exams).map(([kode, e]) => {
            return `
            <div class="exam-status-item">
                <div class="exam-ico">${e.ikon || '📝'}</div>
                <div class="exam-info">
                    <strong>${esc(e.nama)}</strong>
                    <small>${e.jumlahHasil} dikumpulkan · rata-rata ${e.rataRata}</small>
                </div>
                ${e.aktif
                    ? '<span class="badge green">● Aktif</span>'
                    : '<span class="badge amber">● Nonaktif</span>'}
            </div>`;
        }).join('');

        const hasil = await api('/admin/results');
        const recent = hasil.slice(0, 6);
        document.getElementById('recentResults').innerHTML = recent.length
            ? recent.map(r => `
                <tr>
                    <td><strong>${esc(r.username)}</strong></td>
                    <td>${r.ikon || '📝'} ${esc(r.namaUjian)}</td>
                    <td><span class="score-pill"><span class="dot"></span>${r.skor}</span></td>
                    <td style="color:var(--muted);white-space:nowrap;">${fmtTanggal(r.tanggal)}</td>
                </tr>`).join('')
            : '<tr class="empty-row"><td colspan="4">Belum ada siswa yang mengumpulkan ujian.</td></tr>';
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Kelola ujian =====
async function loadExams() {
    try {
        const exams = await api('/admin/exams');
        document.getElementById('examConfigList').innerHTML = Object.entries(exams).map(([kode, e]) => {
            return `
            <div class="exam-config-card" data-kode="${kode}">
                <div class="exam-config-top">
                    <div class="exam-ico">${e.ikon || '📝'}</div>
                    <label class="switch" title="${e.aktif ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}">
                        <input type="checkbox" ${e.aktif ? 'checked' : ''} onchange="toggleExam('${kode}', this)">
                        <span class="slider"></span>
                    </label>
                </div>
                <h3>${esc(e.nama)}</h3>
                <p class="exam-desc">${e.aktif
                    ? 'Ujian aktif. Siswa dengan token valid bisa mengerjakan.'
                    : 'Ujian nonaktif. Semua token otomatis ditolak.'}</p>
                <div class="config-rows">
                    <div class="config-row">
                        <span>Durasi (menit)</span>
                        <input type="number" min="1" max="180" value="${e.waktuMenit}" id="dur-${kode}">
                    </div>
                </div>
                <button class="btn-primary btn-sm" onclick="saveExam('${kode}')">💾 Simpan Durasi</button>
            </div>`;
        }).join('');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function toggleExam(kode, el) {
    try {
        await api('/admin/exams/' + kode, {
            method: 'POST',
            body: JSON.stringify({ aktif: el.checked })
        });
        showToast(el.checked ? 'Ujian diaktifkan.' : 'Ujian dinonaktifkan.');
        loadExams();
    } catch (e) {
        el.checked = !el.checked;
        showToast(e.message, 'error');
    }
}

async function saveExam(kode) {
    try {
        const waktuMenit = parseInt(document.getElementById('dur-' + kode).value, 10);
        if (!waktuMenit || waktuMenit < 1) throw new Error('Durasi minimal 1 menit.');
        await api('/admin/exams/' + kode, {
            method: 'POST',
            body: JSON.stringify({ waktuMenit })
        });
        showToast('Pengaturan ujian disimpan.');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Token =====
let allTokens = [];

async function loadTokens() {
    try {
        const exams = await api('/admin/exams');
        const sel = document.getElementById('genExam');
        sel.innerHTML = Object.entries(exams).map(([kode, e]) =>
            `<option value="${kode}">${e.ikon} ${esc(e.nama)}</option>`).join('');

        allTokens = await api('/admin/tokens');
        renderTokens();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function renderTokens() {
    const q = (document.getElementById('tokenSearch').value || '').toLowerCase();
    const list = allTokens.filter(t => !q || t.token.toLowerCase().includes(q));

    document.getElementById('tokenList').innerHTML = list.length ? list.map(t => {
        const st = statusToken(t);
        const usedBy = t.dipakaiOleh ? `<div class="token-used">Dipakai ${esc(t.dipakaiOleh.username)} · ${fmtTanggal(t.dipakaiOleh.dipakaiPada)}</div>` : '';
        return `
        <tr>
            <td>
                <span class="token-code" onclick="copyToken('${t.token}')" title="Klik untuk salin">${esc(t.token)}</span>
                ${usedBy}
            </td>
            <td>${t.ikon || '📝'} ${esc(t.namaUjian)}</td>
            <td><span class="badge ${st.cls}">${st.txt}</span></td>
            <td style="color:var(--muted);white-space:nowrap;">${fmtTanggal(t.ekspired)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon" title="Salin token" onclick="copyToken('${t.token}')">📋</button>
                    <button class="btn-icon" title="${t.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="toggleToken(${t.id})">${t.aktif ? '⏸' : '▶️'}</button>
                    <button class="btn-icon danger" title="Hapus token" onclick="deleteToken(${t.id})">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('') : '<tr class="empty-row"><td colspan="5">Belum ada token. Generate token di atas.</td></tr>';
}

function initGenerateForm() {
    document.getElementById('btnGenerate').addEventListener('click', generateTokens);
    document.getElementById('btnCopyAll').addEventListener('click', copyAllGenerated);
}

async function generateTokens() {
    const kode = document.getElementById('genExam').value;
    const jumlah = parseInt(document.getElementById('genCount').value, 10) || 1;
    const masaBerlakuMenit = parseInt(document.getElementById('genExpiry').value, 10) || 60;

    const btn = document.getElementById('btnGenerate');
    btn.disabled = true;
    btn.textContent = '⏳ Membuat...';
    try {
        const data = await api('/admin/tokens', {
            method: 'POST',
            body: JSON.stringify({ kode, jumlah, masaBerlakuMenit })
        });
        showToast(data.message);

        const box = document.getElementById('generatedBox');
        box.style.display = 'block';
        document.getElementById('generatedTokens').innerHTML = data.tokens.map(t =>
            `<span class="token-chip" onclick="copyToken('${t.token}')">${t.token}</span>`).join('');

        loadTokens();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate';
    }
}

async function toggleToken(id) {
    try {
        const data = await api('/admin/tokens/' + id + '/toggle', { method: 'POST' });
        showToast(data.message);
        loadTokens();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteToken(id) {
    if (!confirm('Hapus token ini?')) return;
    try {
        const data = await api('/admin/tokens/' + id, { method: 'DELETE' });
        showToast(data.message);
        loadTokens();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function copyToken(token) {
    navigator.clipboard.writeText(token).then(() => {
        showToast('Token ' + token + ' disalin!');
        document.querySelectorAll('.token-chip').forEach(c => {
            if (c.textContent.trim() === token) {
                c.classList.add('copied');
                c.textContent = '✓ Tersalin';
                setTimeout(() => { c.classList.remove('copied'); c.textContent = token; }, 1500);
            }
        });
    }).catch(() => showToast('Gagal menyalin.', 'error'));
}

function copyAllGenerated() {
    const tokens = [...document.querySelectorAll('#generatedTokens .token-chip')].map(c => c.textContent.trim()).filter(t => t !== '✓ Tersalin');
    if (!tokens.length) return;
    navigator.clipboard.writeText(tokens.join('\n')).then(() => showToast(tokens.length + ' token disalin!'));
}

// ===== Pengguna =====
let allUsers = [];

async function loadUsers() {
    try {
        allUsers = await api('/admin/users');
        renderUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function renderUsers() {
    const q = (document.getElementById('userSearch').value || '').toLowerCase();
    const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const list = allUsers.filter(u => !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

    document.getElementById('userList').innerHTML = list.length ? list.map(u => `
        <tr>
            <td style="color:var(--muted);">${u.id}</td>
            <td><strong>${esc(u.username)}</strong>${u.id === me.id ? ' <span class="badge indigo">Kamu</span>' : ''}</td>
            <td style="color:var(--muted);">${esc(u.email)}</td>
            <td>${u.role === 'admin'
                ? '<span class="badge violet">🛡️ Admin</span>'
                : '<span class="badge indigo">👤 Siswa</span>'}</td>
            <td>${u.blocked
                ? '<span class="badge red">Diblokir</span>'
                : '<span class="badge green">Aktif</span>'}</td>
            <td style="color:var(--muted);white-space:nowrap;">${u.createdAt || '-'}</td>
            <td>
                <div class="actions-cell">
                    ${u.id !== me.id ? `
                        <button class="btn-icon" title="Reset password" onclick="openReset(${u.id}, '${esc(u.username)}')">🔑</button>
                        <button class="btn-icon ${u.blocked ? 'success' : 'danger'}" title="${u.blocked ? 'Aktifkan kembali' : 'Blokir akun'}" onclick="toggleBlock(${u.id})">${u.blocked ? '✅' : '🚫'}</button>
                        <button class="btn-icon danger" title="Hapus akun" onclick="deleteUser(${u.id})">🗑️</button>
                    ` : '<span style="color:var(--muted);font-size:0.78rem;">—</span>'}
                </div>
            </td>
        </tr>`).join('')
        : '<tr class="empty-row"><td colspan="7">Tidak ada pengguna.</td></tr>';
}

async function toggleBlock(id) {
    try {
        const data = await api('/admin/users/' + id + '/toggle-block', { method: 'POST' });
        showToast(data.message);
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteUser(id) {
    const u = allUsers.find(x => x.id === id);
    if (!confirm('Hapus akun ' + (u ? u.username : '') + '? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
        const data = await api('/admin/users/' + id, { method: 'DELETE' });
        showToast(data.message);
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Hasil =====
let allResults = [];

async function loadResults() {
    try {
        allResults = await api('/admin/results');
        const filter = document.getElementById('resultFilter');
        filter.innerHTML = '<option value="">Semua Ujian</option>' +
            [...new Set(allResults.map(r => r.kode))].map(k =>
                `<option value="${k}">${rIkon(k)} ${esc(allResults.find(r => r.kode === k).namaUjian)}</option>`).join('');
        renderResults();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function rIkon(kode) {
    return { matematika: '📐', indonesia: '📖', inggris: '🌍' }[kode] || '📝';
}

function renderResults() {
    const f = document.getElementById('resultFilter').value;
    const list = allResults.filter(r => !f || r.kode === f);

    document.getElementById('resultList').innerHTML = list.length ? list.map(r => {
        return `
        <tr>
            <td><strong>${esc(r.username)}</strong></td>
            <td>${r.ikon || '📝'} ${esc(r.namaUjian)}</td>
            <td><span class="score-pill"><span class="dot"></span>${r.skor}</span></td>
            <td>${r.benar}</td>
            <td style="color:var(--danger);">${r.salah}</td>
            <td style="color:var(--muted);">${r.kosong}</td>
            <td style="color:var(--muted);white-space:nowrap;">${fmtTanggal(r.tanggal)}</td>
        </tr>`;
    }).join('') : '<tr class="empty-row"><td colspan="7">Belum ada hasil ujian.</td></tr>';
}

// ===== Search & modal init =====
function initSearch() {
    document.getElementById('tokenSearch').addEventListener('input', renderTokens);
    document.getElementById('userSearch').addEventListener('input', renderUsers);
    document.getElementById('resultFilter').addEventListener('change', renderResults);
}

let resetTargetId = null;

function initModals() {
    document.getElementById('btnAddUser').addEventListener('click', () => openModal('addUserModal'));
    document.getElementById('btnSaveUser').addEventListener('click', saveUser);

    document.getElementById('btnResetSave').addEventListener('click', async () => {
        const password = document.getElementById('rpPassword').value;
        if (!password || password.length < 6) {
            return showToast('Password baru minimal 6 karakter!', 'error');
        }
        try {
            const data = await api('/admin/users/' + resetTargetId + '/reset-password', {
                method: 'POST',
                body: JSON.stringify({ password })
            });
            showToast(data.message);
            closeModal('resetModal');
            document.getElementById('rpPassword').value = '';
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function openReset(id, username) {
    resetTargetId = id;
    document.getElementById('resetTarget').textContent = 'Reset password untuk: ' + username;
    document.getElementById('rpPassword').value = '';
    openModal('resetModal');
}

async function saveUser() {
    const username = document.getElementById('auUsername').value.trim();
    const email = document.getElementById('auEmail').value.trim();
    const password = document.getElementById('auPassword').value;
    const role = document.getElementById('auRole').value;

    if (!username || !email || !password) return showToast('Semua field wajib diisi!', 'error');
    if (password.length < 6) return showToast('Password minimal 6 karakter!', 'error');

    try {
        const data = await api('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, role })
        });
        showToast(data.message);
        closeModal('addUserModal');
        ['auUsername', 'auEmail', 'auPassword'].forEach(id => document.getElementById(id).value = '');
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== Logout =====
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

console.log('Admin dashboard loaded');
