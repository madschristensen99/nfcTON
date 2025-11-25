"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHandler = startHandler;
async function startHandler(ctx) {
    // Check if this is from a start parameter
    const startParam = ctx?.msg?.text?.split(' ')[1];
    if (startParam && startParam.length === 6) {
        // Show viewer page for existing hoodie
        await ctx.reply('📱 Opening your hoodie profile...', {
            reply_markup: {
                inline_keyboard: [[
                        {
                            text: '🎯 View Profile',
                            web_app: { url: `${process.env.BOT_DOMAIN}/packages/bot/static/viewer.html?code=${startParam}` }
                        }
                    ]]
            }
        });
        return;
    }
    // New signup flow
    await ctx.reply('👋 Welcome to Hoodie NFC! \n\n' +
        'Get your personalized Linktree hoodie – no wallets, no codes, just tap!', {
        reply_markup: {
            inline_keyboard: [[
                    {
                        text: '🎽 Sign Up for Hoodie',
                        web_app: { url: `${process.env.BOT_DOMAIN}/packages/bot/static/consumer.html` }
                    }
                ]]
        }
    });
}
//# sourceMappingURL=start.js.map