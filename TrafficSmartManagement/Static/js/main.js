/** Wires the controls, the live city simulation and the dashboard to the Flask API. */
import { api } from "./api.js";
import { CityMap } from "./map.js";

const $ = id => document.getElementById(id);
const state = { from: 3, to: 1, traffic: [], closed: new Set(), result: { path: [], order: [] }, reveal: 0, ambulance: null, live: true };
let network, city, pickingTo = false;

const payload = () => ({ alg: $("alg").value, mode: $("mode").value, src: state.from, dst: state.to,
  traffic: state.traffic, closed: [...state.closed] });
const unit = () => ($("mode").value === "time" ? " min" : " km");

/* ---------- Dashboard rendering ---------- */
function log(message, warning = false) {
  const li = document.createElement("li");
  li.className = warning ? "warn" : "";
  li.innerHTML = `${message}<small>${new Date().toLocaleTimeString()}</small>`;
  $("feed").prepend(li);
  while ($("feed").children.length > 6) $("feed").lastChild.remove();
}

function renderHealth() {
  const congestion = state.traffic.reduce((sum, t) => sum + Math.min(t, 2), 0) / state.traffic.length;
  const health = Math.max(0, Math.round(100 - 28 * congestion - 45 * state.closed.size / state.traffic.length));
  $("ring").style.setProperty("--v", health);
  $("ring").style.setProperty("--c", health > 70 ? "var(--ok)" : health > 40 ? "var(--mid)" : "var(--tail)");
  $("health").textContent = health;
  $("k-closed").textContent = state.closed.size;
}

function renderResult(r) {
  renderHealth();
  if (r.mst) {
    $("k-trip-label").textContent = "Network cost";
    $("k-trip").textContent = r.cost.toFixed(1) + unit();
    $("k-delay").textContent = r.mst.length + " roads";
    $("k-explored").textContent = "–";
    $("path").textContent = "Purple roads are the cheapest network that still connects every reachable junction. Roads left out are candidates for closure or lower upkeep.";
    return;
  }
  const found = r.path.length > 0;
  $("k-trip-label").textContent = $("mode").value === "time" ? "Trip time" : "Distance";
  $("k-trip").textContent = found ? r.cost.toFixed(1) + unit() : "No route";
  $("k-delay").textContent = found ? "+" + Math.max(0, r.cost - r.free_flow).toFixed(1) + unit() : "–";
  $("k-explored").textContent = r.order.length;
  $("path").innerHTML = found
    ? "<b>Route:</b> " + r.path.map(i => network.nodes[i].name).join(" › ")
    : "<b>No route.</b> Closed roads cut these junctions off. Reopen a road to reconnect them.";
}

const table = (headers, rows) =>
  `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>` + rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");

async function renderComparison() {
  const rows = await api("/api/compare", payload());
  $("compare").innerHTML = table(["Algorithm", "Cost", "Explored", "Avg time (ms)", "Optimal"],
    rows.map(r => [r.name, r.cost == null ? "–" : r.cost.toFixed(1), r.explored, r.ms, r.optimal ? "Yes" : "No"]));
}

/* ---------- Actions ---------- */
async function refresh(animate = true) {
  const result = await api("/api/route", payload());
  state.result = result;
  state.reveal = animate ? 0 : result.order.length;
  renderResult(result);
  if (animate) renderComparison();
  return result;
}

async function dispatchAmbulance() {
  if (state.from === network.hospital) return log("Pick a start other than Hospital.", true);
  const r = await api("/api/ambulance", payload());
  if (!r.path.length) return log("Ambulance cannot reach Hospital: roads are closed.", true);
  state.ambulance = r.path;
  log(`<b>Ambulance dispatched.</b> ${r.minutes.toFixed(1)} min with signals cleared, ${r.saved.toFixed(1)} min faster than normal traffic.`, true);
}

/** Every few seconds the city throws an accident or a congestion surge at the network. */
async function cityEvent() {
  if (!state.live) return;
  state.traffic = state.traffic.map(t => Math.max(0, t - 0.08));
  const before = state.result.cost;
  if (Math.random() < 0.5) {
    const open = state.traffic.map((_, i) => i).filter(i => !state.closed.has(i));
    const road = open[Math.floor(Math.random() * open.length)];
    if (road === undefined) return;
    if (Math.random() < 0.5) {
      state.closed.add(road);
      setTimeout(() => { state.closed.delete(road); log("Road reopened: " + city.roadName(road)); refresh(false); }, 12000);
      log(`<b>Accident</b> on ${city.roadName(road)}. Road closed.`, true);
    } else {
      state.traffic[road] = Math.min(2.5, state.traffic[road] + 1.4);
      log("Congestion surge on " + city.roadName(road) + ".");
    }
    const after = await refresh(false);
    if (after.path.length && before != null && Math.abs(after.cost - before) > 0.05) {
      log(`Route recalculated: ${after.cost > before ? "+" : ""}${(after.cost - before).toFixed(1)} min.`);
    }
  } else {
    refresh(false);
  }
}

function setTraffic(fn, message) {
  state.traffic = state.traffic.map((_, i) => fn(network.roads[i]));
  if (message) log(message, true);
  refresh();
}

async function runBenchmark() {
  $("bench").disabled = true;
  const rows = await api("/api/benchmark");
  const names = Object.keys(rows[0]).slice(2);
  $("benchmark").innerHTML = table(["Junctions", "Roads", ...names], rows.map(r => [r.junctions, r.roads, ...names.map(n => r[n])]));
  $("bench").disabled = false;
}

/* ---------- Start up ---------- */
async function init() {
  network = await api("/api/network");
  state.traffic = network.roads.map(() => 0);
  for (const id of ["from", "to"]) network.nodes.forEach((n, i) => $(id).add(new Option(n.name, i)));
  $("from").value = state.from;
  $("to").value = state.to;

  city = new CityMap($("map"), network, state, {
    onNode: i => {
      if (pickingTo) { state.to = i; $("to").value = i; } else { state.from = i; $("from").value = i; }
      pickingTo = !pickingTo;
      refresh();
    },
    onRoad: i => {
      state.closed.has(i) ? state.closed.delete(i) : state.closed.add(i);
      log((state.closed.has(i) ? "Road closed: " : "Road reopened: ") + city.roadName(i), state.closed.has(i));
      refresh();
    },
  });

  $("from").onchange = () => { state.from = +$("from").value; refresh(); };
  $("to").onchange = () => { state.to = +$("to").value; refresh(); };
  $("alg").onchange = $("mode").onchange = $("run").onclick = () => refresh();
  $("ambulance").onclick = dispatchAmbulance;
  $("live").onclick = () => { state.live = !state.live; $("live").textContent = "Live city: " + (state.live ? "on" : "off"); };
  $("rush").onclick = () => setTraffic(r => ([0, 5, 6, 7].some(n => r.a === n || r.b === n) ? 1.5 + Math.random() : Math.random() * 0.4), "<b>Rush hour</b> started. Traffic rising around the centre.");
  $("random").onclick = () => setTraffic(() => Math.random() * 2);
  $("reset").onclick = () => { state.closed.clear(); state.ambulance = null; log("Network reset."); setTraffic(() => 0); };
  $("bench").onclick = runBenchmark;

  log("Control room online. Live events are on.");
  await refresh();
  setInterval(cityEvent, 3500);
}

init();
