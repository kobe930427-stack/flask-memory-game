import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# ==========================================
# 1. 資料庫配置 (SQLite)
# ==========================================
# 將資料庫實體檔案建立在 instance/ 資料夾下
base_dir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'instance', 'memory_game.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 定義英雄榜資料表模型
class Score(db.Model):
    __tablename__ = 'scores'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)     # 玩家姓名
    difficulty = db.Column(db.String(10), nullable=False)   # 遊戲難度 (4x4 或 6x6)
    game_time = db.Column(db.Integer, nullable=False)       # 通關時間 (秒)
    clicks = db.Column(db.Integer, nullable=False)          # 翻牌總次數

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'difficulty': self.difficulty,
            'game_time': self.game_time,
            'clicks': self.clicks
        }

# 自動初始化建立資料庫檔案與資料表
with app.app_context():
    # 確保 instance 目錄存在
    os.makedirs(os.path.join(base_dir, 'instance'), exist_ok=True)
    db.create_all()

# ==========================================
# 2. 靜態網頁路由 (解決 Not Found 關鍵)
# ==========================================
@app.route('/')
def index():
    """
    根目錄路由：渲染前端主要遊戲網頁。
    確保你的 index.html 放在 templates 資料夾內。
    """
    return render_template('index.html')

# ==========================================
# 3. RESTful API 路由 (前後端資料交換)
# ==========================================
@app.route('/api/get_leaderboard/<difficulty>', methods=['GET'])
def get_leaderboard(difficulty):
    """
    撈取排行榜 API：根據難度篩選，並依據通關時間(升遞)、翻牌次數(升遞)排序，只取前 10 名。
    """
    try:
        # 驗證傳入難度是否合法
        if difficulty not in ['4x4', '6x6']:
            return jsonify({'error': '未知的遊戲難度'}), 400
            
        scores_query = Score.query.filter_by(difficulty=difficulty)\
                                  .order_by(Score.game_time.asc(), Score.clicks.asc())\
                                  .limit(10)\
                                  .all()
        
        leaderboard_data = [score.to_dict() for score in scores_query]
        return jsonify(leaderboard_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_score', methods=['POST'])
def save_score():
    """
    儲存成績 API：接收前端傳入的玩家資料，寫入 SQLite 資料庫中。
    """
    try:
        data = request.get_json()
        
        # 檢查並驗證前端傳入的 JSON 欄位
        if not data or not all(k in data for k in ('username', 'difficulty', 'game_time', 'clicks')):
            return jsonify({'error': '資料欄位不完整'}), 400
            
        username = data['username'].strip()
        difficulty = data['difficulty']
        game_time = int(data['game_time'])
        clicks = int(data['clicks'])
        
        # 基礎防禦：避免空白檔名
        if not username:
            username = "無名英雄"
            
        # 建立新的成績物件
        new_score = Score(
            username=username,
            difficulty=difficulty,
            game_time=game_time,
            clicks=clicks
        )
        
        # 寫入 SQLite
        db.session.add(new_score)
        db.session.commit()
        
        return jsonify({'message': '成績已成功寫入英雄榜！'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==========================================
# 4. 本地端運行進入點
# ==========================================
if __name__ == '__main__':
    # 本地測試使用 debug 模式
    app.run(host='0.0.0.0', port=5000, debug=True)
