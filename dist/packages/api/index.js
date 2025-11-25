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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const postgres_1 = __importDefault(require("postgres"));
const crypto_1 = require("crypto");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const sql = (0, postgres_1.default)(process.env.DATABASE_URL || '', {
    ssl: { rejectUnauthorized: false }
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Generate random 6-character code
function generateCode() {
    return (0, crypto_1.randomBytes)(3).toString('hex').toLowerCase().slice(0, 6);
}
// POST /signup - Create new hoodie signup
app.post('/signup', async (req, res) => {
    try {
        const { firstName, tgHandle, email, size } = req.body;
        if (!firstName || !tgHandle || !email || !size) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const code = generateCode();
        await sql `
      INSERT INTO hoodies (code, first_name, tg_handle, email, size)
      VALUES (${code}, ${firstName}, ${tgHandle}, ${email}, ${size})
    `;
        res.json({ code, status: 'pending' });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create signup' });
    }
});
// PATCH /approve - Approve hoodie and mark as burned
app.patch('/approve/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const result = await sql `
      UPDATE hoodies 
      SET status = 'burned', burned_at = NOW()
      WHERE code = ${code} AND status = 'pending'
      RETURNING *
    `;
        if (result.length === 0) {
            return res.status(404).json({ error: 'Hoodie not found or already approved' });
        }
        res.json({ success: true, hoodie: result[0] });
    }
    catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve hoodie' });
    }
});
// GET /pending - Get all pending hoodies (for admin)
app.get('/pending', async (req, res) => {
    try {
        const pending = await sql `
      SELECT code, first_name, tg_handle, email, size, created_at
      FROM hoodies 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `;
        res.json(pending);
    }
    catch (error) {
        console.error('Pending error:', error);
        res.status(500).json({ error: 'Failed to fetch pending hoodies' });
    }
});
// GET /profile/:code - Get hoodie profile
app.get('/profile/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const hoodie = await sql `
      SELECT first_name, tg_handle, email, size, status, created_at, burned_at
      FROM hoodies 
      WHERE code = ${code}
    `;
        if (hoodie.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(hoodie[0]);
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`API server running on port ${port}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map