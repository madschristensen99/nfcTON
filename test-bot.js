// Simple bot test
const { Bot } = require('grammy');
require('dotenv').config();

const token = process.env.TG_BOT_TOKEN || '8286532086:AAGC4at13_fO-zL4-_5Prrk_CmUNQGjt2w4';
const bot = new Bot(token);

console.log('🤖 Starting bot in debug mode...');

// Add debug logging
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// Simple commands with logging
bot.command('start', async (ctx) => {
  console.log('✅ /start command received from:', ctx.from.username);
  await ctx.reply('👋 Hello from local server! Your bot is now working!\n\nWeb apps:\n- 🎽 Signup: http://localhost:3000/consumer.html\n- 🛠️ Admin: http://localhost:3000/admin.html');
});

bot.command('admin', async (ctx) => {
  console.log('✅ /admin command received from:', ctx.from.username);
  await ctx.reply('🔗 Admin Dashboard: http://localhost:3000/admin.html');
});

bot.command('viewer', async (ctx) => {
  console.log('✅ /viewer command received from:', ctx.from.username);
  await ctx.reply('📱 Viewer: http://localhost:3000/viewer.html');
});

// Test simple message
bot.on('message', async (ctx) => {
  console.log('📨 Message from:', ctx.from.username, '| Text:', ctx.msg.text);
  if (!ctx.msg.text?.startsWith('/')) {
    await ctx.reply('💬 Bot is receiving your messages! Try /start or /admin');
  }
});

console.log('🚀 Starting bot... CTRL+C to stop');
console.log('📍 Bot username: @handshake_ton_bot');
console.log('💬 Go test it in Telegram now!');

bot.start({ drop_pending_updates: true });

// Keep alive
process.on('SIGINT', () => {
  console.log('🛑 Bot stopped');
  process.exit(0);
});