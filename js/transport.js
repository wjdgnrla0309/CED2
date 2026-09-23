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
    if (distance <= 6) return { mode: "publicTransit", source: "estimated" };
    return { mode: "unknown", source: "unknown" };
  }
  return { mode: "unknown", source: "unknown" };
}
