"use strict";
// Top-down racing engine: scrolling road, scenery, traffic, coins, obstacles, power-ups, rival / police missions, HUD.
const FONT = "system-ui,'Segoe UI',Roboto,sans-serif";
const TRAFFIC = ["#4caf50","#ffc107","#9c27b0","#00bcd4","#ff9800","#8bc34a","#e91e63","#b0bec5","#3f51b5","#f44336"];
const SENS = {low:28, med:20, high:14};
const ITEMS = {shield:{icon:"🛡️", col:"#6bbcff", label:"SHIELD"}, magnet:{icon:"🧲", col:"#ff7a7a", label:"MAGNET"}, slow:{icon:"⏳", col:"#c79bff", label:"SLOW-MO"}};
const POLICE_SPEC = {shape:2, len:1.85, color:"#f2f2f2", metal:false, stripe:"black", spoiler:false};
const RIVAL_SPEC = {shape:7, len:2.05, color:"#17171d", metal:false, stripe:"gold", spoiler:false};
let cv, ctx, W = 0, H = 0, DPR = 1;
let rw = 300, rx = 0, scrollT = 0, scrollL = 0, worldDist = 0, scenery = [], lampAcc = 0, streaks = [], parts = [], drops = [], vigC = null;
let env = ENVS.noon;
const inp = {gamma:0, cal:0, live:false, keys:0, nitro:false};
const Scene = {mode:"demo", veh:"street", time:0};
const G = {state:"menu"};
const low = () => save.quality === "low";

function engineInit(){
  cv = $("cv"); ctx = cv.getContext("2d");
  addEventListener("resize", resize); resize();
  seedWorld();
}
function resize(){
  DPR = low() ? 1 : Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  vigC = null; layout();
}
function layout(){ rw = Math.min(W*.78, 400); rx = (W - rw)/2; }

// ------------------------------------------------------------------ textures
function tile(base, dots, size){
  const c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d"); x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < dots.n; i++){
    x.fillStyle = dots.cols[(Math.random()*dots.cols.length)|0];
    const s = 1 + Math.random()*dots.s; x.fillRect(Math.random()*size, Math.random()*size, s, s);
  }
  return c;
}
const asphaltTile = tile("#2c3038", {n:700, s:2, cols:["rgba(255,255,255,.05)","rgba(0,0,0,.18)","rgba(255,255,255,.09)"]}, 128);
const grassTile = tile("#2f7d3a", {n:900, s:3, cols:["rgba(255,255,255,.06)","rgba(0,0,0,.14)","rgba(180,255,140,.1)","rgba(255,240,120,.18)"]}, 128);
let asphaltPat, grassPat;
function patterns(){ if (!asphaltPat){ asphaltPat = ctx.createPattern(asphaltTile, "repeat"); grassPat = ctx.createPattern(grassTile, "repeat"); } }

function amb(){
  if (env.id === "auto") return {n:.5 - .5*Math.cos(worldDist/90000*Math.PI*2), rain:0};
  return {n:env.n, rain:env.rain};
}

