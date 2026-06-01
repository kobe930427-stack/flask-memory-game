// 1. 擴充水果庫，總共準備 18 種不同的水果（給 6x6 難度使用）
const allIcons = [
    '🍎', '🍌', '🍇', '🍒', '🍉', '🍍', '🍓', '🥑', 
    '🍋', '🍊', '🥝', '🫐', '🥥', '🍑', '🍏', '🥭', '🍐', '🍅'
];

let currentDifficulty = '4x4'; // 預設難度
let cardIcons = [];            // 當前局要使用的卡片陣列

// 🎮 遊戲狀態追蹤
let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let flipCount = 0;

// ⏱ 計時器與過關相關變數
let timer = null;
let timeSpent = 0;
let isGameStarted = false; // 用來標記玩家是不是點了第一張牌
let matchedPairs = 0;      // 記錄目前配對成功了幾對
let totalPairs = 8;        // 預設 4x4 是 8 對

// 🎲 Fisher-Yates 洗牌演算法
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ⚙️ 切換難度的函數
function changeDifficulty(difficulty) {
    currentDifficulty = difficulty;
    document.getElementById('current-difficulty').innerText = difficulty;
    resetWholeGame(); // 切換難度時，必須把整場遊戲重設
}

// 🧹 完整重設遊戲狀態（包含清除計時器、重製棋盤）
function resetWholeGame() {
    clearInterval(timer);
    timer = null;
    timeSpent = 0;
    flipCount = 0;
    matchedPairs = 0;
    isGameStarted = false;
    
    document.getElementById('timer').innerText = '0';
    document.getElementById('flip-count').innerText = '0';
    
    // 重新建立棋盤
    createBoard();
}

// 🧱 建立棋盤
function createBoard() {
    // 每次重新建立棋盤時，同步載入該難度的排行榜
    loadLeaderboard();

    const board = document.getElementById('game-board');
    board.innerHTML = ''; // 先清空舊的棋盤內容

    // 根據難度決定要拿多少張牌、以及套用哪種 CSS 排版
    if (currentDifficulty === '4x4') {
        totalPairs = 8;
        board.className = 'grid-4x4'; // 套用 4x4 的 CSS
        // 拿前 8 種水果，每種複製 2 張
        const icons = allIcons.slice(0, 8);
        cardIcons = [...icons, ...icons];
    } else {
        totalPairs = 18;
        board.className = 'grid-6x6'; // 套用 6x6 的 CSS
        // 拿全部 18 種水果，每種複製 2 張
        cardIcons = [...allIcons, ...allIcons];
    }

    const shuffledCards = shuffle(cardIcons);

    shuffledCards.forEach(icon => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">❓</div>
                <div class="card-back">${icon}</div>
            </div>
        `;
        
        card.addEventListener('click', flipCard);
        board.appendChild(card);
    });
}

// 🃏 翻牌核心動作
function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return; // 防止玩家連續點擊同一張牌兩次

    // 當玩家翻開整場遊戲的第一張牌時，啟動計時器
    if (!isGameStarted) {
        isGameStarted = true;
        startTimer();
    }

    this.classList.add('is-flipped');

    if (!hasFlippedCard) {
        // 這是玩家點擊的第一張牌
        hasFlippedCard = true;
        firstCard = this;
        return;
    }

    // 這是玩家點擊
// 這是玩家點擊的第二張牌
    secondCard = this;
    flipCount++;
    document.getElementById('flip-count').innerText = flipCount;

    // 檢查兩張牌有沒有配對成功
    checkForMatch();
}

// 🔍 檢查配對
function checkForMatch() {
    const isMatch = firstCard.querySelector('.card-back').innerText === secondCard.querySelector('.card-back').innerText;
    isMatch ? disableCards() : unflipCards();
}

// 🔒 配對成功：移除點擊事件，並檢查是否完整通關
function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);

    matchedPairs++;
    
    if (matchedPairs === totalPairs) {
        clearInterval(timer); // 停止計時
        setTimeout(() => {
            // 通關時，跳出輸入框詢問名字
            const playerName = prompt(`🎉 恭喜通關 [${currentDifficulty}] 難度！\n花費時間：${timeSpent} 秒\n翻牌次數：${flipCount} 次\n\n請輸入你的大名留存英雄榜：`);
            
            if (playerName && playerName.trim() !== "") {
                savePlayerScore(playerName.trim()); // 玩家有輸入名字就存檔
            } else {
                savePlayerScore("匿名玩家"); // 沒輸入就叫匿名玩家
            }
        }, 500);
    }

    resetBoard();
}

// 🔄 配對失敗：自動把牌蓋回去
function unflipCards() {
    lockBoard = true; // 鎖定棋盤，不讓玩家在卡片蓋回去前點其他牌

    setTimeout(() => {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        resetBoard(); // 解除鎖定
    }, 1000);
}

// 🧹 重設單次翻牌暫存
function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

// ⏱ 啟動計時器
function startTimer() {
    timer = setInterval(() => {
        timeSpent++;
        document.getElementById('timer').innerText = timeSpent;
    }, 1000);
}

// 📡 連線功能 1：將分數傳送到 Flask 後端儲存
function savePlayerScore(playerName) {
    fetch('/api/save_score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: playerName,
            difficulty: currentDifficulty,
            time_spent: timeSpent,
            flips: flipCount
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        loadLeaderboard(); // 儲存完分數後，立刻重新整理排行榜
    });
}

// 📡 連線功能 2：從 Flask 後端抓取排行榜資料並顯示在網頁上
function loadLeaderboard() {
    document.getElementById('leaderboard-title').innerText = currentDifficulty;
    
    fetch(`/api/get_leaderboard/${currentDifficulty}`)
    .then(response => response.json())
    .then(data => {
        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = ''; // 先清空舊資料

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#aaa;">暫無紀錄，快來搶佔第一名！</td></tr>`;
            return;
        }

        // 把排行資料一列一列畫出來
        data.forEach((score, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.name}</td>
                <td>${score.time_spent} 秒</td>
                <td>${score.flips} 次</td>
            `;
            tbody.appendChild(row);
        });
    });
}

// 🚀 初始化：當網頁全部載入完成後，立刻執行建立棋盤
document.addEventListener('DOMContentLoaded', createBoard);