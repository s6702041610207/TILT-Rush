"use strict";
// ---------------------------------------------------------------- audio
let ac, osc, vol;
function startAudio(){
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    if (!osc){
      osc = ac.createOscillator(); vol = ac.createGain();
      osc.type = "sawtooth"; vol.gain.value = 0; osc.connect(vol); vol.connect(ac.destination); osc.start();
    }
  }catch(e){}
}
function engineSound(on, sp){
  if (!osc) return;
  osc.frequency.setTargetAtTime(50 + sp*110, ac.currentTime, .05);
  vol.gain.setTargetAtTime(on && save.sound ? .03 : 0, ac.currentTime, .1);
}
function beep(f, d, v){
  if (!ac || !save.sound) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = f; g.gain.value = v || .06; g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
}

// short synthesised sound effects
function noise(dur, f, q, vol, sweepTo){
  if (!ac || !save.sound) return;
  const n = Math.floor(ac.sampleRate*dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random()*2 - 1)*(1 - i/n);
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = buf; fl.type = "bandpass"; fl.Q.value = q; fl.frequency.setValueAtTime(f, ac.currentTime);
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, ac.currentTime + dur);
  g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start();
}
function tone(f, d, v, type, delay, slide){
  if (!ac || !save.sound) return;
  const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(v || .08, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + .02);
}
function sfx(name){
  if (!ac || !save.sound) return;
  switch (name){
    case "click": tone(520, .05, .04, "square"); break;
    case "coin": tone(1040, .09, .06, "sine"); tone(1560, .12, .05, "sine", .06); break;
    case "pass": tone(660, .07, .035, "triangle"); break;
    case "count": tone(440, .14, .1, "square"); break;
    case "go": tone(880, .4, .1, "square"); tone(1320, .4, .06, "square"); break;
    case "nitro": noise(.7, 600, 1.2, .35, 3200); tone(140, .5, .06, "sawtooth", 0, 420); break;
    case "crash": noise(.45, 300, .6, .7, 80); tone(90, .35, .18, "sawtooth", 0, 40); break;
    case "thud": noise(.18, 200, .8, .4, 90); tone(120, .15, .1, "triangle", 0, 60); break;
    case "skid": noise(.7, 2600, 4, .25, 1400); break;
    case "shield": tone(300, .25, .1, "triangle", 0, 900); tone(900, .2, .06, "sine", .08); break;
    case "power": tone(520, .1, .07, "square"); tone(780, .1, .07, "square", .08); tone(1170, .18, .07, "square", .16); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, .09, "triangle", i*.12)); break;
    case "lose": [392, 330, 262, 196].forEach((f, i) => tone(f, .3, .09, "sawtooth", i*.14)); break;
  }
}

// ---------------------------------------------------------------- input
let lastShake = 0;
async function askPermission(){
  for (const C of [window.DeviceOrientationEvent, window.DeviceMotionEvent]){
    if (C && typeof C.requestPermission === "function"){
      try{ if (await C.requestPermission() !== "granted") return; }catch(e){ return; }
    }
  }
}
addEventListener("deviceorientation", e => { if (e.gamma != null){ inp.gamma = e.gamma; inp.live = true; } });
addEventListener("devicemotion", e => {
  const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
  const now = performance.now();
  if (G.state === "play" && G.cd === 0 && Math.abs(Math.hypot(a.x, a.y, a.z) - 9.81) > 14 && now - lastShake > 3000){ lastShake = now; G.burst = 1.2; pop("NITRO!", "#6bd0ff"); }
});
addEventListener("pointermove", e => { if (!inp.live && !inp.keys) inp.gamma = (e.clientX/innerWidth - .5)*60; });
// with a real tilt sensor a held touch is nitro; without one (touch drag steers) nitro has its own button
document.addEventListener("pointerdown", e => { if (G.state === "play" && e.target.id === "cv" && (inp.live || e.pointerType !== "touch")) inp.nitro = true; });
const nitroBtn = $("nitrobtn"), coarse = matchMedia("(pointer:coarse)").matches;
nitroBtn.addEventListener("pointerdown", e => { e.stopPropagation(); if (G.state === "play") inp.nitro = true; });
for (const ev of ["pointerup", "pointercancel"]) addEventListener(ev, () => { inp.nitro = false; });
addEventListener("keydown", e => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") inp.keys = -1;
  else if (e.code === "ArrowRight" || e.code === "KeyD") inp.keys = 1;
  else if (e.code === "Space"){ inp.nitro = true; e.preventDefault(); }
  else if (e.code === "Escape"){ if (G.state === "play") act("pause"); else if (G.state === "pause") act("resume"); }
});
addEventListener("keyup", e => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) inp.keys = 0;
  if (e.code === "Space") inp.nitro = false;
});
document.addEventListener("visibilitychange", () => { if (document.hidden && G.state === "play") act("pause"); });
$("pausebtn").addEventListener("pointerdown", e => e.stopPropagation());

// ---------------------------------------------------------------- boot + loop
engineInit();
enterMenu();
setTimeout(() => { const b = $("boot"); if (b){ b.classList.add("off"); setTimeout(() => b.remove(), 600); } }, 700);
let last = performance.now(), slowFrames = 0, fpsN = 0;
(function frame(now){
  const dt = Math.min(.05, (now - last)/1000); last = now;
  // if the phone cannot keep up while racing, drop to the lighter graphics mode automatically
  if (G.state === "play" && G.cd === 0 && save.quality === "high"){
    slowFrames += (now - (frame.prev || now)) > 34 ? 1 : 0; fpsN++;
    if (fpsN >= 150){ if (slowFrames > 90){ save.quality = "low"; persist(); resize(); toast("Smoother graphics enabled"); } fpsN = slowFrames = 0; }
  }
  frame.prev = now;
  nitroBtn.classList.toggle("on", coarse && !inp.live && G.state === "play" && G.cd === 0);
  try{
    if (innerWidth !== W || innerHeight !== H) resize();
    if (W > 0 && H > 0){
      const s = G.state;
      if (s === "play"){ stepGame(dt); renderGame(dt); }
      else if (s === "pause" || s === "result") renderGame(0);
      else { stepDemo(dt); renderDemo(dt); }
    }
  } finally { requestAnimationFrame(frame); }
})(last);
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
