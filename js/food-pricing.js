import { normalizeCost } from "./budget.js";

export const FOOD_PRICE_MODEL = Object.freeze({
  gukbap: { mean: 11000, std: 2500 }, bunsik: { mean: 9000, std: 2500 },
  korean: { mean: 13000, std: 3500 }, chinese: { mean: 14000, std: 4000 },
  japanese: { mean: 16000, std: 5000 }, porkCutlet: { mean: 13000, std: 3500 },
  western: { mean: 19000, std: 6000 }, meat: { mean: 26000, std: 8000 },
  cafe: { mean: 7000, std: 2500 }, default: { mean: 15000, std: 5000 }
});

export const FOOD_REGION_ADJUSTMENTS = Object.freeze({});
export const DEFAULT_FOOD_REGION_FACTOR = 1;
export const FOOD_SAFETY_PRESSURE_THRESHOLDS = Object.freeze([
  { max: 0.45, k: 0.4 }, { max: 0.65, k: 0.6 }, { max: 0.80, k: 0.8 }, { max: Infinity, k: 1.0 }
]);

export function getFoodCategory(item = {}) {
  const text = [item.foodCategory, item.category_name, item.menu, item.title, item.name, item.why].filter(Boolean).join(" ").toLowerCase();
  if (/국밥|해장국|순댓국|설렁탕/.test(text)) return "gukbap";
  if (/분식|김밥|떡볶이|라면|우동|국수/.test(text)) return "bunsik";
  if (/돈까스|돈가스|카츠|pork.?cutlet/.test(text)) return "porkCutlet";
  if (/중식|중국집|짜장|짬뽕|마라|양꼬치/.test(text)) return "chinese";
  if (/일식|초밥|스시|회전초밥|라멘|돈부리|오마카세/.test(text)) return "japanese";
  if (/고기|한우|갈비|삼겹|정육|대게|킹크랩|횟집|회\b|해산물|샤브/.test(text)) return "meat";
  if (/양식|파스타|스테이크|피자|버거|브런치/.test(text)) return "western";
  if (/카페|커피|베이커리|디저트/.test(text)) return "cafe";
  if (/한식|백반|비빔밥|가정식/.test(text)) return "korean";
  return "default";
}

export function getBudgetSafetyFactor(travelBudget, fixedCost) {
  const budget = normalizeCost(travelBudget), fixed = normalizeCost(fixedCost);
  const pressure = budget > 0 && fixed !== null ? fixed / budget : 0;
  return FOOD_SAFETY_PRESSURE_THRESHOLDS.find(rule => pressure < rule.max)?.k ?? 1;
}

export function estimateMealDetails(item = {}, mealType = "lunch", options = {}) {
  const foodCategory = item.foodCategory || getFoodCategory(item);
  const model = FOOD_PRICE_MODEL[foodCategory] || FOOD_PRICE_MODEL.default;
  const state = globalThis.currentPlanState || {};
  const budget = normalizeCost(options.travelBudget ?? state.travelBudget ?? state.budget);
  const intercity = normalizeCost(options.intercityCost ?? state.intercityTransportCost ?? state.ktxTotal ?? state.flightTotal) ?? 0;
  const knownActivity = normalizeCost(options.knownActivityCost ?? state.knownActivityCost) ?? 0;
  const fixedCost = intercity + knownActivity + (normalizeCost(options.otherFixedCost) ?? 0);
  const k = getBudgetSafetyFactor(budget, fixedCost);
  const region = String(options.region || state.destinationCity || state.arrival || "");
  const configuredRegionFactor = normalizeCost(FOOD_REGION_ADJUSTMENTS[region]);
  const regionFactor = configuredRegionFactor > 0 ? configuredRegionFactor : DEFAULT_FOOD_REGION_FACTOR;
  const expected = model.mean * regionFactor + k * model.std;
  const cost = Math.max(0, Math.round(expected / 100) * 100);
  const min = Math.max(0, Math.round(model.mean * regionFactor / 100) * 100);
  const max = Math.max(cost, Math.round((model.mean * regionFactor + model.std) / 100) * 100);
  return { foodCategory, mean: model.mean, std: model.std, safetyFactor: k, regionFactor, cost, priceMin: min, priceMax: max, priceSource: "estimated", priceEstimated: true, priceModel: "category-model" };
}

export function estimateMealCost(item, mealType = "lunch", options = {}) {
  return estimateMealDetails(item, mealType, options).cost;
}

export function applyEstimatedPriceRange(item, type, context = {}) {
  if (type !== "meal") return item;
  if (item.priceSource === "api" && normalizeCost(item.cost) !== null) return item;
  return { ...item, ...estimateMealDetails(item, context.mealType || "lunch", context), priceBasis: "음식 종류별 통계 기반 1인 추정" };
}
