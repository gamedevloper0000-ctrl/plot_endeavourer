// One small game model shared by the map, market, shop, and goal views.
export const COLS = 12;
export const ROWS = 10;
export const TICK_MS = 3500;
export const DAYS_PER_MONTH = 30;
export const SALE_FEE_RATE = .05;
export const TWIST_BONUS = 35;
export const BUILDING = { cost: 320, radius: 2, valuePerDay: 7, selfValuePerDay: 4,
  resaleValue: 200, maxPlotBonus: 280 };
export const TYPES = [
  { name: "Sunfield", sprite: 1, base: 185, color: "#e6bd62", phase: 0.2, note: "Open, sunny lots" },
  { name: "Meadow", sprite: 2, base: 230, color: "#93bd72", phase: 1.7, note: "Green pasture" },
  { name: "Grove", sprite: 3, base: 285, color: "#568b67", phase: 3.2, note: "Wooded parcels" },
  { name: "Waterfront", sprite: 4, base: 345, color: "#68a9bd", phase: 4.6, note: "Lakeside ground" }
];
export const CUSTOMERS = [
  { id: "mara", name: "Mara", role: "Surveyor", icon: "▧" },
  { id: "dax", name: "Dax", role: "Mechanic", icon: "⚙" },
  { id: "nell", name: "Nell", role: "Courier", icon: "✉" }
];
export const ORDERS = [
  { name: "Honey latte", ingredients: ["SHOT", "MILK", "HONEY"], customer: "mara", target: 68, pay: 52,
    line: "The road on that old survey keeps changing places." },
  { name: "Cinnamon cappuccino", ingredients: ["SHOT", "FOAM", "CINNAMON"], customer: "dax", target: 38, pay: 56,
    line: "Someone has been swapping the town's deed numbers at night." },
  { name: "Iced mocha", ingredients: ["SHOT", "CHOCOLATE", "ICE"], customer: "nell", target: 73, pay: 60,
    line: "I delivered a stamped deed to the bright yellow lot." },
  { name: "Double espresso", ingredients: ["SHOT", "SHOT"], customer: "mara", target: 47, pay: 48,
    line: "There is a handle behind the town map. I have seen it." }
];
export const INGREDIENTS = ["SHOT", "MILK", "FOAM", "HONEY", "CINNAMON", "CHOCOLATE", "ICE"];
export const EMPLOYEES = [
  { id: "analyst", name: "Market Analyst", symbol: "⌁", costs: [180, 300], benefit: ["7-day trend reports", "3-day price forecasts"] },
  { id: "agent", name: "Land Agent", symbol: "⌂", costs: [120, 220], benefit: ["2% cheaper land", "4% cheaper land"] },
  { id: "accountant", name: "Accountant", symbol: "▤", costs: [60, 100], benefit: ["20% lower monthly bills", "40% lower monthly bills"] },
  { id: "manager", name: "Coffee Manager", symbol: "☕", costs: [200, 340], benefit: ["12% higher order pay", "24% higher order pay"] }
];

const STORAGE_KEY = "plot-endeavourer-save-v1";
const listeners = new Set();
const hash = (x, y, seed) => ((x * 73856093) ^ (y * 19349663) ^ seed) >>> 0;
export const plotId = (x, y) => `${x}-${y}`;
export const isRoad = (x, y) => x === 5 || y === 4;

function makePlot(x, y, seed) {
  const patch = (Math.floor(x / 3) * 3 + Math.floor(y / 2) * 5 + (hash(x, y, seed) % 3)) % 4;
  const basePrice = Math.round(TYPES[patch].base * (0.83 + (hash(y, x, seed) % 35) / 100));
  return {
    id: plotId(x, y), x, y, type: patch, owner: null,
    basePrice, currentPrice: basePrice, currentValue: basePrice,
    purchasePrice: null, costBasis: null, building: null,
    buildingEffects: 0, surveyBonus: 0, priceHistory: [basePrice]
  };
}

function marketMultiplier(type, day) {
  const phase = TYPES[type].phase;
  const wave = 0.16 * (Math.sin(day / 5.5 + phase) - Math.sin(phase));
  const longWave = 0.09 * (Math.sin(day / 16 + phase * 1.3) - Math.sin(phase * 1.3));
  return Math.max(0.72, Math.min(1.55, 1 + wave + longWave + Math.min(day * 0.0015, 0.17)));
}

