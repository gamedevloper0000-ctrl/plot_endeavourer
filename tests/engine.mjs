import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/state.js", import.meta.url)).toString("base64");
let run = 0;
async function freshGame(save = null) {
  const storage = {
    value: save,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; }
  };
  globalThis.localStorage = storage;
  return { game: await import(`data:text/javascript;base64,${source}#${run++}`), storage };
}

function finishOrder(game, grade = 2, customer = null) {
  const order = game.ORDERS[game.state.coffeeShopProgress.orderIndex % game.ORDERS.length];
  for (const ingredient of order.ingredients) assert.equal(game.prepareCoffee(ingredient), true);
  assert.equal(game.completeCoffee(grade), true);
  assert.equal(game.deliverCoffee(customer ?? order.customer), true);
}

test("coffee skill, story clue, twist and save", async () => {
  const { game, storage } = await freshGame();
  assert.equal(game.state.plots.length, 99);
  assert.equal(new Set(game.state.plots.map(plot => plot.type)).size, 4);
  assert.equal(game.prepareCoffee("FOAM"), false);
  finishOrder(game, 0, "dax");
  assert.equal(game.state.money, 148); // wrong ingredient, rough brew, wrong customer
  assert.equal(game.state.story.chapter, 0);
  finishOrder(game);
  finishOrder(game);
  assert.equal(game.state.story.chapter, 1);

  const marked = game.getPlot(game.state.story.anomalyId);
  game.selectPlot(marked.id);
  assert.equal(game.buySelected(), true);
  assert.equal(game.state.story.chapter, 2);
  assert.equal(game.state.story.twistCharges, 1);

  const block = game.getTwistBlock();
  const index = block.findIndex(plot => plot.id === marked.id);
  const destination = block[(index + 1) % 4].id;
  const beforeMoney = game.state.money;
  assert.equal(game.twistSelected(), true);
  assert.equal(game.state.money, beforeMoney);
  assert.equal(game.getPlot(destination).owner, "player");
  assert.equal(game.getPlot(destination).surveyBonus, game.TWIST_BONUS);
  assert.equal(game.state.selectedId, destination);
  assert.equal(game.state.story.twistCharges, 0);
  assert.equal(game.twistSelected(), false);
  finishOrder(game);
  finishOrder(game);
  finishOrder(game);
  assert.equal(game.state.story.twistCharges, 1);
  assert.equal(game.state.coffeeShopProgress.twistPerfectProgress, 0);

  const loaded = await freshGame(storage.value);
  assert.equal(loaded.game.state.story.chapter, 3);
  assert.equal(loaded.game.getPlot(destination).owner, "player");
  assert.equal(loaded.game.getPlot(destination).surveyBonus, game.TWIST_BONUS);
  assert.equal(loaded.game.state.story.twists, 1);
  assert.equal(loaded.game.state.story.twistCharges, 1);
});

test("a save from the previous version keeps its money and map", async () => {
  const { game, storage } = await freshGame();
  const oldSave = JSON.parse(storage.value || JSON.stringify(game.state));
  oldSave.money = 777;
  oldSave.coffeeShopProgress.served = 2;
  delete oldSave.story;
  delete oldSave.coffeeShopProgress.ingredientIndex;
  delete oldSave.coffeeShopProgress.twistPerfectProgress;
  const loaded = await freshGame(JSON.stringify(oldSave));
  assert.equal(loaded.game.state.money, 777);
  assert.equal(loaded.game.state.seed, game.state.seed);
  assert.equal(loaded.game.state.story.chapter, 1);
  assert.equal(loaded.game.state.coffeeShopProgress.ingredientIndex, 0);
});

test("buildings travel with deeds and lift nearby plots", async () => {
  const { game } = await freshGame();
  game.state.money = 1000;
  const plot = game.state.plots[0];
  game.selectPlot(plot.id);
  assert.equal(game.buySelected(), true);
  assert.equal(game.buildSelected(), true);
  game.state.story.chapter = 2;
  game.state.story.twistCharges = 1;
  const block = game.getTwistBlock();
  const destination = block[(block.findIndex(item => item.id === plot.id) + 1) % 4];
  assert.equal(game.twistSelected(), true);
  assert.ok(game.getPlot(destination.id).building);
  assert.equal(game.getPlot(destination.id).owner, "player");
  const neighbor = game.state.plots.find(item =>
    Math.abs(item.x - destination.x) + Math.abs(item.y - destination.y) === 1);
  const before = neighbor.buildingEffects;
  game.tick();
  assert.equal(neighbor.buildingEffects, before + game.BUILDING.valuePerDay);
  assert.equal(game.getPlot(destination.id).buildingEffects, game.BUILDING.selfValuePerDay);
  assert.equal(game.sellSelected(), true);
  assert.equal(game.sellSelected(), false);
});

