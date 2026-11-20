/** CityMap draws the animated road network on a canvas and reports clicks. */
const W = 800, H = 520;
const trafficColor = t => (t < 0.5 ? "#3be8a0" : t < 1.2 ? "#ffb84d" : "#ff4d6d");

export class CityMap {
  constructor(canvas, network, state, { onNode, onRoad }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.net = network;
    this.state = state;
    this.time = 0;
    this.lastFrame = 0;
    this.hover = null;
    this.reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Three cars per road: two driving one way, one the other way.
    this.cars = network.roads.flatMap((_, road) =>
      [0, 1, 2].map(i => ({ road, progress: Math.random(), dir: i % 2 ? 1 : -1 })));

    canvas.onmousemove = e => (this.hover = this.hitTest(e));
    canvas.onmouseleave = () => (this.hover = null);
    canvas.onclick = e => {
      const hit = this.hitTest(e);
      if (hit?.node != null) onNode(hit.node);
      else if (hit) onRoad(hit.road);
    };
    requestAnimationFrame(ts => this.frame(ts));
  }

  pt(i) { return [this.net.nodes[i].x, this.net.nodes[i].y]; }
  roadName(i) { const r = this.net.roads[i]; return `${this.net.nodes[r.a].name} – ${this.net.nodes[r.b].name}`; }

