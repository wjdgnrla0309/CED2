import { BUFFER_RATE } from "./budget.js";

export function generateDestinationCandidates({
  origin, travelBudget, localTransportPreference = "walk", allowedDestinations = [], arrivalOptions = [],
  getRoundTripFare, getFareSource, scorePreference, estimateMeal
} = {}) {
  const budget = Number(travelBudget);
  if (!origin || !Number.isFinite(budget) || budget <= 0) return [];
  const candidates = [];
  for (const option of arrivalOptions) {
    const destination = option.value;
    if (!destination || destination === origin || !allowedDestinations.includes(destination)) continue;
    const fare = getRoundTripFare?.(origin, destination);
    if (!Number.isFinite(fare) || fare < 0) continue;
    const lunch = estimateMeal?.({}, "lunch", { travelBudget: budget, intercityCost: fare, region: destination });
    const dinner = estimateMeal?.({}, "dinner", { travelBudget: budget, intercityCost: fare, region: destination });
    if (!lunch || !dinner) continue;
    const estimatedFoodCost = lunch.cost + dinner.cost;
    // 장소를 고르기 전에는 현지 이동 구간과 입장료를 알 수 없다.
    // 대중교통은 하루 두 번의 기본요금, 택시는 두 번의 단거리 승차를 임시로 잡는다.
    const estimatedLocalCost = { walk: 0, publicTransit: 3200, taxiAllowed: 14000, auto: 3200 }[localTransportPreference] ?? 3200;
    const estimatedTotalCost = fare + estimatedFoodCost + estimatedLocalCost;
    const uncertaintyBuffer = Math.ceil((estimatedFoodCost + estimatedLocalCost) * BUFFER_RATE / 100) * 100;
    const safeKnownSubtotal = estimatedTotalCost + uncertaintyBuffer;
    const preference = scorePreference?.(destination) || { tags: [], score: 0, reasons: [] };
    candidates.push({
      destination,
      intercityTransportCost: fare,
      estimatedLocalCost,
      estimatedFoodCost,
      estimatedActivityCost: null,
      estimatedTotalCost,
      safeTripCost: safeKnownSubtotal,
      safeKnownSubtotal,
      uncertaintyBuffer,
      remainingBudget: budget - estimatedTotalCost,
      expectedRemaining: budget - estimatedTotalCost,
      safeRemaining: budget - safeKnownSubtotal,
      overBudgetAmount: Math.max(0, safeKnownSubtotal - budget),
      budgetStatus: safeKnownSubtotal > budget ? "overBudget" : "withinBudget",
      priceSource: { intercityTransportCost: getFareSource?.(origin, destination) || "estimated", localTransportCost: localTransportPreference === "walk" ? "user" : "estimated", foodCost: "estimated", activityCost: "unknown", otherCost: "unknown", uncertaintyBuffer: "estimated" },
      estimatedMealCount: 2,
      preferenceTags: preference.tags,
      preferenceScore: preference.score,
      recommendationReasons: preference.reasons
    });
  }
  return candidates
    .sort((a, b) => Number(a.budgetStatus === "overBudget") - Number(b.budgetStatus === "overBudget") || b.preferenceScore - a.preferenceScore || a.intercityTransportCost - b.intercityTransportCost || a.destination.localeCompare(b.destination, "ko"));
}


