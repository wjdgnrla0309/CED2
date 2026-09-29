// Reachability is a straight-line proxy until a live routing provider is available.
// maxMinutes are planning targets only; no transit/taxi duration is fabricated or shown.
export const KTX_ROUTES_DB = {
  "서울-강릉": { isTransfer: false, oneWay: 27600, duration: "1시간 50분", train: "KTX-이음" },
  // SR 공개 기준운임(2016~2017년 발표, 2025년 일부 재확인).
  // 수서 구간은 SRT 일반실 기준이며 할인·열차별 차이는 제외한다.
  "수서-천안아산": { isTransfer: false, oneWay: 11300, duration: "40분 내외", train: "SRT" },
  "수서-오송": { isTransfer: false, oneWay: 15400, duration: "50분 내외", train: "SRT" },
  "수서-대전": { isTransfer: false, oneWay: 20100, duration: "1시간 내외", train: "SRT" },
  "수서-광주송정": { isTransfer: false, oneWay: 40700, duration: "1시간 40분 내외", train: "SRT" },
  "수서-목포": { isTransfer: false, oneWay: 46500, duration: "2시간 20분 내외", train: "SRT" },
  "수서-동대구": { isTransfer: false, oneWay: 37400, duration: "1시간 30분 내외", train: "SRT" },
  "수서-부산": { isTransfer: false, oneWay: 52600, duration: "2시간 30분 내외", train: "SRT" },
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
    oneWay: 14100 + 27600, // 천안아산 → 서울 + 서울 → 강릉
    duration: "2시간 45분 (환승 포함)",
    train: "KTX + KTX-이음",
    leg1: { name: "천안아산역 ➔ 서울역 (KTX)", duration: "약 35분" },
    transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
    leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
  },
  "오송-강릉": {
    isTransfer: true,
    transferStation: "서울역",
    oneWay: 18500 + 27600, // 오송 → 서울 + 서울 → 강릉
    duration: "3시간 05분 (환승 포함)",
    train: "KTX + KTX-이음",
    leg1: { name: "오송역 ➔ 서울역 (KTX)", duration: "약 55분" },
    transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
    leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
  },
  "대전-강릉": {
    isTransfer: true,
    transferStation: "서울역",
    oneWay: 23700 + 27600, // 대전 → 서울 + 서울 → 강릉
    duration: "3시간 10분 (환승 포함)",
    train: "KTX + KTX-이음",
    leg1: { name: "대전역 ➔ 서울역 (KTX)", duration: "약 1시간" },
    transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
    leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
  },
  "동대구-강릉": {
    isTransfer: true,
    transferStation: "서울역",
    oneWay: 43500 + 27600, // 동대구 → 서울 + 서울 → 강릉
    duration: "3시간 55분 (환승 포함)",
    train: "KTX + KTX-이음",
    leg1: { name: "동대구역 ➔ 서울역 (KTX)", duration: "약 1시간 45분" },
    transferInfo: { station: "서울역", wait: "환승 대기 약 20분" },
    leg2: { name: "서울역 ➔ 강릉역 (KTX-이음)", duration: "약 1시간 50분" }
  }
};

// 출발역별 이용 가능한 도착역입니다. 강릉행은 서울역 환승 경로를 포함합니다.

