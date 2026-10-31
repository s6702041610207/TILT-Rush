"use strict";
// DOM menus: main, game mode, levels, track select, garage, customize, shop, settings, pause, result.
const UI = {cur:null, gv:null, shopTab:"cars"};
let toastT;
function toast(msg){ const el = $("toast"); el.textContent = msg; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1700); }

const costTxt = (price, cur) => cur === "gold" ? price + " G" : "$ " + price;
const canPay = (price, cur) => (cur === "gold" ? save.gold : save.cash) >= price;
function pay(price, cur){ if (cur === "gold") save.gold -= price; else save.cash -= price; }

function topbar(back){
  return '<div class="tb">' + (back ? '<button class="back" data-act="' + back + '">‹</button>' : '') + '<div class="grow"></div>' +
    '<div class="cur"><span class="c1"><i class="ic d">$</i>' + save.cash + '</span><span class="c2"><i class="ic g">G</i>' + save.gold + '</span></div></div>';
}
const SHORT = {career:"10 missions", endless:"No limit", tt:"Best time", free:"Just cruise"};
// owned cars as a horizontal picker (used on the mode / track screens)
function vcard(){
  return '<div class="picker"><div class="pk-name">' + VEHICLES[save.sel].name + '<small>Tap a car to select it</small></div><div class="pkrow">' +
    VEH_ORDER.map(k => { const own = save.veh.includes(k);
      return '<div class="vc ' + (k === save.sel ? "sel" : "") + (own ? "" : " lock") + '" data-act="pickcar" data-id="' + k + '"><canvas class="vth" data-veh="' + k + '" width="200" height="130"></canvas>' + (own ? '' : '<span class="lk">🔒</span>') + '<small>' + VEHICLES[k].name + '</small></div>'; }).join("") + '</div></div>';
}

