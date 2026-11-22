let whiteQueue = [];
let blackQueue = [];
const MAX_QUEUE = 3;

let placementMode = false;
let selectedShopPiece = null;

let blackPlan = [];

let picee

const reservedPieces = new Set();      // 예약된 기물
const reservedCells = new Map();       // "x,y" -> 예약 정보

let reserving = true;

let virtualBoard = [];

let lang
let selectedX = null;
let selectedY = null;
let selectedPiece = null;
let pinx = null;
let piny = null;
let origin = 0;
const movementByType = {};
const dslVars = {};
let turn = null;
let jx = null;
let jy = null;
let jnx = null;
let jny = null;
let jcx;
let jcy;
let lmplett;
let lmpletc;

let generatedMoves = [];

let langpl = `
newmovementfor(wpm){move(0,2)}newmovementfor(bpm){move(0,-2)}
newmovementfor(ko){
over(@casle,0)
if(tiwp,@casle,3,0,r,1)
if(run,@casle,1,koo)
over(@casle,0)
if(tiwp,@casle,-4,0,r,1)
if(run,@casle,1,rooo)
over(@casle,0)
}
newmovementfor(koo){
shiftjump(3,0,1,0,2,0,0)
}
newmovementfor(rooo){
over(@casle,0)
if(pit,@casle,1,0)
if(run,@casle,0,kooo)
}
newmovementfor(kooo){
shiftjump(-4,0,-1,0,-2,0,0)
}
`

const pieceStat = {

    p: {
        atk: 1,
        atkDice: [0, 0, 0, 1, 2, 5],

        def: 0,
        defDice: [0, 0, 1, 1, 2, 2]

        , moveType: "short"
        , defendType: "atk"
    },

    n: {
        atk: 3,
        atkDice: [0, 1, 2, 2, 3, 4],

        def: 3,
        defDice: [0, 0, 1, 2, 2, 3]

        , moveType: "irre"
        , defendType: "spe"
    },

    b: {
        atk: 3,
        atkDice: [0, 1, 2, 2, 3, 6],

        def: 2,
        defDice: [0, 0, 0, 1, 1, 2]

        , moveType: "long"
        , defendType: "atk"
    },

    r: {
        atk: 4,
        atkDice: [0, 0, 0, 2, 2, 4],

        def: 5,
        defDice: [2, 3, 4, 5, 6, 6]

        , moveType: "long"
        , defendType: "def"
    },

    q: {
        atk: 9,
        atkDice: [0, 0, 0, 1, 2, 4],

        def: 5,
        defDice: [0, 1, 1, 2, 2, 3]

        , moveType: "long"
        , defendType: "spe"
    },

    k: {
        atk: 3,
        atkDice: [1, 2, 3, 4, 4, 4],

        def: 0,
        defDice: [0, 0, 0, 0, 0, 0]

        , moveType: "short"
        , defendType: "proed"
    }
};
const combatMatchup = {
    short: {
        atk: +1.5,
        def: 0,
        spe: -1.5,
        proed: -1.5,
    },
    long: {
        atk: 0,
        def: -1.5,
        spe: +1.5,
        proed: +1.5,
    },
    irre: {
        atk: -1.5,
        def: +1.5,
        spe: 0,
        proed: 0,
    }
}

function rollDice() {
    return Math.floor(Math.random() * 6);
}

async function canCapture(attacker, defender) {
    if (!attacker || !defender) return true;

    const atkStat = pieceStat[attacker.dataset.type];
    const defStat = pieceStat[defender.dataset.type];

    if (!atkStat || !defStat) return false;

    const atkDice = rollDice();
    const defDice = rollDice();

    // 상성 보정 계산
    const matchupBonus = getMatchupBonus(attacker, defender);

    const atk = {
        dice: atkDice + 1,
        matchup: matchupBonus,
        value: atkStat.atk + atkStat.atkDice[atkDice] + matchupBonus
    };

    const def = {
        dice: defDice + 1,
        value: defStat.def + defStat.defDice[defDice]
    };

    const success = atk.value > def.value;

    console.log("공격 결과:", atk.value);
    console.log("방어 결과:", def.value);
    console.log("전투 결과:", success);

    // 클릭할 때까지 여기서 대기
    await showCombatResult(
        attacker,
        defender,
        atk,
        def,
        success
    );

    return success;
}






function canReserveMore(color) {

    const pieces = [...document.querySelectorAll(".piece")]
        .filter(p =>
            p.dataset.color.replace(/^tx/, "") === color &&
            !reservedPieces.has(p)
        );

    for (const piece of pieces) {

        const cell = piece.parentElement;
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);

        // 행마 생성
        handlePieceClick(piece, x, y);

        if (generatedMoves.length > 0) {
            delMoves();
            return true;
        }

        delMoves();
    }

    return false;
}

function drawBlackArrow(piece, targetCell) {

    const board = document.getElementById("chessboard");
    const canvas = document.getElementById("arrowCanvas");

    if (!board || !canvas) return;

    const ctx = canvas.getContext("2d");

    const b = board.getBoundingClientRect();
    const p = piece.getBoundingClientRect();
    const t = targetCell.getBoundingClientRect();

    const x1 = p.left + p.width / 2 - b.left;
    const y1 = p.top + p.height / 2 - b.top;

    const x2 = t.left + t.width / 2 - b.left;
    const y2 = t.top + t.height / 2 - b.top;

    //------------------------------------
    // 곡선 계산
    //------------------------------------

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 25;

    //------------------------------------
    // 화살촉이 선분을 먹지 않도록
    //------------------------------------

    const angle = Math.atan2(y2 - my, x2 - mx);

    const head = 14;

    const endX = x2 - Math.cos(angle) * (head - 2);
    const endY = y2 - Math.sin(angle) * (head - 2);

    //------------------------------------
    // 선
    //------------------------------------

    ctx.save();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, endX, endY);
    ctx.stroke();

    //------------------------------------
    // 화살촉
    //------------------------------------

    ctx.beginPath();
    ctx.moveTo(x2, y2);

    ctx.lineTo(
        x2 - head * Math.cos(angle - Math.PI / 6),
        y2 - head * Math.sin(angle - Math.PI / 6)
    );

    ctx.lineTo(
        x2 - head * Math.cos(angle + Math.PI / 6),
        y2 - head * Math.sin(angle + Math.PI / 6)
    );

    ctx.closePath();

    ctx.fillStyle = "red";
    ctx.fill();

    ctx.restore();
}

function setchess() {

    for (let dy = 7; dy > -1; dy--) {
        for (let dx = 7; dx > -1; dx--) {
            const ddiv = document.querySelector(`div[data-x="${dx}"][data-y="${dy}"]`);
            ddiv.dataset.bpower = 0
            ddiv.dataset.wpower = 0
            ddiv.innerHTML = '';
        }
        dx = 8
    }

    force = `uset(w,r,0,0)set(w,n,1,0)set(w,b,2,0)set(w,q,3,0)uset(w,r,7,0)set(w,n,6,0)set(w,b,5,0)uset(w,k,4,0)
    uset(w,p,0,1)uset(w,p,1,1)uset(w,p,2,1)uset(w,p,3,1)uset(w,p,7,1)uset(w,p,6,1)uset(w,p,5,1)uset(w,p,4,1)
    uset(b,r,0,7)set(b,n,1,7)set(b,b,2,7)set(b,q,3,7)uset(b,r,7,7)set(b,n,6,7)set(b,b,5,7)set(b,k,4,7)
    uset(b,p,0,6)uset(b,p,1,6)uset(b,p,2,6)uset(b,p,3,6)uset(b,p,7,6)uset(b,p,6,6)uset(b,p,5,6)uset(b,p,4,6)`
    fmove()

    lang = lang + langpl
    const str = lang;
    parseNewMovementFor(lang);

    const timerId = setTimeout(() => {
        yesturn();
    }, 100);


}

const NO_RESOLVE_COMMANDS = new Set([
    "make",
    "over",
    "if",
    "pp",
    "outvar",
]);

function clearBlackPreview() {

    const canvas = document.getElementById("arrowCanvas");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showBlackPreview() {

    const board = document.getElementById("chessboard");
    const canvas = document.getElementById("arrowCanvas");

    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const move of blackPlan) {

        const cell = document.querySelector(
            `div[data-x="${move.x}"][data-y="${move.y}"]`
        );

        if (!cell) continue;

        drawBlackArrow(move.piece, cell);
    }
    turn = 'w'
}

async function executeBlackPlan() {

    clearBlackPreview();

    for (const move of blackPlan) {

        // 이미 잡힌 기물은 실행하지 않는다.
        if (!move.piece.isConnected)
            continue;

        if (!document.body.contains(move.piece))
            continue;

        selectedPiece = move.piece;

        const cell = move.piece.parentElement;

        if (!cell)
            continue;

        selectedX = Number(cell.dataset.x);
        selectedY = Number(cell.dataset.y);

        await move.exec();

        await new Promise(r => setTimeout(r, 250));
    }

    blackPlan = [];

    turn = "w";
    document.getElementById("turn").innerText = "백턴";

    await makeBlackPlan();
}

