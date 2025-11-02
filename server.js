// 1. 모듈 불러오기
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('✅ API 서버 동작 중'));
// 2. SQL Server 연결 설정
const config = {
  user: 'sa',
  password: 'e4e5ke2!!',
  server: 'whgudwnsdml-01\\SQLEXPRESS', // ← test-db.js에서 성공했던 그대로
  database: 'testdb',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// 3. API 엔드포인트 예시
app.get('/api/Table_1/', async (req, res) => {
  try {
    // DB 연결
    await sql.connect(config);
    const result = await sql.query`
      SELECT * FROM server WHERE pub = 1
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ API 호출 실패:', err.message);
    res.status(500).send('DB 쿼리 실패');
  }
});

app.post('/api/server', async (req, res) => {
  try {
    let { port, pub, scr } = req.body;
    port = parseInt(port);
    pub = pub === true || pub === 'true' ? 1 : 0;

    const pool = await sql.connect(config);
    const request = pool.request();

    request.input('port', sql.Int, port);
    request.input('pub', sql.Bit, pub);
    request.input('scr', sql.NVarChar(100), scr);


    // 중복 체크
    const check = await request.query(
      'SELECT COUNT(*) AS count FROM server WHERE port = @port'
    );

    if (check.recordset[0].count > 0) {
      return res.status(200).json({
        message: '⚠️ 이미 존재하는 port입니다.',
        duplicated: true
      });
    }

    // 추가
    await request.query(
      'INSERT INTO server (port, pub, cannot,script) VALUES (@port, @pub, 1,@scr)'
    );

    res.json({ message: '✅ 값 추가 성공', duplicated: false });

  } catch (err) {
    console.error('❌ 값 추가 실패:', err);
    res.status(500).json({ error: 'DB 추가 실패' });
  }
});


app.get('/api/server/:inputPort', async (req, res) => {
  const inputPort = parseInt(req.params.inputPort);
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT * FROM server WHERE port = ${inputPort}
    `;
    if (result.recordset.length > 0) {
      res.json({ exists: true, data: result.recordset });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('❌ 조회 실패:', err.message);
    res.status(500).json({ error: 'DB 조회 실패' });
  }
});

app.put('/api/server/:port', async (req, res) => {
  try {
    const port = parseInt(req.params.port);
    let { newtalk } = req.body;
    newtalk = String(newtalk ?? ""); // ✅ undefined/null 방지 + 문자열 변환

    const pool = await sql.connect(config);
    const request = pool.request();

    request.input('port', sql.Int, port);
    request.input('newtalk', sql.NVarChar(sql.MAX), newtalk); // ✅ 추가

    const result = await request.query(`
      UPDATE server
      SET talk = @newtalk
      WHERE port = @port
    `);

    if (result.rowsAffected[0] > 0) {
    } else {
      res.status(404).json({ message: '이 포트를 찾을수 없습니다 방장이 서버를 삭제했을수 있습니다', updated: false });
    }

  } catch (err) {
    console.error('❌ 수정 실패:', err);
    res.status(500).json({ error: 'DB 수정 실패' });
  }
});

app.get('/api/server/:port2', async (req, res) => {
  try {
    const port2 = parseInt(req.params.port2);
    console.log("조회 포트:", port2);

    const pool = await sql.connect(config);
    const request = pool.request();

    // 타입 지정
    request.input('port', sql.Int, port2);

    // 반드시 @port 사용
    const result = await request.query('SELECT * FROM server WHERE port = @port2');

    console.log("조회 결과:", result.recordset);

    if (result.recordset.length > 0) {
      res.json({ exists: true, data: result.recordset });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('❌ 조회 실패:', err.message);
    res.status(500).json({ error: 'DB 조회 실패' });
  }
});

// DELETE /api/server/:port
app.delete('/api/server/:port', async (req, res) => {
  try {
    const port = parseInt(req.params.port);
    if (isNaN(port)) {
      return res.status(400).json({ deleted: false, message: '유효하지 않은 포트 번호입니다.' });
    }

    const pool = await sql.connect(config);
    const request = pool.request();
    request.input('port', sql.Int, port);

    const result = await request.query(`
      DELETE FROM server
      WHERE port = @port
    `);

    if (result.rowsAffected[0] > 0) {
      res.json({ deleted: true, message: '삭제 성공' });
    } else {
      res.status(404).json({ deleted: false, message: '해당 포트가 존재하지 않습니다.' });
    }

  } catch (err) {
    console.error('❌ DELETE 요청 실패:', err);
    res.status(500).json({ deleted: false, message: 'DB 삭제 실패' });
  }
});








// 4. 서버 시작
app.listen(3000, () => {
  console.log('✅ 서버 실행 중: http://localhost:3000');
});

