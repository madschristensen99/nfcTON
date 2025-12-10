// Simple local server for hoodie NFC app - no build needed
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_DOMAIN = process.env.BOT_DOMAIN || `http://localhost:${PORT}`;

// CORS configuration - allow requests from fungerbil.com and other origins
app.use(cors({
  origin: ['https://fungerbil.com', 'https://www.fungerbil.com', 'http://localhost:3000'],
  credentials: true
}));

// JSON parsing
app.use(express.json());
app.use(express.static(path.join(__dirname, 'packages/bot/static')));

// MongoDB setup
const { MongoClient } = require('mongodb');

// Add appName to connection string if not present
let mongoUrl = process.env.DATABASE_URL || '';
if (mongoUrl && !mongoUrl.includes('appName=')) {
  mongoUrl += (mongoUrl.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
}

const client = new MongoClient(mongoUrl, {
  tlsAllowInvalidCertificates: true, // Temporary workaround for Node v22
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
});
const db = client.db('hoodie');
const hoodiesCollection = db.collection('hoodies');

client.connect().then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.error('Please check your DATABASE_URL in .env file');
});

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
  const userId = ctx.from.id;
  
  // Check if user already has a hoodie signup
  const existingUser = await hoodiesCollection.findOne({ telegramId: userId });
  
  if (startParam && startParam.length === 6) {
    // Look up the profile for this code
    const profile = await hoodiesCollection.findOne({ code: startParam });
    
    if (!profile) {
      await ctx.reply('❌ Profile not found. This hoodie may not be registered yet.');
      return;
    }
    
    // Check if using HTTPS (required for Web Apps)
    if (BOT_DOMAIN.startsWith('https://')) {
      await ctx.reply('📱 Opening your hoodie profile...', {
        reply_markup: {
          inline_keyboard: [[{
            text: '🎯 View Profile',
            web_app: { url: `${BOT_DOMAIN}/viewer.html?code=${startParam}` }
          }]]
        }
      });
    } else {
      // Fallback for local development (HTTP) - show profile directly
      let message = `🎽 Hoodie Profile #${profile.code}\n\n`;
      message += `👤 Name: ${profile.firstName}\n`;
      message += `💬 Telegram: ${profile.tgHandle}\n`;
      message += `📧 Email: ${profile.email}\n`;
      message += `📍 Size: ${profile.size}\n`;
      message += `📊 Status: ${profile.status}\n`;
      
      if (profile.status === 'burned') {
        message += `\n✅ This hoodie has been approved and burned to NFC!`;
      } else {
        message += `\n⏳ This hoodie is pending approval.`;
      }
      
      message += `\n\n⚠️ To see the full Web App profile, deploy with HTTPS.`;
      
      // Send message without buttons to avoid URL validation issues in local dev
      await ctx.reply(message);
    }
    return;
  }

  // If user already signed up, show their profile
  if (existingUser) {
    let message = `🎽 Welcome back, ${existingUser.firstName}!\n\n`;
    message += `Your Hoodie Profile #${existingUser.code}\n\n`;
    message += `📏 Size: ${existingUser.size}\n`;
    message += `📊 Status: ${existingUser.status}\n`;
    
    if (existingUser.status === 'burned') {
      message += `✅ Approved on: ${existingUser.burnedAt.toDateString()}`;
    } else {
      message += `⏳ Your hoodie is pending approval`;
    }
    
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 View Full Profile', callback_data: `view_my_profile` }],
          [{ text: '✏️ Edit Profile', callback_data: 'edit_profile' }],
          [{ text: '⚙️ Admin Dashboard', callback_data: 'admin' }]
        ]
      }
    });
    return;
  }

  // New user - show signup option
  await ctx.reply(`🎽 Welcome to Hoodie NFC!\n\nGet your personalized Linktree hoodie`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 Fill Signup Form', callback_data: 'signup' }],
        [{ text: '🔍 View a profile', callback_data: 'search_profile' }],
        [{ text: '⚙️ Admin Dashboard', callback_data: 'admin' }]
      ]
    }
  });
});

