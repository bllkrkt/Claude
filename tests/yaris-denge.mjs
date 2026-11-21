// Gece Kaçağı denge ölçümü: sanal sürücü kariyer etkinliklerini ekransız hızlı oynar.
// Kullanım: node yaris-denge.mjs [beceri=1.0]
// Her rakip bölgesi için: oyuncu o aşamada makul bir arabayla (sınıf + parça) yarışır; sıra, süre, duvar çarpması yazılır.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const skill = Number(process.argv[2] || 1);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + new URL('../yaris/src/main/assets/index.html', import.meta.url).pathname);
await p.waitForTimeout(1200);
// oyuncunun o aşamadaki arabası (sınıf, parça seviyesi)
const plan = { 10: ['serce', 0], 9: ['serce', 1], 8: ['pusula', 2], 7: ['sahin', 1], 6: ['bozkurt', 3], 5: ['atmaca', 2], 4: ['karakurt', 3], 3: ['yildirim', 3], 2: ['volkan', 3], 1: ['firtina', 3] };
if (process.env.NOS) await p.evaluate(n => { window.__NOS = n; }, JSON.parse(process.env.NOS));
const rows = await p.evaluate(async ([plan, skill]) => {
  const A = window.A, V = window.VERI, out = [];
  A.S.ilk = false;
  for (const no of (window.__NOS || [10, 9, 8, 7, 6, 5, 4, 3, 2, 1])) {
    const [car, lv] = plan[no];
    A.S.arabalar[car] = A.S.arabalar[car] || { parca: {}, gor: Object.assign({}, A.S.arabalar.serce.gor, { renk: '#ffffff' }), sahip: {} };
    for (const pp of V.PARTS) A.S.arabalar[car].parca[pp.id] = lv;
    A.S.sec = car; A.S.kar.rakip = no;
    for (const e of A._events.filter(e => e.rakipNo === no)) {
      A.startEv(e.id);
      const dlg = document.getElementById('dlgSkip'); if (document.getElementById('dlg').classList.contains('on')) dlg.click();
      const r = window.YARIS._fast(600, skill);
      out.push([no, e.tip, e.pist, car + '+' + lv, r ? r.pos : '-', r && r.res ? (r.res.win ? 'KAZANDI' : 'kaybetti') : 'bitmedi', r ? Math.round(r.t) + 'sn' : '', 'duvar ' + (r ? r.wall : ''), r && r.res ? JSON.stringify({ k: r.res.kaza, y: r.res.yakalandi, puan: r.res.puan, hedef: window.YARIS.R && window.YARIS.R.driftTarget, top: r.res.toplam, kalan: r.res.kalan && Math.round(r.res.kalan), bust: r.res.bounty }) : 'v=' + (r && r.v.toFixed(1))].join(' '));
      window.YARIS.stopRace(true);
    }
  }
  return out;
}, [plan, skill]);
console.log(rows.join('\n'));
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await b.close();
