const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('✅ API 서버 동작 중 99'));

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.post("/upload", async (req, res) => {

    const { keyword, title, content } = req.body;

    if (!keyword || !title || !content) {
        return res.status(400).json({
            error: "빈 항목이 있습니다."
        });
    }

    try {

        await pool.query(
            `INSERT INTO ideas(keyword,title,content)
             VALUES($1,$2,$3)`,
            [keyword, title, content]
        );

        res.json({
            success: true
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "DB 저장 실패"
        });
    }

});

app.get("/ideas", async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT *
             FROM ideas
             ORDER BY likes DESC, created_at DESC`
        );

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "DB 조회 실패"
        });

    }

});

app.post("/like/:id", async (req, res) => {

    try {

        await pool.query(
            `UPDATE ideas
             SET likes = likes + 1
             WHERE id = $1`,
            [req.params.id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "좋아요 실패"
        });

    }

});