bot.command('admin', async (ctx) => {
  const pending = await hoodiesCollection.find({ status: 'pending' }).toArray();
  
  // Check if using HTTPS (required for Web Apps)
  if (BOT_DOMAIN.startsWith('https://')) {
    await ctx.reply(`🛠️ Admin Dashboard\n\nManage pending hoodie orders and copy NFC links`, {
      reply_markup: {
        inline_keyboard: [[{ 
          text: '🛠️ Open Admin Dashboard', 
          web_app: { url: `${BOT_DOMAIN}/admin.html` } 
        }]]
      }
    });
  } else {
    // Fallback for local development (HTTP)
    let message = `🛠️ Admin Dashboard\n\nPending Orders: ${pending.length}\n\n`;
    
    if (pending.length === 0) {
      message += '✅ No pending orders!';
    } else {
      message += '📋 Pending Orders:\n\n';
      pending.forEach(item => {
        const botUsername = ctx.me.username;
        // Use Mini App direct link format
        const nfcLink = `https://t.me/${botUsername}/Examine?startapp=${item.code}`;
        message += `👤 ${item.firstName} (@${item.tgHandle.replace('@', '')})\n`;
        message += `📍 Code: #${item.code}\n`;
        message += `🔗 NFC Link:\n${nfcLink}\n\n`;
      });
      message += '💡 Copy the NFC link and burn it to the chip using NFC Tools app\n\n';
      message += `⚠️ To use Web App dashboard, set BOT_DOMAIN to HTTPS URL in .env`;
    }
    
    await ctx.reply(message);
  }
});

bot.command('viewer', async (ctx) => {
  await ctx.reply("What hoodie would you like to view?", {
    reply_markup: {
      inline_keyboard: [[{ text: '🔍 Search by code', callback_data: 'search_profile' }]]
    }
  });
});

// Track user signup sessions
const userSessions = new Map();

