#!/usr/bin/env node
const express = require('express');
const path = require('path');
const { Bot } = require('grammy');
const { spawn } = require('child_process');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TG_BOT_TOKEN || '8286532086:AAGC4at13_fO-zL4-_5Prrk_CmUNQGjt2w4';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'packages', 'bot', 'static')));

// Mongo setup
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.DATABASE_URL || 'mongodb+srv://remseechannel_db_user:UJEsoL3O2ZKedOh0@cluster0.4ropogd.mongodb.net/?appName=Cluster0');
const db = client.db('hoodie');
const hoodiesCollection = db.collection('hoodies');

// Bot setup
const bot = new Bot(BOT_TOKEN);

// Generate code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toLowerCase();
}

// Bot commands
bot.command('start', async (ctx) => {
  const startParam = ctx?.msg?.text?.split(' ')[1];
  
  if (startParam && startParam.length === 6) {
    await ctx.reply('📱 Viewing hoodie profile...', {
      reply_markup: {
        inline_keyboard: [[{
          text: '🎯 View Profile',
          web_app: { url: `http://localhost:${PORT}/viewer.html?code=${startParam}` }
        }]]
      }
    });
  } else {
    await ctx.reply('👋 Welcome to Hoodie NFC!\n\nChoose an action:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎽 Sign Up', web_app: { url: `http://localhost:${PORT}/consumer.html` } }],
          [{ text: '🛠️ Admin', web_app: { url: `http://localhost:${PORT}/admin.html` } }],
          [{ text: '📱 View Profiles', web_app: { url: `http://localhost:${PORT}/viewer.html` } }]
        ]
      }
    });
  }
});

bot.command('admin', async (ctx) => {
  await ctx.reply('🔗 Admin Dashboard', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🛠️ Open Admin',
        web_app: { url: `http://localhost:${PORT}/admin.html` }
      }]]
    }
  });
});

bot.command('viewer', async (ctx) => {
  await ctx.reply('👕 View Hoodies', {
    reply_markup: {
      inline_keyboard: [[{
        text: '📱 Open Viewer',
        web_app: { url: `http://localhost:${PORT}/viewer.html` }
      }]]
    }
  });
});

bot.on('message', (ctx) => {
  if (!ctx.msg.text?.startsWith('/')) {
    ctx.reply('💬 Try these commands:\n/start - Sign up\n/admin - Admin panel\n/viewer - View profiles');
  }
});

bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// API routes
app.get('/api/pending', async (req, res) => {
  try {
    await client.connect();
    const pending = await hoodiesCollection.find({ status: 'pending' }).sort({ createdAt: 1 }).toArray();
    
    res.json(pending.map(item => ({
      code: item.code,
      firstName: item.firstName,
      tgHandle: item.tgHandle,
      email: item.email,
      size: item.size,
      createdAt: item.createdAt
    })));
  } catch (error) {
    console.error('Pending error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    await client.connect();
    const { firstName, tgHandle, email, size } = req.body;
    
    if (!firstName || !tgHandle || !email || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const code = generateCode();
    
    await hoodiesCollection.insertOne({
      code, firstName, tgHandle, email, size,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({ code, status: 'pending' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profile/:code', async (req, res) => {
  try {
    await client.connect();
    const { code } = req.params;
    const hoodie = await hoodiesCollection.findOne({ code });
    
    if (!hoodie) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      firstName: hoodie.firstName,
      tgHandle: hoodie.tgHandle,
      email: hoodie.email,
      size: hoodie.size,
      status: hoodie.status,
      createdAt: hoodie.createdAt,
      burnedAt: hoodie.burnedAt
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/approve/:code', async (req, res) => {
  try {
    await client.connect();
    const { code } = req.params;
    
    const result = await hoodiesCollection.findOneAndUpdate(
      { code, status: 'pending' },
      { $set: { status: 'burned', burnedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Hoodie not found or already approved' });
    }

    res.json({ success: true, hoodie: result });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Hoodie NFC Hub</title></head>
      <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h1>🎽 Hoodie NFC System</h1>
        <p>Choose your experience:</p>
        <div style="display: grid; gap: 20px; max-width: 400px; margin: 0 auto;">
          <a href="/consumer.html" style="padding: 20px; background: #0088cc; color: white; text-decoration: none; border-radius: 8px;">🎽 Sign Up</a>
          <a href="/admin.html" style="padding: 20px; background: #28a745; color: white; text-decoration: none; border-radius: 8px;">🛠️ Admin</a>
          <a href="/viewer.html" style="padding: 20px; background: #ffc107; color: black; text-decoration: none; border-radius: 8px;">📱 Viewer</a>
        </div>
        <br>
        <p><strong>Bot Commands:</strong></p>
        <p>@handshake_ton_bot: /start | /admin | /viewer</p>
      </body>
    </html>
  `);
});

// Startup
async function start() {
  console.log('🚀 Starting Hoodie NFC System...');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    bot.start({ drop_pending_updates: true });
    console.log('🤖 Bot started - @handshake_ton_bot');
    console.log('💬 Commands: /start, /admin, /viewer');
    
    app.listen(PORT, () => {
      console.log(`🌐 Server running: http://localhost:${PORT}`);
      console.log(`🔗 APIs: /api/*`);
      console.log(`🎨 Web: consumer.html, admin.html, viewer.html`);
    });
    
  } catch (error) {
    console.error('❌ Startup error:', error.name, error.message);
    process.exit(1);
  }
}

start();