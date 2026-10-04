import { drawgrid, convert, highlight } from "./grid.js";
import { playSound, resumeSound, setSoundEnabled, soundEnabled } from "./audio.js";
import {
  COLS, ROWS, TICK_MS, TYPES, ORDERS, CUSTOMERS, INGREDIENTS, BUILDING, TWIST_BONUS, state, getPlot, selectedPlot,
  ownedValue, ownedBuildings, plotId, isRoad, subscribe, selectPlot,
  buySelected, sellSelected, buildSelected, getTwistBlock, twistSelected, tick, prepareCoffee,
  completeCoffee, deliverCoffee, purchaseCar, resetGame
} from "./state.js";

const $ = selector => document.querySelector(selector);
const canvas = $("#mycanvas");
const ctx = canvas.getContext("2d");
const view = $("#view");
const moneyNode = $("#money");
const popup = $("#map-popup");
const sprite = new Image();
sprite.src = "public/assets/images/tiny-town.png";
const money = amount => `$${Math.round(amount).toLocaleString("en-US")}`;
const signedMoney = amount => `${amount >= 0 ? "+" : "−"}${money(Math.abs(amount))}`;
const coordinate = plot => `${String.fromCharCode(65 + plot.x)}${plot.y + 1}`;

let route = "land";
let hoverId = null;
let canvasWidth = 0;
let canvasHeight = 0;
let tileSize = 0;
let originX = 0;
let originY = 0;
let lastFrame = 0;
let builtAt = 0;
let lastEventToken = state.lastEvent?.token || null;
let particles = [];
let resetArmed = false;
let brewStart = 0;
let twistAt = 0;
let twistedCells = [];

const headings = {
  land: ["The land ledger", "Select a parcel. Some deeds hide more than a price.", "01 / LAND"],
  market: ["Market watch", "Four terrains, four different price cycles.", "02 / MARKET"],
  coffee: ["Corner coffee", "Mix, time the shot, and find the right customer.", "03 / WORK"],
  buildings: ["Build & grow", "A building lifts the value of nearby land each day.", "04 / BUILD"],
  goal: ["The long drive", "Earn enough money to buy the car.", "05 / GOAL"]
};

function sectionHeading(page) {
  const [title, description, index] = headings[page];
  return `<div class="section-heading"><div><h2>${title}</h2><p>${description}</p></div><span class="section-index">${index}</span></div>`;
}

function renderStory() {
  const story = state.story;
  const marked = getPlot(story.anomalyId);
  const beats = [
    ["THE STRANGE DEED", "Two customers know why the survey map has a spiral stamped on it. Serve them well to hear the full rumor."],
    ["A MARK ON THE MAP", `Mara's clue points to parcel ${coordinate(marked)}. Buy the pulsing tile to open the old survey case.`],
    ["PLOT TWIST UNLOCKED", "The deed numbers were mounted on a rotating plate. Select a tile and turn its four-plot block."],
    ["THE MAP WAS THE MACHINE", "The speculators hid value in movable deeds. Turn them to uncover a survey premium and change a building's reach."]
  ];
  const [title, text] = beats[Math.min(story.chapter, 3)];
  return `<div class="story-strip ${story.chapter >= 2 ? "revealed" : ""}"><div class="story-symbol">${story.chapter >= 2 ? "⟳" : "?"}</div><div><span>CASE FILE / ${String(story.chapter + 1).padStart(2, "0")}</span><strong>${title}</strong><p>${text}</p></div></div>`;
}

function renderTwistControl() {
  if (state.story.chapter < 2) return "";
  const block = getTwistBlock();
  const charges = state.story.twistCharges;
  return `<div class="twist-console"><div class="twist-console-head"><span>◫ &nbsp; ZONING TURNTABLE</span><strong>${charges} TURN${charges === 1 ? "" : "S"} LEFT</strong></div>
    <p>${block.length ? `Selected block: ${block.map(coordinate).join(" · ")}.` : "Select any parcel to outline a four-plot block."} Deeds, buildings, and ownership rotate clockwise. Each owned deed gains a ${money(TWIST_BONUS)} survey premium.</p>
    <button class="twist-button" data-action="twist" ${!block.length || charges < 1 ? "disabled" : ""}>⟳ &nbsp; TWIST THE PLOTS</button>
    <small>Earn another turn after three perfect coffee deliveries.</small></div>`;
}

