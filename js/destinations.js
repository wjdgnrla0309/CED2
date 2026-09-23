import { BUFFER_RATE } from "./budget.js";

export function generateDestinationCandidates({
  origin, travelBudget, tripType = "dayTrip", nights = 0, allowedDestinations = [], arrivalOptions = [],
  getRoundTripFare, scorePreference, estimateMeal
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
    const durationFactor = Math.max(1, Number(nights) + 1);
    const lodgingEstimate = Math.max(0, Number(nights) || 0) * Math.min(90000, Math.max(35000, Math.round(budget * 0.22 / 1000) * 1000));
    const estimatedTotalCost = fare + estimatedFoodCost * durationFactor + lodgingEstimate;
    const uncertaintyBuffer = Math.ceil((estimatedFoodCost * durationFactor + lodgingEstimate) * BUFFER_RATE / 100) * 100;
    const safeKnownSubtotal = estimatedTotalCost + uncertaintyBuffer;
    const preference = scorePreference?.(destination) || { tags: [], score: 0, reasons: [] };
    candidates.push({
      destination,
      intercityTransportCost: fare,
      estimatedLocalCost: null,
      estimatedFoodCost,
      estimatedActivityCost: null,
      estimatedTotalCost,
      safeTripCost: safeKnownSubtotal,
      safeKnownSubtotal,
      uncertaintyBuffer,
      remainingBudget: budget - estimatedTotalCost,
      expectedRemaining: budget - estimatedTotalCost,
      safeRemaining: budget - safeKnownSubtotal,
      lodgingEstimate,
      budgetStatus: safeKnownSubtotal > budget ? "overBudget" : "withinBudget",
      priceSource: { intercityTransportCost: "publicData", localTransportCost: "unknown", foodCost: "estimated", activityCost: "unknown", otherCost: "unknown", uncertaintyBuffer: "estimated" },
      estimatedMealCount: 2 * durationFactor,
      preferenceTags: preference.tags,
      preferenceScore: preference.score,
      recommendationReasons: preference.reasons
    });
  }
  return candidates
    .sort((a, b) => Number(a.budgetStatus === "overBudget") - Number(b.budgetStatus === "overBudget") || b.preferenceScore - a.preferenceScore || a.intercityTransportCost - b.intercityTransportCost || a.destination.localeCompare(b.destination, "ko"));
}


