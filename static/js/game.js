// 遊戲狀態變數
let difficulty = '4x4';
let cards = [];
let flippedCards = [];
let lockBoard = false;
let startTime = null;
let timerInterval = null;
let clicks = 0;
let matchedPairs = 0;

// 表情符號庫（用於卡片正面）
const emojis = ['🧠', '🔥', '⚡', '🏆', '💻', '🚀', '⭐', '🎨', '🕹️', '👾', '🐱', '🐶', '🦊', '🦁', '🐸', '🐵', '🦄', '🐝'];

// 網頁載入完成後自動初始化
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

// 切換難度
function switchDifficulty(diff) {
    if (difficulty === diff) return;
    difficulty = diff;
    
    // 切換按鈕 active 樣式
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // 更新排行榜標題
    document.getElementById('currentDiffTitle').innerText = diff;
    
    // 重新初始化遊戲
    initGame();
}

// 初始化遊戲棋盤與撈取排行榜
function initGame() {
    // 1. 重設狀態與面板
    clearInterval(timerInterval);
    timerInterval = null;
    startTime = null;
    clicks = 0;
    matchedPairs = 0;
    flippedCards = [];
    lockBoard = false;
    
    document.getElementById('timer').innerText = '0';
    document.getElementById('clicks').innerText = '0';
    
    // 2. 調整棋盤格線 CSS 類別
    const board = document.getElementById('gameBoard');
    board.className = `game-board grid-${difficulty}`;
    board.innerHTML = '';
    
    // 3. 計算並準備卡片陣列
    const rows = parseInt(difficulty.split('x')[0]);
    const totalCards = rows * rows;
    const pairsCount = totalCards / 2;
    
    // 挑選所需數量的表情符號並複製成兩份
    const selectedEmojis = emojis.slice(0, pairsCount);
    let gameEmojis = [...selectedEmojis, ...selectedEmojis];
    
    // 隨洗牌演算法 (Fisher-Yates)
    gameEmojis.sort(() => Math.random() - 0.5);
    
    // 4. 動態產生 3D 卡片 DOM 結構
    gameEmojis.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.emoji = emoji;
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="card-front">${emoji}</div>
            <div class="card-back">?</div>
        `;
        
        card.addEventListener('click', flipCard);
        board.appendChild(card);
    });
    
    // 5. 撈取該難度的即時英雄榜
    fetchLeaderboard();
}

// 翻牌事件
function flipCard() {
    if (lockBoard) return;
    if (this === flippedCards[0]) return; // 避免連點同一張卡片
    if (this.classList.contains('is-flipped')) return; // 避免點擊已配對成功的卡片
    
    // 啟動計時器
    if (!startTime) {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById('timer').innerText = elapsed;
        }, 1000);
    }
    
    // 計次更新
    clicks++;
    document.getElementById('clicks').innerText = clicks;
    
    // 執行 3D 翻轉動畫
    this.classList.add('is-flipped');
    flippedCards.push(this);
    
    // 檢查是否翻開兩張了
    if (flippedCards.length === 2) {
        checkMatch();
    }
}

// 檢查配對邏輯
function checkMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.emoji === card2.dataset.emoji;
    
    if (isMatch) {
        // 配對成功
        card1.removeEventListener('click', flipCard);
        card2.removeEventListener('click', flipCard);
        matchedPairs++;
        flippedCards = [];
        
        // 檢查是否全盤通關
        const rows = parseInt(difficulty.split('x')[0]);
        if (matchedPairs === (rows * rows) / 2) {
            clearInterval(timerInterval);
            setTimeout(gameOver, 500);
        }
    } else {
        // 配對失敗：防連點鎖定，1秒後翻回去
        lockBoard = true;
        setTimeout(() => {
            card1.classList.remove('is-flipped');
            card2.classList.remove('is-flipped');
            flippedCards = [];
            lockBoard = false;
        }, 1000);
    }
}

// 通關與分數儲存
function gameOver() {
    const finalTime = document.getElementById('timer').innerText;
    const finalClicks = clicks;
    
    // 彈出視窗引導輸入玩家姓名
    const username = prompt(`🎉 恭喜通關！\n⏱️ 總花費時間: ${finalTime} 秒\n✨ 總翻牌次數: ${finalClicks} 次\n\n請輸入您的英雄大名登入榜單:`);
    
    if (username === null) return; // 點擊取消則不上傳
    
    const scoreData = {
        username: username.trim() || '無名英雄',
        difficulty: difficulty,
        game_time: parseInt(finalTime),
        clicks: finalClicks
    };
    
    // 將數據非同步 POST 給後端 Flask
    fetch('/api/save_score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message || '分數上傳成功！');
        initGame(); // 重新整理遊戲
    })
    .catch(err => console.error('儲存成績失敗:', err));
}

// RESTful API 撈取排行數據
function fetchLeaderboard() {
    const listContainer = document.getElementById('leaderboardList');
    listContainer.innerHTML = '<li class="leaderboard-item" style="grid-template-columns: 1fr; text-align: center; color: #64748b;">載入中...</li>';
    
    fetch(`/api/get_leaderboard/${difficulty}`)
    .then(res => res.json())
    .then(data => {
        listContainer.innerHTML = '';
        
        if (data.length === 0) {
            listContainer.innerHTML = '<li class="leaderboard-item" style="grid-template-columns: 1fr; text-align: center; color: #64748b;">目前暫無紀錄，快來搶佔第一名！</li>';
            return;
        }
        
        // 動態塞入前 10 名數據
        data.forEach((item, index) => {
            const li = document.createElement('li');
            li.classList.add('leaderboard-item');
            li.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name" title="${item.username}">${item.username}</span>
                <span class="time">${item.game_time}秒</span>
                <span class="clicks">${item.clicks}次</span>
            `;
            listContainer.appendChild(li);
        });
    })
    .catch(err => {
        console.error('讀取排行榜失敗:', err);
        listContainer.innerHTML = '<li class="leaderboard-item" style="grid-template-columns: 1fr; text-align: center; color: #ef4444;">排行榜載入失敗</li>';
    });
}