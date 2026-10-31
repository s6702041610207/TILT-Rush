"use strict";
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a)*k;
const smooth = (a, b, v) => { const k = clamp((v - a)/(b - a), 0, 1); return k*k*(3 - 2*k); };

// ---------------------------------------------------------------- save data
const DEF = {
  cash:300, gold:5, xp:0,
  veh:["street"], paints:["red","white"], stripes:["none"],
  sel:"street", look:{},
  up:{}, career:{unlocked:1, best:{}, bonus:{}, stars:{}}, rec:{tt:{}, endless:0},
  sound:true, invert:false, quality:"high", sens:"med",
  runs:0, totalDist:0, totalCoins:0, mode:"career", env:"noon", mission:1
};
let save;
try{ save = JSON.parse(JSON.stringify(Object.assign({}, DEF, JSON.parse(localStorage.getItem("tiltracer-save4") || "{}")))); }
catch(e){ save = JSON.parse(JSON.stringify(DEF)); }
save.career = Object.assign({unlocked:1, best:{}, bonus:{}, stars:{}}, save.career);
function persist(){ try{ localStorage.setItem("tiltracer-save4", JSON.stringify(save)); }catch(e){} }

// ---------------------------------------------------------------- cars
const VEHICLES = {
  street:{name:"STREET GT", shape:0, len:1.9,  price:0,    cur:"cash", s:{power:40, handling:50, nitro:40, magnet:30}, desc:"Easy-going starter sedan"},
  muscle:{name:"MUSCLE V8", shape:1, len:2.0,  price:800,  cur:"cash", s:{power:62, handling:42, nitro:55, magnet:30}, desc:"Raw power, heavy steering"},
  sport: {name:"SPORT RS",  shape:2, len:1.85, price:1600, cur:"cash", s:{power:74, handling:72, nitro:62, magnet:40}, desc:"Sleek and quick through corners"},
  hyper: {name:"HYPER X",   shape:3, len:2.0,  price:45,   cur:"gold", s:{power:90, handling:82, nitro:80, magnet:50}, desc:"The ultimate hypercar"},
  classic:{name:"RETRO 66", shape:5, len:1.8,  price:500,  cur:"cash", s:{power:48, handling:55, nitro:45, magnet:35}, desc:"Classic round-body cruiser"},
  suv:   {name:"TERRA SUV", shape:4, len:2.1,  price:1100, cur:"cash", s:{power:54, handling:46, nitro:50, magnet:62}, desc:"Rugged SUV, great coin magnet"},
  drift: {name:"DRIFT R",   shape:6, len:1.8,  price:2400, cur:"cash", s:{power:70, handling:88, nitro:58, magnet:45}, desc:"Razor-sharp drift machine"},
  phantom:{name:"PHANTOM",  shape:7, len:2.05, price:70,   cur:"gold", s:{power:96, handling:86, nitro:88, magnet:60}, desc:"Legendary supercar"}
};
const VEH_ORDER = ["street","classic","muscle","suv","sport","drift","hyper","phantom"];
const TRAFFIC_CARS = ["street","muscle","sport","suv","classic"];
const STAT_KEYS = ["power","handling","nitro","magnet"];
const STAT_LABEL = {power:"POWER", handling:"HANDLING", nitro:"NITRO", magnet:"MAGNET"};
const STAT_ICON = {power:"⚙️", handling:"🛞", nitro:"🔥", magnet:"🧲"};
const UP_COST = [150, 300, 600, 1000, 1600], UP_MAX = 5;
const upLv = (id, k) => (save.up[id] && save.up[id][k]) || 0;
const stat = (id, k) => VEHICLES[id].s[k] + 4*upLv(id, k);
function physics(id){
  const p = stat(id,"power"), h = stat(id,"handling"), n = stat(id,"nitro"), m = stat(id,"magnet");
  return {top:.8 + .32*p/100, resp:6 + 6*h/100, drain:.34/(.6 + n/100), refill:1 + n/200, magnet:1.1 + 3.2*m/100};
}

const PAINTS = {
  red:{name:"RED",c:"#e53935",price:0}, white:{name:"WHITE",c:"#e9edf2",price:0}, blue:{name:"BLUE",c:"#1e63e9",price:150},
  yellow:{name:"YELLOW",c:"#f5c518",price:150}, green:{name:"GREEN",c:"#1fa34a",price:200}, orange:{name:"ORANGE",c:"#ff7a1a",price:250},
  pink:{name:"PINK",c:"#ff4fa3",price:250}, purple:{name:"PURPLE",c:"#8e3dd6",price:300}, cyan:{name:"CYAN",c:"#14b8d4",price:300},
  black:{name:"BLACK",c:"#26272d",price:400}, gold:{name:"GOLD",c:"#d4af37",price:12,cur:"gold",metal:true}
};
const STRIPES = {none:{name:"NONE",price:0}, white:{name:"WHITE",price:100}, black:{name:"BLACK",price:100}, dual:{name:"DUAL",price:250}, side:{name:"SIDE",price:300}, gold:{name:"GOLD",price:600}};

