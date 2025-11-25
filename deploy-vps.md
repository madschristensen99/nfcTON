# 🚀 VPS Deployment Guide - Hoodie NFC Telegram Bot

## Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account + connection string
- Telegram Bot Token (get from @BotFather)
- VPS with Ubuntu/Debian

### 2. Install Dependencies
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone & Setup
```bash
# Navigate to your directory
cd /opt/
git clone https://github.com/madschristensen99/nfcTON.git hoodie-nfc
cd hoodie-nfc

# Install dependencies
npm install -y
```

### 4. Environment Setup
```bash
# Create .env file
cat > .env << EOL
TG_BOT_TOKEN=your_bot_token_here
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
BOT_DOMAIN=http://your-vps-ip:3000
PORT=3000
NODE_ENV=production
EOL

# Make .env secure
chmod 600 .env
```

### 5. Open Firewall Ports
```bash
# Allow port 3000
sudo ufw allow 3000
sudo ufw enable
```

### 6. Start Service
```bash
# Test locally first
npm start

# For production, use PM2
sudo npm install -g pm2
pm2 start server.js --name hoodie-nfc
pm2 startup
pm2 save
```

### 7. Set Bot Webhook
```bash
# Set webhook to your VPS
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=http://your-vps-ip:3000/bot"
```

## 🎯 Testing Your Deployment

**Bot Commands:**
- `/start` - Welcome message + signup
- `/admin` - Admin dashboard link  
- `/viewer` - Profile viewer

**Web URLs:**
- **Main**: `http://your-vps-ip:3000/`
- **Admin**: `http://your-vps-ip:3000/admin.html`
- **API**: `http://your-vps-ip:3000/api/signup`

## 🔄 Update Process
```bash
cd /opt/hoodie-nfc
git pull origin main
pm install  # if dependencies changed
pm2 restart hoodie-nfc
```

## 🛠️ Alternative: Use Ngrok for Testing
```bash
# Download ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xzf ngrok-v3-stable-linux-amd64.tgz
./ngrok http 3000

# Use the ngrok URL for BOT_DOMAIN:
# BOT_DOMAIN=https://abcd1234.ngrok.io
```

## 📧 Production HTTPS (with Cloudflare)
1. Use Cloudflare Tunnel for easy HTTPS
2. Or setup Nginx with SSL certificates

Your hoodie NFC bot should now work perfectly on any VPS! 🎉