function makeState(seed = Math.floor(Math.random() * 0x7fffffff)) {
  const plots = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isRoad(x, y)) plots.push(makePlot(x, y, seed));
    }
  }
  const market = TYPES.map((type, index) => ({
    basePrice: type.base, currentPrice: type.base, previousPrice: type.base,
    history: [type.base], movement: 0, type: index
  }));
  const nearbySunfields = plots.filter(plot => plot.type === 0 && plot.x < 5 && plot.y < 4);
  const marked = (nearbySunfields.length ? nearbySunfields : plots.filter(plot => plot.type === 0))
    .sort((a, b) => a.basePrice - b.basePrice);
  return {
    version: 1, seed, money: 120, gameTime: 0, plots, market,
    ownedPlots: [], plotPrices: Object.fromEntries(plots.map(plot => [plot.id, plot.currentPrice])),
    buildings: [], selectedId: null,
    coffeeShopProgress: { step: "new", orderIndex: 0, served: 0, correctDeliveries: 0,
      ingredientIndex: 0, mistakes: 0, brewGrade: 0, cleanOrders: 0, twistPerfectProgress: 0 },
    story: { chapter: 0, anomalyId: (marked[0] || plots[0]).id, twistCharges: 0, twists: 0,
      lastLine: "Someone scratched a spiral into the town map." },
    employees: Object.fromEntries(EMPLOYEES.map(employee => [employee.id, 0])),
    finance: { startingWealth: 120, trackingSinceDay: 0, coffeeEarnings: 0, realizedLandProfit: 0,
      insurancePaid: 0, taxPaid: 0, staffSpent: 0, buildingsBuilt: 0, worstDeal: null,
      lastBill: null, history: [] },
    carGoal: { price: 3900, purchased: false, availabilityAnnounced: false }, lastEvent: null
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const fresh = makeState(saved?.seed);
    if (saved?.version === 1 && Number.isInteger(saved.seed) && saved.seed >= 0 &&
        Array.isArray(saved.plots) && saved.plots.length === 99 &&
        Array.isArray(saved.market) && saved.market.length === 4 && Number.isFinite(saved.money) &&
        Number.isInteger(saved.gameTime) && saved.gameTime >= 0 &&
        saved.plots.every((plot, index) => plot.id === fresh.plots[index].id &&
          Number.isInteger(plot.type) && plot.type >= 0 && plot.type < TYPES.length &&
          Number.isFinite(plot.currentValue) &&
          Number.isFinite(plot.basePrice) && Number.isFinite(plot.buildingEffects) &&
          Array.isArray(plot.priceHistory)) &&
        saved.market.every(entry => Number.isFinite(entry.currentPrice) && Array.isArray(entry.history)) &&
        Array.isArray(saved.ownedPlots) && Array.isArray(saved.buildings) &&
        saved.carGoal && Number.isFinite(saved.carGoal.price) && saved.coffeeShopProgress &&
        Number.isInteger(saved.coffeeShopProgress.orderIndex) && saved.coffeeShopProgress.orderIndex >= 0 &&
        Number.isInteger(saved.coffeeShopProgress.served) && saved.coffeeShopProgress.served >= 0 &&
        ["new", "prepared", "completed"].includes(saved.coffeeShopProgress.step)) {
      saved.coffeeShopProgress = { ...fresh.coffeeShopProgress, ...saved.coffeeShopProgress };
      for (const plot of saved.plots) {
        if (!Number.isFinite(plot.surveyBonus) || plot.surveyBonus < 0) plot.surveyBonus = 0;
      }
      if (!saved.story || !getPlotFrom(saved.plots, saved.story.anomalyId)) {
        saved.story = { ...fresh.story };
        if (saved.coffeeShopProgress.served >= 2) saved.story.chapter = 1;
        if (getPlotFrom(saved.plots, saved.story.anomalyId)?.owner === "player") {
          saved.story.chapter = 2;
          saved.story.twistCharges = 1;
        }
      }
      saved.story = { ...fresh.story, ...saved.story };
      if (!Number.isInteger(saved.story.chapter) || saved.story.chapter < 0 || saved.story.chapter > 3) saved.story.chapter = fresh.story.chapter;
      if (!Number.isInteger(saved.story.twistCharges) || saved.story.twistCharges < 0 || saved.story.twistCharges > 3) saved.story.twistCharges = 0;
      if (!Number.isInteger(saved.story.twists) || saved.story.twists < 0) saved.story.twists = 0;
      if (![fresh.story.lastLine, ...ORDERS.map(order => order.line)].includes(saved.story.lastLine)) saved.story.lastLine = fresh.story.lastLine;
      saved.coffeeShopProgress.ingredientIndex = Math.max(0, Math.min(ORDERS[saved.coffeeShopProgress.orderIndex % ORDERS.length].ingredients.length,
        Number.isInteger(saved.coffeeShopProgress.ingredientIndex) ? saved.coffeeShopProgress.ingredientIndex : 0));
      saved.coffeeShopProgress.mistakes = Math.max(0, Math.min(3,
        Number.isInteger(saved.coffeeShopProgress.mistakes) ? saved.coffeeShopProgress.mistakes : 0));
      saved.coffeeShopProgress.brewGrade = Math.max(0, Math.min(2,
        Number.isInteger(saved.coffeeShopProgress.brewGrade) ? saved.coffeeShopProgress.brewGrade : 0));
      if (!Number.isInteger(saved.coffeeShopProgress.correctDeliveries) || saved.coffeeShopProgress.correctDeliveries < 0) saved.coffeeShopProgress.correctDeliveries = 0;
      if (!Number.isInteger(saved.coffeeShopProgress.cleanOrders) || saved.coffeeShopProgress.cleanOrders < 0) saved.coffeeShopProgress.cleanOrders = 0;
      if (!Number.isInteger(saved.coffeeShopProgress.twistPerfectProgress) || saved.coffeeShopProgress.twistPerfectProgress < 0 || saved.coffeeShopProgress.twistPerfectProgress > 2) saved.coffeeShopProgress.twistPerfectProgress = 0;
      saved.employees = Object.fromEntries(EMPLOYEES.map(employee => [employee.id,
        Number.isInteger(saved.employees?.[employee.id]) ? Math.max(0, Math.min(2, saved.employees[employee.id])) : 0]));
      const previousFinance = saved.finance;
      saved.finance = { ...fresh.finance, ...(previousFinance || {}) };
      if (!previousFinance) {
        // Older saves have no reliable earnings ledger. Start tracking from their actual current wealth.
        saved.finance.startingWealth = saved.money + saved.plots.filter(plot => plot.owner === "player")
          .reduce((sum, plot) => sum + plot.currentValue, 0) + (saved.carGoal.purchased ? saved.carGoal.price : 0);
        saved.finance.trackingSinceDay = saved.gameTime;
        saved.finance.buildingsBuilt = saved.plots.filter(plot => plot.building).length;
      }
      for (const key of ["startingWealth", "trackingSinceDay", "coffeeEarnings", "realizedLandProfit", "insurancePaid", "taxPaid", "staffSpent", "buildingsBuilt"]) {
        if (!Number.isFinite(saved.finance[key])) saved.finance[key] = fresh.finance[key];
      }
      saved.finance.history = Array.isArray(saved.finance.history) ? saved.finance.history.filter(entry =>
        entry && Number.isInteger(entry.day) && Number.isFinite(entry.amount) &&
        ["coffee", "buy", "sell", "build", "staff", "bill", "car"].includes(entry.kind)).slice(-120) : [];
      if (!saved.finance.lastBill || !["month", "insurance", "tax", "total", "wealth"].every(key => Number.isFinite(saved.finance.lastBill[key]))) saved.finance.lastBill = null;
      if (!saved.finance.worstDeal || !Number.isFinite(saved.finance.worstDeal.profit) ||
          !Number.isInteger(saved.finance.worstDeal.type) || !TYPES[saved.finance.worstDeal.type]) saved.finance.worstDeal = null;
      saved.carGoal = { ...fresh.carGoal, ...saved.carGoal,
        availabilityAnnounced: saved.carGoal.availabilityAnnounced === true };
      return saved;
    }
  } catch { /* Corrupt or disabled storage starts a fresh run. */ }
  return makeState();
}