function removeReservedMoves() {

    for (const [key] of reservedCells) {

        const [x, y] = key.split(",").map(Number);

        const cell = document.querySelector(
            `div[data-x="${x}"][data-y="${y}"]`
        );

        if (!cell) continue;

        if (!cell._moves) continue;

        cell._moves.forEach(m => m.node.remove());

        delete cell._moves;
        delete cell._activeMove;
    }
}

async function blackAI3() {

    const usedPieces = new Set();

    for (let i = 0; i < 3; i++) {
        await blackAI(usedPieces);
        await new Promise(r => setTimeout(r, 250));
    }

    turn = "w";
    document.getElementById("turn").innerText = "백턴";
}

function rebuildReservedCells() {

    reservedCells.clear();

    const queue = (turn === "w") ? whiteQueue : blackQueue;

    for (const move of queue) {
        reservedCells.set(`${move.x},${move.y}`, move);
    }
}

async function makeBlackPlan() {

    blackPlan = [];

    const usedPieces = new Set();

    // 이미 예약된 목적지
    const reservedTargets = new Set();

    while (blackPlan.length < 3) {

        const move = await blackAI(usedPieces, reservedTargets);

        if (!move)
            break;

        const key = `${move.x},${move.y}`;

        // 혹시 중복이 들어오면 무시
        if (reservedTargets.has(key))
            continue;

        reservedTargets.add(key);
        blackPlan.push(move);
        turn = 'w'
    }

    showBlackPreview();
}

async function blackAI(usedPieces, reservedTargets) {
    turn = 'b'
    let bestMove = null;
    let bestScore = -999999;

    const value = {
        k: 10000,
        q: 900,
        r: 500,
        b: 300,
        n: 300,
        p: 100,
        m: 50
    };

    const pieces = [...document.querySelectorAll(".piece")]
        .filter(p =>
            p.dataset.color === "b" &&
            !usedPieces.has(p)
        )
        .sort(() => Math.random() - 0.5);

    for (const piece of pieces) {

        if (piece.dataset.color !== "b")
            continue;

        const cell = piece.parentElement;
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);

        await handlePieceClick(piece, x, y);

        console.log("dddddddddddddddbbbbbb",
            piece.dataset.type,
            x,
            y,
            "move-node:",
            document.querySelectorAll(".move-node").length,
            "_moves:",
            piece.parentElement._moves
        );

        console.log(
            "piece cell",
            piece.parentElement,
            piece.parentElement.dataset.x,
            piece.parentElement.dataset.y
        );

        console.log("제너레이트무브즈", generatedMoves);

        for (const move of generatedMoves) {

            const node = move.node;

            const tx = Number(node.parentElement.dataset.x);
            const ty = Number(node.parentElement.dataset.y);

            const key = `${tx},${ty}`;

            // 이미 다른 흑 기물이 예약한 칸이면 후보 제외
            if (reservedTargets.has(key))
                continue;

            let score = 0;

            if (node.classList.contains("move"))
                score += 110;

            if (node.classList.contains("take"))
                score += 110;

            if (node.classList.contains("take-move"))
                score += 110;

            if (node.classList.contains("shift"))
                score += 90;

            if (node.classList.contains("take-jump"))
                score += 120;

            // 잡는 기물 가치
            if (
                node.classList.contains("take") ||
                node.classList.contains("take-move") ||
                node.classList.contains("shift")
            ) {

                const target = node.parentElement.querySelector(".piece");

                if (target)
                    score += value[target.dataset.type] || 0;
            }

            score += Math.random() * 5;

            if (score > bestScore) {

                bestScore = score;
                picee = piece;
                bestMove = {
                    piece,
                    x,
                    y,
                    className: node.className,
                    targetX: tx,
                    targetY: ty,
                    exec: move.exec
                };
            }
        }

        delMoves();
    }

    if (!bestMove) {
        return;
    }

    usedPieces.add(bestMove.piece);
    return {
        piece: bestMove.piece,
        x: bestMove.targetX,
        y: bestMove.targetY,
        exec: bestMove.exec
    };
}


async function queueMove(move) {
    const queue = (turn === "w") ? whiteQueue : blackQueue;
    const key = `${move.x},${move.y}`;

    const isPlace = move.kind === "place";

    // 일반 이동은 같은 기물을 중복 예약할 수 없음
    if (!isPlace && reservedPieces.has(move.piece)) {
        return;
    }

    // 목적지가 이미 예약되어 있는지 검사
    if (reservedCells.has(key)) {
        const old = reservedCells.get(key);

        // 기존 일반 이동 예약 정리
        if (old.piece) {
            old.piece.classList.remove("reserved");
            old.piece.style.opacity = "";
            old.piece.style.outline = "";
            reservedPieces.delete(old.piece);
        }

        // 기존 배치 예약 표시 정리
        if (old.kind === "place") {
            const oldCell = document.querySelector(
                `div[data-x="${old.x}"][data-y="${old.y}"]`
            );
            oldCell?.classList.remove("reserved-placement");
        }

        const idx = queue.indexOf(old);
        if (idx !== -1) queue.splice(idx, 1);

        reservedCells.delete(key);
    }

    // 예약 등록
    queue.push(move);
    reservedCells.set(key, move);

    if (isPlace) {
        // 배치 예약 표시
        const cell = document.querySelector(
            `div[data-x="${move.x}"][data-y="${move.y}"]`
        );
        cell?.classList.add("reserved-placement");

    } else {
        // 일반 이동 예약 표시
        reservedPieces.add(move.piece);

        move.piece.classList.add("reserved");
        move.piece.style.opacity = "0.45";
        move.piece.style.outline = "3px solid orange";
    }

    delMoves();

    if (queue.length < MAX_QUEUE) {
        return;
    }

    // 예약 실행
    for (const m of [...queue]) {

        // =================================
        // 상점에서 구매한 기물 배치
        // =================================
        if (m.kind === "place") {
            const cell = document.querySelector(
                `div[data-x="${m.x}"][data-y="${m.y}"]`
            );

            try {
                if (cell && !cell.querySelector(".piece")) {
                    force = `set(@${m.color}, @${m.pieceType}, ${m.x}, ${m.y}, ${m.small})`;

                    await fmove();
                } else {
                    console.warn("배치 실패: 해당 칸이 비어 있지 않습니다.");
                }

            } catch (error) {
                console.error("예약 배치 실행 오류:", error);

            } finally {
                cell?.classList.remove("reserved-placement");
                reservedCells.delete(`${m.x},${m.y}`);
            }

            await new Promise(r => setTimeout(r, 250));
            continue;
        }

        // =================================
        // 기존 일반 이동
        // =================================
        const piece = m.piece;

        selectedPiece = piece;

        piece.classList.remove("reserved");
        piece.style.opacity = "";
        piece.style.outline = "";

        const cell = piece.parentElement;

        if (!cell) {
            reservedPieces.delete(piece);
            reservedCells.delete(`${m.x},${m.y}`);
            continue;
        }

        selectedX = Number(cell.dataset.x);
        selectedY = Number(cell.dataset.y);

        try {
            await m.exec(m.x, m.y);

        } catch (error) {
            console.error("예약 이동 실행 오류:", error);

        } finally {
            piece.classList.remove("reserved");
            piece.style.opacity = "";
            piece.style.outline = "";

            reservedPieces.delete(piece);
            reservedCells.delete(`${m.x},${m.y}`);
        }

        await new Promise(r => setTimeout(r, 250));
    }

    // 예약 초기화
    queue.length = 0;

    reservedPieces.clear();
    reservedCells.clear();

    document.querySelectorAll(".reserved-placement")
        .forEach(cell => cell.classList.remove("reserved-placement"));

    // 턴 종료
    if (turn === "w") {
        turn = "b";
        document.getElementById("turn").innerText = "흑턴";

        await executeBlackPlan();

    } else {
        turn = "w";
        document.getElementById("turn").innerText = "백턴";

        await makeBlackPlan();
    }
}


function delchess() {
    for (let dy = 7; dy > -1; dy--) {
        for (let dx = 7; dx > -1; dx--) {
            const ddiv = document.querySelector(`div[data-x="${dx}"][data-y="${dy}"]`);
            ddiv.innerHTML = '';
        }
        dx = 8
    }
    lang = lang + langpl
    const str = lang;
    parseNewMovementFor(lang);
    const board = document.querySelector("#chessboard");
    const overlay = document.createElement("div");
    overlay.className = "combat-pause-overlay";
    overlay.textContent = "기권 - 흑 승 클릭하면 닫기.";

    board.appendChild(overlay);

    // 플레이어가 클릭할 때까지 대기
    return new Promise(resolve => {
        overlay.addEventListener("click", () => {
            overlay.remove();
            resolve();
            setchess();
        }, { once: true });
    });

}




function ok() {
    lang = document.getElementById("inp").value
    lang = lang + langpl
    const str = lang;
    parseNewMovementFor(lang);

    const tokens = callrc(lang);
    console.log(tokens);
}

