# WithTrip 프로젝트 규칙 (Vibe Coding Rules)
1. 프로젝트 목적: 교통약자(휠체어, 유모차, 고령자)를 위한 배리어 프리(Barrier-Free) 무장애 AI 여행 플래너
2. 기술 스택: 단일 파일 index.html (HTML5, Tailwind CSS CDN, Vanilla JavaScript, Marked.js CDN)
3. 서버 환경: 외부 Node.js/Python 서버 없이 브라우저 단독 실행 (Live Server 호환)
4. AI 연동 방식: 사용자 API 키 입력 없이 무료 공개 엔드포인트(https://text.pollinations.ai/) 비동기 호출
5. 핵심 요구조건:
   - 계단 및 문턱(단차 0cm), 완만한 경사로, 장애인 전용 화장실 정보가 일정에 반드시 포함될 것
   - 총 예산 범위 내에서 항목별(식비, 숙박비, 이동비) 지출 내역을 명시할 것
   - 모바일 화면에서도 깨짐 없는 깔끔한 반응형 카드 UI 유지