FROM node:18-alpine
WORKDIR /usr/src/app
RUN npm init -y && npm install express mysql2 ejs express-session socket.io axios
COPY . .
EXPOSE 80
CMD ["node", "server.js"]