// --- 1) 명령어 파싱 ---
function parseCalls(str) {
    const callRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
    const results = [];
    let match;

    while ((match = callRegex.exec(str)) !== null) {
        const name = match[1];
        const argsRaw = match[2].trim();
        const args = argsRaw
            ? argsRaw.split(/\s*,\s*/).map(v => {
                if (v.startsWith("@")) {
                    return { raw: v.slice(1) }; // 치환 금지
                }
                return !isNaN(v) ? Number(v) : v;
            })
            : [];
        results.push({ name, args });
    }
    return results;
}

function parseIfBlocks(str) {
    const regex = /ifvaris\s*\(\s*([A-Za-z_]\w*)\s*,\s*([^)]+)\s*\)\s*\{([\s\S]*?)\}/g;
    const results = [];
    let match;

    while ((match = regex.exec(str)) !== null) {
        results.push({
            varName: match[1],
            value: !isNaN(match[2]) ? Number(match[2]) : match[2],
            body: match[3].trim()
        });
    }

    return results;
}


function evalCondition(cond) {
    // 변수 치환
    const expr = cond.replace(
        /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
        name => (name in dslVars ? dslVars[name] : name)
    );

    try {
        return Function(`"use strict"; return (${expr})`)();
    } catch {
        return false;
    }
}


function parseNewMovementFor(lang) {
    const regex = /newmovementfor\((\w+)\)\s*{([\s\S]*?)}/g;
    let match;

    while ((match = regex.exec(lang)) !== null) {
        const type = match[1];
        const body = match[2];

        const calls = parseCalls(body); // 🔥 여기서 사용

        if (!movementByType[type]) {
            movementByType[type] = [];
        }

        movementByType[type].push(...calls);
    }
}



