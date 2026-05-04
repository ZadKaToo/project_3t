const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 🏪 โหลดหน้าร้านค้า (Shop)
exports.loadShop = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        if (!playerId) return res.redirect('/login');

        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        
        // ----------------------------------------------------
        // 🛍️ ระบบสุ่มร้านค้า 13 ชิ้น (เก็บค่าไว้ใน Session)
        // ----------------------------------------------------
        let shopItems = req.session.shopItems; // ลองดึงของเดิมจาก Session ออกมาก่อน

        // ถ้าใน Session ยังไม่มีของ (เพิ่งเข้าร้านครั้งแรก) หรืออยากให้มันสุ่มใหม่
        if (!shopItems || shopItems.length === 0) {
            // สุ่มของ 13 ชิ้นจากฐานข้อมูล
            const [randomItems] = await db.query('SELECT * FROM Items WHERE price > 0 ORDER BY RAND() LIMIT 13');
            
            // บันทึกเก็บไว้ใน Session ของผู้เล่น
            req.session.shopItems = randomItems; 
            shopItems = randomItems;
        }
        // ----------------------------------------------------
        
        // ดึงกระเป๋าของผู้เล่นไปโชว์ด้วยว่ามีของอะไรอยู่แล้วบ้าง
        const [inventory] = await db.query(`
            SELECT i.name, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);

        res.render('shop', { 
            player: players[0], 
            shopItems: shopItems, // ส่ง 13 ชิ้นนี้ไปหน้าเว็บ
            inventory: inventory
        });
    } catch (error) {
        console.error('❌ Load Shop Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าร้านค้า');
    }
};

// 💰 ระบบซื้อไอเทม
exports.buyItem = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        const { item_id } = req.body;

        // ดึงข้อมูลผู้เล่นและไอเทมที่ต้องการซื้อ
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        const [items] = await db.query('SELECT * FROM Items WHERE item_id = ?', [item_id]);
        
        if (players.length === 0 || items.length === 0) {
            return res.status(404).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        let player = players[0];
        let item = items[0];

        // เช็คเงินว่าพอไหม
        if (player.gold < item.price) {
            return res.json({ success: false, message: 'Gold ของคุณไม่เพียงพอ!' });
        }

        // หักเงิน
        const newGold = player.gold - item.price;
        await db.query('UPDATE Players SET gold = ? WHERE player_id = ?', [newGold, playerId]);

        // เช็คว่ามีไอเทมนี้ในกระเป๋าหรือยัง
        const [inventory] = await db.query('SELECT * FROM Inventory WHERE player_id = ? AND item_id = ?', [playerId, item_id]);
        
        if (inventory.length > 0) {
            // ถ้ามีแล้ว ให้บวกจำนวนเพิ่ม
            await db.query('UPDATE Inventory SET quantity = quantity + 1 WHERE inventory_id = ?', [inventory[0].inventory_id]);
        } else {
            // ถ้ายังไม่มี ให้เพิ่มแถวใหม่
            await db.query('INSERT INTO Inventory (player_id, item_id, quantity) VALUES (?, ?, 1)', [playerId, item_id]);
        }

        res.json({ 
            success: true, 
            message: `ซื้อ ${item.name} สำเร็จ!`,
            newGold: newGold
        });

    } catch (error) {
        console.error('❌ Buy Item Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการซื้อไอเทม' });
    }
};