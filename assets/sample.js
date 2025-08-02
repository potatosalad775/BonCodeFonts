// 환영 메시지
const greetingMessage = `
  안녕하세요! ${userName}님
  현재 시간: ${new Date().toLocaleString('ko-KR')}
  처리된 항목 수: ${currentCount}개
`;

// 정규식
const koreanRegex = /^[가-힣]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 도시 목록
const cityList = ["서울", "부산", "대구", "인천", "광주", "대전", "울산"];
const metropolitanCities = cityList
  .filter(city => city.length >= 2)
  .map(city => `${city}시`)
  .sort((a, b) => a.localeCompare(b, 'ko-KR'));