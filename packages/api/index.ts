import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.DATABASE_URL || '');
const db = client.db('hoodie');
const hoodiesCollection = db.collection('hoodies');

client.connect().then(() => {
  console.log('Connected to MongoDB');
}).catch(console.error);

const app = express();
app.use(cors());
app.use(express.json());

// Generate random 6-character code
function generateCode(): string {
  return randomBytes(3).toString('hex').toLowerCase().slice(0, 6);
}

// POST /signup - Create new hoodie signup
app.post('/signup', async (req, res) => {
  try {
    const { firstName, tgHandle, email, size } = req.body;

    if (!firstName || !tgHandle || !email || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const code = generateCode();

    const result = await hoodiesCollection.insertOne({
      code,
      firstName,
      tgHandle,
      email,
      size,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({ code, status: 'pending' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create signup' });
  }
});

// PATCH /approve - Approve hoodie and mark as burned
app.patch('/approve/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await hoodiesCollection.findOneAndUpdate(
      { code, status: 'pending' },
      { 
        $set: { 
          status: 'burned',
          burnedAt: new Date()
        } 
      },
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

// GET /pending - Get all pending hoodies (for admin)
app.get('/pending', async (req, res) => {
  try {
    const pending = await hoodiesCollection
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .project({ _id: 0 })
      .toArray();

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
    res.status(500).json({ error: 'Failed to fetch pending hoodies' });
  }
});

// GET /profile/:code - Get hoodie profile
app.get('/profile/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const hoodie = await hoodiesCollection.findOne(
      { code },
      { projection: { _id: 0 } }
    );

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
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});

export default app;