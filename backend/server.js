require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Logger ──────────────────────────────────────────────────────────────────

const C = {
  reset:     '\x1b[0m',
  bold:      '\x1b[1m',
  gray:      '\x1b[90m',
  cyan:      '\x1b[36m',
  yellow:    '\x1b[33m',
  red:       '\x1b[31m',
  green:     '\x1b[32m',
  magenta:   '\x1b[35m',
};

function ts() {
  return new Date().toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const log = {
  info:      (msg, ip = '') => console.log(`${C.cyan}${C.bold}[INFO]${C.reset}      ${C.gray}[${ts()}]${C.reset}${ip ? ` ${C.gray}[${ip}]${C.reset}` : ''} ${msg}`),
  warn:      (msg, ip = '') => console.warn(`${C.yellow}${C.bold}[WARN]${C.reset}      ${C.gray}[${ts()}]${C.reset}${ip ? ` ${C.gray}[${ip}]${C.reset}` : ''} ${C.yellow}${msg}${C.reset}`),
  error:     (msg, ip = '') => console.error(`${C.red}${C.bold}[ERROR]${C.reset}     ${C.gray}[${ts()}]${C.reset}${ip ? ` ${C.gray}[${ip}]${C.reset}` : ''} ${C.red}${msg}${C.reset}`),
  important: (msg, ip = '') => console.log(`${C.green}${C.bold}[IMPORTANT]${C.reset} ${C.gray}[${ts()}]${C.reset}${ip ? ` ${C.gray}[${ip}]${C.reset}` : ''} ${C.green}${C.bold}${msg}${C.reset}`),
  request:   (method, path, status, ip, ms) => {
    const statusColor = status >= 500 ? C.red : status >= 400 ? C.yellow : C.green;
    console.log(`${C.magenta}${C.bold}[REQ]${C.reset}       ${C.gray}[${ts()}]${C.reset} ${C.gray}[${ip}]${C.reset} ${C.bold}${method.padEnd(6)}${C.reset} ${path.padEnd(30)} ${statusColor}${status}${C.reset} ${C.gray}${ms}ms${C.reset}`);
  },
};

// ─── Request Logger Middleware ────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '-';
  res.on('finish', () => {
    log.request(req.method, req.originalUrl, res.statusCode, ip, Date.now() - start);
  });
  req.clientIp = ip;
  next();
});

// ─── DB Pool ──────────────────────────────────────────────────────────────────

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
});

// Başlangıçta tabloları oluştur
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(50)  NOT NULL UNIQUE,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drafts (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT          NOT NULL,
        title      VARCHAR(255) NOT NULL DEFAULT 'Adsız',
        data       LONGTEXT     NOT NULL,
        size_bytes INT          DEFAULT 0,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    log.important('Veritabanı tabloları hazır.');
  } catch (err) {
    log.error(`Tablo oluşturma hatası: ${err.message}`);
  }
}

// ─── JWT Yardımcısı ───────────────────────────────────────────────────────────

