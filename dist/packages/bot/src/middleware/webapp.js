"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebApp = setupWebApp;
function setupWebApp(bot) {
    bot.api.setMyCommands([
        { command: 'start', description: 'Sign up for hoodie' },
        { command: 'admin', description: 'Admin dashboard' }
    ]);
    bot.api.setMyDescription('Linktree NFC hoodies - tap your hoodie to share your profile');
}
//# sourceMappingURL=webapp.js.map