import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import meRoute from './routes/me.js';

// Load env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// DB
const dbPromise = initDb();
app.use((req, res, next) => {
  req.dbPromise = dbPromise;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/me', meRoute);

// Error handler
app.use((err, req, res, next) => {
  res.status(400).json({ success: false, message: err.message, code: err.code || 'INTERNAL_ERROR' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
