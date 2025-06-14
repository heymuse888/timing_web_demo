// 生成模拟数据
function generateMockData() {
    const times = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    // 生成90天，每2小时一个点的时间序列
    for (let day = 0; day < 90; day++) {
        for (let hour = 0; hour < 24; hour += 2) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);
            date.setHours(hour);
            const timeStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            times.push(timeStr);
        }
    }
    
    // 生成三条不同特征的曲线
    function generateCurveData(baseValue, trend, volatility) {
        const values = [];
        let current = baseValue;
        
        for (let i = 0; i < times.length; i++) {
            // 添加趋势
            current += trend * (Math.random() - 0.5);
            // 添加波动
            current += volatility * (Math.random() - 0.5);
            // 保持在合理范围内
            current = Math.max(20, Math.min(80, current));
            values.push(Math.round(current * 10) / 10);
        }
        
        return values;
    }
    
    return {
        health: {
            time: times,
            value: generateCurveData(50, 0.1, 4)
        },
        career: {
            time: times,
            value: generateCurveData(45, 0.15, 5)
        },
        love: {
            time: times,
            value: generateCurveData(55, 0.05, 3)
        }
    };
}

// 调用后端API进行生日分析，失败时使用模拟数据
async function analyzeBirthdayAPI(userData) {
    // API端点列表，按优先级排序
    const apiEndpoints = [
        'https://18.218.101.156:9999/analyze/birthday', // HTTPS优先
        'http://18.218.101.156:9999/analyze/birthday'   // HTTP备用
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            console.log(`尝试连接API: ${endpoint}`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            console.log('收到响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`使用真实API数据 (${endpoint})`);
            return data;
        } catch (error) {
            console.warn(`API端点 ${endpoint} 不可用:`, error.message);
            // 继续尝试下一个端点
        }
    }
    
    // 所有API端点都失败，使用模拟数据
    console.warn('所有API端点都不可用，使用模拟数据');
    return generateMockData();
}

// 模拟生日分析数据生成
// function generateBirthdayAnalysis(birthday) {
//     return new Promise((resolve) => {
//         setTimeout(() => {
//             // 生成三条曲线的随机数据
//             const generateData = () => ['6月', '7月', '8月', '9月'].map(() => 
//                 Math.floor(Math.random() * 60) + 20
//             );

//             resolve({
//                 health: generateData(),    // 健康
//                 career: generateData(),    // 事业
//                 love: generateData()       // 爱情
//             });
//         }, 500);
//     });

// 辅助函数：找出每个月的全局最大值和最小值的索引
function findMonthlyExtrema(times, values) {
    const maxima = [];
    const minima = [];
    let month = null;
    let monthIndices = [];
    for (let i = 0; i < times.length; i++) {
        const curMonth = times[i].slice(0, 2); // "MM" 部分
        if (month === null) {
            month = curMonth;
        }
        if (curMonth !== month) {
            // 处理上一个月
            if (monthIndices.length > 0) {
                let maxIdx = monthIndices[0];
                let minIdx = monthIndices[0];
                for (const idx of monthIndices) {
                    if (values[idx] > values[maxIdx]) maxIdx = idx;
                    if (values[idx] < values[minIdx]) minIdx = idx;
                }
                maxima.push(maxIdx);
                minima.push(minIdx);
            }
            // 开始新月份
            month = curMonth;
            monthIndices = [];
        }
        monthIndices.push(i);
    }
    // 处理最后一个月
    if (monthIndices.length > 0) {
        let maxIdx = monthIndices[0];
        let minIdx = monthIndices[0];
        for (const idx of monthIndices) {
            if (values[idx] > values[maxIdx]) maxIdx = idx;
            if (values[idx] < values[minIdx]) minIdx = idx;
        }
        maxima.push(maxIdx);
        minima.push(minIdx);
    }
    return { maxima, minima };
}

// 数据聚合函数
function aggregateDataByLevel(rawData, level) {
    const { health, career, love } = rawData;
    
    switch (level) {
        case 'month':
            return aggregateByMonth(health, career, love);
        case 'week':
            return aggregateByWeek(health, career, love);
        case 'day':
            return aggregateByDay(health, career, love);
        case 'hour':
        default:
            return { health, career, love };
    }
}

function aggregateByMonth(health, career, love) {
    const monthlyData = {};
    
    health.time.forEach((time, index) => {
        const month = time.slice(0, 2);
        if (!monthlyData[month]) {
            monthlyData[month] = {
                health: [],
                career: [],
                love: []
            };
        }
        monthlyData[month].health.push(health.value[index]);
        monthlyData[month].career.push(career.value[index]);
        monthlyData[month].love.push(love.value[index]);
    });
    
    const result = {
        health: { time: [], value: [] },
        career: { time: [], value: [] },
        love: { time: [], value: [] }
    };
    
    Object.keys(monthlyData).forEach(month => {
        const monthNum = month.replace(/^0/, '');
        result.health.time.push(monthNum + '月');
        result.career.time.push(monthNum + '月');
        result.love.time.push(monthNum + '月');
        
        // 计算每月平均值
        result.health.value.push(Math.round(monthlyData[month].health.reduce((a, b) => a + b) / monthlyData[month].health.length * 10) / 10);
        result.career.value.push(Math.round(monthlyData[month].career.reduce((a, b) => a + b) / monthlyData[month].career.length * 10) / 10);
        result.love.value.push(Math.round(monthlyData[month].love.reduce((a, b) => a + b) / monthlyData[month].love.length * 10) / 10);
    });
    
    return result;
}

function aggregateByWeek(health, career, love) {
    // 按周聚合，每7天为一组
    const result = {
        health: { time: [], value: [] },
        career: { time: [], value: [] },
        love: { time: [], value: [] }
    };
    
    for (let i = 0; i < health.time.length; i += 84) { // 7天 * 12个时间点
        const weekData = {
            health: health.value.slice(i, i + 84),
            career: career.value.slice(i, i + 84),
            love: love.value.slice(i, i + 84)
        };
        
        // 获取这一周的开始和结束日期
        const weekStart = health.time[i].slice(0, 5); // "MM-DD"
        const weekEndIndex = Math.min(i + 83, health.time.length - 1);
        const weekEnd = health.time[weekEndIndex].slice(0, 5); // "MM-DD"
        const weekLabel = `${weekStart}~${weekEnd}`;
        
        result.health.time.push(weekLabel);
        result.career.time.push(weekLabel);
        result.love.time.push(weekLabel);
        
        result.health.value.push(Math.round(weekData.health.reduce((a, b) => a + b) / weekData.health.length * 10) / 10);
        result.career.value.push(Math.round(weekData.career.reduce((a, b) => a + b) / weekData.career.length * 10) / 10);
        result.love.value.push(Math.round(weekData.love.reduce((a, b) => a + b) / weekData.love.length * 10) / 10);
    }
    
    return result;
}

function aggregateByDay(health, career, love) {
    // 按天聚合，每12个时间点为一组
    const result = {
        health: { time: [], value: [] },
        career: { time: [], value: [] },
        love: { time: [], value: [] }
    };
    
    for (let i = 0; i < health.time.length; i += 12) {
        const dayData = {
            health: health.value.slice(i, i + 12),
            career: career.value.slice(i, i + 12),
            love: love.value.slice(i, i + 12)
        };
        
        const dayLabel = health.time[i].slice(0, 5); // "MM-DD"
        
        result.health.time.push(dayLabel);
        result.career.time.push(dayLabel);
        result.love.time.push(dayLabel);
        
        result.health.value.push(Math.round(dayData.health.reduce((a, b) => a + b) / dayData.health.length * 10) / 10);
        result.career.value.push(Math.round(dayData.career.reduce((a, b) => a + b) / dayData.career.length * 10) / 10);
        result.love.value.push(Math.round(dayData.love.reduce((a, b) => a + b) / dayData.love.length * 10) / 10);
    }
    
    return result;
}

// 主应用逻辑
class BirthdayAnalyzer {
    constructor() {
        this.chart = null;
        this.rawData = null;
        this.currentLevel = 'month'; // 'month', 'week', 'day', 'hour'
        this.initializeEventListeners();
        this.initializeChart();
    }

    initializeEventListeners() {
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.addEventListener('click', () => this.analyzeBirthday());
        
        // 添加缩放控制按钮事件
        this.addZoomControls();
    }
    
    addZoomControls() {
        // 创建缩放控制按钮
        const energySection = document.querySelector('.energy-section');
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'zoom-controls';
        controlsDiv.style.cssText = 'margin-bottom: 20px; display: flex; gap: 10px; justify-content: center;';
        
        const levels = [
            { key: 'month', label: '月视图' },
            { key: 'week', label: '周视图' },
            { key: 'day', label: '日视图' },
            { key: 'hour', label: '小时视图' }
        ];
        
        levels.forEach(level => {
            const btn = document.createElement('button');
            btn.textContent = level.label;
            btn.className = 'zoom-btn';
            btn.style.cssText = `
                padding: 8px 16px;
                background: ${level.key === 'month' ? '#2759ac' : 'rgba(255,255,255,0.1)'};
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            btn.addEventListener('click', () => {
                this.currentLevel = level.key;
                this.updateZoomButtons();
                this.updateChart();
            });
            
            controlsDiv.appendChild(btn);
        });
        
        energySection.insertBefore(controlsDiv, energySection.querySelector('canvas'));
    }
    
    updateZoomButtons() {
        const buttons = document.querySelectorAll('.zoom-btn');
        const levels = ['month', 'week', 'day', 'hour'];
        
        buttons.forEach((btn, index) => {
            if (levels[index] === this.currentLevel) {
                btn.style.background = '#2759ac';
            } else {
                btn.style.background = 'rgba(255,255,255,0.1)';
            }
        });
    }

    initializeChart() {
        const ctx = document.getElementById('energyChart').getContext('2d');
        
        // 创建渐变色
        const healthGradient = ctx.createLinearGradient(0, 0, 0, 400);
        healthGradient.addColorStop(0, 'rgba(81, 22, 180, 0.3)');
        healthGradient.addColorStop(1, 'rgba(81, 22, 180, 0.05)');
        
        const careerGradient = ctx.createLinearGradient(0, 0, 0, 400);
        careerGradient.addColorStop(0, 'rgba(39, 89, 172, 0.3)');
        careerGradient.addColorStop(1, 'rgba(39, 89, 172, 0.05)');
        
        const loveGradient = ctx.createLinearGradient(0, 0, 0, 400);
        loveGradient.addColorStop(0, 'rgba(148, 68, 163, 0.3)');
        loveGradient.addColorStop(1, 'rgba(148, 68, 163, 0.05)');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '健康',
                        data: [],
                        borderColor: '#5116b4',
                        backgroundColor: healthGradient,
                        tension: 0.8,
                        fill: true,
                        borderWidth: 5
                    },
                    {
                        label: '事业',
                        data: [],
                        borderColor: '#2759ac',
                        backgroundColor: careerGradient,
                        tension: 0.8,
                        fill: true,
                        borderWidth: 5
                    },
                    {
                        label: '爱情',
                        data: [],
                        borderColor: '#9444a3',
                        backgroundColor: loveGradient,
                        tension: 0.8,
                        fill: true,
                        borderWidth: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#E2E8F0',
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 14
                            },
                            maxTicksLimit: 20
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#E2E8F0',
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });
    }

    async analyzeBirthday() {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const birthdayInput = document.getElementById('birthday');
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const birthday = birthdayInput.value;

        // 验证必填字段
        if (!name) {
            alert('请输入姓名');
            nameInput.focus();
            return;
        }
        
        if (!email) {
            alert('请输入邮箱');
            emailInput.focus();
            return;
        }
        
        if (!phone) {
            alert('请输入电话');
            phoneInput.focus();
            return;
        }
        
        if (!birthday) {
            alert('请选择生日');
            birthdayInput.focus();
            return;
        }

        // 简单的邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('请输入有效的邮箱地址');
            emailInput.focus();
            return;
        }

        try {
            const userData = {
                name: name,
                email: email,
                phone: phone,
                birthday: birthday
            };
            
            this.rawData = await analyzeBirthdayAPI(userData);
            this.updateChart();
        } catch (error) {
            console.error('分析失败:', error);
            alert('分析失败，请稍后重试');
        }
    }
    
    updateChart() {
        if (!this.rawData) return;
        
        const data = aggregateDataByLevel(this.rawData, this.currentLevel);
        
        // 更新图表数据
        this.chart.data.labels = data.health.time;
        this.chart.data.datasets[0].data = data.health.value;
        this.chart.data.datasets[1].data = data.career.value;
        this.chart.data.datasets[2].data = data.love.value;

        // 根据当前层级设置高亮点
        this.setHighlightPoints(data);
        
        this.chart.update();
    }
    
    setHighlightPoints(data) {
        if (this.currentLevel === 'month') {
            // 月视图：高亮最高和最低点
            const healthExtrema = findMonthlyExtrema(data.health.time, data.health.value);
            
            function makePointRadius(length, maxima, minima) {
                const arr = new Array(length).fill(0);
                maxima.forEach(i => arr[i] = 8);
                minima.forEach(i => arr[i] = 8);
                return arr;
            }
            
            this.chart.data.datasets[0].pointRadius = makePointRadius(data.health.value.length, healthExtrema.maxima, healthExtrema.minima);
            this.chart.data.datasets[1].pointRadius = makePointRadius(data.career.value.length, healthExtrema.maxima, healthExtrema.minima);
            this.chart.data.datasets[2].pointRadius = makePointRadius(data.love.value.length, healthExtrema.maxima, healthExtrema.minima);
            
            this.chart.data.datasets[0].pointBackgroundColor = makePointRadius(data.health.value.length, healthExtrema.maxima, healthExtrema.minima).map(r => r > 0 ? '#FFFFFF' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[1].pointBackgroundColor = makePointRadius(data.career.value.length, healthExtrema.maxima, healthExtrema.minima).map(r => r > 0 ? '#FFFFFF' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[2].pointBackgroundColor = makePointRadius(data.love.value.length, healthExtrema.maxima, healthExtrema.minima).map(r => r > 0 ? '#FFFFFF' : 'rgba(0,0,0,0)');
        } else if (this.currentLevel === 'hour' || this.currentLevel === 'day') {
            // 小时视图和日视图：不显示任何点，只显示干净曲线
            const length = data.health.value.length;
            const pointRadius = new Array(length).fill(0);
            const pointColor = new Array(length).fill('rgba(0,0,0,0)');
            
            this.chart.data.datasets[0].pointRadius = pointRadius;
            this.chart.data.datasets[1].pointRadius = pointRadius;
            this.chart.data.datasets[2].pointRadius = pointRadius;
            
            this.chart.data.datasets[0].pointBackgroundColor = pointColor;
            this.chart.data.datasets[1].pointBackgroundColor = pointColor;
            this.chart.data.datasets[2].pointBackgroundColor = pointColor;
        } else {
            // 周视图：显示所有点
            const length = data.health.value.length;
            const pointRadius = new Array(length).fill(4);
            const pointColor = new Array(length).fill('#FFFFFF');
            
            this.chart.data.datasets[0].pointRadius = pointRadius;
            this.chart.data.datasets[1].pointRadius = pointRadius;
            this.chart.data.datasets[2].pointRadius = pointRadius;
            
            this.chart.data.datasets[0].pointBackgroundColor = pointColor;
            this.chart.data.datasets[1].pointBackgroundColor = pointColor;
            this.chart.data.datasets[2].pointBackgroundColor = pointColor;
        }
    }
}

// 页面加载时初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BirthdayAnalyzer();
}); 