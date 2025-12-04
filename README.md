# Hoodie NFC Telegram
One-tap Linktree hoodies without code, wallets, or batteries.

## Environment Setup
Copy .env.example to .env and add your Telegram bot token and database URL.

## Quick Start
```bash
npm install
npm run dev
```

## NFC Workflow

### For Users:
1. Start the Telegram bot with `/start`
2. Fill out the signup form (name, email, size)
3. Receive a unique code
4. Wait for admin to burn your profile to an NFC chip

### For Admins:
1. Access admin dashboard via `/admin` command or visit `/admin.html`
2. View all pending orders
3. For each order:
   - Click "Copy NFC Link" to copy the Telegram deep link
   - Open NFC Tools app on your phone
   - Write the copied link to an NFC chip
   - Click "Mark as Burned" to complete the order
4. When someone taps the NFC chip, it opens their Telegram profile in the mini app

### How It Works:
- Each user gets a unique 6-character code
- The NFC link format: `https://t.me/YOUR_BOT?start=CODE`
- When tapped, the link opens Telegram and triggers the bot's `/start` command
- The bot displays a Web App button that opens `viewer.html` with the user's profile
- The profile shows the user's name, Telegram handle, and contact links

## Deploy  
npm run deploy