// ------------------------------------------------------------------ scenery
function addScenery(y){
  const side = Math.random() < .5 ? -1 : 1, margin = side < 0 ? rx : W - (rx + rw);
  if (margin < 30) return;
  const roll = Math.random(), o = {y, side};
  if (roll < .5 || margin < 60){ o.k = "tree"; o.r = 12 + Math.random()*Math.min(14, margin/3); o.col = Math.random() < .5 ? "#1f7a35" : "#2c9142"; }
  else if (roll < .72){ o.k = "bush"; o.r = 7 + Math.random()*5; o.col = "#3da64d"; }
  else { o.k = "house"; o.w = 34 + Math.random()*Math.min(26, margin - 40); o.h = 36 + Math.random()*40; o.col = ["#c8553d","#3d6ec8","#c8a53d","#7b5cc8","#6b7280"][(Math.random()*5)|0]; }
  const sz = o.k === "house" ? o.w : o.r*2;
  o.x = side < 0 ? 6 + Math.random()*Math.max(1, rx - sz - 18) + (o.k === "house" ? 0 : sz/2)
                 : rx + rw + 18 + Math.random()*Math.max(1, margin - sz - 26) + (o.k === "house" ? 0 : sz/2);
  scenery.push(o);
}
function seedWorld(){
  scenery = []; layout();
  for (let y = 0; y < H + 100; y += 26) if (Math.random() < .55) addScenery(y);
  streaks = []; for (let i = 0; i < 16; i++) streaks.push({x:Math.random()*W, y:Math.random()*H, l:20 + Math.random()*50});
  drops = []; for (let i = 0; i < 90; i++) drops.push({x:Math.random()*W, y:Math.random()*H});
}
function updateWorld(dt, v){
  layout();
  scrollT = (scrollT + v*dt) % 128; scrollL = (scrollL + v*dt) % 80; worldDist += v*dt; lampAcc += v*dt;
  if (lampAcc > 300){ lampAcc = 0; scenery.push({k:"lamp", side:-1, x:rx - 16, y:-20}); scenery.push({k:"lamp", side:1, x:rx + rw + 16, y:-20}); }
  if (Math.random() < v*dt/70*(low() ? .6 : 1)) addScenery(-40);
  for (const s of scenery) s.y += v*dt;
  scenery = scenery.filter(s => s.y < H + 100);
  for (const s of streaks){ s.y += v*1.6*dt; if (s.y > H + 60){ s.y = -60; s.x = Math.random()*W; s.l = 20 + Math.random()*50; } }
}
function drawRoad(){
  patterns();
  const a = amb();
  ctx.save(); ctx.translate(0, scrollT); ctx.fillStyle = grassPat; ctx.fillRect(0, -128, W, H + 128); ctx.restore();
  ctx.save(); ctx.translate(0, scrollT); ctx.fillStyle = asphaltPat; ctx.fillRect(rx, -128, rw, H + 128); ctx.restore();
  const eg = ctx.createLinearGradient(rx, 0, rx + rw, 0);
  eg.addColorStop(0, "rgba(0,0,0,.35)"); eg.addColorStop(.12, "rgba(0,0,0,0)"); eg.addColorStop(.88, "rgba(0,0,0,0)"); eg.addColorStop(1, "rgba(0,0,0,.35)");
  ctx.fillStyle = eg; ctx.fillRect(rx, 0, rw, H);
  for (let y = -80 + scrollL; y < H; y += 80){
    const odd = Math.round((y - scrollL)/80) % 2;
    ctx.fillStyle = odd ? "#d9382f" : "#f1f1f1"; ctx.fillRect(rx - 9, y, 9, 40); ctx.fillRect(rx + rw, y, 9, 40);
    ctx.fillStyle = odd ? "#f1f1f1" : "#d9382f"; ctx.fillRect(rx - 9, y + 40, 9, 40); ctx.fillRect(rx + rw, y + 40, 9, 40);
  }
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(rx + 5, 0, 3, H); ctx.fillRect(rx + rw - 8, 0, 3, H);
  for (let y = -80 + scrollL; y < H; y += 80) for (const k of [1, 2]){ ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.fillRect(rx + rw*k/3 - 2, y + 10, 4, 44); }
  for (const s of scenery) drawScenery(s, a.n);
}
function drawScenery(s, n){
  if (s.k === "tree" || s.k === "bush"){
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(s.x + s.r*.35, s.y + s.r*.45, s.r, s.r*.9, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(s.x - s.r*.3, s.y - s.r*.3, s.r*.1, s.x, s.y, s.r);
    g.addColorStop(0, "#7fd68a"); g.addColorStop(.45, s.col); g.addColorStop(1, "#124d22");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    if (s.k === "tree"){ ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.arc(s.x - s.r*.3, s.y - s.r*.3, s.r*.35, 0, 7); ctx.fill(); }
  } else if (s.k === "house"){
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(s.x + 6, s.y + 6, s.w, s.h);
    ctx.fillStyle = s.col; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(s.x + s.w/2, s.y, s.w/2, s.h);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(s.x, s.y, s.w, 3);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(s.x + s.w/2 - 1, s.y, 2, s.h);
    if (n > .3){ ctx.fillStyle = "rgba(255,220,120," + (n*.8) + ")"; ctx.fillRect(s.x + 5, s.y + 6, 7, 7); ctx.fillRect(s.x + s.w - 14, s.y + s.h - 14, 7, 7); }
  } else if (s.k === "lamp"){
    ctx.fillStyle = "#555b66"; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    ctx.fillStyle = "#cfd6df"; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill();
  }
}
function speedFx(v, boost){
  if (low() || (v < 500 && !boost)) return;
  const al = clamp((v - 450)/700, 0, .5) + (boost ? .15 : 0);
  ctx.strokeStyle = "rgba(255,255,255," + al + ")"; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (const s of streaks){ ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - s.l*(v/700)); } ctx.stroke();
}
const emit = (list, o) => { o.max = o.life; o.size = o.size || 3; list.push(o); };
function updParts(list, dt){
  for (const p of list){ p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.g || 0)*dt; p.life -= dt; if (p.grow) p.size += p.grow*dt; }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
}
function drawParts(list){
  for (const p of list){
    ctx.globalAlpha = clamp(p.life/p.max, 0, 1); ctx.globalCompositeOperation = p.add ? "lighter" : "source-over"; ctx.fillStyle = p.col;
    if (p.round){ ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); } else ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
// dusk / night tint, headlights, lamp glow, rain
function lighting(headX, headY, headW, dt){
  const a = amb(), n = a.n, al = .6*smooth(.22, .8, n);
  if (al > .01){
    const m = clamp((n - .3)/.5, 0, 1);
    ctx.fillStyle = "rgba(" + Math.round(lerp(255, 6, m)) + "," + Math.round(lerp(150, 12, m)) + "," + Math.round(lerp(70, 38, m)) + "," + al + ")";
    ctx.fillRect(0, 0, W, H);
  }
  const L = smooth(.3, .7, n);
  if (L > .02){
    ctx.globalCompositeOperation = "lighter";
    if (headX != null){
      const cone = ctx.createLinearGradient(0, headY, 0, headY - H*.55);
      cone.addColorStop(0, "rgba(255,244,205," + .5*L + ")"); cone.addColorStop(1, "rgba(255,244,205,0)");
      ctx.fillStyle = cone; ctx.beginPath();
      ctx.moveTo(headX - headW*.4, headY); ctx.lineTo(headX - headW*2.4, headY - H*.55); ctx.lineTo(headX + headW*2.4, headY - H*.55); ctx.lineTo(headX + headW*.4, headY); ctx.fill();
    }
    for (const s of scenery) if (s.k === "lamp"){
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 80);
      g.addColorStop(0, "rgba(255,225,150," + .55*L + ")"); g.addColorStop(1, "rgba(255,225,150,0)");
      ctx.fillStyle = g; ctx.fillRect(s.x - 80, s.y - 80, 160, 160);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  if (a.rain){
    ctx.fillStyle = "rgba(70,82,98,.26)"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(205,220,235,.5)"; ctx.lineWidth = 1; ctx.beginPath();
    const n2 = low() ? 40 : drops.length;
    for (let i = 0; i < n2; i++){
      const d = drops[i];
      d.y += 900*dt; d.x -= 140*dt;
      if (d.y > H){ d.y = -20; d.x = Math.random()*(W + 200); } if (d.x < -20) d.x = W + 20;
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 3, d.y + 15);
    }
    ctx.stroke();
  }
}
function vignette(){
  if (low()) return;
  if (!vigC){
    vigC = document.createElement("canvas"); vigC.width = W; vigC.height = H;
    const x = vigC.getContext("2d"), g = x.createRadialGradient(W/2, H/2, Math.min(W, H)*.35, W/2, H/2, Math.hypot(W, H)*.6);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.5)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  ctx.drawImage(vigC, 0, 0, W, H);
}

// ------------------------------------------------------------------ menu scenes
let demoCars = [], demoT = 0;
function stepDemo(dt){
  Scene.time += dt; updateWorld(dt, Scene.mode === "showroom" ? 0 : 260);
  if (Scene.mode === "showroom") return;
  demoT -= dt;
  if (demoT <= 0 && demoCars.length < 4){
    const k = VEHICLES[TRAFFIC_CARS[(Math.random()*TRAFFIC_CARS.length)|0]], w = rw*.125, lane = [-.667, 0, .667][(Math.random()*3)|0];
    if (!demoCars.some(c => c.y < w*k.len*3 && Math.abs(c.lane - lane) < .1))
      demoCars.push({lane, y:-w*k.len, w, h:w*k.len, rel:Math.random()*60 - 50, spec:{shape:k.shape, len:k.len, color:TRAFFIC[(Math.random()*TRAFFIC.length)|0], metal:false, stripe:"none", spoiler:false}});
    demoT = 1.2 + Math.random()*1.6;
  }
  for (const c of demoCars) c.y += (260 - 120 - c.rel)*dt;
  demoCars = demoCars.filter(c => c.y < H + 120);
}
function renderDemo(dt){
  ctx.clearRect(0, 0, W, H);
  if (Scene.mode === "showroom"){
    const bgc = ctx.createRadialGradient(W/2, H*.42, 20, W/2, H*.42, Math.max(W, H)*.7); bgc.addColorStop(0, "#39445f"); bgc.addColorStop(1, "#0c101a");
    ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.1)"; ctx.lineWidth = 2;
    for (const k of [.9, .6, .3]){ ctx.beginPath(); ctx.ellipse(W/2, H*.42, W*.36*k + 40, H*.2*k + 30, 0, 0, 7); ctx.stroke(); }
    const wpx = Math.min(W*.46, H*.15);
    drawSprite(ctx, specFor(Scene.veh), W/2, H*.42, wpx, Math.sin(Scene.time*.9)*.35);
    return;
  }
  drawRoad();
  for (const c of demoCars) drawSprite(ctx, c.spec, W/2 + c.lane*rw/2, c.y, c.w, 0);
  const w = rw*.125*2.1, y = H*.5, v = VEHICLES[Scene.veh];
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(W/2, y + w*v.len*.45, w*.6, w*.12, 0, 0, 7); ctx.fill();
  drawSprite(ctx, specFor(Scene.veh), W/2, y, w, 0);
  lighting(W/2, y - w*v.len*.5, w, dt); vignette();
}

