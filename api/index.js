require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rahasiaadmin';
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Koneksi ke MongoDB
let connectionError = null;
if (!MONGODB_URI) {
    console.error("=================================");
    console.error("❌ MONGODB_URI BELUM DIISI!");
    console.error("Buka file .env dan masukkan Connection String dari MongoDB Atlas.");
    console.error("=================================");
} else {
    mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Terhubung ke MongoDB! Data sekarang aman di Cloud.'))
    .catch(err => {
        console.error('❌ Gagal terhubung ke MongoDB:', err);
        connectionError = err.toString();
    });
}

// ------------------------------------
// DATABASE SCHEMA (Struktur Data MongoDB)
// ------------------------------------
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // name dalam lowercase sebagai ID
    originalName: { type: String, required: true },
    tracker: {
        mon: Boolean, tue: Boolean, wed: Boolean, thu: Boolean,
        fri: Boolean, sat: Boolean, sun: Boolean
    },
    materials: [{
        id: String,
        date: String,
        verse: String,
        title: String,
        content: String
    }]
});

const User = mongoose.model('User', userSchema);

// ------------------------------------
// API ENDPOINTS UNTUK USER
// ------------------------------------

app.get('/api/user/:name', async (req, res) => {
    try {
        const nameKey = req.params.name.trim().toLowerCase();
        const user = await User.findOne({ name: nameKey });
        
        if (user) {
            res.json({ name: user.originalName, tracker: user.tracker, materials: user.materials });
        } else {
            res.json({ name: req.params.name, tracker: {}, materials: [] });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server' });
    }
});

app.post('/api/tracker', async (req, res) => {
    try {
        const { name, trackerData } = req.body;
        if (!name) return res.status(400).json({ error: 'Nama dibutuhkan' });

        const nameKey = name.trim().toLowerCase();
        
        // Cari user atau buat baru jika tidak ada
        let user = await User.findOne({ name: nameKey });
        if (!user) {
            user = new User({ name: nameKey, originalName: name.trim(), tracker: {}, materials: [] });
        }
        
        user.tracker = trackerData;
        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server' });
    }
});

app.post('/api/wpda', async (req, res) => {
    try {
        const { name, materialData } = req.body;
        if (!name) return res.status(400).json({ error: 'Nama dibutuhkan' });

        const nameKey = name.trim().toLowerCase();
        
        // Beri ID unik dan tanggal masuk jika belum ada
        if(!materialData.id) materialData.id = Date.now().toString();

        let user = await User.findOne({ name: nameKey });
        if (!user) {
            user = new User({ name: nameKey, originalName: name.trim(), tracker: {}, materials: [] });
        }
        
        user.materials.push(materialData);
        await user.save();
        res.json({ success: true, material: materialData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server' });
    }
});

app.delete('/api/wpda/:name/:id', async (req, res) => {
    try {
        const nameKey = req.params.name.trim().toLowerCase();
        const id = req.params.id;
        
        const user = await User.findOne({ name: nameKey });
        if (user) {
            user.materials = user.materials.filter(m => m.id !== id);
            await user.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'User tidak ditemukan' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server' });
    }
});

// ------------------------------------
// API ENDPOINTS UNTUK ADMIN
// ------------------------------------

// Endpoint untuk mengambil seluruh data (membutuhkan password)
app.post('/api/admin/data', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Password salah!' });
        }
        
        const users = await User.find({});
        
        // Mengubah format Array dari MongoDB menjadi Object (seperti database.json)
        // Ini dilakukan agar admin.js milik kita tidak rusak (tetap kompatibel)
        const usersObj = {};
        users.forEach(u => {
            usersObj[u.name] = {
                name: u.originalName,
                tracker: u.tracker || {},
                materials: u.materials || []
            };
        });
        
        res.json(usersObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: (error.message || 'Terjadi kesalahan') + ' | DEBUG_URI: ' + (MONGODB_URI ? 'TERISI' : 'KOSONG') + ' | CONN_ERR: ' + (connectionError || 'NONE') });
    }
});

// Jalankan server jika dijalankan secara lokal (bukan Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`=================================`);
        console.log(`Server RemindMe Berjalan di Port ${PORT}`);
        console.log(`- Web User : http://localhost:${PORT}`);
        console.log(`- Web Admin: http://localhost:${PORT}/admin.html`);
        console.log(`=================================`);
    });
}

// Export app untuk Vercel Serverless
module.exports = app;