export const DIRECT_RAIL_DESTINATIONS = {
  "서울": ["강릉", "천안아산", "오송", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
  "수서": ["천안아산", "오송", "대전", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
  "천안아산": ["서울", "수서", "오송", "대전", "강릉", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
  "오송": ["서울", "수서", "천안아산", "대전", "강릉", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
  "대전": ["서울", "수서", "천안아산", "오송", "강릉", "전주", "광주송정", "목포", "여수엑스포", "동대구", "경주", "울산", "부산", "진주"],
  "강릉": ["서울"],
  "전주": ["서울", "수서", "천안아산", "오송", "광주송정", "목포", "여수엑스포"],
  "광주송정": ["서울", "수서", "천안아산", "오송", "전주", "목포"],
  "목포": ["서울", "수서", "천안아산", "오송", "광주송정"],
  "여수엑스포": ["서울", "수서", "천안아산", "오송", "전주"],
  "동대구": ["서울", "수서", "천안아산", "오송", "대전", "강릉", "경주", "울산", "부산", "진주"],
  "경주": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "울산", "부산"],
  "울산": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "경주", "부산"],
  "부산": ["서울", "수서", "천안아산", "오송", "대전", "동대구", "경주", "울산"],
  "진주": ["서울", "수서", "천안아산", "오송", "대전", "동대구"]
};


export const RAIL_SERVICE_WINDOWS = {
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


export const DEFAULT_RAIL_SERVICE_WINDOW = { first: "06:00", last: "21:30" };

export function getRailServiceWindow(station) {
  return RAIL_SERVICE_WINDOWS[station] || DEFAULT_RAIL_SERVICE_WINDOW;
}


export function calculateKtxRouting(depart, arrival) {
  const key = `${depart}-${arrival}`;
  const revKey = `${arrival}-${depart}`;

  if (KTX_ROUTES_DB[key]) {
    const item = KTX_ROUTES_DB[key];
    return { ...item, isReversed: false,
      routeText: item.isTransfer ? `${depart}역 ➔ [${item.transferStation} 환승] ➔ ${arrival}역` : `${depart}역 ➔ ${arrival}역 (직통)` };
  }
  if (KTX_ROUTES_DB[revKey]) {
    const item = KTX_ROUTES_DB[revKey];
    return {
      ...item,
      isReversed: true,
      routeText: item.isTransfer ? `${depart}역 ➔ [${item.transferStation} 환승] ➔ ${arrival}역` : `${depart}역 ➔ ${arrival}역 (직통)`
    };
  }
  return null;
}

export function getKtxDurationMinutes(durationText) {
  const text = String(durationText || "");
  const hours = Number((text.match(/(\d+)시간/) || [0, 0])[1]);
  const minutes = Number((text.match(/(\d+)분/) || [0, 0])[1]);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

export const TRANSPORT_REACH_CONFIG = Object.freeze({
  walk: { maxMinutes: 20, maxStraightLineKm: 1.5 },
  publicTransit: { maxMinutes: 30, maxStraightLineKm: 6 },
  taxiAllowed: { maxMinutes: 20, maxStraightLineKm: 8 },
  auto: { maxMinutes: 30, maxStraightLineKm: 8 }
});

export function getDistanceKm(fromLat, fromLng, toLat, toLng) {
  const values = [fromLat, fromLng, toLat, toLng].map(Number);
  if (values.some(value => !Number.isFinite(value))) return null;
  const [latitudeA, longitudeA, latitudeB, longitudeB] = values;
  const radians = degrees => degrees * Math.PI / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const arc = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(arc));
}

export function normalizeRoutePoint(place = {}) {
  const lng = Number(place.mapx), lat = Number(place.mapy);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0
    ? { ...place, lat, lng }
    : { ...place, lat: null, lng: null };
}

export function calculateRouteDistance(a, b) {
  if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lng) || !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)) return null;
  return getDistanceKm(a.lat, a.lng, b.lat, b.lng);
}

