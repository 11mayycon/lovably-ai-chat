const { client } = require('./wweb-session.js');

async function getContacts() {
    return await client.getContacts();
}

async function getChats() {
    return await client.getChats();
}

async function getChatById(chatId) {
    return await client.getChatById(chatId);
}

async function sendMessage(chatId, message) {
    return await client.sendMessage(chatId, message);
}

module.exports = {
    getContacts,
    getChats,
    getChatById,
    sendMessage
};