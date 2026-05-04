const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // 👈 นำเข้า Controller
const requireAuth = require('../middleware/requireAuth');

// แสดงหน้า Login
router.get('/login', (req, res) => res.render('login'));

// รับข้อมูลจากฟอร์ม Login
router.post('/login', authController.login);

// แสดงหน้า Register (ถ้ามี)
router.get('/register', (req, res) => res.render('register'));
router.post('/register', authController.register);

// ออกจากระบบ
router.get('/logout', authController.logout);

// แสดงหน้ารีเซ็ตรหัสผ่าน
// (สมมติว่าคุณเซฟไฟล์ html ด้านบนชื่อ resetpassword.ejs ไว้ในโฟลเดอร์ views)
router.get('/resetpassword', (req, res) => res.render('resetpassword'));

// รับข้อมูลจากฟอร์มรีเซ็ตรหัสผ่าน
router.post('/resetpassword', authController.resetPassword);

// 💾 Routes สำหรับหน้า Save / Load (เรียกใช้จาก authController)
router.get('/load-save', requireAuth, authController.loadSavePage);
router.post('/game/save', requireAuth, authController.saveGame);
router.post('/game/load', requireAuth, authController.loadGame);
router.post('/game/delete-save', requireAuth, authController.deleteSave);

module.exports = router;