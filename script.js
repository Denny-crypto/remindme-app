document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let currentUser = localStorage.getItem('remindme_username') || '';
    let trackerState = {};
    let materials = [];

    const mainAppContent = document.getElementById('mainAppContent');
    const profileDesc = document.getElementById('profileDesc');
    const nameInputGroup = document.getElementById('nameInputGroup');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const displayUserName = document.getElementById('displayUserName');
    const userNameInput = document.getElementById('userNameInput');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const changeNameBtn = document.getElementById('changeNameBtn');

    // --- Profile Logic ---
    function updateProfileUI() {
        if (currentUser) {
            mainAppContent.style.display = 'block';
            nameInputGroup.style.display = 'none';
            profileDesc.style.display = 'none';
            welcomeMessage.style.display = 'block';
            displayUserName.textContent = currentUser;
            loadUserData(); // Fetch from server
        } else {
            mainAppContent.style.display = 'none';
            nameInputGroup.style.display = 'block';
            profileDesc.style.display = 'block';
            welcomeMessage.style.display = 'none';
        }
    }

    saveNameBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem('remindme_username', currentUser);
            updateProfileUI();
        } else {
            alert('Silakan masukkan nama kamu terlebih dahulu.');
        }
    });

    changeNameBtn.addEventListener('click', () => {
        if(confirm('Yakin ingin mengganti nama? Data WPDA akan disesuaikan dengan nama baru.')) {
            currentUser = '';
            localStorage.removeItem('remindme_username');
            userNameInput.value = '';
            trackerState = {};
            materials = [];
            updateProfileUI();
        }
    });

    // --- API / Server Logic ---
    async function loadUserData() {
        try {
            const res = await fetch(`http://localhost:3000/api/user/${encodeURIComponent(currentUser)}`);
            if (res.ok) {
                const data = await res.json();
                trackerState = data.tracker || {};
                materials = data.materials || [];
                renderTracker();
                renderMaterials();
            }
        } catch (error) {
            console.error('Gagal memuat data dari server:', error);
            alert('Gagal terhubung ke server. Pastikan server (node server.js) sedang berjalan.');
        }
    }

    async function saveTrackerToServer() {
        try {
            await fetch('http://localhost:3000/api/tracker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentUser, trackerData: trackerState })
            });
        } catch (error) {
            console.error('Gagal menyimpan tracker:', error);
        }
    }

    // --- Weekly Tracker Logic ---
    const days = [
        { id: 'mon', label: 'Sen' },
        { id: 'tue', label: 'Sel' },
        { id: 'wed', label: 'Rab' },
        { id: 'thu', label: 'Kam' },
        { id: 'fri', label: 'Jum' },
        { id: 'sat', label: 'Sab' },
        { id: 'sun', label: 'Min' }
    ];

    const weekTrackerEl = document.getElementById('weekTracker');
    const wpdaCountEl = document.getElementById('wpdaCount');
    const resetTrackerBtn = document.getElementById('resetTrackerBtn');

    function renderTracker() {
        weekTrackerEl.innerHTML = '';
        let checkedCount = 0;

        days.forEach(day => {
            const isChecked = trackerState[day.id] || false;
            if (isChecked) checkedCount++;

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `day-${day.id}`;
            checkbox.className = 'day-checkbox';
            checkbox.checked = isChecked;

            checkbox.addEventListener('change', (e) => {
                trackerState[day.id] = e.target.checked;
                updateCount();
                saveTrackerToServer(); // Sync to server
            });

            const label = document.createElement('label');
            label.htmlFor = `day-${day.id}`;
            label.className = 'day-circle';

            const textLabel = document.createElement('span');
            textLabel.className = 'day-label';
            textLabel.textContent = day.label;

            dayDiv.appendChild(textLabel);
            dayDiv.appendChild(checkbox);
            dayDiv.appendChild(label);
            
            weekTrackerEl.appendChild(dayDiv);
        });

        updateCountDisplay(checkedCount);
    }

    function updateCount() {
        const checkedCount = Object.values(trackerState).filter(val => val === true).length;
        updateCountDisplay(checkedCount);
    }

    function updateCountDisplay(count) {
        wpdaCountEl.textContent = count;
        if(count === 7) {
            wpdaCountEl.style.textShadow = '0 0 10px var(--primary-glow)';
        } else {
            wpdaCountEl.style.textShadow = 'none';
        }
    }

    resetTrackerBtn.addEventListener('click', () => {
        if(confirm('Apakah kamu yakin ingin mereset progress mingguan ini?')) {
            trackerState = {};
            renderTracker();
            saveTrackerToServer();
        }
    });

    // --- WPDA Materials Logic ---
    const wpdaForm = document.getElementById('wpdaForm');
    const materialsListEl = document.getElementById('materialsList');
    const emptyStateEl = document.getElementById('emptyState');
    
    document.getElementById('wpdaDate').valueAsDate = new Date();

    function renderMaterials() {
        materialsListEl.innerHTML = '';
        
        if (materials.length === 0) {
            materialsListEl.appendChild(emptyStateEl);
            emptyStateEl.style.display = 'block';
            return;
        }

        emptyStateEl.style.display = 'none';
        const sortedMaterials = [...materials].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedMaterials.forEach((material) => {
            const card = document.createElement('div');
            card.className = 'material-card';
            
            const dateObj = new Date(material.date);
            const formattedDate = dateObj.toLocaleDateString('id-ID', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });

            card.innerHTML = `
                <div class="material-header">
                    <div>
                        <h3 class="material-title">${escapeHTML(material.title)}</h3>
                        <div class="material-meta">
                            <span>📅 ${formattedDate}</span>
                            <span>📖 ${escapeHTML(material.verse)}</span>
                        </div>
                    </div>
                    <button class="btn-delete" data-id="${material.id}">Hapus</button>
                </div>
                <div class="material-content">${escapeHTML(material.content)}</div>
            `;

            materialsListEl.appendChild(card);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idToRemove = e.target.getAttribute('data-id');
                if(confirm('Apakah kamu yakin ingin menghapus catatan WPDA ini?')) {
                    try {
                        const res = await fetch(`http://localhost:3000/api/wpda/${encodeURIComponent(currentUser)}/${idToRemove}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            materials = materials.filter(m => m.id !== idToRemove);
                            renderMaterials();
                        }
                    } catch (error) {
                        console.error('Gagal menghapus wpda:', error);
                    }
                }
            });
        });
    }

    wpdaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const date = document.getElementById('wpdaDate').value;
        const verse = document.getElementById('wpdaVerse').value;
        const title = document.getElementById('wpdaTitle').value;
        const content = document.getElementById('wpdaContent').value;

        const newMaterial = { date, verse, title, content };

        // Tampilkan loading state jika perlu, untuk sekarang langsung hit API
        const submitBtn = wpdaForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/wpda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: currentUser, materialData: newMaterial })
            });
            
            if (res.ok) {
                const data = await res.json();
                materials.push(data.material); // Backend mengembalikan data beserta id unik
                renderMaterials();
                
                document.getElementById('wpdaVerse').value = '';
                document.getElementById('wpdaTitle').value = '';
                document.getElementById('wpdaContent').value = '';
                
                if(window.innerWidth <= 900) {
                    document.querySelector('.materials-section').scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                alert('Gagal menyimpan ke server.');
            }
        } catch (error) {
            console.error('Gagal menyimpan WPDA:', error);
            alert('Gagal menyimpan ke server. Pastikan server berjalan.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize UI
    updateProfileUI();
});