// ------------------------------------------------------------------ screens
function sMain(){
  const cleared = Object.keys(save.career.best).length;
  return topbar() +
    '<div class="hero"><h1 class="logo"><em>TILT</em><strong>RUSH</strong></h1></div>' +
    '<div class="spacer"></div>' +
    '<div class="stack"><button class="btn big play" data-act="mode"><span class="pi">▶</span><span class="pt">PLAY<small>Choose a game mode</small></span></button>' +
    '<div class="nav3"><button data-act="garage"><span>🏠</span>GARAGE</button><button data-act="shop"><span>🛒</span>SHOP</button><button data-act="settings"><span>⚙️</span>SETTINGS</button></div></div>';
}
function sMode(){
  const m = MODES.find(x => x.id === save.mode);
  return topbar("main") + '<h2 class="title">GAME MODE</h2>' +
    '<div class="cards2">' + MODES.map(x => '<button class="mcard ' + (x.id === save.mode ? "sel" : "") + '" data-act="selmode" data-id="' + x.id + '"><span class="mi">' + x.icon + '</span><b>' + x.name + '</b><small>' + SHORT[x.id] + '</small></button>').join("") + '</div>' +
    '<p class="mdesc">' + m.desc + '</p><div class="spacer"></div>' + vcard(save.sel) +
    '<button class="btn big" data-act="modenext">NEXT ➜</button>';
}
function sLevels(){
  const m = MISSIONS[save.mission - 1], e = ENVS[m.env], stars = id => save.career.best[id] ? (save.career.bonus[id] ? "★★" : "★") : "";
  return topbar("mode") + '<h2 class="title">CAREER</h2>' +
    '<div class="lvgrid">' + MISSIONS.map(x => {
      const open = x.id <= save.career.unlocked;
      return '<button class="lv ' + (x.id === save.mission ? "sel" : "") + (open ? "" : " lock") + '" data-act="pin" data-id="' + x.id + '"><b>' + (open ? x.id : "🔒") + '</b><span>' + ENVS[x.env].icon + '</span><em>' + stars(x.id) + '</em></button>';
    }).join("") + '</div>' +
    '<div class="panel"><div class="p1">MISSION ' + m.id + ' · ' + e.icon + ' ' + e.time + '</div><div class="p2">' + objText(m) + '</div>' +
    '<div class="p3">⏱ ' + m.time + 's · Reward $ ' + m.reward + ' · Bonus: finish ' + m.bonusSec + 's early = G ' + m.bonusGold + '</div>' +
    '<div class="p3">High score ' + (save.career.best[m.id] || "-") + '</div></div><div class="spacer"></div>' +
    '<button class="btn big" data-act="playcareer">▶ PLAY</button>';
}
function sTrack(){
  const mode = MODES.find(x => x.id === save.mode), tt = save.rec.tt[save.env];
  return topbar("mode") + '<h2 class="title">' + mode.name + '</h2><p class="mdesc">Select a track</p>' +
    '<div class="cards3">' + ENV_LIST.map(id => '<button class="mcard sm ' + (id === save.env ? "sel" : "") + '" data-act="selenv" data-id="' + id + '"><span class="mi">' + ENVS[id].icon + '</span><b>' + ENVS[id].time + '</b></button>').join("") + '</div>' +
    (save.mode === "tt" ? '<p class="mdesc gold">BEST TIME ' + (tt ? fmtT(tt) + " s" : "—") + '</p>' : '') +
    (save.mode === "endless" ? '<p class="mdesc gold">BEST SCORE ' + save.rec.endless + '</p>' : '') +
    '<div class="spacer"></div>' + vcard(save.sel) + '<button class="btn big" data-act="playmode">▶ PLAY</button>';
}
function sGarage(){
  const id = UI.gv || save.sel, v = VEHICLES[id], own = save.veh.includes(id);
  const rows = STAT_KEYS.map(k => {
    const val = stat(id, k), lv = upLv(id, k), cap = v.s[k] + 4*UP_MAX;
    return '<div class="sr"><span>' + STAT_ICON[k] + ' ' + STAT_LABEL[k] + '</span><div class="sbar"><s style="width:' + Math.min(100, val) + '%"></s></div><em>' + val + '<small>/' + cap + '</small></em>' +
      (own ? (lv >= UP_MAX ? '<u>MAX</u>' : '<button class="plus ' + (save.cash < UP_COST[lv] ? "dis" : "") + '" data-act="up" data-k="' + k + '">+<small>$' + UP_COST[lv] + '</small></button>') : '<u></u>') + '</div>';
  }).join("");
  const cars = VEH_ORDER.map(k => {
    const o = save.veh.includes(k);
    return '<div class="vc ' + (k === id ? "sel" : "") + '" data-act="gv" data-id="' + k + '"><canvas class="vth" data-veh="' + k + '" width="200" height="130"></canvas>' + (o ? '' : '<span class="lk">🔒</span>') + '<small>' + VEHICLES[k].name + '</small></div>';
  }).join("");
  const btn = own ? (save.sel === id ? '<button class="gbtn eq" disabled>EQUIPPED</button>' : '<button class="gbtn ok" data-act="selveh">SELECT</button>')
                  : '<button class="gbtn ok ' + (canPay(v.price, v.cur) ? "" : "dis") + '" data-act="buyveh">BUY ' + costTxt(v.price, v.cur) + '</button>';
  return topbar("main") + '<div class="gname">' + v.name + '</div><div class="gdesc">' + v.desc + '</div><div class="spacer"></div>' +
    '<div class="stats">' + rows + '</div><div class="carousel">' + cars + '</div>' +
    '<div class="gbtns"><button class="gbtn cu" data-act="custom">🎨 CUSTOMIZE</button>' + btn + '</div>';
}
function sCustom(){
  const cid = UI.gv || save.sel, v = VEHICLES[cid];
  const paints = Object.keys(PAINTS).map(k => {
    const p = PAINTS[k], own = ownsPaint(cid, k);
    return '<div class="swc"><div class="sw ' + (k === paintOf(cid) ? "sel" : "") + (own ? "" : " lock") + '" style="background:' + p.c + '" data-act="' + (own ? "selpaint" : "buypaint") + '" data-id="' + k + '"></div><small>' + (own ? (k === DEFAULT_PAINT[cid] ? "ORIGINAL" : p.name) : costTxt(p.price, p.cur)) + '</small></div>';
  }).join("");
  const stripes = Object.keys(STRIPES).map(k => {
    const s = STRIPES[k], own = save.stripes.includes(k);
    return '<div class="chip ' + (k === stripeOf(cid) ? "sel" : "") + '" data-act="' + (own ? "selstripe" : "buystripe") + '" data-id="' + k + '">' + s.name + (own ? "" : " · $" + s.price) + '</div>';
  }).join("");
  return topbar("garage") + '<div class="gname">CUSTOMIZE</div><div class="gdesc">' + v.name + '</div><div class="spacer"></div>' +
    '<div class="sheet"><h3>PAINT</h3><div class="row">' + paints + '</div><h3>STRIPE</h3><div class="row">' + stripes + '</div>' +
    '<button class="toggle ' + (spoilerOf(cid) ? "on" : "") + '" data-act="spoiler"><span>SPOILER</span><em>' + (spoilerOf(cid) ? "ON" : "OFF") + '</em></button>' +
    '<button class="btn big" data-act="garage" style="margin-top:10px">DONE</button></div>';
}
function sShop(){
  const tabs = [["cars", "CARS"], ["paints", "PAINT"], ["stripes", "STRIPES"], ["ups", "UPGRADES"]];
  let body = "";
  if (UI.shopTab === "cars") body = VEH_ORDER.map(k => {
    const own = save.veh.includes(k), v = VEHICLES[k];
    return '<div class="item"><canvas class="vth" data-veh="' + k + '" width="200" height="130"></canvas><div class="info"><b>' + v.name + '</b><small>' + v.desc + '</small></div>' +
      (own ? '<button class="btn small alt" data-act="shopsel" data-id="' + k + '">' + (save.sel === k ? "IN USE" : "USE") + '</button>'
           : '<button class="btn small" data-act="shopbuy" data-id="' + k + '"' + (canPay(v.price, v.cur) ? "" : " disabled") + '>' + costTxt(v.price, v.cur) + '</button>') + '</div>';
  }).join("");
  else if (UI.shopTab === "paints") body = '<p class="mdesc" style="margin:0 0 8px">Paint for ' + VEHICLES[save.sel].name + '</p>' + Object.keys(PAINTS).map(k => {
    const own = ownsPaint(save.sel, k), p = PAINTS[k];
    return '<div class="item"><div class="dot" style="background:' + p.c + '"></div><div class="info"><b>' + p.name + '</b>' + (p.metal ? '<small>Metallic</small>' : k === DEFAULT_PAINT[save.sel] ? '<small>Original colour</small>' : '') + '</div>' +
      (own ? '<button class="btn small alt" data-act="selpaint" data-id="' + k + '">' + (paintOf(save.sel) === k ? "IN USE" : "USE") + '</button>'
           : '<button class="btn small" data-act="buypaint" data-id="' + k + '"' + (canPay(p.price, p.cur || "cash") ? "" : " disabled") + '>' + costTxt(p.price, p.cur) + '</button>') + '</div>';
  }).join("");
  else if (UI.shopTab === "stripes") body = Object.keys(STRIPES).map(k => {
    const own = save.stripes.includes(k), s = STRIPES[k];
    return '<div class="item"><div class="dot" style="background:#2a2f3c;font-size:12px;display:grid;place-items:center">' + s.name + '</div><div class="info"><b>' + s.name + ' stripe</b></div>' +
      (own ? '<button class="btn small alt" data-act="selstripe" data-id="' + k + '">' + (stripeOf(save.sel) === k ? "IN USE" : "USE") + '</button>'
           : '<button class="btn small" data-act="buystripe" data-id="' + k + '"' + (save.cash >= s.price ? "" : " disabled") + '>$ ' + s.price + '</button>') + '</div>';
  }).join("");
  else body = '<p class="mdesc" style="margin:0 0 8px">Upgrades for ' + VEHICLES[save.sel].name + '</p>' + STAT_KEYS.map(k => {
    const lv = upLv(save.sel, k), max = lv >= UP_MAX;
    return '<div class="item"><div class="dot" style="display:grid;place-items:center;font-size:26px;background:#232b3f">' + STAT_ICON[k] + '</div><div class="info"><b>' + STAT_LABEL[k] + ' <span class="sub">Lv ' + lv + '/' + UP_MAX + '</span></b>' +
      '<div class="pips">' + Array.from({length:UP_MAX}, (_, i) => '<i class="' + (i < lv ? "on" : "") + '"></i>').join("") + '</div></div>' +
      (max ? '<button class="btn small alt" disabled>MAX</button>' : '<button class="btn small" data-act="up" data-k="' + k + '" data-car="' + save.sel + '"' + (save.cash < UP_COST[lv] ? " disabled" : "") + '>$ ' + UP_COST[lv] + '</button>') + '</div>';
  }).join("");
  return topbar("main") + '<h2 class="title">SHOP</h2><div class="tabs">' + tabs.map(t => '<button class="' + (UI.shopTab === t[0] ? "on" : "") + '" data-act="tab" data-id="' + t[0] + '">' + t[1] + '</button>').join("") + '</div>' + body +
    '<p class="mdesc" style="font-size:13px">Each coin you collect = $ 5. Complete missions to earn cash and G.</p>';
}
function sSettings(){
  return topbar("main") + '<h2 class="title">SETTINGS</h2>' +
    '<button class="toggle ' + (save.sound ? "on" : "") + '" data-act="sound"><span>SOUND</span><em>' + (save.sound ? "ON" : "OFF") + '</em></button>' +
    '<button class="toggle ' + (save.invert ? "on" : "") + '" data-act="invert"><span>INVERT STEERING</span><em>' + (save.invert ? "INVERTED" : "NORMAL") + '</em></button>' +
    '<button class="toggle" data-act="sens"><span>TILT SENSITIVITY</span><em>' + {low:"LOW", med:"MEDIUM", high:"HIGH"}[save.sens || "med"] + '</em></button>' +
    '<button class="toggle ' + (save.quality === "high" ? "on" : "") + '" data-act="quality"><span>GRAPHICS</span><em>' + (save.quality === "high" ? "HIGH" : "LOW (SMOOTHER)") + '</em></button>' +
    '<h3 class="sh">RECORDS</h3><div class="stat"><span>RACES</span><b>' + save.runs + '</b></div><div class="stat"><span>TOTAL DISTANCE</span><b>' + (save.totalDist/10000).toFixed(1) + ' KM</b></div>' +
    '<div class="stat"><span>COINS COLLECTED</span><b>' + save.totalCoins + '</b></div><div class="stat"><span>MISSIONS CLEARED</span><b>' + Object.keys(save.career.best).length + ' / ' + MISSIONS.length + '</b></div>' +
    '<div class="stat"><span>ENDLESS BEST</span><b>' + save.rec.endless + '</b></div>' +
    '<button class="toggle" data-act="reset"><span>RESET ALL DATA</span><em style="color:#ff8a8a">RESET</em></button>' +
    '<p class="mdesc" style="margin-top:12px">Hold the phone upright and tilt it left and right like a tray. Your grip is zeroed when the countdown ends. Hold the screen or shake the phone for nitro.</p>';
}
function sPause(){
  return '<h1 class="logo small">PAUSED</h1><div class="stack"><button class="btn big" data-act="resume">▶ RESUME</button><button class="btn alt" data-act="recenter">⌖ RECENTER TILT</button><button class="btn alt" data-act="retry">↻ RESTART</button><button class="btn alt" data-act="quit">⌂ EXIT</button></div>';
}
function sResult(){
  const r = G.res, title = r.ok ? (r.mode === "career" ? "MISSION COMPLETE" : r.reason === "GAME OVER" ? "GAME OVER" : "FINISH!") : (r.reason || "FAILED");
  const lines = [["SCORE", r.score], ["TIME", fmtT(r.time) + " s"], ["OVERTAKES", r.overtakes], ["COINS", r.coins + " (+$" + r.coins*5 + ")"]].concat(r.lines);
  return '<h1 class="logo small ' + (r.ok ? "win" : "lose") + '">' + title + '</h1>' +
    '<div class="rbox">' + lines.map(l => '<div class="stat"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>').join("") + '</div>' +
    '<div class="earn">+ $ ' + r.cash + (r.gold ? '  + ' + r.gold + ' G' : '') + '</div>' +
    '<div class="stack">' + (r.ok && r.hasNext ? '<button class="btn big" data-act="nextm">NEXT MISSION ➜</button>' : '') +
    '<button class="btn ' + (r.ok && r.hasNext ? "alt" : "big") + '" data-act="retry">↻ ' + (r.ok ? "PLAY AGAIN" : "RETRY") + '</button>' +
    '<div class="grid2"><button class="btn alt" data-act="garage">🏠 GARAGE</button><button class="btn alt" data-act="quitmenu">⌂ MENU</button></div></div>';
}
const PINS = [[70,470],[140,410],[95,345],[170,300],[245,340],[315,285],[262,215],[175,190],[120,125],[235,70]];
function roadPath(){
  let d = "M" + PINS[0].join(",");
  for (let i = 1; i < PINS.length - 1; i++){ const a = PINS[i], b = PINS[i+1]; d += " Q" + a.join(",") + " " + ((a[0] + b[0])/2) + "," + ((a[1] + b[1])/2); }
  return d + " L" + PINS[PINS.length-1].join(",");
}
// career mission map (pins along a winding road, info panel + PLAY at the bottom)
function sMap(){
  const m = MISSIONS[save.mission - 1], e = ENVS[m.env], best = save.career.best[m.id];
  const pins = PINS.map((p, i) => {
    const id = i + 1, open = id <= save.career.unlocked, sel = id === save.mission, col = sel ? "#41d12a" : open ? "#ff9d1a" : "#d62a2a";
    return '<g class="pin ' + (sel ? "sel" : "") + '" transform="translate(' + p[0] + ',' + p[1] + ')" data-act="pin" data-id="' + id + '">' +
      '<path d="M0,0 C-15,-18 -17,-38 0,-42 C17,-38 15,-18 0,0Z" fill="' + col + '" stroke="#0004" stroke-width="1.5"/><circle cy="-28" r="9" fill="#fff"/>' +
      '<text y="-24" text-anchor="middle" font-size="12" font-weight="800" fill="#222">' + (open ? id : "🔒") + '</text>' +
      (save.career.stars[id] ? '<text y="15" text-anchor="middle" font-size="11" font-weight="800" fill="#ffd54a" stroke="#0008" stroke-width=".6">' + "★".repeat(save.career.stars[id]) + '</text>' : '') + '</g>';
  }).join("");
  const deco = [["🏢",205,255],["🏭",150,200],["🏠",300,205],["🌲",60,300],["🌲",330,380],["🌳",200,420],["🏟️",290,150],["🌲",120,60],["🏠",70,200],["🛫",340,90]]
    .map(d => '<text x="' + d[1] + '" y="' + d[2] + '" font-size="22">' + d[0] + '</text>').join("");
  return '<div class="mapwrap"><svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid meet">' +
    '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3e8"/><stop offset="1" stop-color="#2a86c8"/></linearGradient><linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fc25a"/><stop offset="1" stop-color="#4f9a3a"/></linearGradient></defs>' +
    '<rect width="400" height="520" fill="url(#sea)"/><path d="M25,500 C0,330 30,160 130,70 C230,-10 370,20 392,170 C410,300 350,420 300,470 C240,530 90,540 25,500Z" fill="#c9b98a"/>' +
    '<path d="M38,492 C14,330 44,170 140,84 C232,6 360,34 378,172 C394,296 338,410 292,456 C236,512 98,524 38,492Z" fill="url(#land)"/>' +
    '<ellipse cx="215" cy="125" rx="26" ry="12" fill="#6fc6ee"/><ellipse cx="90" cy="270" rx="22" ry="10" fill="#6fc6ee"/>' + deco +
    '<path d="' + roadPath() + '" fill="none" stroke="#3d4047" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="' + roadPath() + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="6 7"/>' + pins + '</svg></div>' +
    topbar("mode").replace('class="tb"', 'class="tb over"') +
    '<div class="mcar"><b>' + VEHICLES[save.sel].name + '</b><canvas class="vth" data-veh="' + save.sel + '" width="200" height="130"></canvas><small>🗺️ CAREER</small><small>' + e.icon + ' ' + e.time + '</small></div>' +
    '<div class="minfo"><div class="mi1"><div class="m1">MISSION ' + m.id + '</div><div class="m2">HIGHEST SCORE ' + (best || "-") + (save.career.bonus[m.id] ? " ★★" : best ? " ★" : "") + '</div>' +
    '<div class="m3">MISSION</div><div class="m4">' + objText(m) + '</div><div class="m5">$ ' + m.reward + ' · ⏱ ' + m.time + 's</div>' +
    '<div class="m3">STARS ' + "★".repeat(save.career.stars[m.id] || 0) + "☆".repeat(3 - (save.career.stars[m.id] || 0)) + '</div><div class="m5">★ clear · ★★ finish ' + m.bonusSec + 's early (G ' + m.bonusGold + ') · ★★★ no car hits</div></div>' +
    '<button class="playblk" data-act="playcareer"><b>➜</b>PLAY</button></div>';
}
const SCREENS = {main:sMain, mode:sMode, levels:sMap, track:sTrack, garage:sGarage, custom:sCustom, shop:sShop, settings:sSettings, pause:sPause, result:sResult};

