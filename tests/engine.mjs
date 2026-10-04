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
