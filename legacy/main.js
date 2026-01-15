import { createChart } from 'lightweight-charts';

// --- 전역 설정 및 상태 ---
const SYMBOLS = {
    SAMSUNG: '005930.KS',
    SKHYNIX: '000660.KS'
};

let currentSymbol = SYMBOLS.SAMSUNG;
let chart, candleSeries, lineSeries, areaSeries;
let priceData = [];

// --- DOM 요소 ---
const chartElement = document.getElementById('chart');
const loadingOverlay = document.getElementById('loading');
const commentaryBox = document.getElementById('commentary');
const priceEl = document.getElementById('stat-price');
const changeEl = document.getElementById('stat-change');
const highEl = document.getElementById('stat-high');
const lowEl = document.getElementById('stat-low');

// --- 차트 초기화 ---
function initChart() {
    chart = createChart(chartElement, {
        layout: {
            background: { color: 'transparent' },
            textColor: '#8b949e',
        },
        grid: {
            vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
            horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        crosshair: {
            mode: 0,
        },
        timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.2)',
            timeVisible: true,
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
        },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#3fb950',
        downColor: '#f85149',
        borderVisible: false,
        wickUpColor: '#3fb950',
        wickDownColor: '#f85149',
    });

    // 예측 경로용 시리즈 (점선)
    lineSeries = chart.addLineSeries({
        color: '#58a6ff',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        lastValueVisible: false,
        priceLineVisible: false,
    });

    // 신뢰 구간용 시리즈 (영역)
    areaSeries = chart.addAreaSeries({
        topColor: 'rgba(88, 166, 255, 0.2)',
        bottomColor: 'rgba(88, 166, 255, 0)',
        lineVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
    });

    window.addEventListener('resize', () => {
        chart.applyOptions({ width: chartElement.clientWidth, height: chartElement.clientHeight });
    });
}

