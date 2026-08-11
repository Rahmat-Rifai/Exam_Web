(function () {
    'use strict';

    // Data soal didefinisikan per halaman di window.SOAL
    const SOAL = window.SOAL;
    if (!SOAL || !Array.isArray(SOAL.soal) || SOAL.soal.length === 0) return;

    const KODE = SOAL.kode || 'indonesia';
    const API_URL = 'http://localhost:3000/api';
    const HURUF = ['A', 'B', 'C', 'D', 'E'];

    // ===== Cek autentikasi =====
    const currentUserRaw = localStorage.getItem('currentUser');
    if (localStorage.getItem('isLoggedIn') !== 'true' || !currentUserRaw) {
        window.location.href = '/';
        return;
    }
    const currentUser = JSON.parse(currentUserRaw);

    // ===== State ujian =====
    const total = SOAL.soal.length;
    let indexSekarang = 0;
    let jawaban = new Array(total).fill(-1);
    let detik = Math.max(1, SOAL.waktuMenit) * 60;
    let timerId = null;
    let ujianSelesai = false;
    let ujianDimulai = false;

    // ===== Referensi elemen =====
    const el = {
        posisiSoal: document.getElementById('posisiSoal'),
        totalSoal: document.getElementById('totalSoal'),
        sudahDijawab: document.getElementById('sudahDijawab'),
        progressFill: document.getElementById('progressFill'),
        navDots: document.getElementById('navDots'),
        questionCard: document.getElementById('questionCard'),
        btnPrev: document.getElementById('btnPrev'),
        btnNext: document.getElementById('btnNext'),
        btnFinish: document.getElementById('btnFinish'),
        timer: document.getElementById('timer'),
        confirmModal: document.getElementById('confirmModal'),
        confirmText: document.getElementById('confirmText'),
        btnConfirmYa: document.getElementById('btnConfirmYa'),
        btnConfirmBatal: document.getElementById('btnConfirmBatal'),
        resultModal: document.getElementById('resultModal'),
        ringScore: document.getElementById('ringScore'),
        scoreNumber: document.getElementById('scoreNumber'),
        scoreEmoji: document.getElementById('scoreEmoji'),
        scoreLabel: document.getElementById('scoreLabel'),
        resultFeedback: document.getElementById('resultFeedback'),
        statBenar: document.getElementById('statBenar'),
        statSalah: document.getElementById('statSalah'),
        statKosong: document.getElementById('statKosong'),
        reviewList: document.getElementById('reviewList'),
        btnUlangi: document.getElementById('btnUlangi'),
        btnBeranda: document.getElementById('btnBeranda')
    };

    // ===== Timer =====
    function formatWaktu(d) {
        const m = String(Math.floor(d / 60)).padStart(2, '0');
        const s = String(d % 60).padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateTimer() {
        el.timer.textContent = formatWaktu(detik);
        if (detik <= 300) {
            el.timer.parentElement.classList.add('warning');
        }
        if (detik <= 0) {
            clearInterval(timerId);
            selesaikanUjian(true); // waktu habis, langsung kumpulkan
            return;
        }
        detik--;
    }

    // ===== Navigasi soal =====
    function renderDots() {
        el.navDots.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nav-dot';
            btn.textContent = i + 1;
            btn.addEventListener('click', () => renderSoal(i));
            el.navDots.appendChild(btn);
        }
    }

    function perbaruiDots() {
        const dots = el.navDots.querySelectorAll('.nav-dot');
        dots.forEach((dot, i) => {
            dot.className = 'nav-dot';
            if (jawaban[i] !== -1) dot.classList.add('answered');
            if (i === indexSekarang) dot.classList.add('current');
        });
    }

    function perbaruiProgres() {
        el.posisiSoal.textContent = indexSekarang + 1;
        const terjawab = jawaban.filter(j => j !== -1).length;
        el.sudahDijawab.textContent = terjawab + ' dari ' + total + ' terjawab';
        el.progressFill.style.width = ((terjawab / total) * 100).toFixed(1) + '%';
        el.btnPrev.disabled = indexSekarang === 0;
        el.btnNext.disabled = indexSekarang === total - 1;
        perbaruiDots();
    }

    function renderSoal(i) {
        if (ujianSelesai) return;
        indexSekarang = i;
        const s = SOAL.soal[i];

        let textSoal = s.t;
        let jawabanEl = '';
        if (s.passage) {
            textSoal = `<div class="passage">${s.passage}</div>` + textSoal;
        }

        s.o.forEach((opsi, oi) => {
            const selected = jawaban[i] === oi ? ' selected' : '';
            jawabanEl += `
                <label class="option-label${selected}">
                    <input type="radio" name="q${i}" value="${oi}" ${selected ? 'checked' : ''}>
                    <span class="option-letter">${HURUF[oi]}</span>
                    <span class="option-text">${opsi}</span>
                </label>`;
        });

        el.questionCard.innerHTML = `
            <span class="question-number">Soal ${i + 1} dari ${total}</span>
            <p class="question-text">${textSoal}</p>
            <div class="options-group">${jawabanEl}</div>`;

        // Handler pilihan
        el.questionCard.querySelectorAll('.option-label').forEach((label, oi) => {
            label.addEventListener('click', () => {
                jawaban[indexSekarang] = oi;
                label.querySelector('input').checked = true;
                el.questionCard.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
                label.classList.add('selected');
                perbaruiProgres();
            });
        });

        perbaruiProgres();

        // Scroll ke atas kartu soal
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== Selesai ujian =====
    function selesaikanUjian(otomatis) {
        if (ujianSelesai) return;

        const terjawab = jawaban.filter(j => j !== -1).length;
        const belum = total - terjawab;

        if (otomatis) {
            hitungDanTampilkan();
            return;
        }

        // Konfirmasi dulu
        el.confirmText.textContent = belum > 0
            ? `Kamu masih memiliki ${belum} soal yang belum dijawab. Apakah kamu yakin ingin mengakhiri ujian?`
            : 'Semua soal sudah dijawab. Apakah kamu yakin ingin mengakhiri ujian?';
        el.confirmModal.classList.add('show');
    }

    function kirimHasil(score, benar, salah, kosong) {
        fetch(`${API_URL}/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': currentUser.id
            },
            body: JSON.stringify({ kode: KODE, skor: score, benar, salah, kosong, jumlah: total })
        }).then(r => r.json()).then(data => {
            if (!data.success) console.warn('Hasil tidak tersimpan:', data.message);
        }).catch(err => console.warn('Gagal mengirim hasil:', err));
    }

    function hitungDanTampilkan() {
        ujianSelesai = true;
        clearInterval(timerId);

        let benar = 0;
        let salah = 0;
        let kosong = 0;
        const salahList = [];

        SOAL.soal.forEach((s, i) => {
            if (jawaban[i] === s.k) {
                benar++;
            } else if (jawaban[i] === -1) {
                kosong++;
                salahList.push(i);
            } else {
                salah++;
                salahList.push(i);
            }
        });

        const score = Math.round((benar / total) * 100);

        // Kirim hasil ke server
        kirimHasil(score, benar, salah, kosong);

        // Data untuk review
        const reviewHtml = salahList.map(i => {
            const s = SOAL.soal[i];
            const teksPendek = s.t.replace(/<[^>]*>/g, '').slice(0, 90) + (s.t.length > 90 ? '…' : '');
            const jawabanUser = jawaban[i] !== -1 ? HURUF[jawaban[i]] : '—';
            const status = jawaban[i] === -1 ? 'salah' : 'salah';
            return `
                <div class="review-item">
                    <span class="status ${status}">${jawaban[i] === -1 ? '!' : '✕'}</span>
                    <div class="review-text">
                        <strong>Soal ${i + 1}.</strong> ${teksPendek}<br>
                        Jawabanmu: <strong>${jawabanUser}</strong> · Kunci: <strong>${HURUF[s.k]}. ${stripHtml(s.o[s.k])}</strong>
                    </div>
                </div>`;
        }).join('');

        el.reviewList.innerHTML = reviewHtml || '<p style="padding:14px;color:#141413;font-weight:700;text-align:center;">Semua jawaban benar!</p>';

        // Ring skor
        const keliling = 339.29;
        el.ringScore.style.strokeDashoffset = keliling;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.ringScore.style.strokeDashoffset = keliling * (1 - score / 100);
            });
        });

        // Animasi angka
        let nilai = 0;
        const interval = setInterval(() => {
            nilai++;
            el.scoreNumber.textContent = nilai;
            if (nilai >= score) clearInterval(interval);
        }, 1200 / Math.max(1, score));

        // Emoji & label
        let emoji, label, feedback;
        if (score === 100) { emoji = '🏆'; label = 'Sempurna!'; feedback = 'Luar biasa! Kamu menjawab semua soal dengan benar.'; }
        else if (score >= 80) { emoji = '🌟'; label = 'Hebat!'; feedback = 'Hasil yang sangat memuaskan. Pertahankan ya!'; }
        else if (score >= 60) { emoji = '👍'; label = 'Cukup Baik'; feedback = 'Kerja bagus! Pelajari kembali soal yang salah.'; }
        else if (score >= 40) { emoji = '💪'; label = 'Terus Berlatih'; feedback = 'Jangan menyerah, coba lagi setelah belajar.'; }
        else { emoji = '📚'; label = 'Perlu Belajar Lagi'; feedback = 'Semangat! Baca kembali materinya lalu coba lagi.'; }

        el.scoreEmoji.textContent = emoji;
        el.scoreLabel.textContent = label;
        el.resultFeedback.textContent = feedback;
        el.statBenar.textContent = '✅ Benar: ' + benar;
        el.statSalah.textContent = '❌ Salah: ' + salah;
        el.statKosong.textContent = '⬜ Kosong: ' + kosong;

        el.resultModal.classList.add('show');
    }

    function stripHtml(html) {
        const d = document.createElement('div');
        d.innerHTML = html;
        return d.textContent || d.innerText || '';
    }

    // ===== Gerbang token =====
    function buatGate() {
        const gate = document.createElement('div');
        gate.className = 'exam-gate';
        gate.id = 'examGate';
        gate.innerHTML = `
            <div class="gate-card">
                <div class="gate-ico">🎫</div>
                <h2>Masukkan Token Ujian</h2>
                <p>Token diberikan oleh admin/panitia ujian. Masukkan token untuk memulai <strong>${SOAL.judul || 'Ujian'}</strong>.</p>
                <input type="text" id="tokenInput" placeholder="Contoh: MTK-1A2B3C" autocomplete="off" spellcheck="false">
                <div class="gate-error" id="gateError"></div>
                <button class="gate-btn" id="btnGate">Mulai Ujian →</button>
                <div class="gate-note">Satu token berlaku untuk satu siswa. Hubungi admin jika token tidak valid.</div>
            </div>`;
        document.body.appendChild(gate);

        const input = gate.querySelector('#tokenInput');
        const errorEl = gate.querySelector('#gateError');
        const btn = gate.querySelector('#btnGate');

        function validasi() {
            const token = input.value.trim();
            if (!token) {
                errorEl.textContent = 'Token tidak boleh kosong!';
                errorEl.style.display = 'block';
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<span class="gate-spinner"></span> Memeriksa token...';
            errorEl.style.display = 'none';

            fetch(`${API_URL}/token/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser.id
                },
                body: JSON.stringify({ kode: KODE, token: token.toUpperCase() })
            }).then(r => r.json()).then(data => {
                if (data.success) {
                    detik = Math.max(1, data.waktuMenit || SOAL.waktuMenit) * 60;
                    gate.remove();
                    ujianDimulai = true;
                    mulaiUjian();
                } else {
                    btn.disabled = false;
                    btn.innerHTML = 'Mulai Ujian →';
                    errorEl.textContent = data.message || 'Token tidak valid.';
                    errorEl.style.display = 'block';
                }
            }).catch(() => {
                btn.disabled = false;
                btn.innerHTML = 'Mulai Ujian →';
                errorEl.textContent = 'Gagal terhubung ke server. Pastikan server berjalan (node server.js di folder login).';
                errorEl.style.display = 'block';
            });
        }

        btn.addEventListener('click', validasi);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') validasi(); });
        input.focus();
    }

    function mulaiUjian() {
        renderDots();
        renderSoal(0);
        updateTimer();
        timerId = setInterval(updateTimer, 1000);
    }

    // ===== Event handlers =====
    el.btnPrev.addEventListener('click', () => {
        if (indexSekarang > 0) renderSoal(indexSekarang - 1);
    });

    el.btnNext.addEventListener('click', () => {
        if (indexSekarang < total - 1) renderSoal(indexSekarang + 1);
    });

    el.btnFinish.addEventListener('click', () => selesaikanUjian(false));

    el.btnConfirmYa.addEventListener('click', () => {
        el.confirmModal.classList.remove('show');
        hitungDanTampilkan();
    });

    el.btnConfirmBatal.addEventListener('click', () => {
        el.confirmModal.classList.remove('show');
    });

    el.btnUlangi.addEventListener('click', () => {
        window.location.reload();
    });

    el.btnBeranda.addEventListener('click', () => {
        window.location.href = SOAL.halamanKembali || '../homepage/index.html';
    });

    // Tutup modal dengan klik di luar
    [el.confirmModal, el.resultModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });

    // ===== Inisialisasi: tampilkan gerbang token =====
    buatGate();
})();
