document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const adminPasswordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const usersContainer = document.getElementById('usersContainer');

    // Mencegah form submit default jika dibungkus form
    adminPasswordInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') loginBtn.click();
    });

    loginBtn.addEventListener('click', async () => {
        const password = adminPasswordInput.value;
        if (!password) return;

        loginBtn.textContent = 'Memeriksa...';
        loginError.style.display = 'none';
        
        try {
            const res = await fetch('/api/admin/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                const data = await res.json();
                showDashboard(data);
            } else if (res.status === 401) {
                loginError.textContent = 'Password salah!';
                loginError.style.display = 'block';
            } else {
                loginError.textContent = 'Gagal terhubung ke API (Mungkin kamu tidak membuka http://localhost:3000)';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error(error);
            alert('Gagal terhubung ke server. Pastikan server (node server.js) berjalan.');
        } finally {
            loginBtn.textContent = 'Masuk';
        }
    });

    function showDashboard(usersData) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        renderUsers(usersData);
    }

    function renderUsers(usersData) {
        usersContainer.innerHTML = '';
        
        const usersArray = Object.values(usersData);
        
        if(usersArray.length === 0) {
            usersContainer.innerHTML = `<div class="glass-card"><p class="section-desc">Belum ada data user yang masuk.</p></div>`;
            return;
        }

        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

        usersArray.forEach(user => {
            const card = document.createElement('div');
            card.className = 'glass-card user-card';
            
            // Generate mini tracker HTML (Checklist Mingguan)
            let trackerHtml = '<div class="mini-tracker">';
            days.forEach((day, index) => {
                const isChecked = user.tracker && user.tracker[day] ? 'checked' : '';
                trackerHtml += `<div class="mini-day ${isChecked}" title="${dayLabels[index]}">${dayLabels[index][0]}</div>`;
            });
            trackerHtml += '</div>';

            // Generate materials table HTML (Bahan WPDA)
            let materialsHtml = '';
            if (user.materials && user.materials.length > 0) {
                const sortedMaterials = [...user.materials].sort((a, b) => new Date(b.date) - new Date(a.date));
                materialsHtml = `
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Ayat</th>
                                    <th>Judul & Isi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedMaterials.map(m => {
                                    const dateObj = new Date(m.date);
                                    const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                                    return `
                                    <tr>
                                        <td style="white-space: nowrap;">${formattedDate}</td>
                                        <td style="white-space: nowrap;">${escapeHTML(m.verse)}</td>
                                        <td>
                                            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">${escapeHTML(m.title)}</div>
                                            <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; white-space: pre-wrap;">${escapeHTML(m.content)}</div>
                                        </td>
                                    </tr>
                                    `
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                materialsHtml = `<p style="color: var(--text-muted); font-style: italic; margin-top: 1rem;">Belum ada catatan WPDA.</p>`;
            }

            card.innerHTML = `
                <div class="user-header">
                    <h3 class="user-name">${escapeHTML(user.name)}</h3>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.3rem; text-align: right;">Progress WPDA Minggu Ini</div>
                        ${trackerHtml}
                    </div>
                </div>
                ${materialsHtml}
            `;

            usersContainer.appendChild(card);
        });
    }

    function escapeHTML(str) {
        if(!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
