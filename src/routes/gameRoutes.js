const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const gameController = require('../controllers/gameController');
const shopController = require('../controllers/shopController');

// 👇 แก้บรรทัดนี้จาก (req, res) => res.render('combat') เป็นเรียก Controller
router.get('/combat', requireAuth, gameController.loadCombat);

router.post('/combat/execute', requireAuth, gameController.executeCombat);

// เส้นทางสำหรับหน้าตาย (Game Over)
router.get('/game-over', requireAuth, gameController.gameOver);

// ดึงฟังก์ชัน loadMap มาแสดงผลเมื่อผู้เล่นเข้า URL: /map
router.get('/map', requireAuth, gameController.loadMap);

// ส่วนอันนี้ของเดิมที่คุณมีอยู่แล้ว (รับข้อมูลตอนกดทอยเต๋า)
router.post('/map/explore', requireAuth, gameController.exploreMap);

// เส้นทางสำหรับเข้าไปที่ร้านค้า
router.get('/shop', requireAuth, shopController.loadShop);

router.post('/choose-class', requireAuth , gameController.chooseClass);

router.post('/player/choose-class', requireAuth, gameController.chooseClass);

// เส้นทางสำหรับกดซื้อของ (เรียกผ่าน API/Fetch)
router.post('/shop/buy', requireAuth, shopController.buyItem);

router.post('/api/roll-dice', requireAuth, gameController.rollDice);

// 1. เส้นทางเช็คสถานะก่อนเข้าเกม
router.get('/start-game', requireAuth, gameController.startGame);

// 2. เส้นทางสำหรับแสดงหน้าทอยเต๋า (หน้า HTML ที่คุณเพิ่งเขียน)
router.get('/roll-class', requireAuth, gameController.rollClassPage);

router.post('/inventory/manage', requireAuth, gameController.manageInventory);

module.exports = router;