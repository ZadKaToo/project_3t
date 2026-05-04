const express = require('express');
const router = express.Router();
// เพิ่มบรรทัดนี้ไว้บนสุด (ถัดจากพวก const express = require('express');)
const db = require('../config/db'); // ⚠️ หมายเหตุ: ปรับ Path ตรง '../config/db' ให้ตรงกับไฟล์ตั้งค่าฐานข้อมูลของคุณนะครับ

// ดึง requireAuth และ gameController มาใช้ด้วย
const requireAuth = require('../middleware/requireAuth');
const gameController = require('../controllers/gameController');

// เปลี่ยนให้เรียกผ่าน Controller
router.get('/', requireAuth, gameController.loadLobby);

// หน้าตั้งค่า
router.get('/setting', requireAuth , async (req, res) => {
    try {
        // เช็คก่อนว่าล็อกอินหรือยัง
        const playerId = req.session.playerId;
        if (!playerId) {
            return res.redirect('/'); // ถ้าไม่มี session ให้เด้งกลับหน้าแรกหรือหน้าล็อกอิน
        }

        // ค้นหาข้อมูลผู้เล่นจากฐานข้อมูล
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        
        if (players.length === 0) {
            return res.redirect('/');
        }

        const player = players[0];

        // ส่งตัวแปร player เข้าไปในหน้า setting ด้วย
        res.render('setting', { player: player });

    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าตั้งค่า');
    }
});

module.exports = router;