// ------------------------------------------------------------------ navigation / rendering
UI.go = function(name){
  UI.cur = name;
  if (name === "garage") UI.gv = UI.gv || save.sel;
  else if (name !== "custom") UI.gv = null;
  const showroom = name === "garage" || name === "custom";
  Scene.mode = showroom ? "showroom" : "demo"; Scene.veh = showroom ? (UI.gv || save.sel) : save.sel;
  const el = $("ui"); el.style.display = "flex"; el.className = "screen on s-" + name;
  $("pausebtn").classList.remove("on");
  render();
};
UI.hide = function(){ UI.cur = null; $("ui").style.display = "none"; };
function render(){
  const el = $("ui"); el.innerHTML = SCREENS[UI.cur](); drawThumbs(el);
  const s = el.querySelector(".pkrow .sel");                       // keep the chosen car centred in the picker
  if (s){ const r = s.parentNode; r.scrollLeft = s.offsetLeft - r.clientWidth/2 + s.clientWidth/2; }
}
function drawThumbs(root){
  for (const c of root.querySelectorAll("canvas.vth")){
    const id = c.dataset.veh, x = c.getContext("2d"), img = carSprite(specFor(id));
    x.clearRect(0, 0, c.width, c.height);
    x.save(); x.translate(c.width/2, c.height/2); x.rotate(-Math.PI/2);          // lay the car on its side for a wide thumbnail
    const k = Math.min(c.width*.9/img.uy, c.height*.8/img.ux), w = img.ux*k, h = img.uy*k;
    x.drawImage(img, -w/2, -h/2, w, h); x.restore();
  }
}
UI.showResult = function(){ UI.go("result"); };

