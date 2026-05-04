FROM node:18-alpine

# กำหนดพื้นที่ทำงานใน Container
WORKDIR /usr/src/app

# 1. ก๊อปปี้ไฟล์โค้ดทั้งหมดจากเครื่องคุณเข้าไปก่อน
COPY . .

# 2. ลบไฟล์ package.json ที่อาจจะพังจากเครื่องคุณทิ้งไปก่อน
# จากนั้นสร้างใหม่ และติดตั้งไลบรารีทั้งหมดให้เรียบร้อย
RUN rm -f package.json package-lock.json && \
    npm init -y && \
    npm install express mysql2 ejs express-session socket.io axios bcryptjs ngrok

# เปิด Port 80
EXPOSE 80

# คำสั่งรันเซิร์ฟเวอร์
CMD ["node", "server.js"]