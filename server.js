// 1. 모듈 불러오기
const express = require('express');
import cors from 'cors';
const cors = require('cors');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('✅ API 서버 동작 중'));

app.use(cors({
  origin: 'https://unatoparty.netlify.app'
}));


// 2. PostgreSQL 연결 설정
const { Pool } = require('pg');

const pool = new Pool({
  user: 'testdb_8gh2_user',          // User
  host: 'dpg-d43dl1hr0fns73etg7lg-a', // Host
  database: 'testdb_8gh2',        // Database
  password: 'GHUvNRQmwSXQ1BCjTfxJjJlV1lTn7UGK',  // Password
  port: 5432,
});


// 3. API 엔드포인트

// 전체 서버 공개 리스트
app.get('/api/server/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM server WHERE pub = true');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ API 호출 실패:', err.message);
    res.status(500).json({ error: "DB 조회 실패", detail: err.message });
  }
});

// 서버 추가
app.post('/api/server', async (req, res) => {
  try {
    const { port, pub, scr, pass } = req.body;
    const portInt = port;
    const pubBool = pub === true || pub === 'true';
    const passw = pass;

    // 중복 체크
    const check = await pool.query('SELECT COUNT(*) FROM server WHERE port=$1', [portInt]);
    if (check.rows[0].count > 0)
      return res.status(200).json({ duplicated: true, message: '이미 존재하는 port입니다.' });
    
    await pool.query(
      'INSERT INTO server (port, pub,script,pass) VALUES ($1, $2,$3,$4)',
      [portInt, pubBool, scr, passw]
    );

    res.json({ duplicated: false, message: '✅ 값 추가 성공' });
  } catch (err) {
    console.error('❌ 값 추가 실패:', err);
    res.status(500).json({ error: "DB 추가 실패", detail: err.message });
  }
});

// 특정 포트 조회
app.get('/api/server/:port', async (req, res) => {
  try {
    const port = req.params.port;
    const result = await pool.query('SELECT * FROM server WHERE port=$1', [port]);
    res.json(result.rows.length ? { exists: true, data: result.rows } : { exists: false });
  } catch (err) {
    console.error('❌ 조회 실패:', err.message);
    res.status(500).json({ error: 'DB 조회 실패', detail: err.message });
  }
});

// 특정 포트 수정
app.put('/api/server/:port', async (req, res) => {
  try {
    const port = req.params.port;
    const { newtalk } = req.body;

    const result = await pool.query(
      'UPDATE server SET talk=$1 WHERE port=$2',
      [String(newtalk ?? ""), port]
    );

    res.json(result.rowCount > 0
      ? { updated: true, message: '✅ 수정 성공' }
      : { updated: false, message: '포트를 찾을 수 없습니다' }
    );
  } catch (err) {
    console.error('❌ 수정 실패:', err);
    res.status(500).json({ error: 'DB 수정 실패', detail: err.message });
  }
});

// 특정 포트 삭제
app.delete('/api/server/:port', async (req, res) => {
  try {
    const port = req.params.port;
    if (isNaN(port))
      return res.status(400).json({ deleted: false, message: '유효하지 않은 포트 번호입니다.' });

    const result = await pool.query('DELETE FROM server WHERE port=$1', [port]);

    res.json(result.rowCount > 0
      ? { deleted: true, message: '✅ 삭제 성공' }
      : { deleted: false, message: '해당 포트가 존재하지 않습니다.' }
    );
  } catch (err) {
    console.error('❌ DELETE 요청 실패:', err);
    res.status(500).json({ error: 'DB 삭제 실패', detail: err.message });
  }
});

app.get('/api/server/:pass', async (req, res) => {
  try {
    const port = req.params.pass;
    const result = await pool.query('SELECT * FROM server WHERE pass=$1', [pass]);
    res.json(result.rows.length ? { exists: true, data: result.rows } : { exists: false });
  } catch (err) {
    console.error('❌ 조회 실패:', err.message);
    res.status(500).json({ error: 'DB 조회 실패', detail: err.message });
  }
});

// 4. 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행 중: http://localhost:${PORT}`));