export const state = loadState();
function getPlotFrom(plots, id) { return plots.find(plot => plot.id === id) || null; }
export const getPlot = id => getPlotFrom(state.plots, id);
export const selectedPlot = () => getPlot(state.selectedId);
export const ownedValue = () => state.plots.filter(plot => plot.owner === "player")
  .reduce((sum, plot) => sum + plot.currentValue, 0);
export const ownedBuildings = () => state.plots.filter(plot => plot.owner === "player" && plot.building).length;
export const employeeLevel = id => state.employees[id] || 0;
export const purchaseCost = plot => Math.max(1, Math.round(plot.currentPrice * (1 - employeeLevel("agent") * .02)));
// The closing fee is greater than the maximum agent discount, preventing instant buy/sell arbitrage.
export const saleValue = plot => Math.max(0, Math.floor(plot.currentValue * (1 - SALE_FEE_RATE)));
// currentValue already includes a building's resale value. Adding buildings again would double-tax them.
export const economyValue = () => Math.max(0, state.money + ownedValue());
// The purchased car remains an achievement asset, so buying it does not erase the run's earned profit.
export const netRunProfit = () => state.money + ownedValue() + (state.carGoal.purchased ? state.carGoal.price : 0) - state.finance.startingWealth;
export const daysUntilBill = () => DAYS_PER_MONTH - state.gameTime % DAYS_PER_MONTH;