function renderLand() {
  const plot = selectedPlot();
  if (!plot) return `${sectionHeading("land")}${renderStory()}
    <div class="empty-state"><div class="empty-art">⌑</div><span class="eyebrow-mini">START HERE</span>
    <h3>A plot is waiting.</h3><p>Click a colored square in the valley to see its type, price and outlook.</p>
    <button class="text-button" data-action="coffee-route">Need money? Visit the coffee shop →</button></div>
    <div class="mini-banner"><b>✳</b><span>Prices change every game day. Watch the market, then trade when the time feels right.</span></div>${renderTwistControl()}`;
  const type = TYPES[plot.type];
  const owned = plot.owner === "player";
  const change = state.market[plot.type].movement;
  const profit = owned ? plot.currentValue - plot.costBasis : 0;
  const afford = state.money >= plot.currentPrice;
  const canBuild = owned && !plot.building && state.money >= BUILDING.cost;
  return `${sectionHeading("land")}${renderStory()}
    <article class="selected-card">
      <div class="selected-top"><div class="selected-name"><div class="tile-emblem" style="background:${type.color}">${["☀","✿","♠","≈"][plot.type]}</div><div><h3>${type.name}</h3><p>Parcel ${coordinate(plot)} · ${type.note}</p></div></div><span class="status-label ${owned ? "owned" : ""}">${owned ? "YOUR LAND" : "AVAILABLE"}</span></div>
      <div class="price-head"><span>CURRENT LAND VALUE</span><strong>${money(plot.currentValue)}</strong></div>
      <div class="detail-grid">
        <div><span>BASE PRICE</span><strong>${money(plot.basePrice)}</strong></div>
        <div><span>MARKET TODAY</span><strong class="${change >= 0 ? "up" : "down"}">${signedMoney(change)} ${change >= 0 ? "↗" : "↘"}</strong></div>
        <div><span>${owned ? "YOUR PURCHASE" : "PURCHASE PRICE"}</span><strong>${money(owned ? plot.purchasePrice : plot.currentPrice)}</strong></div>
        <div><span>${owned ? "NET PROFIT / LOSS" : "POTENTIAL SALE"}</span><strong class="${owned ? (profit >= 0 ? "up" : "down") : ""}">${owned ? signedMoney(profit) : money(plot.currentValue)}</strong></div>
        <div><span>BUILDING</span><strong>${plot.building ? "Field station" : "None"}</strong></div>
        <div><span>IMPROVEMENT LIFT</span><strong class="up">+${money(plot.buildingEffects)}</strong></div>
        <div><span>SURVEY PREMIUM</span><strong class="up">+${money(plot.surveyBonus)}</strong></div>
        <div><span>PRICE RECORDS</span><strong>${plot.priceHistory.length} saved</strong></div>
      </div>
      <div class="action-row">${owned
        ? `<button class="primary" data-action="sell">Sell for ${money(plot.currentValue)} ↗</button><button class="secondary" data-action="build" ${plot.building || !canBuild ? "disabled" : ""}>${plot.building ? "Built" : `Build · ${money(BUILDING.cost)}`}</button>`
        : `<button class="primary" data-action="buy" ${!afford ? "disabled" : ""}>${afford ? `Buy plot · ${money(plot.currentPrice)}` : `Need ${money(plot.currentPrice - state.money)} more`}</button>`}
        ${state.story.chapter >= 2 ? `<button class="secondary" data-action="twist" ${state.story.twistCharges < 1 ? "disabled" : ""}>⟳ Twist · ${state.story.twistCharges}</button>` : ""}
      </div>
      <p class="helper-note">${owned ? "Selling transfers the land and any building on it. Profit includes your building cost." : "Work a coffee order to earn cash, then buy this parcel when you can afford it."}</p>
    </article>
    <div class="mini-banner"><b>⌁</b><span>${owned ? "Your ownership is marked in gold on the map." : "Prices follow gentle cycles, so holding and timing your sale matters."}</span></div>${renderTwistControl()}`;
}

function sparkline(values, color, label) {
  const points = values.length > 1 ? values : [values[0], values[0]];
  const min = Math.min(...points) - 8;
  const max = Math.max(...points) + 8;
  const coords = points.map((value, index) => [
    2 + index * 106 / (points.length - 1),
    38 - (value - min) / (max - min || 1) * 34
  ]);
  const polyline = coords.map(pair => pair.map(n => n.toFixed(1)).join(",")).join(" ");
  const last = coords.at(-1);
  return `<svg role="img" aria-label="${label} price history" viewBox="0 0 110 42" preserveAspectRatio="none"><title>${label} price history</title><path d="M0 39H110" stroke="#e1dfd2" stroke-width="1"/><polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3.2" fill="${color}"/></svg>`;
}

