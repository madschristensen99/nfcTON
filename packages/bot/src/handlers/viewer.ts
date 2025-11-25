import { Context } from 'grammy';

export async function viewerHandler(ctx: Context) {
  await ctx.reply('👀 To view a hoodie profile, tap the NFC sticker or use /start with a code.');
}