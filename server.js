const mysql = require('mysql2');
const express = require('express');
const session = require('express-session');
const path    = require('path');
const port = 80;

const app = express();

// ─── Middleware ───
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'dungeon-scholar-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// ─── Mock Data ───
const MOCK_PLAYER = {
  player_id: 1,
  username: 'TestHero',
  avatar: '🧙',
  level: 3,
  hp: 70, max_hp: 100,
  mp: 40, max_mp: 60,
  gold: 250,
  exp: 320, exp_next: 500,
  current_location: 'Dark Forest'
};

const MOCK_MONSTER = {
  monster_id: 1,
  name: 'Shadow Goblin',
  sprite: '👺',
  hp: 60, max_hp: 60,
  damage: 15,
  difficulty: 'medium',
  is_boss: false
};

const MOCK_BOSS = {
  monster_id: 99,
  name: 'Dragon Overlord',
  sprite: '🐉',
  hp: 200, max_hp: 200,
  damage: 35,
  difficulty: 'boss',
  is_boss: true
};

const MOCK_QUESTIONS = [
  {
    question_id: 1, category: 'วิทยาศาสตร์', difficulty: 'easy',
    question_text: 'ธาตุใดมีสัญลักษณ์ทางเคมีว่า "O"?',
    option_a: 'ออสเมียม', option_b: 'ออกซิเจน', option_c: 'ทองคำ', option_d: 'เงิน',
    correct_answer: 'B'
  },
  {
    question_id: 2, category: 'คณิตศาสตร์', difficulty: 'medium',
    question_text: 'ถ้า x² + 5x + 6 = 0 แล้วค่า x คือเท่าใด?',
    option_a: 'x = 2, x = 3', option_b: 'x = -2, x = -3', option_c: 'x = 1, x = 6', option_d: 'x = -1, x = -6',
    correct_answer: 'B'
  },
  {
    question_id: 3, category: 'ประวัติศาสตร์', difficulty: 'hard',
    question_text: 'กรุงศรีอยุธยาสถาปนาขึ้นเมื่อปี พ.ศ. ใด?',
    option_a: 'พ.ศ. 1893', option_b: 'พ.ศ. 1900', option_c: 'พ.ศ. 1850', option_d: 'พ.ศ. 1800',
    correct_answer: 'A'
  }
];

const MOCK_SAVE_SLOTS = [
  { ...MOCK_PLAYER, slot: 1, saved_at: new Date(Date.now() - 3600000).toISOString() },
  null,
  null
];

const MOCK_MAP = Array.from({ length: 5 }, (_, r) =>
  Array.from({ length: 5 }, (_, c) => {
    const icons = ['🌲','🏔️','🏰','⚔️','🧿','💀','🌲','🏔️','🌲','🏔️'];
    return { icon: icons[(r*5+c) % icons.length], name: 'Unknown', visited: r < 2 && c < 2 };
  })
);
MOCK_MAP[0][0].visited = true;
MOCK_MAP[0][0].icon    = '🏰';
MOCK_MAP[0][0].name    = 'Starting Village';

const MOCK_LEADERBOARD = [
  { username: 'DragonSlayer', avatar: '🧝', level: 10, total_score: 9800, wins: 12 },
  { username: 'WizardKing',   avatar: '🧙', level: 8,  total_score: 7200, wins: 9  },
  { username: 'ShadowRogue',  avatar: '🧛', level: 6,  total_score: 5500, wins: 6  },
  { username: 'IronBard',     avatar: '🧚', level: 4,  total_score: 3100, wins: 3  },
  { username: 'TestHero',     avatar: '🧙', level: 3,  total_score: 1600, wins: 2  }
];

// ─── Helper: get player from session ───
function getPlayer(req) {
  return req.session.player || null;
}

// ─── Routes: Auth ───
app.get('/auth/login',    (req, res) => res.render('login',    { error: null }));
app.get('/auth/register', (req, res) => res.render('register', { error: null }));
app.get('/auth/resetpassword', (req, res) =>
  res.render('resetpassword', { error: null, success: false, token: req.query.token || null }));

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render('login', { error: 'กรุณากรอกข้อมูลให้ครบ' });
  // Mock: ยอมรับทุก username/password
  req.session.player = { ...MOCK_PLAYER, username };
  req.session.flash  = `ยินดีต้อนรับ, ${username}!`;
  res.redirect('/');
});