function renderMarket() {
  return `${sectionHeading("market")}
    ${state.story.chapter >= 1 ? `<div class="market-bulletin"><span>◉ &nbsp; LATE EDITION</span><p>The town's survey records were altered. A stamped deed on the map may explain the price swings.</p></div>` : ""}
    <div class="market-list">${TYPES.map((type, index) => {
      const entry = state.market[index];
      return `<div class="market-row"><div class="market-name"><i class="market-dot" style="background:${type.color}"></i><div>${type.name}<small>${type.note}</small></div></div>${sparkline(entry.history, type.color, type.name)}<div class="market-number">${money(entry.currentPrice)}<small class="${entry.movement >= 0 ? "up" : "down"}">${signedMoney(entry.movement)} today</small></div></div>`;
    }).join("")}</div>
    <p class="market-foot">Each line shows up to 48 game days. The prices shown here are type averages; individual parcels also reflect their location and nearby improvements.</p>`;
}

function ingredientChoices(order, orderIndex) {
  const choices = [...new Set(order.ingredients)];
  for (let i = 0; choices.length < 4; i++) {
    const ingredient = INGREDIENTS[(orderIndex * 3 + i + 2) % INGREDIENTS.length];
    if (!choices.includes(ingredient)) choices.push(ingredient);
  }
  return choices.sort((a, b) => ((INGREDIENTS.indexOf(a) + orderIndex * 2) % 7) -
    ((INGREDIENTS.indexOf(b) + orderIndex * 2) % 7));
}

function renderCustomerQueue(coffee) {
  const people = [];
  for (let offset = 0; people.length < 3 && offset < ORDERS.length * 2; offset++) {
    const person = CUSTOMERS.find(entry => entry.id === ORDERS[(coffee.orderIndex + offset) % ORDERS.length].customer);
    if (!people.some(entry => entry.id === person.id)) people.push(person);
  }
  return `<div class="queue-caption">CUSTOMERS WAITING <span>${coffee.step === "completed" ? "CHOOSE WHO GETS THE CUP ↘" : "NEXT UP · " + people[0].name.toUpperCase()}</span></div>
    <div class="customer-queue" aria-label="Coffee shop customer line">${people.map((person, index) =>
      `<button class="queue-person ${index === 0 ? "first" : ""} person-${person.id}" type="button" data-customer="${person.id}" aria-label="Serve ${person.name}, ${person.role}" ${coffee.step !== "completed" ? "disabled" : ""}>
        <span class="pixel-person" aria-hidden="true"><i class="pixel-hair"></i><i class="pixel-face"></i><i class="pixel-shirt"></i><i class="pixel-arm left"></i><i class="pixel-arm right"></i><i class="pixel-legs"></i></span>
        <span class="queue-name">${person.name}<small>${person.role}</small></span></button>`).join("")}</div>`;
}

function renderCoffee() {
  const coffee = state.coffeeShopProgress;
  const order = ORDERS[coffee.orderIndex % ORDERS.length];
  const customer = CUSTOMERS.find(person => person.id === order.customer);
  const step = coffee.step;
  if (step === "prepared" && !brewStart) brewStart = performance.now();
  const response = state.lastEvent?.kind === "coffee-ingredient"
    ? (state.lastEvent.correct ? "GOOD MIX · KEEP GOING" : "WRONG INGREDIENT · TIP DOWN") : "FOLLOW THE RECIPE ON THE TICKET";
  const stage = step === "new" ? `<div class="arcade-label">01 / MIX THE ORDER <span>${coffee.mistakes} ${coffee.mistakes === 1 ? "MISTAKE" : "MISTAKES"}</span></div>
      <div class="recipe-track">${order.ingredients.map((ingredient, index) => `<span class="${index < coffee.ingredientIndex ? "filled" : index === coffee.ingredientIndex ? "next" : ""}">${index < coffee.ingredientIndex ? "✓ " : ""}${ingredient}</span>`).join("")}</div>
      <div class="ingredient-pad">${ingredientChoices(order, coffee.orderIndex).map(ingredient => `<button data-ingredient="${ingredient}">${ingredient}</button>`).join("")}</div>
      <p class="arcade-feedback">${response}</p>` : step === "prepared" ? `<div class="arcade-label">02 / TIME THE SHOT <span>HIT THE GOLD ZONE</span></div>
      <p class="arcade-instruction">The needle sweeps back and forth. Stop it inside the gold window for a bigger tip.</p>
      <div class="brew-meter" role="img" aria-label="Timing meter; stop the moving needle in the gold zone"><div class="brew-zone" style="left:${order.target - 8}%"></div><div class="brew-needle" id="brew-needle"></div></div>
      <div class="brew-scale"><span>UNDER</span><span>SWEET SPOT</span><span>OVER</span></div>
      <button class="primary brew-stop" data-action="brew">■ &nbsp; STOP THE SHOT</button>` : `<div class="arcade-label">03 / FIND THE CUSTOMER <span>${coffee.brewGrade === 2 ? "PERFECT SHOT" : coffee.brewGrade === 1 ? "GOOD SHOT" : "ROUGH SHOT"}</span></div>
      <p class="arcade-instruction">The ticket says <strong>${customer.name}</strong>, the ${customer.role.toLowerCase()}. Tap the right person in the line above to hand over the cup.</p>`;
  return `${sectionHeading("coffee")}
    <div class="shop-scene"><span class="shop-roof"></span><span class="shop-sign">THE CORNER CUP / OPEN LATE</span><span class="shop-window"></span><span class="shop-door"></span><span class="shop-counter"></span>${renderCustomerQueue(coffee)}</div>
    <div class="order-paper"><span class="eyebrow-mini">TICKET #${String(coffee.served + 1).padStart(3, "0")} / ${customer.role.toUpperCase()}</span><strong class="order-pay">${money(order.pay)} + TIP</strong><h3>${order.name}</h3><p>FOR ${customer.name.toUpperCase()} &nbsp;·&nbsp; ${order.ingredients.join(" → ")}</p></div>
    <div class="arcade-panel">${stage}</div>
    <div class="coffee-rumor"><span>LAST THING OVERHEARD</span><p>“${state.story.lastLine}”</p></div>
    <p class="shop-tip">${coffee.served} ${coffee.served === 1 ? "order" : "orders"} served · ${coffee.cleanOrders} perfect. ${state.story.chapter >= 2 ? `${coffee.twistPerfectProgress}/3 perfect orders toward your next plot turn.` : "Perfect orders will power the turntable once the secret is found."}</p>
    <details class="asset-credits"><summary>ART + SOUND CREDITS</summary><p>Town tiles: <a href="https://kenney.nl/assets/tiny-town" target="_blank" rel="noopener noreferrer">Kenney</a> (CC0). Step dirt: <a href="https://freesound.org/people/heyheytheree/sounds/872597/" target="_blank" rel="noopener noreferrer">heyheytheree</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>). Coffee pour: <a href="https://freesound.org/people/Maajora/sounds/432775/" target="_blank" rel="noopener noreferrer">Maajora</a> (CC0). Cup: <a href="https://freesound.org/people/TheHiraHira/sounds/460242/" target="_blank" rel="noopener noreferrer">TheHiraHira</a> (CC0). Music: “The Morning Air” by Evan King, supplied by the project owner.</p></details>`;
}

function renderBuildings() {
  const owned = state.plots.filter(plot => plot.owner === "player");
  const plot = selectedPlot();
  const buildable = plot?.owner === "player" && !plot.building;
  return `${sectionHeading("buildings")}
    <div class="build-hero"><div class="build-icon">▥</div><div><h3>Field station</h3><p>A small local landmark that improves nearby plots over time.</p></div></div>
    <div class="spec-list"><div><span>CONSTRUCTION COST</span><strong>${money(BUILDING.cost)}</strong></div><div><span>INFLUENCE</span><strong>${BUILDING.radius} tiles, walking distance</strong></div><div><span>NEIGHBOR VALUE GAIN</span><strong>+${money(BUILDING.valuePerDay)} / day</strong></div><div><span>HOST PARCEL GAIN</span><strong>+${money(BUILDING.selfValuePerDay)} / day</strong></div><div><span>MAXIMUM LIFT PER PLOT</span><strong>+${money(BUILDING.maxPlotBonus)}</strong></div></div>
    <button class="primary" data-action="build" ${!buildable || state.money < BUILDING.cost ? "disabled" : ""}>${plot?.building ? "Already built here" : buildable ? `Build on ${coordinate(plot)} · ${money(BUILDING.cost)}` : "Select owned land to build"}</button>
    <p class="helper-note">Buy neighboring parcels before building to collect their daily value gains. Buildings remain after a sale; your net profit counts construction cost.</p>
    ${owned.length ? `<div class="holding-list">${owned.map(item => `<button data-select="${item.id}"><span>${TYPES[item.type].name} · ${coordinate(item)}</span><small>${item.building ? "STATION BUILT" : "OPEN SITE"} &nbsp; ${money(item.currentValue)}</small></button>`).join("")}</div>` : `<div class="mini-banner"><b>⌑</b><span>Buy your first plot on the Land tab to unlock construction.</span></div>`}`;
}

const carSvg = `<svg viewBox="0 0 520 220" role="img" aria-label="Illustrated green vintage sports car"><ellipse cx="260" cy="194" rx="205" ry="14" fill="#18342e" opacity=".38"/><path d="M75 151 L93 125 L150 113 L195 62 Q212 46 247 46 H315 Q343 47 366 76 L398 117 L448 128 Q464 132 468 151 L460 171 H69 L66 159 Q66 153 75 151Z" fill="#b6cf8e" stroke="#203e35" stroke-width="8" stroke-linejoin="round"/><path d="M200 65 H311 Q334 66 353 91 L371 119 H163 Z" fill="#284f50" stroke="#203e35" stroke-width="7"/><path d="M276 64 L271 119" stroke="#d8e8b0" stroke-width="7"/><path d="M153 120 H399" stroke="#d8e8b0" stroke-width="5"/><path d="M69 158 H463" stroke="#4c765c" stroke-width="11"/><path d="M90 132 L115 130 L104 144 L82 146Z" fill="#fff1b9" stroke="#d7c88a" stroke-width="4"/><path d="M438 134 L459 142 L460 150 L437 149Z" fill="#d78761"/><path d="M188 149 H349" stroke="#739b73" stroke-width="6"/><circle cx="158" cy="170" r="32" fill="#263b34"/><circle cx="158" cy="170" r="16" fill="#e7e3cb" stroke="#819488" stroke-width="6"/><circle cx="384" cy="170" r="32" fill="#263b34"/><circle cx="384" cy="170" r="16" fill="#e7e3cb" stroke="#819488" stroke-width="6"/><path d="M200 77 L235 77" stroke="#87aa9b" stroke-width="3" opacity=".8"/></svg>`;

function renderGoal() {
  const goal = state.carGoal;
  const won = goal.purchased;
  const progress = won ? 100 : Math.min(100, Math.round(state.money / goal.price * 100));
  return `${sectionHeading("goal")}
    <div class="goal-stage ${won ? "won" : ""}"><span class="goal-caption">${won ? "YOURS TO DRIVE · GOAL COMPLETE" : "THE FINISH LINE · VALLEY ROADSTER"}</span>${carSvg}</div>
    <div class="goal-copy"><h3>${won ? "Keys in hand." : "One day, yours."}</h3><strong>${money(goal.price)}</strong></div>
    <div class="progress-shell" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Car savings progress"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="goal-meta"><span>${won ? "GOAL COMPLETE" : `${progress}% OF GOAL SAVED`}</span><strong>${won ? "DRIVE SAFE" : `${money(Math.max(0, goal.price - state.money))} TO GO`}</strong></div>
    <button class="primary" data-action="goal" ${won || state.money < goal.price ? "disabled" : ""}>${won ? "Car purchased" : state.money < goal.price ? "Keep earning & investing" : `Buy the roadster · ${money(goal.price)}`}</button>
    <p class="goal-message">${won ? (state.story.twists > 0 ? "PLOT TWIST: the roadster was the surveyor's old field car. Its trunk holds the original deeds. You did not just escape the valley; you can redraw its future." : "The glove box holds a spiral-stamped deed. The valley still has a secret for you to find.") : "Work a shift. Buy a parcel. Build up the neighborhood. Sell at the right time."}</p>
    <button class="text-button" data-action="reset">${resetArmed ? "Click again to erase this run" : "Start a new run"}</button>`;
}

const renderers = { land: renderLand, market: renderMarket, coffee: renderCoffee, buildings: renderBuildings, goal: renderGoal };
function renderView() { view.innerHTML = renderers[route](); }
function updateChrome() {
  moneyNode.textContent = money(state.money);
  $("#portfolio-value").textContent = money(ownedValue());
  $("#plots-owned").textContent = String(state.ownedPlots.length);
  $("#buildings-owned").textContent = String(ownedBuildings());
  const day = `DAY ${String(state.gameTime + 1).padStart(2, "0")}`;
  $("#game-day").textContent = day;
  $("#top-day").textContent = day;
}

function setRoute(next) {
  route = renderers[next] ? next : "land";
  if (route !== "goal") resetArmed = false;
  document.querySelectorAll(".nav-item").forEach(button => {
    const active = button.dataset.route === route;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  view.classList.remove("route-view");
  void view.offsetWidth;
  view.classList.add("route-view");
  renderView();
}

function notify(message, detail = "", negative = false) {
  const toast = document.createElement("div");
  toast.className = `toast${negative ? " negative" : ""}`;
  toast.textContent = message;
  if (detail) { const small = document.createElement("small"); small.textContent = detail; toast.append(small); }
  $("#toast-stack").append(toast);
  setTimeout(() => toast.remove(), 3300);
}

function mapPoint(id) {
  const plot = getPlot(id);
  return plot ? { x: originX + (plot.x + .5) * tileSize, y: originY + (plot.y + .5) * tileSize } : null;
}
function spawnParticles(event) {
  const point = mapPoint(event.plotId);
  if (!point) return;
  const color = event.kind === "sell" ? "#f3d488" : event.kind === "build" ? "#e8dfc6" : "#c5eb9c";
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI * 2 / 20 + Math.random() * .3;
    const speed = 1.2 + Math.random() * 2.2;
    particles.push({ x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
      life: 1, size: 2 + Math.random() * 3, color });
  }
  popup.textContent = event.kind === "sell" ? `+${money(event.amount)}` : `−${money(event.amount)}`;
  popup.style.left = `${point.x / canvasWidth * 100}%`;
  popup.style.top = `${point.y / canvasHeight * 100}%`;
  popup.classList.remove("show");
  void popup.offsetWidth;
  popup.classList.add("show");
}

function flashStory(text) {
  const flash = $("#story-flash");
  flash.textContent = text;
  flash.classList.remove("show");
  void flash.offsetWidth;
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 1450);
}

function handleEvent(event) {
  if (!event || event.token === lastEventToken) return;
  lastEventToken = event.token;
  playSound(event.kind, event);
  if (event.kind === "select") return;
  if (event.kind === "build") builtAt = performance.now();
  const messages = {
    buy: ["LAND ACQUIRED", `${money(event.amount)} invested in your estate.`],
    sell: ["PLOT SOLD", `${money(event.amount)} received · ${signedMoney(event.profit)} net.`],
    build: ["FIELD STATION BUILT", "Nearby parcels gain value each day."],
    "no-money": ["NOT ENOUGH CASH", `${money(event.amount)} more needed.`],
    "coffee-ready": ["RECIPE LOCKED", "Now time the shot in the gold zone."],
    "coffee-brew": [event.grade === 2 ? "PERFECT SHOT" : event.grade === 1 ? "GOOD SHOT" : "ROUGH SHOT", "Find the customer on the ticket."],
    "coffee-deliver": [event.correct ? "ORDER DELIVERED" : "WRONG CUSTOMER", `+${money(event.amount)} earned at the shop.`],
    twist: ["THE PLOTS TURNED", "Four deeds rotated clockwise."],
    goal: ["GOAL COMPLETE", "The valley roadster is yours."],
    reset: ["NEW RUN STARTED", "The valley is yours to explore again."]
  };
  if (messages[event.kind]) notify(...messages[event.kind], event.kind === "no-money");
  if (event.storyBeat === "lead") {
    notify("A DEED HAS BEEN MARKED", "Find the pulsing plot on the valley map.");
    flashStory("A CLUE IN THE MAP");
  }
  if (event.storyBeat === "reveal") {
    notify("PLOT TWIST UNLOCKED", "The survey board can rotate land deeds.");
    flashStory("PLOT TWIST!");
  }
  if (event.chargeEarned) notify("TURN EARNED", "Perfect coffee work earned a new plot twist.");
  if (["buy", "sell", "build"].includes(event.kind)) spawnParticles(event);
  if (event.kind === "twist") {
    twistAt = performance.now();
    twistedCells = event.block;
    flashStory("THE PLOTS TURN!");
    for (const id of event.block) {
      const point = mapPoint(id);
      for (let i = 0; i < 7; i++) particles.push({ x: point.x, y: point.y,
        vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4,
        life: 1, size: 2 + Math.random() * 4, color: "#f2d075" });
    }
  }
  if (["buy", "sell", "coffee-deliver", "goal"].includes(event.kind)) {
    moneyNode.classList.add("bump");
    setTimeout(() => moneyNode.classList.remove("bump"), 400);
  }
  if (event.kind === "goal") {
    for (let i = 0; i < 55; i++) particles.push({ x: Math.random() * canvasWidth, y: -Math.random() * 140,
      vx: (Math.random() - .5) * 2, vy: 1 + Math.random() * 2, life: 2, size: 3 + Math.random() * 4,
      color: ["#edca77", "#b9d793", "#f7e8b6", "#7cb5ad"][i % 4] });
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  tileSize = Math.min((canvasWidth - 34) / COLS, (canvasHeight - 34) / ROWS);
  originX = (canvasWidth - tileSize * COLS) / 2;
  originY = (canvasHeight - tileSize * ROWS) / 2;
}

function tileRect(x, y) { return [originX + x * tileSize, originY + y * tileSize, tileSize]; }
function tinyTile(index, x, y, width, height = width) {
  if (sprite.complete && sprite.naturalWidth === 192) {
    ctx.drawImage(sprite, (index % 12) * 16, Math.floor(index / 12) * 16, 16, 16, x, y, width, height);
  }
}

function drawRoad(x, y) {
  const [px, py, s] = tileRect(x, y);
  ctx.fillStyle = "#7eaa64"; ctx.fillRect(px, py, s + .5, s + .5);
  tinyTile(43, px, py, s + .5, s + .5);
  if (x === 5 && y === 4) tinyTile(95, px + s * .3, py + s * .06, s * .42);
}

function drawTerrainDetail(plot) {
  const [x, y, s] = tileRect(plot.x, plot.y);
  const seed = (plot.x * 17 + plot.y * 31 + state.seed) >>> 0;
  ctx.fillStyle = plot.type === 0 ? "#d9a06b" : "#7eaa64";
  ctx.fillRect(x, y, s + .5, s + .5);
  tinyTile(plot.type === 0 ? 25 : seed % 5 === 0 ? 1 : 0, x, y, s + .5, s + .5);
  if (plot.type === 0) {
    if (seed % 4 === 0) tinyTile(2, x + s * .33, y + s * .22, s * .38);
    else tinyTile(39, x + s * .13, y + s * .28, s * .7);
  } else if (plot.type === 1) {
    tinyTile(seed % 3 === 0 ? 2 : 1, x + s * .17, y + s * .21, s * .66);
    if (seed % 5 === 0) tinyTile(29, x + s * .55, y + s * .5, s * .34);
  } else if (plot.type === 2) {
    tinyTile([4, 5, 6, 16][seed % 4], x + s * .16, y + s * .06, s * .72);
    if (seed % 3 === 0) tinyTile(17, x + s * .56, y + s * .6, s * .3);
  } else {
    ctx.fillStyle = "#398db2"; ctx.fillRect(x + s * .13, y + s * .24, s * .75, s * .56);
    ctx.fillStyle = "#65b8d3"; ctx.fillRect(x + s * .2, y + s * .32, s * .62, s * .14);
    ctx.fillStyle = "#a0d8df"; ctx.fillRect(x + s * .29, y + s * .42, s * .23, Math.max(2, s * .055));
    tinyTile(seed % 2 ? 16 : 17, x + s * .03, y + s * .08, s * .31);
  }
}

function drawBuilding(plot, now) {
  const [x, y, s] = tileRect(plot.x, plot.y);
  const age = Math.max(0, (now - builtAt) / 400);
  const bounce = state.lastEvent?.kind === "build" && state.lastEvent.plotId === plot.id && age < 1 ? 1 + Math.sin(age * Math.PI) * .2 : 1;
  ctx.save(); ctx.translate(x + s * .5, y + s * .52); ctx.scale(bounce, bounce);
  ctx.fillStyle = "rgba(20,47,34,.36)"; ctx.fillRect(-s * .31, s * .24, s * .65, s * .08);
  const part = s * .35;
  tinyTile(64, -part, -part * .82, part, part);
  tinyTile(65, 0, -part * .82, part, part);
  tinyTile(76, -part, part * .18, part, part);
  tinyTile(77, 0, part * .18, part, part);
  tinyTile(85, -part * .8, part * .25, part * .45, part * .45);
  tinyTile(86, part * .38, part * .25, part * .45, part * .45);
  ctx.restore();
}

function drawMap(now) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#193b33"; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#345c4b"; ctx.fillRect(originX - 6, originY - 6, COLS * tileSize + 12, ROWS * tileSize + 12);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (isRoad(x, y)) drawRoad(x, y);
    else { const plot = getPlot(plotId(x, y)); drawTerrainDetail(plot); }
  }
  drawgrid(ctx, originX, originY, COLS, ROWS, tileSize, "rgba(27,59,43,.10)");
  if (state.story.chapter === 1) {
    const marked = getPlot(state.story.anomalyId);
    const [x, y, s] = tileRect(marked.x, marked.y);
    const pulse = .62 + Math.sin(now / 260) * .25;
    ctx.fillStyle = `rgba(252,217,117,${pulse * .22})`; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = `rgba(255,235,156,${pulse})`; ctx.lineWidth = Math.max(2, s * .055);
    ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = "#253c35"; ctx.fillRect(x + s * .65, y + s * .08, s * .25, s * .28);
    ctx.fillStyle = "#ffe6a1"; ctx.font = `bold ${Math.max(11, s * .22)}px Consolas, monospace`;
    ctx.textAlign = "center"; ctx.fillText("?", x + s * .775, y + s * .3);
  }
  const selected = selectedPlot();
  if (state.story.chapter >= 2 && selected) {
    for (const plot of getTwistBlock()) {
      highlight(ctx, plot.x, plot.y, originX, originY, tileSize, "rgba(255,220,119,.12)");
      const [x, y, s] = tileRect(plot.x, plot.y);
      ctx.strokeStyle = "rgba(255,226,143,.55)"; ctx.lineWidth = Math.max(1, s * .025);
      ctx.setLineDash([s * .13, s * .1]); ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
      ctx.setLineDash([]);
    }
  }
  if (selected?.building) {
    for (const neighbor of state.plots) {
      const distance = Math.abs(selected.x - neighbor.x) + Math.abs(selected.y - neighbor.y);
      if (distance > 0 && distance <= BUILDING.radius) highlight(ctx, neighbor.x, neighbor.y, originX, originY, tileSize, "rgba(241,219,135,.12)");
    }
  }
  for (const plot of state.plots) {
    const [x, y, s] = tileRect(plot.x, plot.y);
    if (plot.owner === "player") {
      ctx.strokeStyle = "#f6db9d"; ctx.lineWidth = Math.max(2, s * .065);
      ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = "#fff0b7"; ctx.beginPath(); ctx.moveTo(x + s - 2, y + 2); ctx.lineTo(x + s * .72, y + 2); ctx.lineTo(x + s - 2, y + s * .3); ctx.fill();
    }
    if (plot.building) drawBuilding(plot, now);
  }
  if (hoverId && hoverId !== state.selectedId) {
    const plot = getPlot(hoverId);
    if (plot) { const [x, y, s] = tileRect(plot.x, plot.y); ctx.fillStyle = "rgba(255,247,190,.18)"; ctx.fillRect(x, y, s, s); }
  }
  if (selected) {
    const [x, y, s] = tileRect(selected.x, selected.y);
    const pulse = 1 + Math.sin(now / 280) * .05;
    ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.scale(pulse, pulse);
    ctx.strokeStyle = "#fff4c5"; ctx.lineWidth = Math.max(2, s * .07);
    ctx.shadowColor = "#fff1ba"; ctx.shadowBlur = 10;
    ctx.strokeRect(-s * .52, -s * .52, s * 1.04, s * 1.04);
    ctx.restore();
  }
  if (now - twistAt < 700) {
    const alpha = 1 - (now - twistAt) / 700;
    for (const id of twistedCells) {
      const plot = getPlot(id);
      const [x, y, s] = tileRect(plot.x, plot.y);
      ctx.strokeStyle = `rgba(255,239,158,${alpha})`;
      ctx.lineWidth = Math.max(2, s * .1 * alpha);
      ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
    }
  }
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += .035; p.life -= .025;
    ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function brewPosition(now) {
  const sweep = ((now - brewStart) / 1550) % 2;
  return Math.max(0, Math.min(100, (sweep <= 1 ? sweep : 2 - sweep) * 100));
}

function animate(now) {
  requestAnimationFrame(animate);
  if (now - lastFrame < 32) return;
  lastFrame = now;
  drawMap(now);
  if (route === "coffee" && state.coffeeShopProgress.step === "prepared") {
    const needle = $("#brew-needle");
    if (needle) needle.style.left = `${brewPosition(now)}%`;
  }
}

function tileFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const cell = convert(event.clientX - rect.left, event.clientY - rect.top, originX, originY, tileSize);
  if (cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS || isRoad(cell.x, cell.y)) return null;
  return plotId(cell.x, cell.y);
}

canvas.addEventListener("pointermove", event => { hoverId = tileFromPointer(event); canvas.style.cursor = hoverId ? "pointer" : "default"; });
canvas.addEventListener("pointerleave", () => { hoverId = null; });
canvas.addEventListener("click", event => {
  const id = tileFromPointer(event);
  if (!id) return;
  selectPlot(id);
  if (route !== "land") location.hash = "land";
});
canvas.tabIndex = 0;
canvas.addEventListener("keydown", event => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const current = selectedPlot() || state.plots[0];
  const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
  let x = current.x, y = current.y;
  for (let i = 0; i < Math.max(COLS, ROWS); i++) {
    x += delta[0]; y += delta[1];
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) break;
    if (!isRoad(x, y)) { selectPlot(plotId(x, y)); if (route !== "land") location.hash = "land"; break; }
  }
});

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  playSound("navigate");
  location.hash = button.dataset.route;
  if (route === button.dataset.route) setRoute(route);
}));
const soundButton = $("#sound-toggle");
function updateSoundButton() {
  const on = soundEnabled();
  soundButton.textContent = on ? "♪ SOUND ON" : "♪ SOUND OFF";
  soundButton.setAttribute("aria-pressed", String(on));
  soundButton.setAttribute("aria-label", on ? "Turn game sound off" : "Turn game sound on");
}
soundButton.addEventListener("click", () => { setSoundEnabled(!soundEnabled()); updateSoundButton(); });
document.addEventListener("pointerdown", resumeSound, { once: true });
window.addEventListener("hashchange", () => setRoute(location.hash.slice(1)));
view.addEventListener("click", event => {
  const choice = event.target.closest("[data-select]");
  if (choice) { selectPlot(choice.dataset.select); location.hash = "land"; return; }
  const ingredient = event.target.closest("[data-ingredient]")?.dataset.ingredient;
  if (ingredient) { prepareCoffee(ingredient); return; }
  const customer = event.target.closest("[data-customer]")?.dataset.customer;
  if (customer) { deliverCoffee(customer); return; }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "brew") {
    if (state.coffeeShopProgress.step !== "prepared") return;
    const order = ORDERS[state.coffeeShopProgress.orderIndex % ORDERS.length];
    const error = Math.abs(brewPosition(performance.now()) - order.target);
    const grade = error <= 8 ? 2 : error <= 19 ? 1 : 0;
    brewStart = 0;
    completeCoffee(grade);
    return;
  }
  if (action === "reset") {
    if (!resetArmed) { resetArmed = true; renderView(); return; }
    resetArmed = false;
    particles = [];
    brewStart = 0;
    twistedCells = [];
    popup.classList.remove("show");
    popup.textContent = "";
    $("#story-flash").classList.remove("show");
    $("#story-flash").textContent = "";
    $("#toast-stack").replaceChildren();
    resetGame();
    location.hash = "land";
    return;
  }
  ({ buy: buySelected, sell: sellSelected, build: buildSelected, twist: twistSelected,
    goal: purchaseCar, "coffee-route": () => { location.hash = "coffee"; } })[action]?.();
});

subscribe((_, kind) => {
  updateChrome();
  if (kind || route === "land" || route === "market" || route === "buildings") renderView();
  handleEvent(state.lastEvent);
});
const observer = new ResizeObserver(resizeCanvas);
observer.observe(canvas);
resizeCanvas();
setRoute(location.hash.slice(1));
updateChrome();
updateSoundButton();
setInterval(tick, TICK_MS);
requestAnimationFrame(animate);
