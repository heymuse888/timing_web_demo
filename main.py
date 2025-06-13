from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import random
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

# 定义请求数据结构
class BirthdayData(BaseModel):
    birthday: str

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
    print(f"Received birthday: {data.birthday}")
    
    # 生成模拟数据
    analysis_data = generate_mock_data()
    
    return analysis_data

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=9999, reload=True) 