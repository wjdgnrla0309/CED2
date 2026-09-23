import { normalizeCost } from "./budget.js";

export function calculateMealBudgetTarget({ travelBudget, fixedCosts = 0, remainingMeals = 1 } = {}) {
  const budget = normalizeCost(travelBudget);
  const fixed = normalizeCost(fixedCosts) ?? 0;
  const meals = Math.max(1, Math.floor(Number(remainingMeals) || 1));
  return budget === null ? null : Math.max(0, budget - fixed) / meals;
}

export function chooseMealCandidate(options = [], { target = null, preferenceFocus = null, anchor = null, routePoint, routeDistance } = {}) {
  return [...options].filter(item => item.priceSource !== "unknown" && normalizeCost(item.cost) !== null).sort((a, b) => {
    const aCost = normalizeCost(a.cost), bCost = normalizeCost(b.cost);
    const aFits = target === null || aCost <= target, bFits = target === null || bCost <= target;
    if (aFits !== bFits) return aFits ? -1 : 1;
    const preferredCategory = preferenceFocus === "cafe" ? "cafe" : preferenceFocus === "food" ? null : "";
    const aPreference = preferredCategory && a.foodCategory === preferredCategory ? 1 : 0;
    const bPreference = preferredCategory && b.foodCategory === preferredCategory ? 1 : 0;
    if (aPreference !== bPreference) return bPreference - aPreference;
    const aDistance = anchor && routePoint ? routeDistance(anchor, routePoint(a)) : null;
    const bDistance = anchor && routePoint ? routeDistance(anchor, routePoint(b)) : null;
    if (aDistance !== null || bDistance !== null) return (aDistance ?? Infinity) - (bDistance ?? Infinity) || aCost - bCost;
    return aCost - bCost;
  })[0] || options[0] || null;
}
