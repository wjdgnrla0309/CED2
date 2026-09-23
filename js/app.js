import { calculateTripBudget, normalizeCost } from "./budget.js";
import { applyEstimatedPriceRange, estimateMealCost, estimateMealDetails } from "./food-pricing.js";
import { generateDestinationCandidates as buildDestinationCandidates } from "./destinations.js";
import { calculateMealBudgetTarget, chooseMealCandidate } from "./restaurants.js";
import { assessStraightLineReachability, routeModeForPreference, transportDistanceLimitKm, TRANSPORT_REACH_CONFIG } from "./transport.js";

    // 목적지 매핑은 다른 초기화 코드보다 먼저 선언합니다.
    // (TDZ: Cannot access DESTINATION_CITY_MAP before initialization 방지)
    // 역 이름과 실제 TourAPI 검색용 여행도시를 분리
    const DESTINATION_CITY_MAP = {
      "서울": "서울",
      "수서": "서울",
      "천안아산": "아산",
      "오송": "청주",
      "대전": "대전",
      "강릉": "강릉",
      "전주": "전주",
      "광주송정": "광주",
      "목포": "목포",
      "순천": "순천",
      "여수엑스포": "여수",
      "동대구": "대구",
      "경주": "경주",
      "울산": "울산",
      "부산": "부산",
      "진주": "진주"
    };

    const CITY_ALIASES = {
      "서울": ["서울", "서울특별시"], "부산": ["부산", "부산광역시"],
      "대구": ["대구", "대구광역시"], "광주": ["광주", "광주광역시"],
      "대전": ["대전", "대전광역시"], "울산": ["울산", "울산광역시"],
      "강릉": ["강릉", "강릉시"], "경주": ["경주", "경주시"],
      "전주": ["전주", "전주시"], "여수": ["여수", "여수시"],
      "순천": ["순천", "순천시"], "목포": ["목포", "목포시"],
      "진주": ["진주", "진주시"], "청주": ["청주", "청주시"],
      "아산": ["아산", "아산시"], "제주": ["제주", "제주시", "서귀포", "서귀포시", "제주특별자치도"]
    };

    // 각 여행도시의 도착역을 기준으로 한 대표 좌표입니다(경도: lng, 위도: lat).
    const DESTINATION_COORDS = {
      "서울": { lat: 37.5547, lng: 126.9706, label: "서울역" },
      "아산": { lat: 36.7946, lng: 127.1045, label: "천안아산역" },
      "청주": { lat: 36.6200, lng: 127.3273, label: "오송역" },
      "대전": { lat: 36.3321, lng: 127.4342, label: "대전역" },
      "강릉": { lat: 37.7645, lng: 128.8996, label: "강릉역" },
      "전주": { lat: 35.8499, lng: 127.1618, label: "전주역" },
      "광주": { lat: 35.1378, lng: 126.7915, label: "광주송정역" },
      "목포": { lat: 34.7910, lng: 126.3865, label: "목포역" },
      "순천": { lat: 34.9457, lng: 127.5032, label: "순천역" },
      "여수": { lat: 34.7527, lng: 127.7487, label: "여수엑스포역" },
      "대구": { lat: 35.8794, lng: 128.6283, label: "동대구역" },
      "경주": { lat: 35.7984, lng: 129.1386, label: "경주역" },
      "울산": { lat: 35.5513, lng: 129.1386, label: "울산역" },
      "부산": { lat: 35.1151, lng: 129.0414, label: "부산역" },
      "진주": { lat: 35.1500, lng: 128.1180, label: "진주역" },
      "제주": { lat: 33.5104, lng: 126.4914, label: "제주국제공항" }
    };

    // KTX 노선 데이터베이스
    const KTX_ROUTES_DB = {
      "서울-강릉": { isTransfer: false, oneWay: 27600, duration: "1시간 50분", train: "KTX-이음" },
      "서울-부산": { isTransfer: false, oneWay: 59800, duration: "2시간 15분", train: "KTX-산천" },
      "서울-여수엑스포": { isTransfer: false, oneWay: 47200, duration: "3시간 05분", train: "KTX-산천" },
      "서울-경주": { isTransfer: false, oneWay: 49300, duration: "2시간 05분", train: "KTX" },
      "서울-전주": { isTransfer: false, oneWay: 34600, duration: "1시간 40분", train: "KTX-산천" },
      "천안아산-부산": { isTransfer: false, oneWay: 46200, duration: "1시간 45분", train: "KTX" },
      "천안아산-여수엑스포": { isTransfer: false, oneWay: 35800, duration: "2시간 10분", train: "KTX" },
      "천안아산-경주": { isTransfer: false, oneWay: 36500, duration: "1시간 30분", train: "KTX" },
      "천안아산-전주": { oneWay: 21500, duration: "1시간 05분", train: "KTX" },

      "천안아산-강릉": {
        isTransfer: true,
        transferStation: "서울역",
        oneWay: 41700,
        duration: "2시간 45분 (환승 포함)",
        train: "KTX + KTX-이음",
        leg1: { name: "천안아산역 ➔ 서울역 (KTX)", duration: "약 35분" },
        transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
        leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
      },
      "대전-강릉": {
        isTransfer: true,
        transferStation: "서울역",
        oneWay: 51300,
        duration: "3시간 10분 (환승 포함)",
        train: "KTX + KTX-이음",
        leg1: { name: "대전역 ➔ 서울역 (KTX)", duration: "약 1시간" },
        transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
        leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
      },
      "동대구-강릉": {
        isTransfer: true,
        transferStation: "서울역",
        oneWay: 71100,
        duration: "3시간 55분 (환승 포함)",
        train: "KTX + KTX-이음",
        leg1: { name: "동대구역 ➔ 서울역 (KTX)", duration: "약 1시간 45분" },
        transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
        leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
      }
    };

    // 출발역별 직통 고속열차(SRT 포함) 도착 가능 역입니다.
    // 환승이 필요한 역은 '직통' 선택지에서 제외해 실제 열차가 없는 구간을 직통으로 안내하지 않습니다.
    const DIRECT_RAIL_DESTINATIONS = {
      "서울": ["강릉", "천안아산", "오송", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
      "수서": ["천안아산", "오송", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
      "천안아산": ["서울", "수서", "오송", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
      "오송": ["서울", "수서", "천안아산", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
      "대전": ["서울", "수서", "천안아산", "오송", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
      "강릉": ["서울"],
      "전주": ["서울", "수서", "천안아산", "오송", "광주송정", "목포", "여수엑스포"],
      "광주송정": ["서울", "수서", "천안아산", "오송", "전주", "목포"],
      "목포": ["서울", "수서", "천안아산", "오송", "광주송정"],
      "여수엑스포": ["서울", "수서", "천안아산", "오송", "전주"],
      "동대구": ["서울", "수서", "천안아산", "오송", "대전", "경주", "울산", "부산", "진주"],
      "경주": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "울산", "부산"],
      "울산": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "경주", "부산"],
      "부산": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "경주", "울산"],
      "진주": ["서울", "수서", "천안아산", "오송", "대전", "동대구"]
    };

    const ARRIVAL_STATION_OPTIONS = Array.from(document.getElementById("arrivalStation").options)
      .map(option => ({ value: option.value, label: option.textContent }));

    function updateArrivalStationOptions() {
      const depart = document.getElementById("departStation").value;
      const arrivalSelect = document.getElementById("arrivalStation");
      const previous = arrivalSelect.value;
      const allowed = DIRECT_RAIL_DESTINATIONS[depart] || [];
      const availableOptions = ARRIVAL_STATION_OPTIONS.filter(option => allowed.includes(option.value));

      arrivalSelect.innerHTML = "";
      availableOptions.forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        arrivalSelect.appendChild(option);
      });

      const selectionChanged = !allowed.includes(previous);
      arrivalSelect.value = selectionChanged ? (availableOptions[0]?.value || "") : previous;
      return { selectionChanged, previous, depart };
    }

    // 역별 첫차·막차를 반영한 선택 가능 범위입니다. 실제 편성은 날짜·요일·공사에 따라
    // 달라질 수 있으므로, 플래너에서는 너무 이르거나 늦은 시간대를 먼저 차단합니다.
    const RAIL_SERVICE_WINDOWS = {
      "서울": { first: "05:00", last: "22:30" },
      "수서": { first: "05:30", last: "22:30" },
      "천안아산": { first: "06:00", last: "22:30" },
      "오송": { first: "06:00", last: "22:30" },
      "대전": { first: "05:30", last: "22:30" },
      "강릉": { first: "05:30", last: "21:30" },
      "전주": { first: "06:00", last: "21:30" },
      "광주송정": { first: "05:30", last: "21:30" },
      "목포": { first: "05:30", last: "21:30" },
      "여수엑스포": { first: "05:30", last: "21:00" },
      "동대구": { first: "05:30", last: "22:30" },
      "경주": { first: "06:00", last: "22:00" },
      "울산": { first: "06:00", last: "22:00" },
      "부산": { first: "05:00", last: "22:30" },
      "진주": { first: "06:00", last: "21:30" }
    };

    const DEFAULT_RAIL_SERVICE_WINDOW = { first: "06:00", last: "21:30" };

    function getRailServiceWindow(station) {
      return RAIL_SERVICE_WINDOWS[station] || DEFAULT_RAIL_SERVICE_WINDOW;
    }

    function populateRailTimeSelect(selectId, window, preferredValue) {
      const select = document.getElementById(selectId);
      const previousValue = preferredValue || select.value;
      const first = timeToMinutes(window.first);
      const last = timeToMinutes(window.last);
      select.innerHTML = "";

      for (let minutes = first; minutes <= last; minutes += 30) {
        const value = minutesToTime(minutes);
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }

      const requested = timeToMinutes(previousValue || window.first);
      const selectedMinutes = Math.min(last, Math.max(first, requested));
      select.value = minutesToTime(Math.round(selectedMinutes / 30) * 30);
      return previousValue && (requested < first || requested > last);
    }

    function updateRailTimeOptions() {
      const routeUpdate = updateArrivalStationOptions();
      const depart = document.getElementById("departStation").value;
      const arrival = document.getElementById("arrivalStation").value;
      const departWindow = getRailServiceWindow(depart);
      const returnWindow = getRailServiceWindow(arrival);
      const departReset = populateRailTimeSelect("departTime", departWindow);
      const returnReset = populateRailTimeSelect("returnTime", returnWindow);
      const guide = document.getElementById("railTimeGuide");

      guide.innerText = `${depart}역 출발 ${departWindow.first}~${departWindow.last} · ${arrival}역 귀가 ${returnWindow.first}~${returnWindow.last} (첫차·막차 기준 선택 가능)`;
      if (routeUpdate.selectionChanged) {
        guide.innerText = `${routeUpdate.depart}역에서는 ${routeUpdate.previous}역 직통 열차가 없어, 직통 운행 가능 역으로 변경되었습니다. ` + guide.innerText;
      }
      if (departReset || returnReset) {
        guide.innerText += " 선택한 시간이 운행 범위를 벗어나 가장 가까운 가능 시간으로 변경되었습니다. 다시 선택해 주세요.";
        guide.className = "text-[11px] text-amber-700 font-semibold leading-relaxed";
      } else if (!routeUpdate.selectionChanged) {
        guide.className = "text-[11px] text-slate-500 leading-relaxed";
      } else {
        guide.className = "text-[11px] text-amber-700 font-semibold leading-relaxed";
      }
      updateEstimatedArrival();
    }

    function isRailTimeAvailable(station, time) {
      const window = getRailServiceWindow(station);
      const selected = timeToMinutes(time);
      return selected >= timeToMinutes(window.first) && selected <= timeToMinutes(window.last);
    }

    function findAvailableRailTime(station, preferredIndex = 0, fallback = "09:00") {
      const window = getRailServiceWindow(station);
      const first = timeToMinutes(window.first), last = timeToMinutes(window.last);
      const preferred = first + Math.max(0, preferredIndex) * 30;
      return minutesToTime(Math.min(last, Math.max(first, preferred))) || fallback;
    }

    function calculateKtxRouting(depart, arrival) {
      const key = `${depart}-${arrival}`;
      const revKey = `${arrival}-${depart}`;

      if (KTX_ROUTES_DB[key]) return { ...KTX_ROUTES_DB[key], isReversed: false };
      if (KTX_ROUTES_DB[revKey]) {
        const item = KTX_ROUTES_DB[revKey];
        return {
          ...item,
          isReversed: true,
          routeText: item.isTransfer ? `${arrival} ➔ [${item.transferStation} 환승] ➔ ${depart}` : `${arrival}역 ➔ ${depart}역 (직통)`
        };
      }
      return {
        isTransfer: false,
        oneWay: 38000,
        duration: "2시간 내외",
        train: depart === "수서" || arrival === "수서" ? "SRT" : "KTX",
        routeText: `${depart}역 ➔ ${arrival}역 (직통)`
      };
    }

    function getKtxDurationMinutes(durationText) {
      const hours = Number((durationText.match(/(\d+)시간/) || [0, 0])[1]);
      const minutes = Number((durationText.match(/(\d+)분/) || [0, 0])[1]);
      return Math.max(30, (hours * 60) + minutes);
    }

    function updateEstimatedArrival() {
      const departStation = document.getElementById("departStation");
      const arrivalStation = document.getElementById("arrivalStation");
      const departTime = document.getElementById("departTime");
      const arrivalTime = document.getElementById("arrivalTime");
      if (!departStation || !arrivalStation || !departTime || !arrivalTime || !departTime.value) return;

      if (departStation.value === arrivalStation.value) {
        arrivalTime.value = "노선을 확인해 주세요";
        arrivalTime.dataset.time = "";
        arrivalTime.dataset.dayOffset = "0";
        return;
      }

      const routing = calculateKtxRouting(departStation.value, arrivalStation.value);
      const rawArrival = timeToMinutes(departTime.value) + getKtxDurationMinutes(routing.duration);
      const roundedArrival = Math.ceil(rawArrival / 30) * 30;
      const dayOffset = Math.floor(roundedArrival / 1440);
      const clockTime = minutesToTime(roundedArrival % 1440);

      arrivalTime.dataset.time = clockTime;
      arrivalTime.dataset.dayOffset = String(dayOffset);
      arrivalTime.value = `${dayOffset > 0 ? `익일${dayOffset > 1 ? ` +${dayOffset - 1}일` : ""} ` : ""}${clockTime}`;
      arrivalTime.title = `${routing.train} 예상 소요시간 ${routing.duration} 기준`;
    }
    const TOUR_API_KEY = "fa440a2c73a7ddf27cba2cf7e209a879a0bf8ea59ede526e13ec66ac4198ca2a";
    const TOUR_API_BASE = "https://apis.data.go.kr/B551011/KorService2";
    const BARRIER_FREE_API_BASE = "https://apis.data.go.kr/B551011/KorWithService2";
    // Kakao Developers > REST API 키를 넣으면 추천 목록과 별개로 장소를 직접 검색할 수 있습니다.
    // GitHub Pages 단일 파일 구조에서는 브라우저에 키가 노출되므로, 운영 서비스는 서버 프록시 사용을 권장합니다.
    const KAKAO_REST_API_KEY = "f10ed3335dc742fb5de4232ac2bfce34"; // 예: "YOUR_KAKAO_REST_API_KEY"
    const KAKAO_LOCAL_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

    // Configure these values through a server-side proxy or a deployment-time config file.
    // The browser must never contain production x-api-key/x-channel-key values.
    const FLIGHT_API_CONFIG = {
      provider: "skyscanner-compatible",
      apiKey: "YOUR_FLIGHT_API_KEY",
      baseUrl: "YOUR_API_ENDPOINT"
    };
    const JEJU_AIRPORTS = {
      ICN: { name: "인천국제공항", code: "ICN" }, GMP: { name: "김포국제공항", code: "GMP" },
      PUS: { name: "김해국제공항", code: "PUS" }, CJJ: { name: "청주국제공항", code: "CJJ" }
    };
    const JEJU_AIRPORT = { name: "제주국제공항", code: "CJU" };
    const FLIGHT_DURATION_MINUTES = { ICN: 70, GMP: 70, PUS: 60, CJJ: 65 };
    const DOMESTIC_AIRPORT_BUFFER_MINUTES = 90;
    const ACCESSIBLE_AIRPORT_BUFFER_MINUTES = 120;
    const JEJU_ARRIVAL_BUFFER_MINUTES = 25;
    const RENTAL_ARRIVAL_BUFFER_MINUTES = 45;
    const LAST_DAY_AIRPORT_TRANSFER_MINUTES = 40;
    const AIRPORT_NAMES = { ...Object.fromEntries(Object.entries(JEJU_AIRPORTS).map(([code, item]) => [code, item.name])), CJU: JEJU_AIRPORT.name };
    const FLIGHT_TIME_BANDS = { early: [5, 8], morning: [8, 12], afternoon: [12, 18], evening: [18, 22] };

    // 역 이름과 TourAPI 지역코드 매핑.
    // 광역시는 areaCode만 사용하고, 도 단위 도시는 areaCode + sigunguCode를 동적으로 찾습니다.
    const DESTINATION_REGION_MAP = {
      "서울": { areaCode: "1" },
      "아산": { areaCode: "34", sigunguName: "아산시" },
      "청주": { areaCode: "33", sigunguName: "청주시" },
      "대전": { areaCode: "3" },
      "강릉": { areaCode: "32", sigunguName: "강릉시" },
      "전주": { areaCode: "37", sigunguName: "전주시" },
      "광주": { areaCode: "5" },
      "목포": { areaCode: "38", sigunguName: "목포시" },
      "순천": { areaCode: "38", sigunguName: "순천시" },
      "여수": { areaCode: "38", sigunguName: "여수시" },
      "대구": { areaCode: "4" },
      "경주": { areaCode: "35", sigunguName: "경주시" },
      "울산": { areaCode: "7" },
      "부산": { areaCode: "6" },
      "진주": { areaCode: "36", sigunguName: "진주시" }
      ,"제주": { areaCode: "39" }
    };


    // TourAPI가 실패했을 때만 쓰는 최소 비상 후보.
    // 정상 동작 시 음식점/관광지는 API 데이터로 교체됩니다.
    const FALLBACK_MEALS = [
      { id: "fallback-l1", name: "음식점 검색 필요", menu: "Kakao 장소 검색 또는 TourAPI 연결 상태를 확인해 주세요.", cost: null, priceSource: "unknown", why: "메뉴 가격 정보가 확인되지 않았습니다.", isAccessible: false },
      { id: "fallback-l2", name: "지역 식당 검색 필요", menu: "주변 식당을 다시 검색할 수 있습니다.", cost: null, priceSource: "unknown", why: "가격 정보 확인이 필요합니다.", isAccessible: false },
      { id: "fallback-l3", name: "식사 장소 검색 필요", menu: "원하는 식당을 직접 검색해 선택할 수 있습니다.", cost: null, priceSource: "unknown", why: "실제 메뉴 가격은 확인되지 않았습니다.", isAccessible: false }
    ];

    // 여행지 고유의 식당을 우선 보여주기 위해 전국 단위 패스트푸드 체인은 추천에서 제외합니다.
    // 표기 방식이 달라도 걸러지도록 공백·특수문자를 제거한 이름으로 비교합니다.
    const EXCLUDED_FAST_FOOD_BRANDS = [
      "롯데리아", "맥도날드", "버거킹", "맘스터치", "케이에프씨", "kfc",
      "서브웨이", "subway", "쉑쉑", "shake shack", "노브랜드버거", "프랭크버거"
    ];

    function isExcludedFastFoodRestaurant(item) {
      const normalizedTitle = String(item?.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "");
      return EXCLUDED_FAST_FOOD_BRANDS.some(brand =>
        normalizedTitle.includes(brand.toLowerCase().replace(/[^a-z0-9가-힣]/g, ""))
      );
    }

    const FALLBACK_SPOTS = [
      { id: "fallback-s1", name: "관광지 검색 필요", type: "관광지", cost: 0, priceSource: "unknown", why: "TourAPI 연결 상태를 확인해 주세요.", barrierFreeTip: "무장애 정보는 상세 확인이 필요합니다.", isAccessible: true },
      { id: "fallback-s2", name: "지역 관광지 검색 필요", type: "관광지", cost: 0, priceSource: "unknown", why: "인증키 또는 네트워크 상태를 확인해 주세요.", barrierFreeTip: "무장애 정보는 상세 확인이 필요합니다.", isAccessible: true },
      { id: "fallback-s3", name: "주변 명소 검색 필요", type: "관광지", cost: 0, priceSource: "unknown", why: "잠시 후 다시 플랜을 생성해 주세요.", barrierFreeTip: "무장애 정보는 상세 확인이 필요합니다.", isAccessible: true }
    ];

    // 기존 렌더링 코드를 그대로 활용하기 위한 동적 풀
    const MEAL_CHOICES_POOL = {};
    const SPOT_CHOICES_POOL = {};

    function getDestinationDataKey(station) {
      return (DESTINATION_CITY_MAP && DESTINATION_CITY_MAP[station]) || station;
    }

    function normalizeTourApiItems(data) {
      const items = data?.response?.body?.items?.item;
      if (!items) return [];
      return Array.isArray(items) ? items : [items];
    }

    function shuffleArray(items) {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function uniqueBy(items, keyFn) {
      const seen = new Set();
      return items.filter(item => {
        const key = keyFn(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function getTourApiKey() {
      const raw = String(TOUR_API_KEY || "").trim();
      if (!raw || raw === "YOUR_TOUR_API_DECODING_KEY") {
        throw new Error("TOUR_API_KEY가 설정되지 않았습니다. index.html의 TOUR_API_KEY에 공공데이터포털 Decoding 인증키를 입력하세요.");
      }

      // Encoding 키(%2B, %3D 등)를 붙여넣은 경우 URLSearchParams에서 이중 인코딩되지 않도록
      // 가능한 경우 한 번 디코딩해서 사용합니다.
      if (raw.includes("%")) {
        try {
          return decodeURIComponent(raw);
        } catch (_) {
          return raw;
        }
      }
      return raw;
    }

    function makeDirectApiUrl(baseUrl, endpoint, extraParams = {}) {
      const params = new URLSearchParams({
        serviceKey: getTourApiKey(),
        MobileOS: "ETC",
        MobileApp: "WithTripPro",
        _type: "json",
        numOfRows: "100",
        pageNo: "1",
        ...extraParams
      });
      return `${baseUrl}/${endpoint}?${params.toString()}`;
    }

    async function parseTourApiResponse(response, label) {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${label} HTTP 오류 ${response.status}: ${text.slice(0, 250)}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        const compact = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
        throw new Error(`${label}가 JSON이 아닌 응답을 반환했습니다: ${compact || "빈 응답"}`);
      }

      const resultCode = data?.response?.header?.resultCode;
      if (resultCode && resultCode !== "0000") {
        const msg = data?.response?.header?.resultMsg || `알 수 없는 ${label} 오류`;
        throw new Error(`${label} 오류 ${resultCode}: ${msg}`);
      }
      return normalizeTourApiItems(data);
    }

    function makeTourApiUrl(endpoint, extraParams = {}) {
      return makeDirectApiUrl(TOUR_API_BASE, endpoint, extraParams);
    }

    async function fetchTourApi(endpoint, extraParams = {}) {
      try {
        const response = await fetch(makeTourApiUrl(endpoint, extraParams));
        return await parseTourApiResponse(response, "KorService2");
      } catch (error) {
        if (error instanceof TypeError && /fetch/i.test(error.message || "")) {
          throw new Error("KorService2 네트워크 요청이 브라우저에서 차단되었습니다. 인증키가 맞는데도 Failed to fetch가 나오면 apis.data.go.kr CORS 제한일 가능성이 큽니다.");
        }
        throw error;
      }
    }

    // 무장애 여행 정보 상세 조회. KorService2의 contentId와 연결합니다.
    function makeBarrierFreeApiUrl(endpoint, extraParams = {}) {
      return makeDirectApiUrl(BARRIER_FREE_API_BASE, endpoint, extraParams);
    }

    async function fetchBarrierFreeApi(endpoint, extraParams = {}) {
      try {
        const response = await fetch(makeBarrierFreeApiUrl(endpoint, extraParams));
        return await parseTourApiResponse(response, "KorWithService2");
      } catch (error) {
        if (error instanceof TypeError && /fetch/i.test(error.message || "")) {
          throw new Error("KorWithService2 네트워크 요청이 브라우저에서 차단되었습니다. Failed to fetch가 나오면 CORS 제한일 가능성이 큽니다.");
        }
        throw error;
      }
    }

    const BARRIER_FREE_CACHE = new Map();
    const BARRIER_FREE_FIELDS = [
      "parking", "route", "publictransport", "ticketoffice", "promotion", "wheelchair",
      "exit", "elevator", "restroom", "auditorium", "room", "handicapetc",
      "braileblock", "helpdog", "guidehuman", "audioguide", "bigprint",
      "brailepromotion", "guidesystem", "blindhandicapetc", "signguide", "videoguide",
      "hearingroom", "hearinghandicapetc", "stroller", "lactationroom",
      "babysparechair", "infantsfamilyetc"
    ];

    function meaningfulBarrierEntries(detail) {
      if (!detail || typeof detail !== "object") return [];
      return BARRIER_FREE_FIELDS
        .filter(key => detail[key] !== undefined && detail[key] !== null && String(detail[key]).trim() !== "")
        .map(key => [key, detail[key]]);
    }

    function barrierFreeScore(detail) {
      const positiveWords = /있음|가능|설치|구비|완비|접근 가능|이용 가능|대여 가능|자동문|경사로|엘리베이터|장애인 화장실/i;
      return meaningfulBarrierEntries(detail).reduce((score, [, value]) => {
        const text = stripHtml(String(value));
        return score + 1 + (positiveWords.test(text) ? 2 : 0);
      }, 0);
    }

    function barrierFreeSummary(detail) {
      const entries = meaningfulBarrierEntries(detail);
      if (!entries.length) return "무장애 여행 정보 API에 등록된 상세 편의정보가 없습니다.";
      return entries.slice(0, 4).map(([key, value]) => `${fieldLabel(key)}: ${stripHtml(value)}`).join(" · ");
    }

    async function fetchBarrierFreeDetail(contentId) {
      const key = String(contentId || "");
      if (!key) return {};
      if (BARRIER_FREE_CACHE.has(key)) return BARRIER_FREE_CACHE.get(key);
      try {
        const rows = await fetchBarrierFreeApi("detailWithTour2", { contentId: key });
        const detail = rows?.[0] || {};
        BARRIER_FREE_CACHE.set(key, detail);
        return detail;
      } catch (error) {
        console.warn(`무장애 상세정보 조회 실패 (${key})`, error);
        BARRIER_FREE_CACHE.set(key, {});
        return {};
      }
    }

    async function enrichRawItemsWithBarrierFree(items, limit = 12) {
      const target = (items || []).slice(0, limit);
      await Promise.all(target.map(async item => {
        if (!item?.contentid) return;
        const barrier = await fetchBarrierFreeDetail(item.contentid);
        item._barrierFree = barrier;
        item._barrierFreeScore = barrierFreeScore(barrier);
      }));
      return items;
    }

    // KorService2 활용명세에 맞춘 검색 함수
    // 1차: /searchKeyword2 (키워드 검색 조회)
    // 2차: /areaBasedList2 (지역기반 관광정보조회) 후 주소로 도시 필터
    const SIGUNGU_CODE_CACHE = new Map();

    function normalizeRegionName(value = "") {
      return String(value).replace(/\s+/g, "").replace(/특별자치시|특별자치도|광역시|특별시|시|군|구$/g, "");
    }

    async function resolveSigunguCode(city) {
      const region = DESTINATION_REGION_MAP[city];
      if (!region?.sigunguName) return "";
      const cacheKey = `${region.areaCode}:${region.sigunguName}`;
      if (SIGUNGU_CODE_CACHE.has(cacheKey)) return SIGUNGU_CODE_CACHE.get(cacheKey);

      const rows = await fetchTourApi("areaCode2", {
        areaCode: String(region.areaCode),
        numOfRows: "100",
        pageNo: "1"
      });

      const target = normalizeRegionName(region.sigunguName);
      const match = rows.find(row => normalizeRegionName(row.name || "") === target)
        || rows.find(row => normalizeRegionName(row.name || "").includes(target));
      const code = match?.code ? String(match.code) : "";
      SIGUNGU_CODE_CACHE.set(cacheKey, code);
      return code;
    }

    function isAddressInCity(address, city) {
      if (!address || !city) return false;
      const normalizedAddress = String(address).replace(/\s+/g, " ");
      const aliases = CITY_ALIASES[city] || [city, normalizeRegionName(city)].filter(Boolean);
      return aliases.some(alias => normalizedAddress.includes(alias));
    }

    function addressMatchesCity(item, city) {
      return isAddressInCity([item?.addr1, item?.addr2].filter(Boolean).join(" "), city);
    }

    function getDistanceKm(lat1, lon1, lat2, lon2) {
      const values = [lat1, lon1, lat2, lon2].map(Number);
      if (values.some(value => !Number.isFinite(value))) return null;
      const [fromLat, fromLon, toLat, toLon] = values;
      const toRadians = degrees => degrees * Math.PI / 180;
      const dLat = toRadians(toLat - fromLat);
      const dLon = toRadians(toLon - fromLon);
      const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLon / 2) ** 2;
      return 2 * 6371 * Math.asin(Math.sqrt(a));
    }

    async function searchTourContent(city, contentTypeId, minCount = 12) {
      const errors = [];
      let items = [];
      const region = DESTINATION_REGION_MAP[city];

      if (region?.areaCode) {
        try {
          const params = {
            areaCode: String(region.areaCode),
            contentTypeId: String(contentTypeId),
            arrange: "A",
            numOfRows: "300",
            pageNo: "1"
          };
          const sigunguCode = await resolveSigunguCode(city);
          if (sigunguCode) params.sigunguCode = sigunguCode;
          const regionalItems = await fetchTourApi("areaBasedList2", params);
          items.push(...regionalItems);
        } catch (e) {
          errors.push(`areaBasedList2: ${e.message}`);
          console.warn("KorService2 /areaBasedList2 실패:", e);
        }
      }

      if (items.length < minCount) {
        try {
          const keywords = [city];
          const keywordGroups = await Promise.all(keywords.map(keyword => fetchTourApi("searchKeyword2", {
              keyword,
              contentTypeId: String(contentTypeId),
              arrange: "A",
              numOfRows: "100",
              pageNo: "1"
            }).catch(error => {
              console.warn(`KorService2 /searchKeyword2 실패 (${keyword}):`, error);
              return [];
            })));
          items.push(...keywordGroups.flat().filter(item => addressMatchesCity(item, city)));
        } catch (e) {
          errors.push(`searchKeyword2: ${e.message}`);
          console.warn("KorService2 /searchKeyword2 실패:", e);
        }
      }

      const unique = uniqueBy(items, item => String(item.contentid || item.title || ""));
      if (!unique.length && errors.length) {
        throw new Error(`KorService2 조회 실패\n${errors.join("\n")}`);
      }
      return unique;
    }

    function mealBudgetTarget(mealType = "lunch") {
      const expectedMeals = (currentPlanState.daysData || []).reduce((sum, day) => sum + (day?.schedule?.showLunch ? 1 : 0) + (day?.schedule?.showDinner ? 1 : 0), 0);
      return calculateMealBudgetTarget({ travelBudget: currentPlanState.travelBudget ?? currentPlanState.budget,
        fixedCosts: [currentPlanState.intercityTransportCost ?? currentPlanState.ktxTotal ?? currentPlanState.flightTotal,
          currentPlanState.knownActivityCost, currentPlanState.localTransportCost], remainingMeals: Math.max(1, expectedMeals || (mealType === "dinner" ? 1 : 2)) });
    }

    function chooseMealForBudget(options = [], mealType = "lunch", anchor = null) {
      return chooseMealCandidate(options, { target: mealBudgetTarget(mealType),
        preferenceFocus: currentPlanState.preferenceProfile?.focus, anchor,
        routePoint, routeDistance });
    }

    function installBudgetFirstListeners() {
      if (window.withTripBudgetListenersInstalled) return;
      window.withTripBudgetListenersInstalled = true;
      document.getElementById("budgetFirstOrigin")?.addEventListener("change", event => {
        currentPlanState.origin = event.target.value;
        renderBudgetDestinationCandidates();
      });
      document.querySelectorAll('input[name="localTransportPreference"]').forEach(input => input.addEventListener("change", event => {
        currentPlanState.localTransportPreference = event.target.value;
        withTripPreferences.localTransportPreference = event.target.value;
      }));
    }

    async function automaticallyChooseNearbyRestaurants({ reprice = true } = {}) {
      const city = currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival);
      for (const day of currentPlanState.daysData || []) {
        for (const category of ["lunch", "dinner"]) {
          const visible = category === "lunch" ? day.schedule?.showLunch : day.schedule?.showDinner;
          if (!visible || (reprice && day.selections?.[category]?.priceSource === "api")) continue;
          const anchor = getRestaurantRouteAnchor(day.dayNum);
          const query = `${city} ${anchor?.name ? `${anchor.name} 주변` : "관광지 주변"} 음식점`;
          try {
            const documents = await searchKakaoLocal(query, "FD6");
            const candidates = documents.map(raw => {
              const item = convertKakaoRestaurant(raw, category);
              const point = routePoint(item);
              item.nearbyRouteDistanceKm = anchor ? routeDistance(anchor, point) : null;
              return item;
            }).sort((a, b) => {
              const target = mealBudgetTarget(category);
              const aCost = normalizeCost(a.cost) ?? Infinity, bCost = normalizeCost(b.cost) ?? Infinity;
              const aFits = target === null || aCost <= target, bFits = target === null || bCost <= target;
              return Number(bFits) - Number(aFits)
                || (a.nearbyRouteDistanceKm ?? Infinity) - (b.nearbyRouteDistanceKm ?? Infinity)
                || aCost - bCost;
            }).slice(0, 3);
            if (!candidates.length) continue;
            const picked = chooseMealForBudget(candidates, category, anchor);
            for (const candidate of candidates) if (!day.options[category].some(item => item.id === candidate.id)) day.options[category].unshift(candidate);
            if (reprice || !day.selections[category]) day.selections[category] = picked;
            day.selectedRestaurant = picked;
            day.confirmed[category] = true;
          } catch (error) {
            // Keep the already selected TourAPI estimate if Kakao is unavailable.
            console.warn("주변 음식점 자동 검색을 건너뜁니다", error?.name || "Error");
          }
        }
      }
    }

    function convertRestaurant(item, index, mealType) {
      const address = [item.addr1, item.addr2].filter(Boolean).join(" ");
      return {
        id: `api-${mealType}-${item.contentid || index}`,
        contentId: item.contentid || "",
        contentTypeId: String(item.contenttypeid || 39),
        raw: item,
        name: item.title || "이름 미등록 음식점",
        menu: "메뉴·가격은 실제 주문 전 확인 필요",
        ...estimateMealDetails({ title: item.title || "", name: item.title || "", foodCategory: item.cat3 || item.cat2 || "" }, mealType),
        priceSource: "estimated",
        why: address ? `한국관광공사 TourAPI 등록 음식점 · ${address}` : "한국관광공사 TourAPI 등록 음식점",
        isAccessible: (item._barrierFreeScore || 0) > 0,
        accessibilityVerified: meaningfulBarrierEntries(item._barrierFree || {}).length > 0,
        barrierFree: item._barrierFree || {},
        barrierFreeScore: item._barrierFreeScore || 0,
        barrierFreeTip: barrierFreeSummary(item._barrierFree || {}),
        mapx: item.mapx || "",
        mapy: item.mapy || "",
        image: item.firstimage || item.firstimage2 || ""
      };
    }

    function convertSpot(item, index) {
      const address = [item.addr1, item.addr2].filter(Boolean).join(" ");
      return {
        id: `api-spot-${item.contentid || index}`,
        contentId: item.contentid || "",
        contentTypeId: String(item.contenttypeid || 12),
        raw: item,
        name: item.title || "이름 미등록 관광지",
        address,
        jejuRegion: getJejuRegion({ address, mapx: item.mapx, mapy: item.mapy }),
        type: "TourAPI 관광지",
        cost: 0, // 기본 목록만으로 입장료를 확정할 수 없어 미확인으로 처리
        priceSource: "unknown",
        why: address ? `${address} · 한국관광공사 TourAPI 등록 관광지` : "한국관광공사 TourAPI 등록 관광지",
        barrierFreeTip: barrierFreeSummary(item._barrierFree || {}),
        isAccessible: (item._barrierFreeScore || 0) > 0,
        accessibilityVerified: meaningfulBarrierEntries(item._barrierFree || {}).length > 0,
        barrierFree: item._barrierFree || {},
        barrierFreeScore: item._barrierFreeScore || 0,
        mapx: item.mapx || "",
        mapy: item.mapy || "",
        image: item.firstimage || item.firstimage2 || ""
      };
    }

    function roundPrice(value) {
      return Math.max(1000, Math.round(value / 1000) * 1000);
    }

    function formatEstimatedPrice(item, multiplier = 1) {
      if (!item) return "가격 확인 필요";
      if (item.priceSource === "unknown" || item.priceSource === "fallback") return "가격 정보 없음";
      if ((item.priceSource === "api" || item.priceSource === "user") && normalizeCost(item.cost) !== null) return `${item.cost.toLocaleString()}원 · ${item.priceSource === "api" ? "조회 가격" : "사용자 입력"}`;
      return item.priceSource === "estimated" && normalizeCost(item.cost) !== null ? `예상 약 ${(item.cost * multiplier).toLocaleString()}원 · 통계 추정` : "가격 정보 없음";
    }

    // Kakao Local 결과를 기존 일정/예산 객체와 같은 형태로 정규화합니다.
    function convertKakaoRestaurant(item, mealType = "lunch") {
      const address = item.road_address_name || item.address_name || "주소 정보 없음";
      const converted = {
        id: `kakao-restaurant-${item.id || `${item.x}-${item.y}`}`,
        name: item.place_name || "이름 미등록 식당",
        menu: item.category_name || "메뉴는 매장에서 확인해 주세요.",
        ...estimateMealDetails({ title: item.place_name || "", name: item.place_name || "", category_name: item.category_name || "" }, mealType),
        why: `${address}${item.phone ? ` · ${item.phone}` : ""} · 카카오 지도 검색 결과`,
        phone: item.phone || "",
        mapx: item.x || "",
        mapy: item.y || "",
        kakaoUrl: item.place_url || "",
        source: "kakao",
        customSelected: true,
        priceEstimated: true,
        accessibilityVerified: false,
        barrierFreeTip: "카카오 검색 결과입니다. 무장애 편의시설은 방문 전 별도 확인이 필요합니다."
      };
      return { ...converted, ...estimateMealDetails(converted, mealType), priceBasis: "음식 종류별 통계 기반 1인 추정" };
    }

    const KAKAO_LOCAL_SEARCH_CACHE = new Map();
    const KAKAO_LOCAL_SEARCH_PENDING = new Map();

    async function searchKakaoLocal(query, categoryGroupCode = "") {
      const key = String(KAKAO_REST_API_KEY || "").trim();
      if (!key || key === "YOUR_KAKAO_REST_API_KEY") {
        throw new Error("카카오 Local REST API 키가 설정되지 않았습니다. KAKAO_REST_API_KEY에 REST API 키를 입력해 주세요.");
      }
      const cacheKey = `${categoryGroupCode}|${String(query).trim().toLocaleLowerCase()}`;
      const cached = KAKAO_LOCAL_SEARCH_CACHE.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.documents.map(item => ({ ...item }));
      if (KAKAO_LOCAL_SEARCH_PENDING.has(cacheKey)) return (await KAKAO_LOCAL_SEARCH_PENDING.get(cacheKey)).map(item => ({ ...item }));
      const params = new URLSearchParams({ query, size: "8" });
      if (categoryGroupCode) params.set("category_group_code", categoryGroupCode);
      const request = (async () => {
        const response = await fetch(`${KAKAO_LOCAL_KEYWORD_URL}?${params.toString()}`, {
          headers: { Authorization: `KakaoAK ${key}` }
        });
        if (!response.ok) throw new Error(`카카오 장소 검색 오류 (${response.status})`);
        const data = await response.json();
        return Array.isArray(data.documents) ? data.documents.slice(0, 8) : [];
      })();
      KAKAO_LOCAL_SEARCH_PENDING.set(cacheKey, request);
      try {
        const documents = await request;
        KAKAO_LOCAL_SEARCH_CACHE.set(cacheKey, { documents, expiresAt: Date.now() + 180000 });
        return documents.map(item => ({ ...item }));
      } finally { KAKAO_LOCAL_SEARCH_PENDING.delete(cacheKey); }
    }

    async function loadDestinationTourData(station, accessibilityMode = "general") {
      const city = getDestinationDataKey(station);

      document.getElementById("apiStatusText").innerText = `${city} 관광 데이터 불러오는 중...`;

      const [restaurantResult, spotResult] = await Promise.allSettled([
        searchTourContent(city, 39, 15),
        searchTourContent(city, 12, 15)
      ]);
      const restaurantRaw = restaurantResult.status === "fulfilled" ? restaurantResult.value : [];
      const spotRaw = spotResult.status === "fulfilled" ? spotResult.value : [];
      const availability = {
        restaurantsAvailable: restaurantRaw.length > 0,
        attractionsAvailable: spotRaw.length > 0,
        restaurantRequestFailed: restaurantResult.status === "rejected",
        attractionRequestFailed: spotResult.status === "rejected"
      };

      // 배리어프리 우선 모드에서는 실제 무장애 여행 정보 API를 추가 조회해 후보를 정렬합니다.
      // 호출량을 아끼기 위해 추천에 쓰는 후보 범위만 조회합니다.
      if (accessibilityMode === "priority") {
        document.getElementById("apiStatusText").innerText = `${city} 무장애 편의정보 확인 중...`;
        await Promise.all([
          enrichRawItemsWithBarrierFree(restaurantRaw, 10),
          enrichRawItemsWithBarrierFree(spotRaw, 15)
        ]);
      }

      const sortOrShuffle = items => accessibilityMode === "priority"
        ? [...items].sort((a, b) => (b._barrierFreeScore || 0) - (a._barrierFreeScore || 0))
        : shuffleArray(items);
      // 롯데리아 등 어느 지역에서나 이용 가능한 패스트푸드 프랜차이즈는 코스 추천에서 제외합니다.
      const localRestaurantRaw = restaurantRaw.filter(item => !isExcludedFastFoodRestaurant(item));
      const restaurantItems = sortOrShuffle(localRestaurantRaw);
      const spotItems = sortOrShuffle(spotRaw);


      const lunch = restaurantItems.map((item, i) => convertRestaurant(item, i, "lunch"));
      const dinner = shuffleArray(restaurantItems).map((item, i) => convertRestaurant(item, i, "dinner"));
      const spots = spotItems.map(convertSpot);

      MEAL_CHOICES_POOL[city] = {
        lunch: lunch.length >= 3 ? lunch : [...lunch, ...FALLBACK_MEALS].slice(0, Math.max(3, lunch.length + FALLBACK_MEALS.length)),
        dinner: dinner.length >= 3 ? dinner : [...dinner, ...FALLBACK_MEALS.map((x, i) => ({
          ...x,
          id: `fallback-d${i + 1}`,
          cost: estimateMealCost(x, "dinner")
        }))].slice(0, Math.max(3, dinner.length + FALLBACK_MEALS.length))
      };

      SPOT_CHOICES_POOL[city] = spots.length >= 3 ? spots : [...spots, ...FALLBACK_SPOTS];

      const badge = document.getElementById("apiStatusBadge");
      if (badge) badge.className = "hidden";
      const barrierVerifiedCount = [...restaurantRaw, ...spotRaw]
        .filter(x => meaningfulBarrierEntries(x._barrierFree || {}).length > 0).length;
      document.getElementById("apiStatusText").innerText = accessibilityMode === "priority"
        ? `TourAPI · 음식점 ${restaurantRaw.length} · 관광지 ${spotRaw.length} · 접근성 확인 ${barrierVerifiedCount}`
        : `TourAPI · 음식점 ${restaurantRaw.length} · 관광지 ${spotRaw.length}`;

      return {
        city,
        availability,
        meals: MEAL_CHOICES_POOL[city],
        spots: SPOT_CHOICES_POOL[city],
      };
    }

    function renderDataSourceNotice(availability = {}) {
      const host = document.getElementById("dataSourceNotice");
      if (!host) return;
      const issues = [];
      if (!availability.restaurantsAvailable) issues.push(availability.restaurantRequestFailed ? "음식점 API 조회 실패" : "음식점 검색 결과 없음");
      if (!availability.attractionsAvailable) issues.push(availability.attractionRequestFailed ? "관광지 API 조회 실패" : "관광지 검색 결과 없음");
      host.textContent = issues.length ? `${issues.join(" · ")}. 확인되지 않은 가격·장소 정보는 추정 또는 가격 정보 없음으로 표시합니다.` : "";
      host.classList.toggle("hidden", issues.length === 0);
    }

    function takeRotatingOptions(pool, startIndex, count = 3) {
      if (!pool || pool.length === 0) return [];
      const result = [];
      for (let i = 0; i < Math.min(count, pool.length); i++) {
        result.push(pool[(startIndex + i) % pool.length]);
      }
      return result;
    }

    // ============================================================
    // TourAPI 상세정보: 공통정보 + 소개정보 + 반복정보 + 이미지정보
    // 목록 조회 때 모든 후보에 상세 API를 호출하면 개발계정 호출량이 빠르게
    // 소모되므로, 사용자가 [TourAPI 상세정보]를 눌렀을 때만 조회하고 캐시합니다.
    // ============================================================
    const TOUR_DETAIL_CACHE = new Map();

    function stripHtml(value = "") {
      const div = document.createElement("div");
      div.innerHTML = String(value);
      return (div.textContent || div.innerText || "").trim();
    }

    function escapeHtml(value = "") {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    const TOUR_FIELD_LABELS = {
      title: "이름", addr1: "주소", addr2: "상세주소", zipcode: "우편번호",
      tel: "전화번호", telname: "전화 안내명", homepage: "홈페이지",
      overview: "상세 소개", mapx: "경도", mapy: "위도", mlevel: "지도 레벨",
      firstimage: "대표 이미지", firstimage2: "대표 썸네일",
      createdtime: "등록일", modifiedtime: "수정일", contentid: "콘텐츠 ID",
      contenttypeid: "콘텐츠 유형", cat1: "대분류", cat2: "중분류", cat3: "소분류",
      areacode: "지역 코드", sigungucode: "시군구 코드", lDongRegnCd: "법정동 시도코드",
      lDongSignguCd: "법정동 시군구코드", lclsSystm1: "신분류 대분류",
      lclsSystm2: "신분류 중분류", lclsSystm3: "신분류 소분류",
      chkpet: "반려동물 동반", expagerange: "체험 가능 연령", expguide: "체험 안내",
      heritage1: "세계문화유산", heritage2: "세계자연유산", heritage3: "세계기록유산",
      infocenter: "문의 및 안내", opendate: "개장일", parking: "주차",
      restdate: "쉬는 날", useseason: "이용 시기", usetime: "이용 시간",
      accomcount: "수용 인원", chkbabycarriage: "유모차 대여", chkcreditcard: "신용카드",
      chkpet: "반려동물", discountinfo: "할인 정보", parkingfee: "주차 요금",
      usefee: "이용 요금", spendtime: "관람 소요시간",
      firstmenu: "대표 메뉴", treatmenu: "취급 메뉴", opentimefood: "영업 시간",
      restdatefood: "쉬는 날", reservationfood: "예약 안내", infocenterfood: "문의 및 안내",
      parkingfood: "주차", packing: "포장 가능", scalefood: "규모", seat: "좌석 수",
      smoking: "금연/흡연", kidsfacility: "어린이 시설", chkcreditcardfood: "신용카드",
      lcnsno: "인허가 번호", openperiod: "영업 기간",
      checkintime: "입실 시간", checkouttime: "퇴실 시간", reservationlodging: "예약 안내",
      reservationurl: "예약 홈페이지", roomcount: "객실 수", roomtype: "객실 유형",
      scalelodging: "규모", parkinglodging: "주차", pickup: "픽업 서비스",
      foodplace: "식음료장", subfacility: "부대시설", barbecue: "바비큐",
      beauty: "뷰티시설", beverage: "식음료장", bicycle: "자전거 대여", campfire: "캠프파이어",
      fitness: "피트니스", karaoke: "노래방", publicbath: "공용 샤워실/목욕시설",
      publicpc: "공용 PC", sauna: "사우나", seminar: "세미나실", sports: "스포츠 시설",
      roomcode: "객실 코드", roomtitle: "객실명", roomsize1: "객실 크기",
      roomcount: "객실 수", roombasecount: "기준 인원", roommaxcount: "최대 인원",
      roomoffseasonminfee1: "비수기 주중 최소요금", roomoffseasonminfee2: "비수기 주말 최소요금",
      roompeakseasonminfee1: "성수기 주중 최소요금", roompeakseasonminfee2: "성수기 주말 최소요금",
      roomintro: "객실 소개", roombathfacility: "목욕시설", roombath: "욕조",
      roomhometheater: "홈시어터", roomaircondition: "에어컨", roomtv: "TV",
      roompc: "PC", roomcable: "케이블TV", roominternet: "인터넷", roomrefrigerator: "냉장고",
      roomtoiletries: "세면도구", roomsofa: "소파", roomcook: "취사", roomtable: "테이블",
      roomhairdryer: "헤어드라이어", roomimg1: "객실 이미지",
      fldgubun: "정보 구분", infoname: "정보명", infotext: "정보 내용", serialnum: "순번",
      originimgurl: "원본 이미지", smallimageurl: "썸네일 이미지", imgname: "이미지명",
      cpyrhtDivCd: "저작권 유형",
      parking: "장애인 주차/주차 편의", route: "주 출입 접근로", publictransport: "대중교통",
      ticketoffice: "매표소", promotion: "홍보물", wheelchair: "휠체어 대여",
      exit: "출입통로", elevator: "엘리베이터", restroom: "장애인 화장실",
      auditorium: "관람석", room: "객실", handicapetc: "지체장애 기타",
      braileblock: "점자블록", helpdog: "보조견 동반", guidehuman: "안내요원",
      audioguide: "음성안내", bigprint: "큰활자 안내", brailepromotion: "점자 홍보물",
      guidesystem: "유도안내설비", blindhandicapetc: "시각장애 기타",
      signguide: "수어 안내", videoguide: "자막/영상 안내", hearingroom: "청각장애 객실",
      hearinghandicapetc: "청각장애 기타", stroller: "유모차 대여",
      lactationroom: "수유실", babysparechair: "유아용 보조의자", infantsfamilyetc: "영유아가족 기타"
    };

    function fieldLabel(key) {
      return TOUR_FIELD_LABELS[key] || key;
    }

    function meaningfulEntries(obj) {
      if (!obj || typeof obj !== "object") return [];
      return Object.entries(obj).filter(([key, value]) => {
        if (value === null || value === undefined || value === "") return false;
        if (["firstimage", "firstimage2", "originimgurl", "smallimageurl", "roomimg1"].includes(key)) return false;
        return true;
      });
    }

    async function fetchTourDetailBundle(contentId, contentTypeId) {
      const cacheKey = `${contentId}:${contentTypeId || ""}`;
      if (TOUR_DETAIL_CACHE.has(cacheKey)) return TOUR_DETAIL_CACHE.get(cacheKey);

      const commonPromise = fetchTourApi("detailCommon2", { contentId: String(contentId) }).catch(e => {
        console.warn("detailCommon2 실패", e); return [];
      });
      const introPromise = fetchTourApi("detailIntro2", {
        contentId: String(contentId), contentTypeId: String(contentTypeId || "")
      }).catch(e => { console.warn("detailIntro2 실패", e); return []; });
      const infoPromise = fetchTourApi("detailInfo2", {
        contentId: String(contentId), contentTypeId: String(contentTypeId || "")
      }).catch(e => { console.warn("detailInfo2 실패", e); return []; });
      const imagePromise = fetchTourApi("detailImage2", {
        contentId: String(contentId), imageYN: "Y", subImageYN: "Y", numOfRows: "50"
      }).catch(e => { console.warn("detailImage2 실패", e); return []; });

      const barrierPromise = fetchBarrierFreeDetail(contentId).catch(e => {
        console.warn("detailWithTour2 실패", e); return {};
      });
      const [common, intro, info, images, barrierFree] = await Promise.all([commonPromise, introPromise, infoPromise, imagePromise, barrierPromise]);
      const bundle = { common, intro, info, images, barrierFree };
      TOUR_DETAIL_CACHE.set(cacheKey, bundle);
      return bundle;
    }

    function renderFieldGrid(obj) {
      const entries = meaningfulEntries(obj);
      if (!entries.length) return `<p class="text-sm text-slate-400">제공되는 세부정보가 없습니다.</p>`;
      return `<div class="grid md:grid-cols-2 gap-2">${entries.map(([key, value]) => {
        const clean = stripHtml(value);
        const isUrl = /^https?:\/\//i.test(clean);
        const display = isUrl
          ? `<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${escapeHtml(clean)}</a>`
          : `<span class="text-slate-700 break-words whitespace-pre-line">${escapeHtml(clean)}</span>`;
        return `<div class="rounded-lg border border-slate-200 p-2.5 bg-white"><div class="text-[10px] font-bold text-slate-400 mb-1">${escapeHtml(fieldLabel(key))}</div><div class="text-xs">${display}</div></div>`;
      }).join("")}</div>`;
    }

    function renderInfoRows(rows) {
      if (!rows?.length) return `<p class="text-sm text-slate-400">제공되는 반복/부가정보가 없습니다.</p>`;
      return rows.map((row, idx) => `<div class="rounded-xl border border-slate-200 p-3 bg-white mb-2"><div class="text-xs font-bold text-blue-700 mb-2">부가정보 ${idx + 1}${row.infoname ? ` · ${escapeHtml(stripHtml(row.infoname))}` : ""}</div>${renderFieldGrid(row)}</div>`).join("");
    }

    function renderTourImages(images, fallbackImage = "") {
      const urls = uniqueBy([
        ...((images || []).map(x => ({ url: x.originimgurl || x.smallimageurl, name: x.imgname || "관광 이미지", copyright: x.cpyrhtDivCd || "" }))),
        ...(fallbackImage ? [{ url: fallbackImage, name: "대표 이미지", copyright: "" }] : [])
      ].filter(x => x.url), x => x.url);
      if (!urls.length) return `<p class="text-sm text-slate-400">제공되는 추가 이미지가 없습니다.</p>`;
      return `<div class="grid grid-cols-2 md:grid-cols-3 gap-2">${urls.slice(0, 3).map(img => `<figure class="rounded-xl overflow-hidden border border-slate-200 bg-white"><img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.name)}" class="w-full h-36 object-cover" loading="lazy"><figcaption class="p-2 text-[10px] text-slate-500">${escapeHtml(img.name)}${img.copyright ? ` · 저작권코드 ${escapeHtml(img.copyright)}` : ""}</figcaption></figure>`).join("")}</div>`;
    }

    function renderBarrierFreeSection(detail) {
      const entries = meaningfulBarrierEntries(detail);
      if (!entries.length) {
        return `<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><i class="fa-solid fa-circle-exclamation mr-1"></i> 무장애 여행 정보 API에 등록된 상세 편의정보가 없습니다. 이는 시설이 없다는 뜻이 아니라 API에서 확인되지 않았다는 뜻입니다.</div>`;
      }
      return `<div class="grid md:grid-cols-2 gap-2">${entries.map(([key, value]) => `
        <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div class="text-[11px] font-black text-emerald-700 mb-1">${escapeHtml(fieldLabel(key))}</div>
          <div class="text-xs leading-5 text-slate-700 whitespace-pre-line">${escapeHtml(stripHtml(value))}</div>
        </div>`).join("")}</div>`;
    }

    // 원본 API의 모든 필드를 나열하지 않고, 여행자가 선택 전에 판단할 핵심 정보만 보여줍니다.
    function renderBasicTourInfo(common = {}, intro = {}) {
      const get = (...values) => values.map(stripHtml).filter(Boolean).join(" · ");
      const fields = [
        ["주소", get(common.addr1, common.addr2)],
        ["전화", get(common.tel, intro.infocenter, intro.infocenterfood, intro.infocenterlodging)],
        ["이용 시간", get(intro.usetime, intro.opentimefood, common.usetime)],
        ["휴무일", get(intro.restdate, intro.restdatefood, common.restdate)],
        ["요금", get(intro.usefee, intro.roomoffseasonminfee1, intro.roompeakseasonminfee1)],
        ["주차", get(intro.parking, intro.parkingfood, intro.parkinglodging, common.parking)],
        ["체크인 / 체크아웃", get(intro.checkintime, intro.checkouttime)],
        ["예약", get(intro.reservation, intro.reservationfood, intro.reservationlodging)]
      ].filter(([, value]) => value);

      if (!fields.length) return `<p class="text-sm text-slate-400">표시할 기본 정보가 없습니다.</p>`;
      return `<div class="grid md:grid-cols-2 gap-2">${fields.map(([label, value]) => `
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <div class="text-[10px] font-bold text-slate-400 mb-1">${label}</div>
          <div class="text-xs leading-5 text-slate-700 whitespace-pre-line">${escapeHtml(value)}</div>
        </div>`).join("")}</div>`;
    }

    function closeTourDetailModal() {
      document.getElementById("tourDetailModal")?.classList.add("hidden");
    }

    async function openTourDetailModalByData(contentId, contentTypeId, name, fallbackImage = "") {
      if (!contentId) {
        alert("이 항목은 TourAPI 콘텐츠 ID가 없어 상세정보를 조회할 수 없습니다.");
        return;
      }
      const modal = document.getElementById("tourDetailModal");
      const title = document.getElementById("tourDetailTitle");
      const body = document.getElementById("tourDetailBody");
      title.textContent = name || "TourAPI 상세정보";
      body.innerHTML = `<div class="py-16 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i><p class="font-bold">한국관광공사 상세정보를 불러오는 중...</p><p class="text-xs mt-1">공통 · 소개 · 반복 · 이미지 · 무장애 편의정보를 동시에 조회합니다.</p></div>`;
      modal.classList.remove("hidden");

      try {
        const bundle = await fetchTourDetailBundle(contentId, contentTypeId);
        const common = bundle.common?.[0] || {};
        const intro = bundle.intro?.[0] || {};
        const overview = stripHtml(common.overview || "");
        const homepage = stripHtml(common.homepage || "");
        body.innerHTML = `
          ${overview ? `<section class="mb-5"><h4 class="font-black text-slate-900 mb-2"><i class="fa-solid fa-circle-info text-blue-600 mr-1"></i> 상세 소개</h4><div class="text-sm leading-7 text-slate-700 bg-blue-50/60 border border-blue-100 rounded-xl p-4 whitespace-pre-line">${escapeHtml(overview)}</div></section>` : ""}
          ${homepage ? `<div class="mb-4 text-xs"><strong>홈페이지:</strong> ${homepage}</div>` : ""}
          <section class="mb-6"><h4 class="font-black text-emerald-800 mb-2"><i class="fa-solid fa-universal-access mr-1"></i> 무장애 편의정보</h4>${renderBarrierFreeSection(bundle.barrierFree)}</section>
          <section class="mb-6"><h4 class="font-black text-slate-900 mb-2">기본 이용 정보</h4>${renderBasicTourInfo(common, intro)}</section>
          <section class="mb-3"><h4 class="font-black text-slate-900 mb-2">대표 이미지</h4>${renderTourImages(bundle.images, fallbackImage)}</section>
          <p class="text-[11px] text-slate-400 mt-5">※ 화면에는 TourAPI와 무장애 여행 정보 API가 실제로 반환한 값만 표시합니다. 비어 있는 필드는 임의로 추정하지 않습니다.</p>`;
      } catch (e) {
        console.error(e);
        body.innerHTML = `<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700"><strong>상세정보 조회 실패</strong><br><span class="text-xs">${escapeHtml(e.message)}</span></div>`;
      }
    }

    function detailButtonHtml(item, compact = false) {
      if (!item?.contentId) return "";
      const cid = JSON.stringify(String(item.contentId));
      const ctid = JSON.stringify(String(item.contentTypeId || ""));
      const nm = JSON.stringify(String(item.name || "TourAPI 상세정보"));
      const img = JSON.stringify(String(item.image || ""));
      return `<button type="button" onclick='openTourDetailModalByData(${cid}, ${ctid}, ${nm}, ${img})' class="${compact ? "text-[10px] px-2 py-1" : "text-xs px-2.5 py-1"} font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"><i class="fa-solid fa-database mr-1"></i>TourAPI 상세정보</button>`;
    }

    function getDeepLinks(name, address = "") {
      const nameQuery = encodeURIComponent(String(name || "").trim());
      const mapQuery = encodeURIComponent(String(address || name || "").trim());
      return {
        airbnb: `https://www.airbnb.co.kr/s/${nameQuery}/homes`,
        kakaoMap: `https://map.kakao.com/?q=${mapQuery}`
      };
    }

    function getItemDeepLinks(item) {
      const links = getDeepLinks(item?.name || "", item?.address || "");
      if (item?.kakaoUrl || item?.place_url) links.kakaoMap = item.kakaoUrl || item.place_url;
      return links;
    }

    let currentPlanState = {
      travelBudget: 150000,
      origin: "천안아산",
      tripType: "dayTrip",
      localTransportPreference: "walk",
      preferenceProfile: { accessibilityFirst: false, scenery: null, focus: null, pace: null, discovery: null },
      candidateDestinations: [],
      selectedDestination: null,
      mustVisitPlaces: [],
      mustVisitDestination: null,
      candidatePlaces: [],
      rawSpotCandidates: [],
      prunedPlaces: [],
      selectedPlaces: [],
      routeSegments: [],
      routeStops: [],
      routeClusters: [],
      initialRouteDistanceKm: null,
      optimizedRouteDistanceKm: null,
      intercityTransportCost: null,
      localTransportCost: null,
      foodCost: null,
      activityCost: null,
      otherCost: null,
      estimatedTotalCost: null,
      remainingBudget: null,
      transportMode: "ktx",
      transportPriceSource: "unknown",
      depart: "천안아산",
      arrival: "강릉",
      departTime: "09:00",
      arrivalTime: "11:00",
      arrivalTimeDisplay: "11:00",
      arrivalDayOffset: 0,
      returnTime: "19:30",
      startDate: "",
      endDate: "",
      duration: 1,
      nights: 0,
      budget: 150000,
      ktxTotal: 83400,
      routingInfo: null,
      daysData: []
    };

    let repeatModalData = {
      sourceItem: null,
      sourceDay: 1,
      sourceCategory: "lunch"
    };

    let directSearchState = {
      meals: {}
    };

    function getMealSearchKey(dayNum, category) {
      return `${dayNum}-${category}`;
    }

    function getMealSearchState(dayNum, category) {
      const key = getMealSearchKey(dayNum, category);
      if (!directSearchState.meals[key]) {
        directSearchState.meals[key] = { query: "", loading: false, error: "", results: [] };
      }
      return directSearchState.meals[key];
    }

    function getSeasonInfo(dateString) {
      if (!dateString) return { code: "autumn", name: "가을", icon: "fa-canadian-maple-leaf", desc: "🍁 가을 단풍·억새 힐링", badgeClass: "bg-amber-100 text-amber-800 border border-amber-200" };
      const month = new Date(dateString).getMonth() + 1;
      if (month >= 3 && month <= 5) return { code: "spring", name: "봄", icon: "fa-seedling", desc: "🌸 봄꽃 무장애 추천 코스", badgeClass: "bg-pink-100 text-pink-700 border border-pink-200" };
      if (month >= 6 && month <= 8) return { code: "summer", name: "여름", icon: "fa-sun", desc: "🌊 시원한 실내·바다 피서 코스", badgeClass: "bg-sky-100 text-sky-700 border border-sky-200" };
      if (month >= 9 && month <= 11) return { code: "autumn", name: "가을", icon: "fa-canadian-maple-leaf", desc: "🍁 가을 단풍·억새 힐링 코스", badgeClass: "bg-amber-100 text-amber-800 border border-amber-200" };
      return { code: "winter", name: "겨울", icon: "fa-snowflake", desc: "❄️ 따뜻한 힐링·겨울바다 코스", badgeClass: "bg-indigo-100 text-indigo-700 border border-indigo-200" };
    }

    let activePlannerMode = "ktx";
    let currentFlightPackages = [];

    function switchPlannerMode(mode) {
      activePlannerMode = mode === "flight" ? "flight" : "ktx";
      const isFlight = activePlannerMode === "flight";
      document.getElementById("ktxInputPanel").classList.toggle("hidden", isFlight);
      document.getElementById("flightInputPanel").classList.toggle("hidden", !isFlight);
      document.getElementById("plannerFormTitle").innerHTML = isFlight
        ? '<i class="fa-solid fa-plane text-sky-600"></i> SkyPlanner 제주 항공 여행 설정'
        : '<i class="fa-solid fa-sliders text-blue-600"></i> KTX 철도 여행 설정';
      document.getElementById("ktxPlannerTab").className = `rounded-lg px-4 py-2 text-xs font-bold transition ${isFlight ? "text-slate-600 hover:bg-slate-50" : "bg-blue-600 text-white"}`;
      document.getElementById("flightPlannerTab").className = `rounded-lg px-4 py-2 text-xs font-bold transition ${isFlight ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-sky-50"}`;
      document.getElementById("generateBtn").querySelector("span").innerText = isFlight ? "제주 항공 맞춤 플랜 생성" : "선택 일수 전 일정 맞춤 플랜 생성";
      const placeholderTitle = document.querySelector("#placeholderView h3");
      if (placeholderTitle) placeholderTitle.innerText = isFlight ? "출발 공항과 여행 조건을 고르고 버튼을 눌러주세요" : "출발역과 도착역을 고르고 버튼을 눌러주세요";
      if (!isFlight) document.getElementById("flightResultsSection")?.classList.add("hidden");
    }

    function updateFlightDates() {
      const start = document.getElementById("flightStartDate");
      const end = document.getElementById("flightEndDate");
      end.min = start.value;
      if (start.value && end.value && end.value < start.value) end.value = start.value;
      const days = calculateTripDays(start.value, end.value) || 1;
      document.getElementById("flightDurationPreview").innerText = formatTripDuration(days);
      updateFlightRouteAndTimes();
    }

    function getFlightDurationMinutes(airportCode, flight = null) { return Number(flight?.durationMinutes) || FLIGHT_DURATION_MINUTES[airportCode] || 70; }
    function getAirportBufferMinutes(accessibilityMode) { return accessibilityMode === "priority" ? ACCESSIBLE_AIRPORT_BUFFER_MINUTES : DOMESTIC_AIRPORT_BUFFER_MINUTES; }
    function getArrivalBufferMinutes(transportType) { return transportType === "rental" ? RENTAL_ARRIVAL_BUFFER_MINUTES : JEJU_ARRIVAL_BUFFER_MINUTES; }
    function calculateRecommendedAirportArrivalTime(departureTime, accessibilityMode) { return minutesToTime(timeToMinutes(departureTime) - getAirportBufferMinutes(accessibilityMode)); }
    function calculateFlightLandingTime(departureTime, durationMinutes) { return minutesToTime(timeToMinutes(departureTime) + durationMinutes); }
    function calculateActivityStartTime(landingTime, transportType) { return minutesToTime(timeToMinutes(landingTime) + getArrivalBufferMinutes(transportType)); }
    function calculateReturnAirportArrivalTime(returnDepartureTime, accessibilityMode) { return calculateRecommendedAirportArrivalTime(returnDepartureTime, accessibilityMode); }
    function calculateLastDayActivityEndTime(returnDepartureTime, accessibilityMode) { return minutesToTime(timeToMinutes(calculateReturnAirportArrivalTime(returnDepartureTime, accessibilityMode)) - LAST_DAY_AIRPORT_TRANSFER_MINUTES); }

    function updateFlightRouteAndTimes() {
      const airportCode = document.getElementById("departAirport")?.value || "GMP";
      const airport = JEJU_AIRPORTS[airportCode];
      const direction = document.querySelector('input[name="flightDirection"]:checked')?.value || "toJeju";
      const outboundTime = document.getElementById("outboundDepartureTime")?.value || "09:00";
      const returnTime = document.getElementById("returnDepartureTime")?.value || "18:00";
      const accessibility = document.querySelector('input[name="accessibility"]:checked')?.value || "general";
      const transport = document.getElementById("jejuTransport")?.value || "public";
      const duration = getFlightDurationMinutes(airportCode);
      const landingTime = calculateFlightLandingTime(outboundTime, duration);
      const activityStart = calculateActivityStartTime(landingTime, transport);
      const airportArrival = calculateRecommendedAirportArrivalTime(outboundTime, accessibility);
      const returnAirportArrival = calculateReturnAirportArrivalTime(returnTime, accessibility);
      const lastActivityEnd = calculateLastDayActivityEndTime(returnTime, accessibility);
      const from = direction === "toJeju" ? airport : JEJU_AIRPORT;
      const to = direction === "toJeju" ? JEJU_AIRPORT : airport;
      document.getElementById("flightRouteSummary").innerHTML = `${from.name} <span class="text-sky-400">(${from.code}) &nbsp;→&nbsp;</span> ${to.name} <span class="text-sky-400">(${to.code})</span>`;
      document.getElementById("flightActivityStartTime").value = activityStart;
      const accessibilityText = accessibility === "priority" ? "교통약자 이동 및 탑승 지원시간을 고려해 출발 120분 전 도착을 권장합니다." : "국내선 탑승을 고려해 출발 90분 전 공항 도착을 권장합니다.";
      document.getElementById("flightScheduleSummary").innerHTML = `<strong class="text-sky-800">가는 편</strong><br>${airportArrival} ${from.name} 권장 도착 → ${outboundTime} 출발 → ${landingTime} 예상 착륙 → ${activityStart} 예상 활동 가능<br><strong class="text-sky-800">오는 편</strong><br>${lastActivityEnd} 관광 종료 권장 → ${returnAirportArrival} 제주공항 권장 도착 → ${returnTime} 출발<br><span class="text-slate-400">예상 비행시간 ${duration}분 · ${accessibilityText}</span>`;
    }

    function updateFlightSummaryFromFlights(outbound, returnFlight) {
      if (!outbound) return;
      const accessibility = document.querySelector('input[name="accessibility"]:checked')?.value || "general";
      const transport = document.getElementById("jejuTransport").value;
      const outboundTime = formatFlightTime(outbound.departureTime);
      const landingTime = formatFlightTime(outbound.arrivalTime) || calculateFlightLandingTime(outboundTime, getFlightDurationMinutes(document.getElementById("departAirport").value, outbound));
      const activityStart = calculateActivityStartTime(landingTime, transport);
      const returnTime = returnFlight ? formatFlightTime(returnFlight.departureTime) : document.getElementById("returnDepartureTime").value;
      document.getElementById("flightActivityStartTime").value = activityStart;
      document.getElementById("flightScheduleSummary").innerHTML = `<strong class="text-sky-800">가는 편</strong><br>${calculateRecommendedAirportArrivalTime(outboundTime, accessibility)} 출발 공항 권장 도착 → ${outboundTime} 출발 → ${landingTime} 도착 → ${activityStart} 예상 활동 가능<br><strong class="text-sky-800">오는 편</strong><br>${calculateLastDayActivityEndTime(returnTime, accessibility)} 관광 종료 권장 → ${calculateReturnAirportArrivalTime(returnTime, accessibility)} 제주공항 권장 도착 → ${returnTime} 출발<br><span class="text-slate-400">${outbound.source === "mock-estimate" ? "예상" : "검색 결과"} 비행시간 ${outbound.durationMinutes}분 · 실제 운항정보는 항공사에서 최종 확인해 주세요.</span>`;
    }

    function makeMockFlights({ origin, destination, departDate, cabinClass, direction, preferredTime, airportCode }) {
      const basePrices = { ICN: 95000, GMP: 72000, PUS: 57000, CJJ: 63000 };
      const cabinMultiplier = { economy: 1, premium_economy: 1.45, business: 2.2 }[cabinClass] || 1;
      const departure = preferredTime || (direction === "return" ? "18:00" : "09:00");
      const durationMinutes = getFlightDurationMinutes(airportCode);
      return [{
        id: `estimate-${direction}-${airportCode}-${departDate}`,
        airline: "항공사 미정", flightNumber: "",
        origin, destination, departureTime: `${departDate}T${departure}:00`, arrivalTime: `${departDate}T${calculateFlightLandingTime(departure, durationMinutes)}:00`,
        durationMinutes, stops: 0,
        price: roundPrice((basePrices[airportCode] || 70000) * cabinMultiplier),
        currency: "KRW", bookingUrl: "https://www.skyscanner.co.kr/transport/flights/", source: "mock-estimate",
        priceDescription: "실제 항공권 가격이 아닌 개발용 예상 가격"
      }];
    }

    function normalizeFlightResult(item, index = 0) {
      return {
        id: item.id || `flight-${index}`, airline: item.airline || item.carrier || "항공사 미상",
        flightNumber: item.flightNumber || "", origin: item.origin, destination: item.destination,
        departureTime: item.departureTime, arrivalTime: item.arrivalTime,
        durationMinutes: Number(item.durationMinutes) || 70, stops: Number(item.stops) || 0,
        price: Number(item.price) || 0, currency: item.currency || "KRW", bookingUrl: item.bookingUrl || "",
        source: item.source || "flight-api", priceDescription: item.priceDescription || "항공 검색 API 제공 가격"
      };
    }

    function getJejuRegion(item) {
      const text = `${item?.address || ""} ${item?.name || ""}`;
      if (/성산|우도|구좌|표선/.test(text)) return "성산/우도";
      if (/중문|안덕/.test(text)) return "중문";
      if (/서귀포|남원/.test(text)) return "서귀포";
      if (/애월|한림|한경/.test(text)) return "애월/한림";
      return "제주시권";
    }

    async function searchFlights(params) {
      const configured = FLIGHT_API_CONFIG.apiKey !== "YOUR_FLIGHT_API_KEY" && FLIGHT_API_CONFIG.baseUrl !== "YOUR_API_ENDPOINT";
      if (configured) {
        try {
          const response = await fetch(FLIGHT_API_CONFIG.baseUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${FLIGHT_API_CONFIG.apiKey}` }, body: JSON.stringify(params) });
          if (!response.ok) throw new Error(`항공 API 오류 (${response.status})`);
          const data = await response.json();
          return (data.flights || data.results || []).map(normalizeFlightResult);
        } catch (error) {
          console.warn("항공권 정보를 불러오지 못해 예상 데이터로 전환합니다.", error);
        }
      }
      return makeMockFlights(params).map(normalizeFlightResult);
    }

    function getFlightHour(flight) { return Number(String(flight.departureTime).slice(11, 13)); }
    function scoreFlight(flight, preferredBand, budgetPerAdult) {
      const [start, end] = FLIGHT_TIME_BANDS[preferredBand] || [0, 24];
      const hour = getFlightHour(flight);
      return (hour >= start && hour < end ? 35 : -10) + (flight.stops === 0 ? 20 : 0)
        + (flight.durationMinutes <= 90 ? 10 : 0) + (flight.price <= budgetPerAdult ? 20 : -10) - Math.round(flight.price / 20000);
    }

    async function buildFlightPackages(params) {
      const toJeju = params.flightDirection === "toJeju";
      const outboundOrigin = toJeju ? params.airportCode : "CJU";
      const outboundDestination = toJeju ? "CJU" : params.airportCode;
      const returnOrigin = toJeju ? "CJU" : params.airportCode;
      const returnDestination = toJeju ? params.airportCode : "CJU";
      const outbound = await searchFlights({ ...params, origin: outboundOrigin, destination: outboundDestination, departDate: params.startDate, direction: "outbound", preferredTime: params.outboundDepartureTime });
      const returns = await searchFlights({ ...params, origin: returnOrigin, destination: returnDestination, departDate: params.endDate, direction: "return", preferredTime: params.returnDepartureTime });
      const budgetPerAdult = Math.max(50000, params.budget / Math.max(1, params.adults) / 2);
      return outbound.map((going, index) => {
        const back = returns[index] || null;
        const pricePerAdult = going.price + (back?.price || 0);
        return { id: `package-${going.id}`, outbound: going, returnFlight: back, pricePerAdult,
          total: pricePerAdult * params.adults,
          score: scoreFlight(going, "morning", budgetPerAdult) + (back ? scoreFlight(back, "evening", budgetPerAdult) : 0) };
      }).sort((a, b) => b.score - a.score);
    }

    function formatFlightTime(value) { return String(value || "").slice(11, 16); }
    function renderFlightResults(packages) {
      const section = document.getElementById("flightResultsSection");
      if (activePlannerMode !== "flight") { section.classList.add("hidden"); return; }
      section.classList.remove("hidden");
      const isApiResult = packages.length > 0 && packages.every(item => item.outbound.source !== "mock-estimate" && (!item.returnFlight || item.returnFlight.source !== "mock-estimate"));
      const sourceLabel = isApiResult ? "항공 API 조회 · 구매 전 요금 재확인" : "예상 데이터 · 실제 항공권 가격 아님";
      section.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-sm font-bold text-slate-900"><i class="fa-solid fa-plane-departure text-sky-600 mr-1"></i>항공편 검색 결과</h3><span class="text-[10px] text-amber-700">${sourceLabel}</span></div><div class="space-y-2">${packages.map((item, index) => `<div class="rounded-xl border ${currentPlanState.selectedFlightPackage?.id === item.id ? "border-sky-500 bg-sky-50" : "border-slate-200"} p-3 text-xs"><div class="flex flex-wrap justify-between gap-3"><div class="min-w-0"><strong>${escapeHtml(item.outbound.airline)} ${escapeHtml(item.outbound.flightNumber)}</strong><p class="text-slate-600 mt-1">${item.outbound.origin} ${formatFlightTime(item.outbound.departureTime)} → ${item.outbound.destination} ${formatFlightTime(item.outbound.arrivalTime)} · 예상 비행시간 ${item.outbound.durationMinutes}분 · ${item.outbound.stops ? `${item.outbound.stops}회 경유` : "직항"}</p>${item.returnFlight ? `<p class="text-slate-600">${item.returnFlight.origin} ${formatFlightTime(item.returnFlight.departureTime)} → ${item.returnFlight.destination} ${formatFlightTime(item.returnFlight.arrivalTime)} · 예상 비행시간 ${item.returnFlight.durationMinutes}분 · 직항</p>` : ""}</div><div class="text-left sm:text-right shrink-0"><strong class="text-sky-700">1인 ${item.pricePerAdult.toLocaleString()}원</strong><p class="text-[10px] text-slate-500">총 ${item.total.toLocaleString()}원</p><button type="button" onclick="selectFlightPackage(${index})" class="mt-1 rounded-md bg-sky-600 px-2 py-1 font-bold text-white">이 항공편 선택</button></div></div></div>`).join("")}</div>`;;
    }

    function selectFlightPackage(index) {
      const selected = currentFlightPackages[index];
      if (!selected || activePlannerMode !== "flight") return;
      currentPlanState.selectedFlightPackage = selected;
      currentPlanState.outboundFlight = selected.outbound;
      currentPlanState.returnFlight = selected.returnFlight;
      currentPlanState.flightTotal = selected.total;
      currentPlanState.flightPriceSource = selected.outbound.source !== "mock-estimate" && (!selected.returnFlight || selected.returnFlight.source !== "mock-estimate") ? "api" : "estimated";
      currentPlanState.transportPriceSource = currentPlanState.flightPriceSource;
      currentPlanState.outboundDepartureTime = formatFlightTime(selected.outbound.departureTime);
      currentPlanState.outboundFlightDuration = selected.outbound.durationMinutes;
      currentPlanState.outboundLandingTime = formatFlightTime(selected.outbound.arrivalTime);
      currentPlanState.firstDayActivityStartTime = calculateActivityStartTime(currentPlanState.outboundLandingTime, currentPlanState.jejuTransport);
      currentPlanState.arrivalTime = currentPlanState.firstDayActivityStartTime;
      currentPlanState.returnTime = selected.returnFlight ? formatFlightTime(selected.returnFlight.departureTime) : "21:00";
      currentPlanState.returnDepartureTime = currentPlanState.returnTime;
      currentPlanState.returnAirportArrivalTime = calculateReturnAirportArrivalTime(currentPlanState.returnTime, currentPlanState.accessibility);
      currentPlanState.lastDayActivityEndTime = calculateLastDayActivityEndTime(currentPlanState.returnTime, currentPlanState.accessibility);
      renderFlightTicketCard(selected, currentPlanState.adults, currentPlanState.tripType);
      updateFlightSummaryFromFlights(selected.outbound, selected.returnFlight);
      renderFlightResults(currentFlightPackages);
      recalculateLiveBudget();
    }

    // 1. 초기 플랜 생성
    async function generateInitialPlan() {
      const generateBtn = document.getElementById("generateBtn");
      const originalBtnHtml = generateBtn.innerHTML;

      const isFlightMode = activePlannerMode === "flight";
      const depart = isFlightMode ? document.getElementById("departAirport").value : document.getElementById("departStation").value;
      const arrival = isFlightMode ? "제주" : document.getElementById("arrivalStation").value;
      let departTime = isFlightMode ? "09:00" : document.getElementById("departTime").value;
      const arrivalTimeInput = document.getElementById("arrivalTime");
      let arrivalTime = isFlightMode ? "10:30" : (arrivalTimeInput.dataset.time || "");
      let arrivalTimeDisplay = isFlightMode ? "10:30" : arrivalTimeInput.value;
      const arrivalDayOffset = isFlightMode ? 0 : Number(arrivalTimeInput.dataset.dayOffset || 0);
      let returnTime = isFlightMode ? "17:30" : document.getElementById("returnTime").value;
      const flightTripType = "roundtrip";
      const startDateValue = document.getElementById(isFlightMode ? "flightStartDate" : "tripStartDate").value;
      const rawEndDateValue = document.getElementById(isFlightMode ? "flightEndDate" : "tripEndDate").value;
      const endDateValue = rawEndDateValue;
      const duration = Math.max(1, Number(document.getElementById("duration")?.value) || 1);
      const budget = Number(document.getElementById("totalBudget").value.replace(/[^0-9]/g, "")) || 0;
      const accessibility = document.querySelector('input[name="accessibility"]:checked')?.value || (document.getElementById("accessibilityPreference").checked ? "priority" : "general");

      if (!startDateValue || !endDateValue || duration < 1) {
        alert("출발일과 도착일을 올바르게 선택해 주세요.");
        return;
      }

      if (!isFlightMode && depart === arrival) {
        alert("출발역과 도착역은 서로 다른 역으로 선택해 주세요.");
        return;
      }

      if (!isFlightMode && (!departTime || !arrivalTime || !returnTime)) {
        departTime = departTime || document.getElementById("departTime").value || "09:00";
        returnTime = returnTime || document.getElementById("returnTime").value || "19:30";
        arrivalTime = arrivalTime || "12:00";
        arrivalTimeDisplay = arrivalTime;
      }

      if (!isFlightMode && (!isRailTimeAvailable(depart, departTime) || !isRailTimeAvailable(arrival, returnTime))) {
        alert("선택한 시간이 해당 역의 KTX/SRT 첫차·막차 범위를 벗어납니다. 안내된 가능 시간 안에서 다시 선택해 주세요.");
        updateRailTimeOptions();
        return;
      }

      generateBtn.disabled = true;
      generateBtn.classList.add("opacity-70", "cursor-wait");
      const showGenerationStage = label => new Promise(resolve => {
        generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${label}</span>`;
        setTimeout(resolve, 0);
      });

      try {
        await showGenerationStage(isFlightMode ? "항공편 후보를 조회하고 있습니다" : "출발 조건과 열차 경로를 확인하고 있습니다");
        const routing = isFlightMode ? null : calculateKtxRouting(depart, arrival);
        let selectedFlightPackage = null;
        const adults = isFlightMode ? Math.max(1, Number(document.getElementById("flightAdults").value) || 1) : 1;
        if (isFlightMode) {
          await showGenerationStage("항공편 후보를 탐색하고 있습니다");
          currentFlightPackages = await buildFlightPackages({ airportCode: depart, startDate: startDateValue, endDate: endDateValue,
            flightDirection: document.querySelector('input[name="flightDirection"]:checked').value,
            adults, cabinClass: document.getElementById("flightCabinClass").value,
            outboundDepartureTime: document.getElementById("outboundDepartureTime").value,
            returnDepartureTime: document.getElementById("returnDepartureTime").value, budget });
          if (!currentFlightPackages.length) throw new Error("항공권 정보를 불러오지 못했습니다.");
          selectedFlightPackage = currentFlightPackages[0];
          departTime = formatFlightTime(selectedFlightPackage.outbound.departureTime);
          arrivalTime = calculateActivityStartTime(formatFlightTime(selectedFlightPackage.outbound.arrivalTime), document.getElementById("jejuTransport").value);
          arrivalTimeDisplay = arrivalTime;
          returnTime = selectedFlightPackage.returnFlight ? formatFlightTime(selectedFlightPackage.returnFlight.departureTime) : "21:00";
        }
        const ktxTotal = isFlightMode ? 0 : routing.oneWay * 2;
        const flightTotal = isFlightMode ? selectedFlightPackage.total : 0;
        const season = getSeasonInfo(startDateValue);
        if (!isFlightMode) {
          departTime = findAvailableRailTime(depart, 8, "09:00");
          returnTime = findAvailableRailTime(arrival, 39, "19:30");
          document.getElementById("departTime").value = departTime;
          document.getElementById("returnTime").value = returnTime;
          updateEstimatedArrival();
          arrivalTime = document.getElementById("arrivalTime").dataset.time || "12:00";
          arrivalTimeDisplay = document.getElementById("arrivalTime").value || arrivalTime;
        }

        await showGenerationStage("목적지 음식점과 관광지 정보를 조회하고 있습니다");
        const apiData = await loadDestinationTourData(arrival, accessibility);
        await showGenerationStage("취향과 필수 방문 조건을 반영하고 있습니다");
        const destinationDataKey = apiData.city;
        const preferenceProfile = { ...currentPlanState.preferenceProfile, accessibilityFirst: withTripPreferences.preferenceProfile.accessibilityFirst };
        const retainedMustVisits = currentPlanState.mustVisitDestination === destinationDataKey
          ? [...currentPlanState.mustVisitPlaces] : [];
        const retainedCandidates = [...currentPlanState.candidateDestinations];

        let meals = apiData.meals;
        let spots = apiData.spots;

        if (isFlightMode) {
          const theme = document.getElementById("jejuTheme").value;
          const themePatterns = { nature: /숲|오름|폭포|해변|공원|수목원/, food: /시장|먹거리|체험/, cafe: /카페|차|정원/, activity: /체험|레저|승마|잠수함/, photo: /해변|전망|폭포|정원|성산/ };
          const pattern = themePatterns[theme];
          const publicTransit = document.getElementById("jejuTransport").value === "public";
          spots = [...spots].sort((a, b) => {
            const score = spot => (pattern?.test(spot.name || "") ? 10 : 0) + (publicTransit && /시장|박물관|공원|해변/.test(spot.name || "") ? 4 : 0) - (publicTransit && /우도|오름/.test(spot.name || "") ? 4 : 0);
            return score(b) - score(a);
          });
        }

        const rawSpotCandidates = [...spots];
        const placePruning = prunePlaceCandidates(rawSpotCandidates, preferenceProfile, retainedMustVisits, {
          budget, intercityCost: isFlightMode ? flightTotal : getVerifiedCandidateFare(depart, arrival)
        });
        spots = placePruning.kept;

        meals = {
          lunch: meals.lunch.map(item => applyEstimatedPriceRange(item, "meal", { mealType: "lunch", travelBudget: budget, intercityCost: isFlightMode ? flightTotal : ktxTotal, region: destinationDataKey })),
          dinner: meals.dinner.map(item => applyEstimatedPriceRange(item, "meal", { mealType: "dinner", travelBudget: budget, intercityCost: isFlightMode ? flightTotal : ktxTotal, region: destinationDataKey }))
        };
        if (accessibility === "priority") {
          console.info("배리어프리 우선 모드: 무장애 여행 정보 API의 실제 편의정보를 기준으로 후보를 우선 정렬합니다.");
        }

        // 날짜마다 시작 위치를 다르게 잡아 같은 3개가 계속 반복되지 않게 함
        await showGenerationStage("관광지와 식사 후보로 일정을 구성하고 있습니다");
        const daysData = [];
        const jejuRegions = ["제주시권", "애월/한림", "서귀포", "성산/우도", "중문"];
        for (let day = 1; day <= duration; day++) {
          const isLastDay = (day === duration);
          const isFirstDay = (day === 1);
          const dayDate = new Date(`${startDateValue}T00:00:00`);
          dayDate.setDate(dayDate.getDate() + (day - 1));

          const lunchStart = ((day - 1) * 3) % Math.max(1, meals.lunch.length);
          const spotStart = ((day - 1) * 3) % Math.max(1, spots.length);
          const dinnerStart = (((day - 1) * 3) + 1) % Math.max(1, meals.dinner.length);

          const lunchOptions = takeRotatingOptions(meals.lunch, lunchStart, 3);
          const dayRegion = isFlightMode ? jejuRegions[(day - 1) % jejuRegions.length] : "";
          const regionalSpots = isFlightMode ? spots.filter(spot => spot.jejuRegion === dayRegion) : spots;
          const mandatorySpots = spots.filter(spot => spot.mustVisit);
          const regularSpots = (regionalSpots.length ? regionalSpots : spots).filter(spot => !spot.mustVisit);
          const spotOptions = [...mandatorySpots, ...takeRotatingOptions(regularSpots, spotStart, 3)];
          const dinnerOptions = isLastDay ? null : takeRotatingOptions(meals.dinner, dinnerStart, 3);
          const scheduleReturnTime = isFlightMode ? calculateLastDayActivityEndTime(returnTime, accessibility) : returnTime;
          const schedule = getDaySchedule({ isFirstDay, isLastDay, arrivalTime, arrivalDayOffset, returnTime: scheduleReturnTime });
          if (isFlightMode) schedule.notice = schedule.notice.replaceAll("역 이동", "공항 이동").replaceAll("역에", "공항에").replaceAll("귀가 열차", "귀가 항공편");
          if (isFlightMode && !isFirstDay && !isLastDay) {
            schedule.notice = `${dayRegion} 중심 일정 · ${document.getElementById("jejuTransport").value === "rental" ? "렌터카 이동 기준" : "대중교통 접근성 우선"} · ${document.getElementById("jejuTheme").selectedOptions[0].text}`;
          }

          daysData.push({
            dayNum: day,
            dateStr: formatDateInput(dayDate),
            isLastDay,
            isFirstDay,
            schedule,
            region: dayRegion,
            options: {
              lunch: lunchOptions,
              spot: spotOptions,
              dinner: dinnerOptions
            },
            selections: {
              lunch: schedule.showLunch ? chooseMealForBudget(lunchOptions, "lunch") : null,
              spot: schedule.showSpot ? spotOptions[0] : null,
              dinner: schedule.showDinner && dinnerOptions ? chooseMealForBudget(dinnerOptions, "dinner") : null
            },
            selectedRestaurant: null,
            confirmed: {
              lunch: false,
              spot: false,
              dinner: false
            }
          });
        }

        currentPlanState = {
          transportMode: isFlightMode ? "flight" : "ktx",
          transportPriceSource: isFlightMode
            ? (selectedFlightPackage.outbound.source !== "mock-estimate" && (!selectedFlightPackage.returnFlight || selectedFlightPackage.returnFlight.source !== "mock-estimate") ? "api" : "estimated")
            : ((KTX_ROUTES_DB[`${depart}-${arrival}`] || KTX_ROUTES_DB[`${arrival}-${depart}`]) ? "estimated" : "unknown"),
          depart,
          arrival,
          destinationCity: destinationDataKey,
          dataAvailability: apiData.availability,
          departTime,
          arrivalTime,
          arrivalTimeDisplay,
          arrivalDayOffset,
          returnTime,
          startDate: startDateValue,
          endDate: endDateValue,
          duration,
          nights: Math.max(0, duration - 1),
          budget,
          ktxTotal,
          flightTotal,
          departAirport: isFlightMode ? depart : "",
          arrivalAirport: isFlightMode ? "CJU" : "",
          outboundFlight: selectedFlightPackage?.outbound || null,
          returnFlight: selectedFlightPackage?.returnFlight || null,
          selectedFlightPackage,
          adults,
          tripType: flightTripType,
          cabinClass: isFlightMode ? document.getElementById("flightCabinClass").value : "",
          flightSelectionMode: isFlightMode ? document.getElementById("flightSelectionMode").value : "",
          flightDirection: isFlightMode ? document.querySelector('input[name="flightDirection"]:checked').value : "",
          originAirport: selectedFlightPackage?.outbound.origin || "",
          destinationAirport: selectedFlightPackage?.outbound.destination || "",
          outboundDepartureTime: isFlightMode ? departTime : "",
          outboundFlightDuration: selectedFlightPackage?.outbound.durationMinutes || 0,
          outboundLandingTime: selectedFlightPackage ? formatFlightTime(selectedFlightPackage.outbound.arrivalTime) : "",
          firstDayActivityStartTime: isFlightMode ? calculateActivityStartTime(formatFlightTime(selectedFlightPackage.outbound.arrivalTime), document.getElementById("jejuTransport").value) : "",
          returnDepartureTime: isFlightMode ? returnTime : "",
          returnAirportArrivalTime: isFlightMode ? calculateReturnAirportArrivalTime(returnTime, accessibility) : "",
          lastDayActivityEndTime: isFlightMode ? calculateLastDayActivityEndTime(returnTime, accessibility) : "",
          jejuTransport: isFlightMode ? document.getElementById("jejuTransport").value : "",
          jejuTheme: isFlightMode ? document.getElementById("jejuTheme").value : "",
          rentalCarEstimate: isFlightMode && document.getElementById("jejuTransport").value === "rental" ? nights * 65000 : 0,
          accessibility,
          routingInfo: routing,
          travelBudget: budget, origin: depart, tripType: duration === 1 ? "dayTrip" : "roundtrip", localTransportPreference: withTripPreferences.localTransportPreference, preferenceProfile, candidateDestinations: retainedCandidates, selectedDestination: destinationDataKey, mustVisitPlaces: retainedMustVisits, mustVisitDestination: retainedMustVisits.length ? destinationDataKey : null, rawSpotCandidates, prunedPlaces: placePruning.removed, candidatePlaces: [...spots, ...meals.lunch, ...meals.dinner], selectedPlaces: daysData.flatMap(day => Object.values(day.selections).filter(Boolean)), routeSegments: [], intercityTransportCost: ktxTotal || flightTotal, localTransportCost: null, foodCost: 0, activityCost: 0, otherCost: null, estimatedTotalCost: null, remainingBudget: null,
          daysData
        };
        recalculateLiveBudget();
        directSearchState = { meals: {} };
        renderMustVisitPanel();
        renderDataSourceNotice(apiData.availability);

        document.getElementById("advancedPlannerSettings")?.removeAttribute("open");
      document.getElementById("placeholderView").classList.add("hidden");
        document.getElementById("resultDashboard").classList.remove("hidden");

        if (isFlightMode) {
          renderFlightTicketCard(selectedFlightPackage, adults, flightTripType);
          updateFlightSummaryFromFlights(selectedFlightPackage.outbound, selectedFlightPackage.returnFlight);
          renderFlightResults(currentFlightPackages);
        } else {
          document.getElementById("flightResultsSection").classList.add("hidden");
          renderKtxTicketCard(routing, depart, arrival, departTime, arrivalTimeDisplay, returnTime, ktxTotal);
        }

        document.getElementById("tripSummaryTitle").innerText = `${destinationDataKey} ${formatTripDuration(duration)} 여행`;
        document.getElementById("travelDateRange").innerText =
          `${formatDateLabel(startDateValue)} ~ ${formatDateLabel(endDateValue)} · ${currentPlanState.depart} 출발 → ${currentPlanState.arrival} 도착`;

        const sBadge = document.getElementById("seasonBadge");
        sBadge.className = `text-xs px-2.5 py-0.5 rounded-full font-bold ${season.badgeClass}`;
        sBadge.innerHTML = `<i class="fa-solid ${season.icon} mr-1"></i>${season.desc}`;

        await showGenerationStage("방문 순서와 현지 이동비·예상 비용을 계산하고 있습니다");
        renderAllTimelineCards();
        recalculateLiveBudget();
        await automaticallyChooseNearbyRestaurants();
        const generatedBudget = recalculateLiveBudget({ render: true });
        if (generatedBudget.feasibilityStatus === "overBudget" || generatedBudget.feasibilityStatus === "tight") rebuildPlanForBudget();

      } catch (err) {
        console.error("일정 생성 실패", err?.name || "Error");
        const badge = document.getElementById("apiStatusBadge");
        badge.className = "flex items-center gap-2 text-xs bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full font-semibold border border-rose-200";
        document.getElementById("apiStatusText").innerText = "일정 생성에 실패했습니다";
        alert("일정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.\n일부 API 정보를 불러오지 못해 일정 생성을 완료할 수 없습니다.");
      } finally {
        generateBtn.disabled = false;
        generateBtn.classList.remove("opacity-70", "cursor-wait");
        generateBtn.innerHTML = originalBtnHtml;
      }
    }

    // 2. KTX 승차권 렌더링
    function renderKtxTicketCard(routing, depart, arrival, departTime, arrivalTime, returnTime, ktxTotal) {
      document.getElementById("transportTicketCard").className = "bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-5 shadow-sm space-y-3";
      document.getElementById("transportCostLabel").innerText = "철도 운임";
      document.getElementById("transferGuideBanner").innerHTML = `<i class="fa-solid fa-wheelchair text-amber-300 text-xs mt-0.5"></i><div><strong class="text-amber-200">서울역 휠체어 환승 안내:</strong> 경부선 승강장 하차 후 2층 맞이방 엘리베이터를 이용해 강릉선(경강선) 승강장으로 이동합니다. (환승 여유시간 최소 20분 권장)</div>`;
      document.getElementById("trainTypeBadge").innerText = routing.train;
      document.getElementById("ktxTotalFare").innerText = "왕복 예상 " + ktxTotal.toLocaleString() + "원";

      const routeNatureBadge = document.getElementById("routeNatureBadge");
      const goingBadge = document.getElementById("goingTransferBadge");
      const returnBadge = document.getElementById("returnTransferBadge");
      const goingSub = document.getElementById("goingSubLegs");
      const returnSub = document.getElementById("returnSubLegs");
      const guideBanner = document.getElementById("transferGuideBanner");

      if (routing.isTransfer) {
        routeNatureBadge.innerText = `${routing.transferStation} 환승 · 예상 운임`;
        goingBadge.classList.remove("hidden");
        returnBadge.classList.remove("hidden");
        guideBanner.classList.remove("hidden");

        document.getElementById("goingRoute").innerText = `${depart}역 ➔ [${routing.transferStation}] ➔ ${arrival}역`;
        document.getElementById("goingTimeInfo").innerText = `${departTime} 출발 → ${arrivalTime} 도착 (총 ${routing.duration})`;

        goingSub.classList.remove("hidden");
        goingSub.innerHTML = `
          <div>1구간: ${routing.leg1.name} (${routing.leg1.duration})</div>
          <div class="text-amber-200">환승: ${routing.transferInfo.station} (${routing.transferInfo.wait})</div>
          <div>2구간: ${routing.leg2.name} (${routing.leg2.duration})</div>
        `;

        document.getElementById("returnRoute").innerText = `${arrival}역 ➔ [${routing.transferStation}] ➔ ${depart}역`;
        document.getElementById("returnTimeInfo").innerText = `${returnTime} 출발 (총 ${routing.duration})`;

        returnSub.classList.remove("hidden");
        returnSub.innerHTML = `
          <div>1구간: ${arrival}역 ➔ ${routing.transferStation} (약 1시간 50분)</div>
          <div class="text-amber-200">환승: ${routing.transferStation} (${routing.transferInfo.wait})</div>
          <div>2구간: ${routing.transferStation} ➔ ${depart}역 (${routing.leg1.duration})</div>
        `;
      } else {
        routeNatureBadge.innerText = "직통 왕복 · 예상 운임";
        goingBadge.classList.add("hidden");
        returnBadge.classList.add("hidden");
        guideBanner.classList.add("hidden");
        goingSub.classList.add("hidden");
        returnSub.classList.add("hidden");

        document.getElementById("goingRoute").innerText = `${depart}역 ➔ ${arrival}역 (직통)`;
        document.getElementById("goingTimeInfo").innerText = `${departTime} 출발 → ${arrivalTime} 도착 (소요: ${routing.duration})`;
        document.getElementById("returnRoute").innerText = `${arrival}역 ➔ ${depart}역 (직통)`;
        document.getElementById("returnTimeInfo").innerText = `${returnTime} 탑승 (소요: ${routing.duration})`;
      }
    }

    function renderFlightTicketCard(packageItem, adults, tripType) {
      const going = packageItem.outbound;
      const back = packageItem.returnFlight;
      document.getElementById("transportTicketCard").className = "bg-gradient-to-r from-sky-600 to-blue-800 text-white rounded-2xl p-5 shadow-sm space-y-3";
      document.getElementById("transportCostLabel").innerText = "항공권";
      document.getElementById("trainTypeBadge").innerText = "FLIGHT";
      const hasApiPrice = going.source !== "mock-estimate" && (!back || back.source !== "mock-estimate");
      document.getElementById("routeNatureBadge").innerText = `${tripType === "oneway" ? "편도" : "왕복"} · ${adults}인 · ${hasApiPrice ? "항공 API 조회" : "예상 요금"}`;
      document.getElementById("ktxTotalFare").innerText = `총 ${packageItem.total.toLocaleString()}원`;
      document.getElementById("goingTransferBadge").classList.add("hidden");
      document.getElementById("returnTransferBadge").classList.add("hidden");
      document.getElementById("goingRoute").innerText = `${going.origin} ➔ ${going.destination} · ${going.airline}`;
      document.getElementById("goingTimeInfo").innerText = `${formatFlightTime(going.departureTime)} 출발 → ${formatFlightTime(going.arrivalTime)} 도착 · 예상 비행시간 ${going.durationMinutes}분 · ${going.stops ? `${going.stops}회 경유` : "직항"}`;
      document.getElementById("goingSubLegs").classList.remove("hidden");
      document.getElementById("goingSubLegs").innerText = `1인 예상 ${going.price.toLocaleString()}원 · ${going.priceDescription}`;
      document.getElementById("returnSubLegs").classList.toggle("hidden", !back);
      document.getElementById("returnRoute").innerText = back ? `${back.origin} ➔ ${back.destination} · ${back.airline}` : "편도 일정";
      document.getElementById("returnTimeInfo").innerText = back ? `${formatFlightTime(back.departureTime)} 출발 → ${formatFlightTime(back.arrivalTime)} 도착 · 예상 비행시간 ${back.durationMinutes}분 · 직항` : "오는 편이 선택되지 않았습니다.";
      if (back) document.getElementById("returnSubLegs").innerText = `1인 예상 ${back.price.toLocaleString()}원 · ${back.priceDescription}`;
      const banner = document.getElementById("transferGuideBanner");
      banner.classList.remove("hidden");
      banner.innerHTML = `<i class="fa-solid fa-circle-info text-amber-300 mt-0.5"></i><div><strong class="text-amber-200">항공권 안내:</strong> ${hasApiPrice ? "조회된 항공 API 요금이며 구매 전에 항공사·예약처에서 다시 확인해 주세요." : "표시 금액은 예상 가격이며 실제 항공권 가격이 아닙니다."} 공항 이동·탑승 수속 시간을 충분히 확보해 주세요.</div>`;
    }

    // Budget Engine calculations are imported from js/budget.js.
    function updateBudgetUI(result) {
      currentPlanState.estimatedTotalCost = result.totalCost;
      currentPlanState.expectedTotal = result.expectedTotal;
      currentPlanState.safeTotal = result.safeTotal;
      currentPlanState.remainingBudget = result.remainingBudget;
      currentPlanState.expectedRemaining = result.expectedRemaining;
      currentPlanState.safeRemaining = result.safeRemaining;
      currentPlanState.uncertaintyBuffer = result.uncertaintyBuffer;
      currentPlanState.feasibilityStatus = result.feasibilityStatus;
      currentPlanState.budgetStatus = result.budgetStatus;
      currentPlanState.costSources = result.priceSource;
      const el = id => document.getElementById(id);
      const foodMin = result.foodMin ?? result.costs.foodCost ?? 0;
      const foodMax = result.foodMax ?? result.costs.foodCost ?? 0;
      const transport = result.costs.intercityTransportCost ?? 0;
      const local = result.costs.localTransportCost ?? 0;
      const activities = result.costs.activityCost ?? 0;
      el("displayBudget").innerText = result.budget === null ? "가격 정보 확인 필요" : `${result.budget.toLocaleString()}원`;
      el("displaySpend").innerText = result.totalCost === null ? `계산 가능한 비용 ${result.knownSubtotal.toLocaleString()}원 · 일부 비용 확인 필요` : `${result.totalCost.toLocaleString()}원`;
      const safetySummary = el("safetyBudgetSummary");
      if (safetySummary) {
        safetySummary.textContent = result.totalCost === null
          ? `계산된 예비비 ${result.uncertaintyBuffer.toLocaleString()}원 · 총액·안전 잔액은 ${result.unknownCosts.length}개 항목의 가격 확인 후 계산합니다.`
          : `예상 지출 ${result.expectedTotal.toLocaleString()}원 · 변동 대비 예비비 ${result.uncertaintyBuffer.toLocaleString()}원 · 안전 예산 ${result.safeTotal.toLocaleString()}원 · 안전 잔액 ${result.safeRemaining === null ? "확인 필요" : `${result.safeRemaining.toLocaleString()}원`}`;
      }
      const liveBudget = el("liveBudgetAmount"), liveSpend = el("liveSpendAmount"), liveRemaining = el("liveRemainingAmount");
      if (liveBudget) liveBudget.textContent = result.budget === null ? "확인 필요" : `${result.budget.toLocaleString()}원`;
      if (liveSpend) liveSpend.textContent = result.totalCost === null ? `계산 가능한 비용 ${result.knownSubtotal.toLocaleString()}원 · 일부 확인 필요` : `${result.totalCost.toLocaleString()}원${result.budgetStatus === "overBudget" ? ` · ${Math.abs(result.remainingBudget ?? (result.budget - result.knownSubtotal)).toLocaleString()}원 초과` : ""}`;
      if (liveRemaining) liveRemaining.textContent = result.remainingBudget === null ? (result.budgetStatus === "overBudget" && result.budget !== null ? `${Math.max(0, result.knownSubtotal - result.budget).toLocaleString()}원 이상 초과 · 비용 확인 필요` : "비용 확인 필요") : result.remainingBudget < 0 ? `${Math.abs(result.remainingBudget).toLocaleString()}원 초과` : `${result.remainingBudget.toLocaleString()}원`;
      const rebuildButton = el("rebuildBudgetButton");
      if (rebuildButton) { rebuildButton.classList.toggle("hidden", result.feasibilityStatus !== "overBudget" && result.feasibilityStatus !== "tight"); rebuildButton.textContent = `${(result.budget || 0).toLocaleString()}원에 맞춰 다시 짜기`; }
      const label = el("balanceSummaryLabel"), card = el("balanceSummaryCard"), balance = result.remainingBudget;
      if (balance === null) {
        const knownOver = result.budget !== null && result.knownSubtotal > result.budget;
        label.innerText = knownOver ? "계산 가능한 비용 기준 예산 초과" : "남는 예산";
        el("displayBalance").innerText = knownOver ? `${(result.knownSubtotal - result.budget).toLocaleString()}원 이상 초과 · 일부 비용 확인 필요` : "가격 정보 확인 필요";
        card.className = `${knownOver ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"} p-3 rounded-xl border min-w-0`;
        label.className = `text-[11px] ${knownOver ? "text-rose-700" : "text-amber-700"} block font-medium`;
        el("displayBalance").className = `text-base font-bold ${knownOver ? "text-rose-700" : "text-amber-700"} block break-words`;
      } else {
        label.innerText = balance < 0 ? "예산 초과" : "남는 예산";
        el("displayBalance").innerText = balance < 0 ? `${Math.abs(balance).toLocaleString()}원 초과` : `${balance.toLocaleString()}원`;
        const amber = result.budgetStatus === "nearLimit";
        card.className = `p-3 rounded-xl border min-w-0 ${balance < 0 ? "bg-rose-50 border-rose-100" : amber ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"}`;
        label.className = `text-[11px] block font-medium ${balance < 0 ? "text-rose-700" : amber ? "text-amber-700" : "text-emerald-700"}`;
        el("displayBalance").className = `text-base font-bold block break-words ${balance < 0 ? "text-rose-700" : amber ? "text-amber-700" : "text-emerald-700"}`;
      }
      const sum = Math.max(0, result.knownSubtotal), share = value => `${sum ? Math.max(0, value) / sum * 100 : 0}%`;
      el("barKtx").style.width = share(transport + local); el("barFood").style.width = share(foodMax); el("barTicket").style.width = share(activities);
      el("transportCostLabel").innerText = currentPlanState.transportMode === "flight" ? "항공권·제주 이동" : "철도 운임";
      const transportSource = result.priceSource.intercityTransportCost;
      const transportPrefix = transportSource === "api" ? "조회 운임 " : transportSource === "estimated" ? "노선표 기준 예상 " : "";
      el("ktxCostText").innerText = result.costs.intercityTransportCost === null ? "가격 정보 확인 필요" : `${transportPrefix}${transport.toLocaleString()}원${local !== null ? ` + 현지 이동 ${local.toLocaleString()}원` : ""}`;
      const foodPrefix = result.priceSource.foodCost === "api" ? "조회 식비 " : "예상 식비 ";
      el("foodCostText").innerText = result.costs.foodCost === null ? "가격 정보 확인 필요" : `${foodPrefix}${result.costs.foodCost.toLocaleString()}원${result.priceSource.foodCost === "estimated" ? " · 카테고리 통계 추정" : ""}`;
      el("ticketCostText").innerText = result.priceSource.activityCost === "unknown" ? "가격 정보 확인 필요" : result.priceSource.activityCost === "api" ? `확인된 입장료 ${activities.toLocaleString()}원` : `예상 입장료 ${activities.toLocaleString()}원`;
      const statuses = { withinBudget: ["예산 여유 있음", "bg-emerald-100 text-emerald-700"], nearLimit: ["예산이 조금 빠듯해요", "bg-amber-100 text-amber-800"], overBudget: ["예상비용 예산 초과", "bg-rose-100 text-rose-700"], unknown: ["일부 비용 확인 필요", "bg-slate-100 text-slate-700"] };
      const [text, color] = statuses[result.budgetStatus]; el("budgetStatusBadge").className = `text-xs px-2.5 py-0.5 rounded-full font-bold ${color}`; el("budgetStatusBadge").innerText = text;
    }

    function recalculateBudget() {
      const days = Array.isArray(currentPlanState.daysData) ? currentPlanState.daysData : [];
      let food = 0, foodMin = 0, foodMax = 0, activity = 0, foodUnknown = false, activityUnknown = false;
      for (const day of days) {
        for (const key of ["lunch", "dinner"]) {
          const isScheduled = key === "lunch" ? day?.schedule?.showLunch : day?.schedule?.showDinner;
          let item = day?.selections?.[key];
          if (isScheduled && (!item || item.priceSource === "unknown" || normalizeCost(item.cost) === null)) {
            item = chooseMealForBudget(day?.options?.[key] || [], key, day?.selections?.spot ? routePoint(day.selections.spot) : null);
            if (item && day.selections) day.selections[key] = item;
          }
          if (!item) { if (isScheduled) foodUnknown = true; continue; }
          if (item.priceSource !== "api" && item.priceSource !== "user") {
            item = { ...item, ...estimateMealDetails(item, key, { travelBudget: currentPlanState.travelBudget ?? currentPlanState.budget, region: currentPlanState.destinationCity }) };
            day.selections[key] = item;
            const option = day.options?.[key]?.find(candidate => candidate.id === item.id);
            if (option) Object.assign(option, item);
            if (day.selectedRestaurant?.id === item.id) day.selectedRestaurant = item;
          }
          const amount = item.priceSource === "unknown" ? null : normalizeCost(item.cost);
          if (amount === null) { foodUnknown = true; continue; }
          food += amount; foodMin += normalizeCost(item.priceMin) ?? amount; foodMax += normalizeCost(item.priceMax) ?? amount;
        }
        const spot = day?.selections?.spot;
        if (spot) { const amount = spot.priceSource === "unknown" ? null : normalizeCost(spot.cost); if (amount === null) activityUnknown = true; else activity += amount; }
      }
      const scheduledSpotIds = new Set(days.map(day => day?.selections?.spot?.id).filter(Boolean));
      for (const spot of currentPlanState.mustVisitPlaces || []) {
        if (scheduledSpotIds.has(spot.id)) continue;
        const amount = spot.priceSource === "unknown" ? null : normalizeCost(spot.cost);
        if (amount === null) activityUnknown = true; else activity += amount;
      }
      const flight = currentPlanState.transportMode === "flight";
      const intercityRaw = normalizeCost(flight ? currentPlanState.flightTotal : currentPlanState.ktxTotal);
      const intercitySource = flight ? (currentPlanState.flightPriceSource || currentPlanState.transportPriceSource) : currentPlanState.transportPriceSource;
      const intercity = intercitySource === "unknown" ? null : intercityRaw;
      const hasRouteSegments = Array.isArray(currentPlanState.routeSegments) && currentPlanState.routeSegments.length > 0;
      const local = hasRouteSegments ? normalizeCost(currentPlanState.localTransportCost) : (flight && normalizeCost(currentPlanState.rentalCarEstimate) > 0 ? normalizeCost(currentPlanState.rentalCarEstimate) : null);
      const selectedMeals = days.flatMap(day => [day?.selections?.lunch, day?.selections?.dinner].filter(Boolean));
      const hasSelectedSpot = days.some(day => Boolean(day?.selections?.spot)) || (currentPlanState.mustVisitPlaces || []).length > 0;
      const expectedMealCount = days.reduce((sum, day) => sum + (day?.schedule?.showLunch ? 1 : 0) + (day?.schedule?.showDinner ? 1 : 0), 0);
      const foodCost = foodUnknown || selectedMeals.length < expectedMealCount ? null : food;
      const activityCost = activityUnknown ? null : activity;
      const otherCost = normalizeCost(currentPlanState.otherCost);
      const sources = selectedMeals.map(item => item.priceSource || "unknown");
      const foodSource = foodCost === null ? "unknown" : sources.every(source => source === "api") ? "api" : sources.every(source => source === "user") ? "user" : "estimated";
      const result = calculateTripBudget({ travelBudget: currentPlanState.travelBudget ?? currentPlanState.budget,
        intercityTransportCost: intercity, localTransportCost: local, foodCost, activityCost, otherCost,
        priceSource: { intercityTransportCost: intercity === null ? "unknown" : (intercitySource || "estimated"), localTransportCost: local === null ? "unknown" : (currentPlanState.routeSegments.every(segment => segment.costSource === "user") ? "user" : "estimated"), foodCost: foodSource, activityCost: activityCost === null ? "unknown" : (hasSelectedSpot ? "estimated" : "user"), otherCost: otherCost === null ? "unknown" : "user" } });
      result.foodMin = foodUnknown ? null : foodMin; result.foodMax = foodUnknown ? null : foodMax;
      currentPlanState.intercityTransportCost = intercity; currentPlanState.localTransportCost = local;
      currentPlanState.foodCost = foodCost; currentPlanState.activityCost = activityCost; currentPlanState.otherCost = otherCost;
      currentPlanState.selectedPlaces = days.flatMap(day => Object.values(day.selections || {}).filter(Boolean));
      updateBudgetUI(result);
      const budgetFirstView = document.getElementById("budgetFirstView");
      if (budgetFirstView && !budgetFirstView.classList.contains("hidden")) renderBudgetDestinationCandidates();
      return result;
    }

    function routePoint(place) {
      const lng = Number(place?.mapx), lat = Number(place?.mapy);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0
        ? { ...place, lat, lng } : { ...place, lat: null, lng: null };
    }

    function routeDistance(a, b) {
      if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lng) || !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)) return null;
      return getDistanceKm(a.lat, a.lng, b.lat, b.lng);
    }

    function optimizeRouteOrder(start, places, end = start) {
      const located = places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
      const unlocated = places.filter(place => !Number.isFinite(place.lat) || !Number.isFinite(place.lng));
      let remaining = [...located], ordered = [];
      let current = Number.isFinite(start?.lat) ? start : remaining.shift() || null;
      if (!Number.isFinite(start?.lat) && current) ordered.push(current);
      while (remaining.length) {
        let bestIndex = 0, bestDistance = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const distance = routeDistance(current, remaining[i]);
          if (distance !== null && distance < bestDistance) { bestDistance = distance; bestIndex = i; }
        }
        const [next] = remaining.splice(bestIndex, 1); ordered.push(next); current = next;
      }
      const route = [start, ...ordered, end];
      const total = points => points.slice(1).reduce((sum, point, index) => sum + (routeDistance(points[index], point) ?? NaN), 0);
      const fullyLocated = route.every(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng));
      if (fullyLocated) {
        let improved = true, rounds = 0;
        while (improved && rounds++ < 20) {
          improved = false;
          for (let i = 1; i < route.length - 2; i++) for (let j = i + 1; j < route.length - 1; j++) {
            const before = routeDistance(route[i - 1], route[i]) + routeDistance(route[j], route[j + 1]);
            const after = routeDistance(route[i - 1], route[j]) + routeDistance(route[i], route[j + 1]);
            if (after + 0.0001 < before) { route.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse()); improved = true; }
          }
        }
      }
      let optimized = route.slice(1, -1).filter(place => Number.isFinite(place.lat));
      const original = [start, ...located, end];
      const complete = !unlocated.length && original.every(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng));
      const initialDistanceKm = complete ? total(original) : null;
      let optimizedDistanceKm = complete && route.every(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) ? total(route) : null;
      if (initialDistanceKm !== null && optimizedDistanceKm !== null && optimizedDistanceKm > initialDistanceKm + 0.0001) {
        optimized = located;
        optimizedDistanceKm = initialDistanceKm;
      }
      return { ordered: [...optimized, ...unlocated], initialDistanceKm, optimizedDistanceKm };
    }

    function clusterRoutePlaces(places, radiusKm = 8) {
      const located = places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
      const parent = located.map((_, index) => index);
      const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
      const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
      for (let i = 0; i < located.length; i++) for (let j = i + 1; j < located.length; j++) {
        const distance = routeDistance(located[i], located[j]); if (distance !== null && distance <= radiusKm) join(i, j);
      }
      const groups = new Map();
      located.forEach((place, index) => { const key = find(index); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(place); });
      return [...groups.values()].map((items, index) => ({ id: `cluster-${index + 1}`, radiusKm, stopIds: items.map(item => item.id), places: items.map(item => item.name), center: { lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length, lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length } }));
    }

    function selectedRoutePlaces() {
      const mandatory = currentPlanState.mustVisitPlaces || [];
      const scheduled = (currentPlanState.daysData || []).flatMap(day => Object.values(day.selections || {}).filter(Boolean));
      const all = [...scheduled, ...mandatory.map(place => ({ ...place, mustVisit: true }))];
      const mustIds = new Set(mandatory.map(place => place.id));
      return all.filter((place, index) => all.findIndex(item => item.id === place.id) === index).map(place => routePoint({ ...place, mustVisit: mustIds.has(place.id) || Boolean(place.mustVisit) }));
    }

    function calculateRoutePlan() {
      const city = currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival);
      const stationData = DESTINATION_COORDS[city] || null;
      const station = routePoint({ id: "route-origin-station", name: stationData?.label || `${city}역`, mapx: stationData?.lng, mapy: stationData?.lat, kind: "station" });
      const places = selectedRoutePlaces();
      if (!places.length) return { stops: [], segments: [], clusters: [], initialDistanceKm: null, optimizedDistanceKm: null, localTransportCost: null };
      const order = optimizeRouteOrder(station, places, station);
      const orderedStops = [station, ...order.ordered, { ...station, id: "route-return-station", kind: "returnStation" }];
      const segments = orderedStops.slice(1).map((to, index) => {
        const from = orderedStops[index], distance = routeDistance(from, to);
        const movement = routeModeForPreference(currentPlanState.localTransportPreference, distance);
        const walking = movement.mode === "walk";
        return { id: `segment-${index + 1}`, from: from.name, to: to.name, fromPlace: from, toPlace: to,
          distance, distanceUnit: "km", distanceSource: distance === null ? "unknown" : "straightLine", duration: null, durationUnit: "minutes", durationSource: "unknown",
          transportMode: movement.mode, transportModeSource: movement.source, preferredTransportMode: currentPlanState.localTransportPreference,
          transportCost: walking ? 0 : null, costSource: walking ? "user" : "unknown" };
      });
      const localTransportCost = segments.length && segments.every(segment => Number.isFinite(segment.transportCost))
        ? segments.reduce((sum, segment) => sum + segment.transportCost, 0) : null;
      return { stops: orderedStops, segments, clusters: clusterRoutePlaces(order.ordered), initialDistanceKm: order.initialDistanceKm, optimizedDistanceKm: order.optimizedDistanceKm, localTransportCost };
    }

    function renderRouteMap(stops) {
      const host = document.getElementById("routeCoordinateMap"); if (!host) return;
      if (!stops.length) { host.innerHTML = `<p class="p-4 text-xs text-slate-500">아직 일정 장소가 없습니다. 관광지나 음식점을 선택하면 방문 순서와 지도를 표시합니다.</p>`; return; }
      const routePoints = stops.filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
      const points = routePoints.filter(stop => stop.kind !== "returnStation");
      if (!points.length) { host.innerHTML = `<p class="p-4 text-xs text-slate-500">표시할 좌표가 없습니다. 장소 일정은 유지되며 각 장소의 Kakao 지도를 열 수 있습니다.</p>`; return; }
      const width = 640, height = 240, pad = 38;
      const lons = routePoints.map(point => point.lng), lats = routePoints.map(point => point.lat);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const lonSpan = Math.max(maxLon - minLon, 0.01), latSpan = Math.max(maxLat - minLat, 0.01);
      const project = point => ({ x: pad + (point.lng - minLon) / lonSpan * (width - pad * 2), y: height - pad - (point.lat - minLat) / latSpan * (height - pad * 2) });
      const coords = routePoints.map(project), path = coords.map(point => `${point.x},${point.y}`).join(" ");
      host.innerHTML = `<p class="px-3 pt-2 text-[10px] text-slate-500">좌표 기반 직선 연결이며 실제 도로 경로가 아닙니다.</p><svg viewBox="0 0 ${width} ${height}" class="w-full" role="img" aria-label="방문 순서 지도"><polyline points="${path}" fill="none" stroke="#6366f1" stroke-width="3" stroke-dasharray="7 6"/>${points.map(stop => { const point = project(stop), order = stop.kind === "station" ? 1 : routePoints.filter(item => item.kind !== "returnStation").indexOf(stop) + 1; return `<circle cx="${point.x}" cy="${point.y}" r="14" fill="${stop.kind === "station" ? "#0f172a" : "#4f46e5"}"/><text x="${point.x}" y="${point.y + 4}" text-anchor="middle" fill="white" font-size="11" font-weight="700">${order}</text><text x="${point.x}" y="${point.y + 27}" text-anchor="middle" fill="#334155" font-size="10">${escapeHtml(stop.name.slice(0, 12))}</text>`; }).join("")}</svg>`;
    }

    function updateRouteUI(route) {
      currentPlanState.routeStops = route.stops;
      currentPlanState.routeSegments = route.segments;
      currentPlanState.routeClusters = route.clusters;
      currentPlanState.initialRouteDistanceKm = route.initialDistanceKm;
      currentPlanState.optimizedRouteDistanceKm = route.optimizedDistanceKm;
      currentPlanState.localTransportCost = route.localTransportCost;
      const notice = document.getElementById("routeMovementNotice");
      if (notice) notice.textContent = currentPlanState.localTransportPreference === "auto"
        ? "자동 제안: 직선거리 1km 이하는 도보, 그 외는 대중교통입니다. 시간·요금은 확인되지 않았습니다."
        : "거리만 좌표의 직선거리로 계산했습니다. 이동시간과 대중교통·택시 요금은 확인되지 않았습니다.";
      const summary = document.getElementById("routeDistanceSummary");
      if (summary) summary.textContent = route.optimizedDistanceKm === null ? "총 거리 확인 필요" : `직선거리 합 ${route.optimizedDistanceKm.toFixed(1)}km${route.initialDistanceKm !== null && route.initialDistanceKm - route.optimizedDistanceKm > 0.05 ? ` · 순서 최적화 ${ (route.initialDistanceKm - route.optimizedDistanceKm).toFixed(1)}km 감소` : ""}`;
      const durationSummary = document.getElementById("routeDurationSummary");
      const knownDurations = route.segments.map(segment => normalizeCost(segment.duration));
      const totalDuration = knownDurations.length && knownDurations.every(value => value !== null) ? knownDurations.reduce((sum, value) => sum + value, 0) : null;
      currentPlanState.localTravelDurationMinutes = totalDuration;
      if (durationSummary) durationSummary.textContent = totalDuration === null ? "현지 총 이동시간 확인 필요" : `현지 이동 약 ${totalDuration}분`;
      const clusters = document.getElementById("routeClusterSummary");
      if (clusters) clusters.innerHTML = route.clusters.filter(cluster => cluster.places.length > 1).map(cluster => `<span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">묶음 ${cluster.id.replace("cluster-", "")} · ${cluster.places.length}곳</span>`).join("") || `<span class="text-[10px] text-slate-500">좌표 기준 8km 이내 묶음 없음</span>`;
      renderRouteMap(route.stops);
      renderReachableCandidates();
      const list = document.getElementById("routeSegmentList"); if (!list) return;
      list.innerHTML = route.segments.length ? route.segments.map(segment => {
        const mode = { walk: "🚶 도보", publicTransit: "🚌 대중교통", taxi: "🚕 택시", unknown: "이동수단 확인 필요" }[segment.transportMode] || "이동수단 확인 필요";
        const distance = segment.distance === null ? "직선거리 확인 필요" : `직선거리 ${segment.distance.toFixed(1)}km`;
        const duration = segment.duration === null ? "이동시간 확인 필요" : `약 ${segment.duration}분`;
        const cost = segment.transportCost === null ? "요금 확인 필요" : segment.transportCost === 0 ? "0원 (도보)" : `${segment.transportCost.toLocaleString()}원`;
        const link = segment.toPlace?.kind === "station" || segment.toPlace?.kind === "returnStation" ? "" : `<a class="text-indigo-700 underline" target="_blank" rel="noopener noreferrer" href="${getItemDeepLinks(segment.toPlace).kakaoMap}">Kakao 지도</a>`;
        return `<li class="rounded-xl border border-slate-200 p-3"><div class="flex flex-wrap items-center justify-between gap-2"><span class="text-xs font-bold text-slate-800">${escapeHtml(segment.from)} → ${escapeHtml(segment.to)}</span>${link}</div><p class="mt-1 text-[11px] text-slate-600">${mode} · ${distance} · ${duration} · ${cost}</p></li>`;
      }).join("") : `<li class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">표시할 이동 구간이 없습니다.</li>`;
    }

    function recalculateRoute() {
      try {
        const route = calculateRoutePlan();
        updateRouteUI(route);
        return route;
      } catch (error) {
        const places = selectedRoutePlaces();
        const segments = places.slice(1).map((place, index) => ({ id: `segment-fallback-${index}`, from: places[index].name, to: place.name, fromPlace: places[index], toPlace: place, distance: null, duration: null, transportMode: "unknown", transportCost: null, costSource: "unknown" }));
        const fallback = { stops: places, segments, clusters: [], initialDistanceKm: null, optimizedDistanceKm: null, localTransportCost: null };
        updateRouteUI(fallback);
        console.warn("경로 일부 계산에 실패해 위치·비용 미확인 상태로 일정을 유지합니다.", error);
        return fallback;
      }
    }

    function recalculateLocalTransportCost() {
      const segments = Array.isArray(currentPlanState.routeSegments) ? currentPlanState.routeSegments : [];
      currentPlanState.localTransportCost = segments.length && segments.every(segment => Number.isFinite(segment.transportCost))
        ? segments.reduce((sum, segment) => sum + segment.transportCost, 0) : null;
      return currentPlanState.localTransportCost;
    }

    function recalculateLiveBudget(options = {}) {
      recalculateRoute();
      recalculateLocalTransportCost();
      const result = recalculateBudget();
      if (options.render) renderAllTimelineCards();
      return result;
    }

    function renderReachableCandidates() {
      const host = document.getElementById("reachableCandidatesPanel");
      if (!host || !currentPlanState?.daysData?.length) return;
      const selected = new Set(selectedRoutePlaces().map(place => place.id));
      const mustIds = new Set((currentPlanState.mustVisitPlaces || []).map(place => place.id));
      const lastStop = [...(currentPlanState.routeStops || [])].reverse().find(place => place.kind !== "station" && place.kind !== "returnStation");
      const anchor = lastStop || (currentPlanState.routeStops || [])[0];
      const preference = currentPlanState.localTransportPreference || "auto";
      const candidates = (currentPlanState.rawSpotCandidates || []).map(item => ({ ...item, ...routePoint(item) }))
        .filter(item => !selected.has(item.id) && !mustIds.has(item.id))
        .map(item => ({ item, distance: anchor ? routeDistance(anchor, routePoint(item)) : null, tags: classifyPlace(item) }))
        .filter(entry => entry.distance === null || assessStraightLineReachability(entry.distance, preference).reachable)
        .sort((a, b) => (b.item.preferenceScore || 0) - (a.item.preferenceScore || 0) || (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, 4);
      if (!candidates.length) {
        host.innerHTML = `<p class="text-xs text-slate-500">추가로 표시할 만한 가까운 장소 후보가 없습니다. 위치 정보가 확인된 장소만 거리 기준으로 안내합니다.</p>`;
        return;
      }
      host.innerHTML = `<p class="mb-2 text-[10px] text-slate-500">직선거리 기준 후보예요. 실제 이동시간과 경로는 확인된 값이 아닙니다.</p><div class="grid gap-2 sm:grid-cols-2">${candidates.map(({ item, distance }) => `<article class="rounded-lg border border-slate-200 bg-white p-3"><div class="flex items-start justify-between gap-2"><div><strong class="text-xs">${escapeHtml(item.name || "장소")}</strong><p class="mt-1 text-[10px] text-slate-500">${distance === null ? "거리 확인 필요" : `직선거리 약 ${distance.toFixed(1)}km`}</p></div><button type="button" onclick="addReachableCandidate('${String(item.id).replace(/'/g, "\\'")}')" class="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white">일정에 추가</button></div></article>`).join("")}</div>`;
    }

    function addReachableCandidate(id) {
      const place = (currentPlanState.rawSpotCandidates || []).find(item => item.id === id);
      if (!place || currentPlanState.mustVisitPlaces?.some(item => item.id === id)) return;
      let day = currentPlanState.daysData.find(entry => entry.schedule?.showSpot && !entry.selections?.spot);
      if (!day) day = currentPlanState.daysData.find(entry => entry.schedule?.showSpot);
      if (!day) return;
      if (!day.options.spot.some(item => item.id === id)) day.options.spot.unshift(place);
      day.confirmed.spot = false;
      updateSelection(day.dayNum, "spot", place);
    }

    function updateSelection(dayNum, category, item) {
      const day = currentPlanState.daysData.find(entry => entry.dayNum === dayNum);
      if (!day || !day.selections) return null;
      day.selections[category] = item || null;
      if (category === "lunch" || category === "dinner") day.selectedRestaurant = item || null;
      document.getElementById("rebuildBudgetMessage")?.classList.add("hidden");
      return recalculateLiveBudget({ render: true });
    }

    function removeSelectedSpot(dayNum) {
      const day = currentPlanState.daysData.find(entry => entry.dayNum === dayNum);
      const selected = day?.selections?.spot;
      if (!day || !selected) return;
      const mandatoryIds = new Set((currentPlanState.mustVisitPlaces || []).map(place => place.id));
      if (selected.mustVisit || mandatoryIds.has(selected.id)) return;
      updateSelection(dayNum, "spot", null);
    }

    function rebuildPlanForBudget() {
      const budget = normalizeCost(currentPlanState.travelBudget ?? currentPlanState.budget);
      const message = document.getElementById("rebuildBudgetMessage");
      if (!budget || !Array.isArray(currentPlanState.daysData)) {
        if (message) { message.textContent = "예산 또는 일정 비용을 확인할 수 없어 다시 짤 수 없습니다."; message.classList.remove("hidden"); }
        return;
      }
      const mustIds = new Set((currentPlanState.mustVisitPlaces || []).map(place => place.id));
      const mealActions = [];
      for (const day of currentPlanState.daysData) for (const category of ["lunch", "dinner"]) {
        const slotName = category === "lunch" ? "showLunch" : "showDinner";
        if (!day.schedule?.[slotName]) continue;
        const selected = day.selections[category];
        if (selected?.priceSource === "user") continue;
        const currentCost = normalizeCost(selected?.cost);
        const cheaper = (day.options[category] || []).filter(item => item.priceSource !== "unknown" && normalizeCost(item.cost) !== null && (currentCost === null || normalizeCost(item.cost) < currentCost)).sort((a, b) => normalizeCost(a.cost) - normalizeCost(b.cost))[0];
        if (cheaper) mealActions.push({ day, category, item: cheaper, saving: currentCost === null ? Infinity : currentCost - cheaper.cost });
      }
      mealActions.sort((a, b) => b.saving - a.saving);
      const spotActions = currentPlanState.daysData.filter(day => {
        const spot = day.selections.spot;
        return spot && !spot.mustVisit && !mustIds.has(spot.id);
      }).sort((a, b) => (a.selections.spot.preferenceScore || 0) - (b.selections.spot.preferenceScore || 0));
      let result = recalculateLiveBudget(), changes = 0, passes = 0;
      while ((result.safeRemaining === null || result.safeRemaining < 0) && passes < 3) {
        passes++;
        const mealAction = mealActions.find(action => action.day.selections[action.category]?.id !== action.item.id);
        if (mealAction) {
          mealAction.day.selections[mealAction.category] = mealAction.item;
          mealAction.day.selectedRestaurant = mealAction.item;
          changes++;
          result = recalculateLiveBudget();
          continue;
        }
        const day = spotActions.find(entry => entry.selections.spot);
        if (!day) break;
        const selected = day.selections.spot;
        if (!selected || selected.mustVisit || mustIds.has(selected.id)) { spotActions.splice(spotActions.indexOf(day), 1); continue; }
        const freeMatch = (day.options.spot || []).filter(item => item.id !== selected.id && !item.mustVisit && !mustIds.has(item.id) && item.priceSource !== "unknown" && normalizeCost(item.cost) === 0 && (item.preferenceScore || 0) >= (selected.preferenceScore || 0)).sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0))[0];
        day.selections.spot = freeMatch || null;
        spotActions.splice(spotActions.indexOf(day), 1);
        changes++;
        result = recalculateLiveBudget();
      }
      renderAllTimelineCards();
      if (result.safeRemaining !== null && result.safeRemaining >= 0) {
        if (message) { message.textContent = `예산 내 조정안을 만들었습니다. ${changes}개 선택을 조정했으며, 필수 방문지는 유지했습니다.`; message.classList.remove("hidden"); }
      } else if (result.totalCost !== null) {
        const minimum = result.safeTotal ?? result.totalCost;
        if (message) { message.textContent = `필수 방문지를 유지한 현재 최소 안전 예상비용은 약 ${minimum.toLocaleString()}원입니다. 예산보다 ${Math.max(0, minimum - budget).toLocaleString()}원 높아 안전 예산 안으로 조정할 수 없습니다.`; message.classList.remove("hidden"); }
      } else {
        if (message) { message.textContent = `예산 안에 들어오는지 확인할 수 없습니다. 확인 가능한 비용은 ${result.knownSubtotal.toLocaleString()}원이며, 일부 현지 운임·식비·입장료의 가격 정보를 확인해야 합니다. 필수 방문지는 유지했습니다.`; message.classList.remove("hidden"); }
      }
      return result;
    }

    function getVerifiedCandidateFare(origin, destination) {
      const route = KTX_ROUTES_DB[`${origin}-${destination}`] || KTX_ROUTES_DB[`${destination}-${origin}`];
      const oneWay = normalizeCost(route?.oneWay);
      return oneWay === null ? null : oneWay * 2;
    }

    const PREFERENCE_STEPS = [
      { key: "scenery", title: "어떤 풍경이 좋나요?", options: [{ value: "nature", label: "🌊 자연" }, { value: "urban", label: "🏙️ 도심" }] },
      { key: "focus", title: "무엇을 더 즐기고 싶나요?", options: [{ value: "food", label: "🍜 먹거리" }, { value: "sightseeing", label: "📸 볼거리" }] },
      { key: "pace", title: "여행 속도는 어떤가요?", options: [{ value: "relaxed", label: "😌 여유롭게" }, { value: "active", label: "🚶 알차게" }] },
      { key: "discovery", title: "어떤 장소가 끌리나요?", options: [{ value: "famous", label: "🏛️ 유명 관광지" }, { value: "hidden", label: "💎 숨은 명소" }] }
    ];
    const DESTINATION_PREFERENCE_TAGS = {
      "서울": ["urban", "food", "active", "famous"], "부산": ["urban", "food", "active", "famous"],
      "여수엑스포": ["nature", "sightseeing", "relaxed", "famous"], "경주": ["nature", "sightseeing", "relaxed", "famous"],
      "전주": ["urban", "food", "relaxed", "famous"], "강릉": ["nature", "food", "relaxed", "famous"],
      "동대구": ["urban", "food", "active"], "대전": ["urban", "food", "relaxed"]
    };
    const PREFERENCE_LABELS = Object.fromEntries(PREFERENCE_STEPS.flatMap(step => step.options.map(option => [option.value, option.label])));
    let preferenceStepIndex = 0;

    function renderPreferenceTree() {
      const host = document.getElementById("preferenceTree");
      if (!host) return;
      const profile = currentPlanState.preferenceProfile;
      const chosen = PREFERENCE_STEPS.filter(step => profile[step.key]).map(step => PREFERENCE_LABELS[profile[step.key]]);
      const step = PREFERENCE_STEPS[preferenceStepIndex];
      host.innerHTML = `<div class="flex items-center justify-between gap-2"><h3 class="font-bold text-slate-900">여행 취향 4가지 선택</h3><span class="text-xs text-indigo-700">${chosen.length}/4</span></div>${step
        ? `<p class="mt-2 text-sm font-semibold text-slate-700">${step.title}</p><div class="mt-3 grid grid-cols-2 gap-2">${step.options.map(option => `<button type="button" onclick="choosePreference('${option.value}')" class="rounded-xl border border-indigo-200 bg-white p-3 text-sm font-bold text-slate-800 hover:border-indigo-600 hover:bg-indigo-100">${option.label}</button>`).join("")}</div>`
        : `<p class="mt-2 text-sm font-semibold text-indigo-800">취향 선택 완료 · 아래 후보의 순서와 이유에 반영했습니다.</p><button type="button" onclick="resetPreferenceTree()" class="mt-2 text-xs font-bold text-indigo-700 underline">다시 선택</button>`}
        ${chosen.length ? `<p class="mt-3 text-xs text-slate-600">선택: ${chosen.join(" · ")}</p>` : ""}`;
    }

    function choosePreference(value) {
      const step = PREFERENCE_STEPS[preferenceStepIndex];
      if (!step || !step.options.some(option => option.value === value)) return;
      currentPlanState.preferenceProfile[step.key] = value;
      preferenceStepIndex++;
      renderPreferenceTree();
      renderBudgetDestinationCandidates();
    }

    function resetPreferenceTree() {
      for (const step of PREFERENCE_STEPS) currentPlanState.preferenceProfile[step.key] = null;
      preferenceStepIndex = 0;
      renderPreferenceTree();
      renderBudgetDestinationCandidates();
    }

    function scoreDestinationPreference(destination, profile) {
      const tags = DESTINATION_PREFERENCE_TAGS[destination] || [];
      const matches = PREFERENCE_STEPS.map(step => profile[step.key]).filter(value => value && tags.includes(value));
      return { tags, score: matches.length, reasons: matches.map(value => `${PREFERENCE_LABELS[value]} 선호와 맞아요`) };
    }

    function generateDestinationCandidates() {
      return buildDestinationCandidates({
        origin: currentPlanState.origin || "",
        travelBudget: currentPlanState.travelBudget ?? currentPlanState.budget,
        tripType: currentPlanState.tripType,
        nights: currentPlanState.nights || 0,
        allowedDestinations: DIRECT_RAIL_DESTINATIONS[currentPlanState.origin] || [],
        arrivalOptions: ARRIVAL_STATION_OPTIONS,
        getRoundTripFare: getVerifiedCandidateFare,
        scorePreference: destination => scoreDestinationPreference(destination, currentPlanState.preferenceProfile),
        estimateMeal: estimateMealDetails
      });
    }

    function renderBudgetDestinationCandidates() {
      const host = document.getElementById("budgetDestinationResults"); if (!host) return;
      const budgetInput = document.getElementById("budgetFirstInput");
      if (budgetInput && parseBudgetInput(budgetInput) === null) { host.classList.add("hidden"); currentPlanState.candidateDestinations = []; return; }
      const candidates = generateDestinationCandidates(); currentPlanState.candidateDestinations = candidates;
      if (!document.getElementById("budgetFirstView")?.classList.contains("hidden")) host.classList.remove("hidden");
      if (!candidates.length) { host.innerHTML = `<p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">현재 출발지에서 이용 가능한 여행지가 없습니다. 출발지를 바꾸거나 예산을 확인해 주세요.</p>`; return; }
      const budget = normalizeCost(currentPlanState.travelBudget ?? currentPlanState.budget);
      const displayBudget = Number.isFinite(budget) ? budget : 0;
      host.innerHTML = `<h3 class="mb-1 text-xl font-black text-slate-900">${displayBudget.toLocaleString("ko-KR")}원이면 이런 곳을 갈 수 있어요!</h3>
        <p class="mb-4 text-xs text-slate-500">왕복 교통비와 식비${currentPlanState.nights ? ", 숙박비를" : "를"} 포함한 예상이에요. 현지 이동·입장료는 일정 생성 후 확인합니다.</p>
        <div class="grid gap-3 sm:grid-cols-2">${candidates.map(item => `<article class="rounded-2xl border ${item.budgetStatus === "overBudget" ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"} p-4 shadow-sm"><div class="flex items-start justify-between gap-2"><div><p class="text-xs font-semibold text-blue-700">${item.preferenceTags.slice(0,2).map(tag => PREFERENCE_LABELS[tag]).join(" · ") || "기차로 떠나는 여행"}</p><h4 class="mt-1 text-xl font-black text-slate-900">${item.destination}</h4></div><span class="rounded-full ${item.budgetStatus === "overBudget" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"} px-2.5 py-1 text-[11px] font-bold">${item.budgetStatus === "overBudget" ? "예산 초과 예상" : "예산 안에 가능"}</span></div><div class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span class="text-slate-500">예상 여행비</span><b class="mt-1 block">약 ${item.estimatedTotalCost.toLocaleString("ko-KR")}원</b></div><div><span class="text-slate-500">예상 잔여예산</span><b class="mt-1 block ${item.remainingBudget < 0 ? "text-amber-700" : "text-emerald-700"}">${item.remainingBudget.toLocaleString("ko-KR")}원</b></div></div><p class="mt-2 text-[11px] text-slate-500">왕복 열차 ${item.intercityTransportCost.toLocaleString("ko-KR")}원 · 식비 ${item.estimatedFoodCost.toLocaleString("ko-KR")}원${item.lodgingEstimate ? ` · 숙박 약 ${item.lodgingEstimate.toLocaleString("ko-KR")}원` : ""} · 여유분 포함</p>
          ${item.preferenceTags.length ? `<p class="mt-2 text-xs text-slate-600">${item.preferenceTags.map(tag => PREFERENCE_LABELS[tag]).join(" · ")}</p>` : ""}
          ${item.recommendationReasons.length ? `<p class="mt-1 text-xs text-indigo-700">${item.recommendationReasons.join(" · ")}</p>` : ""}
          <p class="mt-2 text-xs text-slate-500">현지 교통·입장료는 일정에 따라 달라질 수 있어요.</p><button type="button" onclick="selectBudgetDestination('${item.destination}')" class="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">이곳으로 여행하기</button></article>`).join("")}</div>`;
    }
    function selectBudgetDestination(destination) {
      if (!currentPlanState.candidateDestinations.some(item => item.destination === destination)) return;
      currentPlanState.selectedDestination = destination;
      continueFromBudgetFirst(destination);
      renderMustVisitPanel();
    }

    let mustVisitSearchState = { results: [], loading: false, error: "" };

    function normalizeMustVisitPlace(item) {
      return {
        id: `kakao-spot-${item.id || `${item.x}-${item.y}`}`,
        name: item.place_name || "이름 미등록 장소",
        address: item.road_address_name || item.address_name || "",
        type: item.category_name || "Kakao 장소",
        source: "kakao", customSelected: true, mustVisit: true,
        cost: 0, priceSource: "unknown",
        mapx: item.x || "", mapy: item.y || "", kakaoUrl: item.place_url || "",
        accessibilityVerified: false,
        barrierFreeTip: "무장애 편의시설은 방문 전 확인해 주세요."
      };
    }

    function renderMustVisitPanel() {
      const chosen = document.getElementById("mustVisitSelected");
      const results = document.getElementById("mustVisitSearchResults");
      const status = document.getElementById("mustVisitSearchStatus");
      if (!chosen || !results || !status) return;
      chosen.innerHTML = currentPlanState.mustVisitPlaces.length
        ? `<p class="text-xs font-bold text-blue-800">필수 방문지</p>${currentPlanState.mustVisitPlaces.map(place => `<div class="rounded-lg border border-blue-100 bg-blue-50 p-2 text-xs"><strong>${escapeHtml(place.name)}</strong><span class="ml-2 text-slate-500">입장료 확인 필요</span></div>`).join("")}`
        : `<p class="text-xs text-slate-500">선택한 장소가 없습니다. 검색 없이 일정 만들기도 가능합니다.</p>`;
      status.textContent = mustVisitSearchState.loading ? "검색 중..." : mustVisitSearchState.error;
      const searchButton = document.getElementById("mustVisitSearchButton");
      if (searchButton) { searchButton.disabled = mustVisitSearchState.loading; searchButton.textContent = mustVisitSearchState.loading ? "검색 중" : "검색"; }
      results.innerHTML = mustVisitSearchState.results.map((item, index) => `<div class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-xs"><div class="min-w-0"><strong>${escapeHtml(item.place_name || "이름 미등록 장소")}</strong><p class="truncate text-slate-500">${escapeHtml(item.road_address_name || item.address_name || "주소 정보 없음")}</p></div><button type="button" onclick="addMustVisitPlace(${index})" class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">꼭 가기</button></div>`).join("");
    }

    async function searchMustVisitPlace() {
      if (mustVisitSearchState.loading) return;
      const query = document.getElementById("mustVisitQuery")?.value.trim() || "";
      if (!query) { mustVisitSearchState.error = "장소 이름을 입력해 주세요."; renderMustVisitPanel(); return; }
      const destination = document.getElementById("arrivalStation")?.value || currentPlanState.selectedDestination || currentPlanState.arrival;
      const city = getDestinationDataKey(destination);
      mustVisitSearchState = { results: [], loading: true, error: "" };
      renderMustVisitPanel();
      try {
        const results = await searchKakaoLocal(`${city} ${query}`);
        mustVisitSearchState.results = results;
        if (!results.length) mustVisitSearchState.error = "검색 결과가 없습니다.";
      } catch (error) {
        mustVisitSearchState.error = "장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        mustVisitSearchState.loading = false;
        renderMustVisitPanel();
      }
    }

    function addMustVisitPlace(index) {
      const raw = mustVisitSearchState.results[index];
      if (!raw) return;
      const place = normalizeMustVisitPlace(raw);
      const city = getDestinationDataKey(document.getElementById("arrivalStation")?.value || currentPlanState.selectedDestination || currentPlanState.arrival);
      if (currentPlanState.mustVisitDestination && currentPlanState.mustVisitDestination !== city) currentPlanState.mustVisitPlaces = [];
      currentPlanState.mustVisitDestination = city;
      if (!currentPlanState.mustVisitPlaces.some(item => item.id === place.id)) currentPlanState.mustVisitPlaces.push(place);
      mustVisitSearchState.results = [];
      renderMustVisitPanel();
      if (!refreshPrunedSpotCandidates()) recalculateLiveBudget({ render: true });
    }

    function placeDistanceKm(a, b) {
      const lat1 = Number(a?.mapy), lon1 = Number(a?.mapx), lat2 = Number(b?.mapy), lon2 = Number(b?.mapx);
      if (![lat1, lon1, lat2, lon2].every(Number.isFinite) || !lat1 || !lon1 || !lat2 || !lon2) return null;
      const radians = value => value * Math.PI / 180;
      const dLat = radians(lat2 - lat1), dLon = radians(lon2 - lon1);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    function classifyPlace(item) {
      const text = `${item.name || ""} ${item.type || ""} ${item.raw?.cat2 || ""}`;
      const rules = {
        nature: /해변|바다|산|숲|공원|수목원|폭포|호수|하천|섬|정원|전망/,
        urban: /도심|거리|광장|시장|타워|박물관|미술관|쇼핑/,
        food: /시장|먹거리|음식|식당|카페|커피/,
        sightseeing: /박물관|미술관|사찰|유적|궁|전망|등대|역사|기념|문화|성당|해변/,
        relaxed: /공원|정원|산책|해변|호수|카페|전망/,
        active: /등산|트레킹|체험|레저|자전거|서핑|탐방|케이블카/
      };
      return Object.keys(rules).filter(tag => rules[tag].test(text));
    }

    function prunePlaceCandidates(rawSpots, profile, mustVisitPlaces, context = {}) {
      const mandatoryIds = new Set(mustVisitPlaces.map(place => place.id));
      const all = [...mustVisitPlaces, ...rawSpots].filter((place, index, list) => list.findIndex(other => other.id === place.id) === index);
      const available = normalizeCost(context.budget) !== null && normalizeCost(context.intercityCost) !== null
        ? Math.max(0, context.budget - context.intercityCost) : null;
      const removed = [], ranked = [];
      for (const [originalIndex, place] of all.entries()) {
        const mandatory = mandatoryIds.has(place.id);
        const knownPrice = place.priceSource !== "unknown" ? normalizeCost(place.cost) : null;
        if (!mandatory && knownPrice !== null && available !== null && knownPrice > available) {
          removed.push({ place, reason: "knownPriceOverBudget" }); continue;
        }
        const tags = classifyPlace(place);
        const matches = [profile.scenery, profile.focus, profile.pace].filter(value => value && tags.includes(value));
        const distances = mustVisitPlaces.filter(item => item.id !== place.id).map(item => placeDistanceKm(place, item)).filter(value => value !== null);
        const nearestMustVisitKm = distances.length ? Math.min(...distances) : null;
        const reasons = mandatory ? ["필수 방문지"] : matches.map(value => `${PREFERENCE_LABELS[value]} 선호와 잘 맞아요`);
        if (!mandatory && nearestMustVisitKm !== null && nearestMustVisitKm <= 5) reasons.push("필수 방문지와 5km 이내예요");
        if (knownPrice === 0) reasons.push("확인된 무료 관광지예요");
        if (profile.accessibilityFirst && place.accessibilityVerified) reasons.push("무장애 편의정보가 확인됐어요");
        const score = (mandatory ? 100 : 0) + matches.length * 3 + (nearestMustVisitKm !== null && nearestMustVisitKm <= 5 ? 2 : 0) - (nearestMustVisitKm !== null && nearestMustVisitKm > 35 ? 2 : 0) + (profile.accessibilityFirst && place.accessibilityVerified ? 2 : 0);
        ranked.push({ ...place, preferenceTags: tags, preferenceScore: score, recommendationReasons: reasons, nearestMustVisitKm, originalIndex });
      }
      ranked.sort((a, b) => b.preferenceScore - a.preferenceScore || a.originalIndex - b.originalIndex);
      const kept = [], counts = new Map();
      for (const place of ranked) {
        const category = place.raw?.cat2 || place.preferenceTags[0] || place.type || "기타";
        const count = counts.get(category) || 0;
        if (!place.mustVisit && kept.length >= 3 && (kept.length >= 8 || count >= 2)) {
          removed.push({ place, reason: count >= 2 ? "duplicateCategory" : "lowerMatch" }); continue;
        }
        kept.push(place); counts.set(category, count + 1);
      }
      return { kept, removed };
    }

    function refreshPrunedSpotCandidates() {
      const plan = currentPlanState;
      if (plan.destinationCity && plan.mustVisitDestination !== plan.destinationCity && plan.mustVisitPlaces.length) return false;
      if (!Array.isArray(plan.rawSpotCandidates) || !plan.rawSpotCandidates.length || !Array.isArray(plan.daysData) || !plan.daysData.length) return false;
      const result = prunePlaceCandidates(plan.rawSpotCandidates, plan.preferenceProfile, plan.mustVisitPlaces, { budget: plan.travelBudget, intercityCost: plan.intercityTransportCost });
      plan.prunedPlaces = result.removed;
      plan.candidatePlaces = [...result.kept, ...plan.daysData.flatMap(day => [day.selections.lunch, day.selections.dinner].filter(Boolean))];
      for (const day of plan.daysData) {
        const selected = day.selections.spot;
        const options = [...result.kept.filter(place => place.mustVisit), ...result.kept.filter(place => !place.mustVisit).slice(0, 3)];
        if (selected && !options.some(place => place.id === selected.id)) options.push(selected);
        day.options.spot = options;
      }
      renderAllTimelineCards();
      recalculateLiveBudget();
      return true;
    }

    // 5. 동적 일자별 타임라인 렌더링
    function renderAllTimelineCards() {
      const container = document.getElementById("timelineCardsContainer");
      container.innerHTML = "";

      currentPlanState.daysData.forEach(dayItem => {
        const day = dayItem.dayNum;
        const isFirstDay = (day === 1);
        const isLastDay = dayItem.isLastDay;
        const schedule = dayItem.schedule;

        const dayHeader = document.createElement("div");
        dayHeader.className = `flex flex-wrap items-center justify-between gap-2 ${isFirstDay ? "pt-2" : "pt-6"} pb-2 border-b ${isLastDay ? "border-indigo-300" : "border-blue-300"}`;
        dayHeader.innerHTML = `
          <div class="flex flex-wrap items-center gap-2 min-w-0">
            <span class="${isLastDay ? "bg-indigo-600" : "bg-blue-600"} text-white text-xs font-bold px-3 py-1 rounded-full">DAY ${day}</span>
            <span class="text-sm text-slate-800 font-bold">${formatDateLabel(dayItem.dateStr)}</span>
            <span class="text-xs text-slate-500">${currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival)} · ${isLastDay ? "귀가 및 마무리" : `${day}일차 추천 코스`}</span>
          </div>
          <span class="text-[11px] ${isLastDay ? "text-indigo-600" : "text-blue-600"} font-bold">${isLastDay ? "안전 귀가 일정" : "맞춤 선택 진행"}</span>
        `;
        container.appendChild(dayHeader);

        if (schedule.notice) {
          const scheduleNotice = document.createElement("div");
          scheduleNotice.className = "rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800";
          scheduleNotice.innerHTML = `<i class="fa-solid fa-clock mr-1"></i>${schedule.notice}`;
          container.appendChild(scheduleNotice);
        }

        if (schedule.showMorning) {
          const morningCard = document.createElement("div");
          morningCard.className = "bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center";
          morningCard.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">09:30</span>
              <div>
                <h4 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-mug-saucer text-amber-500"></i> ${currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival)} 조망 모닝 베이커리
                </h4>
                <p class="text-xs text-blue-700 font-medium">시그니처 커피 & 브레드 (단차 0cm 평지)</p>
              </div>
            </div>
            <span class="text-xs font-bold text-slate-900">개별 자유</span>
          `;
          container.appendChild(morningCard);
        }

        // 점심 선택 카드
        if (schedule.showLunch) {
          container.appendChild(renderInteractiveCard(
            day, "lunch", schedule.lunchTime, `${day}일차 점심 식사 선택`, "fa-utensils",
            dayItem.options.lunch, dayItem.selections.lunch, dayItem.confirmed.lunch
          ));
        }

        // 관광 명소 선택 카드
        if (schedule.showSpot) {
          container.appendChild(renderInteractiveCard(
            day, "spot", schedule.spotTime, `${day}일차 관광 명소 선택`, "fa-camera",
            dayItem.options.spot, dayItem.selections.spot, dayItem.confirmed.spot
          ));
        }

        if (!isLastDay && schedule.showDinner) {
          container.appendChild(renderInteractiveCard(day, "dinner", schedule.dinnerTime, `${day}일차 저녁 만찬 선택`, "fa-bowl-food", dayItem.options.dinner, dayItem.selections.dinner, dayItem.confirmed.dinner));
        } else {
          const routing = currentPlanState.routingInfo;
          const isFlight = currentPlanState.transportMode === "flight";
          const returnFlight = currentPlanState.returnFlight;
          const returnCard = document.createElement("div");
          returnCard.className = "bg-blue-50/60 rounded-xl border border-blue-200 p-4 shadow-sm space-y-2";
          returnCard.innerHTML = `
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">${currentPlanState.returnTime}</span>
                <span class="text-xs font-bold text-blue-950 flex items-center gap-1">
                  <i class="fa-solid ${isFlight ? "fa-plane-departure" : "fa-train"} text-blue-600"></i> ${isFlight
                    ? (returnFlight ? `${returnFlight.origin} ➔ ${returnFlight.destination} 귀가 탑승` : "제주 항공 일정 마무리")
                    : (routing.isTransfer ? `${currentPlanState.arrival}역 ➔ [${routing.transferStation} 환승] ➔ ${currentPlanState.depart}역` : `${currentPlanState.arrival}역 ➔ ${currentPlanState.depart}역`) + " 귀가 탑승"}
                </span>
              </div>
              <span class="text-xs font-bold text-blue-700">기포함</span>
            </div>
            <p class="text-xs text-slate-600">${isFlight
              ? (returnFlight ? "출발 90분 전 제주국제공항 도착 권장 · 공항 내 엘리베이터와 교통약자 지원 서비스 이용 가능" : "오는 항공편이 없는 편도 일정입니다.")
              : (routing.isTransfer ? `출발 20분 전 승강장 엘리베이터 이동 ➔ ${routing.transferStation} 도착 후 안내요원 배리어프리 리프트 환승 연계 지원` : '출발 20분 전 승강장 전용 엘리베이터 이동 (왕복권 기포함)')}</p>
          `;
          container.appendChild(returnCard);
        }
      });
    }

    // 6. 인터랙티브 카드 컴포넌트
    function renderMealDirectSearch(dayNum, category) {
      const state = getMealSearchState(dayNum, category);
      const results = state.results.slice(0, 3).map((item, index) => {
        const estimate = convertKakaoRestaurant(item, category);
        const proximity = Number.isFinite(item._routeDistanceKm) ? `현재 동선에서 직선 ${item._routeDistanceKm.toFixed(1)}km` : "현재 동선과 거리 확인 필요";
        return `<div class="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-white p-2 text-xs"><div class="min-w-0"><p class="font-bold text-slate-800 truncate">${escapeHtml(item.place_name)}</p><p class="text-[10px] text-slate-500 truncate">${escapeHtml(item.category_name || item.road_address_name || item.address_name || "")}</p><p class="mt-1 text-[10px] font-semibold text-emerald-700">${formatEstimatedPrice(estimate)}</p><p class="text-[10px] text-slate-500">${proximity}</p></div><button type="button" onclick="selectKakaoMeal(${dayNum}, '${category}', ${index})" class="shrink-0 rounded-md bg-blue-600 px-2 py-1 font-bold text-white hover:bg-blue-700">선택</button></div>`;
      }).join("");
      return `<div class="meal-search-panel rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-3 space-y-2"><div class="flex items-center gap-2 text-xs font-bold text-blue-900"><i class="fa-solid fa-magnifying-glass"></i> 현재 동선 주변 음식점</div><p class="text-[10px] text-slate-600">주변 후보 약 3곳을 찾습니다. 거리는 좌표 직선 기준이며 식비는 메뉴 가격이 아닌 예상 범위입니다.</p><button type="button" onclick="searchNearbyRestaurants(${dayNum}, '${category}')" ${state.loading ? "disabled" : ""} class="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">${state.loading ? "주변 식당 검색 중" : "현재 동선 주변 3곳 찾기"}</button>${state.error ? `<p class="text-[11px] text-rose-600">${escapeHtml(state.error)}</p>` : ""}${!state.loading && state.query && !state.error && !state.results.length ? `<p class="text-[11px] text-slate-500">검색 결과가 없습니다. 검색어를 바꾸거나 다시 시도해 주세요.</p>` : ""}${results ? `<div class="space-y-1.5">${results}</div>` : ""}<details class="pt-1"><summary class="cursor-pointer text-[10px] font-semibold text-blue-800">식당 이름으로 직접 검색</summary><div class="mt-2 flex gap-2"><input id="mealDirectSearchInput-${dayNum}-${category}" value="${escapeHtml(state.query)}" onkeydown="if(event.key==='Enter'){event.preventDefault();searchDirectMeal(${dayNum}, '${category}');}" placeholder="식당 이름 또는 메뉴 키워드" class="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-400"><button type="button" onclick="searchDirectMeal(${dayNum}, '${category}')" ${state.loading ? "disabled" : ""} class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">${state.loading ? "검색 중" : "검색"}</button></div></details></div>`;
    }

    function getRestaurantRouteAnchor(dayNum) {
      const day = currentPlanState.daysData.find(item => item.dayNum === dayNum);
      const preferred = day?.selections?.spot || currentPlanState.mustVisitPlaces?.[0];
      if (preferred) return routePoint(preferred);
      const next = selectedRoutePlaces().find(place => place.kind !== "station" && place.kind !== "returnStation");
      if (next) return next;
      const city = currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival);
      const station = DESTINATION_COORDS[city];
      return station ? routePoint({ name: station.label, mapx: station.lng, mapy: station.lat }) : null;
    }

    async function searchNearbyRestaurants(dayNum, category) {
      const state = getMealSearchState(dayNum, category);
      if (state.loading) return;
      const city = currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival);
      const anchor = getRestaurantRouteAnchor(dayNum);
      state.query = anchor?.name ? `${anchor.name} 주변 음식점` : `${city} 음식점`;
      state.loading = true; state.error = ""; state.results = [];
      renderAllTimelineCards();
      try {
        const found = await searchKakaoLocal(`${city} ${state.query}`, "FD6");
        state.results = found.map(item => {
          const point = routePoint({ mapx: item.x, mapy: item.y });
          return { ...item, _routeDistanceKm: anchor ? routeDistance(anchor, point) : null };
        }).sort((a, b) => (a._routeDistanceKm ?? Infinity) - (b._routeDistanceKm ?? Infinity)).slice(0, 3);
        if (!state.results.length) state.error = "주변 음식점 검색 결과가 없습니다.";
      } catch (error) { state.error = error.message || "주변 음식점 검색에 실패했습니다. 직접 검색을 이용해 주세요."; }
      finally { state.loading = false; renderAllTimelineCards(); }
    }

    async function searchDirectMeal(dayNum, category) {
      const state = getMealSearchState(dayNum, category);
      if (state.loading) return;
      const input = document.getElementById(`mealDirectSearchInput-${dayNum}-${category}`);
      state.query = input ? input.value.trim() : state.query;
      if (!state.query) { state.error = "식당 이름 또는 키워드를 입력해 주세요."; renderAllTimelineCards(); return; }
      state.loading = true; state.error = ""; state.results = []; renderAllTimelineCards();
      try { const city = currentPlanState.destinationCity || getDestinationDataKey(currentPlanState.arrival); state.results = await searchKakaoLocal(`${city} ${state.query}`, "FD6"); }
      catch (error) { state.error = error.message || "식당 검색에 실패했습니다. 추천 식당을 이용해 주세요."; }
      state.loading = false; renderAllTimelineCards();
    }

    function selectKakaoMeal(dayNum, category, index) {
      const state = getMealSearchState(dayNum, category);
      const raw = state.results[index];
      const dayTarget = currentPlanState.daysData.find(day => day.dayNum === dayNum);
      if (!raw || !dayTarget) return;
      const restaurant = convertKakaoRestaurant(raw, category);
      if (!dayTarget.options[category].some(option => option.id === restaurant.id)) dayTarget.options[category].unshift(restaurant);
      const selectedRestaurant = dayTarget.options[category].find(option => option.id === restaurant.id);
      selectedRestaurant.nearbyRouteDistanceKm = Number.isFinite(raw._routeDistanceKm) ? raw._routeDistanceKm : null;
      dayTarget.confirmed[category] = false;
      state.results = [];
      updateSelection(dayNum, category, selectedRestaurant);
    }

    function renderSpotDirectSearch(dayNum) {
      const state = getMealSearchState(dayNum, "spot");
      const results = state.results.map((item, index) => `<div class="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-white p-2 text-xs"><div class="min-w-0"><p class="font-bold text-slate-800 truncate">${escapeHtml(item.place_name)}</p><p class="text-[10px] text-slate-500 truncate">${escapeHtml(item.category_name || item.road_address_name || item.address_name || "")}</p></div><button type="button" onclick="selectKakaoSpot(${dayNum}, 'spot', ${index})" class="shrink-0 rounded-md bg-blue-600 px-2 py-1 font-bold text-white hover:bg-blue-700">선택</button></div>`).join("");
      return `<div class="meal-search-panel rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-3 space-y-2"><div class="flex items-center gap-2 text-xs font-bold text-blue-900"><i class="fa-solid fa-magnifying-glass"></i> 원하는 관광명소 직접 검색</div><div class="flex gap-2"><input id="spotDirectSearchInput-${dayNum}-spot" value="${escapeHtml(state.query)}" onkeydown="if(event.key==='Enter'){event.preventDefault();searchDirectSpot(${dayNum}, 'spot');}" placeholder="관광명소 이름 또는 키워드" class="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-400"><button type="button" onclick="searchDirectSpot(${dayNum}, 'spot')" ${state.loading ? "disabled" : ""} class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">${state.loading ? "검색 중" : "검색"}</button></div><p class="text-[10px] text-blue-700">관광명소 검색 결과 · 입장료는 예산에 미포함이며, 무장애 편의시설과 함께 방문 전 확인해 주세요.</p>${state.error ? `<p class="text-[11px] text-rose-600">${escapeHtml(state.error)}</p>` : ""}${!state.loading && state.query && !state.error && !results ? `<p class="text-[11px] text-slate-500">검색 결과가 없습니다.</p>` : ""}${results ? `<div class="space-y-1.5">${results}</div>` : ""}</div>`;
    }

    async function searchDirectSpot(dayNum) {
      const state = getMealSearchState(dayNum, "spot");
      state.query = document.getElementById(`spotDirectSearchInput-${dayNum}-spot`)?.value.trim() || "";
      if (!state.query) { state.error = "관광명소 이름 또는 키워드를 입력해 주세요."; state.results = []; renderAllTimelineCards(); return; }
      state.loading = true; state.error = ""; state.results = [];
      const plan = currentPlanState;
      renderAllTimelineCards();
      try {
        const city = plan.destinationCity || getDestinationDataKey(plan.arrival);
        state.results = await searchKakaoLocal(`${city} ${state.query}`, "AT4");
      } catch (error) { state.error = "관광명소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요."; }
      state.loading = false;
      if (currentPlanState === plan) renderAllTimelineCards();
    }

    function selectKakaoSpot(dayNum, category, index) {
      const state = getMealSearchState(dayNum, "spot");
      const raw = state.results[index];
      const day = currentPlanState.daysData.find(item => item.dayNum === dayNum);
      if (!raw || !day) return;
      const spot = {
        id: `kakao-spot-${raw.id}`,
        name: raw.place_name || "이름 미등록 관광명소",
        address: raw.road_address_name || raw.address_name || "",
        type: "직접 검색 관광명소", source: "kakao", customSelected: true,
        cost: 0, priceSource: "unknown",
        why: `${raw.road_address_name || raw.address_name || ""} · 입장료 확인 필요 (예산 미포함)`,
        mapx: raw.x || "", mapy: raw.y || "", kakaoUrl: raw.place_url || "",
        accessibilityVerified: false,
        barrierFreeTip: "문턱·경사로·장애인 화장실 등 무장애 편의시설은 방문 전 확인해 주세요."
      };
      if (!day.options.spot.some(item => item.id === spot.id)) day.options.spot.unshift(spot);
      const selectedSpot = day.options.spot.find(item => item.id === spot.id);
      day.confirmed.spot = false;
      state.results = [];
      updateSelection(dayNum, "spot", selectedSpot);
    }


    function renderInteractiveCard(dayNum, category, time, title, icon, options, currentItem, isConfirmed) {
      const card = document.createElement("div");
      const isMeal = (category === "lunch" || category === "dinner");
      const displayItem = currentItem || options[0] || {};
      const deepLinks = getItemDeepLinks(displayItem);
      const routeOrder = displayItem.id ? (currentPlanState.routeStops || []).findIndex(stop => stop.id === displayItem.id) : -1;
      const routeBadge = routeOrder > 0 ? `<span class="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">${routeOrder}</span>` : "";
      const sourceLabel = displayItem.customSelected ? "직접 선택" : displayItem.source === "kakao" ? "카카오 검색" : displayItem.source === "tourapi" ? "TourAPI" : "추천 데이터";

      // [A. 확정 모드]
      if (isConfirmed) {
        card.className = "bg-white rounded-xl border-2 border-emerald-400 p-4 shadow-sm transition space-y-2.5 bg-emerald-50/20";
        card.innerHTML = `
          <div class="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-emerald-100">
            <div class="flex flex-wrap items-center gap-2 min-w-0">
              <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">${time}</span>
              <span class="text-xs font-bold text-slate-900 flex items-center gap-1">
                <i class="fa-solid ${icon} text-emerald-600"></i> ${title.replace(/\s*선택$/, "")}
              </span>
              <span class="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                <i class="fa-solid fa-check"></i> 선택 완료
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 action-btn-group">
              ${isMeal ? `
                <button type="button" onclick="openRepeatModal(${dayNum}, '${category}')" class="text-xs font-bold text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-sm">
                  <i class="fa-solid fa-repeat text-[10px]"></i> 또 가기
                </button>
              ` : ''}
              <button type="button" onclick="toggleConfirm(${dayNum}, '${category}', false)" class="text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                <i class="fa-solid fa-arrow-rotate-left text-[10px]"></i> 다시 선택하기
              </button>
            </div>
          </div>

          <div class="flex flex-wrap justify-between items-start gap-2 pt-0.5">
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                ${displayItem.type ? `<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">${escapeHtml(displayItem.type)}</span>` : ''}
                ${routeBadge}${escapeHtml(displayItem.name || "장소 정보 없음")}
                ${displayItem.customSelected ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">직접 선택</span>' : ''}
              </h4>
              <p class="text-[10px] text-slate-500 mt-1">${escapeHtml(sourceLabel)}</p>
              <p class="text-xs text-blue-700 font-medium mt-0.5">${escapeHtml(displayItem.menu || displayItem.why || "상세 정보 확인")}</p>
              ${!isMeal && displayItem.recommendationReasons?.length ? `<p class="mt-1 text-[11px] font-semibold text-indigo-700">${displayItem.recommendationReasons.map(reason => escapeHtml(reason)).join(" · ")}</p>` : ""}
            </div>
            <span class="shrink-0 text-sm font-bold text-emerald-700">${isMeal ? formatEstimatedPrice(displayItem) : (displayItem.priceSource === "unknown" ? "가격 정보 없음" : displayItem.cost > 0 ? '예상 ' + displayItem.cost.toLocaleString() + '원' : "무료")}</span>
          </div>

          <div class="pt-2 border-t border-emerald-100/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 font-semibold"><i class="fa-solid fa-map-pin"></i> 위치:</span>
              <a href="${deepLinks.kakaoMap}" target="_blank" rel="noopener noreferrer" class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold hover:bg-amber-200">카카오맵</a>
              ${detailButtonHtml(currentItem, true)}
            </div>
          </div>

          <details class="p-2 bg-emerald-50 rounded-lg text-xs text-emerald-800">
            <summary class="cursor-pointer list-none flex flex-wrap items-start gap-1.5">
              <i class="fa-solid fa-wheelchair mt-0.5"></i><strong>배리어프리</strong>
              <span class="barrier-free-preview min-w-0 flex-1">${escapeHtml(displayItem.barrierFreeTip || (displayItem.accessibilityVerified === false ? "무장애 편의시설 정보가 확인되지 않았습니다." : "배리어프리 정보 확인 필요"))}</span>
              <span class="text-[10px] font-bold text-emerald-700">자세히</span>
            </summary>
            <p class="mt-2 border-t border-emerald-100 pt-2 whitespace-pre-line">${escapeHtml(displayItem.barrierFreeTip || (displayItem.accessibilityVerified === false ? "무장애 편의시설 정보가 확인되지 않았습니다." : "배리어프리 정보 확인 필요"))}</p>
            <span class="text-[10px] text-emerald-600 font-bold">선택한 일정</span>
          </details>
        `;
        return card;
      }

      // [B. 선택 모드]
      card.className = "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition space-y-3";
      let optionsHtml = "";
      options.forEach(opt => {
        const isChecked = currentItem?.id === opt.id ? "checked" : "";
        const tag = opt.type ? `<span class="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold mr-1.5">${opt.type}</span>` : "";
        const optLinks = getItemDeepLinks(opt);

        optionsHtml += `
          <div class="itinerary-option-card p-2.5 rounded-lg border border-slate-200 hover:bg-blue-50/40 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/70">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="opt_d${dayNum}_${category}" value="${opt.id}" onchange="handleOptionChange(${dayNum}, '${category}', '${opt.id}')" ${isChecked} class="mt-1 text-blue-600 focus:ring-blue-500">
              <div class="flex-1 text-xs">
                <div class="flex flex-wrap justify-between items-start gap-1 mb-0.5">
                  <span class="min-w-0 font-bold text-slate-900">${tag}${escapeHtml(opt.name)}</span>
                  ${opt.customSelected ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">직접 선택</span>' : ''}
                  <span class="font-bold text-blue-700">${isMeal ? formatEstimatedPrice(opt) : (opt.priceSource === "unknown" ? "가격 정보 없음" : opt.cost > 0 ? '예상 ' + opt.cost.toLocaleString() + '원' : "무료")}</span>
                </div>
                <p class="text-[11px] text-slate-500">${opt.menu || opt.why}</p>
                ${!isMeal && opt.recommendationReasons?.length ? `<p class="mt-1 text-[11px] font-semibold text-indigo-700">${opt.recommendationReasons.map(reason => escapeHtml(reason)).join(" · ")}</p>` : ""}
              </div>
            </label>

            <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <div class="flex items-center gap-1.5 text-slate-500">
                <span>위치확인:</span>
                <a href="${optLinks.kakaoMap}" target="_blank" rel="noopener noreferrer" class="text-amber-700 hover:underline">카카오맵</a>
                ${detailButtonHtml(opt, true)}
              </div>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <div class="flex flex-wrap items-center gap-2 min-w-0">
            <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${time}</span>
            <span class="text-xs font-bold text-slate-900 flex items-center gap-1">
              <i class="fa-solid ${icon} text-slate-400"></i> ${title}
            </span>
          </div>
          <button type="button" onclick="toggleConfirm(${dayNum}, '${category}', true)" ${isMeal && !currentItem ? "disabled aria-disabled=\"true\"" : ""} class="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition shadow-sm flex items-center gap-1 action-btn-group disabled:opacity-50">
            <i class="fa-solid fa-check text-[10px]"></i> 선택 완료
          </button>
          ${category === "spot" && currentItem && !currentItem.mustVisit && !(currentPlanState.mustVisitPlaces || []).some(place => place.id === currentItem.id) ? `<button type="button" onclick="removeSelectedSpot(${dayNum})" class="text-xs font-semibold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg action-btn-group">일정에서 삭제</button>` : ""}
        </div>
        ${isMeal && !currentItem ? '<p class="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">식당을 선택하면 예상 식비·동선·예산에 반영됩니다.</p>' : ''}
        ${isMeal ? renderMealDirectSearch(dayNum, category) : category === 'spot' ? renderSpotDirectSearch(dayNum) : ''}
        <p class="text-[11px] text-slate-500">3가지 추천 옵션 중 원하시는 항목을 클릭 후 우측 상단 <strong>[선택 완료]</strong>를 누르세요.</p>
        ${!options.length ? `<p class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">${category === "spot" ? "관광지 후보가 부족합니다. Kakao 검색으로 장소를 추가할 수 있습니다." : "선택 가능한 후보가 없습니다."}</p>` : ""}
        <div class="space-y-2">
          ${optionsHtml}
        </div>
      `;
      return card;
    }

    function handleOptionChange(dayNum, category, chosenId) {
      const dayTarget = currentPlanState.daysData.find(d => d.dayNum === dayNum);
      if (!dayTarget) return;

      const optList = dayTarget.options[category];
      const selection = optList.find(i => i.id === chosenId);
      if (!selection) return;
      dayTarget.confirmed[category] = false;
      updateSelection(dayNum, category, selection);
    }

    function toggleConfirm(dayNum, category, shouldConfirm) {
      const dayTarget = currentPlanState.daysData.find(d => d.dayNum === dayNum);
      if (!dayTarget) return;
      if (shouldConfirm && (category === "lunch" || category === "dinner") && !dayTarget.selections[category]) return;

      dayTarget.confirmed[category] = shouldConfirm;
      renderAllTimelineCards();
    }

    // 또 가기 모달
    function openRepeatModal(sourceDay, sourceCategory) {
      const dayTarget = currentPlanState.daysData.find(d => d.dayNum === sourceDay);
      if (!dayTarget) return;

      const item = dayTarget.selections[sourceCategory];
      repeatModalData = {
        sourceItem: item,
        sourceDay: sourceDay,
        sourceCategory: sourceCategory
      };

      document.getElementById("repeatItemName").innerText = item.name;
      document.getElementById("repeatItemMenu").innerText = item.menu || item.why;

      const daySelect = document.getElementById("repeatTargetDay");
      daySelect.innerHTML = "";

      currentPlanState.daysData.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.dayNum;
        opt.innerText = `DAY ${d.dayNum} (${formatDateLabel(d.dateStr)})`;
        if (d.dayNum === sourceDay) {
          opt.innerText += " (현재 선택된 날)";
        }
        daySelect.appendChild(opt);
      });

      const nextDay = currentPlanState.daysData.find(d => d.dayNum !== sourceDay);
      if (nextDay) daySelect.value = nextDay.dayNum;

      document.getElementById("repeatModal").classList.remove("hidden");
    }

    function closeRepeatModal() {
      document.getElementById("repeatModal").classList.add("hidden");
    }

    function applyRepeatMeal() {
      const targetDayNum = parseInt(document.getElementById("repeatTargetDay").value, 10);
      const mealType = document.querySelector('input[name="repeatMealType"]:checked').value;

      const targetDay = currentPlanState.daysData.find(d => d.dayNum === targetDayNum);
      if (!targetDay) return;

      if (targetDay.isLastDay && mealType === "dinner") {
        alert("마지막 날은 KTX 귀가 열차 탑승으로 인해 저녁 식사를 지정할 수 없습니다. 점심을 선택해 주세요.");
        return;
      }

      targetDay.selections[mealType] = { ...repeatModalData.sourceItem };
      targetDay.confirmed[mealType] = true;

      closeRepeatModal();
      renderAllTimelineCards();
      recalculateLiveBudget();

      alert(`[또 가기 완료] DAY ${targetDayNum} ${mealType === 'lunch' ? '점심' : '저녁'}에 '${repeatModalData.sourceItem.name}'이(가) 성공적으로 반영되었습니다!`);
    }

    // html2canvas owns and removes its temporary iframe. All export layout changes
    // happen inside that cloned document, never in the responsive live page.
    const ITINERARY_EXPORT_WIDTH = 1200;
    const ITINERARY_EXPORT_SCALE = 2;
    let itineraryExportInProgress = false;

    async function waitForExportAssets(root) {
      const doc = root.ownerDocument;
      if (doc.fonts?.ready) await doc.fonts.ready;
      await Promise.all(Array.from(root.querySelectorAll("img"), async img => {
        img.loading = "eager";
        if (!img.complete) {
          await new Promise((resolve, reject) => {
            const cleanup = () => {
              clearTimeout(timer);
              img.removeEventListener("load", loaded);
              img.removeEventListener("error", failed);
            };
            const loaded = () => { cleanup(); resolve(); };
            const failed = () => { cleanup(); reject(new Error("일정 이미지를 불러오지 못했습니다.")); };
            const timer = setTimeout(() => {
              cleanup(); reject(new Error("일정 이미지 로딩 시간이 초과되었습니다."));
            }, 15000);
            img.addEventListener("load", loaded, { once: true });
            img.addEventListener("error", failed, { once: true });
            if (img.complete) loaded();
          });
        }
        if (!img.naturalWidth) throw new Error("일정 이미지를 불러오지 못했습니다.");
        if (img.decode) await img.decode();
      }));
      // Use the visible page's animation clock; hidden iframe RAF can be throttled.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    async function prepareItineraryExport(doc, target) {
      target.querySelectorAll("details").forEach(details => { details.open = true; });
      const style = doc.createElement("style");
      style.textContent = `
        html, body {
          zoom: 1 !important; transform: none !important;
          margin: 0 !important; padding: 0 !important;
          width: ${ITINERARY_EXPORT_WIDTH}px !important; min-width: 0 !important;
          max-width: none !important; height: auto !important; overflow: visible !important;
        }
        /* html2canvas measures text baselines with a temporary inline image.
           Tailwind's img { display: block } must not alter that measurement. */
        img { display: inline-block; }
        #captureTargetArea.itinerary-export-mode {
          box-sizing: border-box !important;
          width: ${ITINERARY_EXPORT_WIDTH}px !important;
          min-width: ${ITINERARY_EXPORT_WIDTH}px !important;
          max-width: ${ITINERARY_EXPORT_WIDTH}px !important;
          height: auto !important; max-height: none !important;
          padding: 24px !important; margin: 0 !important;
          position: relative !important; border-radius: 24px !important;
          overflow: visible !important; font-size: 16px;
        }
        .itinerary-export-mode * {
          box-sizing: border-box; animation: none !important; transition: none !important;
          text-wrap: wrap !important;
        }
        .itinerary-export-mode .sticky {
          position: static !important; top: auto !important;
          backdrop-filter: none !important;
        }
        .itinerary-export-mode .flex:not(.overflow-hidden) { flex-wrap: wrap; gap: 8px; }
        .itinerary-export-mode .flex > *,
        .itinerary-export-mode .grid > * { min-width: 0; }
        .itinerary-export-mode .items-start > div { flex: 1 1 60%; }
        .itinerary-export-mode .justify-between > span:last-child { flex-shrink: 0; }
        .itinerary-export-mode :is(h3, h4, p, li, span, a, button, label) {
          white-space: normal !important; overflow-wrap: anywhere !important;
          word-break: keep-all !important; line-height: 1.65 !important;
          height: auto; min-height: 0; max-height: none;
          text-overflow: clip !important;
        }
        /* Mixed text and icons must wrap as normal inline text, not anonymous flex items. */
        .itinerary-export-mode h3.flex,
        .itinerary-export-mode h4.flex,
        .itinerary-export-mode span.flex { display: block; }
        .itinerary-export-mode span[class*="rounded"]:not(.hidden) {
          display: inline-block; vertical-align: middle;
        }
        .itinerary-export-mode .truncate {
          overflow: visible !important; white-space: normal !important;
        }
        .itinerary-export-mode i { flex-shrink: 0; }
        .itinerary-export-mode .fa-solid,
        .itinerary-export-mode .fa-solid *,
        .itinerary-export-mode .fa-solid::before {
          font-family: "Font Awesome 6 Free" !important; font-weight: 900;
        }
        .itinerary-export-mode .itinerary-option-card:not(:has(input:checked)),
        .itinerary-export-mode .meal-search-panel,
        .itinerary-export-mode .action-btn-group,
        .itinerary-export-mode .no-capture,
        .itinerary-export-mode button,
        .itinerary-export-mode a[href],
        .itinerary-export-mode .border-dashed,
        .itinerary-export-mode input { display: none !important; }
        .itinerary-export-mode details { display: block !important; }
        .itinerary-export-mode .barrier-free-preview {
          display: block !important; -webkit-line-clamp: unset !important; overflow: visible !important;
        }
      `;
      doc.head.appendChild(style);
      target.classList.add("itinerary-export-mode");
      // Escape the live page's lg:col-span-7 grid and hidden/dashboard ancestors.
      doc.body.replaceChildren(target);
      target.getBoundingClientRect(); // Resolve layout and start any newly required fonts.
      await waitForExportAssets(target);
      if (target.scrollWidth > ITINERARY_EXPORT_WIDTH + 1) {
        throw new Error("일정 내용이 이미지 폭을 초과했습니다.");
      }
    }

    function getItineraryExportFilename() {
      const city = currentPlanState.destinationCity || currentPlanState.arrival || "여행";
      const duration = "당일치기";
      const date = currentPlanState.startDate || formatDateInput(new Date());
      return `WithTrip_${city}_${duration}_${date}.png`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
    }

    async function exportPlanAsImage() {
      const captureArea = document.getElementById("captureTargetArea");
      if (!captureArea || itineraryExportInProgress) return;
      itineraryExportInProgress = true;
      const status = document.getElementById("apiStatusText");
      const originalStatus = status?.textContent;
      if (status) status.textContent = "고해상도 이미지 렌더링 중...";
      const previousFrames = new Set(document.querySelectorAll("iframe.html2canvas-container"));
      let canvas;
      let downloadLink;
      let downloadUrl;
      try {
        if (typeof html2canvas !== "function") throw new Error("이미지 저장 라이브러리를 불러오지 못했습니다.");
        canvas = await html2canvas(captureArea, {
          scale: ITINERARY_EXPORT_SCALE,
          width: ITINERARY_EXPORT_WIDTH,
          // Height is deliberately measured by html2canvas AFTER onclone has reflowed
          // the complete itinerary. Never use the live mobile element's scrollHeight.
          windowWidth: ITINERARY_EXPORT_WIDTH,
          windowHeight: 900,
          backgroundColor: "#f1f5f9",
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          removeContainer: true,
          onclone: prepareItineraryExport
        });
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG 이미지 생성에 실패했습니다.")), "image/png");
        });
        downloadUrl = URL.createObjectURL(blob);
        downloadLink = document.createElement("a");
        downloadLink.download = getItineraryExportFilename();
        downloadLink.href = downloadUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
      } catch (err) {
        console.error("이미지 캡처 중 오류:", err);
        alert("이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        downloadLink?.remove();
        // Give the browser time to consume the download before releasing the URL.
        if (downloadUrl) setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        // html2canvas may leave its iframe behind when onclone or rendering rejects.
        document.querySelectorAll("iframe.html2canvas-container").forEach(frame => {
          if (!previousFrames.has(frame)) frame.remove();
        });
        if (status) status.textContent = originalStatus;
        itineraryExportInProgress = false;
      }
    }

    function saveFinalItinerary() {


      currentPlanState.daysData.forEach(d => {
        Object.keys(d.confirmed).forEach(k => d.confirmed[k] = true);
      });
      renderAllTimelineCards();

      localStorage.setItem("withTrip_savedPlan", JSON.stringify(currentPlanState));

      const btn = document.getElementById("savePlanBtn");
      btn.className = "w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 text-sm cursor-default";
      btn.innerHTML = "<i class='fa-solid fa-lock text-emerald-400'></i><span>WithTrip Pro 전 일정 수립 완료 (브라우저 저장됨)</span>";

      const badge = document.getElementById("apiStatusBadge");
      badge.className = "flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full font-semibold border border-emerald-200";
      document.getElementById("apiStatusText").innerText = "전 일정 확정 완료";

      const routing = currentPlanState.routingInfo;
      const dayTripNotice = "\n- 여행 유형: 당일치기 (숙박비 제외)";
      const transferNotice = currentPlanState.transportMode === "flight"
        ? `\n- 항공 경로: ${currentPlanState.outboundFlight.origin} → ${currentPlanState.outboundFlight.destination} → ${currentPlanState.returnFlight.destination} (예상 ${currentPlanState.flightTotal.toLocaleString()}원 · 실제 항공권 가격 아님)`
        : routing.isTransfer ? `\n- 철도 경로: ${routing.routeText} (왕복 ${currentPlanState.ktxTotal.toLocaleString()}원)` : `\n- 철도 경로: 직통 (${currentPlanState.ktxTotal.toLocaleString()}원)`;

      alert(`[WithTrip Pro] ${formatTripDuration(currentPlanState.duration)} 여행 계획이 확정 수립되었습니다!${dayTripNotice}${transferNotice}\n- 총 확정 지출: ${document.getElementById("displaySpend").innerText}\n- 남은 예비비: ${document.getElementById("displayBalance").innerText}\n\n우측 하단의 [일정표 고화질 이미지(PNG) 저장]을 누르면 사진으로 보관할 수 있습니다.`);
    }

    function formatDateInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function calculateTripDays(startDateValue, endDateValue) {
      if (!startDateValue || !endDateValue) return 0;
      const start = new Date(`${startDateValue}T00:00:00`);
      const end = new Date(`${endDateValue}T00:00:00`);
      return Math.round((end - start) / 86400000) + 1;
    }

    function timeToMinutes(time) {
      const [hours, minutes] = (time || "00:00").split(":").map(Number);
      return (hours * 60) + minutes;
    }

    function minutesToTime(totalMinutes) {
      const normalized = ((totalMinutes % 1440) + 1440) % 1440;
      return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
    }

    function getDaySchedule({ isFirstDay, isLastDay, arrivalTime, arrivalDayOffset = 0, returnTime }) {
      const schedule = {
        showMorning: !isFirstDay,
        showLunch: true,
        showSpot: true,
        showDinner: !isLastDay,
        lunchTime: "11:30",
        spotTime: "14:00",
        dinnerTime: "18:30",
        notice: ""
      };

      if (isFirstDay) {
        const arrival = timeToMinutes(arrivalTime) + (arrivalDayOffset * 1440);
        schedule.showMorning = false;
        schedule.showLunch = arrival <= 13 * 60;
        schedule.showSpot = arrival <= 16 * 60;
        schedule.showDinner = !isLastDay && arrival <= 19 * 60;
        schedule.lunchTime = minutesToTime(Math.max(12 * 60, arrival + 30));
        schedule.spotTime = minutesToTime(Math.max(14 * 60, arrival + 45));
        schedule.dinnerTime = minutesToTime(Math.max(18 * 60 + 30, arrival + 45));
        schedule.notice = arrival > 19 * 60
          ? "늦은 도착 일정: 귀가 전 저녁 식사와 휴식 위주로 구성했습니다."
          : arrival > 16 * 60
            ? "저녁 도착 일정: 저녁 식사와 휴식 위주로 구성했습니다."
            : arrival > 13 * 60
              ? "오후 도착 일정: 무리 없는 짧은 관광과 저녁 식사 위주로 구성했습니다."
              : "도착 시간 이후부터 가능한 일정만 배치했습니다.";
      }

      if (isLastDay) {
        const departure = timeToMinutes(returnTime);
        schedule.showMorning = !isFirstDay && departure >= 11 * 60 + 30;
        schedule.showSpot = departure >= 13 * 60;
        schedule.showLunch = departure >= 14 * 60;
        schedule.showDinner = false;
        schedule.spotTime = "09:30";
        schedule.lunchTime = "11:30";
        schedule.notice = departure < 13 * 60
          ? "이른 귀가 일정: 체크아웃과 역 이동을 우선으로 배치했습니다."
          : "귀가 열차 출발 30분 전까지 역에 도착하도록 일정을 조정했습니다.";
      }

      return schedule;
    }

    function formatDateLabel(dateValue) {
      const [year, month, day] = dateValue.split("-");
      return `${year}.${month}.${day}`;
    }

    function formatTripDuration(days) {
      return days === 1 ? "당일치기" : `${Math.max(0, days - 1)}박 ${days}일`;
    }

    function updateTripDates() {
      const startInput = document.getElementById("tripStartDate");
      const endInput = document.getElementById("tripEndDate");
      endInput.min = startInput.value;
      if (startInput.value && endInput.value && endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
      const days = calculateTripDays(startInput.value, endInput.value) || 1;
      document.getElementById("duration").value = days;
      document.getElementById("durationPreview").innerText = formatTripDuration(days);

      const sInfo = getSeasonInfo(startInput.value);
      document.getElementById("seasonIndicator").innerText = `[${sInfo.name}철 테마]`;
    }

    function initializeDateInputs() {
      const startInput = document.getElementById("tripStartDate");
      const endInput = document.getElementById("tripEndDate");
      const today = new Date();

      startInput.min = formatDateInput(today);
      startInput.value = formatDateInput(today);
      endInput.value = formatDateInput(today);
      endInput.readOnly = true;
      updateTripDates();
      const flightStart = document.getElementById("flightStartDate");
      const flightEnd = document.getElementById("flightEndDate");
      flightStart.min = formatDateInput(today);
      flightStart.value = formatDateInput(today);
      flightEnd.value = formatDateInput(today);
      updateFlightDates();
    }

    function populateTimeSelect(selectId, defaultValue) {
      const select = document.getElementById(selectId);
      select.innerHTML = "";
      for (let minutes = 0; minutes < 1440; minutes += 30) {
        const value = minutesToTime(minutes);
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === defaultValue;
        select.appendChild(option);
      }
    }

    function initializeTimeInputs() {
      populateTimeSelect("departTime", "09:00");
      populateTimeSelect("returnTime", "19:30");
      const populateFlightHours = (id, defaultValue) => {
        const select = document.getElementById(id);
        select.innerHTML = "";
        for (let hour = 5; hour <= 22; hour++) {
          const value = `${String(hour).padStart(2, "0")}:00`;
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          option.selected = value === defaultValue;
          select.appendChild(option);
        }
      };
      populateFlightHours("outboundDepartureTime", "09:00");
      populateFlightHours("returnDepartureTime", "18:00");
      updateRailTimeOptions();
      updateFlightRouteAndTimes();
    }

    let withTripPreferences = { localTransportPreference: "walk", preferenceProfile: { accessibilityFirst: false } };
    function parseBudgetInput(input) {
      const raw = String(input.value || "").trim();
      const validFormat = /^(?:\d{1,3}(?:,\d{3})*|\d+)$/.test(raw);
      const value = validFormat ? Number(raw.replace(/,/g, "")) : NaN;
      const valid = Number.isSafeInteger(value) && value > 0;
      const error = document.getElementById(input.id === "totalBudget" ? "plannerBudgetInputError" : "budgetInputError");
      if (error) { error.textContent = valid ? "" : (raw.startsWith("-") ? "예산은 0원보다 큰 금액으로 입력해 주세요." : "0원보다 큰 숫자 예산을 입력해 주세요."); error.classList.toggle("hidden", valid); }
      input.setAttribute("aria-invalid", String(!valid));
      return valid ? value : null;
    }
    function updateBudgetDuration() {
      const days = Math.max(1, Number(document.getElementById("budgetFirstDuration")?.value) || 1);
      currentPlanState.duration = days; currentPlanState.nights = days - 1;
      currentPlanState.tripType = days === 1 ? "dayTrip" : "roundtrip";
      const durationInput = document.getElementById("duration"); if (durationInput) durationInput.value = String(days);
      renderBudgetDestinationCandidates();
    }
    function formatBudgetFirstInput(input) {
      const raw = String(input.value || "").trim();
      if (/^[0-9,]+$/.test(raw) && raw.replace(/,/g, "")) input.value = Number(raw.replace(/,/g, "")).toLocaleString("ko-KR");
      const value = parseBudgetInput(input);
      if (value !== null) { currentPlanState.travelBudget = value; currentPlanState.budget = value; renderBudgetDestinationCandidates(); }
      else { currentPlanState.candidateDestinations = []; document.getElementById("budgetDestinationResults")?.classList.add("hidden"); }
    }
    function continueFromBudgetFirst(destinationChoice) {
      installBudgetFirstListeners();
      const input = document.getElementById("budgetFirstInput");
      const budget = parseBudgetInput(input);
      if (budget === null) { input.focus(); return; }

      const origin = document.getElementById("budgetFirstOrigin").value;
      const accessibilityFirst = document.getElementById("accessibilityPreference").checked;
      currentPlanState.travelBudget = budget;
      currentPlanState.budget = budget;
      currentPlanState.origin = origin;
      const duration = Math.max(1, Number(document.getElementById("budgetFirstDuration")?.value) || 1);
      currentPlanState.tripType = duration === 1 ? "dayTrip" : "roundtrip";
      currentPlanState.duration = duration;
      currentPlanState.nights = duration - 1;
      document.getElementById("duration").value = String(duration);
      currentPlanState.localTransportPreference = document.querySelector('input[name="localTransportPreference"]:checked').value;
      currentPlanState.preferenceProfile.accessibilityFirst = accessibilityFirst;
      withTripPreferences.localTransportPreference = currentPlanState.localTransportPreference;
      withTripPreferences.preferenceProfile.accessibilityFirst = accessibilityFirst;
      document.querySelector('input[name="accessibility"][value="priority"]').checked = accessibilityFirst;
      document.querySelector('input[name="accessibility"][value="general"]').checked = !accessibilityFirst;
      document.getElementById("totalBudget").value = budget.toLocaleString("ko-KR");
      formatBudgetInput(document.getElementById("totalBudget"));

      document.getElementById("departStation").value = origin;
      updateArrivalStationOptions();
      const startDate = new Date(`${document.getElementById("tripStartDate").value}T00:00:00`);
      startDate.setDate(startDate.getDate() + duration - 1);
      document.getElementById("tripEndDate").value = formatDateInput(startDate);
      document.getElementById("tripEndDate").readOnly = true;
      updateTripDates();

      if (!destinationChoice) {
        renderBudgetDestinationCandidates();
        const results = document.getElementById("budgetDestinationResults");
        results?.classList.remove("hidden");
        results?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      currentPlanState.selectedDestination = destinationChoice;
      document.getElementById("arrivalStation").value = destinationChoice;
      updateRailTimeOptions();

      const departSelect = document.getElementById("departTime");
      const returnSelect = document.getElementById("returnTime");
      departSelect.value = findAvailableRailTime(origin, 8, "09:00");
      returnSelect.value = findAvailableRailTime(destinationChoice, 39, "19:30");
      updateEstimatedArrival();

      document.getElementById("budgetFirstView").classList.add("hidden");
      document.getElementById("budgetPlannerNavigation").classList.remove("hidden");
      document.getElementById("plannerWorkspace").classList.remove("hidden");
      document.getElementById("plannerWorkspace").scrollIntoView({ behavior: "smooth" });
      generateInitialPlan();
    }
    function formatBudgetInput(input) {
      const raw = String(input.value || "").trim();
      if (/^[0-9,]+$/.test(raw) && raw.replace(/,/g, "")) input.value = Number(raw.replace(/,/g, "")).toLocaleString("ko-KR");
      const budget = parseBudgetInput(input);
      if (budget !== null) {
        currentPlanState.travelBudget = budget; currentPlanState.budget = budget;
        document.getElementById("budgetPreview").innerText = `총 ${budget.toLocaleString("ko-KR")}원`;
        recalculateBudget();
        if (currentPlanState.rawSpotCandidates?.length) refreshPrunedSpotCandidates();
      }
    }

    installBudgetFirstListeners();
    initializeDateInputs();
    initializeTimeInputs();
    renderPreferenceTree();
    renderMustVisitPanel();
    renderBudgetDestinationCandidates();

    Object.defineProperty(window, "currentPlanState", { configurable: true, get: () => currentPlanState, set: value => { currentPlanState = value; } });
    window.updateBudgetDuration = updateBudgetDuration;
    Object.defineProperty(window, "withTripPreferences", { configurable: true, get: () => withTripPreferences, set: value => { withTripPreferences = value; } });
    Object.assign(window, {
      updateArrivalStationOptions, updateRailTimeOptions, updateEstimatedArrival, updateFlightDates,
      updateFlightRouteAndTimes, switchPlannerMode, selectFlightPackage, generateInitialPlan,
      formatBudgetInput, formatBudgetFirstInput, continueFromBudgetFirst, selectBudgetDestination,
      choosePreference, resetPreferenceTree, recalculateLiveBudget, recalculateBudget, findAvailableRailTime,
      searchMustVisitPlace, addMustVisitPlace, handleOptionChange, toggleConfirm,
      removeSelectedSpot, rebuildPlanForBudget, searchNearbyRestaurants, searchDirectMeal,
      addReachableCandidate,
      selectKakaoMeal, searchDirectSpot, selectKakaoSpot, openRepeatModal, closeRepeatModal,
      applyRepeatMeal, closeTourDetailModal, openTourDetailModalByData, exportPlanAsImage,
      saveFinalItinerary, updateTripDates
    });