// ------------------------------------------------------------------ game setup
function startGame(mode, opt){
  opt = opt || {}; let o, m = null;
  if (mode === "career"){ m = MISSIONS[(opt.mission || 1) - 1]; o = {env:m.env, px:m.px, limit:m.time, traffic:m.traffic, lives:m.obj !== "clean"}; }
  else if (mode === "endless") o = {env:opt.env || "auto", px:0, limit:0, traffic:1.2, lives:true};
  else if (mode === "tt") o = {env:opt.env || "noon", px:30000, limit:0, traffic:.6, lives:false};
  else o = {env:opt.env || "auto", px:0, limit:0, traffic:.3, lives:false};
  env = ENVS[o.env]; worldDist = 0; seedWorld(); layout();
  const V = physics(save.sel), len = VEHICLES[save.sel].len, w = rw*.125;
  Object.assign(G, {state:"play", mode, opt, m, o, V, spec:specFor(save.sel), car:{x:W/2, y:H*.78, w, h:w*len, vx:0},
    cars:[], coins:[], obst:[], items:[], parts:[], pops:[], speed:0, nitro:.4, burst:0, time:o.limit, limit:!!o.limit, t:0, dist:0, overtakes:0, coinsGot:0,
    lives:3, invuln:0, shake:0, flash:0, flashCol:"255,60,60", slow:1, cd:3.2, goT:0, score:0, done:false, spawnT:.6, coinT:1.5, obstT:3, itemT:7,
    shield:0, magT:0, slowT:0, skid:0, skidDir:1, crashes:0, lastCd:4, boostPrev:false, res:null,
    rival:m && m.obj === "rival" ? {dist:0, x:W/2, mul:.93 + .012*m.id} : null,
    police:m && m.obj === "police" ? {gap:170, x:W/2} : null});
}
function pop(text, col){ G.pops.push({text, col:col || "#fff", life:1.3}); if (G.pops.length > 4) G.pops.shift(); }
function spawnTraffic(){
  const g = G, car = g.car, k = VEHICLES[TRAFFIC_CARS[(Math.random()*TRAFFIC_CARS.length)|0]];
  const w = car.w, h = w*k.len, x = rx + w + Math.random()*(rw - 2*w);
  if (g.cars.some(c => c.y < h*2.6 && Math.abs(c.x - x) < w*1.6)) return;
  g.cars.push({x, y:-h, w, h, rel:90 + Math.random()*140, rot:0, vx:0, vr:0, hit:false, passed:false,
    spec:{shape:k.shape, len:k.len, color:TRAFFIC[(Math.random()*TRAFFIC.length)|0], metal:false, stripe:Math.random() < .2 ? "white" : "none", spoiler:false}});
}
function spawnObstacle(){
  const g = G;
  if (Math.random() < .6){
    const x = rx + 40 + Math.random()*(rw - 120), n = 1 + ((Math.random()*3)|0);
    for (let i = 0; i < n; i++) g.obst.push({k:"cone", x:x + i*26, y:-20 - i*6, r:9, hit:false, vx:0, vy:0, rot:0, vr:0});
  } else g.obst.push({k:"oil", x:rx + 50 + Math.random()*(rw - 100), y:-50, w:56, h:76, used:false});
}
function spawnItem(){
  const types = Object.keys(ITEMS), t = types[(Math.random()*types.length)|0];
  G.items.push({t, x:rx + 36 + Math.random()*(rw - 72), y:-30, ph:Math.random()*6});
}
function crash(c){
  const g = G, car = g.car;
  c.hit = true; c.vx = (c.x >= car.x ? 1 : -1)*(90 + Math.random()*60); c.vr = (c.x >= car.x ? 1 : -1)*(2 + Math.random()*2); c.rel = 160;
  if (g.shield > 0){
    g.shield = 0; g.invuln = .8; g.flash = .25; g.flashCol = "90,180,255"; sfx("shield"); pop("SHIELD ABSORBED!", "#6bbcff");
    for (let i = 0; i < 20; i++){ const a = Math.random()*6.283, s = 80 + Math.random()*200; emit(g.parts, {x:car.x, y:car.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.5, col:"#6bbcff", add:true}); }
    return;
  }
  g.crashes++; g.invuln = 1.6; g.slow = .35; g.flash = .3; g.flashCol = "255,60,60"; g.shake = .4;
  for (let i = 0; i < 22; i++){ const a = Math.random()*6.283, s = 80 + Math.random()*260; emit(g.parts, {x:car.x, y:car.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.5, col:"#ffb74a", add:true}); }
  for (let i = 0; i < 8; i++) emit(g.parts, {x:car.x + (Math.random()-.5)*20, y:car.y, vx:(Math.random()-.5)*60, vy:-20 + Math.random()*40, life:.9, col:"rgba(190,190,190,.7)", size:6, grow:26, round:true});
  if (navigator.vibrate) navigator.vibrate(200);
  sfx("crash");
  if (g.m && g.m.obj === "clean") return finishGame(false, "YOU HIT A CAR");
  if (g.o.lives){
    g.lives--;
    if (g.lives <= 0) finishGame(g.mode === "endless", g.mode === "endless" ? "GAME OVER" : "CRASHED OUT");
  }
}