  /** Find the junction or road under the mouse. */
  hitTest(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * W / rect.width;
    const y = (event.clientY - rect.top) * H / rect.height;
    for (let i = 0; i < this.net.nodes.length; i++) {
      if (Math.hypot(this.pt(i)[0] - x, this.pt(i)[1] - y) < 18) return { node: i };
    }
    let best = null, bestDist = 11;
    this.net.roads.forEach((r, road) => {
      const [ax, ay] = this.pt(r.a), [bx, by] = this.pt(r.b);
      const dx = bx - ax, dy = by - ay;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      const d = Math.hypot(ax + u * dx - x, ay + u * dy - y);
      if (d < bestDist) { bestDist = d; best = { road }; }
    });
    return best;
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.lastFrame) / 1000 || 0);
    this.lastFrame = ts;
    if (!this.reduceMotion) this.time += dt;
    const s = this.state;
    s.reveal = Math.min(s.result.order.length, s.reveal + dt * 6); // exploration animation
    this.draw(dt);
    requestAnimationFrame(t => this.frame(t));
  }

  draw(dt) {
    const done = this.state.reveal >= this.state.result.order.length;
    this.drawBackground();
    this.drawRoads();
    if (done) this.drawRoute(this.state.result.path, "#4de1ff", 4, true);
    if (this.state.ambulance) this.drawRoute(this.state.ambulance, Math.floor(this.time * 4) % 2 ? "#ff4d6d" : "#4d7bff", 3, false);
    this.drawCars(dt);
    if (done) this.drawTraveler(this.state.result.path, 70, "#4de1ff", 5);
    if (this.state.ambulance) this.drawTraveler(this.state.ambulance, 170, Math.floor(this.time * 5) % 2 ? "#ff4d6d" : "#6f8bff", 6);
    this.drawNodes(done);
    this.drawTooltip();
  }

  drawBackground() {
    const c = this.ctx, g = c.createRadialGradient(400, 260, 60, 400, 260, 520);
    g.addColorStop(0, "#0e1836");
    g.addColorStop(1, "#050810");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffffff0f";
    for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) c.fillRect(x, y, 1.5, 1.5);
  }

  line(a, b, color, width) {
    const c = this.ctx;
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round";
    c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
  }

  drawRoads() {
    const c = this.ctx, s = this.state, mst = new Set(s.result.mst || []);
    this.net.roads.forEach((r, i) => {
      const a = this.pt(r.a), b = this.pt(r.b);
      if (this.hover?.road === i) this.line(a, b, "#ffffff40", 12);
      this.line(a, b, "#141d3a", 9);
      if (s.closed.has(i)) {
        c.setLineDash([2, 8]); this.line(a, b, "#5c6a8a", 3); c.setLineDash([]);
        c.fillStyle = "#ff4d6d"; c.font = "700 15px Manrope";
        c.fillText("✕", (a[0] + b[0]) / 2 - 5, (a[1] + b[1]) / 2 + 5);
      } else {
        this.line(a, b, trafficColor(s.traffic[i]), 2.5);
      }
      if (mst.has(i)) { c.shadowColor = "#b48cff"; c.shadowBlur = 14; this.line(a, b, "#b48cff", 5); c.shadowBlur = 0; }
    });
  }

  drawRoute(path, color, width, animated) {
    if (path.length < 2) return;
    const c = this.ctx;
    c.shadowColor = color; c.shadowBlur = 18; c.strokeStyle = color; c.lineWidth = width;
    c.setLineDash(animated ? [12, 9] : [4, 6]); c.lineDashOffset = -this.time * 40;
    c.beginPath();
    path.forEach((n, j) => (j ? c.lineTo(...this.pt(n)) : c.moveTo(...this.pt(n))));
    c.stroke(); c.setLineDash([]); c.shadowBlur = 0;
  }

  drawCars(dt) {
    const c = this.ctx;
    this.cars.forEach(car => {
      const road = this.net.roads[car.road];
      if (this.state.closed.has(car.road)) return;
      const [ax, ay] = this.pt(road.a), [bx, by] = this.pt(road.b);
      const len = Math.hypot(bx - ax, by - ay);
      // Congestion slows cars down, so jams show up as bunched-up traffic.
      if (!this.reduceMotion) car.progress = (car.progress + dt * 26 / (1 + this.state.traffic[car.road]) / len) % 1;
      const q = car.dir > 0 ? car.progress : 1 - car.progress;
      const laneX = -(by - ay) / len * car.dir * 2.4, laneY = (bx - ax) / len * car.dir * 2.4;
      c.fillStyle = c.shadowColor = car.dir > 0 ? "#ffe2a8" : "#ff5a78";
      c.shadowBlur = 8;
      c.beginPath(); c.arc(ax + (bx - ax) * q + laneX, ay + (by - ay) * q + laneY, 2, 0, 7); c.fill();
    });
    c.shadowBlur = 0;
  }

  /** A glowing dot that travels along a route. */
  drawTraveler(path, speed, color, radius) {
    if (path.length < 2) return;
    const pts = path.map(n => this.pt(n));
    const total = pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    let d = (this.time * speed) % total, pos = pts[pts.length - 1];
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= len) { const u = d / len; pos = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; break; }
      d -= len;
    }
    const c = this.ctx;
    c.shadowColor = c.fillStyle = color; c.shadowBlur = 22;
    c.beginPath(); c.arc(...pos, radius, 0, 7); c.fill(); c.shadowBlur = 0;
  }

  drawNodes(done) {
    const c = this.ctx, s = this.state;
    const explored = new Set(s.result.order.slice(0, Math.floor(s.reveal)));
    const onRoute = new Set(done ? s.result.path : []);
    this.net.nodes.forEach((n, i) => {
      const special = i === s.from || i === s.to;
      if (explored.has(i) && !onRoute.has(i)) {
        c.fillStyle = "#4de1ff22"; c.beginPath(); c.arc(n.x, n.y, 20 + Math.sin(this.time * 4 + i) * 2, 0, 7); c.fill();
      }
      c.fillStyle = "#0a1226";
      c.strokeStyle = i === s.from ? "#3be8a0" : i === s.to ? "#ff4d6d" : onRoute.has(i) ? "#4de1ff" : "#8d9bb8";
      c.lineWidth = special ? 3 : 2;
      if (special) { c.shadowColor = c.strokeStyle; c.shadowBlur = 16; }
      c.beginPath(); c.arc(n.x, n.y, special ? 10 : 7, 0, 7); c.fill(); c.stroke(); c.shadowBlur = 0;
      c.fillStyle = "#cdd7f2"; c.font = "600 11px Manrope"; c.textAlign = "center";
      c.fillText(n.name, n.x, n.y + 25); c.textAlign = "left";
    });
  }

  drawTooltip() {
    if (!this.hover) return;
    const c = this.ctx, s = this.state;
    let text, x, y;
    if (this.hover.node != null) {
      const n = this.net.nodes[this.hover.node];
      [text, x, y] = [n.name, n.x, n.y];
    } else {
      const i = this.hover.road, r = this.net.roads[i];
      const status = s.closed.has(i) ? "closed" : `traffic ${Math.round(Math.min(s.traffic[i], 2) / 2 * 100)}%`;
      text = `${this.roadName(i)} · ${r.km} km · ${status}`;
      x = (this.pt(r.a)[0] + this.pt(r.b)[0]) / 2; y = (this.pt(r.a)[1] + this.pt(r.b)[1]) / 2;
    }
    c.font = "600 12px Manrope";
    const width = c.measureText(text).width + 16, left = Math.min(W - width - 4, Math.max(4, x - width / 2));
    c.fillStyle = "#000d"; c.fillRect(left, y - 40, width, 22);
    c.fillStyle = "#fff"; c.fillText(text, left + 8, y - 24);
  }
}
