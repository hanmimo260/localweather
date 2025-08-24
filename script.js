// API 설정
const API_KEY = '82ecf3750fed4d1160fc3ee0372198df7e6d8f391934374d063b30143c6e7a3f';
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// 경상남도 주요 지역들의 격자 좌표 (nx, ny)
const LOCATION_COORDINATES = {
    '창원시': { nx: 89, ny: 76 },
    '진주시': { nx: 81, ny: 75 },
    '통영시': { nx: 87, ny: 68 },
    '사천시': { nx: 80, ny: 71 },
    '김해시': { nx: 95, ny: 77 },
    '밀양시': { nx: 92, ny: 83 },
    '거제시': { nx: 84, ny: 69 },
    '양산시': { nx: 97, ny: 79 },
    '의령군': { nx: 83, ny: 78 },
    '함안군': { nx: 86, ny: 75 },
    '창녕군': { nx: 87, ny: 83 },
    '고성군': { nx: 85, ny: 71 },
    '남해군': { nx: 77, ny: 68 },
    '하동군': { nx: 74, ny: 72 },
    '산청군': { nx: 76, ny: 75 },
    '함양군': { nx: 74, ny: 78 },
    '거창군': { nx: 77, ny: 81 },
    '합천군': { nx: 81, ny: 81 }
};

// DOM 요소들
const citySelect = document.getElementById('city-select');
const getWeatherBtn = document.getElementById('get-weather-btn');
const weatherInfo = document.getElementById('weather-info');
const loading = document.getElementById('loading');
const weatherDisplay = document.getElementById('weather-display');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');

// 현재 시간 표시 요소들
const currentTimeElement = document.getElementById('current-time');
const temperatureElement = document.getElementById('temperature');
const humidityElement = document.getElementById('humidity');
const weatherStatusElement = document.getElementById('weather-status');
const windElement = document.getElementById('wind');
const precipitationElement = document.getElementById('precipitation');

// 현재 시간 업데이트 함수
function updateCurrentTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentTimeElement.textContent = now.toLocaleDateString('ko-KR', options);
}

// 현재 시간을 1초마다 업데이트
setInterval(updateCurrentTime, 1000);
updateCurrentTime();

// 날씨 데이터 파싱 함수
function parseWeatherData(items) {
    const weatherData = {
        temperature: null,
        humidity: null,
        weatherStatus: null,
        windSpeed: null,
        windDirection: null,
        precipitation: null
    };

    items.forEach(item => {
        const category = item.category;
        const value = item.fcstValue;
        const time = item.fcstTime;

        // 현재 시간과 가장 가까운 예보 시간의 데이터만 사용
        const currentHour = new Date().getHours();
        const forecastHour = parseInt(time.substring(0, 2));
        
        if (Math.abs(currentHour - forecastHour) <= 1) {
            switch (category) {
                case 'TMP': // 기온
                    weatherData.temperature = value;
                    break;
                case 'REH': // 습도
                    weatherData.humidity = value;
                    break;
                case 'SKY': // 하늘상태
                    weatherData.weatherStatus = getWeatherStatus(value);
                    break;
                case 'WSD': // 풍속
                    weatherData.windSpeed = value;
                    break;
                case 'VEC': // 풍향
                    weatherData.windDirection = getWindDirection(value);
                    break;
                case 'POP': // 강수확률
                    weatherData.precipitation = value;
                    break;
            }
        }
    });

    return weatherData;
}

// 하늘상태 코드를 텍스트로 변환
function getWeatherStatus(skyCode) {
    const skyStatus = {
        '1': '맑음',
        '3': '구름많음',
        '4': '흐림'
    };
    return skyStatus[skyCode] || '알 수 없음';
}

// 풍향 코드를 방향으로 변환
function getWindDirection(vecCode) {
    const directions = {
        '0': '북', '45': '북동', '90': '동', '135': '남동',
        '180': '남', '225': '남서', '270': '서', '315': '북서'
    };
    return directions[vecCode] || '알 수 없음';
}

