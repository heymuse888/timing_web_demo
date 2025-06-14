from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import random
import json
import os
from datetime import datetime, timedelta

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据存储文件路径
DATA_FILE = "user_data.json"

def save_user_data(user_data: dict):
    """保存用户数据到JSON文件"""
    try:
        # 添加时间戳
        user_data["timestamp"] = datetime.now().isoformat()
        user_data["id"] = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        
        # 读取现有数据
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        else:
            existing_data = []
        
        # 添加新数据
        existing_data.append(user_data)
        
        # 保存到文件
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 用户数据已保存: {user_data['name']} ({user_data['id']})")
        return True
    except Exception as e:
        print(f"❌ 保存用户数据失败: {e}")
        return False

def get_user_count():
    """获取用户总数"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return len(data)
        return 0
    except:
        return 0

# 定义请求数据结构
class BirthdayData(BaseModel):
    name: str
    email: str
    birthday: str
    birthtime: str
    birthplace: str

# 定义时间值对的数据结构
class TimeValuePair(BaseModel):
    time: List[str]
    value: List[float]

# 定义响应数据结构
class AnalysisResponse(BaseModel):
    health: TimeValuePair
    career: TimeValuePair
    love: TimeValuePair

def generate_time_series():
    """生成从今天起未来3个月（90天），每天每2小时一个时间点的时间序列"""
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days = 90
    times = []
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        for hour in range(0, 24, 2):
            time_point = current_date.replace(hour=hour, minute=0)
            times.append(time_point.strftime("%m-%d %H:%M"))
    return times

def generate_mock_data() -> AnalysisResponse:
    # 生成时间序列
    times = generate_time_series()
    
    # 为每种类型创建时间和数值的映射
    def create_time_value_dict():
        values = []
        base = random.uniform(40, 60)  # 起始值
        for _ in range(len(times)):
            # 在前一个值基础上微调，波动范围小
            delta = random.uniform(-2, 2)
            base = min(80, max(20, base + delta))  # 保证在20~80之间
            values.append(round(base, 1))
        return {
            "time": times,
            "value": values
        }

    return {
        "health": create_time_value_dict(),
        "career": create_time_value_dict(),
        "love": create_time_value_dict()
    }

@app.post("/analyze/birthday", response_model=AnalysisResponse)
async def analyze_birthday(data: BirthdayData):
    print(f"📝 收到用户数据 - 姓名: {data.name}, 邮箱: {data.email}, 生日: {data.birthday}, 时间: {data.birthtime}, 出生地: {data.birthplace}")
    
    # 保存用户数据到后台
    user_data = {
        "name": data.name,
        "email": data.email,
        "birthday": data.birthday,
        "birthtime": data.birthtime,
        "birthplace": data.birthplace
    }
    
    save_success = save_user_data(user_data)
    if save_success:
        user_count = get_user_count()
        print(f"📊 当前用户总数: {user_count}")
    
    # 生成模拟数据
    analysis_data = generate_mock_data()
    
    return analysis_data

@app.get("/admin/users")
async def get_all_users():
    """管理接口：获取所有用户数据"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {
                    "total_users": len(data),
                    "users": data
                }
        return {"total_users": 0, "users": []}
    except Exception as e:
        return {"error": str(e)}

@app.get("/admin/stats")
async def get_user_stats():
    """管理接口：获取用户统计信息"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # 统计信息
                total_users = len(data)
                cities = {}
                recent_users = []
                
                for user in data:
                    # 统计城市分布
                    city = user.get('birthplace', '未知')
                    cities[city] = cities.get(city, 0) + 1
                    
                    # 最近用户（最近10个）
                    if len(recent_users) < 10:
                        recent_users.append({
                            "name": user.get('name', ''),
                            "timestamp": user.get('timestamp', ''),
                            "birthplace": user.get('birthplace', '')
                        })
                
                return {
                    "total_users": total_users,
                    "city_distribution": cities,
                    "recent_users": recent_users[-10:]  # 最近10个用户
                }
        return {"total_users": 0, "city_distribution": {}, "recent_users": []}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("🚀 启动SparkingTiming后端服务...")
    print("📊 管理接口:")
    print("   - 用户数据: http://localhost:9999/admin/users")
    print("   - 统计信息: http://localhost:9999/admin/stats")
    uvicorn.run("main:app", host="0.0.0.0", port=9999, reload=True) 