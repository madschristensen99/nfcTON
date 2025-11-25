// Simple local server for hoodie NFC app - no build needed
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_DOMAIN = process.env.BOT_DOMAIN || `http://localhost:${PORT}`;

// JSON parsing
app.use(express.json());
app.use(express.static(path.join(__dirname, 'packages/bot/static')));

// MongoDB setup
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.DATABASE_URL || '');
const db = client.db('hoodie');
const hoodiesCollection = db.collection('hoodies');

client.connect().then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(console.error);

// Generate random code
function generateCode() {
  return require('crypto').randomBytes(3).toString('hex').toLowerCase().slice(0, 6);
}

// Bot setup
const { Bot, webhookCallback } = require('grammy');
const token = process.env.TG_BOT_TOKEN;

if (!token) {
  throw new Error('TG_BOT_TOKEN is required');
}

const bot = new Bot(token);

// Bot commands
bot.command('start', async (ctx) => {
  const startParam = ctx?.msg?.text?.split(' ')[1];
  
  if (startParam && startParam.length === 6) {
    await ctx.reply('📱 Opening your hoodie profile...', {
      reply_markup: {
        inline_keyboard: [[{
          text: '🎯 View Profile',
          web_app: { url: `${BOT_DOMAIN}/viewer.html?code=${startParam}` }
        }]]
      }
    });
    return;
  }

  await ctx.reply('👋 Welcome to Hoodie NFC!\n\nGet your personalized Linktree hoodie', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🎽 Sign Up for Hoodie',
        web_app: { url: `${BOT_DOMAIN}/consumer.html` }
      }]]
    }
  });
});

bot.command('admin', async (ctx) => {
  await ctx.reply('🔗 Admin Dashboard', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🛠️ Admin Panel',
        web_app: { url: `${BOT_DOMAIN}/admin.html` }
      }]]
    }
  });
});

bot.command('viewer', async (ctx) => {
  await ctx.reply('👕 View Hoodies', {
    reply_markup: {
      inline_keyboard: [[{
        text: '📱 Viewer App',
        web_app: { url: `${BOT_DOMAIN}/viewer.html` }
      }]]
    }
  });
});

// API routes
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, tgHandle, email, size } = req.body;
    if (!firstName || !tgHandle || !email || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const code = generateCode();
    await hoodiesCollection.insertOne({
      code, firstName, tgHandle, email, size,
      status: 'pending', createdAt: new Date()
    });

    res.json({ code, status: 'pending' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create signup' });
  }
});

app.get('/api/pending', async (req, res) => {
  try {
    const pending = await hoodiesCollection
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .toArray();

    res.json(pending.map(item => ({
      code: item.code, firstName: item.firstName, tgHandle: item.tgHandle,
      email: item.email, size: item.size, createdAt: item.createdAt
    })));
  } catch (error) {
    console.error('Pending error:', error);
    res.status(500).json({ error: 'Failed to fetch pending hoodies' });
  }
});

app.get('/api/profile/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const hoodie = await hoodiesCollection.findOne({ code });
    
    if (!hoodie) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      firstName: hoodie.firstName, tgHandle: hoodie.tgHandle,
      email: hoodie.email, size: hoodie.size, status: hoodie.status,
      createdAt: hoodie.createdAt, burnedAt: hoodie.burnedAt
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.patch('/api/approve/:code', async (req, res) => {
  try {
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
    res.status(500).json({ error: 'Failed to approve hoodie' });
  }
});

// Bot webhook endpoint
app.post('/bot', webhookCallback(bot, 'express'));

// Bot polling for development (optional)
if (process.env.NODE_ENV !== 'production') {
  // Uncomment for polling mode while developing
  // bot.start({ drop_pending_updates: true });
  // console.log('🔧 Bot started in polling mode');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Bot webhook URL: ${BOT_DOMAIN}/bot`);
  console.log(`🔗 API endpoints accessible at: ${BOT_DOMAIN}/api/*`);
  console.log(`🌐 Web interfaces at: ${BOT_DOMAIN}/`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST ${BOT_DOMAIN}/api/signup`);
  console.log(`   GET  ${BOT_DOMAIN}/api/pending`);
  console.log(`   GET  ${BOT_DOMAIN}/api/profile/:code`);
  console.log(`   PATCH ${BOT_DOMAIN}/api/approve/:code`);
});