export function monthlyBillQuote() {
  const wealth = economyValue();
  const rate = .01 * (1 - employeeLevel("accountant") * .2);
  const total = wealth > 0 ? Math.max(1, Math.round(wealth * rate)) : 0;
  const insurance = Math.round(total * .4);
  return { month: Math.floor(state.gameTime / DAYS_PER_MONTH) + 1, wealth, rate, insurance, tax: total - insurance, total };
}

function recordFinance(kind, amount, extra = {}) {
  state.finance.history.push({ kind, amount, day: state.gameTime, ...extra });
  if (state.finance.history.length > 120) state.finance.history.shift();
}

export function upgradeEmployee(id) {
  const employee = EMPLOYEES.find(entry => entry.id === id);
  if (!employee) return false;
  const level = employeeLevel(id);
  const cost = employee.costs[level];
  if (cost === undefined) return false;
  if (state.money < cost) { publish("no-money", { amount: cost - state.money }); return false; }
  state.money -= cost;
  state.employees[id] = level + 1;
  state.finance.staffSpent += cost;
  recordFinance("staff", -cost);
  publish("employee-upgrade", { employeeId: id, level: level + 1, amount: cost });
  return true;
}

export function marketChange(type, lookback = 7) {
  const history = state.market[type].history;
  const previous = history[Math.max(0, history.length - 1 - lookback)];
  return previous ? (history.at(-1) - previous) / previous * 100 : 0;
}

