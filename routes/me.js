import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// GET /me
router.get('/', async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant', code: 'NO_TOKEN' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = await req.dbPromise;
    const user = await db.get('SELECT id, email, created_at, last_login FROM users WHERE id = ?', [payload.user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé', code: 'USER_NOT_FOUND' });
    res.json({ success: true, data: user });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide', code: 'INVALID_TOKEN' });
  }
});

export default router;