// 날씨 정보 표시 함수
function displayWeatherInfo(weatherData) {
    temperatureElement.textContent = weatherData.temperature ? `${weatherData.temperature}°C` : '정보 없음';
    humidityElement.textContent = weatherData.humidity ? `${weatherData.humidity}%` : '정보 없음';
    weatherStatusElement.textContent = weatherData.weatherStatus || '정보 없음';
    
    const windText = weatherData.windSpeed && weatherData.windDirection 
        ? `${weatherData.windDirection} ${weatherData.windSpeed}m/s`
        : '정보 없음';
    windElement.textContent = windText;
    
    precipitationElement.textContent = weatherData.precipitation ? `${weatherData.precipitation}%` : '정보 없음';
}

// API 호출 함수
async function getWeatherData(city) {
    const coordinates = LOCATION_COORDINATES[city];
    if (!coordinates) {
        throw new Error('선택한 지역의 좌표 정보가 없습니다.');
    }

    // 현재 날짜와 시간 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const baseDate = `${year}${month}${day}`;
    
    // API 호출 시간 계산 (매시각 45분에 생성되어 발표시각으로부터 10분 후에 API 제공)
    let baseTime = '';
    let finalBaseDate = baseDate;
    const hour = now.getHours();
    if (hour < 2) {
        // 전날 23시 발표 데이터 사용
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
        finalBaseDate = yesterdayStr;
        baseTime = '2300';
    } else if (hour < 5) {
        baseTime = '0200';
    } else if (hour < 8) {
        baseTime = '0500';
    } else if (hour < 11) {
        baseTime = '0800';
    } else if (hour < 14) {
        baseTime = '1100';
    } else if (hour < 17) {
        baseTime = '1400';
    } else if (hour < 20) {
        baseTime = '1700';
    } else if (hour < 23) {
        baseTime = '2000';
    } else {
        baseTime = '2300';
    }

    const url = `${BASE_URL}/getVilageFcst`;
    const params = new URLSearchParams({
        serviceKey: API_KEY,
        pageNo: '1',
        numOfRows: '1000',
        dataType: 'JSON',
        base_date: finalBaseDate,
        base_time: baseTime,
        nx: coordinates.nx,
        ny: coordinates.ny
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.response.header.resultCode !== '00') {
        throw new Error(`API Error: ${data.response.header.resultMsg}`);
    }

    return data.response.body.items.item;
}

// UI 상태 관리 함수들
function showLoading() {
    loading.style.display = 'block';
    weatherDisplay.style.display = 'none';
    errorMessage.style.display = 'none';
}

function showWeather() {
    loading.style.display = 'none';
    weatherDisplay.style.display = 'block';
    errorMessage.style.display = 'none';
}

function showError(message) {
    loading.style.display = 'none';
    weatherDisplay.style.display = 'none';
    errorMessage.style.display = 'block';
    errorDetails.textContent = message;
}

// 날씨 조회 버튼 클릭 이벤트
getWeatherBtn.addEventListener('click', async () => {
    const selectedCity = citySelect.value;
    
    if (!selectedCity) {
        alert('지역을 선택해주세요.');
        return;
    }

    showLoading();

    try {
        const weatherItems = await getWeatherData(selectedCity);
        const weatherData = parseWeatherData(weatherItems);
        displayWeatherInfo(weatherData);
        showWeather();
    } catch (error) {
        console.error('날씨 정보 조회 실패:', error);
        showError(error.message);
    }
});

// 지역 선택 변경 시 자동으로 날씨 조회
citySelect.addEventListener('change', () => {
    const selectedCity = citySelect.value;
    if (selectedCity) {
        getWeatherBtn.click();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('경상남도 지역 날씨 정보 서비스가 로드되었습니다.');
    console.log('사용 가능한 지역:', Object.keys(LOCATION_COORDINATES));
});
