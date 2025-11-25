#!/usr/bin/env node
const { Bot } = require('grammy');
require('dotenv').config();

const token = '8286532086:AAGC4at13_fO-zL4-_5Prrk_CmUNQGjt2w4';

console.log('🤖 Starting Hoodie NFC Bot...');
console.log('📍 Bot: @handshake_ton_bot');
console.log('💬 Commands: /start, /admin, /viewer');

// Create simple bot
const bot = new Bot(token);

// Simple start command
bot.command('start', async (ctx) => {
  console.log('✅ /start from:', ctx.from?.username || ctx.from?.id);
  await ctx.reply('👋 Hello! Your Hoodie NFC bot is now WORKING!\n\n' +
    '🎽 Sign up: http://localhost:3000/consumer.html\n' +
    '🛠️ Admin: http://localhost:3000/admin.html\n' +
    '📱 View profiles: http://localhost:3000/viewer.html\n\n' +
    '🔗 Your current server is: localhost:3000'
  );
});

// Admin command
bot.command('admin', async (ctx) => {
  console.log('✅ /admin from:', ctx.from?.username || ctx.from?.id);
  await ctx.reply('🔗 Admin Dashboard: http://localhost:3000/admin.html', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Admin', web_app: { url: 'http://localhost:3000/admin.html' } }]]
    }
  });
});

// Viewer command
bot.command('viewer', async (ctx) => {
  console.log('✅ /viewer from:', ctx.from?.username || ctx.from?.id);
  await ctx.reply('📱 Viewer: http://localhost:3000/viewer.html', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Viewer', web_app: { url: 'http://localhost:3000/viewer.html' } }]]
    }
  });
});

// Debug logging
bot.on('message', (ctx) => {
  console.log('📨 Message from:', ctx.from?.username, '| Msg:', ctx.msg.text);
});

bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

bot.start({ drop_pending_updates: true });
console.log('✅ Bot is now ACTIVE and receiving commands!');
console.log('💬 Go to @handshake_ton_bot and test /start or /admin');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Bot shutting down...');
  process.exit(0);
});