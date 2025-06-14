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
//        'https://3.141.200.229:9999/analyze/birthday', // HTTPS优先
        'http://3.141.200.229:9999/analyze/birthday'   // HTTP备用
    ];
    
    // 设置较短的超时时间，避免用户等待太久
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 3000); // 3秒超时
    });
    
    for (const endpoint of apiEndpoints) {
        try {
            console.log(`🔄 尝试连接API: ${endpoint}`);
            
            const fetchPromise = fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            // 使用Promise.race来实现超时控制
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            console.log('✅ 收到响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`🎯 使用真实API数据 (${endpoint})`);
            return data;
        } catch (error) {
            console.warn(`❌ API端点 ${endpoint} 不可用:`, error.message);
            // 继续尝试下一个端点
        }
    }
    
    // 所有API端点都失败，使用模拟数据
    console.log('🎲 所有API端点都不可用，使用模拟数据');
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
        case 'day':
        default:
            return aggregateByDay(health, career, love);
    }
}

// function aggregateByMonth(health, career, love) {
//     const monthlyData = {};
    
//     health.time.forEach((time, index) => {
//         const month = time.slice(0, 2);
//         if (!monthlyData[month]) {
//             monthlyData[month] = {
//                 health: [],
//                 career: [],
//                 love: []
//             };
//         }
//         monthlyData[month].health.push(health.value[index]);
//         monthlyData[month].career.push(career.value[index]);
//         monthlyData[month].love.push(love.value[index]);
//     });
    
//     const result = {
//         health: { time: [], value: [] },
//         career: { time: [], value: [] },
//         love: { time: [], value: [] }
//     };
    
//     Object.keys(monthlyData).forEach(month => {
//         const monthNum = month.replace(/^0/, '');
//         result.health.time.push(monthNum + '月');
//         result.career.time.push(monthNum + '月');
//         result.love.time.push(monthNum + '月');
        
//         // 计算每月平均值
//         result.health.value.push(Math.round(monthlyData[month].health.reduce((a, b) => a + b) / monthlyData[month].health.length * 10) / 10);
//         result.career.value.push(Math.round(monthlyData[month].career.reduce((a, b) => a + b) / monthlyData[month].career.length * 10) / 10);
//         result.love.value.push(Math.round(monthlyData[month].love.reduce((a, b) => a + b) / monthlyData[month].love.length * 10) / 10);
//     });
    
//     return result;
// }

