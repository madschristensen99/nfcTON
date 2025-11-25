import { Context } from 'grammy';

export async function adminHandler(ctx: Context) {
  const adminId = ctx.from?.id;
  
  // Simple admin check - you might want to enhance this
  const adminIds = [123456789]; // Add your admin Telegram IDs here
  
  if (!adminId || !adminIds.includes(adminId)) {
    await ctx.reply('❌ You are not authorized to access the admin panel.');
    return;
  }

  await ctx.reply('🔧 Admin Dashboard', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '👔 Open Dashboard',
          web_app: { url: `${process.env.BOT_DOMAIN}/packages/bot/static/admin.html` }
        }
      ]]
    }
  });
}