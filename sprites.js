"use strict";
// Top-down car sprites with 2.5D depth (layered body walls, raised cabin with sloped glass). Eight distinct models.
function shade(hex, p){
  const n = parseInt(hex.slice(1), 16); let r = n>>16, g = n>>8 & 255, b = n & 255;
  const f = p < 0 ? 0 : 255, k = Math.abs(p);
  return "rgb(" + Math.round((f-r)*k+r) + "," + Math.round((f-g)*k+g) + "," + Math.round((f-b)*k+b) + ")";
}
function rr(x, px, py, w, h, r){ x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h); }
function rng(seed){
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed>>>15, 1 | seed); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14) >>> 0) / 4294967296; };
}
// shape parameters per model: w body width, sh/nose front shaping, tail rear shaping, rs rear straight length,
// cab [front,rear] cabin range along the body, cabW cabin width, fl fender flare, wheel [w,l]
const MODELS = [
  /* 0 street  */ {w:.9,  sh:.28, nose:.7,  tail:.8,  rs:.16, cab:[.34,.74], cabW:.8,  fl:0,  wheel:[14,26], lights:"round",  tails:"two"},
  /* 1 muscle  */ {w:1.04,sh:.3,  nose:.72, tail:.9,  rs:.2,  cab:[.46,.76], cabW:.74, fl:.4, wheel:[15,28], lights:"rect",   tails:"two"},
  /* 2 sport   */ {w:.98, sh:.34, nose:.5,  tail:.78, rs:.18, cab:[.4,.7],   cabW:.7,  fl:.3, wheel:[15,27], lights:"slim",   tails:"bar"},
  /* 3 hyper   */ {w:1.06,sh:.4,  nose:.4,  tail:.95, rs:.28, cab:[.34,.58], cabW:.6,  fl:.6, wheel:[17,30], lights:"slim",   tails:"bar", wing:true},
  /* 4 suv     */ {w:1.0, sh:.18, nose:.84, tail:.94, rs:.12, cab:[.3,.82],  cabW:.88, fl:.2, wheel:[16,30], lights:"rect",   tails:"tall"},
  /* 5 classic */ {w:.9,  sh:.2,  nose:.92, tail:.88, rs:.2,  cab:[.4,.72],  cabW:.66, fl:.5, wheel:[12,26], lights:"circle", tails:"round"},
  /* 6 drift   */ {w:1.0, sh:.36, nose:.55, tail:.88, rs:.22, cab:[.4,.7],   cabW:.7,  fl:.6, wheel:[16,28], lights:"slim",   tails:"two", wing:true},
  /* 7 phantom */ {w:1.02,sh:.45, nose:.3,  tail:.8,  rs:.3,  cab:[.38,.66], cabW:.56, fl:.4, wheel:[16,30], lights:"slim",   tails:"bar", glow:true}
];
const spriteCache = new Map();
function carSprite(sp){
  const key = [sp.shape, sp.len, sp.color, sp.stripe, sp.spoiler ? 1 : 0, sp.metal ? 1 : 0].join("|");
  let c = spriteCache.get(key); if (c) return c;
  const w = 100, h = 100*sp.len, pad = 30, S = 2;
  c = document.createElement("canvas"); c.width = (w + pad*2)*S; c.height = (h + pad*2)*S;
  const x = c.getContext("2d"); x.scale(S, S); x.translate(w/2 + pad, h/2 + pad);
  drawCarShape(x, sp, w, h, S);
  c.ux = w + pad*2; c.uy = h + pad*2;
  spriteCache.set(key, c); return c;
}
function bodyPath(M, bw, f, r, h){
  const p = new Path2D(), sh = M.sh, rs = M.rs;
  p.moveTo(0, f);
  p.bezierCurveTo(bw*M.nose, f, bw*.98, f + h*sh*.35, bw, f + h*sh);
  p.lineTo(bw, r - h*rs);
  p.bezierCurveTo(bw, r - h*rs*.3, bw*M.tail, r, bw*M.tail*.7, r);
  p.lineTo(-bw*M.tail*.7, r);
  p.bezierCurveTo(-bw*M.tail, r, -bw, r - h*rs*.3, -bw, r - h*rs);
  p.lineTo(-bw, f + h*sh);
  p.bezierCurveTo(-bw*.98, f + h*sh*.35, -bw*M.nose, f, 0, f);
  p.closePath();
  return p;
}
function poly(x, pts){ x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); }
function drawCarShape(x, sp, w, h, S){
  const M = MODELS[sp.shape], bw = 50*M.w, f = -h/2, r = h/2, c = sp.color, id = sp.shape;
  const wy = [f + h*.22, r - h*.22], ww = M.wheel[0], wl = M.wheel[1];

  // wheels (under the body) with a lit outer edge
  for (const sx of [-1, 1]) for (const y of wy){
    const cx = sx*(bw + 1), tg = x.createLinearGradient(cx - ww/2, 0, cx + ww/2, 0);
    tg.addColorStop(0, "#050507"); tg.addColorStop(.5, "#2a2a31"); tg.addColorStop(1, "#050507");
    x.fillStyle = tg; rr(x, cx - ww/2, y - wl/2, ww, wl, 5); x.fill();
    x.strokeStyle = "rgba(0,0,0,.6)"; x.lineWidth = 1;
    for (let t = -wl/2 + 4; t < wl/2 - 2; t += 5){ x.beginPath(); x.moveTo(cx - ww/2 + 2, y + t); x.lineTo(cx + ww/2 - 2, y + t + 2); x.stroke(); }
    x.fillStyle = id === 5 ? "#dcdcdc" : "#9aa0aa"; x.fillRect(cx + (sx > 0 ? ww/2 - 3 : -ww/2), y - wl/2 + 5, 3, wl - 10);   // rim edge
  }
  if (M.glow){ x.save(); x.shadowColor = "#3aa8ff"; x.shadowBlur = 26*S; x.fillStyle = "#3aa8ff"; x.globalAlpha = .55; x.fill(bodyPath(M, bw*.96, f, r, h)); x.restore(); }

  // body walls: stacked, slightly growing layers give the sides some height
  const body = bodyPath(M, bw, f, r, h);
  x.save(); x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 16*S; x.shadowOffsetY = 8*S; x.fillStyle = "#000"; x.fill(body); x.restore();
  for (let k = 0; k <= 6; k++){
    const s = .93 + k*.0115; x.save(); x.scale(s, s); x.translate(0, (6 - k)*.9);
    x.fillStyle = shade(c, -.62 + k*.07); x.fill(body); x.restore();
  }
  // top surface
  const g = x.createLinearGradient(-bw, 0, bw, 0);
  g.addColorStop(0, shade(c, -.38)); g.addColorStop(.26, shade(c, .04)); g.addColorStop(.5, shade(c, .3)); g.addColorStop(.74, shade(c, .04)); g.addColorStop(1, shade(c, -.42));
  x.fillStyle = g; x.fill(body);

  // cabin geometry (raised greenhouse)
  const yF = f + h*M.cab[0], yR = f + h*M.cab[1], hwF = bw*M.cabW*.84, hwR = bw*M.cabW;
  const rF = yF + h*.09 - 3, rR = yR - h*.06 - 3, rhF = hwF*.76, rhR = hwR*.8;

  x.save(); x.clip(body);
  if (sp.metal){
    const m = x.createLinearGradient(-bw, f, bw, r);
    m.addColorStop(0, "rgba(255,255,255,.42)"); m.addColorStop(.35, "rgba(255,255,255,0)"); m.addColorStop(.6, "rgba(255,255,255,.3)"); m.addColorStop(1, "rgba(0,0,0,.15)");
    x.fillStyle = m; x.fillRect(-bw, f, 2*bw, h);
  }
  const gl = x.createLinearGradient(0, f, 0, yF); gl.addColorStop(0, "rgba(255,255,255,.34)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gl; x.fillRect(-bw, f, 2*bw, yF - f);
  // panel seams
  x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = 1;
  x.beginPath(); x.moveTo(-bw*.7, f + h*.08); x.lineTo(-bw*.84, yF); x.moveTo(bw*.7, f + h*.08); x.lineTo(bw*.84, yF);
  x.moveTo(-hwR - 1, yR); x.lineTo(-bw*.86, r - h*.06); x.moveTo(hwR + 1, yR); x.lineTo(bw*.86, r - h*.06); x.stroke();
  // model-specific bodywork
  x.fillStyle = "rgba(0,0,0,.6)";
  if (id === 1){ rr(x, -bw*.3, f + h*.12, bw*.6, h*.12, 7); x.fill(); x.fillStyle = "rgba(255,255,255,.18)"; rr(x, -bw*.26, f + h*.125, bw*.52, h*.03, 3); x.fill(); }
  if (id === 2){ for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) x.fillRect(sx*bw*.84 - 3, yF + h*.03 + i*h*.05, 6, h*.028); x.fillRect(-bw*.55, f + h*.012, bw*1.1, h*.02); }
  if (id === 3){
    for (const sx of [-1, 1]){ x.beginPath(); x.moveTo(sx*bw*.12, f + h*.1); x.lineTo(sx*bw*.52, f + h*.2); x.lineTo(sx*bw*.12, f + h*.28); x.closePath(); x.fill(); }
    for (let i = 0; i < 6; i++) x.fillRect(-bw*.5, yR + h*.03 + i*h*.03, bw, h*.014);
  }
  if (id === 4){ x.fillRect(-bw*.7, f + h*.015, bw*1.4, h*.025); x.fillStyle = "rgba(255,255,255,.12)"; rr(x, -bw*.5, f + h*.1, bw, h*.1, 6); x.fill(); }
  if (id === 5){ x.fillStyle = "rgba(235,235,235,.8)"; x.fillRect(-2, f, 4, yF - f); rr(x, -bw*.32, f + h*.1, bw*.64, h*.02, 2); x.fill(); }
  if (id === 6){
    x.fillStyle = "#101018"; rr(x, -bw*.5, f + h*.1, bw, h*.2, 5); x.fill();
    x.strokeStyle = "rgba(255,255,255,.1)"; for (let i = 0; i < 6; i++){ x.beginPath(); x.moveTo(-bw*.5 + i*bw/5.5, f + h*.1); x.lineTo(-bw*.5 + i*bw/5.5, f + h*.3); x.stroke(); }
    x.fillStyle = "#d6342c"; x.fillRect(-bw, f + h*.33, 2*bw, 3);
  }
  if (id === 7){
    x.strokeStyle = "rgba(60,170,255,.9)"; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(-bw*.06, f + h*.03); x.lineTo(-bw*.7, yF); x.moveTo(bw*.06, f + h*.03); x.lineTo(bw*.7, yF); x.moveTo(-bw*.9, yR + h*.02); x.lineTo(-bw*.6, r - h*.02); x.moveTo(bw*.9, yR + h*.02); x.lineTo(bw*.6, r - h*.02); x.stroke();
  }
  // user stripe (whole length)
  const st = sp.stripe;
  if (st === "white" || st === "black" || st === "gold"){ x.fillStyle = st === "white" ? "#f5f5f5" : st === "black" ? "#111" : "#d4af37"; x.fillRect(-bw*.14, f, bw*.28, h); }
  else if (st === "dual"){ x.fillStyle = "#f5f5f5"; x.fillRect(-bw*.26, f, bw*.12, h); x.fillRect(bw*.14, f, bw*.12, h); }
  else if (st === "side"){ x.fillStyle = "#f5f5f5"; x.fillRect(-bw*.9, f, bw*.12, h); x.fillRect(bw*.78, f, bw*.12, h); }
  x.restore();

  // cabin walls: interpolate base -> roof, each layer slightly lighter
  const N = 7;
  for (let k = 0; k <= N; k++){
    const t = k/N, y1 = lerp(yF, rF, t) - 3*t, y2 = lerp(yR, rR, t) - 3*t, a = lerp(hwF, rhF, t), b = lerp(hwR, rhR, t);
    x.fillStyle = k < N ? shade(c, -.55 + t*.25) : shade(c, .1);
    poly(x, [[-a, y1], [a, y1], [b, y2], [-b, y2]]); x.lineJoin = "round"; x.lineWidth = 4; x.strokeStyle = x.fillStyle; x.stroke(); x.fill();
  }
  // glass: windshield, side glass, rear window
  const fy = rF - 3, ry = rR - 3;
  const gg = x.createLinearGradient(0, yF, 0, fy); gg.addColorStop(0, "#0a1422"); gg.addColorStop(1, "#4a739c");
  x.fillStyle = gg; poly(x, [[-hwF, yF], [hwF, yF], [rhF, fy], [-rhF, fy]]); x.fill();
  x.fillStyle = "rgba(255,255,255,.2)"; poly(x, [[-hwF*.8, yF + 1], [-hwF*.1, yF + 1], [-rhF*.4, fy], [-rhF*.9, fy]]); x.fill();
  const rg2 = x.createLinearGradient(0, yR, 0, ry); rg2.addColorStop(0, "#0a1422"); rg2.addColorStop(1, "#33557a");
  x.fillStyle = rg2; poly(x, [[-hwR, yR], [hwR, yR], [rhR, ry], [-rhR, ry]]); x.fill();
  x.fillStyle = "#0d1a2b";
  for (const sx of [-1, 1]){
    poly(x, [[sx*hwF, yF + 1], [sx*rhF, fy], [sx*rhR, ry], [sx*hwR, yR - 1]]); x.fill();
    x.strokeStyle = shade(c, -.2); x.lineWidth = 1.6; x.beginPath(); x.moveTo(sx*lerp(hwF, hwR, .5), lerp(yF, yR, .5)); x.lineTo(sx*lerp(rhF, rhR, .5), lerp(fy, ry, .5)); x.stroke();   // B pillar
  }
  // roof panel
  const rg = x.createLinearGradient(-rhR, 0, rhR, 0); rg.addColorStop(0, shade(c, -.1)); rg.addColorStop(.5, shade(c, .3)); rg.addColorStop(1, shade(c, -.12));
  x.fillStyle = rg; poly(x, [[-rhF, fy], [rhF, fy], [rhR, ry], [-rhR, ry]]); x.lineJoin = "round"; x.lineWidth = 4; x.strokeStyle = shade(c, .02); x.stroke(); x.fill();
  if (st === "white" || st === "black" || st === "gold"){ x.fillStyle = st === "white" ? "#f5f5f5" : st === "black" ? "#111" : "#d4af37"; x.fillRect(-bw*.14, fy, bw*.28, ry - fy); }
  else if (st === "dual"){ x.fillStyle = "#f5f5f5"; x.fillRect(-bw*.26, fy, bw*.12, ry - fy); x.fillRect(bw*.14, fy, bw*.12, ry - fy); }
  x.fillStyle = "rgba(255,255,255,.2)"; poly(x, [[-rhF + 2, fy + 2], [-rhF*.1, fy + 2], [-rhR*.3, ry - 2], [-rhR + 2, ry - 2]]); x.fill();
  if (id === 4){                                      // roof rack
    x.fillStyle = "#15161b"; for (const sx of [-1, 1]) x.fillRect(sx*rhF*.86 - 1.5, fy + 3, 3, ry - fy - 6);
    for (const t of [.2, .5, .8]) x.fillRect(-rhF*.9, lerp(fy, ry, t) - 1.5, rhF*1.8, 3);
  }
  if (id === 7){ x.fillStyle = "#0b0d14"; rr(x, -1.5, fy + 4, 3, ry - fy - 8, 1.5); x.fill(); }   // roof fin
  if (id === 3 || id === 6 || id === 2){ x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(-rhR*.5, ry - 4, rhR, 2.5); }

  // mirrors
  x.fillStyle = shade(c, -.25); for (const sx of [-1, 1]){ rr(x, sx*(hwF + 5) - 4, yF + 2, 8, 11, 4); x.fill(); }
  // lights and bumpers
  const lt = M.lights;
  x.save(); x.shadowColor = "#fff4c0"; x.shadowBlur = 10*S; x.fillStyle = "#fffbe0";
  for (const sx of [-1, 1]){
    if (lt === "round") { x.beginPath(); x.arc(sx*bw*.6, f + h*.075, 5, 0, 7); x.fill(); }
    else if (lt === "circle"){ x.fillStyle = "#e8e8e8"; x.beginPath(); x.arc(sx*bw*.58, f + h*.1, 7, 0, 7); x.fill(); x.fillStyle = "#fffbe0"; x.beginPath(); x.arc(sx*bw*.58, f + h*.1, 5, 0, 7); x.fill(); }
    else if (lt === "rect") { rr(x, sx > 0 ? bw*.36 : -bw*.8, f + h*.045, bw*.44, h*.035, 2); x.fill(); }
    else { x.beginPath(); x.moveTo(sx*bw*.78, f + h*.12); x.lineTo(sx*bw*.3, f + h*.06); x.lineTo(sx*bw*.34, f + h*.075); x.lineTo(sx*bw*.78, f + h*.135); x.closePath(); x.fill(); }
  }
  x.restore();
  if (id === 5){ x.fillStyle = "#d9d9d9"; rr(x, -bw*.8, f + h*.012, bw*1.6, 5, 2.5); x.fill(); rr(x, -bw*.74, r - h*.025, bw*1.48, 5, 2.5); x.fill(); }
  if (id === 4){ x.fillStyle = "#14151a"; rr(x, -bw*.7, f + h*.005, bw*1.4, 6, 3); x.fill(); }
  if (id === 2 || id === 3 || id === 6 || id === 7){ x.fillStyle = "#0c0d12"; rr(x, -bw*.7, f - 1, bw*1.4, 4, 2); x.fill(); }   // splitter
  x.save(); x.shadowColor = "#ff2020"; x.shadowBlur = 10*S; x.fillStyle = "#ff3030";
  const ty = r - h*.05;
  if (M.tails === "bar"){ rr(x, -bw*.8, ty, bw*1.6, 5, 2.5); x.fill(); }
  else if (M.tails === "round"){ for (const sx of [-1, 1]){ x.beginPath(); x.arc(sx*bw*.66, ty + 2, 5, 0, 7); x.fill(); } }
  else if (M.tails === "tall"){ for (const sx of [-1, 1]) rr(x, sx > 0 ? bw*.7 : -bw*.84, r - h*.14, bw*.14, h*.1, 3), x.fill(); }
  else { for (const sx of [-1, 1]) rr(x, sx > 0 ? bw*.4 : -bw*.84, ty, bw*.44, 5, 2.5), x.fill(); }
  x.restore();
  x.fillStyle = "#e8e8e8"; rr(x, -9, r - h*.04, 18, 7, 1.5); x.fill();              // plate
  if (id >= 1 && id !== 5){ x.fillStyle = "#555a63"; for (const sx of [-1, 1]){ x.beginPath(); x.arc(sx*bw*.4, r - 1, 3.2, 0, 7); x.fill(); x.fillStyle = "#0a0a0c"; x.beginPath(); x.arc(sx*bw*.4, r - 1, 1.8, 0, 7); x.fill(); x.fillStyle = "#555a63"; } }
  if (id === 4){ x.fillStyle = "#222"; x.beginPath(); x.arc(0, r + 4, 10, 0, 7); x.fill(); x.strokeStyle = "#444"; x.lineWidth = 2; x.stroke(); }   // spare wheel
  // rear wing: model default or the customise toggle
  if (M.wing || sp.spoiler){
    const gt = M.wing, wyy = gt ? r - h*.01 : r - h*.1, ww2 = bw*(gt ? 1.12 : 1.04);
    x.save(); x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = 6*S; x.shadowOffsetY = 3*S;
    x.fillStyle = "#13131a"; rr(x, -ww2, wyy - 4, ww2*2, gt ? 10 : 7, 3); x.fill(); x.restore();
    x.fillStyle = "rgba(255,255,255,.22)"; x.fillRect(-ww2 + 3, wyy - 3, ww2*2 - 6, 1.6);
    x.fillStyle = shade(c, -.2); x.fillRect(-ww2 - 1, wyy - 7, 4, 16); x.fillRect(ww2 - 3, wyy - 7, 4, 16);
  }
}
function drawSprite(x, sp, cx, cy, wpx, rot){
  const s = carSprite(sp), k = wpx/100;
  x.save(); x.translate(cx, cy); if (rot) x.rotate(rot);
  x.drawImage(s, -s.ux/2*k, -s.uy/2*k, s.ux*k, s.uy*k); x.restore();
}
