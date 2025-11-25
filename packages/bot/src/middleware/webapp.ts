import { Bot } from 'grammy';

export function setupWebApp(bot: Bot) {
  bot.api.setMyCommands([
    { command: 'start', description: 'Sign up for hoodie' },
    { command: 'admin', description: 'Admin dashboard' }
  ]);

  bot.api.setMyDescription('Linktree NFC hoodies - tap your hoodie to share your profile');
}