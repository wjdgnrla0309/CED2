// Reachability is a straight-line proxy until a live routing provider is available.
// maxMinutes are planning targets only; no transit/taxi duration is fabricated or shown.
export const TRANSPORT_REACH_CONFIG = Object.freeze({
  walk: { maxMinutes: 20, maxStraightLineKm: 1.5 },
  publicTransit: { maxMinutes: 30, maxStraightLineKm: 6 },
  taxiAllowed: { maxMinutes: 20, maxStraightLineKm: 8 },
  auto: { maxMinutes: 30, maxStraightLineKm: 8 }
});

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
