// Arşivim uçtan uca test: node e2e.mjs <index.html> <part1.zip> <part2.zip> <çıktı klasörü>
// Sayfa yerel bir HTTP sunucusundan açılır (crypto.subtle ve CSP için güvenli bağlam), telefon boyutunda gezilir.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [htmlPath, zip1, zip2, out = "."] = process.argv.slice(2);
const root = path.dirname(path.resolve(htmlPath));
const types = {".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".js": "text/javascript"};
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {"Content-Type": types[path.extname(p)] || "application/octet-stream"});
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const URL0 = `http://localhost:${port}/${path.basename(htmlPath)}`;

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "tr-TR"});
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
let shot = 0;
const snap = async name => { await page.waitForTimeout(350); await page.screenshot({path: path.join(out, `${String(++shot).padStart(2, "0")}-${name}.png`)}); };
const click = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(250); };
const nav = async label => click(`#nav button:has-text("${label}")`);

await page.goto(URL0);
await snap("karsilama");
await page.setInputFiles("#zipIn", [zip1, zip2]);
await page.waitForFunction(() => document.querySelector(".tile.big .v") && !/…|—/.test(document.querySelector(".tile.big .v").textContent), null, {timeout: 30000});
await page.waitForTimeout(1500);
await snap("ana-sayfa");
console.log("ana sayfa:", (await page.locator(".pf .nm").textContent()), "|", (await page.locator(".tiles").innerText()).replace(/\s+/g, " "));
await page.evaluate(() => scrollTo(0, 99999)); await snap("ana-sayfa-alt");
await page.evaluate(() => scrollTo(0, 0));

// Mesajlar
await nav("Mesajlar"); await snap("mesajlar");
const firstThread = await page.locator("#tl .item .tt").first().textContent();
console.log("ilk sohbet:", firstThread);
await click("#tl .item"); await page.waitForTimeout(500); await snap("sohbet");
await click('button[aria-label="Bilgi"]'); await snap("sohbet-bilgi");
await page.keyboard.press("Escape"); await page.evaluate(() => window.__onBack());
await click('button[aria-label="Sohbette ara"]');
await page.fill("#tsq", "kahve"); await page.waitForTimeout(600); await snap("sohbette-ara");
await click("#tsr .item"); await page.waitForTimeout(500); await snap("arama-sonucu-mesaj");
console.log("vurgulanan mesaj var mı:", await page.locator(".bub.hl").count());
await page.evaluate(() => window.__onBack());
// Grup sohbeti
await page.locator(".chip", {hasText: "Gruplar"}).click(); await page.waitForTimeout(300);
await click("#tl .item"); await page.waitForTimeout(400); await snap("grup-sohbet");
await page.evaluate(() => window.__onBack());

// Medya
await nav("Medya"); await page.waitForTimeout(1200); await snap("medya-hikayeler");
await click(".mgrid .th"); await page.waitForTimeout(600); await snap("goruntuleyici");
console.log("görüntüleyicide resim:", await page.locator("#viewer img").count());
await page.evaluate(() => window.__onBack());
await page.locator(".chip", {hasText: "Gönderiler"}).click(); await page.waitForTimeout(900); await snap("medya-gonderiler");
await page.locator(".chip", {hasText: "Mesajlardaki"}).click(); await page.waitForTimeout(900); await snap("medya-mesajlardaki");

// Arama
await nav("Ara");
await page.fill("main input[type=search]", "istanbul"); await page.waitForTimeout(1500); await snap("genel-arama");
console.log("arama bölümleri:", (await page.locator("#sr .sec").allTextContents()).join(" | "));

// Dosyalar
await nav("Dosyalar"); await snap("dosyalar");
await click('#fl .item:has-text("Instagram etkinliğin")'); await snap("dosyalar-klasor");
await page.evaluate(() => window.__onBack());
await page.fill("main input[type=search]", "liked"); await page.waitForTimeout(500);
await click("#fl .item"); await page.waitForTimeout(800); await snap("dosya-json");

// Kategoriler
await nav("Ana sayfa");
await click('.item:has-text("Kişiler")'); await snap("grup-kisiler");
await click('.item:has-text("Seni geri takip etmeyenler")'); await page.waitForTimeout(700); await snap("geri-takip-etmeyen");
console.log("geri takip etmeyen:", await page.locator(".top .s").textContent());
await page.evaluate(() => window.__onBack()); await page.evaluate(() => window.__onBack());
await click('.item:has-text("Etkinliğin")'); await click('.item:has-text("Beğendiğin gönderiler")'); await page.waitForTimeout(800); await snap("begeniler");
await page.evaluate(() => window.__onBack()); await page.evaluate(() => window.__onBack());
await click('.item:has-text("Giriş ve güvenlik")'); await click('.item:has-text("Giriş geçmişi")'); await page.waitForTimeout(600); await snap("giris-gecmisi");
await page.evaluate(() => window.__onBack()); await page.evaluate(() => window.__onBack());
await click('.item:has-text("Reklamlar")'); await click('.item:has-text("reklamverenler")'); await page.waitForTimeout(600); await snap("reklamverenler");
await page.evaluate(() => window.__onBack()); await page.evaluate(() => window.__onBack());

// İstatistik
await click('button[aria-label="İstatistikler"]'); await page.waitForTimeout(1200); await snap("istatistik");
await page.evaluate(() => scrollTo(0, 1400)); await snap("istatistik-2");
await page.evaluate(() => scrollTo(0, 99999)); await page.waitForTimeout(600); await snap("istatistik-3");
await page.evaluate(() => window.__onBack());

// Ayarlar: açık tema + kilit
await click('button[aria-label="Ayarlar"]'); await snap("ayarlar");
await click('.seg button:has-text("Açık")'); await page.evaluate(() => window.__onBack()); await snap("acik-tema-ana");
await click('button[aria-label="Ayarlar"]');
await click('.item:has-text("Uygulama kilidi")');
for (const k of "1234") await page.locator(`#sheet [data-k="${k}"]`).click();
await page.waitForTimeout(300);
for (const k of "1234") await page.locator(`#sheet [data-k="${k}"]`).click();
await page.waitForTimeout(500);
console.log("kilit ayarlandı:", await page.evaluate(() => !!JSON.parse(localStorage.getItem("arsivim-v1")).pin));
await page.reload(); await page.waitForTimeout(500); await snap("kilit-ekrani");
for (const k of "1234") await page.locator(`#lock [data-k="${k}"]`).click();
await page.waitForTimeout(500);
console.log("kilit açıldı:", await page.locator("#lock").evaluate(e => e.classList.contains("hidden")));

console.log("errors", JSON.stringify(errors, null, 1));
await browser.close(); server.close();