// --- 2) 명령어 실행 함수 모음 (여기만 수정하면 계속 확장 가능!) ---
const handlers = {

    alert: (x) => {

        alert(x);

    },

    takejump: (x, y, jqx, jqy) => {

        if (x < 0 || x > 7 || y < 0 || y > 7) return;
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
        if (!parentDiv) return;

        let piece = parentDiv.querySelector(".piece"); // 해당 칸의 기물 확인

        const colorKey = piece ? piece.dataset.color.replace(/^tx/, '') : null;
        const selectedColor = selectedPiece.dataset.color.replace(/^tx/, '');

        // 아군이면 막기
        if (colorKey && colorKey === selectedColor) return;
        //빈칸도 종료
        if (!colorKey) return;

        jx = jqx + x;
        jy = jqy + y;
        jnx = x
        jny = y

        if (jx < 0 || jx > 7 || jy < 0 || jy > 7) return;
        let cell = document.querySelector(`div[data-x="${jx}"][data-y="${jy}"]`);
        if (!cell) return;

        piece = cell.querySelector(".piece");

        if (!piece) {
            console.log("Doing TAKE with", x, y);
            let parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            addMove(parentDiv, {
                kind: "take-fake",
            });
            parentDiv = document.querySelector(`div[data-x="${jx}"][data-y="${jy}"]`);
            addMove(cell, {
                kind: "take-jump",
                exec: () => handleJump(x, y)
            });
        }
    },

    move: (x, y) => {

        console.log("handleMove");
        console.log(selectedPiece);
        console.log(selectedX, selectedY);

        if (x < 0 || x > 7 || y < 0 || y > 7) return;
        const cell = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
        if (!cell) return;

        const piece = cell.querySelector(".piece");

        if (!piece) {

            console.log("Doing MOVE with", x, y);

            addMove(cell, {
                kind: "move",
                exec: () => handleMove(x, y)   // CSS 클래스 suffix
            });
        }
    },

    takemove: (x, y) => {
        if (!selectedPiece) return;
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        const cell = document.querySelector(
            `div[data-x="${x}"][data-y="${y}"]`
        );
        if (!cell) return;

        const piece = cell.querySelector(".piece");


        const colorKey = piece ? piece.dataset.color.replace(/^tx/, '') : null;
        const selectedColor = selectedPiece.dataset.color.replace(/^tx/, '');

        // 아군이면 막기
        if (colorKey && colorKey === selectedColor) return;

        console.log("Doing TAKEMOVE with", x, y);

        // ✅ 행마 생성은 addMove만
        addMove(cell, {
            kind: "take-move",
            exec: () => handleTakeMove(x, y)
        });
    },

    take: (x, y) => {
        if (x < 0 || x > 7 || y < 0 || y > 7) return;
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
        if (!parentDiv) return;

        const piece = parentDiv.querySelector(".piece"); // 해당 칸의 기물 확인

        const colorKey = piece ? piece.dataset.color.replace(/^tx/, '') : null;
        const selectedColor = selectedPiece.dataset.color.replace(/^tx/, '');

        // 아군이면 막기
        if (colorKey && colorKey === selectedColor) return;
        //빈칸도 종료
        if (!colorKey) return;
        console.log("Doing TAKE with", x, y);
        addMove(parentDiv, {
            kind: "take",   // CSS 클래스 suffix
            exec: () => handleTakeMove(x, y)
        });
    },

    catch: (x, y) => {
        if (!selectedPiece) return;
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        const parentDiv = document.querySelector(
            `div[data-x="${x}"][data-y="${y}"]`
        );
        if (!parentDiv) return;

        const piece = parentDiv.querySelector(".piece");
        if (!piece) return;

        const colorKey = piece.dataset.color.replace(/^tx/, '');
        const selectedColor = selectedPiece.dataset.color.replace(/^tx/, '');

        if (colorKey === selectedColor) return;

        addMove(parentDiv, {
            kind: "catch",   // CSS 클래스 suffix
            exec: () => handleCatch(x, y)
        });
    },

    void: (x, y) => {
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        console.log("Doing VOID with", x, y);
        // 1. 새로운 p 태그 생성
        const newChild = document.createElement("div");
        newChild.setAttribute('class', 'move-node void');
        // 2. 부모 div 찾기 (id가 parent인 경우)
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

        // 3. 자식 태그로 추가
        parentDiv.appendChild(newChild);
    },

    shiftall: (mode, pawn) => {
        if (!selectedPiece) return;
        console.log(mode, pawn, "쉽올")
        if (mode == 0) {
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const cell = document.querySelector(
                        `div[data-x="${x}"][data-y="${y}"]`
                    );
                    if (!cell) continue;


                    const piece = cell.querySelector(".piece");
                    if (!piece) continue;
                    const whattp = piece.dataset.type


                    if (piece === selectedPiece) continue;
                    if (whattp == pawn && pawn !== null) continue;

                    addMove(cell, {
                        kind: "shift",   // CSS 클래스 suffix
                        exec: () => handleShift(x, y)
                    });
                }
            }
        }
        if (mode == 1) {
            const selectedColor =
                selectedPiece.dataset.color?.replace(/^tx/, '');
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const cell = document.querySelector(
                        `div[data-x="${x}"][data-y="${y}"]`
                    );
                    if (!cell) continue;

                    const piece = cell.querySelector(".piece");
                    if (!piece) continue;
                    const whattp = piece.dataset.type


                    if (piece === selectedPiece) continue;
                    if (whattp == pawn && pawn !== null) continue;

                    const colorKey =
                        piece.dataset.color?.replace(/^tx/, '');

                    if (colorKey !== selectedColor) continue;

                    addMove(cell, {
                        kind: "shift",   // CSS 클래스 suffix
                        exec: () => handleShift(x, y)
                    });
                }
            }
        }
        if (mode == 2) {
            const selectedColor =
                selectedPiece.dataset.color?.replace(/^tx/, '');
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const cell = document.querySelector(
                        `div[data-x="${x}"][data-y="${y}"]`
                    );
                    if (!cell) continue;

                    const piece = cell.querySelector(".piece");
                    if (!piece) continue;
                    const whattp = piece.dataset.type

                    if (piece === selectedPiece) continue;
                    if (whattp == pawn && pawn !== null) continue;

                    const colorKey =
                        piece.dataset.color?.replace(/^tx/, '');

                    if (colorKey === selectedColor) continue;

                    addMove(cell, {
                        kind: "shift",   // CSS 클래스 suffix
                        exec: () => handleShift(x, y)
                    });
                }
            }
        }
    },

    shift: (x, y, mode, pawn) => {
        if (!selectedPiece) {
            console.log("셀피없음");
            return;
        }
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        const parentDiv = document.querySelector(
            `div[data-x="${x}"][data-y="${y}"]`
        );
        if (!parentDiv) return;

        const selectedColor =
            selectedPiece.dataset.color?.replace(/^tx/, '');

        const piece = parentDiv.querySelector(".piece");
        if (!piece) return;
        const whattp = piece.dataset.type

        if (piece === selectedPiece) return;
        if (mode == 0) {
            console.log("mode 0")
            if (whattp == pawn && pawn !== null) return;
        }
        else if (mode == 1) {
            console.log("mode 1")
            const colorKey = piece.dataset.color?.replace(/^tx/, '');
            if (colorKey !== selectedColor) return;
            if (whattp == pawn && pawn !== null) return;
        }
        else if (mode == 2) {
            console.log("mode 2")
            const colorKey = piece.dataset.color?.replace(/^tx/, '');
            if (colorKey === selectedColor) return;
            if (whattp == pawn && pawn !== null) return;
        }

        addMove(parentDiv, {
            kind: "shift",   // CSS 클래스 suffix
            exec: () => handleShift(x, y)
        });
    },

    shiftjump: (x, y, x2, y2, x3, y3, mode) => {
        if (!selectedPiece) {
            console.log("셀피없음");
            return;
        }
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        let parentDiv = document.querySelector(
            `div[data-x="${x}"][data-y="${y}"]`
        );
        if (!parentDiv) return;

        let selectedColor =
            selectedPiece.dataset.color?.replace(/^tx/, '');

        let piece = parentDiv.querySelector(".piece");


        if (!piece) return;
        if (piece === selectedPiece) return;
        if (mode == 0) {
            console.log("mode 0")
        }
        else if (mode == 1) {
            console.log("mode 1")
            let colorKey = piece.dataset.color?.replace(/^tx/, '');
            if (colorKey === selectedColor) return;
        }
        else if (mode == 2) {
            console.log("mode 2")
            let colorKey = piece.dataset.color?.replace(/^tx/, '');
            if (colorKey !== selectedColor) return;
        }

        if (!selectedPiece) {
            console.log("셀피없음");
            return;
        }

        x2 = x2 + selectedX
        y2 = y2 + selectedY


        const parentDiv2 = document.querySelector(
            `div[data-x="${x2}"][data-y="${y2}"]`
        );
        if (!parentDiv2) return;
        piece = parentDiv2.querySelector(".piece");
        if (!piece || selectedPiece == piece) {

            x3 = x3 + selectedX
            y3 = y3 + selectedY

            const parentDiv3 = document.querySelector(
                `div[data-x="${x3}"][data-y="${y3}"]`
            );
            if (!parentDiv3) return;
            piece = parentDiv3.querySelector(".piece");
            if (!piece || selectedPiece == piece) {

                addMove(parentDiv, {
                    kind: "take-fake",   // CSS 클래스 suffix
                });

                addMove(parentDiv2, {
                    kind: "jump-fake",   // CSS 클래스 suffix
                });

                console.log('sjjjjjjj', x, y, x2, y2, x3, y3)
                addMove(parentDiv3, {
                    kind: "shift-jump",
                    data: {
                        x1: x,
                        y1: y,
                        x2: x2,
                        y2: y2,
                        x3: x3,
                        y3: y3
                    },
                    exec: (node) => {
                        const d = node.dataset;
                        handleShiftJump(
                            +d.x1, +d.y1,
                            +d.x2, +d.y2,
                            +d.x3, +d.y3
                        );
                    }
                });
            }
        }
    },

    hold: (x, y) => {
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        console.log("Doing HOLD with", x, y);
        // 1. 새로운 p 태그 생성
        const newChild = document.createElement("div");
        newChild.setAttribute('class', 'move-node pause');
        // 2. 부모 div 찾기 (id가 parent인 경우)
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

        // 3. 자식 태그로 추가
        parentDiv.appendChild(newChild);
    },

    block: (x, y) => {
        if (x < 0 || x > 7 || y < 0 || y > 7) return;

        console.log("Doing BLOCK with", x, y);
        // 1. 새로운 p 태그 생성
        const newChild = document.createElement("div");
        newChild.setAttribute('class', 'move-node block');
        // 2. 부모 div 찾기 (id가 parent인 경우)
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

        // 3. 자식 태그로 추가
        parentDiv.appendChild(newChild);
    },

    stop: (s) => {
        return new Promise(resolve => {
            console.log("STOP for " + s + " seconds");
            setTimeout(() => {
                console.log("STOP finished");
                resolve();
            }, s * 1000);
        });
    },

    del: (x, y) => {
        console.log("Doing DELETE with", x, y);

        if (x === 'all') {
            for (let dy = 0; dy < 8; dy++) {
                for (let dx = 0; dx < 8; dx++) {
                    const ddiv = document.querySelector(`div[data-x="${dx}"][data-y="${dy}"]`);
                    ddiv.dataset.bpower = 0
                    ddiv.dataset.wpower = 0
                    ddiv.innerHTML = '';
                }
            }
        } else {
            const ddiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            if (ddiv) ddiv.innerHTML = '';
        }

        // 즉시 완료되므로 Promise 필요 없음
    },

    emp: (x, y) => {
        console.log("Doing EMP with", x, y);

        const newChild = document.createElement("div");
        newChild.setAttribute('class', 'emp');
        const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
        parentDiv.appendChild(newChild);
    },

    longtakemove: (dx, dy) => {
        const cells = repeatRay(selectedX, selectedY, dx, dy);

        for (const c of cells) {

            // 1️⃣ 빈 칸 → 이동 가능
            if (!c.occupied) {
                handlers.takemove(c.x, c.y);
                continue;
            }

            // 2️⃣ 기물 있음
            if (c.enemy) {
                handlers.takemove(c.x, c.y);
            }

            // 3️⃣ 적이든 아군이든 여기서 중단
            break;
        }
    },

    longmove: (dx, dy) => {
        const cells = repeatRay(selectedX, selectedY, dx, dy);

        for (const c of cells) {

            // 1️⃣ 빈 칸 → 이동 가능
            if (!c.occupied) {
                handlers.move(c.x, c.y);
                continue;
            }

            // 2️⃣ 기물 있음
            if (c.enemy) {

            }

            // 3️⃣ 적이든 아군이든 여기서 중단
            break;
        }
    },

    longtake: (dx, dy) => {
        const cells = repeatRay(selectedX, selectedY, dx, dy);

        for (const c of cells) {

            // 1️⃣ 빈 칸 → 이동 가능
            if (!c.occupied) {
                continue;
            }

            // 2️⃣ 기물 있음
            if (c.enemy) {
                handlers.take(c.x, c.y);
            }

            // 3️⃣ 적이든 아군이든 여기서 중단
            break;
        }
    },

    longtakejump: (x, y) => {
        console.log(jnx, jny);

        jnx = jnx + x;
        jny = jny + y;

        console.log("eeee", x, y, jnx, jny);

        let cells = repeatRay(selectedX, selectedY, x, y);


        for (const c of cells) {

            // 1️⃣ 빈 칸 → 이동 가능
            if (!c.occupied) {
                continue;
            }

            // 2️⃣ 기물 있음
            if (c.enemy) {
                console.log("Doing TAKE with", c.x, c.y);
                // 1. 새로운 p 태그 생성
                newChild = document.createElement("div");
                newChild.setAttribute('class', 'move-node take-fake');
                // 2. 부모 div 찾기 (id가 parent인 경우)
                parentDiv = document.querySelector(`div[data-x="${c.x}"][data-y="${c.y}"]`);
                jcx = c.x
                jcy = c.y
                // 3. 자식 태그로 추가
                parentDiv.appendChild(newChild);

                let cells = repeatRay(jcx, jcy, x, y);

                for (const c of cells) {

                    // 1️⃣ 빈 칸 → 이동 가능
                    if (!c.occupied) {
                        console.log("Doing JMUP with", c.x, c.y);
                        // 1. 새로운 p 태그 생성
                        newChild = document.createElement("div");
                        newChild.setAttribute('class', 'move-node take-jump-long');
                        newChild.setAttribute('data-tx', jcx);
                        newChild.setAttribute('data-ty', jcy);
                        // 2. 부모 div 찾기 (id가 parent인 경우)
                        parentDiv = document.querySelector(`div[data-x="${c.x}"][data-y="${c.y}"]`);
                        // 3. 자식 태그로 추가
                        parentDiv.appendChild(newChild);
                        continue;
                    }

                    if (c.enemy) {
                        continue;
                    }

                    break;
                }
            }

            // 3️⃣ 적이든 아군이든 여기서 중단
            break;
        }



    },




    moveorigin: (dx, dy) => {
        if (selectedX == null || selectedY == null) return;
        origin = 1
        console.log("ORIGIN moved to(b)", selectedX, selectedY, dx, dy);
        // 새 origin 계산 (항상 "현재 origin 기준")
        selectedX = selectedX + dx;
        selectedY = selectedY + dy;

        console.log("ORIGIN moved to", selectedX, selectedY, dx, dy);
    },

    back: () => {
        if (selectedX == null || selectedY == null || pinx == null || piny == null) return;
        console.log(pinx, piny, "bbbbbbbbbbbbbbbbbbbbbbb")
        selectedX = pinx
        selectedY = piny
        origin = 0

        console.log("BACK to", selectedX, selectedY, pinx, piny);
    },

    make: (name, value) => {
        dslVars[name] = value;
        console.log("make" + name)
    },

    over: (name, value) => {
        dslVars[name] = value;
        console.log("over" + name + value + dslVars[name])
    },

    pp: (varName) => {
        let or = dslVars[varName]
        dslVars[varName] = dslVars[varName] + 1
        let re = dslVars[varName]
        console.log(or, re, "플플")
    },

    mm: (varName) => {
        let or = dslVars[varName]
        dslVars[varName] = dslVars[varName] - 1
        let re = dslVars[varName]
        console.log(or, re, "마마")
    },

    turn: (worb) => {
        turn = worb
    },


    if: async (what, varName, x, y, ant, el) => {

        if (what == 'pieceisthere' || what == 'pit') {

            x = x + selectedX
            y = y + selectedY

            console.log("피스 검사중...", x, y, varName, selectedX, selectedY);

            if (x > 7 || x < 0 || y > 7 || y < 0) {
                return;
            }

            const cell = document.querySelector(
                `div[data-x="${x}"][data-y="${y}"]`
            );

            const piece = cell.querySelector(".piece");
            if (piece !== null) {
                console.log(cell)
                dslVars[varName] = 1;
                console.log(x, y, "있음", dslVars[varName], varName);
            }

        }

        if (what == 'lastmovepiece' || what == 'lmp') {
            console.log('last', lmplett, lmpletc, x, y)
            if (lmplett === x && lmpletc === y) {
                dslVars[varName] = 1;
            }

        }

        if (what == 'run') {

            if (dslVars[varName] == x) {
                console.log("ㅇㅋㅇㅋ", what, varName, x, y)
                const calls = movementByType[y];
                if (!calls) return;

                for (const call of calls) {
                    let args;

                    if (call.name.startsWith("make") || call.name.startsWith("over") || call.name.startsWith("outvar") || call.name.startsWith("pp")) {
                        args = resolved;
                    }
                    if (call.name.startsWith("long") || call.name.startsWith("moveorigin") || call.name.startsWith("shiftall")) {
                        resolved = call.args.map(resolveArg); // 🔥 핵심
                        args = resolved;
                    }

                    else {

                        resolved = call.args.map(resolveArg); // 🔥 핵심


                        args = resolved.map((v, i) => {
                            if (typeof v !== "number") return v;   // 🔥 핵심
                            console.log(args)
                            if (i === 0) return selectedX + v;
                            if (i === 1) return selectedY + v;
                            return v;
                        });

                        await handlers[call.name](...args);
                        console.log("완료")
                    }
                }
            }
        }
        if (what == 'thisisnotmoved' || what == 'tinm') {
            x = x + selectedX
            y = y + selectedY

            console.log("tinm", what, varName, x, y, ant, el)

            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            if (!parentDiv) return;
            const piece = parentDiv.querySelector(".piece"); // 해당 칸의 기물 확인
            const ump = piece.dataset.un
            console.log("wpwkandflanen", ump, x, y, ant)
            if (ump == 'unmove') {
                dslVars[varName] = 1;
                console.log("tinm통과!", dslVars[varName])
            }
        }
        if (what == 'thisiswhatpiece' || what == 'tiwp') {

            x = x + selectedX
            y = y + selectedY

            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            if (!parentDiv) return;
            const piece = parentDiv.querySelector(".piece"); // 해당 칸의 기물 확인
            const wtp = piece.dataset.type
            console.log('tiwp', wtp, x, y, ant)
            if (wtp == ant && !el) {
                dslVars[varName] = 1;
            }
            if (wtp == ant && el == '1') {
                const ump = piece.dataset.un
                if (ump == 'unmove') {
                    dslVars[varName] = 1;
                }
            }
            if (wtp == ant && el == '0') {
                const ump = piece.dataset.un
                if (ump !== 'unmove') {
                    dslVars[varName] = 1;
                }
            }
        }

    },


    outvar: (name) => {
        console.log("out" + ", " + name + ", " + dslVars[name])
    },


    fin: () => {
        throw "__STOP_MOVEMENT__";
    },


    set: (wb, wp, x, y, small) => {

        console.log(
            wb,
            wb.length,
            wb.split("").map(c => c.charCodeAt(0))
        );

        if (wb == 'txw') {
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("h1");
            newChild.innerText = wp
            console.log(wp)
            newChild.setAttribute('class', 'txw');
            if (small == 1) {
                newChild.setAttribute('class', 'smalltxw');
            }
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;
            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);
        }
        else if (wb == 'txb') {
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("h1");
            newChild.innerText = wp
            newChild.setAttribute('class', 'txb');
            if (small == 1) {
                newChild.setAttribute('class', 'smalltxb');
            }
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;
            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);
        }

        else {
            console.log("Doing place new piece with", x, y);
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("img");
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;

            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);

            const pieceSrc = {
                w: {
                    k: 'https://lab.en-passant.org/pieces/w_king.svg',
                    q: 'https://lab.en-passant.org/pieces/w_queen.svg',
                    r: 'https://lab.en-passant.org/pieces/w_rook.svg',
                    b: 'https://lab.en-passant.org/pieces/w_bishop.svg',
                    n: 'https://lab.en-passant.org/pieces/w_knight.svg',
                    p: 'https://lab.en-passant.org/pieces/w_pawn.svg',
                    m: 'https://lab.en-passant.org/pieces/w_test2.svg'
                },
                b: {
                    k: 'https://lab.en-passant.org/pieces/b_king.svg',
                    q: 'https://lab.en-passant.org/pieces/b_queen.svg',
                    r: 'https://lab.en-passant.org/pieces/b_rook.svg',
                    b: 'https://lab.en-passant.org/pieces/b_bishop.svg',
                    n: 'https://lab.en-passant.org/pieces/b_knight.svg',
                    p: 'https://lab.en-passant.org/pieces/b_pawn.svg'
                }
            };

            console.log("셋", wb, wp)
            newChild.src = pieceSrc[wb][wp];

            parentDiv.dataset.bpower = 0
            parentDiv.dataset.wpower = 0

        }
    },

    uset: (wb, wp, x, y) => {

        console.log(
            wb,
            wb.length,
            wb.split("").map(c => c.charCodeAt(0))
        );

        if (wb == 'txw') {
            console.log("Doing BLOCK with", x, y);
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("h1");
            newChild.innerText = wp
            newChild.setAttribute('class', 'txw');
            newChild.setAttribute('data-un', 'unmove');
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;
            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);
        }
        else if (wb == 'txb') {
            console.log("Doing BLOCK with", x, y);
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("h1");
            newChild.innerText = wp
            newChild.setAttribute('class', 'txb');
            newChild.setAttribute('data-un', 'unmove');
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;
            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);

            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);
        }

        else {
            console.log("Doing place new piece with", x, y);
            // 1. 새로운 p 태그 생성
            const newChild = document.createElement("img");
            newChild.setAttribute('data-un', 'unmove');
            newChild.classList.add("piece");
            newChild.dataset.color = wb;
            newChild.dataset.type = wp;

            // 2. 부모 div 찾기 (id가 parent인 경우)
            const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
            // 3. 자식 태그로 추가
            parentDiv.appendChild(newChild);

            const pieceSrc = {
                w: {
                    k: 'https://lab.en-passant.org/pieces/w_king.svg',
                    q: 'https://lab.en-passant.org/pieces/w_queen.svg',
                    r: 'https://lab.en-passant.org/pieces/w_rook.svg',
                    b: 'https://lab.en-passant.org/pieces/w_bishop.svg',
                    n: 'https://lab.en-passant.org/pieces/w_knight.svg',
                    p: 'https://lab.en-passant.org/pieces/w_pawn.svg',
                    m: 'https://lab.en-passant.org/pieces/w_test2.svg'
                },
                b: {
                    k: 'https://lab.en-passant.org/pieces/b_king.svg',
                    q: 'https://lab.en-passant.org/pieces/b_queen.svg',
                    r: 'https://lab.en-passant.org/pieces/b_rook.svg',
                    b: 'https://lab.en-passant.org/pieces/b_bishop.svg',
                    n: 'https://lab.en-passant.org/pieces/b_knight.svg',
                    p: 'https://lab.en-passant.org/pieces/b_pawn.svg'
                }
            };

            console.log("셋", wb, wp)
            newChild.src = pieceSrc[wb][wp];

        }
    },
    // 여기처럼 추가만 하면 됨
    // jump: (h) => { ... }
    // attack: (target) => { ... }
};