app.post('/auth/register', (req, res) => {
  const { username, email, password, confirmPassword, avatar } = req.body;
  if (!username || !email || !password) return res.render('register', { error: 'กรุณากรอกข้อมูลให้ครบ' });
  if (password !== confirmPassword)      return res.render('register', { error: 'รหัสผ่านไม่ตรงกัน' });
  req.session.player = { ...MOCK_PLAYER, username, avatar: avatar || '🧙' };
  req.session.flash  = `สร้างตัวละคร ${username} สำเร็จ!`;
  res.redirect('/');
});

app.post('/auth/resetpassword', (req, res) => {
  res.render('resetpassword', { success: true, error: null, token: null });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ─── Routes: Home ───
app.get('/', (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;
  res.render('home', {
    player:      getPlayer(req),
    leaderboard: MOCK_LEADERBOARD,
    flash,
    flashType:   'success'
  });
});

app.get('/leaderboard', (req, res) => {
  res.render('home', {
    player:      getPlayer(req),
    leaderboard: MOCK_LEADERBOARD
  });
});

// ─── Routes: Game ───
app.get('/game/map', (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.redirect('/auth/login');
  res.render('map', {
    player,
    mapGrid:         MOCK_MAP,
    playerPosition:  req.session.mapPos || { row: 0, col: 0 },
    turnsLeft:       req.session.turnsLeft ?? 10,
    currentTurn:     req.session.currentTurn ?? 1,
    bossUnlocked:    false,
    eventLog:        req.session.eventLog || [],
    quickItems:      [
      { item_id: 1, name: 'Health Potion', icon: '🧪', quantity: 3 },
      { item_id: 2, name: 'MP Orb',        icon: '💎', quantity: 1 }
    ]
  });
});

app.post('/game/roll-dice', (req, res) => {
  const roll     = Math.ceil(Math.random() * 6);
  const locations = ['🌲 ป่าทึบ','🏔️ ภูเขา','🏰 เมือง','⚔️ ดันเจี้ยน','🧿 สถานที่ลับ','🌲 ทุ่งหญ้า'];
  const location = locations[roll - 1];

  // update session
  req.session.currentTurn  = (req.session.currentTurn || 1) + 1;
  req.session.turnsLeft    = Math.max(0, (req.session.turnsLeft ?? 10) - 1);

  // Random encounter (40%)
  const encounter = Math.random() < 0.4;

  if (!req.session.eventLog) req.session.eventLog = [];
  req.session.eventLog.unshift({
    type: encounter ? 'danger' : 'info',
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    message: encounter
      ? `ทอยได้ ${roll} — ไปถึง ${location} แล้วพบศัตรู!`
      : `ทอยได้ ${roll} — เดินทางไปยัง ${location}`
  });

  res.json({
    roll, location,
    message:  encounter ? `พบศัตรูที่ ${location}!` : `เดินทางไปยัง ${location}`,
    type:     encounter ? 'danger' : 'info',
    redirect: encounter ? '/game/combat' : null
  });
});

app.get('/game/combat', (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.redirect('/auth/login');

  const isBoss   = req.query.boss === '1';
  const monster  = isBoss ? MOCK_BOSS : MOCK_MONSTER;
  const qIdx     = Math.floor(Math.random() * MOCK_QUESTIONS.length);

  req.session.currentQuestion = MOCK_QUESTIONS[qIdx];
  req.session.monster         = { ...monster };

  res.render('combat', {
    player,
    monster:         req.session.monster,
    currentQuestion: req.session.currentQuestion,
    turnCount:       1,
    skills:          { canEliminate: true, canShield: true },
    quickItems:      [{ item_id: 1, name: 'Health Potion', icon: '🧪', quantity: 3 }],
    combatLog:       []
  });
});

app.post('/game/answer', (req, res) => {
  const { answer } = req.body;
  const player   = req.session.player;
  const question = req.session.currentQuestion;
  const monster  = req.session.monster;

  if (!player || !question || !monster)
    return res.json({ correct: false, message: 'session expired', redirect: '/game/map' });

  const correct = answer === question.correct_answer;

  if (correct) {
    const dmg = Math.floor(Math.random() * 20) + 10;
    monster.hp = Math.max(0, monster.hp - dmg);
    req.session.monster = monster;

    if (monster.hp <= 0) {
      const gold = Math.floor(Math.random() * 50) + 20;
      player.gold += gold;
      req.session.player = player;
      return res.json({
        correct, damage: dmg,
        monsterHp: 0, monsterMaxHp: monster.max_hp,
        message: `ชนะ! ได้รับ ${gold} Gold`,
        redirect: `/game/victory?gold=${gold}`
      });
    }
    return res.json({ correct, damage: dmg, monsterHp: monster.hp, monsterMaxHp: monster.max_hp });

  } else {
    const dmg = monster.damage || 15;
    player.hp = Math.max(0, player.hp - dmg);
    req.session.player = player;

    if (player.hp <= 0)
      return res.json({ correct, dmgReceived: dmg, playerHp: 0, playerMaxHp: player.max_hp,
                        correctAnswer: question.correct_answer, redirect: '/game/gameover' });

    return res.json({ correct, dmgReceived: dmg,
                      playerHp: player.hp, playerMaxHp: player.max_hp,
                      correctAnswer: question.correct_answer });
  }
});

app.post('/game/use-skill', (req, res) => {
  const { skill } = req.body;
  const player    = req.session.player;
  const question  = req.session.currentQuestion;
  if (!player || !question) return res.json({ success: false, message: 'session expired' });

  if (skill === 'eliminate') {
    if (player.mp < 10) return res.json({ success: false, message: 'MP ไม่พอ' });
    player.mp -= 10;
  } else if (skill === 'shield') {
    if (player.mp < 15) return res.json({ success: false, message: 'MP ไม่พอ' });
    player.mp -= 15;
  }
  req.session.player = player;
  res.json({ success: true, correctAnswer: question.correct_answer,
             playerMp: player.mp, playerMaxMp: player.max_mp });
});

app.get('/game/victory', (req, res) => {
  const player = getPlayer(req);
  const gold   = req.query.gold || 0;
  res.render('home', {
    player,
    flash:     `🏆 ชนะแล้ว! ได้รับ ${gold} Gold`,
    flashType: 'success',
    leaderboard: MOCK_LEADERBOARD
  });
});

app.get('/game/gameover', (req, res) => {
  const player = getPlayer(req);
  if (player) { player.hp = player.max_hp; req.session.player = player; }
  res.render('home', {
    player,
    flash:     '💀 Game Over... ฟื้นฟู HP แล้ว ลองใหม่ได้เลย',
    flashType: 'danger',
    leaderboard: MOCK_LEADERBOARD
  });
});

app.get('/game/save', (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.redirect('/auth/login');
  res.render('load-save', {
    player,
    saveSlots: MOCK_SAVE_SLOTS,
    history: [
      { played_at: new Date().toISOString(), score: 1200, correct: 8, wrong: 2, result: 'victory' },
      { played_at: new Date(Date.now()-86400000).toISOString(), score: 400, correct: 3, wrong: 5, result: 'gameover' }
    ]
  });
});

app.post('/game/save',        (req, res) => { req.session.flash = '💾 บันทึกเกมสำเร็จ!'; req.session.flashType = 'success'; res.redirect('/game/save'); });
app.post('/game/load',        (req, res) => { req.session.flash = '▶ โหลดเกมสำเร็จ!'; res.redirect('/game/map'); });
app.post('/game/delete-save', (req, res) => { req.session.flash = '🗑 ลบข้อมูลสำเร็จ'; res.redirect('/game/save'); });

app.get('/game/inventory', (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.redirect('/auth/login');
  res.redirect('/game/save');
});

// ─── Start ───
// ใช้ตัวแปร port (พิมพ์เล็ก) ที่ประกาศไว้บรรทัดบนสุด และเพิ่ม '0.0.0.0' เพื่อให้ Docker รับการเชื่อมต่อ
app.listen(port, '0.0.0.0', () => {
  console.log(`\n🎮 Dungeon Scholar (Dev Server) running at:`);
  console.log(`   http://localhost:${port}\n`);
  console.log(`📄 Routes available:`);
  console.log(`   GET  /                → Home`);
  console.log(`   GET  /auth/login      → Login`);
  console.log(`   GET  /auth/register   → Register`);
  console.log(`   GET  /game/map        → Map (ต้อง login ก่อน)`);
  console.log(`   GET  /game/combat     → Combat`);
  console.log(`   GET  /game/combat?boss=1 → Boss Battle`);
  console.log(`   GET  /game/save       → Save/Load\n`);
});

// สร้างการเชื่อมต่อ
const connection = mysql.createConnection({
  host: 'db',             // 👈 สำคัญ: ใช้ชื่อ service จาก docker-compose.yml
  user: 'root',
  password: 'root_password', // ให้ตรงกับ MYSQL_ROOT_PASSWORD
  database: 'project_db'     // ให้ตรงกับ MYSQL_DATABASE
});

// ตรวจสอบการเชื่อมต่อ
connection.connect((err) => {
  if (err) {
    console.error('ไม่สามารถเชื่อมต่อกับ Database ได้: ' + err.stack);
    return;
  }
  console.log('เชื่อมต่อกับ MySQL สำเร็จแล้ว (Thread ID: ' + connection.threadId + ')');
});