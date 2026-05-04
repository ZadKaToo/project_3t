// ไฟล์นี้ทำหน้าที่เป็น "ยามเฝ้าประตู"
module.exports = (req, res, next) => {
    // เช็คว่าใน Session มีการบันทึก ID ของผู้เล่นไว้หรือยัง
    if (req.session && req.session.playerId) {
        // ถ้ามีบัตรผ่าน (ล็อกอินแล้ว) ให้เชิญผ่านเข้าไปได้ (ทำงาน Route ถัดไป)
        return next();
    } else {
        // ถ้าไม่มี (ยังไม่ล็อกอิน) ให้เด้งกลับไปหน้า login
        console.log('🛑 ถูกปฏิเสธการเข้าถึง: กรุณาเข้าสู่ระบบก่อน');
        return res.redirect('/login');
    }
};

// ฟังก์ชันนี้จะทำหน้าที่เป็น "กระเป๋าสะพาย" ที่ติดตัวผู้เล่นไปทุกหน้าเว็บ
exports.loadGlobalInventory = async (req, res, next) => {
    try {
        // ถ้ายังไม่ได้ล็อกอิน ให้ข้ามไปเลย ไม่ต้องหาของ
        if (!req.session.playerId) {
            return next(); 
        }

        const playerId = req.session.playerId;

        // 1. ดึงข้อมูลผู้เล่น
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length > 0) {
            // ใช้ res.locals เพื่อให้ตัวแปรนี้ใช้งานได้ในทุกหน้า EJS โดยไม่ต้องส่งผ่าน res.render()
            res.locals.player = players[0];
        }

        // 2. ดึงข้อมูล Inventory
        const [inventory] = await db.query(`
            SELECT i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);
        res.locals.inventory = inventory;

        // 3. ดึงชื่ออุปกรณ์ที่สวมใส่
        res.locals.equippedWeaponName = '---';
        res.locals.equippedArmorName = '---';

        if (res.locals.player) {
            if (res.locals.player.equipped_weapon) {
                const [wep] = await db.query('SELECT name FROM Items WHERE item_id = ?', [res.locals.player.equipped_weapon]);
                if (wep.length > 0) res.locals.equippedWeaponName = wep[0].name;
            }
            if (res.locals.player.equipped_armor) {
                const [arm] = await db.query('SELECT name FROM Items WHERE item_id = ?', [res.locals.player.equipped_armor]);
                if (arm.length > 0) res.locals.equippedArmorName = arm[0].name;
            }
        }

        // ดึงเสร็จแล้ว สั่งให้ไปทำงานฟังก์ชันต่อไปได้เลย
        next(); 

    } catch (error) {
        console.error('❌ Global Inventory Middleware Error:', error);
        next();
    }
};