export function marketAdvice() {
  const tips = [];
  const changes = TYPES.map((_, index) => ({ type: index, change: marketChange(index) }));
  const rising = [...changes].sort((a, b) => b.change - a.change)[0];
  const falling = [...changes].sort((a, b) => a.change - b.change)[0];
  const analyst = employeeLevel("analyst");
  if (analyst) {
    const days = Math.min(7, state.market[0].history.length - 1);
    tips.push({ employee: "analyst", tone: "up", text: days ?
      `${TYPES[rising.type].name} has the strongest ${days}-day move: ${rising.change >= 0 ? "+" : ""}${rising.change.toFixed(1)}%. ${rising.change > 0 ? "Owners could take profit here." : "All types are soft; keep cash for a better entry."}` :
      "The price record has just started. Give the market a few days before trusting a trend." });
    if (days && falling.change < 0) tips.push({ employee: "analyst", tone: "down", text:
      `${TYPES[falling.type].name} is down ${Math.abs(falling.change).toFixed(1)}% over ${days} days. Its lower price may be an entry, but the trend is still falling.` });
    if (analyst === 2) {
      const forecasts = TYPES.map((type, index) => ({ type: index,
        change: (Math.round(type.base * marketMultiplier(index, state.gameTime + 3)) - state.market[index].currentPrice) / state.market[index].currentPrice * 100 }));
      const warning = [...forecasts].sort((a, b) => a.change - b.change)[0];
      const opportunity = [...forecasts].sort((a, b) => b.change - a.change)[0];
      tips.push({ employee: "analyst", tone: warning.change < -1 ? "down" : "up", text:
        `3-day cycle forecast: ${TYPES[opportunity.type].name} ${opportunity.change >= 0 ? "+" : ""}${opportunity.change.toFixed(1)}%; ${TYPES[warning.type].name} ${warning.change >= 0 ? "+" : ""}${warning.change.toFixed(1)}%. This forecast covers the market cycle; building gains are extra.` });
    }
  }
  if (employeeLevel("agent")) {
    const plot = selectedPlot();
    if (plot) {
      const stations = state.plots.filter(source => source.building && source.id !== plot.id &&
        Math.abs(source.x - plot.x) + Math.abs(source.y - plot.y) <= BUILDING.radius).length;
      const buildingReport = plot.buildingEffects >= BUILDING.maxPlotBonus ? "This parcel has reached its building-gain cap." :
        `${stations} nearby station${stations === 1 ? "" : "s"} affect this site${plot.building ? ", plus its own station" : ""}.`;
      tips.push({ employee: "agent", tone: "neutral", text: plot.owner === "player" ?
        `Selling the selected parcel now would make $${Math.abs(saleValue(plot) - plot.costBasis)} ${saleValue(plot) >= plot.costBasis ? "profit" : "loss"}, after closing fees. ${buildingReport}` :
        `Our ${employeeLevel("agent") * 2}% discount saves $${plot.currentPrice - purchaseCost(plot)} on the selected parcel. ${buildingReport}` });
    } else tips.push({ employee: "agent", tone: "neutral", text: `Select a parcel for its margin and nearby building report. Your land purchases cost ${employeeLevel("agent") * 2}% less.` });
  }
  if (employeeLevel("accountant")) {
    const bill = monthlyBillQuote();
    tips.push({ employee: "accountant", tone: "neutral", text: `Reserve about $${bill.total} for the bill in ${daysUntilBill()} days. Your ${employeeLevel("accountant") * 20}% reduction is included. Current cash ${state.money < bill.total ? "does not cover it yet" : "covers it"}.` });
  }
  if (employeeLevel("manager")) tips.push({ employee: "manager", tone: "up", text: `The shop has earned $${state.finance.coffeeEarnings} since the ledger opened. Every order now pays ${employeeLevel("manager") * 12}% more, including skill bonuses.` });
  return tips;
}

function publish(kind, detail = {}) {
  if (!state.carGoal.purchased && state.money >= state.carGoal.price && !state.carGoal.availabilityAnnounced) {
    state.carGoal.availabilityAnnounced = true;
    detail.carAvailable = true;
    if (!kind) kind = "car-available";
  }
  if (kind) state.lastEvent = { kind, ...detail, token: Date.now() + Math.random() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Play remains possible without storage. */ }
  listeners.forEach(listener => listener(state, kind));
}
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

export function selectPlot(id) {
  if (!getPlot(id)) return false;
  state.selectedId = id;
  publish("select", { plotId: id });
  return true;
}

export function buySelected() {
  const plot = selectedPlot();
  if (!plot || plot.owner) return false;
  const cost = purchaseCost(plot);
  if (state.money < cost) { publish("no-money", { amount: cost - state.money }); return false; }
  state.money -= cost;
  plot.owner = "player";
  plot.purchasePrice = cost;
  plot.costBasis = cost;
  state.ownedPlots.push(plot.id);
  recordFinance("buy", -cost);
  const reveal = plot.id === state.story.anomalyId && state.story.chapter >= 1 && state.story.chapter < 2;
  if (reveal) { state.story.chapter = 2; state.story.twistCharges = 1; }
  publish("buy", { plotId: plot.id, amount: cost, storyBeat: reveal ? "reveal" : null });
  return true;
}

export function sellSelected() {
  const plot = selectedPlot();
  if (!plot || plot.owner !== "player") return false;
  const amount = saleValue(plot);
  const profit = amount - plot.costBasis;
  state.money += amount;
  state.finance.realizedLandProfit += profit;
  if (!state.finance.worstDeal || profit < state.finance.worstDeal.profit) state.finance.worstDeal = { type: plot.type, profit };
  recordFinance("sell", amount, { profit });
  plot.owner = null;
  plot.purchasePrice = null;
  plot.costBasis = null;
  state.ownedPlots = state.ownedPlots.filter(id => id !== plot.id);
  publish("sell", { plotId: plot.id, amount, profit });
  return true;
}