// Handle callback queries for interactive telegram flow
bot.on('callback_query:data', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    
    switch (data) {
    case 'signup':
      await ctx.answerCallbackQuery();
      // Check if user already signed up
      const existingSignup = await hoodiesCollection.findOne({ telegramId: userId });
      if (existingSignup) {
        await ctx.reply(`⚠️ You already have a hoodie signup!\n\nYour code: #${existingSignup.code}\nStatus: ${existingSignup.status}`);
        return;
      }
      // Get username automatically
      const username = ctx.from.username ? `@${ctx.from.username}` : 'No username';
      userSessions.set(userId, { 
        step: 'name',
        telegramId: userId,
        tgHandle: username
      });
      await ctx.reply("🌟 Let's get you a hoodie!\n\nWhat's your first name?");
      break;
    case 'admin':
      await ctx.answerCallbackQuery();
      const pending = await hoodiesCollection.find({ status: 'pending' }).toArray();
      
      // Check if using HTTPS (required for Web Apps)
      if (BOT_DOMAIN.startsWith('https://')) {
        await ctx.reply(`🛠️ Admin Dashboard\n\nPending Orders: ${pending.length}\n\nClick below to manage orders and copy NFC links`, {
          reply_markup: {
            inline_keyboard: [[{ 
              text: '🛠️ Open Admin Dashboard', 
              web_app: { url: `${BOT_DOMAIN}/admin.html` } 
            }]]
          }
        });
      } else {
        // Fallback for local development (HTTP)
        let message = `🛠️ Admin Dashboard\n\nPending Orders: ${pending.length}\n\n`;
        
        if (pending.length === 0) {
          message += '✅ No pending orders!';
        } else {
          message += '📋 Pending Orders:\n\n';
          pending.forEach(item => {
            const botUsername = ctx.me.username;
            // Use Mini App direct link format
            const nfcLink = `https://t.me/${botUsername}/Examine?startapp=${item.code}`;
            message += `👤 ${item.firstName} (@${item.tgHandle.replace('@', '')})\n`;
            message += `📍 Code: #${item.code}\n`;
            message += `🔗 NFC Link:\n${nfcLink}\n\n`;
          });
          message += '💡 Copy the NFC link and burn it to the chip using NFC Tools app\n\n';
          message += `⚠️ To use Web App dashboard, set BOT_DOMAIN to HTTPS URL in .env`;
        }
        
        await ctx.reply(message);
      }
      break;
    case 'view_my_profile':
      await ctx.answerCallbackQuery();
      const userProfile = await hoodiesCollection.findOne({ telegramId: userId });
      if (!userProfile) {
        await ctx.reply("❌ You don't have a profile yet. Use /start to sign up!");
        return;
      }
      await ctx.reply(`🎽 Your Hoodie Profile #${userProfile.code}\n\nName: ${userProfile.firstName}\nTelegram: ${userProfile.tgHandle}\nEmail: ${userProfile.email}\nSize: ${userProfile.size}\nStatus: ${userProfile.status}\nCreated: ${userProfile.createdAt.toDateString()}${userProfile.status === 'burned' ? `\n🖨️ Approved: ${userProfile.burnedAt.toDateString()}` : ''}`);
      break;
    case 'edit_profile':
      await ctx.answerCallbackQuery();
      const profileToEdit = await hoodiesCollection.findOne({ telegramId: userId });
      if (!profileToEdit) {
        await ctx.reply("❌ You don't have a profile yet. Use /start to sign up!");
        return;
      }
      await ctx.reply("✏️ What would you like to edit?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👤 Name', callback_data: 'edit_name' }],
            [{ text: '📧 Email', callback_data: 'edit_email' }],
            [{ text: '📏 Size', callback_data: 'edit_size' }],
            [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
          ]
        }
      });
      break;
    case 'edit_name':
      await ctx.answerCallbackQuery();
      userSessions.set(userId, { step: 'edit_name', telegramId: userId });
      await ctx.reply("👤 What's your new name?");
      break;
    case 'edit_email':
      await ctx.answerCallbackQuery();
      userSessions.set(userId, { step: 'edit_email', telegramId: userId });
      await ctx.reply("📧 What's your new email address?");
      break;
    case 'edit_size':
      await ctx.answerCallbackQuery();
      await ctx.reply("📏 What's your new hoodie size?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'S', callback_data: 'size_S' }, { text: 'M', callback_data: 'size_M' }],
            [{ text: 'L', callback_data: 'size_L' }, { text: 'XL', callback_data: 'size_XL' }],
            [{ text: 'XXL', callback_data: 'size_XXL' }],
            [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
          ]
        }
      });
      break;
    case 'size_S':
    case 'size_M':
    case 'size_L':
    case 'size_XL':
    case 'size_XXL':
      await ctx.answerCallbackQuery();
      const newSize = data.split('_')[1];
      await hoodiesCollection.updateOne(
        { telegramId: userId },
        { $set: { size: newSize } }
      );
      await ctx.reply(`✅ Your hoodie size has been updated to ${newSize}!`);
      break;
    case 'cancel_edit':
      await ctx.answerCallbackQuery();
      userSessions.delete(userId);
      await ctx.reply("❌ Edit cancelled.");
      break;
    case 'view_profile':
    case 'search_profile':
      await ctx.answerCallbackQuery();
      await ctx.reply("To view a profile, reply with: /view CODE\n\nExample: /view abc123");
      break;
    }
  } catch (error) {
    console.error('Callback query error:', error);
    try {
      await ctx.answerCallbackQuery();
    } catch (e) {
      // Ignore if callback query already answered
    }
  }
});

