import { BUFFER_RATE, normalizeCost } from "./budget.js";

import { estimateCandidateLocalTransportCost, getDistanceKm } from "./transport.js";

export const DESTINATION_CITY_MAP = {
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


export const CITY_ALIASES = {
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

export const DESTINATION_COORDS = {
  "서울": { lat: 37.5547, lng: 126.9706, label: "서울역" },
  "수서": { lat: 37.4875, lng: 127.1010, label: "수서역" },
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

export const DESTINATION_REGION_MAP = {
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

export const DESTINATION_REGIONS = ["수도권", "강원도", "충청도", "전라도", "경상도"];
export const DESTINATION_REGION = {
  "서울": "수도권", "수서": "수도권", "강릉": "강원도",
  "오송": "충청도", "천안아산": "충청도", "대전": "충청도",
  "전주": "전라도", "광주송정": "전라도", "목포": "전라도",
  "순천": "전라도", "여수엑스포": "전라도",
  "동대구": "경상도", "경주": "경상도",
  "울산": "경상도", "부산": "경상도", "진주": "경상도"
};

export const PREFERENCE_STEPS = [
  { key: "scenery", title: "어떤 풍경이 좋나요?", options: [{ value: "nature", label: "🌊 자연" }, { value: "urban", label: "🏙️ 도심" }] },
  { key: "focus", title: "무엇을 더 즐기고 싶나요?", options: [{ value: "food", label: "🍜 먹거리" }, { value: "sightseeing", label: "📸 볼거리" }] },
  { key: "pace", title: "여행 속도는 어떤가요?", options: [{ value: "relaxed", label: "😌 여유롭게" }, { value: "active", label: "🚶 알차게" }] },
  { key: "discovery", title: "어떤 장소가 끌리나요?", options: [{ value: "famous", label: "🏛️ 유명 관광지" }, { value: "hidden", label: "💎 숨은 명소" }] }
];

export const DESTINATION_PREFERENCE_TAGS = Object.freeze({
  "서울": ["urban", "food", "active", "famous"], "수서": ["urban", "food", "active", "famous"],
  "천안아산": ["nature", "sightseeing", "relaxed", "famous"], "오송": ["nature", "sightseeing", "relaxed", "hidden"],
  "대전": ["urban", "food", "active", "famous"], "강릉": ["nature", "food", "relaxed", "famous"],
  "전주": ["urban", "food", "relaxed", "famous"], "광주송정": ["urban", "food", "active", "hidden"],
  "목포": ["nature", "food", "relaxed", "famous"], "순천": ["nature", "sightseeing", "relaxed", "famous"],
  "여수엑스포": ["nature", "food", "relaxed", "famous"], "동대구": ["urban", "food", "active", "famous"],
  "경주": ["nature", "sightseeing", "relaxed", "famous"], "울산": ["nature", "urban", "active", "hidden"],
  "부산": ["nature", "urban", "food", "famous"], "진주": ["nature", "food", "relaxed", "famous"]
});

export const PREFERENCE_LABELS = Object.freeze(Object.fromEntries(PREFERENCE_STEPS.flatMap(step => step.options.map(option => [option.value, option.label]))));

export function scoreDestinationPreference(destination, profile = {}) {
  const tags = DESTINATION_PREFERENCE_TAGS[destination] || [];
  const matches = PREFERENCE_STEPS.map(step => profile[step.key]).filter(value => value && tags.includes(value));
  return { tags, score: matches.length, reasons: matches.map(value => `${PREFERENCE_LABELS[value]} 선호와 맞아요`) };
}

export function classifyPlace(item = {}) {
  return classifyPlacePreferences({
    place_name: item.name || "",
    category_name: `${item.type || ""} ${item.raw?.cat2 || ""}`,
    _preferenceTags: item.preferenceTags || []
  });
}

export function classifyPlacePreferences(raw = {}) {
  const text = `${raw.place_name || ""} ${raw.category_name || ""}`;
  const tags = new Set(raw._preferenceTags || []);
  if (/해변|바다|산(?!책)|숲|계곡|폭포|호수|강변|공원|정원|수목원|습지|오름|섬|자연|둘레길|해수욕장/.test(text)) tags.add("nature");
  if (/도심|거리|광장|타워|전망대|쇼핑|상가|시내|도시|벽화|문화마을/.test(text)) tags.add("urban");
  if (/시장|먹거리|음식|맛집|카페|식당|베이커리|디저트|푸드/.test(text)) tags.add("food");
  if (/관광|유적|문화재|사찰|궁|박물관|미술관|전시|기념관|전망|성곽|역사|해변|폭포|등대|성당/.test(text)) tags.add("sightseeing");
  if (/산책|공원|정원|수목원|해변|호수|숲|카페|휴양|힐링|전망/.test(text)) tags.add("relaxed");
  if (/체험|액티비티|레저|스포츠|서핑|케이블카|등산|트레킹|놀이|테마파크|자전거|탐방/.test(text)) tags.add("active");
  if (/대표|유명|랜드마크|국립|세계유산|문화유산|세계|문화재|타워|궁|전통시장/.test(text)) tags.add("famous");
  if (/숨은|골목|작은|소규모|로컬/.test(text)) tags.add("hidden");
  return [...tags];
}

function placeDistanceKm(a, b) {
  return getDistanceKm(a?.mapy, a?.mapx, b?.mapy, b?.mapx);
}

export function prunePlaceCandidates(rawSpots = [], profile = {}, mustVisitPlaces = [], context = {}) {
  const mandatoryIds = new Set(mustVisitPlaces.map(place => place.id));
  const all = [...mustVisitPlaces, ...rawSpots].filter((place, index, list) => list.findIndex(other => other.id === place.id) === index);
  const budget = normalizeCost(context.travelBudget), intercityCost = normalizeCost(context.intercityCost);
  const available = budget !== null && intercityCost !== null ? Math.max(0, budget - intercityCost) : null;
  const removed = [], ranked = [];
  for (const [originalIndex, place] of all.entries()) {
    const mandatory = mandatoryIds.has(place.id);
    const knownPrice = place.priceSource !== "unknown" ? normalizeCost(place.cost) : null;
    if (!mandatory && knownPrice !== null && available !== null && knownPrice > available) {
      removed.push({ place, reason: "knownPriceOverBudget" }); continue;
    }
    const tags = classifyPlace(place);
    const matches = [profile.scenery, profile.focus, profile.pace, profile.discovery].filter(value => value && tags.includes(value));
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

export function selectPreferenceRankedOptions(candidates = [], startIndex = 0, limit = 3) {
  if (!candidates.length || limit <= 0) return [];
  const ranked = [...candidates].sort((a, b) =>
    (b.preferenceScore || 0) - (a.preferenceScore || 0)
    || (a.originalIndex ?? 0) - (b.originalIndex ?? 0));
  const topScore = ranked[0].preferenceScore || 0;
  const topMatches = ranked.filter(item => (item.preferenceScore || 0) === topScore);
  const offset = ((Math.floor(Number(startIndex) || 0) % topMatches.length) + topMatches.length) % topMatches.length;
  const preferred = Array.from({ length: Math.min(limit, topMatches.length) }, (_, index) => topMatches[(offset + index) % topMatches.length]);
  const selectedIds = new Set(preferred.map(item => item.id));
  return [...preferred, ...ranked.filter(item => !selectedIds.has(item.id))].slice(0, limit);
}

export function buildDestinationCandidates({
  origin, travelBudget, duration = 1, localTransportPreference = "walk", allowedDestinations = [], arrivalOptions = [],
  getRoundTripFare, getFareSource, preferenceProfile = {}, estimateMeal
} = {}) {
  const budget = Number(travelBudget);
  const tripDays = Math.max(1, Math.min(3, Math.floor(Number(duration) || 1)));
  if (!origin || !Number.isFinite(budget) || budget <= 0) return [];
  const candidates = [];
  for (const option of arrivalOptions) {
    const destination = option.value;
    if (!destination || destination === origin || !allowedDestinations.includes(destination)) continue;
    const fare = getRoundTripFare?.(origin, destination);
    if (!Number.isFinite(fare) || fare < 0) continue;
    const lunch = estimateMeal?.({}, "lunch", { travelBudget: budget, intercityCost: fare });
    const dinner = estimateMeal?.({}, "dinner", { travelBudget: budget, intercityCost: fare });
    if (!lunch || !dinner) continue;
    const mealCount = tripDays === 1 ? 2 : tripDays * 3 - 2;
    const estimatedFoodCost = Math.ceil(((lunch.cost + dinner.cost) / 2) * mealCount / 100) * 100;
    // 장소를 고르기 전에는 현지 이동 구간과 입장료를 알 수 없다.
    // 대중교통은 하루 두 번의 기본요금, 택시는 두 번의 단거리 승차를 임시로 잡는다.
    const localCost = estimateCandidateLocalTransportCost(localTransportPreference, tripDays);
    const estimatedLocalCost = localCost.cost;
    const estimatedTotalCost = fare + estimatedFoodCost + estimatedLocalCost;
    const uncertaintyBuffer = Math.ceil((estimatedFoodCost + estimatedLocalCost) * BUFFER_RATE / 100) * 100;
    const safeKnownSubtotal = estimatedTotalCost + uncertaintyBuffer;
    const budgetStatus = estimatedTotalCost > budget
      ? "overBudget"
      : tripDays > 1
        ? "unknown"
        : safeKnownSubtotal > budget || budget - safeKnownSubtotal <= budget * 0.1 ? "nearLimit" : "withinBudget";
    const preference = scoreDestinationPreference(destination, preferenceProfile);
    candidates.push({
      destination,
      intercityTransportCost: fare,
      estimatedLocalCost,
      estimatedFoodCost,
      estimatedActivityCost: null,
      estimatedAccommodationCost: tripDays > 1 ? null : 0,
      duration: tripDays,
      estimatedTotalCost,
      safeTripCost: safeKnownSubtotal,
      safeKnownSubtotal,
      uncertaintyBuffer,
      remainingBudget: budget - estimatedTotalCost,
      expectedRemaining: budget - estimatedTotalCost,
      safeRemaining: budget - safeKnownSubtotal,
      overBudgetAmount: Math.max(0, estimatedTotalCost - budget),
      budgetStatus,
      priceSource: { intercityTransportCost: getFareSource?.(origin, destination) || "estimated", localTransportCost: localCost.source, foodCost: "estimated", activityCost: "unknown", accommodationCost: tripDays > 1 ? "unknown" : "user", otherCost: "unknown", uncertaintyBuffer: "estimated" },
      estimatedMealCount: mealCount,
      preferenceTags: preference.tags,
      preferenceScore: preference.score,
      recommendationReasons: preference.reasons
    });
  }
  const feasibilityRank = { withinBudget: 0, nearLimit: 1, unknown: 2, overBudget: 3 };
  return candidates.sort((a, b) =>
    (feasibilityRank[a.budgetStatus] ?? 1) - (feasibilityRank[b.budgetStatus] ?? 1)
    || b.preferenceScore - a.preferenceScore
    || a.safeTripCost / budget - b.safeTripCost / budget
    || a.destination.localeCompare(b.destination, "ko"));
}