// --- 3) 명령어 실행 ---
async function runCommands(input) {
    const commands = parseCalls(input);

    for (const { name, args } of commands) {
        if (!handlers[name]) continue;

        let finalArgs;

        if (NO_RESOLVE_COMMANDS.has(name)) {
            // 🔥 변수 치환 안 함
            finalArgs = args;
        } else {
            // 🔥 기존대로 변수 치환
            finalArgs = args.map(resolveArg);
        }

        await handlers[name](...finalArgs);
    }
    console.log("runCommands 끝");
}




const State = {
    IDLE: "idle",
    PROMOTION: "promotion"
};

let currentState = State.IDLE;

document.querySelectorAll(".shop-buy-button").forEach(button => {
    button.addEventListener("click", () => {
        const pieceType = button.dataset.piece;

        if (!pieceType) return;

        startPiecePlacement(pieceType);
    });
});

chessboard.addEventListener("click", async (e) => {
    if (currentState === State.PROMOTION) return;
    // 🎯 가장 가까운 의미 있는 대상 찾기
    const piece = e.target.closest(".piece");
    const moveNode = e.target.closest(".move-node");

    console.log("board click");

    document.querySelectorAll(".shop-buy-button").forEach(button => {
        button.addEventListener("click", () => {
            const pieceType = button.dataset.piece;

            if (!pieceType) return;

            startPiecePlacement(pieceType);
        });
    });

    // 공통 좌표 추출 함수
    function getXY(el) {
        const cell = el.closest("div[data-x][data-y]");
        return cell ? [+cell.dataset.x, +cell.dataset.y] : null;
    }

    if (placementMode) {
        const cell = e.target.closest("div[data-x][data-y]");

        if (!cell) return;

        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);

        if (cell.querySelector(".piece")) {
            console.log("이미 기물이 있는 칸입니다.");
            return;
        }

        await queueMove({
            kind: "place",
            color: turn,
            pieceType: selectedShopPiece,
            x,
            y,
            small: 0
        });

        placementMode = false;
        selectedShopPiece = null;

        return;
    }

    // 1️⃣ 기물 클릭
    if (piece) {
        const pos = getXY(piece);
        if (!pos) return;
        const [x, y] = pos;
        jnx = x
        jny = y
        handlePieceClick(piece, x, y);
        return;
    }

    // 2️⃣ 이동 / 잡기 이동 클릭
    if (moveNode) {

        const pos = getXY(moveNode);
        if (!pos) return;
        const [x, y] = pos;

        if (moveNode.classList.contains("take-move")) {
            await queueMove({
                piece: selectedPiece,
                x,
                y,
                exec: handleTakeMove
            });
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("move")) {
            await queueMove({
                piece: selectedPiece,
                x,
                y,
                exec: handleTakeMove
            });
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("take")) {
            await queueMove({
                piece: selectedPiece,
                x,
                y,
                exec: handleTakeMove
            });
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("catch")) {
            handleCatch(x, y);
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("shift")) {
            handleShift(x, y);
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("take-jump")) {
            handleJump(x, y);
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("take-jump-long")) {
            const jxx = moveNode.dataset.tx
            const jxy = moveNode.dataset.ty
            handleJumplong(x, y, jxx, jxy);
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("shift-jump")) {
            const sjx1 = moveNode.dataset.x1
            const sjy1 = moveNode.dataset.y1
            const sjx2 = moveNode.dataset.x2
            const sjy2 = moveNode.dataset.y2
            const sjx3 = moveNode.dataset.x3
            const sjy3 = moveNode.dataset.y3

            handleShiftjump(sjx1, sjy1, sjx2, sjy2, sjx3, sjy3);
            handleTxwPiece(0, 0, 0, 'end');
        }
        else if (moveNode.classList.contains("take-fake")) {
            if (turn == 'w') {
                console.log("이제 흑턴");
                const td = document.getElementById("turn");
                td.innerText = "흑턴"
            }
            else if (turn == 'b') {
                console.log("이제 백턴");
                const td = document.getElementById("turn");
                td.innerText = "백턴"
            }
        }
        else if (moveNode.classList.contains("jump-fake")) {
            if (turn == 'w') {
                console.log("이제 흑턴"); leMove
                const td = document.getElementById("turn");
                td.innerText = "흑턴"
            }
            else if (turn == 'b') {
                console.log("이제 백턴");
                const td = document.getElementById("turn");
                td.innerText = "백턴"
            }
        }
    }

    else {
        delMoves()
    }
});