export function optimizeRouteOrder(start, places, end = start) {
  const located = places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  const unlocated = places.filter(place => !Number.isFinite(place.lat) || !Number.isFinite(place.lng));
  let remaining = [...located], ordered = [];
  let current = Number.isFinite(start?.lat) ? start : remaining.shift() || null;
  if (!Number.isFinite(start?.lat) && current) ordered.push(current);
  while (remaining.length) {
    let bestIndex = 0, bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateRouteDistance(current, remaining[i]);
      if (distance !== null && distance < bestDistance) { bestDistance = distance; bestIndex = i; }
    }
    const [next] = remaining.splice(bestIndex, 1); ordered.push(next); current = next;
  }
  const route = [start, ...ordered, end];
  const total = points => points.slice(1).reduce((sum, point, index) => sum + (calculateRouteDistance(points[index], point) ?? NaN), 0);
  const fullyLocated = route.every(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng));
  if (fullyLocated) {
    let improved = true, rounds = 0;
    while (improved && rounds++ < 20) {
      improved = false;
      for (let i = 1; i < route.length - 2; i++) for (let j = i + 1; j < route.length - 1; j++) {
        const before = calculateRouteDistance(route[i - 1], route[i]) + calculateRouteDistance(route[j], route[j + 1]);
        const after = calculateRouteDistance(route[i - 1], route[j]) + calculateRouteDistance(route[i], route[j + 1]);
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

export function clusterRoutePlaces(places, radiusKm = 8) {
  const located = places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  const parent = located.map((_, index) => index);
  const find = index => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const join = (a, b) => { const rootA = find(a), rootB = find(b); if (rootA !== rootB) parent[rootB] = rootA; };
  for (let i = 0; i < located.length; i++) for (let j = i + 1; j < located.length; j++) {
    const distance = calculateRouteDistance(located[i], located[j]); if (distance !== null && distance <= radiusKm) join(i, j);
  }
  const groups = new Map();
  located.forEach((place, index) => { const key = find(index); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(place); });
  return [...groups.values()].map((items, index) => ({ id: `cluster-${index + 1}`, radiusKm, stopIds: items.map(item => item.id), places: items.map(item => item.name), center: { lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length, lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length } }));
}

export function optimizeClusteredRoute(start, places, end = start) {
  const global = optimizeRouteOrder(start, places, end);
  const clusters = clusterRoutePlaces(places);
  if (clusters.length < 2 || places.some(place => !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) return { ...global, clusters };
  const remaining = [...clusters], groupedOrder = [];
  let current = start;
  while (remaining.length) {
    remaining.sort((a, b) => (calculateRouteDistance(current, a.center) ?? Infinity) - (calculateRouteDistance(current, b.center) ?? Infinity));
    const cluster = remaining.shift();
    const members = places.filter(place => cluster.stopIds.includes(place.id));
    const ordered = optimizeRouteOrder(current, members, current).ordered;
    groupedOrder.push(...ordered);
    current = ordered.at(-1) || current;
  }
  const total = order => [start, ...order, end].slice(1).reduce((sum, point, index, points) => {
    const previous = index === 0 ? start : points[index - 1];
    return sum + (calculateRouteDistance(previous, point) ?? Infinity);
  }, 0);
  const clusteredDistanceKm = total(groupedOrder);
  return clusteredDistanceKm + 0.0001 < (global.optimizedDistanceKm ?? Infinity)
    ? { ordered: groupedOrder, initialDistanceKm: global.initialDistanceKm, optimizedDistanceKm: clusteredDistanceKm, clusters }
    : { ...global, clusters };
}

export function insertStopsByShortestDistance(start, fixed, extra, distance = calculateRouteDistance) {
  const ordered = [...fixed];
  const routeLength = items => [start, ...items, start].slice(1).reduce((sum, point, index, list) => sum + (distance(index ? list[index - 1] : start, point) ?? Infinity), 0);
  for (const place of extra) {
    let bestIndex = 0, bestDistance = Infinity;
    for (let index = 0; index <= ordered.length; index++) {
      const option = [...ordered]; option.splice(index, 0, place);
      const candidateDistance = routeLength(option);
      if (candidateDistance < bestDistance) { bestDistance = candidateDistance; bestIndex = index; }
    }
    ordered.splice(bestIndex, 0, place);
  }
  return { ordered, distanceKm: routeLength(ordered) };
}

export function estimateCandidateLocalTransportCost(preference = "walk", days = 1) {
  const tripDays = Math.max(1, Math.floor(Number(days) || 1));
  const estimates = { walk: { dailyCost: 0, source: "user" }, publicTransit: { dailyCost: 3200, source: "estimated" }, taxiAllowed: { dailyCost: 14000, source: "estimated" }, auto: { dailyCost: 3200, source: "estimated" } };
  const estimate = estimates[preference] || { dailyCost: 3200, source: "fallback" };
  return { cost: estimate.dailyCost * tripDays, source: estimate.source, unit: "KRW", days: tripDays };
}

export function transportDistanceLimitKm(preference = "auto") {
  return TRANSPORT_REACH_CONFIG[preference]?.maxStraightLineKm ?? TRANSPORT_REACH_CONFIG.auto.maxStraightLineKm;
}

export function assessStraightLineReachability(distanceKm, preference = "auto") {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < 0) return { reachable: null, distanceKm: null, source: "unknown" };
  return {
    reachable: distance <= transportDistanceLimitKm(preference),
    distanceKm: distance,
    source: "straightLineEstimate",
    confidence: "low"
  };
}

export function routeModeForPreference(preference, distance) {
  if (preference === "walk") return { mode: "walk", source: "user" };
  if (preference === "publicTransit") return { mode: "publicTransit", source: "user" };
  if (preference === "taxiAllowed") {
    if (distance === null) return { mode: "unknown", source: "unknown" };
    if (distance <= 1.2) return { mode: "walk", source: "estimated" };
    if (distance <= 6) return { mode: "publicTransit", source: "estimated" };
    return { mode: "taxi", source: "estimated" };
  }
  if (preference === "auto") {
    if (distance === null) return { mode: "unknown", source: "unknown" };
    if (distance <= 1.2) return { mode: "walk", source: "estimated" };
    return { mode: "publicTransit", source: "estimated" };
  }
  return { mode: "unknown", source: "unknown" };
}

// 직선거리에 근거한 계획용 예상액이다. 실제 노선·요금 조회값으로 표시하지 않는다.
export function estimateLocalSegment(distanceKm, mode) {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < 0) return { cost: null, minutes: null, source: "unknown" };
  if (mode === "walk") return { cost: 0, minutes: Math.ceil(distance / 4 * 60), source: "estimated" };
  if (mode === "publicTransit") return {
    cost: 1600 + Math.max(0, Math.ceil((distance - 10) / 5)) * 100,
    minutes: Math.ceil(distance / 18 * 60) + 8,
    source: "estimated"
  };
  if (mode === "taxi") return {
    cost: Math.ceil((4800 + Math.max(0, distance - 1.6) * 1200) / 100) * 100,
    minutes: Math.ceil(distance / 25 * 60) + 5,
    source: "estimated"
  };
  return { cost: null, minutes: null, source: "unknown" };
}