// ------------------------------------------------------------------ actions
async function startRun(mode, opt){
  await askPermission(); startAudio();
  try{ if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => screen.orientation.lock("portrait")).catch(() => {}); }catch(e){}
  try{ navigator.wakeLock && navigator.wakeLock.request("screen"); }catch(e){}
  Scene.mode = "demo"; startGame(mode, opt); UI.hide(); $("pausebtn").classList.add("on");
}
function buyItem(kind, id, tbl){
  const it = tbl[id], cur = it.cur || "cash";
  if (!canPay(it.price, cur)) return toast("Not enough funds"), false;
  pay(it.price, cur); save[kind].push(id); beep(660, .15); beep(990, .2); toast("Purchased: " + it.name); return true;
}
function act(a, d){
  d = d || {};
  const cid = UI.cur === "custom" ? (UI.gv || save.sel) : save.sel;      // which car the paint/stripe/spoiler edits apply to
  if (a === "custom" && !save.veh.includes(UI.gv || save.sel)) return toast("Buy this car to customize it");
  if (SCREENS[a] && a !== "pause" && a !== "result"){
    if (G.state !== "menu"){ G.state = "menu"; env = ENVS.noon; worldDist = 0; seedWorld(); }
    return UI.go(a);
  }
  switch (a){
    case "selmode": save.mode = d.id; break;
    case "modenext": return UI.go(save.mode === "career" ? "levels" : "track");
    case "pin": if (+d.id <= save.career.unlocked) save.mission = +d.id; else toast("Clear the previous mission first"); break;
    case "playcareer": return startRun("career", {mission:save.mission});
    case "selenv": save.env = d.id; break;
    case "playmode": return startRun(save.mode, {env:save.env});
    case "gv": UI.gv = d.id; Scene.veh = d.id; break;
    case "selveh": save.sel = UI.gv; break;
    case "pickcar":
      if (save.veh.includes(d.id)){ save.sel = d.id; break; }
      toast("Locked - buy it in the Garage"); UI.gv = d.id; return UI.go("garage");
    case "buyveh": if (buyItem("veh", UI.gv, VEHICLES)) save.sel = UI.gv; break;
    case "shopsel": save.sel = d.id; break;
    case "shopbuy": if (buyItem("veh", d.id, VEHICLES)) save.sel = d.id; break;
    case "tab": UI.shopTab = d.id; break;
    case "up": {
      const id = d.car || UI.gv || save.sel, lv = upLv(id, d.k);
      if (lv >= UP_MAX) break;
      if (save.cash < UP_COST[lv]) return toast("Not enough cash");
      save.cash -= UP_COST[lv]; save.up[id] = save.up[id] || {}; save.up[id][d.k] = lv + 1; beep(660, .12); beep(990, .15); break;
    }
    case "selpaint": setLook(cid, "paint", d.id); break;
    case "buypaint": if (buyItem("paints", d.id, PAINTS)) setLook(cid, "paint", d.id); break;
    case "selstripe": setLook(cid, "stripe", d.id); break;
    case "buystripe": if (buyItem("stripes", d.id, STRIPES)) setLook(cid, "stripe", d.id); break;
    case "spoiler": setLook(cid, "spoiler", !spoilerOf(cid)); break;
    case "sound": save.sound = !save.sound; break;
    case "sens": save.sens = {low:"med", med:"high", high:"low"}[save.sens || "med"]; break;
    case "quality": save.quality = save.quality === "high" ? "low" : "high"; resize(); break;
    case "recenter": inp.cal = inp.live ? inp.gamma : 0; toast("Tilt centered"); return;
    case "invert": save.invert = !save.invert; break;
    case "reset":
      if (!confirm("Reset all data?")) return;
      save = JSON.parse(JSON.stringify(DEF)); persist(); toast("Data reset"); UI.gv = null; break;
    case "pause": if (G.state !== "play") return; G.state = "pause"; engineSound(false, 0); inp.nitro = false; UI.go("pause"); return;
    case "resume": G.state = "play"; UI.hide(); $("pausebtn").classList.add("on"); return;
    case "retry": return startRun(G.mode, G.opt);
    case "nextm": save.mission = Math.min(MISSIONS.length, G.m.id + 1); persist(); return startRun("career", {mission:save.mission});
    case "quit": return quitGame();
    case "quitmenu": G.state = "menu"; return enterMenu();
    default: return;
  }
  persist(); render();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  startAudio(); sfx("click"); act(b.dataset.act, b.dataset);
});