let whitep;

function killPiece(x, y) {

    // 기존 제거
    delpieces(x, y);

    // 예약기물이라면 예약 취소
    for (const queue of [whiteQueue, blackQueue]) {

        for (let i = queue.length - 1; i >= 0; i--) {

            const m = queue[i];

            if (m.toX == x && m.toY == y) {

                if (m.piece && document.body.contains(m.piece)) {
                    m.piece.style.visibility = "";
                    m.piece.classList.remove("reserved");
                }

                queue.splice(i, 1);
            }
        }
    }

    // 예약칸 갱신
    rebuildReservedCells();
}

async function handleTakeMove(x, y) {
    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;

    console.log(x, y, selectedX, selectedY, type, color);

    delMoves();

    // 기존 delpieces 대신 이것

    const cell = document.querySelector(
        `div[data-x="${x}"][data-y="${y}"]`
    );

    console.log("목적지 좌표:", x, y);
    console.log("찾은 셀:", cell);
    console.log("셀 내부 HTML:", cell?.innerHTML);

    const defender = cell?.querySelector(".piece");

    console.log("방어 기물:", defender);

    if (defender) {
        const result = await canCapture(selectedPiece, defender);

        if (!result) {
            delMoves();
            return;
        }
    }

    killPiece(x, y);

    if (color === 'w' && type === 'p' && y === 7) {
        e4 = Math.random() * 15
        if (e4 > -1) {
            force = `del(${selectedX}, ${selectedY})set(${color}, n,${x}, ${y})`;
        }
        if (e4 > 3) {
            force = `del(${selectedX}, ${selectedY})set(${color}, b,${x}, ${y})`;
        }
        if (e4 > 5) {
            force = `del(${selectedX}, ${selectedY})set(${color}, r,${x}, ${y})`;
        }
        if (e4 > 9) {
            force = `del(${selectedX}, ${selectedY})set(${color}, q,${x}, ${y})`;
        }
        fmove();
        return;
    }


    if (color === 'b' && type === 'p' && y === 0) {
        e4 = Math.random() * 15
        if (e4 > -1) {
            force = `del(${selectedX}, ${selectedY})set(${color}, n,${x}, ${y})`;
        }
        if (e4 > 3) {
            force = `del(${selectedX}, ${selectedY})set(${color}, b,${x}, ${y})`;
        }
        if (e4 > 5) {
            force = `del(${selectedX}, ${selectedY})set(${color}, r,${x}, ${y})`;
        }
        if (e4 > 9) {
            force = `del(${selectedX}, ${selectedY})set(${color}, q,${x}, ${y})`;
        }
        fmove();
    } else {
        force = `del(${selectedX}, ${selectedY})set(${color}, ${type},${x}, ${y})`;
        fmove();
    }
}

async function handleMove(x, y) {
    console.log("handleMove 직접 호출");
    handleTakeMove(x, y);
}

async function handleTake(x, y) {
    handleTakeMove(x, y);
}

function handleJumplong(x, y, jxx, jxy) {
    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;
    console.log(x, y, selectedX, selectedY, type, color)
    delMoves()
    force = `del(${selectedX}, ${selectedY})del(${jxx}, ${jxy})`
    fmove()
    force = `set(${color}, ${type}, ${x}, ${y})`
    fmove()
}

function handleJump(x, y) {
    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;
    console.log(x, y, selectedX, selectedY, type, color, jnx, jny)
    delMoves()
    delpieces(x, y)
    force = `del(${selectedX}, ${selectedY})del(${jnx}, ${jny})set(${color}, ${type}, ${jx}, ${jy})`
    fmove()
}


function handleCatch(x, y) {
    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;
    console.log(x, y, selectedX, selectedY, type, color)
    delMoves()
    delpieces(x, y)
}

function handleShift(x, y) {
    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;
    const parentDiv = document.querySelector(
        `div[data-x="${x}"][data-y="${y}"]`
    );
    if (!parentDiv) return;

    const anpiece = parentDiv.querySelector(".piece");
    const antype = anpiece.dataset.type;
    const ancolor = anpiece.dataset.color;
    console.log(x, y, selectedX, selectedY, type, color, ancolor, antype + ' ㄷㄷㄷㄷㄷ')

    delMoves()
    delpieces(x, y)
    force = `del(${y}, ${x})set(${ancolor}, ${antype},${selectedX}, ${selectedY})`
    fmove()
    if (antype === "p" && ancolor === "w" && selectedY === 7) {
        startPromotion(selectedX, selectedY, ancolor);
    }
    // 검은색 폰이 0행(1번째 줄) 도달
    if (antype === "p" && ancolor === "b" && selectedY === 0) {
        startPromotion(selectedX, selectedY, ancolor);
    }
    force = `del(${selectedX}, ${selectedY})set(${color}, ${type}, ${x}, ${y})`
    fmove()
}

function handleShiftjump(sjx1, sjy1, sjx2, sjy2, sjx3, sjy3) {

    console.log("sj", sjx1, sjy1, sjx2, sjy2, sjx3, sjy3)

    const type = selectedPiece.dataset.type;
    const color = selectedPiece.dataset.color;



    let parentDiv = document.querySelector(
        `div[data-x="${sjx1}"][data-y="${sjy1}"]`
    );
    if (!parentDiv) return;
    let tagpiece = parentDiv.querySelector(".piece")
    let tagtype = tagpiece.dataset.type
    let tagcolor = tagpiece.dataset.color

    force = `del(${selectedX}, ${selectedY})`
    fmove()
    force = `del(${sjx1}, ${sjy1})set(${tagcolor}, ${tagtype}, ${sjx2}, ${sjy2})`
    fmove()
    force = `set(${color}, ${type}, ${sjx3}, ${sjy3})`
    fmove()
}

