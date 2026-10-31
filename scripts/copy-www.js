// Copies the web game into www/ (the folder Capacitor packages into the APK).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "www");
const files = ["index.html", "style.css", "data.js", "sprites.js", "engine.js", "ui.js", "main.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "sw.js"];
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log("copied " + files.length + " files to www/");
