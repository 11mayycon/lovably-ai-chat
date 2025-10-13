const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
    io.emit('qr', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
    io.emit('ready');
});

client.on('message', message => {
    io.emit('message', message);
});

app.get('/contacts', async (req, res) => {
    const contacts = await client.getContacts();
    res.json(contacts);
});

app.get('/chats', async (req, res) => {
    const chats = await client.getChats();
    res.json(chats);
});

app.post('/send', express.json(), async (req, res) => {
    const { chatId, message } = req.body;
    const result = await client.sendMessage(chatId, message);
    res.json(result);
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

client.initialize();

server.listen(3001, () => {
  console.log('listening on *:3001');
});