test("goal can be purchased once and reset creates a new run", async () => {
  const { game } = await freshGame();
  const seed = game.state.seed;
  game.state.money = game.state.carGoal.price;
  assert.equal(game.purchaseCar(), true);
  assert.equal(game.purchaseCar(), false);
  game.resetGame();
  assert.equal(game.state.money, 120);
  assert.equal(game.state.carGoal.purchased, false);
  assert.notEqual(game.state.seed, seed);
});

test("monthly bills charge at 30-day boundaries, include property once, and persist", async () => {
  const { game, storage } = await freshGame();
  game.state.money = 1200;
  game.selectPlot(game.state.plots[0].id);
  game.buySelected();
  game.buildSelected();
  const cash = game.state.money;
  for (let day = 0; day < 29; day++) game.tick();
  assert.equal(game.state.money, cash);
  assert.equal(game.daysUntilBill(), 1);
  assert.equal(game.state.finance.lastBill, null);
  game.tick();
  const bill = game.state.finance.lastBill;
  const preBillWealth = cash + game.ownedValue();
  assert.equal(bill.month, 1);
  assert.equal(bill.wealth, preBillWealth); // property already includes the station's resale value
  assert.equal(bill.total, Math.round(preBillWealth * .01));
  assert.equal(bill.insurance + bill.tax, bill.total);
  assert.equal(game.state.money, cash - bill.total);
  assert.equal(game.netRunProfit(), preBillWealth - bill.total - game.state.finance.startingWealth);
  assert.equal(game.state.finance.history.at(-1).kind, "bill");
  assert.equal(game.state.finance.history.at(-1).amount, -bill.total);
  assert.equal(game.daysUntilBill(), 30);
  const loaded = await freshGame(storage.value);
  assert.deepEqual(loaded.game.state.finance.lastBill, bill);
  const paid = loaded.game.state.money;
  loaded.game.tick();
  assert.equal(loaded.game.state.money, paid); // loading on the boundary does not bill twice
  for (let day = 31; day < 60; day++) loaded.game.tick();
  assert.equal(loaded.game.state.finance.lastBill.month, 2);
  assert.equal(loaded.game.state.finance.history.filter(entry => entry.kind === "bill").length, 2);
});

test("a cash-short bill leaves land intact and coffee clears the overdraft", async () => {
  const { game } = await freshGame();
  game.state.money = 1000;
  game.selectPlot(game.state.plots[0].id);
  game.buySelected();
  game.state.money = 0;
  for (let day = 0; day < 30; day++) game.tick();
  assert.ok(game.state.money < 0);
  assert.equal(game.state.ownedPlots.length, 1);
  finishOrder(game);
  assert.ok(game.state.money > 0);
});

test("employees change real costs and earnings, with no instant land arbitrage", async () => {
  const { game, storage } = await freshGame();
  assert.equal(game.upgradeEmployee("manager"), false);
  assert.equal(game.employeeLevel("manager"), 0);
  game.state.money = 10000;
  for (const id of ["agent", "accountant", "manager"]) {
    assert.equal(game.upgradeEmployee(id), true);
    assert.equal(game.upgradeEmployee(id), true);
    assert.equal(game.upgradeEmployee(id), false);
  }
  assert.equal(game.monthlyBillQuote().rate, .006);
  assert.equal(game.monthlyBillQuote().total, Math.round(game.economyValue() * .006));
  const plot = game.state.plots[0];
  assert.equal(game.purchaseCost(plot), Math.round(plot.currentPrice * .96));
  assert.ok(game.saleValue(plot) < game.purchaseCost(plot));
  game.selectPlot(plot.id);
  const beforeTrade = game.state.money;
  game.buySelected();
  game.sellSelected();
  assert.ok(game.state.money < beforeTrade);
  assert.equal(game.state.finance.realizedLandProfit, game.state.money - beforeTrade);
  assert.equal(game.state.finance.worstDeal.profit, game.state.money - beforeTrade);
  const beforeCoffee = game.state.money;
  finishOrder(game);
  const pay = Math.round((52 + 16 + 8 + 12) * 1.24);
  assert.equal(game.state.money - beforeCoffee, pay);
  assert.equal(game.state.finance.coffeeEarnings, pay);
  const loaded = await freshGame(storage.value);
  assert.equal(loaded.game.employeeLevel("agent"), 2);
  assert.equal(loaded.game.state.finance.staffSpent, 1040);
  assert.equal(loaded.game.state.finance.coffeeEarnings, pay);
});

