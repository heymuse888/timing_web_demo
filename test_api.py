#!/usr/bin/env python3
import requests
import json

# 测试数据
test_data = {
    "name": "测试用户",
    "email": "test@example.com",
    "birthday": "1990-01-01",
    "birthtime": "14:30",
    "birthplace": "北京"
}

def test_api():
    try:
        print("🧪 测试API数据存储功能...")
        
        # 发送POST请求
        response = requests.post(
            "http://localhost:9999/analyze/birthday",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ API请求成功")
            data = response.json()
            print(f"📊 返回数据包含 {len(data['health']['time'])} 个时间点")
        else:
            print(f"❌ API请求失败: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到API服务器，请确保后端服务正在运行")
    except Exception as e:
        print(f"❌ 测试失败: {e}")

def check_stats():
    try:
        print("\n📈 检查用户统计...")
        response = requests.get("http://localhost:9999/admin/stats")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"👥 总用户数: {stats['total_users']}")
            print(f"🏙️ 城市分布: {stats['city_distribution']}")
            print(f"🕒 最近用户: {len(stats['recent_users'])} 个")
        else:
            print(f"❌ 获取统计失败: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 统计检查失败: {e}")

if __name__ == "__main__":
    test_api()
    check_stats() 