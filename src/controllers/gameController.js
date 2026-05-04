const db = require('../config/db');

// 🏕️ โหลดหน้า Lobby (หน้าหลัก)
exports.loadLobby = async (req, res) => {
    try {
        const playerId = req.session.playerId; 
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        
        const [inventory] = await db.query(`
            SELECT i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);

        res.render('index', { player: players[0], inventory: inventory });
    } catch (error) {
        console.error('❌ Load Lobby Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าหลัก');
    }
};

// 🎲 ระบบสุ่มอาชีพ (ทอยเต๋าเลือก 1 ใน 50 คลาส!)
exports.chooseClass = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        if (!playerId) return res.status(401).json({ success: false, message: 'กรุณาล็อกอินก่อน' });

        // 📚 ฐานข้อมูล 50 คลาสในรูปแบบ Object
        const classData = {
            // ⚔️ สายนักรบ / แทงค์ (เน้น HP, STR)
            'Warrior': { hp: 150, str: 8, intel: 2, agi: 4 },
            'Knight': { hp: 160, str: 7, intel: 3, agi: 3 },
            'Paladin': { hp: 140, str: 6, intel: 6, agi: 2 },
            'Berserker': { hp: 180, str: 12, intel: 1, agi: 2 },
            'Gladiator': { hp: 130, str: 9, intel: 2, agi: 6 },
            'Samurai': { hp: 120, str: 10, intel: 3, agi: 5 },
            'Spartan': { hp: 150, str: 8, intel: 2, agi: 5 },
            'Barbarian': { hp: 170, str: 11, intel: 1, agi: 3 },
            'Mercenary': { hp: 130, str: 8, intel: 3, agi: 5 },
            'Vanguard': { hp: 200, str: 5, intel: 2, agi: 1 },

            // 🔮 สายนักเวท (เน้น INT)
            'Mage': { hp: 80, str: 2, intel: 12, agi: 4 },
            'Sorcerer': { hp: 70, str: 1, intel: 14, agi: 3 },
            'Wizard': { hp: 75, str: 2, intel: 13, agi: 3 },
            'Warlock': { hp: 90, str: 4, intel: 10, agi: 3 },
            'Necromancer': { hp: 85, str: 3, intel: 11, agi: 4 },
            'Pyromancer': { hp: 80, str: 3, intel: 13, agi: 2 },
            'Cryomancer': { hp: 90, str: 2, intel: 11, agi: 3 },
            'Illusionist': { hp: 75, str: 2, intel: 10, agi: 8 },
            'Elementalist': { hp: 85, str: 2, intel: 12, agi: 4 },
            'Summoner': { hp: 90, str: 3, intel: 10, agi: 3 },

            // 💨 สายว่องไว / ลอบสังหาร (เน้น AGI)
            'Rogue': { hp: 100, str: 5, intel: 3, agi: 10 },
            'Assassin': { hp: 90, str: 7, intel: 2, agi: 12 },
            'Ninja': { hp: 95, str: 6, intel: 4, agi: 11 },
            'Thief': { hp: 110, str: 4, intel: 3, agi: 9 },
            'Ranger': { hp: 110, str: 6, intel: 3, agi: 8 },
            'Hunter': { hp: 120, str: 7, intel: 2, agi: 7 },
            'Sniper': { hp: 80, str: 8, intel: 4, agi: 9 },
            'Acrobat': { hp: 100, str: 4, intel: 2, agi: 14 },
            'Duelist': { hp: 115, str: 8, intel: 2, agi: 8 },
            'Shadowblade': { hp: 95, str: 6, intel: 6, agi: 10 },

            // 🌿 สายสนับสนุน / ศรัทธา (เน้น HP ปานกลาง และ INT)
            'Cleric': { hp: 110, str: 3, intel: 10, agi: 3 },
            'Priest': { hp: 90, str: 2, intel: 12, agi: 3 },
            'Monk': { hp: 130, str: 6, intel: 6, agi: 8 },
            'Druid': { hp: 120, str: 4, intel: 9, agi: 4 },
            'Bard': { hp: 100, str: 3, intel: 8, agi: 7 },
            'Shaman': { hp: 115, str: 4, intel: 10, agi: 4 },
            'Alchemist': { hp: 100, str: 3, intel: 11, agi: 5 },
            'Oracle': { hp: 80, str: 1, intel: 13, agi: 4 },
            'Mystic': { hp: 95, str: 2, intel: 11, agi: 5 },
            'Templar': { hp: 140, str: 6, intel: 8, agi: 2 },

            // 🃏 สายผสม / สายแปลกประหลาด (สเตตัสเฉพาะตัว)
            'Spellblade': { hp: 110, str: 7, intel: 7, agi: 5 },
            'DarkKnight': { hp: 150, str: 10, intel: 5, agi: 2 },
            'BloodMage': { hp: 140, str: 2, intel: 10, agi: 3 }, // เลือดเยอะแต่เน้นเวท
            'Gunner': { hp: 100, str: 8, intel: 4, agi: 6 },
            'Pirate': { hp: 120, str: 7, intel: 2, agi: 7 },
            'Engineer': { hp: 110, str: 5, intel: 9, agi: 4 },
            'Beastmaster': { hp: 130, str: 6, intel: 4, agi: 6 },
            'Jester': { hp: 90, str: 4, intel: 4, agi: 15 }, // ตัวตลก หนีเก่งสุดๆ
            'Vagabond': { hp: 110, str: 5, intel: 5, agi: 5 }, // สมดุลทุกอย่าง
            'Dragoon': { hp: 135, str: 9, intel: 3, agi: 6 },

            // 👑 สายพิเศษ / ลับ (คุณสามารถซ่อนเงื่อนไขในการปลดล็อคสายพวกนี้ได้ในอนาคต)
            'Vampire': { hp: 120, str: 6, intel: 8, agi: 8 },
            'Werewolf': { hp: 160, str: 11, intel: 1, agi: 6 },
            'Demon': { hp: 150, str: 9, intel: 9, agi: 4 },
            'Angel': { hp: 130, str: 5, intel: 12, agi: 5 },
            'Lich': { hp: 60, str: 1, intel: 18, agi: 2 }, // เลือดน้อยมาก เวทแรงทะลุจอ
            'Dragonblood': { hp: 180, str: 10, intel: 6, agi: 2 },
            'Cyborg': { hp: 140, str: 8, intel: 8, agi: 4 },
            'TimeTraveler':{ hp: 100, str: 3, intel: 10, agi: 10 },
            'Gambler': { hp: 100, str: 1, intel: 1, agi: 1 }
        };

        const classNames = Object.keys(classData);
        const randomRoll = Math.floor(Math.random() * classNames.length);
        const selectedClassName = classNames[randomRoll];
        const selectedClassStats = classData[selectedClassName];

        // ⚠️ อัปเดตข้อมูลผู้เล่น พร้อมกับ "รีเซ็ตสถานะทั้งหมด" สำหรับคนที่ตายแล้วมาเกิดใหม่
        await db.query(`
            UPDATE Players 
            SET class_name = ?, 
                max_hp = ?, hp = ?, 
                str = ?, intel = ?, agi = ?,
                sanity = max_sanity, -- รีเซ็ตสติให้เต็ม
                gold = 0 -- (ออปชันเสริม) เกิดใหม่โดนยึดเงินหมด! ถ้าไม่อยากยึดเงิน ลบบรรทัดนี้ออกครับ
            WHERE player_id = ?
        `, [
            selectedClassName, 
            selectedClassStats.hp, 
            selectedClassStats.hp, 
            selectedClassStats.str, 
            selectedClassStats.intel, 
            selectedClassStats.agi, 
            playerId
        ]);

        // (ออปชันเสริม) ล้างกระเป๋าไอเทมตอนตาย
        // await db.query('DELETE FROM Inventory WHERE player_id = ?', [playerId]);

        res.json({ 
            success: true, 
            className: selectedClassName,
            message: `ลูกเต๋าออกหน้าที่ ${randomRoll + 1}! คุณได้รับอาชีพ: ${selectedClassName} 🎉` 
        });
    } catch (error) {
        console.error('❌ Roll Class Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการทอยลูกเต๋า' });
    }
};

// 🗺️ โหลดหน้าแผนที่
exports.loadMap = async (req, res) => {
    try {
        const playerId = req.session.playerId; 
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        
        const [inventory] = await db.query(`
            SELECT i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);

        res.render('map', { player: players[0], inventory: inventory });
    } catch (error) {
        console.error('❌ Load Map Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนที่');
    }
};

