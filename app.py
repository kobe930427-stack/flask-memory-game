from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)

# 📌 1. 設定 SQLite 資料庫，檔案會自動生在專案資料夾中
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///leaderboard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 📌 2. 定義資料庫欄位架構
class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    difficulty = db.Column(db.String(10), nullable=False)
    time_spent = db.Column(db.Integer, nullable=False)
    flips = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

# 📌 3. 自動建立資料庫檔案
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return render_template('index.html')

# 📌 4. API：讓前端儲存分數 (POST)
@app.route('/api/save_score', methods=['POST'])
def save_score():
    data = request.json
    new_score = Score(
        name=data['name'],
        difficulty=data['difficulty'],
        time_spent=int(data['time_spent']),
        flips=int(data['flips'])
    )
    db.session.add(new_score)
    db.session.commit()
    return jsonify({"status": "success", "message": "分數已成功儲存！"})

# 📌 5. API：讓前端讀取排行榜 (GET)
@app.route('/api/get_leaderboard/<difficulty>', methods=['GET'])
def get_leaderboard(difficulty):
    # 依時間（越少越好）和翻牌次數排序，只拿前 10 名
    scores = Score.query.filter_by(difficulty=difficulty)\
                        .order_by(Score.time_spent.asc(), Score.flips.asc())\
                        .limit(10).all()
    
    # 整理成 JSON 格式回傳給前端
    result = [{
        "name": s.name,
        "time_spent": s.time_spent,
        "flips": s.flips,
        "date": s.date.strftime('%Y-%m-%d %H:%M')
    } for s in scores]
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
