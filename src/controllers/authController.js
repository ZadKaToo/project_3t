const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 💾 1. โหลดหน้า Save / Load 
exports.loadSavePage = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        if (!playerId) return res.redirect('/login');

        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        const playerStats = players[0];

        // ดึงข้อมูลเซฟ และประวัติ
        const [saves] = await db.query('SELECT * FROM GameSaves WHERE player_id = ? ORDER BY slot_number ASC', [playerId]);
        const [history] = await db.query('SELECT * FROM History WHERE player_id = ? ORDER BY played_at DESC LIMIT 10', [playerId]);
        
        // จัดการ Slot ให้มี 3 ช่องเสมอ
        const saveSlots = [null, null, null];
        saves.forEach(save => {
            saveSlots[save.slot_number - 1] = {
                ...save,
                username: playerStats.username,
                avatar: playerStats.class_name === 'Mage' ? '🧙' : (playerStats.class_name === 'Warrior' ? '⚔️' : '👤') // ลูกเล่นเปลี่ยนไอคอนตามอาชีพ
            };
        });

        res.render('load-save', { player: playerStats, saveSlots, history });
    } catch (error) {
        console.error('❌ Load Save Page Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าบันทึกเกม');
    }
};

// 📥 2. บันทึกเกม (Save)
exports.saveGame = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const playerId = req.session.playerId;
        const slot = parseInt(req.body.slot);
        
        if (![1, 2, 3].includes(slot)) throw new Error('Slot ปลอมแปลง');

        await connection.beginTransaction(); // เริ่มต้นล็อคข้อมูล

        // 1. ดึงข้อมูลสเตตัสผู้เล่นปัจจุบัน
        const [players] = await connection.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        const p = players[0];

        // 2. ดึงข้อมูลของในกระเป๋าทั้งหมด และแปลงเป็น JSON
        const [inventory] = await connection.query('SELECT item_id, quantity FROM Inventory WHERE player_id = ?', [playerId]);
        const inventoryJson = JSON.stringify(inventory);

        // 3. บันทึกลง GameSaves (ใช้ ON DUPLICATE KEY เพื่ออัปเดตถ้ามีเซฟเดิมอยู่แล้ว)
        await connection.query(`
            INSERT INTO GameSaves (
                player_id, slot_number, current_stage, hp, max_hp, sanity, max_sanity, gold, 
                current_location, inventory_data, class_name, exp, max_exp, str, intel, agi, 
                equipped_weapon, equipped_armor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                current_stage=VALUES(current_stage), hp=VALUES(hp), max_hp=VALUES(max_hp), 
                sanity=VALUES(sanity), max_sanity=VALUES(max_sanity), gold=VALUES(gold), 
                current_location=VALUES(current_location), inventory_data=VALUES(inventory_data),
                class_name=VALUES(class_name), exp=VALUES(exp), max_exp=VALUES(max_exp),
                str=VALUES(str), intel=VALUES(intel), agi=VALUES(agi),
                equipped_weapon=VALUES(equipped_weapon), equipped_armor=VALUES(equipped_armor),
                saved_at=CURRENT_TIMESTAMP
        `, [
            playerId, slot, p.current_stage, p.hp, p.max_hp, p.sanity, p.max_sanity, p.gold,
            `ด่าน ${p.current_stage}`, inventoryJson, p.class_name, p.exp, p.max_exp, 
            p.str, p.intel, p.agi, p.equipped_weapon, p.equipped_armor
        ]);

        await connection.commit(); // ยืนยันการบันทึก
        res.redirect('/load-save');
    } catch (error) {
        await connection.rollback(); // ยกเลิกการบันทึกถ้ามี Error
        console.error('❌ Save Game Error:', error);
        res.status(500).send('ระบบขัดข้อง บันทึกเกมไม่สำเร็จ');
    } finally {
        connection.release(); // คืน Connection เสมอ
    }
};

