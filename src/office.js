import { state, EMPLOYEES, employeeLevel, monthlyBillQuote, daysUntilBill,
  economyValue, ownedValue, netRunProfit, marketAdvice } from "./state.js";

const money = amount => `${amount < 0 ? "−" : ""}$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;
const signed = amount => `${amount >= 0 ? "+" : "−"}$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;

export function renderAdvisorTips() {
  const tips = marketAdvice();
  if (!tips.length) return `<div class="advisor-invite"><span class="advisor-icon">⌁</span><div><strong>PUT SOMEONE ON THE CASE</strong><p>Hire an analyst in the Office for reports drawn from these prices. Train them to unlock a three-day forecast.</p><button class="text-button" data-action="office-route">Visit the office →</button></div></div>`;
  return `<div class="advisor-reports">${tips.map(tip => {
    const employee = EMPLOYEES.find(entry => entry.id === tip.employee);
    return `<article class="advisor-report ${tip.tone}"><span class="advisor-icon staff-${employee.id}">${employee.symbol}</span><div><strong>${employee.name} <small>LV ${employeeLevel(employee.id)}</small></strong><p>${tip.text}</p></div></article>`;
  }).join("")}</div>`;
}

export function renderBillPreview(compact = false) {
  const bill = monthlyBillQuote();
  return `<div class="bill-preview ${compact ? "compact" : ""}"><div class="bill-title"><span>MONTH ${bill.month} / NEXT BILL</span><strong>${daysUntilBill()} ${daysUntilBill() === 1 ? "DAY" : "DAYS"}</strong></div><div class="bill-total"><div><span>ESTIMATED TOTAL</span><strong>${money(bill.total)}</strong></div><p>Insurance ${money(bill.insurance)}<br>Tax ${money(bill.tax)}</p></div><p class="bill-explanation">${(bill.rate * 100).toFixed(1)}% of ${money(bill.wealth)}: cash + owned property. Buildings are already included. Estimate changes with your wealth.</p>${state.money < bill.total ? `<p class="bill-warning">Cash is short. A coffee shift or a sale can cover the bill. Unpaid cash becomes a small overdraft; land stays yours.</p>` : ""}</div>`;
}

function renderLedger() {
  const finance = state.finance;
  const labels = { coffee: "Coffee order", buy: "Land purchase", sell: "Land sale", build: "Field station", staff: "Office upgrade", bill: "Insurance + tax", car: "Red roadster" };
  const rows = [...finance.history].reverse().map(entry => {
    const billDetail = entry.kind === "bill" && Number.isFinite(entry.insurance) && Number.isFinite(entry.tax)
      ? `<small>Insurance ${money(entry.insurance)} · Tax ${money(entry.tax)}</small>` : "";
    return `<div class="ledger-row"><span>D${entry.day + 1}</span><strong>${labels[entry.kind]}${billDetail}</strong><b class="${entry.amount >= 0 ? "up" : "down"}">${signed(entry.amount)}</b></div>`;
  }).join("");
  return `<details class="ledger-history"><summary>TRANSACTION LEDGER <span>${finance.history.length} RECENT ENTRIES</span></summary><div class="ledger-rows">${rows || `<p class="ledger-empty">Your next transaction will appear here.</p>`}</div></details>`;
}

export function renderOffice() {
  const profit = netRunProfit();
  const finance = state.finance;
  return `<div class="section-heading"><div><h2>The office</h2><p>A little local expertise goes a long way.</p></div><span class="section-index">05 / OFFICE</span></div>
    <div class="office-summary"><div><span>CURRENT ECONOMY</span><strong>${money(economyValue())}</strong></div><div><span>NET RUN GAIN</span><strong class="${profit >= 0 ? "up" : "down"}">${signed(profit)}</strong></div></div>
    <p class="office-note">Net gain includes coffee, property gains, office spending, insurance and tax. ${finance.trackingSinceDay ? `This save's ledger started on day ${finance.trackingSinceDay + 1}.` : "The roadster keeps its value as your final reward."}</p>
    ${renderBillPreview()}
    ${finance.lastBill ? `<div class="last-bill"><span>MONTH ${finance.lastBill.month} CLOSED</span><strong>${money(finance.lastBill.total)} paid</strong><small>Insurance ${money(finance.lastBill.insurance)} · Tax ${money(finance.lastBill.tax)}</small></div>` : ""}
    <div class="office-section-title"><h3>Your local team</h3><span>ONE-TIME HIRE / TRAINING COSTS</span></div>
    <div class="employee-grid">${EMPLOYEES.map(employee => {
      const level = employeeLevel(employee.id);
      const cost = employee.costs[level];
      return `<article class="employee-card ${level ? "hired" : ""}"><div class="employee-head"><span class="employee-portrait staff-${employee.id}" aria-hidden="true"><i></i><b>${employee.symbol}</b></span><div><span>${level ? `LEVEL ${level} / ${level === 2 ? "EXPERT" : "HIRED"}` : "AVAILABLE TO HIRE"}</span><h3>${employee.name}</h3></div></div><p>${level ? employee.benefit[level - 1] : employee.benefit[0]}</p>${level < 2 ? `<small>${level ? `Next: ${employee.benefit[level]}` : `Expert: ${employee.benefit[1]}`}</small><button class="secondary" data-employee="${employee.id}" ${state.money < cost ? "disabled" : ""}>${level ? "Train" : "Hire"} · ${money(cost)}</button>` : `<div class="employee-max">✓ FULLY TRAINED</div>`}</article>`;
    }).join("")}</div>
    <div class="finance-totals"><div><span>Coffee earned</span><b>${money(finance.coffeeEarnings)}</b></div><div><span>Realized land profit</span><b class="${finance.realizedLandProfit >= 0 ? "up" : "down"}">${signed(finance.realizedLandProfit)}</b></div><div><span>Owned property</span><b>${money(ownedValue())}</b></div><div><span>Insurance + tax paid</span><b>${money(finance.insurancePaid + finance.taxPaid)}</b></div><div><span>Team investment</span><b>${money(finance.staffSpent)}</b></div></div>
    ${renderLedger()}`;
}