// ------------------------------------------------------------------ game update
function stepGame(dt){
  const g = G, V = g.V, car = g.car; Scene.time += dt;
  if (g.cd > 0){
    g.cd -= dt; updateWorld(dt, 90);
    const n = Math.ceil(g.cd - .2);
    if (n > 0 && n !== g.lastCd){ g.lastCd = n; sfx("count"); }
    if (g.cd <= 0){ g.cd = 0; g.goT = 1; inp.cal = inp.live ? inp.gamma : 0; sfx("go"); }
    return;
  }
  if (g.goT > 0) g.goT -= dt;
  g.t += dt; g.invuln = Math.max(0, g.invuln - dt); g.shake = Math.max(0, g.shake - dt); g.flash = Math.max(0, g.flash - dt);
  g.shield = Math.max(0, g.shield - dt); g.magT = Math.max(0, g.magT - dt); g.slowT = Math.max(0, g.slowT - dt);
  const boost = (inp.nitro && g.nitro > 0) || g.burst > 0;
  if (boost && !g.boostPrev) sfx("nitro"); g.boostPrev = boost;
  if (g.burst > 0) g.burst -= dt; else if (inp.nitro && g.nitro > 0) g.nitro = Math.max(0, g.nitro - V.drain*dt); else g.nitro = Math.min(1, g.nitro + .012*dt);
  g.slow = Math.min(1, g.slow + dt*.35);
  const ramp = 300 + Math.min(520, g.t*12);
  let v = ramp*V.top*(boost ? 1.5 : 1)*g.slow; if (g.slowT > 0) v *= .65;
  g.speed = v; g.dist += v*dt; updateWorld(dt, v);

  // steering (oil makes the car slide and respond slowly)
  let gm = inp.keys ? inp.keys*18 : inp.gamma - inp.cal; if (save.invert) gm = -gm;
  const tx = W/2 + clamp(gm/SENS[save.sens || "med"], -1, 1)*(rw/2 - car.w*.9), resp = V.resp*(g.skid > 0 ? .3 : 1);
  let nx = car.x + (tx - car.x)*Math.min(1, dt*resp);
  if (g.skid > 0){ g.skid -= dt; nx += g.skidDir*150*dt; }
  nx = clamp(nx, rx + car.w*.6, rx + rw - car.w*.6);
  car.vx = (nx - car.x)/dt; car.x = nx;

  const finite = g.o.px > 0, remain = g.o.px - g.dist, clear = !finite || remain > H*1.2;
  g.spawnT -= dt*(v/450);
  if (g.spawnT <= 0){ if (clear) spawnTraffic(); g.spawnT = Math.max(.3, 1.0 - g.t/90)*(.7 + Math.random()*.6)/g.o.traffic; }
  g.coinT -= dt*(v/450);
  if (g.coinT <= 0){
    if (!finite || remain > H){ const cx = rx + 24 + Math.random()*(rw - 48); for (let i = 0; i < 3; i++) g.coins.push({x:cx, y:-20 - i*58, ph:Math.random()*6}); }
    g.coinT = 1.2 + Math.random()*1.3;
  }
  g.obstT -= dt*(v/450);
  if (g.obstT <= 0){ if (clear) spawnObstacle(); g.obstT = (2.4 + Math.random()*2.6)/clamp(g.o.traffic, .6, 1.6); }
  g.itemT -= dt;
  if (g.itemT <= 0){ if (clear) spawnItem(); g.itemT = 10 + Math.random()*6; }

  for (const c of g.cars){
    c.y += (v - c.rel)*dt;
    if (c.hit){ c.x += c.vx*dt; c.rot += c.vr*dt; }
    else {
      if (!g.invuln && Math.abs(c.x - car.x) < (c.w + car.w)*.45 && Math.abs(c.y - car.y) < (c.h + car.h)*.46){ crash(c); if (g.done) return; }
      if (!c.passed && c.y > car.y + (c.h + car.h)*.5){ c.passed = true; g.overtakes++; pop("OVERTAKE +" + g.overtakes, "#7dff7d"); sfx("pass"); }
    }
  }
  g.cars = g.cars.filter(c => c.y < H + 140 && c.y > -300);

  for (const o of g.obst){
    if (o.k === "cone"){
      if (o.hit){ o.x += o.vx*dt; o.y += (v + o.vy)*dt; o.vy *= .97; o.rot += o.vr*dt; continue; }
      o.y += v*dt;
      if (Math.abs(o.x - car.x) < car.w*.5 + o.r && Math.abs(o.y - car.y) < car.h*.5 + o.r){
        o.hit = true; o.vx = (o.x - car.x)*4 + (Math.random()-.5)*60; o.vy = -260; o.vr = 9;
        g.slow = Math.min(g.slow, .7); g.shake = Math.max(g.shake, .2); sfx("thud");
        for (let i = 0; i < 6; i++) emit(g.parts, {x:o.x, y:o.y, vx:(Math.random()-.5)*200, vy:(Math.random()-.5)*200, life:.35, col:"#ff9a2e", add:true});
      }
    } else {
      o.y += v*dt;
      if (!o.used && Math.abs(o.x - car.x) < o.w*.5 && Math.abs(o.y - car.y) < o.h*.5 + car.h*.3){
        o.used = true; g.skid = 1.3; g.skidDir = Math.random() < .5 ? -1 : 1; sfx("skid"); pop("OIL SLICK!", "#ffb74a");
      }
    }
  }
  g.obst = g.obst.filter(o => o.y < H + 80 && o.y > -300);

  for (const it of g.items){
    it.y += v*dt;
    if (Math.hypot(it.x - car.x, it.y - car.y) < car.w*.95){
      it.dead = true; sfx("power");
      if (it.t === "shield") g.shield = 10; else if (it.t === "magnet") g.magT = 7; else g.slowT = 5;
      pop(ITEMS[it.t].label + "!", ITEMS[it.t].col);
      for (let i = 0; i < 14; i++){ const a = Math.random()*6.283; emit(g.parts, {x:it.x, y:it.y, vx:Math.cos(a)*150, vy:Math.sin(a)*150, life:.45, col:ITEMS[it.t].col, add:true}); }
    }
  }
  g.items = g.items.filter(it => !it.dead && it.y < H + 40);

  const mag = car.w*V.magnet*(g.magT > 0 ? 2.4 : 1);
  for (const k of g.coins){
    k.y += v*dt;
    const d = Math.hypot(k.x - car.x, k.y - car.y);
    if (d < mag && d > 1){ k.x += (car.x - k.x)/d*420*dt; k.y += (car.y - k.y)/d*420*dt; }
    if (d < car.w*.9){
      k.dead = true; g.coinsGot++; g.nitro = Math.min(1, g.nitro + .08*V.refill); sfx("coin");
      for (let i = 0; i < 8; i++){ const a = Math.random()*6.283; emit(g.parts, {x:k.x, y:k.y, vx:Math.cos(a)*120, vy:Math.sin(a)*120, life:.4, col:"#ffd54a", add:true}); }
    }
  }
  g.coins = g.coins.filter(k => !k.dead && k.y < H + 30);
  if (boost) for (const sx of [-.22, .22]) emit(g.parts, {x:car.x + sx*car.w, y:car.y + car.h*.5, vx:(Math.random()-.5)*30, vy:200 + Math.random()*150, life:.3, col:"#4aa8ff", add:true, size:4});
  updParts(g.parts, dt);
  for (const p of g.pops) p.life -= dt; g.pops = g.pops.filter(p => p.life > 0);
  g.score = Math.floor(g.dist/200) + g.overtakes*40 + g.coinsGot*25;

  // rival: a ghost racer with rubber-banding so the race stays close
  if (g.rival){
    const R = g.rival, lead = R.dist - g.dist;
    R.dist += ramp*R.mul*(lead > 500 ? .85 : lead < -400 ? 1.12 : 1)*dt;
    R.x = W/2 + Math.sin(g.t*.9)*rw*.28;
    if (R.dist >= g.o.px) return finishGame(false, "THE RIVAL WON");
  }
  // police: closes in whenever you are slower than the chase pace
  if (g.police){
    const P = g.police;
    P.gap = clamp(P.gap + (v - ramp)*dt*.35, -10, 260); P.x += (car.x - P.x)*Math.min(1, dt*3);
    if (P.gap <= 40) return finishGame(false, "BUSTED!");
  }

  if (finite && g.dist >= g.o.px) return finishGame(true, "FINISH");
  if (g.limit){ g.time -= dt; if (g.time <= 0){ g.time = 0; return finishGame(false, "TIME UP"); } }
  if (g.mode === "tt" && g.t > 180) return finishGame(false, "TIME UP");
  engineSound(true, v/900);
}
function finishGame(ok, reason){
  const g = G; if (g.done) return; g.done = true; engineSound(false, 0);
  const m = g.m, res = {mode:g.mode, ok, reason, score:g.score, coins:g.coinsGot, overtakes:g.overtakes, time:g.t, dist:g.dist, cash:g.coinsGot*5, gold:0, lines:[], m, newBest:false, hasNext:false, stars:0};
  if (g.mode === "career"){
    const met = m.obj !== "overtake" && m.obj !== "coins" || (m.obj === "overtake" && g.overtakes >= m.target) || (m.obj === "coins" && g.coinsGot >= m.target);
    if (ok && !met){ ok = res.ok = false; res.reason = "MISSION INCOMPLETE"; res.lines.push(["TARGET", objText(m)]); }
    if (ok){
      const first = !save.career.best[m.id], reward = first ? m.reward : Math.round(m.reward*.4);
      res.cash += reward; res.lines.push(["REWARD", "$ " + reward]);
      const early = g.time >= m.bonusSec, noHit = g.crashes === 0;
      res.stars = 1 + (early ? 1 : 0) + (noHit ? 1 : 0);
      res.lines.push(["STARS", "★".repeat(res.stars) + "☆".repeat(3 - res.stars)]);
      res.lines.push(["★★  FINISH " + m.bonusSec + "s EARLY", early ? (save.career.bonus[m.id] ? "✔" : "G " + m.bonusGold) : "—"]);
      res.lines.push(["★★★  NO CAR HITS", noHit ? "✔" : "—"]);
      if (early){ if (!save.career.bonus[m.id]) res.gold += m.bonusGold; save.career.bonus[m.id] = true; }
      save.career.stars[m.id] = Math.max(save.career.stars[m.id] || 0, res.stars);
      save.career.unlocked = Math.max(save.career.unlocked, Math.min(MISSIONS.length, m.id + 1));
      save.career.best[m.id] = Math.max(save.career.best[m.id] || 0, g.score);
      res.hasNext = m.id < MISSIONS.length;
    }
  } else if (g.mode === "tt"){
    if (ok){
      const best = save.rec.tt[g.opt.env]; res.newBest = !best || g.t < best; if (res.newBest) save.rec.tt[g.opt.env] = g.t;
      const bonus = 200 + Math.max(0, Math.round((120 - g.t)*3)); res.cash += bonus; res.lines.push(["TIME BONUS", "$ " + bonus]);
      if (res.newBest) res.lines.push(["NEW BEST", "★"]);
    }
  } else if (g.mode === "endless"){
    res.newBest = g.score > save.rec.endless; if (res.newBest) save.rec.endless = g.score;
    const bonus = Math.floor(g.score/20); res.cash += bonus; res.lines.push(["DISTANCE BONUS", "$ " + bonus]);
  }
  save.cash += res.cash; save.gold += res.gold; save.runs++; save.totalDist += g.dist; save.totalCoins += g.coinsGot;
  save.xp += Math.floor(g.score/8) + (ok ? 40 : 10);
  persist(); g.res = res; g.state = "result"; inp.nitro = false; sfx(res.ok ? "win" : "lose");
  UI.showResult(res);
}
function quitGame(){
  if (G.state !== "pause" && G.state !== "play") return;
  const cash = G.coinsGot*5; save.cash += cash; save.totalCoins += G.coinsGot; save.totalDist += G.dist; persist(); engineSound(false, 0);
  if (cash) toast("+ $ " + cash);
  enterMenu();
}
function enterMenu(){
  G.state = "menu"; Scene.mode = "demo"; Scene.veh = save.sel; inp.nitro = false;
  env = ENVS.noon; worldDist = 0; seedWorld(); UI.go("main");
}

