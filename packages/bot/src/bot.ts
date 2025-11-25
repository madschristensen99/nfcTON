import { Bot, webhookCallback } from 'grammy';
import express from 'express';
import * as dotenv from 'dotenv';
import { startHandler } from './handlers/start';
import { adminHandler } from './handlers/admin';
import { viewerHandler } from './handlers/viewer';
import { setupWebApp } from './middleware/webapp';

dotenv.config();

const token = process.env.TG_BOT_TOKEN;
const domain = process.env.BOT_DOMAIN;

if (!token) {
  throw new Error('TG_BOT_TOKEN is required');
}

if (!domain) {
  throw new Error('BOT_DOMAIN is required');
}

const bot = new Bot(token);

// Set up mini-app commands
setupWebApp(bot);

// Bot handlers
bot.command('start', startHandler);
bot.command('admin', adminHandler);
bot.command('viewer', viewerHandler);

// Handle webhook URL parameter
bot.use(async (ctx, next) => {
  if (ctx?.msg?.text?.startsWith('/start') && ctx?.msg?.text?.includes(' ')) {
    const code = ctx.msg.text.split(' ')[1];
    if (code && code.length === 6) {
      // Mini-app will handle the viewer functionality
      await ctx.reply('Opening your hoodie profile...', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Open Profile',
              web_app: { url: `${domain}/packages/bot/static/viewer.html?code=${code}` }
            }
          ]]
        }
      });
      return;
    }
  }
  await next();
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Create express router for bot webhook
const botApp = express();
botApp.use(express.json());
botApp.use(webhookCallback(bot, 'express'));

// Also expose webhook endpoint for testing
botApp.post('/', webhookCallback(bot, 'express'));

export default botApp;