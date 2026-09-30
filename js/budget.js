export const BUFFER_RATE = 0.10;

export function normalizeCost(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function calculateTripBudget(input = {}) {
  const rawBudget = normalizeCost(input.travelBudget ?? input.budget);
  const budget = rawBudget !== null && rawBudget > 0 ? rawBudget : null;
  const keys = ["intercityTransportCost", "localTransportCost", "foodCost", "activityCost", "otherCost"];
  if (Object.prototype.hasOwnProperty.call(input, "accommodationCost")) keys.splice(4, 0, "accommodationCost");
  const costs = Object.fromEntries(keys.map(key => [key, normalizeCost(input[key])]));
  const unknownCosts = keys.filter(key => costs[key] === null);
  const expectedTotal = unknownCosts.length ? null : keys.reduce((sum, key) => sum + costs[key], 0);
  const knownSubtotal = keys.reduce((sum, key) => sum + (costs[key] ?? 0), 0);
  const expectedRemaining = budget !== null && expectedTotal !== null ? budget - expectedTotal : null;
  const priceSource = { ...(input.priceSource || {}) };
  const uncertainCost = keys.reduce((sum, key) =>
    sum + (priceSource[key] === "estimated" || priceSource[key] === "fallback" ? (costs[key] ?? 0) : 0), 0);
  const uncertaintyBuffer = Math.ceil(uncertainCost * BUFFER_RATE / 100) * 100;
  const safeTotal = expectedTotal === null ? null : expectedTotal + uncertaintyBuffer;
  const safeRemaining = budget !== null && safeTotal !== null ? budget - safeTotal : null;
  // 초과액은 안전 여유분이 아니라 예상 지출 자체가 예산을 넘은 금액으로 표시한다.
  // 안전 여유분 부족은 feasibilityStatus의 "tight"로 별도 구분한다.
  const overBudgetAmount = budget === null ? null : Math.max(0, -(expectedRemaining ?? (budget - knownSubtotal)));
  const totalCost = expectedTotal;
  const remainingBudget = expectedRemaining;
  let feasibilityStatus = "unknown";
  if (expectedRemaining !== null && expectedRemaining < 0) feasibilityStatus = "overBudget";
  else if (safeRemaining !== null) feasibilityStatus = safeRemaining < 0 ? "tight" : "safe";
  else if (budget !== null && knownSubtotal > budget) feasibilityStatus = "overBudget";
  let budgetStatus = "unknown";
  if (feasibilityStatus === "overBudget") budgetStatus = "overBudget";
  else if (feasibilityStatus === "tight") budgetStatus = "nearLimit";
  else if (feasibilityStatus === "safe") budgetStatus = safeRemaining <= budget * 0.1 ? "nearLimit" : "withinBudget";
  else if (budget !== null && knownSubtotal > budget) budgetStatus = "overBudget";
  return { budget, costs, totalCost, expectedTotal, safeTotal, knownSubtotal, remainingBudget, expectedRemaining, safeRemaining, overBudgetAmount, uncertaintyBuffer, uncertainCost, feasibilityStatus, budgetStatus, unknownCosts, priceSource };
}