function aggregateByMonth(health, career, love) {
    // 按天聚合，每12个时间点为一组
    const result = {
        health: { time: [], value: [] },
        career: { time: [], value: [] },
        love: { time: [], value: [] }
    };
    
    for (let i = 0; i < Math.round(health.time.length); i += 120) {
        const dayData = {
            health: health.value.slice(i, i + 120),
            career: career.value.slice(i, i + 120),
            love: love.value.slice(i, i + 120)
        };
        
        const dayLabel = health.time[i].slice(0, 5); // "MM-DD"
        
        result.health.time.push(dayLabel);
        result.career.time.push(dayLabel);
        result.love.time.push(dayLabel);
        
        result.health.value.push(Math.round(dayData.health.reduce((a, b) => a + b) / dayData.health.length * 120) / 120);
        result.career.value.push(Math.round(dayData.career.reduce((a, b) => a + b) / dayData.career.length * 120) / 120);
        result.love.value.push(Math.round(dayData.love.reduce((a, b) => a + b) / dayData.love.length * 120) / 120);
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
    
    for (let i = 0; i < Math.round(health.time.length/3); i += 12) {
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
        this.currentLevel = 'day'; // 默认显示日视图
        
        // 设置全局变量以便onClick事件访问
        window.birthdayAnalyzer = this;
        
        this.initializeEventListeners();
        this.initializeChart();
    }

    initializeEventListeners() {
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.addEventListener('click', () => this.analyzeBirthday());
        
        // 添加缩放控制按钮事件
        this.addZoomControls();
        
        // 开发测试：双击按钮直接使用模拟数据
        submitBtn.addEventListener('dblclick', () => this.testMockData());
    }
    
    // 测试模拟数据功能
    async testMockData() {
        console.log('🧪 测试模拟数据功能...');
        try {
            this.rawData = generateMockData();
            this.updateChart();
            console.log('✅ 模拟数据测试成功');
        } catch (error) {
            console.error('❌ 模拟数据测试失败:', error);
        }
    }
    
    addZoomControls() {
        // 创建缩放控制按钮
        const energySection = document.querySelector('.energy-section');
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'zoom-controls';
        controlsDiv.style.cssText = 'margin-bottom: 20px; display: flex; gap: 10px; justify-content: center;';
        
        const levels = [
            { key: 'month', label: '月视图' },
            { key: 'day', label: '日视图' }
        ];
        
        levels.forEach(level => {
            const btn = document.createElement('button');
            btn.textContent = level.label;
            btn.className = 'zoom-btn';
            btn.style.cssText = `
                padding: 8px 16px;
                background: ${level.key === 'day' ? '#2759ac' : 'rgba(255,255,255,0.1)'};
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
        const levels = ['month', 'day'];
        
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
                interaction: {
                    intersect: false,
                    mode: 'nearest',
                    axis: 'xy'
                },
                onHover: (event, elements) => {
                    // 移除之前的tooltip
                    const existingTooltip = document.getElementById('custom-tooltip');
                    if (existingTooltip) {
                        existingTooltip.remove();
                    }
                    
                    if (elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const dataIndex = element.index;
                        
                        // 检查悬停的是否是白色圆点（最高点）
                        const dataset = window.birthdayAnalyzer.chart.data.datasets[datasetIndex];
                        const pointRadius = dataset.pointRadius;
                        const isMaxPoint = Array.isArray(pointRadius) ? pointRadius[dataIndex] > 0 : pointRadius > 0;
                        
                        if (isMaxPoint) {
                            window.birthdayAnalyzer.showTooltipAtPoint(event, datasetIndex, dataIndex);
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,  // 禁用默认的悬停tooltip
                        external: function(context) {
                            // 自定义tooltip显示逻辑
                            return;
                        }
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
                        min: 55,
                        max: 105,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#E2E8F0',
                            font: {
                                size: 14
                            }
                        },
                        display: false
                    }
                }
            }
        });
    }

    async analyzeBirthday() {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const birthdayInput = document.getElementById('birthday');
        const birthtimeInput = document.getElementById('birthtime');
        const birthplaceInput = document.getElementById('birthplace');
        const submitBtn = document.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const birthday = birthdayInput.value;
        const birthtime = birthtimeInput.value;
        const birthplace = birthplaceInput.value.trim();

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
        
        if (!birthday) {
            alert('请选择生日');
            birthdayInput.focus();
            return;
        }
        
        // 出生时间为可选字段，如果未填写则使用默认值
        const finalBirthtime = birthtime || '12:00';
        
        if (!birthplace) {
            alert('请输入出生地');
            birthplaceInput.focus();
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
            // 显示加载状态
            submitBtn.disabled = true;
            btnText.textContent = '推演中...';
            console.log('🚀 开始分析生日数据...');
            
            const userData = {
                name: name,
                email: email,
                phone: "000-0000-0000", // 添加必需的phone字段
                birthday: birthday,
                birthtime: finalBirthtime,
                birthplace: birthplace
            };
            
            this.rawData = await analyzeBirthdayAPI(userData);
            this.updateChart();
            
            console.log('✅ 分析完成，图表已更新');
        } catch (error) {
            console.error('❌ 分析失败:', error);
            alert('分析失败，请稍后重试');
        } finally {
            // 恢复按钮状态
            submitBtn.disabled = false;
            btnText.textContent = '推演';
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
        // 找出每条曲线的最高点
        function findMaximumPoints(values) {
            const maxValue = Math.max(...values);
            const maxIndices = [];
            values.forEach((value, index) => {
                if (value === maxValue) {
                    maxIndices.push(index);
                }
            });
            return maxIndices;
        }
        
        // 为每条曲线找出最高点
        const healthMaxima = findMaximumPoints(data.health.value);
        const careerMaxima = findMaximumPoints(data.career.value);
        const loveMaxima = findMaximumPoints(data.love.value);
        
        // 创建点半径数组，只在最高点显示白色圆点
        function makePointRadius(length, maxima) {
            const arr = new Array(length).fill(0);
            maxima.forEach(i => arr[i] = 8);
            return arr;
        }
        
        // 创建点颜色数组，最高点为白色，其他透明
        function makePointColor(length, maxima) {
            const arr = new Array(length).fill('rgba(0,0,0,0)');
            maxima.forEach(i => arr[i] = '#FFFFFF');
            return arr;
        }
        
        // 创建点击检测半径数组，让白色圆点更容易被检测到
        function makePointHitRadius(length, maxima) {
            const arr = new Array(length).fill(1);
            maxima.forEach(i => arr[i] = 15); // 增大检测半径
            return arr;
        }
        
        if (this.currentLevel === 'month') {
            // 月视图：显示能量最高点的白色圆点
            this.chart.data.datasets[0].pointRadius = makePointRadius(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointRadius = makePointRadius(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointRadius = makePointRadius(data.love.value.length, loveMaxima);
            
            this.chart.data.datasets[0].pointBackgroundColor = makePointColor(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointBackgroundColor = makePointColor(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointBackgroundColor = makePointColor(data.love.value.length, loveMaxima);
            
            // 设置点的边框颜色，使白色圆点更明显
            this.chart.data.datasets[0].pointBorderColor = makePointColor(data.health.value.length, healthMaxima).map(c => c === '#FFFFFF' ? '#5116b4' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[1].pointBorderColor = makePointColor(data.career.value.length, careerMaxima).map(c => c === '#FFFFFF' ? '#2759ac' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[2].pointBorderColor = makePointColor(data.love.value.length, loveMaxima).map(c => c === '#FFFFFF' ? '#9444a3' : 'rgba(0,0,0,0)');
            
            // 设置点的边框宽度
            this.chart.data.datasets[0].pointBorderWidth = makePointRadius(data.health.value.length, healthMaxima).map(r => r > 0 ? 2 : 0);
            this.chart.data.datasets[1].pointBorderWidth = makePointRadius(data.career.value.length, careerMaxima).map(r => r > 0 ? 2 : 0);
            this.chart.data.datasets[2].pointBorderWidth = makePointRadius(data.love.value.length, loveMaxima).map(r => r > 0 ? 2 : 0);
            
            // 设置点击检测半径，让白色圆点更容易被检测到
            this.chart.data.datasets[0].pointHitRadius = makePointHitRadius(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointHitRadius = makePointHitRadius(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointHitRadius = makePointHitRadius(data.love.value.length, loveMaxima);
        } else if (this.currentLevel === 'day') {
            // 日视图：也显示能量最高点的白色圆点
            this.chart.data.datasets[0].pointRadius = makePointRadius(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointRadius = makePointRadius(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointRadius = makePointRadius(data.love.value.length, loveMaxima);
            
            this.chart.data.datasets[0].pointBackgroundColor = makePointColor(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointBackgroundColor = makePointColor(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointBackgroundColor = makePointColor(data.love.value.length, loveMaxima);
            
            // 设置点的边框颜色，使白色圆点更明显
            this.chart.data.datasets[0].pointBorderColor = makePointColor(data.health.value.length, healthMaxima).map(c => c === '#FFFFFF' ? '#5116b4' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[1].pointBorderColor = makePointColor(data.career.value.length, careerMaxima).map(c => c === '#FFFFFF' ? '#2759ac' : 'rgba(0,0,0,0)');
            this.chart.data.datasets[2].pointBorderColor = makePointColor(data.love.value.length, loveMaxima).map(c => c === '#FFFFFF' ? '#9444a3' : 'rgba(0,0,0,0)');
            
            // 设置点的边框宽度
            this.chart.data.datasets[0].pointBorderWidth = makePointRadius(data.health.value.length, healthMaxima).map(r => r > 0 ? 2 : 0);
            this.chart.data.datasets[1].pointBorderWidth = makePointRadius(data.career.value.length, careerMaxima).map(r => r > 0 ? 2 : 0);
            this.chart.data.datasets[2].pointBorderWidth = makePointRadius(data.love.value.length, loveMaxima).map(r => r > 0 ? 2 : 0);
            
            // 设置点击检测半径，让白色圆点更容易被检测到
            this.chart.data.datasets[0].pointHitRadius = makePointHitRadius(data.health.value.length, healthMaxima);
            this.chart.data.datasets[1].pointHitRadius = makePointHitRadius(data.career.value.length, careerMaxima);
            this.chart.data.datasets[2].pointHitRadius = makePointHitRadius(data.love.value.length, loveMaxima);
        }
    }
    
    showTooltipAtPoint(event, datasetIndex, dataIndex) {
        const dataset = this.chart.data.datasets[datasetIndex];
        const label = this.chart.data.labels[dataIndex];
        const value = dataset.data[dataIndex];
        const curveName = dataset.label;
        
        // 移除之前的tooltip
        const existingTooltip = document.getElementById('custom-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // 获取图表容器的位置
        const chartContainer = this.chart.canvas.getBoundingClientRect();
        const canvasPosition = Chart.helpers.getRelativePosition(event, this.chart);
        const datasetMeta = this.chart.getDatasetMeta(datasetIndex);
        const pointElement = datasetMeta.data[dataIndex];
        
        // 创建自定义tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'custom-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: nowrap;
        `;
        
        // 设置曲线颜色
        const colors = {
            '健康': '#5116b4',
            '事业': '#2759ac', 
            '爱情': '#9444a3'
        };
        
        tooltip.innerHTML = `
            <div style="margin-bottom: 6px; font-weight: bold; color: #E2E8F0;">
                时间: ${label}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${colors[curveName]};"></div>
                <span style="font-weight: bold;">${curveName}: ${value}</span>
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #A0AEC0;">
                ⭐ 能量最高点
            </div>
        `;
        
        // 将tooltip添加到图表容器
        const chartWrapper = this.chart.canvas.parentElement;
        chartWrapper.style.position = 'relative';
        chartWrapper.appendChild(tooltip);
        
        // 计算tooltip位置
        const tooltipRect = tooltip.getBoundingClientRect();
        const pointX = pointElement.x;
        const pointY = pointElement.y;
        
        // 调整位置，确保tooltip不会超出图表边界
        let left = pointX - tooltipRect.width / 2;
        let top = pointY - tooltipRect.height - 10;
        
        // 边界检查
        if (left < 0) left = 10;
        if (left + tooltipRect.width > chartContainer.width) {
            left = chartContainer.width - tooltipRect.width - 10;
        }
        if (top < 0) {
            top = pointY + 10; // 显示在点的下方
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // 鼠标移开图表区域时自动隐藏tooltip
        const chartCanvas = this.chart.canvas;
        const hideTooltipOnLeave = () => {
            if (tooltip && tooltip.parentElement) {
                tooltip.remove();
            }
            chartCanvas.removeEventListener('mouseleave', hideTooltipOnLeave);
        };
        
        chartCanvas.addEventListener('mouseleave', hideTooltipOnLeave);
    }
}

// 页面加载时初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BirthdayAnalyzer();
}); 
