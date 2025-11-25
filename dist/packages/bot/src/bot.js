"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const start_1 = require("./handlers/start");
const admin_1 = require("./handlers/admin");
const viewer_1 = require("./handlers/viewer");
const webapp_1 = require("./middleware/webapp");
dotenv.config();
const token = process.env.TG_BOT_TOKEN;
const domain = process.env.BOT_DOMAIN;
if (!token) {
    throw new Error('TG_BOT_TOKEN is required');
}
if (!domain) {
    throw new Error('BOT_DOMAIN is required');
}
const bot = new grammy_1.Bot(token);
// Set up mini-app commands
(0, webapp_1.setupWebApp)(bot);
// Bot handlers
bot.command('start', start_1.startHandler);
bot.command('admin', admin_1.adminHandler);
bot.command('viewer', viewer_1.viewerHandler);
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
// In production: webhook mode
if (process.env.NODE_ENV === 'production') {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(`/bot${token}`, (0, grammy_1.webhookCallback)(bot, 'express'));
    app.listen(process.env.PORT || 3000, () => {
        console.log('Bot webhook server started');
    });
}
else {
    bot.start();
}
//# sourceMappingURL=bot.js.map