// --- 데이터 가져오기 (Mock Data for POC) ---
async function fetchData(symbol) {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.style.display = 'flex';

    try {
        // 로컬 프록시 서버 호출
        const response = await fetch(`http://localhost:3000/api/stock/${symbol}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        loadingOverlay.classList.add('hidden');
        loadingOverlay.style.display = 'none';
        return data;
    } catch (error) {
        console.error('Error fetching real data:', error);
        // 에러 발생 시 사용자 피드백 (간소화)
        loadingOverlay.innerHTML = `<p style="color: white;">데이터 로딩 실패: ${error.message}</p>`;
        return [];
    }
}

// --- 통계 유틸리티: 상관계수 엔진 ---
function getPearsonCorrelation(x, y) {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
}

// 스피어만 순위 상관계수: 비선형적 추세(순위 변화) 포착
function getSpearmanCorrelation(x, y) {
    const ranksX = arrayToRanks(x);
    const ranksY = arrayToRanks(y);
    return getPearsonCorrelation(ranksX, ranksY);
}

// 배열의 값들을 순위(Rank)로 변환 (동점자 처리 포함)
function arrayToRanks(arr) {
    const sorted = [...arr].map((val, i) => ({ val, i })).sort((a, b) => a.val - b.val);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; i++) {
        // 단순 순위가 아닌 평균 순위법(Average Rank) 적용 가능하나, 여기서는 단순 인덱스 활용
        ranks[sorted[i].i] = i + 1;
    }
    return ranks;
}

// --- 패턴 매칭 알고리즘 (Hybrid: Pearson + Spearman) ---
function findSimilarPatterns(history, targetPattern, windowSize = 15, predictionSize = 10) {
    const threshold = 0.82; // 복합 지표이므로 임계치를 살짝 조정
    const matches = [];

    // Rolling Window 검색
    for (let i = 0; i < history.length - windowSize - predictionSize; i++) {
        const windowData = history.slice(i, i + windowSize);
        const windowPrices = windowData.map(d => d.close);

        const pCorr = getPearsonCorrelation(targetPattern, windowPrices);
        const sCorr = getSpearmanCorrelation(targetPattern, windowPrices);

        // 하이브리드 점수 (가중 평균: 선형 50%, 비선형 50%)
        const hybridScore = (pCorr + sCorr) / 2;

        if (hybridScore >= threshold) {
            const future = history.slice(i + windowSize, i + windowSize + predictionSize).map(d => d.close);
            const matchDate = new Date(history[i].time * 1000).toLocaleDateString();
            matches.push({ correlation: hybridScore, future, date: matchDate, windowData });
        }
    }

    return matches.sort((a, b) => b.correlation - a.correlation).slice(0, 5);
}

// --- 예측 엔진 ---
function runPrediction(data) {
    const windowSize = 15;
    const predictionSize = 10;
    const targetPattern = data.slice(-windowSize).map(d => d.close);

    // 과거 히스토리 (현재 100일뿐이므로 모의를 위해 좀 더 긴 과거가 필요하지만, 
    // 여기서는 현재 데이터의 앞부분을 히스토리로 사용)
    const matches = findSimilarPatterns(data, targetPattern, windowSize, predictionSize);

    const lastPrice = data[data.length - 1].close;
    const lastTime = data[data.length - 1].time;
    const predictions = [];
    const confidenceUpper = [];
    const confidenceLower = [];

    if (matches.length > 0) {
        // 매칭된 구간들의 미래 데이터를 평균내어 예측 경로 생성
        for (let i = 0; i < predictionSize; i++) {
            let sum = 0;
            let values = [];
            matches.forEach(m => {
                // 과거 가격 차이를 현재 마지막 가격에 투영 (Price Projection)
                const priceDiff = m.future[i] - m.future[0];
                const projectedPrice = lastPrice + priceDiff;
                sum += projectedPrice;
                values.push(projectedPrice);
            });

            const avgPrice = sum / matches.length;
            const time = lastTime + ((i + 1) * 86400);

            predictions.push({ time, value: avgPrice });

            // 신뢰 구간 (최댓값/최솟값 활용)
            confidenceUpper.push({ time, value: Math.max(...values) + 500 });
            confidenceLower.push({ time, value: Math.min(...values) - 500 });
        }
    } else {
        // 매칭 실패 시 기본 랜덤 워크 (안전 장치)
        for (let i = 1; i <= predictionSize; i++) {
            const time = lastTime + (i * 86400);
            const value = lastPrice + (Math.random() - 0.45) * 2000;
            predictions.push({ time, value });
            confidenceUpper.push({ time, value: value + 1000 });
            confidenceLower.push({ time, value: value - 1000 });
        }
    }

    lineSeries.setData(predictions);

    // 구름대 시각화 (Area Series 활용하여 상/하단 표현)
    // Lightweight charts area series는 단일 value이므로, 여기서는 상단만 표시하거나 별도 처리 필요
    // 개선: areaSeries는 상단/하단을 직접 지원하지 않으므로 상단만 채우거나 
    // 두 개의 AreaSeries를 겹쳐서 투명도 조절
    areaSeries.setData(confidenceUpper.map((d, idx) => ({
        time: d.time,
        value: d.value,
        // bottomValue: confidenceLower[idx].value // 지원하지 않음
    })));

    return { predictions, matches }; // matches 함께 반환
}

// --- 주린이 패턴 탐지 (Feature Engineering) ---
function detectJurineePattern(data) {
    // 기획: 급등(왼쪽 얼굴) -> 고점에서의 3회 이상 미세 파동(머리 뾰족이) -> 하락 징후
    const recent = data.slice(-20);
    const prices = recent.map(d => d.close);

    const maxIdx = prices.indexOf(Math.max(...prices));
    const isSpike = maxIdx > 5 && maxIdx < 15; // 중간쯤에 고점이 있는가

    // 고점 근처에서의 파동(Oscillation) 계산
    let oscillations = 0;
    for (let i = maxIdx - 2; i <= maxIdx + 2; i++) {
        if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) oscillations++;
    }

    return isSpike && oscillations >= 2;
}

// --- 기영이 진단 엔진 ---
function updateCommentary(data, predictionsObj) {
    const { predictions, matches } = predictionsObj;
    const lastPrice = data[data.length - 1].close;
    const firstPrice = data[data.length - 15].close;
    const trend = lastPrice > firstPrice ? '상승' : '하락';
    const predTrend = predictions[predictions.length - 1].value > lastPrice ? '상승' : '하락';
    const isJurineeHair = detectJurineePattern(data);

    let msg = "";
    if (isKiyoungHair) {
        msg = "앗! **주린이 머리 패턴**이 감지되었습니다! 초보자들은 뾰족한 머리카락에 찔리지 않게 조심해야 해요. 곧 오른쪽 팔(급락)이 나올 수도 있으니 주의하세요!";
    } else if (trend === '상승' && predTrend === '상승') {
        msg = "주린이가 머리카락을 꼿꼿이 세웠네요! 기세가 좋습니다. 바나나를 먹으며 즐겁게 기다려봐도 좋겠어요.";
    } else if (trend === '하락' && predTrend === '상승') {
        msg = "주린이가 머리를 긁적이고 있어요. 역전의 찬스가 올지도? 무릎에서 사서 어깨에서 판다는 말을 기억하세요!";
    } else if (predTrend === '하락') {
        msg = "주린이가 눈물을 흘리며 퇴근하고 있어요. 잠시 관망할까요? 억지로 매수하면 주린이 머리처럼 뾰족해질지도 몰라요.";
    } else {
        msg = "주린이가 멍하니 차트를 보고 있네요. 방향성이 애매할 때는 주린이처럼 맛있는 거 먹으러 가는 게 최고입니다.";
    }

    commentaryBox.innerHTML = `
        <div class="commentary-content">
            <div class="jurinee-avatar">
                <img src="/kiyoung.png" alt="주린이" width="60">
            </div>
            <p>${msg}</p>
        </div>
    `;

    // 예측 근거 패널 업데이트
    const basisContainer = document.getElementById('prediction-basis');
    if (matches && matches.length > 0) {
        basisContainer.innerHTML = '';
        matches.forEach((m, idx) => {
            const item = document.createElement('div');
            item.className = 'basis-item';
            item.innerHTML = `
            <div class="match-info">
                <span class="match-date">과거: ${m.date}</span>
                <span class="match-corr">종합 유사도: ${(m.correlation * 100).toFixed(1)}%</span>
            </div>`;

            // 호버 이벤트 등록
            item.addEventListener('mouseenter', (e) => showTooltip(e, m.windowData));
            item.addEventListener('mouseleave', hideTooltip);

            basisContainer.appendChild(item);
        });
    } else {
        basisContainer.innerHTML = '<p class="empty-msg">유사한 과거 패턴을 찾지 못해 랜덤 워크로 예측했습니다.</p>';
    }

    // 마커 추가: 고점에 기영이 머리 표시
    const maxPrice = Math.max(...data.map(d => d.high));
    const maxData = data.find(d => d.high === maxPrice);

    candleSeries.setMarkers([
        {
            time: maxData.time,
            position: 'aboveBar',
            color: '#f2cc60',
            shape: 'arrowUp',
            text: '주린이 머리!',
        }
    ]);

    // 지표 업데이트
    priceEl.innerText = lastPrice.toLocaleString() + '원';
    const change = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);
    changeEl.innerText = (change > 0 ? '+' : '') + change + '%';
    changeEl.style.color = change > 0 ? 'var(--up-color)' : 'var(--down-color)';
    highEl.innerText = data[data.length - 1].high.toLocaleString();
    lowEl.innerText = data[data.length - 1].low.toLocaleString();
}

// --- 메인 흐름 ---
async function updateChart(symbol) {
    priceData = await fetchData(symbol);

    if (!priceData || priceData.length === 0) {
        console.error('No price data to render');
        return;
    }

    candleSeries.setData(priceData);
    const predictionsObj = runPrediction(priceData);
    updateCommentary(priceData, predictionsObj);
    chart.timeScale().fitContent();
}

// 초기화 실행
window.addEventListener('DOMContentLoaded', async () => {
    try {
        initChart();
        setupEventListeners();
        await updateChart(currentSymbol);
    } catch (error) {
        console.error('CRITICAL ERROR DURING INIT:', error);
    }
});

function setupEventListeners() {
    document.getElementById('btn-samsung').addEventListener('click', async (e) => {
        currentSymbol = SYMBOLS.SAMSUNG;
        document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        await updateChart(currentSymbol);
    });

    document.getElementById('btn-skhynix').addEventListener('click', async (e) => {
        currentSymbol = SYMBOLS.SKHYNIX;
        document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        await updateChart(currentSymbol);
    });
}

// --- 툴팁 및 미니 차트 로직 ---
let miniChart, miniSeries;
const tooltip = document.getElementById('chart-tooltip');
const miniChartEl = document.getElementById('mini-chart');

function showTooltip(e, data) {
    tooltip.classList.remove('hidden');

    // 위치 조정
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = `${rect.left - 240}px`;
    tooltip.style.top = `${rect.top}px`;

    // 미니 차트 초기화 (최초 1회)
    if (!miniChart) {
        miniChart = createChart(miniChartEl, {
            width: 200,
            height: 100,
            layout: {
                background: { color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.4)',
                fontSize: 10
            },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            timeScale: { visible: false },
            rightPriceScale: { visible: false },
            handleScroll: false,
            handleScale: false,
        });
        miniSeries = miniChart.addCandlestickSeries({
            upColor: '#3fb950',
            downColor: '#f85149',
            borderVisible: false,
            wickUpColor: '#3fb950',
            wickDownColor: '#f85149',
        });
    }

    miniSeries.setData(data);
    miniChart.timeScale().fitContent();
}

function hideTooltip() {
    tooltip.classList.add('hidden');
}
