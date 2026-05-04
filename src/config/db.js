const mysql = require('mysql2/promise'); // 👈 ใช้แบบ Promise เพื่อให้เขียน async/await ได้ง่าย

// ตั้งค่า Database
const dbConfig = {
    host: 'db',
    user: 'root',
    password: 'root_password',
    database: 'project_db',
    waitForConnections: true,
    connectionLimit: 10, // 👈 สร้างท่อเชื่อมต่อเตรียมไว้ 10 เส้นพร้อมกัน
    queueLimit: 0
};

// สร้าง Connection Pool
const pool = mysql.createPool(dbConfig);

// ฟังก์ชันสำหรับทดสอบการเชื่อมต่อตอนเปิดเซิร์ฟเวอร์
async function testConnection() {
    try {
        // ลองดึงการเชื่อมต่อออกมา 1 เส้น
        const connection = await pool.getConnection();
        console.log('✅ เชื่อมต่อกับ MySQL (Connection Pool) สำเร็จแล้ว!');
        connection.release(); // 👈 คืนท่อกลับเข้าไปใน Pool เมื่อเทสเสร็จ
    } catch (err) {
        console.error(`❌ ยังไม่สามารถเชื่อมต่อ Database ได้ (${err.code}) - กำลังรอ MySQL ตื่น...`);
        // ถ้าไม่สำเร็จ ให้รอ 3 วินาทีแล้วลองใหม่
        setTimeout(testConnection, 3000);
    }
}

// เรียกใช้ฟังก์ชันทดสอบ
testConnection();

// ส่งออก pool เพื่อให้ไฟล์อื่นๆ (เช่น หน้า Login/Register) เอาไปใช้ดึงข้อมูลได้
module.exports = pool;