// ⚔️ โหลดหน้าต่อสู้
exports.loadCombat = async (req, res) => {
    try {
        const playerId = req.session.playerId; 
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        const playerStats = players[0];

        // 🎒 [ส่วนที่เพิ่มมาใหม่] 1. ดึงข้อมูลกระเป๋า
        const [inventory] = await db.query(`
            SELECT inv.inventory_id, i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);

        // 🛡️ [ส่วนที่เพิ่มมาใหม่] 2. ดึงชื่ออุปกรณ์ที่สวมใส่อยู่
        let equippedWeaponName = null;
        let equippedArmorName = null;
        if (playerStats.equipped_weapon) {
            const [wep] = await db.query('SELECT name FROM Items WHERE item_id = ?', [playerStats.equipped_weapon]);
            if (wep.length > 0) equippedWeaponName = wep[0].name;
        }
        if (playerStats.equipped_armor) {
            const [arm] = await db.query('SELECT name FROM Items WHERE item_id = ?', [playerStats.equipped_armor]);
            if (arm.length > 0) equippedArmorName = arm[0].name;
        }

        // 3. ดึงมอนสเตอร์จาก Session หรือสุ่มใหม่
        let currentMonster = req.session.combatMonster;
        if (!currentMonster) {
            const [monsters] = await db.query('SELECT * FROM Monsters WHERE location_id = ? ORDER BY RAND() LIMIT 1', [playerStats.current_stage]);
            currentMonster = monsters[0] || { 
                name: 'สไลม์ฝึกหัด', hp: 50, max_hp: 50, damage: 5, image_url: '<i class="fa-solid fa-ghost text-6xl"></i>' 
            };
            req.session.combatMonster = currentMonster;
        }

        // 4. สุ่มคำถาม
        const [questions] = await db.query('SELECT * FROM Questions WHERE location_id = ? ORDER BY RAND() LIMIT 1', [playerStats.current_stage]);
        let currentQuestion = questions[0] || {
            question_id: 0, question_text: 'ระบบยังไม่มีคำถาม (ทดสอบ)', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct_answer: 'A'
        };

        // 5. ดึง Log การต่อสู้ล่าสุด
        const battleLogs = req.session.battleLogs || [];
        req.session.battleLogs = null;

        // 🎯 6. ส่งข้อมูลทั้งหมดให้หน้าเว็บ
        res.render('combat', { 
            player: playerStats,
            monster: currentMonster,
            question: currentQuestion,
            battleLogs: battleLogs,
            inventory: inventory,                   // 👈 อย่าลืมส่งกระเป๋า
            equippedWeaponName: equippedWeaponName, // 👈 ส่งชื่ออาวุธไปโชว์
            equippedArmorName: equippedArmorName    // 👈 ส่งชื่อเกราะไปโชว์
        });

    } catch (error) {
        console.error('❌ Load Combat Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการเข้าสู่ฉากต่อสู้');
    }
};

exports.executeCombat = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        const { action, answer, question_id } = req.body;
        
        // 🎲 1. สุ่มลูกเต๋าฝั่ง Server (1-20)
        const diceRoll = Math.floor(Math.random() * 20) + 1; 

        // 2. ดึงข้อมูลผู้เล่น และ มอนสเตอร์ที่กำลังสู้
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        let player = players[0];
        let monster = req.session.combatMonster;

        if (!monster) return res.redirect('/combat');

        // 🛡️ ป้องกันบั๊กค่าว่าง (Defensive Math จาก V1)
        const mDamage = Number(monster.damage) || 10; 
        const pSanity = Number(player.sanity) || 0;
        const pMaxSanity = Number(player.max_sanity) || 50;

        // 3. เช็คคำตอบ
        const [questions] = await db.query('SELECT * FROM Questions WHERE question_id = ?', [question_id]);
        const question = questions[0];
        
        let isCorrect = false;
        if (String(question_id) === '0') {
            isCorrect = true; 
        } else if (question && question.correct_answer) {
            isCorrect = (question.correct_answer.trim().toUpperCase() === answer.trim().toUpperCase());
        }

        let logs = [];
        let playerDmgTaken = 0;
        let monsterDmgTaken = 0;
        
        logs.push(`<span class="text-blue-400">[ระบบทอยเต๋า]</span> สวรรค์ประทานแต้ม <span class="font-bold text-white text-lg">${diceRoll}</span>!`);

        // 🛡️ 4. ดึงสเตตัสโบนัสจากอาวุธและเกราะ (เพิ่มกันแครชแบบ V1)
        let bonusDmg = 0;
        let bonusDef = 0;
        if (player.equipped_weapon) {
            const [wep] = await db.query('SELECT effect_value FROM Items WHERE item_id = ?', [player.equipped_weapon]);
            if (wep.length > 0 && wep[0].effect_value) bonusDmg = Number(wep[0].effect_value);
        }
        if (player.equipped_armor) {
            const [arm] = await db.query('SELECT effect_value FROM Items WHERE item_id = ?', [player.equipped_armor]);
            if (arm.length > 0 && arm[0].effect_value) bonusDef = Number(arm[0].effect_value);
        }

        // ⚔️ 5. คำนวณผลลัพธ์ (ใช้สูตรของ V2)
        if (isCorrect) {
            logs.push(`<span class="text-green-400"> [สำเร็จ] </span>`);
            
            if (action === 'attack') {
                if (diceRoll === 20) {
                    const dmg = (10 + bonusDmg) * 2; 
                    monsterDmgTaken = dmg;
                    logs.push(`🎲 [เต๋า 20] 💥 คริติคอลเพอร์เฟกต์!! คุณฟันเข้าจุดตายอย่างจัง ทำดาเมจ ${dmg} หน่วย!`);
                } else if (diceRoll === 1) {
                    monsterDmgTaken = 0;
                    // แฟร์ขึ้น: เต๋า 1 ตอบถูกแต่ซวย โดนมอนสเตอร์สวนเบาๆ (20% ของดาเมจมอนสเตอร์)
                    const counterDmg = Math.max(1, Math.floor(mDamage * 0.2) - bonusDef);
                    playerDmgTaken = counterDmg;
                    logs.push(`🎲 [เต๋า 1]  ล้มเหลวคริติคอล! คุณตอบถูกแต่อาวุธหลุดมือ โจมตีพลาดแถมโดนสวนกลับ เสีย HP ${playerDmgTaken}!`);
                } else {
                    // สูตรดาเมจเดิมจาก V2
                    const dmg = Math.floor(10 * (2 *(0.1 * diceRoll)) + (bonusDmg * (0.1 * diceRoll))); 
                    monsterDmgTaken = dmg;
                    logs.push(`⚔️ คุณโจมตีเป้าหมาย ทำดาเมจ ${dmg} หน่วย`);
                }

            } else if (action === 'defend') {
                // บัพ Defend เล็กน้อย ให้เกราะมีผลกับการฟื้นฟู/ป้องกัน
                const heal = Math.floor(diceRoll / 2) + 5 + Math.floor(bonusDef * 0.2);
                player.hp = Math.min(Number(player.max_hp), Number(player.hp) + heal);
                logs.push(` คุณป้องกันและตั้งหลักสำเร็จ! ฟื้นฟูเลือด ${heal} หน่วย`);

            } else if (action === 'flee') {
                if (diceRoll >= 10) { 
                    req.session.combatMonster = null; 
                    return res.redirect('/map'); 
                } else {
                    logs.push(`🏃 คุณพยายามหนี... แต่โดนดักหน้าไว้! (ต้องการเต๋า 10+)`);
                    const rawDmg = Math.floor(mDamage * 0.8); // หนีพลาดโดนเบากว่าปกตินิดนึง
                    playerDmgTaken = Math.max(0, rawDmg - bonusDef);
                    logs.push(`💥 ${monster.name} โจมตีคุณขณะหันหลัง เสีย HP ${playerDmgTaken}`);
                }
            }

        } else {
            // ❌ ตอบผิด 
            logs.push(`<span class="text-red-500">[ล้มเหลว] คุณตอบผิด! สมาธิแตกกระเจิง!</span>`);
            
            player.sanity = Math.max(0, pSanity - 5);
            logs.push(`👁️ สติของคุณลดลง! (Sanity เหลือ ${player.sanity}/${pMaxSanity})`);

            let sanityMultiplier = 1.0;
            if (player.sanity <= (pMaxSanity * 0.3)) {
                sanityMultiplier = 1.2; // รับดาเมจแรงขึ้น 20%
                logs.push(`<span class="text-purple-400">🌀 ภาพหลอนทำให้คุณเคลื่อนไหวช้าลง! (รับดาเมจแรงขึ้น 20%)</span>`);
            }
            
            const rawDmg = Math.floor(mDamage * sanityMultiplier);
            
            // 🛡️ ระบบเอาตัวรอดจากเต๋า (ช่วยให้แฟร์ขึ้น)
            if (diceRoll >= 18) {
                playerDmgTaken = 0;
                logs.push(`🎲 [เต๋า ${diceRoll}] 💨 โชคดีสุดๆ! สัญชาตญาณเอาตัวรอดทำงาน คุณกลิ้งหลบการโจมตีได้ฉิวเฉียด!`);
            } else if (diceRoll >= 10) {
                const reducedDmg = Math.floor(rawDmg * 0.5); // ลดดาเมจครึ่งนึง
                playerDmgTaken = Math.max(1, reducedDmg - bonusDef);
                logs.push(`🎲 [เต๋า ${diceRoll}] 🛡️ คุณยกอาวุธขึ้นกันได้ทัน! โดนถากๆ เสีย HP ${playerDmgTaken} หน่วย`);
            } else if (diceRoll === 1) {
                const critDmg = Math.floor(rawDmg * 1.5); // โดนแรงขึ้น 1.5 เท่า
                playerDmgTaken = Math.max(1, critDmg - bonusDef);
                logs.push(`🎲 [เต๋า 1] 💀 ซวยซ้ำซ้อน! คุณสะดุดล้มตอนโดนโจมตี รับคริติคอลดาเมจ เสีย HP ${playerDmgTaken} หน่วย!`);
            } else {
                playerDmgTaken = Math.max(1, rawDmg - bonusDef); 
                logs.push(`💥 ${monster.name} โจมตีใส่คุณเต็มๆ! เสีย HP ${playerDmgTaken} หน่วย`);
            }
        }

        // 🩸 6. หักเลือด (ป้องกันค่า NaN ด้วย V1)
        if (monsterDmgTaken > 0) monster.hp = Math.max(0, Number(monster.hp) - monsterDmgTaken);
        if (playerDmgTaken > 0) player.hp = Math.max(0, Number(player.hp) - playerDmgTaken);

        // 💀 7. ตรวจสอบความตาย (Game Over)
        if (player.hp <= 0) {
            await db.query('UPDATE Players SET hp = 0, sanity = ? WHERE player_id = ?', [player.sanity, playerId]);
            req.session.combatMonster = null;
            return res.redirect('/game-over'); 
        }

        // 🏆 8. ตรวจสอบชัยชนะ
        if (monster.hp <= 0) {
            await db.query('UPDATE Players SET hp = ?, sanity = ?, gold = gold + 20 WHERE player_id = ?', [player.hp, player.sanity, playerId]);
            req.session.combatMonster = null; 
            return res.redirect('/map'); 
        }

        req.session.combatMonster = monster;
        req.session.battleLogs = logs; 
        await db.query('UPDATE Players SET hp = ?, sanity = ? WHERE player_id = ?', [player.hp, player.sanity, playerId]);

        res.redirect('/combat');

    } catch (error) {
        console.error('❌ Execute Combat Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการประมวลผลต่อสู้');
    }
};

// 🎲 ระบบทอยลูกเต๋า (D20)
exports.rollDice = (req, res) => {
    try {
        // 1. สุ่มเลข 1 - 20
        const rollResult = Math.floor(Math.random() * 20) + 1;
        
        // 2. กำหนดเงื่อนไขเบื้องต้น (เช่น ทอยได้เกิน 10 ถือว่าผ่าน)
        // อนาคตเราสามารถดึงข้อมูล Event จาก DB มาเช็ค required_roll ได้ที่นี่
        const isSuccess = rollResult >= 10; 
        
        let message = '';
        if (rollResult === 20) message = 'Critical Success! คุณทำผลงานได้อย่างยอดเยี่ยม!';
        else if (rollResult === 1) message = 'Critical Fail! หายนะมาเยือนคุณแล้ว!';
        else if (isSuccess) message = 'สำเร็จ! คุณเดินทางผ่านไปได้อย่างปลอดภัย';
        else message = 'ล้มเหลว! คุณสะดุดกับดักและศัตรู!';

        // 3. ส่งข้อมูลกลับไปให้หน้าเว็บในรูปแบบ JSON
        res.json({
            success: true,
            roll: rollResult,
            isSuccess: isSuccess,
            message: message
        });
    } catch (error) {
        console.error('❌ Roll Dice Error:', error);
        res.status(500).json({ success: false, error: 'ระบบทอยลูกเต๋ามีปัญหา' });
    }
};

// ❓ ระบบสุ่มคำถามสำหรับฉากต่อสู้
exports.getRandomQuestion = async (req, res) => {
    try {
        // ใช้ ORDER BY RAND() เพื่อสุ่มคำถามขึ้นมา 1 ข้อ
        const [questions] = await db.query('SELECT * FROM Questions ORDER BY RAND() LIMIT 1');
        
        if (questions.length === 0) {
            return res.json({ error: 'ยังไม่มีคำถามในระบบ กรุณาเพิ่มข้อมูลใน Database' });
        }
        
        res.json(questions[0]);
    } catch (err) {
        console.error('❌ Get Question Error:', err);
        res.status(500).json({ error: 'ดึงข้อมูลคำถามไม่สำเร็จ' });
    }
};

// 🗺️ โหลดหน้าแผนที่
exports.loadMap = async (req, res) => {
    try {
        const playerId = req.session.playerId; 
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        
        let player = players[0];

        const [inventory] = await db.query(`
            SELECT i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ?
        `, [playerId]);

        // 2. คำนวณหา Location ปัจจุบัน (สมมติว่าทุกๆ 10 Stage จะเปลี่ยน 1 Location)
        // ถ้า current_stage = 5 จะได้ location_id = 1 | ถ้า current_stage = 12 จะได้ location_id = 2
        let currentLocationId = Math.ceil(player.current_stage / 10);
        if (currentLocationId === 0) currentLocationId = 1;

        // 3. ดึงข้อมูลสถานที่จาก Database
        const [locations] = await db.query('SELECT * FROM Locations WHERE location_id = ?', [currentLocationId]);
        
        // ถ้าด่านไปไกลจนข้อมูล Location ในฐานข้อมูลหมด ให้ใช้ด่านสุดท้ายแทน หรือตั้งค่าเริ่มต้น
        let location = locations.length > 0 ? locations[0] : { name: 'ดินแดนลึกลับ', description: 'พื้นที่ที่ยังไม่ถูกค้นพบ...' };

        // ส่งตัวแปร location พ่วงเข้าไปด้วย
        res.render('map', { 
            player: player, 
            inventory: inventory,
            location: location 
        });

    } catch (error) {
        console.error('❌ Load Map Error:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนที่');
    }
};

// 🎲 ประมวลผลการเดินแผนที่ (Map Exploration) + ระบบบอสประจำด่าน
// 🎲 ประมวลผลการเดินแผนที่ (Map Exploration) + ระบบบอส + เหตุการณ์สุ่ม NPC
exports.exploreMap = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        const diceRoll = parseInt(req.body.roll);

        // 1. ดึงข้อมูลผู้เล่นปัจจุบัน
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.status(404).json({ error: 'ไม่พบผู้เล่น' });
        let player = players[0];

        // 🚶‍♂️ 2. เพิ่มจำนวนด่าน
        player.current_stage += 1;
        await db.query('UPDATE Players SET current_stage = ? WHERE player_id = ?', [player.current_stage, playerId]);

        // 🗺️ 3. คำนวณหา Location ปัจจุบัน (ด่าน 1-10 อยู่ Location 1)
        let currentLocationId = Math.ceil(player.current_stage / 10);
        if (currentLocationId === 0) currentLocationId = 1;

        // 🚨 5. เช็คเงื่อนไขบอส (เมื่อถึงด่านที่หาร 10 ลงตัว)
        if (player.current_stage % 10 === 0) {
            
            // ค้นหามอนสเตอร์จาก Database โดยดึงตัวที่ MAX_HP สูงสุดใน Location นั้นมา 1 ตัว
            const [bosses] = await db.query(
                "SELECT * FROM Monsters WHERE location_id = ? ORDER BY max_hp DESC LIMIT 1", 
                [currentLocationId]
            );

            let boss;

            if (bosses.length > 0) {
                // ถ้าเจอมอนสเตอร์ใน DB ให้จับมาแต่งตั้งเป็นบอส
                boss = bosses[0];
                
                // 💥 บัฟสเตตัสให้สมกับเป็นบอส (คุณปรับตัวคูณได้ตามใจชอบ)
                boss.name = '🔥 ' + boss.name + ' (Boss)';
                boss.max_hp = boss.max_hp * 2; // เลือด x2
                boss.hp = boss.max_hp; // เติมเลือดให้เต็ม
                boss.damage = Math.floor(boss.damage * 1.5); // ตีแรงขึ้น 1.5 เท่า
                boss.is_boss = true; 
            } else {
                // (กันเหนียว) ถ้าด่านนั้นลืมใส่มอนสเตอร์ใน Database ให้ใช้บอสสำรอง
                boss = {
                    monster_id: 999,
                    name: '🔥 มังกรโบราณไร้ชื่อ (Boss)',
                    max_hp: 300,
                    hp: 300,
                    damage: 50,
                    is_boss: true,
                    image_url: 'default_boss.png'
                };
            }

            // เซฟลง Session แล้วส่งผู้เล่นไปหน้าต่อสู้
            req.session.combatMonster = boss;
            return res.json({ type: 'boss', message: `🚨 ระวัง! ${boss.name} ปรากฏตัว!`, redirect: '/combat' });
        }

        // 🎲 5. ประมวลผลลูกเต๋าเพื่อหาว่าเจอ Event ประเภทไหน
        let targetEventType = '';
        
        if (diceRoll >= 1 && diceRoll <= 3) targetEventType = 'TRAP';
        else if (diceRoll >= 4 && diceRoll <= 10) return res.json({ type: 'combat', redirect: '/combat' }); // วิ่งไปสู้มอนสเตอร์
        else if (diceRoll >= 11 && diceRoll <= 13) targetEventType = 'NPC';
        else if (diceRoll >= 14 && diceRoll <= 17) targetEventType = 'TREASURE';
        else return res.json({ type: 'shop', message: 'คุณพบร้านค้าลับ!', redirect: '/shop' });

        // 📖 6. ค้นหา Event จากฐานข้อมูล (สุ่ม 1 อันจากประเภทและสถานที่นั้นๆ)
        if (targetEventType) {
            const [events] = await db.query(
                "SELECT * FROM Events WHERE event_type = ? AND location_id = ? ORDER BY RAND() LIMIT 1", 
                [targetEventType, currentLocationId]
            );

            // ถ้ามีข้อมูลในตาราง Events
            if (events.length > 0) {
                const ev = events[0];
                
                // คำนวณผลลัพธ์จาก Database ล้วนๆ
                player.hp -= ev.damage_hp || 0;
                player.sanity -= ev.damage_sanity || 0;
                player.gold += ev.reward_gold || 0;

                // ตรวจสอบไม่ให้หลอดเลือดหรือสติทะลุขอบเขต
                player.hp = Math.max(0, Math.min(player.max_hp, player.hp));
                player.sanity = Math.max(0, Math.min(player.max_sanity, player.sanity));
                player.gold = Math.max(0, player.gold);

                await db.query('UPDATE Players SET hp = ?, sanity = ?, gold = ? WHERE player_id = ?', 
                    [player.hp, player.sanity, player.gold, playerId]);

                // เช็คตาย
                if (player.hp <= 0) {
                     return res.json({ type: 'gameover', message: `คุณเสียชีวิตจาก: ${ev.event_name}`, redirect: '/game-over' });
                }

                // ส่งข้อมูลกลับไปให้ Frontend แสดงผล
                // สังเกตว่า type จะกลายเป็น 'trap', 'treasure', 'npc' ตามตัวแปร targetEventType
                return res.json({ 
                    type: targetEventType.toLowerCase(), 
                    message: ev.event_name, // โชว์ชื่อ Event เช่น "กับดักหนามอาบยาพิษ"
                    details: `(HP: ${-ev.damage_hp}, สติ: ${-ev.damage_sanity}, เงิน: ${ev.reward_gold})`
                });
            } else {
                // กันเหนียว เผื่อคุณยังไม่ได้แอดข้อมูล Event เข้า Database ในด่านนั้น
                return res.json({ 
                    type: 'event', 
                    message: `คุณเดินผ่านพื้นที่รกร้าง... (ระบบยังไม่มีข้อมูล ${targetEventType} ในด่านนี้)` 
                });
            }
        }

    } catch (error) {
        console.error('❌ Explore Map Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผลแผนที่' });
    }
};

// 🧪 ระบบใช้งานไอเทม (กดยา) และ สวมใส่อุปกรณ์ (เพิ่มระบบ Toggle ถอดออก)
exports.manageInventory = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        const { item_id, action } = req.body; 

        // 🚨 1. เช็คค่าที่รับมาจากหน้าเว็บ
        console.log("==== 🕵️ DEBUG INVENTORY ====");
        console.log("Player ID (Session):", playerId);
        console.log("Item ID (Frontend):", item_id);
        console.log("Action:", action);

        if (!playerId) {
            return res.json({ success: false, message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
        }

        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        const [items] = await db.query('SELECT * FROM Items WHERE item_id = ?', [item_id]);
        const [inventory] = await db.query(`
            SELECT inv.inventory_id, i.item_id, i.name, i.type, i.effect_value, i.description, inv.quantity 
            FROM Inventory inv 
            JOIN Items i ON inv.item_id = i.item_id 
            WHERE inv.player_id = ? AND inv.item_id = ?
        `, [playerId, item_id]);

        // 🚨 เพิ่มบรรทัดนี้ลงไป เพื่อดูว่าดึงข้อมูลอะไรมาได้บ้าง!
        console.log("📦 ข้อมูลกระเป๋าที่จะส่งให้หน้าเว็บ:", inventory);

        // 🚨 2. เช็คว่าหาข้อมูลจากตารางไหนไม่เจอ!
        console.log("Found Player?", players.length > 0);
        console.log("Found Item in 'Items' table?", items.length > 0);
        console.log("Found Item in 'Inventory' table?", inventory.length > 0);
        console.log("===============================");

        if (players.length === 0 || items.length === 0 || inventory.length === 0) {
            return res.json({ success: false, message: 'ไม่พบไอเทมนี้ในกระเป๋าของคุณ' });
        }

        let player = players[0];
        let item = items[0];
        let invItem = inventory[0];

        // 🟢 กรณี: กดใช้งานไอเทม (ยาฟื้นเลือด)
        if (action === 'use' && (item.type === 'heal' || item.type === 'potion')) {
            if (player.hp >= player.max_hp) {
                return res.json({ success: false, message: 'HP ของคุณเต็มอยู่แล้ว! ไม่จำเป็นต้องใช้ยา' });
            }

            const newHp = Math.min(player.max_hp, player.hp + item.effect_value);
            await db.query('UPDATE Players SET hp = ? WHERE player_id = ?', [newHp, playerId]);

            if (invItem.quantity > 1) {
                await db.query('UPDATE Inventory SET quantity = quantity - 1 WHERE inventory_id = ?', [invItem.inventory_id]);
            } else {
                await db.query('DELETE FROM Inventory WHERE inventory_id = ?', [invItem.inventory_id]);
            }

            return res.json({ success: true, message: `🧪 คุณใช้ ${item.name} ฟื้นฟู HP ${item.effect_value} หน่วย` });
        }

        // ⚔️ กรณี: กดสวมใส่/ถอดอุปกรณ์ (Weapon/Armor)
        if (action === 'equip') {
            let updateField = '';
            let isUnequip = false;

            if (item.type === 'damage') {
                updateField = 'equipped_weapon';
                if (player.equipped_weapon == item_id) isUnequip = true;
            } else if (item.type === 'armor') {
                updateField = 'equipped_armor';
                if (player.equipped_armor == item_id) isUnequip = true;
            } else {
                return res.json({ success: false, message: 'ไอเทมชิ้นนี้ไม่สามารถสวมใส่ได้' });
            }

            if (isUnequip) {
                await db.query(`UPDATE Players SET ${updateField} = NULL WHERE player_id = ?`, [playerId]);
                return res.json({ success: true, message: `🛡️ ถอด ${item.name} ออกแล้ว` });
            } else {
                await db.query(`UPDATE Players SET ${updateField} = ? WHERE player_id = ?`, [item_id, playerId]);
                return res.json({ success: true, message: `⚔️ สวมใส่ ${item.name} เรียบร้อยแล้ว!` });
            }
        }

        res.json({ success: false, message: 'คำสั่งไม่ถูกต้อง' });

    } catch (error) {
        console.error('❌ Manage Inventory Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' });
    }
};

exports.startGame = async (req, res) => {
    try {
        const playerId = req.session.playerId;
        
        // 1. ตรวจสอบว่ามีผู้เล่นหรือไม่
        const [players] = await db.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (players.length === 0) return res.redirect('/login');
        
        const player = players[0];

        // 💀 2. กรณีที่ 1: ผู้เล่นเสียชีวิตแล้ว (ต้องล้างของก่อนเกิดใหม่)
        if (player.hp <= 0) {
            // 🔥 เผาของในกระเป๋าทิ้งทั้งหมด
            await db.query('DELETE FROM Inventory WHERE player_id = ?', [playerId]);

            // 🔄 ล้างสถานะให้กลับไปเป็นตัวเปล่าเล่าเปลือย (รวมถึงถอดอุปกรณ์ที่สวมใส่อยู่)
            await db.query(`
                UPDATE Players 
                SET equipped_weapon = NULL, 
                    equipped_armor = NULL, 
                    gold = 0, 
                    current_stage = 1,
                    exp = 0,
                    level = 1,
                    class_name = NULL 
                WHERE player_id = ?
            `, [playerId]);

            return res.redirect('/roll-class'); // ส่งไปทอยอาชีพใหม่แบบตัวเปล่าจริงๆ
        }

        // 👶 3. กรณีที่ 2: ผู้เล่นใหม่เอี่ยม ยังไม่เคยทอยอาชีพ
        if (!player.class_name) {
            return res.redirect('/roll-class');
        }

        // 🚶‍♂️ 4. กรณีที่ 3: มีชีวิตอยู่และมีอาชีพแล้ว ให้เล่นต่อได้เลย
        res.redirect('/map');

    } catch (error) {
        console.error('❌ Start Game Error:', error);
        res.status(500).send('ระบบขัดข้อง');
    }
};

// 🎲 โหลดหน้าทอยลูกเต๋า
exports.rollClassPage = (req, res) => {
    // โหลดไฟล์ views/roll-class.ejs (ไฟล์ HTML ทอยเต๋าที่คุณสร้างไว้)
    res.render('roll-class'); 
};

// 💀 โหลดหน้า Game Over
exports.gameOver = (req, res) => {
    res.render('game-over'); 
};