// Handle text responses for signup flow
bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  
  // Skip if this is a command
  if (text.startsWith('/')) return;
  
  const session = userSessions.get(userId);
  if (!session) return;
  
  try {
    switch (session.step) {
      case 'name':
        session.firstName = text;
        session.step = 'email';
        userSessions.set(userId, session);
        await ctx.reply(`Nice to meet you, ${text}! 🌟\n\n📧 What's your email address?`);
        break;
        
      case 'email':
        if (!text.includes('@')) {
          await ctx.reply("❌ Please enter a valid email address");
          return;
        }
        session.email = text;
        session.step = 'size';
        userSessions.set(userId, session);
        await ctx.reply("📏 What size hoodie do you want?\n\nOptions: S, M, L, XL, XXL");
        break;
        
      case 'edit_name':
        await hoodiesCollection.updateOne(
          { telegramId: userId },
          { $set: { firstName: text } }
        );
        userSessions.delete(userId);
        await ctx.reply(`✅ Your name has been updated to ${text}!`);
        break;
        
      case 'edit_email':
        if (!text.includes('@')) {
          await ctx.reply("❌ Please enter a valid email address");
          return;
        }
        await hoodiesCollection.updateOne(
          { telegramId: userId },
          { $set: { email: text } }
        );
        userSessions.delete(userId);
        await ctx.reply(`✅ Your email has been updated to ${text}!`);
        break;
        
      case 'size':
        const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        const size = text.toUpperCase();
        if (!validSizes.includes(size)) {
          await ctx.reply("❌ Please choose from: S, M, L, XL, or XXL");
          return;
        }
        
        // Save to database with Telegram ID
        const code = generateCode();
        const signupData = {
          code,
          telegramId: session.telegramId,
          firstName: session.firstName,
          tgHandle: session.tgHandle,
          email: session.email,
          size,
          status: 'pending',
          createdAt: new Date()
        };
        
        await hoodiesCollection.insertOne(signupData);
        userSessions.delete(userId);
        
        await ctx.reply(`✅ All done! Your hoodie signup is complete.\n\n🎁 Your unique code: #${code}\n📊 Current status: Pending\n\nYou can always check your status by pressing /start`);
        break;
    }
  } catch (error) {
    console.error('Signup flow error:', error);
    await ctx.reply("❌ Something went wrong. Please try again or contact support.");
    userSessions.delete(userId);
  }
});

// Handle direct commands
bot.command('view', async (ctx) => {
  const code = ctx.match;
  if (!code) {
    return await ctx.reply("Usage: /view CODE\n\nExample: /view abc123");
  }
  
  const hoodie = await hoodiesCollection.findOne({ code: code.toLowerCase() });
  if (!hoodie) {
    return await ctx.reply(`❌ Profile with code #${code} not found.`);
  }
  
  let message = `🎽 Hoodie Profile #${hoodie.code}\n\n`;
  message += `Name: ${hoodie.firstName}\n`;
  message += `Telegram: ${hoodie.tgHandle}\n`;
  message += `Email: ${hoodie.email}\n`;
  message += `Size: ${hoodie.size}\n`;
  message += `Status: ${hoodie.status}\n`;
  message += `Created: ${hoodie.createdAt.toDateString()}`;
  
  if (hoodie.status === 'burned') {
    message += `\n🖨️ Approved: ${hoodie.burnedAt.toDateString()}`;
  }
  
  await ctx.reply(message);
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

app.patch('/api/profile/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { firstName, email, size } = req.body;
    
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (email) updateFields.email = email;
    if (size) updateFields.size = size;
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const result = await hoodiesCollection.findOneAndUpdate(
      { code },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ success: true, profile: result });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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

// Global error handler for the bot
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof Error) {
    console.error('Error name:', e.name);
    console.error('Error message:', e.message);
  } else {
    console.error('Unknown error:', e);
  }
});

// Bot setup based on environment
if (process.env.NODE_ENV === 'development') {
  // Use polling for local development
  bot.start({ drop_pending_updates: true });
  console.log('🔧 Bot started in DEVELOPMENT polling mode - commands now work!');
  console.log('💬 Bot commands: /start, /admin, /viewer');
} else {
  // Production webhook mode
  app.post('/bot', webhookCallback(bot, 'express'));
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Bot webhook URL: ${BOT_DOMAIN}/bot`);
  console.log(`🔗 API endpoints accessible at: ${BOT_DOMAIN}/api/*`);
  console.log(`🌐 Web interfaces at: ${BOT_DOMAIN}/`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST  ${BOT_DOMAIN}/api/signup`);
  console.log(`   GET   ${BOT_DOMAIN}/api/pending`);
  console.log(`   GET   ${BOT_DOMAIN}/api/profile/:code`);
  console.log(`   PATCH ${BOT_DOMAIN}/api/profile/:code`);
  console.log(`   PATCH ${BOT_DOMAIN}/api/approve/:code`);
});