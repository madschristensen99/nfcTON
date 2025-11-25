import express from 'express';
import cors from 'cors';
import postgres from 'postgres';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL || '', {
  ssl: { rejectUnauthorized: false }
});

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

    await sql`
      INSERT INTO hoodies (code, first_name, tg_handle, email, size)
      VALUES (${code}, ${firstName}, ${tgHandle}, ${email}, ${size})
    `;

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
    
    const result = await sql`
      UPDATE hoodies 
      SET status = 'burned', burned_at = NOW()
      WHERE code = ${code} AND status = 'pending'
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Hoodie not found or already approved' });
    }

    res.json({ success: true, hoodie: result[0] });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Failed to approve hoodie' });
  }
});

// GET /pending - Get all pending hoodies (for admin)
app.get('/pending', async (req, res) => {
  try {
    const pending = await sql`
      SELECT code, first_name, tg_handle, email, size, created_at
      FROM hoodies 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `;

    res.json(pending);
  } catch (error) {
    console.error('Pending error:', error);
    res.status(500).json({ error: 'Failed to fetch pending hoodies' });
  }
});

// GET /profile/:code - Get hoodie profile
app.get('/profile/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const hoodie = await sql`
      SELECT first_name, tg_handle, email, size, status, created_at, burned_at
      FROM hoodies 
      WHERE code = ${code}
    `;

    if (hoodie.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(hoodie[0]);
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