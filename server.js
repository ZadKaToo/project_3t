const express = require('express');
const path = require('path');
const session = require('express-session'); // 👈 1. นำเข้า express-session

const app = express();
const PORT = 80;

require('./src/config/db'); 

// ==========================================
// 2. ตั้งค่า Express และ Middleware
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 👈 2. ตั้งค่า Session สำหรับจดจำการล็อกอิน (ต้องวางไว้ก่อนเรียกใช้งาน Routes)
app.use(session({
    secret: 'dnd_secret_key_rpg', // รหัสลับสำหรับเข้ารหัส Session
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // ใช้ false เพราะเราเพิ่งรันบน http (ยังไม่ใช่ https)
}));

// ==========================================
// 3. นำเข้า Routes
// ==========================================
const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const gameRoutes = require('./src/routes/gameRoutes');

app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', gameRoutes);

// ==========================================
// 4. เริ่มรันเซิร์ฟเวอร์
// ==========================================
app.listen(PORT, () => {
    console.log(`🎲 D&D Quiz RPG Server is running on port ${PORT}`);
});