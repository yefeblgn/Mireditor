require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Pool (Domain-Driven Architecture için Temel)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Bağlantısı Endpoint'i
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        if (rows[0].solution === 2) {
            res.status(200).json({ status: 'success', message: 'MySQL veritabanına başarıyla bağlanıldı!' });
        }
    } catch (error) {
        console.error('Veritabanı bağlantı hatası:', error);
        res.status(500).json({ status: 'error', message: 'Veritabanı bağlantısı başarısız.', error: error.message });
    }
});

// İleride yapacağın Auth Endpoint'i (Örnek)
app.post('/api/auth/login', async (req, res) => {
    // Burada jwt ve bcrypt ile güvenli giriş yapılacak
    res.status(501).json({ message: "Not implemented yet, but DB is ready!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[ALARM] Mireditor Backend ayakta! Port: ${PORT}`);
    console.log(`[TEST] Veritabanı test linki: http://localhost:${PORT}/api/health`);
});