const JWT_SECRET  = process.env.JWT_SECRET || 'local-dev-secret';
const JWT_EXPIRES = '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Token gerekli.' });
  const payload = verifyToken(auth.slice(7));
  if (!payload) return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  req.userId = payload.id;
  req.username = payload.username;
  next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    if (rows[0].solution === 2) {
      res.json({ status: 'success', message: 'Veritabanı bağlantısı aktif.' });
    }
  } catch (err) {
    log.error(`Health check başarısız: ${err.message}`, req.clientIp);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Kayıt ol
app.post('/api/auth/register', async (req, res) => {
  const ip = req.clientIp;
  const { username, email, password } = req.body ?? {};

  if (!username?.trim() || !email?.trim() || !password?.trim()) {
    log.warn(`Kayıt: eksik alanlar`, ip);
    return res.status(422).json({ message: 'Kullanıcı adı, email ve şifre zorunludur.' });
  }

  if (password.length < 6) {
    log.warn(`Kayıt: şifre çok kısa — kullanıcı: ${username}`, ip);
    return res.status(422).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), email.trim().toLowerCase(), hash]
    );
    log.important(`Yeni kullanıcı kaydoldu: ${username} <${email}>`, ip);
    res.status(201).json({ message: 'Hesap başarıyla oluşturuldu.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.message.includes('email') ? 'email' : 'kullanıcı adı';
      log.warn(`Kayıt: çakışma — ${field} zaten kullanımda (${username} / ${email})`, ip);
      return res.status(409).json({ message: `Bu ${field} zaten kayıtlı.` });
    }
    log.error(`Kayıt hatası: ${err.message}`, ip);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Giriş yap
app.post('/api/auth/login', async (req, res) => {
  const ip = req.clientIp;
  const { username, password } = req.body ?? {};

  if (!username?.trim() || !password?.trim()) {
    log.warn(`Giriş: eksik alanlar`, ip);
    return res.status(422).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, password FROM users WHERE username = ? LIMIT 1',
      [username.trim()]
    );

    if (rows.length === 0) {
      log.warn(`Giriş başarısız: kullanıcı bulunamadı — ${username}`, ip);
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      log.warn(`Giriş başarısız: hatalı şifre — ${username}`, ip);
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const token = signToken({ id: user.id, username: user.username });
    log.important(`Giriş başarılı: ${user.username}`, ip);
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    log.error(`Giriş hatası: ${err.message}`, ip);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// ─── Drafts ───────────────────────────────────────────────────────────────────

// Taslakları listele
app.get('/api/drafts', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, updated_at, LENGTH(data) AS size_bytes FROM drafts WHERE user_id = ? ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    log.error(`Taslak listesi hatası: ${err.message}`, req.clientIp);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Taslak getir
app.get('/api/drafts/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, data, updated_at FROM drafts WHERE id = ? AND user_id = ? LIMIT 1',
      [req.params.id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Taslak bulunamadı.' });
    res.json(rows[0]);
  } catch (err) {
    log.error(`Taslak getirme hatası: ${err.message}`, req.clientIp);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Taslak kaydet / güncelle
app.post('/api/drafts/save', authMiddleware, async (req, res) => {
  const ip = req.clientIp;
  const { title, data } = req.body ?? {};
  if (!data?.trim()) return res.status(422).json({ message: 'Taslak verisi zorunludur.' });
  try {
    const [existing] = await pool.query(
      'SELECT id FROM drafts WHERE user_id = ? AND title = ? LIMIT 1',
      [req.userId, title || 'Adsız']
    );
    if (existing.length > 0) {
      await pool.query('UPDATE drafts SET data = ?, updated_at = NOW() WHERE id = ?', [data, existing[0].id]);
      log.info(`Taslak güncellendi: "${title}" (${req.username})`, ip);
      res.json({ id: existing[0].id, updated: true });
    } else {
      const [result] = await pool.query(
        'INSERT INTO drafts (user_id, title, data) VALUES (?, ?, ?)',
        [req.userId, title || 'Adsız', data]
      );
      log.important(`Taslak kaydedildi: "${title}" (${req.username})`, ip);
      res.status(201).json({ id: result.insertId, updated: false });
    }
  } catch (err) {
    log.error(`Taslak kayıt hatası: ${err.message}`, ip);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Taslak sil
app.delete('/api/drafts/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM drafts WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Taslak bulunamadı.' });
    log.info(`Taslak silindi: id=${req.params.id} (${req.username})`, req.clientIp);
    res.json({ deleted: true });
  } catch (err) {
    log.error(`Taslak silme hatası: ${err.message}`, req.clientIp);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// 404
app.use((req, res) => {
  log.warn(`404 — ${req.method} ${req.originalUrl}`, req.clientIp);
  res.status(404).json({ message: 'Endpoint bulunamadı.' });
});

// ─── Başlat ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  log.important(`Mireditor Backend ayakta — http://localhost:${PORT}`);
  await initDB();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log.error(`Port ${PORT} zaten kullanımda.`);
  } else {
    log.error(`Sunucu hatası: ${err.message}`);
  }
  process.exit(1);
});