async function handlePieceClick(piece, x, y) {
    const color = piece.dataset.color;
    const type = piece.dataset.type;

    if (color == 'w' && turn == 'b' || color == 'txw' && turn == 'b') {
        console.log("백선 흑턴");
        return;
    }
    if (color == 'b' && turn == 'w' || color == 'txb' && turn == 'w') {
        console.log("흑선 백턴");
        return;
    }


    if (reservedPieces.has(piece)) {
        console.log("예약된 기물");
        return;
    }

    selectedPiece = piece;

    selectedX = x;
    selectedY = y;

    pinx = x;
    piny = y;

    console.log("기물:", color, type, "위치:", x, y);
    pinx = x
    piny = y

    if (type === "k") {
        console.log("킹");
        delMoves()
        selectedX = x
        selectedY = y
        force = `takemove(${x + 1}, ${y})takemove(${x - 1}, ${y})takemove(${x}, ${y + 1})takemove(${x}, ${y - 1})takemove(${x + 1}, ${y + 1})takemove(${x + 1}, ${y - 1})takemove(${x - 1}, ${y + 1})takemove(${x - 1}, ${y - 1})make(kingmove,0)if(tinm,kingmove,0,0)if(run,kingmove,1,ko)over(kingmove,0)`
        await fmove()
        removeReservedMoves();
    }
    else if (type === "q") {
        console.log("퀸")
        delMoves()
        selectedX = x
        selectedY = y
        force = `longtakemove(1, 0)longtakemove(-1, 0)longtakemove(0, 1)longtakemove(0, -1)longtakemove(1, 1)longtakemove(1, -1)longtakemove(-1, 1)longtakemove(-1, -1)`
        await fmove()
        removeReservedMoves();
    }
    else if (type === "r") {
        console.log("룩")
        delMoves()
        selectedX = x
        selectedY = y
        force = `longtakemove(1, 0)longtakemove(-1, 0)longtakemove(0, 1)longtakemove(0, -1)`
        await fmove()
        removeReservedMoves();
    }
    else if (type === "b") {
        console.log("비숍")
        delMoves()
        selectedX = x
        selectedY = y
        force = `longtakemove(1, 1)longtakemove(1, -1)longtakemove(-1, 1)longtakemove(-1, -1)`
        await fmove()
        removeReservedMoves();
    }
    else if (type === "n") {
        console.log("나이트")
        delMoves()
        selectedX = x
        selectedY = y
        force = `takemove(${x + 2}, ${y + 1})takemove(${x - 2}, ${y + 1})takemove(${x + 1}, ${y + 2})takemove(${x + 1}, ${y - 2})takemove(${x + 2}, ${y - 1})takemove(${x - 2}, ${y - 1})takemove(${x - 1}, ${y + 2})takemove(${x - 1}, ${y - 2}))`
        await fmove()
        removeReservedMoves();
    }
    else if (type === "p") {
        console.log("폰")
        delMoves()
        selectedX = x
        selectedY = y
        if (color === 'w') {
            force = `make(wp,0)move(${x}, ${y + 1})take(${x + 1}, ${y + 1})take(${x - 1}, ${y + 1}))if(tinm,wp,0,0)if(run,wp,1,wpm)`
            await fmove()
            removeReservedMoves();
        }
        else {
            force = `make(bp,0)move(${x}, ${y - 1})take(${x + 1}, ${y - 1})take(${x - 1}, ${y - 1}))if(tinm,bp,0,0)if(run,wp,1,bpm)`
            await fmove()
            removeReservedMoves();
        }

    }
    else if (type === "m") {
        handleTxwPiece(x, y, piece, type);
    }

    else if (color == "txw") {
        handleTxwPiece(x, y, piece, type);

    }
    else if (color == "txb") {
        handleTxwPiece(x, y, piece, type);

    }

    lmplett = type
    lmpletc = color.replace(/^tx/, '')

    console.log("handlePieceClick 끝");
}

async function fmove() {
    return await runCommands(force);
}

async function callrc(text) {

    text = stripMovementBlocks(text)

    try {
        await runCommands(text);
    } catch (e) {
        if (e !== "__STOP_MOVEMENT__") {
            throw e; // 진짜 에러는 다시 던짐
        }
        // stop()이면 조용히 종료
    }
}

function repeatRay(fromX, fromY, dx, dy) {

    if (origin == 0 || origin == 1) {
        if (!selectedPiece) return [];

        const cells = [];

        let x = fromX + (origin == 0 ? dx : 0);
        let y = fromY + (origin == 0 ? dy : 0);

        while (x >= 0 && x < 8 && y >= 0 && y < 8) {

            const cell = document.querySelector(
                `div[data-x="${x}"][data-y="${y}"]`
            );

            if (!cell) break;

            const piece = cell.querySelector(".piece");

            if (!piece) {
                cells.push({ x, y, occupied: false });
            }
            else {
                // 이동 예약된 기물인지 확인
                const isReserved = reservedPieces.has(piece);

                // 예약된 기물은 현재 위치에서 통과
                if (isReserved) {
                    x += dx;
                    y += dy;
                    continue;
                }

                const enemy =
                    piece.dataset.color &&
                    selectedPiece.dataset.color &&
                    piece.dataset.color !== selectedPiece.dataset.color;

                cells.push({
                    x,
                    y,
                    occupied: true,
                    enemy
                });

                break;
            }

            x += dx;
            y += dy;
        }

        return cells;
    }

}









function delMoves() {
    document.querySelectorAll(".move-node").forEach(n => n.remove());

    generatedMoves = [];

    document.querySelectorAll("[data-x][data-y]").forEach(cell => {
        delete cell._moves;
        delete cell._activeMove;
    });
}


function delpieces(x, y) {
    const cell = document.querySelector(
        `div[data-x="${x}"][data-y="${y}"]`
    );
    if (!cell) return;

    const piece = cell.querySelector(".piece");
    if (piece) {
        piece.remove();
    }
}

function promotion(x, y) {

    console.log("승진중")

    const parentDiv = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
    if (!parentDiv) return;

    const piece = parentDiv.querySelector(".piece");

    // 흰색 폰이 7행(8번째 줄) 도달
    if (piece.dataset.type === "p" && piece.dataset.color === "w" && y === 7) {
        startPromotion(piece, x, y);
    }
    // 검은색 폰이 0행(1번째 줄) 도달
    else if (piece.dataset.type === "p" && piece.dataset.color === "b" && y === 0) {
        startPromotion(piece, x, y);
    }
}

function startPromotion(x, y, color) {
    const pieces = ['q', 'r', 'b', 'n'];
    let index = 0;

    // 체스판 칸 기준으로 위치 계산
    const cell = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
    if (!cell) return;

    const rect = cell.getBoundingClientRect();

    const container = document.createElement("div");
    container.classList.add("promotion-container");
    container.style.position = "absolute";
    container.style.top = `${rect.top}px`;
    container.style.left = `${rect.left}px`;
    container.style.display = "flex";
    container.style.gap = "2px"; // 버튼 간 간격
    document.body.appendChild(container);

    currentState = State.PROMOTION; // 선택 중 다른 클릭 차단

    // 버튼 생성 함수
    const createButton = (p) => {
        const btn = document.createElement("button");
        btn.style.width = "70px";
        btn.style.height = "70px";
        btn.style.fontSize = "20px";
        btn.style.fontWeight = "bold";
        btn.innerText = p;
        btn.onclick = () => {
            delpieces(x, y);
            force = `set(${color},${p},${x},${y})`;
            fmove();

            clearInterval(interval); // 반복 종료
            container.remove();      // UI 제거
            currentState = State.IDLE; // 상태 복귀
        }
        container.appendChild(btn);
    }

    // 1️⃣ 첫 버튼 즉시 생성
    createButton(pieces[index]);
    index = (index + 1) % pieces.length;

    // 2️⃣ 이후 3초마다 교체
    const interval = setInterval(() => {
        container.innerHTML = "";
        createButton(pieces[index]);
        index = (index + 1) % pieces.length;
    }, 1500);
}



function removePromotionUI() {
    document.querySelectorAll(".promotion-option").forEach(el => el.remove());
}

function handleTxwPiece(x, y, piece, type) {
    selectedPiece = piece;
    selectedX = x;
    selectedY = y;

    delMoves();

    const calls = movementByType[type];
    if (!calls) return;

    for (const call of calls) {
        if (!handlers[call.name]) continue;

        let resolved

        let args;
        if (call.name.startsWith("make") || call.name.startsWith("over") || call.name.startsWith("outvar") || call.name.startsWith("pp")) {
            args = resolved;
        }
        if (call.name.startsWith("long") || call.name.startsWith("moveorigin") || call.name.startsWith("shiftall")) {
            resolved = call.args.map(resolveArg); // 🔥 핵심
            args = resolved;
        }

        else {

            resolved = call.args.map(resolveArg); // 🔥 핵심


            args = resolved.map((v, i) => {
                if (typeof v !== "number") return v;   // 🔥 핵심
                console.log(args)
                if (i === 0) return selectedX + v;
                if (i === 1) return selectedY + v;
                return v;
            });

        }
        if (type == 'end') {
            console.log("엔드")
        }

        handlers[call.name](...args);


    }
}