test("market reports use price history, forecasts and selected building effects", async () => {
  const { game } = await freshGame();
  game.state.money = 2000;
  assert.deepEqual(game.marketAdvice(), []);
  game.upgradeEmployee("analyst");
  for (let day = 0; day < 8; day++) game.tick();
  const changes = game.TYPES.map((_, index) => game.marketChange(index));
  const strongest = changes.indexOf(Math.max(...changes));
  assert.ok(game.marketAdvice()[0].text.includes(game.TYPES[strongest].name));
  assert.ok(game.marketAdvice()[0].text.includes(`${changes[strongest].toFixed(1)}%`));
  assert.ok(!game.marketAdvice().some(tip => tip.text.includes("forecast")));
  game.upgradeEmployee("analyst");
  assert.ok(game.marketAdvice().some(tip => tip.text.includes("3-day cycle forecast")));
  game.upgradeEmployee("agent");
  const plot = game.state.plots[0];
  game.selectPlot(plot.id);
  plot.buildingEffects = game.BUILDING.maxPlotBonus;
  assert.ok(game.marketAdvice().some(tip => tip.text.includes("building-gain cap")));
});

test("legacy saves open a truthful ledger without resetting existing progress", async () => {
  const { game } = await freshGame();
  game.state.money = 1000;
  game.selectPlot(game.state.plots[0].id);
  game.buySelected();
  game.buildSelected();
  for (let day = 0; day < 12; day++) game.tick();
  const previous = JSON.parse(JSON.stringify(game.state));
  delete previous.finance;
  delete previous.employees;
  delete previous.carGoal.availabilityAnnounced;
  const { game: loaded } = await freshGame(JSON.stringify(previous));
  assert.equal(loaded.state.money, game.state.money);
  assert.equal(loaded.state.gameTime, 12);
  assert.equal(loaded.ownedValue(), game.ownedValue());
  assert.equal(loaded.state.finance.startingWealth, loaded.economyValue());
  assert.equal(loaded.netRunProfit(), 0);
  assert.equal(loaded.state.finance.trackingSinceDay, 12);
  assert.equal(loaded.state.finance.coffeeEarnings, 0);
  assert.equal(loaded.state.finance.buildingsBuilt, 1);
  assert.deepEqual(loaded.state.finance.history, []);
});

test("car availability notifies once, requires purchase, and reset clears every progression system", async () => {
  const { game, storage } = await freshGame();
  game.state.money = game.state.carGoal.price - 1;
  const notices = [];
  game.subscribe((state, kind) => { if (kind && state.lastEvent.carAvailable) notices.push(kind); });
  finishOrder(game);
  assert.equal(notices.length, 1);
  assert.equal(game.state.carGoal.purchased, false);
  game.selectPlot(game.state.plots[0].id);
  game.tick();
  assert.equal(notices.length, 1);
  const loaded = await freshGame(storage.value);
  assert.equal(loaded.game.state.carGoal.availabilityAnnounced, true);
  const before = game.netRunProfit();
  assert.equal(game.purchaseCar(), true);
  assert.equal(game.netRunProfit(), before); // the earned car remains an achievement asset
  game.state.employees.manager = 2;
  game.resetGame();
  assert.equal(game.state.money, 120);
  assert.equal(game.state.gameTime, 0);
  assert.equal(game.state.ownedPlots.length, 0);
  assert.equal(game.state.buildings.length, 0);
  assert.ok(game.state.plots.every(plot => !plot.owner && !plot.building && plot.priceHistory.length === 1));
  assert.ok(game.state.market.every(entry => entry.currentPrice === entry.basePrice && entry.history.length === 1));
  assert.ok(Object.values(game.state.employees).every(level => level === 0));
  assert.equal(game.state.coffeeShopProgress.served, 0);
  assert.equal(game.state.coffeeShopProgress.step, "new");
  assert.equal(game.state.finance.history.length, 0);
  assert.equal(game.state.finance.coffeeEarnings, 0);
  assert.equal(game.state.finance.taxPaid, 0);
  assert.equal(game.state.finance.insurancePaid, 0);
  assert.equal(game.state.finance.lastBill, null);
  assert.equal(game.state.carGoal.availabilityAnnounced, false);
  assert.equal(game.state.carGoal.purchased, false);
});