// 🚀 3. โหลดเกม (Load)
exports.loadGame = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const playerId = req.session.playerId;
        const slot = parseInt(req.body.slot);

        await connection.beginTransaction();

        // 1. ดึงข้อมูลจาก Slot ที่เลือก
        const [saves] = await connection.query('SELECT * FROM GameSaves WHERE player_id = ? AND slot_number = ?', [playerId, slot]);
        if (saves.length === 0) throw new Error('ไม่พบข้อมูลเซฟ');
        const save = saves[0];

        // 2. นำข้อมูลไปทับสเตตัสใน Players
        await connection.query(`
            UPDATE Players 
            SET current_stage = ?, hp = ?, max_hp = ?, sanity = ?, max_sanity = ?, gold = ?,
                class_name = ?, exp = ?, max_exp = ?, str = ?, intel = ?, agi = ?,
                equipped_weapon = ?, equipped_armor = ?
            WHERE player_id = ?
        `, [
            save.current_stage, save.hp, save.max_hp, save.sanity, save.max_sanity, save.gold,
            save.class_name, save.exp, save.max_exp, save.str, save.intel, save.agi,
            save.equipped_weapon, save.equipped_armor, playerId
        ]);

        // 3. จัดการกระเป๋า (ลบของปัจจุบันทิ้งทั้งหมด แล้วยัดของจาก Save ลงไปใหม่)
        await connection.query('DELETE FROM Inventory WHERE player_id = ?', [playerId]);

        let inventoryData = [];
        if (save.inventory_data) {
            // ป้องกันกรณี Driver MySQL อ่าน JSON มาเป็น String 
            inventoryData = typeof save.inventory_data === 'string' ? JSON.parse(save.inventory_data) : save.inventory_data;
        }

        if (inventoryData && inventoryData.length > 0) {
            const inventoryValues = inventoryData.map(item => [playerId, item.item_id, item.quantity]);
            // ใช้ Bulk Insert เพิ่มของทั้งหมดในคำสั่งเดียว
            await connection.query('INSERT INTO Inventory (player_id, item_id, quantity) VALUES ?', [inventoryValues]);
        }

        await connection.commit();
        res.redirect('/load-save');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Load Game Error:', error);
        res.status(500).send('ระบบขัดข้อง โหลดเกมไม่สำเร็จ');
    } finally {
        connection.release();
    }
};

// 🗑️ 4. ลบเซฟ (Delete)
exports.deleteSave = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        const slot = parseInt(req.body.slot);

        await db.query('DELETE FROM GameSaves WHERE player_id = ? AND slot_number = ?', [playerId, slot]);
        res.redirect('/load-save');
    } catch (error) {
        console.error('❌ Delete Save Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการลบเซฟ');
    }
};

// 🔑 1. เข้าสู่ระบบ (Login)
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // ค้นหาผู้เล่นจากชื่อ
        const [users] = await db.query('SELECT * FROM Players WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).send('ไม่พบชื่อนักผจญภัยนี้');
        }

        const user = users[0];

        // ตรวจสอบรหัสผ่าน (เทียบค่าที่รับมากับ Password Hash ใน DB)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).send('รหัสผ่านไม่ถูกต้อง');
        }

        // เก็บ ID ลง Session เพื่อยืนยันตัวตนในหน้าอื่นๆ
        req.session.playerId = user.player_id;
        req.session.username = user.username;

        // เข้าสู่เกม (ไปที่หน้า Lobby)
        res.redirect('/'); 

    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
};

// 📝 สมัครสมาชิก (Register)
exports.register = async (req, res) => {
    try {
        // รับค่าทั้ง 3 ตัวมาจากฟอร์ม (ตามแอตทริบิวต์ name ใน HTML)
        const { username, password, confirm_password } = req.body;
        
        // 🛡️ 1. เช็คว่ารหัสผ่านและการยืนยันรหัสผ่านตรงกันหรือไม่
        if (password !== confirm_password) {
            // ในอนาคตคุณอาจจะเปลี่ยนเป็นการส่งแจ้งเตือน (Flash message) สวยๆ แทนการส่ง Text ธรรมดาได้ครับ
            return res.status(400).send('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาลองใหม่อีกครั้ง');
        }

        // 🔐 2. Hash รหัสผ่านเพื่อความปลอดภัย
        const hashedPassword = await bcrypt.hash(password, 10);

        // 💾 3. บันทึกผู้เล่นใหม่ลงตาราง Players
        await db.query(
            'INSERT INTO Players (username, password_hash) VALUES (?, ?)',
            [username, hashedPassword]
        );

        // 🎉 4. สร้างตัวละครสำเร็จ ให้กลับไปหน้าเข้าสู่ระบบ
        res.redirect('/login'); 

    } catch (error) {
        // ดักจับ Error กรณีมีคนใช้ชื่อนี้ไปแล้ว (username เป็น UNIQUE ใน DB)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).send('ชื่อนักผจญภัยนี้ถูกใช้ไปแล้ว กรุณาเลือกชื่ออื่น');
        }
        console.error('❌ Register Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการสร้างตัวละคร');
    }
};

// 🔄 รีเซ็ตรหัสผ่าน (Reset Password)
exports.resetPassword = async (req, res) => {
    try {
        const { username, new_password } = req.body;

        // 1. ตรวจสอบว่ามีชื่อนักผจญภัยนี้อยู่ในระบบหรือไม่
        const [users] = await db.query('SELECT * FROM Players WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(404).send('ไม่พบชื่อนักผจญภัยนี้ในระบบ');
        }

        // 2. Hash รหัสผ่านใหม่
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // 3. อัปเดตรหัสผ่านในฐานข้อมูล
        await db.query(
            'UPDATE Players SET password_hash = ? WHERE username = ?',
            [hashedNewPassword, username]
        );

        // 4. เปลี่ยนรหัสผ่านสำเร็จ ให้กลับไปหน้า Login
        res.redirect('/login');

    } catch (error) {
        console.error('❌ Reset Password Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    }
};

// 🚪 3. ออกจากเกม (Logout)
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};