// ---------------------------------------------------------------- environments (n = darkness 0..1)
const ENVS = {
  noon:  {id:"noon",   time:"NOON",   icon:"☀️", n:0,   rain:0},
  sunset:{id:"sunset", time:"SUNSET", icon:"🌇", n:.5,  rain:0},
  night: {id:"night",  time:"NIGHT",  icon:"🌙", n:.95, rain:0},
  rain:  {id:"rain",   time:"RAIN",   icon:"🌧️", n:.12, rain:1},
  auto:  {id:"auto",   time:"AUTO",   icon:"🔄", n:0,   rain:0}
};
const ENV_LIST = ["noon","sunset","night","rain","auto"];

// ---------------------------------------------------------------- career missions
// [env, length(x16 px), time(s), objective, target, traffic, reward$, bonus seconds early, bonus gold]
const MISSIONS = [
  ["noon",   1200, 62, "finish",   0,  .9,  400, 8, 1],
  ["noon",   1400, 62, "overtake", 10, 1.0, 500, 6, 1],
  ["sunset", 1500, 62, "coins",    15, 1.0, 600, 6, 1],
  ["rain",   1600, 66, "clean",    0,  1.2, 700, 8, 2],
  ["night",  1700, 66, "overtake", 14, 1.2, 800, 6, 2],
  ["sunset", 1900, 70, "rival",    0,  1.3, 900, 7, 2],
  ["rain",   2000, 72, "police",   0,  1.4, 1000, 6, 3],
  ["night",  2200, 78, "coins",    30, 1.5, 1200, 6, 3],
  ["noon",   2400, 78, "rival",    0,  1.7, 1400, 5, 4],
  ["night",  2800, 90, "police",   0,  1.9, 2000, 5, 5]
].map((a, i) => ({id:i+1, env:a[0], px:a[1]*16, time:a[2], obj:a[3], target:a[4], traffic:a[5], reward:a[6], bonusSec:a[7], bonusGold:a[8]}));
function objText(m){
  return m.obj === "finish" ? "REACH THE FINISH IN TIME" : m.obj === "overtake" ? "OVERTAKE " + m.target + " CARS" :
         m.obj === "coins" ? "COLLECT " + m.target + " COINS" : m.obj === "clean" ? "FINISH WITHOUT HITTING ANY CAR" :
         m.obj === "rival" ? "BEAT THE RIVAL TO THE FINISH" : "ESCAPE THE POLICE AND REACH THE FINISH";
}
const MODES = [
  {id:"career",  name:"CAREER",     icon:"🗺️", desc:"Clear missions one by one before time runs out"},
  {id:"endless", name:"ENDLESS",    icon:"🚦", desc:"Drive without limits. You have 3 hearts, chase the high score"},
  {id:"tt",      name:"TIME TRIAL", icon:"⏱️", desc:"Reach the finish line with your best possible time"},
  {id:"free",    name:"FREE RIDE",  icon:"☕", desc:"Relaxed driving. No timer, no hearts, just collect coins"}
];

// ---------------------------------------------------------------- level / xp
const XP_K = 80;
const level = () => 1 + Math.floor(Math.sqrt(save.xp / XP_K));
function levelProgress(){ const L = level() - 1, lo = L*L*XP_K, hi = (L+1)*(L+1)*XP_K; return clamp((save.xp - lo)/(hi - lo), 0, 1); }

// every car has its own factory colour; paint / stripe / spoiler are customised per car
const DEFAULT_PAINT = {street:"red", classic:"blue", muscle:"yellow", suv:"green", sport:"purple", drift:"orange", hyper:"cyan", phantom:"white"};
const look = id => (save.look && save.look[id]) || {};
const paintOf = id => look(id).paint || DEFAULT_PAINT[id];
const stripeOf = id => look(id).stripe || "none";
const spoilerOf = id => !!look(id).spoiler;
function setLook(id, k, v){ save.look = save.look || {}; save.look[id] = save.look[id] || {}; save.look[id][k] = v; }
const ownsPaint = (id, k) => k === DEFAULT_PAINT[id] || save.paints.includes(k);
function specFor(id){
  const v = VEHICLES[id], p = PAINTS[paintOf(id)] || PAINTS.red;
  return {shape:v.shape, len:v.len, color:p.c, metal:!!p.metal, stripe:stripeOf(id), spoiler:spoilerOf(id)};
}