export function buildSelected() {
  const plot = selectedPlot();
  if (!plot || plot.owner !== "player" || plot.building) return false;
  if (state.money < BUILDING.cost) { publish("no-money", { amount: BUILDING.cost - state.money }); return false; }
  state.money -= BUILDING.cost;
  state.finance.buildingsBuilt += 1;
  recordFinance("build", -BUILDING.cost);
  plot.building = { builtOnDay: state.gameTime };
  plot.costBasis += BUILDING.cost;
  state.buildings.push(plot.id);
  updatePlotValues(false);
  publish("build", { plotId: plot.id, amount: BUILDING.cost });
  return true;
}

// The selected parcel can be any corner of a road-free 2×2 block.
export function getTwistBlock(id = state.selectedId) {
  const selected = getPlot(id);
  if (!selected) return [];
  for (const dy of [0, -1]) for (const dx of [0, -1]) {
    const x = selected.x + dx, y = selected.y + dy;
    const block = [getPlot(plotId(x, y)), getPlot(plotId(x + 1, y)),
      getPlot(plotId(x + 1, y + 1)), getPlot(plotId(x, y + 1))];
    if (block.every(Boolean)) return block;
  }
  return [];
}

export function twistSelected() {
  if (state.story.chapter < 2 || state.story.twistCharges < 1) return false;
  const block = getTwistBlock();
  if (block.length !== 4) return false;
  const fields = ["type", "basePrice", "owner", "purchasePrice", "costBasis", "building",
    "buildingEffects", "surveyBonus", "priceHistory"];
  const cargo = block.map(plot => Object.fromEntries(fields.map(field => [field, plot[field]])));
  block.forEach((plot, index) => Object.assign(plot, cargo[(index + 3) % 4]));
  for (const plot of block) if (plot.owner === "player") {
    plot.surveyBonus = Math.min(TWIST_BONUS * 4, plot.surveyBonus + TWIST_BONUS);
  }
  const selectedIndex = block.findIndex(plot => plot.id === state.selectedId);
  state.selectedId = block[(selectedIndex + 1) % 4].id;
  state.ownedPlots = state.plots.filter(plot => plot.owner === "player").map(plot => plot.id);
  state.buildings = state.plots.filter(plot => plot.building).map(plot => plot.id);
  state.story.twistCharges -= 1;
  state.story.twists += 1;
  state.story.chapter = Math.max(3, state.story.chapter);
  updatePlotValues(false);
  for (const plot of block) {
    plot.priceHistory.push(plot.currentValue);
    if (plot.priceHistory.length > 48) plot.priceHistory.shift();
  }
  publish("twist", { plotId: state.selectedId, block: block.map(plot => plot.id) });
  return true;
}

function updatePlotValues(recordHistory = true) {
  for (const plot of state.plots) {
    const multiplier = state.market[plot.type].currentPrice / TYPES[plot.type].base;
    plot.currentValue = Math.max(1, Math.round(plot.basePrice * multiplier + plot.buildingEffects + plot.surveyBonus +
      (plot.building ? BUILDING.resaleValue : 0)));
    plot.currentPrice = plot.currentValue;
    state.plotPrices[plot.id] = plot.currentPrice;
    if (recordHistory) {
      plot.priceHistory.push(plot.currentValue);
      if (plot.priceHistory.length > 48) plot.priceHistory.shift();
    }
  }
}

export function tick() {
  state.gameTime += 1;
  state.market.forEach((entry, index) => {
    entry.previousPrice = entry.currentPrice;
    entry.currentPrice = Math.round(entry.basePrice * marketMultiplier(index, state.gameTime));
    entry.movement = entry.currentPrice - entry.previousPrice;
    entry.history.push(entry.currentPrice);
    if (entry.history.length > 48) entry.history.shift();
  });
  for (const source of state.plots) {
    if (!source.building) continue;
    source.buildingEffects = Math.min(BUILDING.maxPlotBonus,
      source.buildingEffects + BUILDING.selfValuePerDay);
    for (const neighbor of state.plots) {
      const distance = Math.abs(source.x - neighbor.x) + Math.abs(source.y - neighbor.y);
      if (distance > 0 && distance <= BUILDING.radius) {
        neighbor.buildingEffects = Math.min(BUILDING.maxPlotBonus,
          neighbor.buildingEffects + BUILDING.valuePerDay);
      }
    }
  }
  updatePlotValues();
  if (state.gameTime % DAYS_PER_MONTH === 0) {
    const bill = { ...monthlyBillQuote(), month: state.gameTime / DAYS_PER_MONTH };
    // A small cash overdraft is allowed; land is never forcibly sold. Coffee work clears it.
    state.money -= bill.total;
    state.finance.insurancePaid += bill.insurance;
    state.finance.taxPaid += bill.tax;
    state.finance.lastBill = bill;
    recordFinance("bill", -bill.total, { insurance: bill.insurance, tax: bill.tax });
    publish("month-bill", bill);
  } else publish(null);
}

