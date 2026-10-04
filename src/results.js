import { state, TYPES, DAYS_PER_MONTH, ownedValue, netRunProfit, saleValue } from "./state.js";
import { renderCar } from "./car.js";
const money = amount => `${amount < 0 ? "−" : ""}$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;

export function renderResults(restartArmed = false) {
  const finance = state.finance;
  const best = state.market.map((entry, type) => ({ type, gain: (entry.currentPrice / entry.basePrice - 1) * 100 }))
    .sort((a, b) => b.gain - a.gain)[0];
  const investments = state.plots.filter(plot => plot.owner === "player").map(plot => ({ type: plot.type, profit: saleValue(plot) - plot.costBasis }));
  if (finance.worstDeal) investments.push(finance.worstDeal);
  const worst = investments.sort((a, b) => a.profit - b.profit)[0];
  const months = Math.floor(state.gameTime / DAYS_PER_MONTH);
  const stats = [
    ["CASH AFTER PURCHASE", money(state.money)], ["TOTAL LAND OWNED", `${state.ownedPlots.length} ${state.ownedPlots.length === 1 ? "parcel" : "parcels"}`],
    ["OWNED LAND VALUE", money(ownedValue())], ["NET RUN GAIN", money(netRunProfit())],
    ["BUILDINGS CONSTRUCTED", finance.buildingsBuilt], ["COFFEE EARNINGS", money(finance.coffeeEarnings)],
    ["BEST MARKET TYPE", `${TYPES[best.type].name} ${best.gain >= 0 ? "+" : ""}${best.gain.toFixed(1)}%`],
    ["LOWEST INVESTMENT RETURN", worst ? `${TYPES[worst.type].name} · ${money(worst.profit)}` : "No investments yet"],
    ["INSURANCE + TAX PAID", money(finance.insurancePaid + finance.taxPaid)],
    ["TIME IN THE VALLEY", `${state.gameTime} ${state.gameTime === 1 ? "day" : "days"} / ${months} ${months === 1 ? "month" : "months"}`]
  ];
  return `<div class="results-content"><div class="results-sparks" aria-hidden="true">${Array.from({ length: 18 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div>
    <span class="results-kicker">THE VALLEY EXCHANGE / RUN REPORT</span><h2 id="results-title">GOAL ACHIEVED!</h2><p class="results-intro">You earned enough to buy your dream car.<br>The red roadster is yours.</p>
    <div class="results-car">${renderCar("results")}<span>CAR GOAL · 100% COMPLETE</span></div>
    <div class="results-stats">${stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
    <p class="results-note">Net run gain includes your remaining cash, property, and roadster, less starting wealth. Bills and office spending are included. Best market type compares with its opening price.${finance.trackingSinceDay ? ` Earnings records for this imported save began on day ${finance.trackingSinceDay + 1}.` : ""}</p>
    <div class="results-actions"><button type="button" class="primary" data-result="continue" autofocus>CONTINUE</button><button type="button" class="secondary ${restartArmed ? "armed" : ""}" data-result="restart">${restartArmed ? "YES, ERASE THIS RUN" : "RESTART"}</button></div>
    ${restartArmed ? `<p class="restart-warning">Restart clears your money, land, team, market, history, and car. <button class="text-button" data-result="cancel">Keep this run</button></p>` : `<p class="results-paused">GAME PAUSED · Continue keeps everything you have earned.</p>`}</div>`;
}