// ------------------------------------------------------------------ game rendering + HUD
function fmtT(t){ const m = Math.floor(t/60), s = t - m*60; return (m ? m + ":" : "") + (s < 10 && m ? "0" : "") + s.toFixed(1); }
function drawFinishLine(g){
  if (g.o.px <= 0) return;
  const fy = g.car.y - (g.o.px - g.dist);
  if (fy < -80 || fy > H + 60) return;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 16; i++){ ctx.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; ctx.fillRect(rx + i*rw/16, fy - 18 + j*18, rw/16 + .5, 18); }
  ctx.fillStyle = "#444b57"; ctx.fillRect(rx - 14, fy - 60, 8, 62); ctx.fillRect(rx + rw + 6, fy - 60, 8, 62);
  ctx.fillStyle = "#f6b21a"; ctx.fillRect(rx - 14, fy - 62, rw + 28, 22);
  ctx.fillStyle = "#111"; ctx.font = "800 15px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("FINISH", W/2, fy - 51);
}
function drawObstacles(g, t){
  for (const o of g.obst){
    if (o.k === "oil"){
      const gr = ctx.createRadialGradient(o.x - 8, o.y - 10, 4, o.x, o.y, o.h*.55);
      gr.addColorStop(0, "rgba(40,36,60,.95)"); gr.addColorStop(.7, "rgba(8,8,16,.92)"); gr.addColorStop(1, "rgba(8,8,16,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.w*.55, o.h*.5, .2, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(120,200,255,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 4, o.w*.3, o.h*.28, .2, 0, 4); ctx.stroke();
      ctx.strokeStyle = "rgba(255,150,220,.3)"; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 2, o.w*.34, o.h*.3, .2, 3, 7); ctx.stroke();
    } else {
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.arc(2, 3, o.r + 1, 0, 7); ctx.fill();
      const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, o.r); cg.addColorStop(0, "#ffb15a"); cg.addColorStop(1, "#e5620c");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, o.r*.62, 0, 7); ctx.stroke();
      ctx.fillStyle = "#c04c06"; ctx.beginPath(); ctx.arc(0, 0, o.r*.25, 0, 7); ctx.fill(); ctx.restore();
    }
  }
}
function drawItems(g, t){
  for (const it of g.items){
    const d = ITEMS[it.t], pulse = 1 + .1*Math.sin(t*6 + it.ph);
    const gr = ctx.createRadialGradient(it.x, it.y, 2, it.x, it.y, 26*pulse); gr.addColorStop(0, d.col); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .7; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(it.x, it.y, 26*pulse, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(10,14,22,.8)"; ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, 7); ctx.fill(); ctx.strokeStyle = d.col; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "17px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(d.icon, it.x, it.y + 1);
  }
}
function renderGame(dt){
  const g = G, car = g.car, boost = (inp.nitro && g.nitro > 0) || g.burst > 0;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - .5)*g.shake*18, (Math.random() - .5)*g.shake*18);
  drawRoad();
  for (const o of g.obst) if (o.k === "oil") drawObstacles({obst:[o]}, Scene.time);
  drawFinishLine(g);
  for (const k of g.coins){
    const sx = Math.abs(Math.cos(Scene.time*5 + k.ph)), pulse = 1 + .06*Math.sin(Scene.time*8 + k.ph);
    const gg = ctx.createRadialGradient(k.x - 3, k.y - 3, 1, k.x, k.y, 14); gg.addColorStop(0, "#fff3b0"); gg.addColorStop(.5, "#ffd54a"); gg.addColorStop(1, "#b8860b");
    ctx.save(); ctx.translate(k.x, k.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(255,213,74,.25)"; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, 0, 12*sx + 2, 12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#a9780a"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  }
  drawItems(g, Scene.time);
  for (const o of g.obst) if (o.k === "cone") drawObstacles({obst:[o]}, Scene.time);
  // police behind the player
  if (g.police){
    const P = g.police, py = car.y + P.gap + car.h*.3;
    if (py < H + 120){
      drawSprite(ctx, POLICE_SPEC, P.x, py, car.w, 0);
      const ph = Math.floor(Scene.time*8) % 2;
      ctx.globalCompositeOperation = "lighter";
      for (const [sx, col] of [[-1, ph ? "255,40,40" : "40,90,255"], [1, ph ? "40,90,255" : "255,40,40"]]){
        const lx = P.x + sx*car.w*.14, gr = ctx.createRadialGradient(lx, py, 1, lx, py, car.w*1.3); gr.addColorStop(0, "rgba(" + col + ",.95)"); gr.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lx, py, car.w*1.3, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  // rival ghost
  if (g.rival){
    const R = g.rival, ry = car.y - (R.dist - g.dist);
    if (ry > -160 && ry < H + 160){
      ctx.save(); ctx.globalAlpha = .88; ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 18;
      drawSprite(ctx, RIVAL_SPEC, R.x, ry, car.w, 0); ctx.restore();
      ctx.font = "800 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#ff6a5a"; ctx.fillText("RIVAL", R.x, ry - car.h*.65);
    }
  }
  for (const c of g.cars) drawSprite(ctx, c.spec, c.x, c.y, c.w, c.rot);
  if (boost){
    ctx.globalCompositeOperation = "lighter";
    for (const sx of [-1, 1]){
      const len = 50 + Math.random()*40, fx = car.x + sx*car.w*.22, fy = car.y + car.h*.5;
      const fg = ctx.createLinearGradient(0, fy, 0, fy + len);
      fg.addColorStop(0, "rgba(160,220,255,.95)"); fg.addColorStop(.4, "rgba(80,140,255,.6)"); fg.addColorStop(1, "rgba(60,80,255,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(fx - car.w*.09, fy); ctx.lineTo(fx + car.w*.09, fy); ctx.lineTo(fx, fy + len); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  if (!g.invuln || Math.floor(g.t*14) % 2 || G.state !== "play"){
    drawSprite(ctx, g.spec, car.x, car.y, car.w, clamp(car.vx*.0006, -.35, .35) + (g.skid > 0 ? Math.sin(g.t*30)*.12 : 0));
  }
  if (g.shield > 0){
    const a = g.shield < 2 ? (Math.floor(g.t*10) % 2 ? .25 : .9) : .9, rr0 = Math.max(car.w, car.h)*.72;
    ctx.globalAlpha = a; ctx.strokeStyle = "#6bbcff"; ctx.lineWidth = 3; ctx.shadowColor = "#6bbcff"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(car.x, car.y, rr0, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(107,188,255,.14)"; ctx.fill(); ctx.globalAlpha = 1;
  }
  drawParts(g.parts);
  ctx.restore();
  speedFx(g.speed, boost); lighting(car.x, car.y - car.h*.5, car.w, G.state === "play" ? dt : 0); vignette();
  if (g.police && g.police.gap < 90){ ctx.fillStyle = "rgba(255,30,30," + (.12 + .1*Math.sin(Scene.time*14)) + ")"; ctx.fillRect(0, 0, W, H); }
  if (g.flash > 0){ ctx.fillStyle = "rgba(" + g.flashCol + "," + g.flash + ")"; ctx.fillRect(0, 0, W, H); }
  drawHud();
}
function hpanel(x, y, w, h){ ctx.fillStyle = "rgba(10,14,22,.58)"; rr(ctx, x, y, w, h, 12); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1; ctx.stroke(); }
function drawHud(){
  const g = G, m = g.m; ctx.textBaseline = "alphabetic";
  hpanel(12, 12, 112, 54); ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "800 24px " + FONT; ctx.fillText(g.score, 22, 40);
  ctx.fillStyle = "#ffd54a"; ctx.font = "700 14px " + FONT; ctx.fillText("🪙 " + g.coinsGot, 22, 58);
  let hy = 72;
  if (m && (m.obj === "overtake" || m.obj === "coins")){
    const cur = m.obj === "overtake" ? g.overtakes : g.coinsGot;
    hpanel(12, hy, 112, 30); ctx.font = "700 13px " + FONT; ctx.fillStyle = cur >= m.target ? "#7dff7d" : "#fff"; ctx.fillText((m.obj === "overtake" ? "PASS " : "COINS ") + cur + "/" + m.target, 22, hy + 20); hy += 36;
  }
  for (const [key, left, label] of [["shield", g.shield, "🛡️"], ["magnet", g.magT, "🧲"], ["slow", g.slowT, "⏳"]]){
    if (left <= 0) continue;
    hpanel(12, hy, 112, 26); ctx.font = "700 13px " + FONT; ctx.fillStyle = ITEMS[key].col; ctx.fillText(label + " " + left.toFixed(1) + "s", 22, hy + 18); hy += 32;
  }
  if (g.o.lives){ hpanel(W - 12 - 96, 12, 96, 34); ctx.textAlign = "right"; ctx.font = "18px " + FONT; ctx.fillStyle = "#fff"; ctx.fillText("❤️".repeat(Math.max(0, g.lives)), W - 20, 36); }
  const tv = g.limit ? Math.max(0, g.time) : g.t;
  hpanel(W - 12 - 96, 52, 96, 34); ctx.textAlign = "center"; ctx.font = "800 18px " + FONT; ctx.fillStyle = g.limit && g.time < 10 ? "#ff5a4d" : "#fff"; ctx.fillText("⏱ " + fmtT(tv), W - 12 - 48, 76);
  if (g.o.px > 0){
    const p = clamp(g.dist/g.o.px, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, W, 5); ctx.fillStyle = "#4cd137"; ctx.fillRect(0, 0, W*p, 5);
    if (g.rival){ const rp = clamp(g.rival.dist/g.o.px, 0, 1); ctx.fillStyle = "#ff4d4d"; ctx.fillRect(W*rp - 2, 0, 4, 9); }
  }
  // off-screen rival indicator
  if (g.rival && g.cd <= 0){
    const lead = g.rival.dist - g.dist, ry = g.car.y - lead;
    if (ry < 0 || ry > H){ ctx.textAlign = "center"; ctx.font = "800 13px " + FONT; ctx.fillStyle = "#ff6a5a"; ctx.fillText((lead > 0 ? "▲ RIVAL +" : "▼ RIVAL ") + Math.round(lead/10) + "m", W/2, lead > 0 ? 110 : H - 70); }
  }
  // police gap
  if (g.police){
    const gx = 16, gy = H - 64, gw = 130, f = clamp(g.police.gap/260, 0, 1);
    ctx.textAlign = "left"; ctx.font = "700 11px " + FONT; ctx.fillStyle = f < .35 ? "#ff6a5a" : "#9aa7b4"; ctx.fillText("POLICE", gx, gy - 5);
    ctx.fillStyle = "rgba(0,0,0,.5)"; rr(ctx, gx, gy, gw, 10, 5); ctx.fill();
    ctx.fillStyle = f < .35 ? "#ff4d4d" : f < .6 ? "#ffb74a" : "#4cd137"; rr(ctx, gx, gy, Math.max(8, gw*f), 10, 5); ctx.fill();
  }
  ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "800 32px " + FONT; ctx.fillText(Math.round(g.speed*.3), W - 18, H - 30);
  ctx.fillStyle = "#9aa7b4"; ctx.font = "700 12px " + FONT; ctx.fillText("km/h", W - 18, H - 14);
  const bx = 16, by = H - 32, bw = 130;
  ctx.textAlign = "left"; ctx.fillStyle = "#9aa7b4"; ctx.font = "700 11px " + FONT; ctx.fillText("NITRO", bx, by - 5);
  ctx.fillStyle = "rgba(0,0,0,.5)"; rr(ctx, bx, by, bw, 12, 6); ctx.fill();
  if (g.nitro > .01){ const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, "#2a7fff"); gr.addColorStop(1, g.nitro > .99 ? "#3ddc84" : "#6bd0ff"); ctx.fillStyle = gr; rr(ctx, bx, by, Math.max(10, bw*g.nitro), 12, 6); ctx.fill(); }
  if (g.t < 5 && g.cd <= 0){
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(10,14,22,.6)"; const bw2 = Math.min(W - 40, 320); rr(ctx, W/2 - bw2/2, H*.22, bw2, 54, 12); ctx.fill();
    ctx.font = "700 12px " + FONT; ctx.fillStyle = "#cfd3d8"; ctx.fillText(g.mode === "career" ? "MISSION " + m.id : MODES.find(x => x.id === g.mode).name, W/2, H*.22 + 20);
    ctx.font = "800 15px " + FONT; ctx.fillStyle = "#4cd137"; ctx.fillText(g.mode === "career" ? objText(m) : g.mode === "tt" ? "SET YOUR BEST TIME" : g.mode === "endless" ? "SURVIVE AS LONG AS YOU CAN" : "ENJOY THE RIDE", W/2, H*.22 + 42);
  }
  ctx.textAlign = "center";
  g.pops.forEach((p, i) => { ctx.globalAlpha = clamp(p.life*1.5, 0, 1); ctx.font = "800 20px " + FONT; ctx.fillStyle = p.col; ctx.fillText(p.text, W/2, H*.4 + i*26 - (1.3 - p.life)*14); });
  ctx.globalAlpha = 1;
  if (g.cd > 0){ ctx.font = "900 110px " + FONT; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 6; const t = String(Math.ceil(g.cd - .2) || 1); ctx.strokeText(t, W/2, H*.4); ctx.fillText(t, W/2, H*.4); }
  else if (g.goT > 0){ ctx.globalAlpha = clamp(g.goT*2, 0, 1); ctx.font = "900 90px " + FONT; ctx.fillStyle = "#4cd137"; ctx.fillText("GO!", W/2, H*.4); ctx.globalAlpha = 1; }
}