export function prepareCoffee(ingredient) {
  const coffee = state.coffeeShopProgress;
  if (coffee.step !== "new" || !INGREDIENTS.includes(ingredient)) return false;
  const order = ORDERS[coffee.orderIndex % ORDERS.length];
  const correct = ingredient === order.ingredients[coffee.ingredientIndex];
  if (correct) coffee.ingredientIndex += 1;
  else coffee.mistakes = Math.min(3, coffee.mistakes + 1);
  if (coffee.ingredientIndex === order.ingredients.length) coffee.step = "prepared";
  publish(coffee.step === "prepared" ? "coffee-ready" : "coffee-ingredient", { correct, ingredient });
  return correct;
}
export function completeCoffee(grade) {
  const coffee = state.coffeeShopProgress;
  if (coffee.step !== "prepared" || !Number.isInteger(grade) || grade < 0 || grade > 2) return false;
  coffee.brewGrade = grade;
  coffee.step = "completed";
  publish("coffee-brew", { grade });
  return true;
}
export function deliverCoffee(customerId) {
  const coffee = state.coffeeShopProgress;
  if (coffee.step !== "completed" || !CUSTOMERS.some(customer => customer.id === customerId)) return false;
  const order = ORDERS[coffee.orderIndex % ORDERS.length];
  const correct = customerId === order.customer;
  const basePay = Math.max(28, order.pay + coffee.brewGrade * 8 +
    (coffee.mistakes === 0 ? 8 : -coffee.mistakes * 4) + (correct ? 12 : -20));
  const pay = Math.round(basePay * (1 + employeeLevel("manager") * .12));
  state.money += pay;
  state.finance.coffeeEarnings += pay;
  recordFinance("coffee", pay);
  coffee.served += 1;
  if (correct) coffee.correctDeliveries += 1;
  if (correct) state.story.lastLine = order.line;
  const perfect = correct && coffee.mistakes === 0 && coffee.brewGrade === 2;
  if (perfect) coffee.cleanOrders += 1;
  let storyBeat = null;
  if (state.story.chapter === 0 && coffee.correctDeliveries >= 2) {
    state.story.chapter = 1;
    storyBeat = "lead";
    if (getPlot(state.story.anomalyId).owner === "player") {
      state.story.chapter = 2;
      state.story.twistCharges = 1;
      storyBeat = "reveal";
    }
  }
  let chargeEarned = false;
  if (perfect && state.story.chapter >= 2) {
    coffee.twistPerfectProgress += 1;
    if (coffee.twistPerfectProgress >= 3) {
      coffee.twistPerfectProgress = 0;
      state.story.twistCharges = Math.min(3, state.story.twistCharges + 1);
      chargeEarned = true;
    }
  }
  coffee.orderIndex += 1;
  coffee.step = "new";
  coffee.ingredientIndex = 0;
  coffee.mistakes = 0;
  coffee.brewGrade = 0;
  publish("coffee-deliver", { amount: pay, correct, perfect, storyBeat, chargeEarned,
    line: correct ? order.line : "Wrong customer. The tip and the rumor are gone." });
  return true;
}
export function purchaseCar() {
  if (state.carGoal.purchased || state.money < state.carGoal.price) return false;
  state.money -= state.carGoal.price;
  state.carGoal.purchased = true;
  recordFinance("car", -state.carGoal.price);
  publish("goal", { amount: state.carGoal.price });
  return true;
}

export function resetGame() {
  Object.assign(state, makeState());
  publish("reset");
}