function parseNewMovementFor(lang) {
    const regex = /newmovementfor\((\w+)\)\s*{([\s\S]*?)}/g;
    let match;

    while ((match = regex.exec(lang)) !== null) {
        const type = match[1];   // A, W, R ...
        const body = match[2];

        movementByType[type] = parseCalls(body);
    }
}

function resolveArg(arg) {
    if (arg && typeof arg === "object" && arg.raw) {
        return arg.raw; // 🔥 무조건 문자열
    }
    if (arg && typeof arg === "string" && arg in dslVars) {
        return dslVars[arg];
    }
    return arg;
}

function yesturn() {
    turn = 'w'
    const td = document.getElementById("turn");
    td.innerText = "백턴"
    makeBlackPlan()
}

handlers.haspiece = (x, y) => {
    const cell = document.querySelector(
        `div[data-x="${x}"][data-y="${y}"]`
    );
    if (!cell) return false;

    return !!cell.querySelector(".piece");
};

function stripMovementBlocks(code) {
    return code.replace(
        /newmovementfor\([\s\S]*?\)\s*{[\s\S]*?}/g,
        ""
    );
}

function addMove(cell, { kind, exec, data }) {

    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);

    //------------------------------------
    // 예약된 칸이면 행마 생성 금지
    //------------------------------------

    if (reservedCells.has(`${x},${y}`))
        return null;

    //------------------------------------
    // 같은 종류 행마 중복 생성 금지
    //------------------------------------

    if (!cell._moves) {
        cell._moves = [];
        cell._activeMove = 0;
    }

    if (
        cell._moves.some(m =>
            m.node.classList.contains(kind)
        )
    ) {
        return null;
    }

    //------------------------------------

    const index = cell._moves.length;

    const node = document.createElement("div");
    node.className = `move-node ${kind}`;
    node.style.display = "none";

    if (data) {
        for (const [k, v] of Object.entries(data))
            node.dataset[k] = v;
    }

    cell.appendChild(node);

    const move = {
        piece: selectedPiece,
        node,
        exec
    };

    cell._moves.push(move);

    generatedMoves.push({
        piece: selectedPiece,
        cell,
        node,
        exec
    });

    if (index === 0)
        node.style.display = "block";

    node.addEventListener("contextmenu", e => {

        e.preventDefault();

        const moves = cell._moves;

        if (moves.length <= 1)
            return;

        moves[cell._activeMove].node.style.display = "none";

        cell._activeMove =
            (cell._activeMove + 1) % moves.length;

        moves[cell._activeMove].node.style.display = "block";

    });

    return node;
}


function rebuildReservedCells() {

    reservedCells.clear();

    const queue = (turn === "w") ? whiteQueue : blackQueue;

    for (const move of queue) {

        reservedCells.set(`${move.x},${move.y}`, move);

    }

}

function showCombatResult(attacker, defender, atk, def, success) {
    const board = document.querySelector("#chessboard");

    if (!board) return Promise.resolve();

    board.style.position = "relative";

    const boardRect = board.getBoundingClientRect();
    const atkRect = attacker.getBoundingClientRect();
    const defRect = defender.getBoundingClientRect();

    const createBadge = (text, x, y) => {
        const badge = document.createElement("div");
        badge.className = "combat-roll";
        badge.textContent = text;

        badge.style.position = "absolute";
        badge.style.left = `${x}px`;
        badge.style.top = `${y}px`;
        badge.style.zIndex = "10001";

        board.appendChild(badge);
        return badge;
    };

    const atkBadge = createBadge(
        `ATK 🎲 ${atk.value}`,
        atkRect.left - boardRect.left,
        atkRect.top - boardRect.top
    );

    const defBadge = createBadge(
        `DEF 🎲 ${def.value}`,
        defRect.left - boardRect.left,
        defRect.top - boardRect.top
    );

    // 클릭 대기 화면
    const overlay = document.createElement("div");
    overlay.className = "combat-pause-overlay";
    overlay.textContent = success
        ? "전투 승리! 클릭하면 다음 움직임"
        : "전투 패배! 클릭하면 다음 움직임";

    board.appendChild(overlay);

    // 플레이어가 클릭할 때까지 대기
    return new Promise(resolve => {
        overlay.addEventListener("click", () => {
            overlay.remove();
            atkBadge.remove();
            defBadge.remove();

            resolve();
        }, { once: true });
    });
}

function showBattlePreview(attacker, defender, mouseX, mouseY) {
    if (!attacker || !defender) return;

    const atkStat = pieceStat[attacker.dataset.type];
    const defStat = pieceStat[defender.dataset.type];

    if (!atkStat || !defStat) return;

    const pieceNames = {
        p: "폰 ♟",
        n: "나이트 ♞",
        b: "비숍 ♝",
        r: "룩 ♜",
        q: "퀸 ♛",
        k: "킹 ♚"
    };

    const combatNames = {
        short: "단거리",
        long: "원거리",
        irre: "이레귤러",
        atk: "공격적",
        def: "수비적",
        spe: "재빠른",
        proed: "보호된"
    };

    const atkName = pieceNames[attacker.dataset.type] || attacker.dataset.type;
    const defName = pieceNames[defender.dataset.type] || defender.dataset.type;

    // 공격자의 이동 유형
    const atkType = atkStat.moveType || "미지정";

    // 방어자의 방어 유형
    const defType = defStat.defendType || "미지정";

    const bonus = getMatchupBonus(attacker, defender);

    const atkValues = atkStat.atkDice.map(
        v => atkStat.atk + v + bonus
    );

    const defValues = defStat.defDice.map(
        v => defStat.def + v
    );

    const atkMin = Math.min(...atkValues);
    const atkMax = Math.max(...atkValues);
    const defMin = Math.min(...defValues);
    const defMax = Math.max(...defValues);

    let wins = 0;
    let total = 0;

    for (const atk of atkValues) {
        for (const def of defValues) {
            total++;
            if (atk > def) wins++;
        }
    }

    const winRate = (wins / total * 100).toFixed(1);

    let matchupText = "상성 보정 없음";
    let matchupColor = "#aaa";

    if (bonus > 0) {
        matchupText = `상성 우위 +${bonus}`;
        matchupColor = "#66e39a";
    } else if (bonus < 0) {
        matchupText = `상성 열위 ${bonus}`;
        matchupColor = "#ff7777";
    }

    let preview = document.querySelector("#battle-preview");

    if (!preview) {
        preview = document.createElement("div");
        preview.id = "battle-preview";
        document.body.appendChild(preview);
    }

    preview.innerHTML = `
        <div class="battle-preview-title">
            ⚔ 전투 미리보기
        </div>

        <div class="battle-preview-stats">
            <div>
                <span>공격자</span>
                <strong>${atkName}</strong>
                <small>${combatNames[atkType] || atkType}</small>
                <strong>${atkMin} ~ ${atkMax}</strong>
            </div>

            <span class="battle-vs">VS</span>

            <div>
                <span>방어자</span>
                <strong>${defName}</strong>
                <small>${combatNames[defType] || defType}</small>
                <strong>${defMin} ~ ${defMax}</strong>
            </div>
        </div>

        <div style="
            text-align:center;
            margin-top:10px;
            color:${matchupColor};
            font-weight:bold;
        ">
            ${matchupText}
        </div>

        <div class="battle-preview-rate">
            승률
            <strong>${winRate}%</strong>
        </div>

        <div class="battle-preview-detail">
            승리 조합 ${wins} / ${total}
        </div>
    `;

    preview.style.display = "block";

    preview.style.left =
        `${Math.max(5, Math.min(mouseX + 15, window.innerWidth - preview.offsetWidth - 5))}px`;

    preview.style.top =
        `${Math.max(5, Math.min(mouseY + 15, window.innerHeight - preview.offsetHeight - 5))}px`;
}

document.addEventListener("mousemove", (e) => {
    if (!selectedPiece || !selectedPiece.isConnected) {
        hideBattlePreview();
        return;
    }

    const elements = document.elementsFromPoint(
        e.clientX,
        e.clientY
    );

    const target = elements.find(el =>
        el.classList?.contains("piece")
    );

    if (!target || target === selectedPiece) {
        hideBattlePreview();
        return;
    }

    if (target.dataset.color === 'w') {
        hideBattlePreview();
        return;
    }

    showBattlePreview(
        selectedPiece,
        target,
        e.clientX,
        e.clientY
    );
});

function hideBattlePreview() {
    const preview = document.querySelector("#battle-preview");

    if (preview) {
        preview.style.display = "none";
    }
}

function getMatchupBonus(attacker, defender) {
    const atkStat = pieceStat[attacker.dataset.type];
    const defStat = pieceStat[defender.dataset.type];

    if (!atkStat || !defStat) return 0;

    const moveType = atkStat.moveType;
    const defendType = defStat.defendType;

    if (!moveType || !defendType) return 0;

    return combatMatchup[moveType]?.[defendType] ?? 0;
}

function startPiecePlacement(pieceType) {
    placementMode = true;
    selectedShopPiece = pieceType;

    console.log("배치 모드:", pieceType);

    // 기존 이동 표시 제거
    delMoves();

    // 배치 모드 안내
    document.getElementById("turn").innerText =
        `${pieceType} 배치할 칸을 선택하세요`;
}



setchess();