'use strict';
// =====================================================================
//  Araçlar bölümü: ölçüm, telefon testleri, günlük araçlar, hesaplayıcılar
//  Hepsi internetsiz çalışır. index.html'deki yardımcıları (V, ic, sync, call, toast…) kullanır.
// =====================================================================

const num=(n,d=2)=>isFinite(n)?Number(n).toLocaleString('tr-TR',{maximumFractionDigits:d}):'—';
const pf=v=>{ v=String(v||'').trim().replace(/\s/g,''); if(/,/.test(v)) v=v.replace(/\./g,'').replace(',','.'); return parseFloat(v); };
const LS={ get(k,d){ try{ const v=localStorage.getItem('ak-'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} }, set(k,v){ try{ localStorage.setItem('ak-'+k,JSON.stringify(v)); }catch(e){} } };
const big=(v,u,sub)=>`<div style="text-align:center;padding:10px 0 4px"><div style="font-size:64px;font-weight:800;letter-spacing:-.03em;line-height:1.05">${v}<span style="font-size:24px;color:var(--tx2);font-weight:700;margin-left:4px">${u||''}</span></div>${sub?`<div class="muted" style="margin-top:6px">${sub}</div>`:''}</div>`;
const field=(id,label,val,ph,type)=>`<label class="small muted" style="display:block;margin:10px 0 6px">${label}</label><input type="text" inputmode="${type||'decimal'}" id="${id}" value="${esc(val??'')}" placeholder="${esc(ph||'')}" oninput="TOOL.calc&&TOOL.calc()">`;
const resBox=id=>`<div class="note ok" id="${id}" style="margin-top:14px;font-size:16px;min-height:52px">${ic('check')}<div>Değerleri gir.</div></div>`;
const setRes=(id,html)=>{ const e=document.getElementById(id); if(e) e.innerHTML=`${ic('check')}<div>${html}</div>`; };
const val=id=>pf((document.getElementById(id)||{}).value);

let TOOL=null;          // açık aracın tanımı
let TS={};              // açık aracın geçici durumu
let OVL=null;           // tam ekran katman
window.__sensor=(k,v)=>{ if(TOOL&&TOOL.onSensor) TOOL.onSensor(k,v); };
window.__onPerm=(p,ok)=>{ refreshInfo(); if(TOOL&&TOOL.onPerm) TOOL.onPerm(p,ok); };
window.__micTest=st=>{ if(TOOL&&TOOL.onMic) TOOL.onMic(st); };
const _prevBack=window.__onBack;
window.__onBack=()=>{ if(OVL){ closeOverlay(); return true; } if(!sheetOpen()&&TOOL&&TOOL.back&&TOOL.back()) return true; return _prevBack(); };
window.__onPause=()=>{ if(TOOL&&TOOL.pause) TOOL.pause(); };

function stopTool(){ if(TOOL&&TOOL.stop) try{ TOOL.stop(); }catch(e){} if(TOOL&&TOOL.sensor) sync('sensorStop'); TOOL=null; TS={}; closeOverlay(); }
function overlay(html,onTap){
  closeOverlay();
  OVL=document.createElement('div');
  OVL.style.cssText='position:fixed;inset:0;z-index:80;touch-action:none;user-select:none';
  OVL.innerHTML=html; if(onTap) OVL.addEventListener('click',onTap);
  document.body.appendChild(OVL);
}
function closeOverlay(){ if(OVL){ OVL.remove(); OVL=null; if(TOOL&&TOOL.onOverlayClose) TOOL.onOverlayClose(); } }
function needPerm(perm,why){
  if(sync('hasPerm',{perm})) return '';
  const name=perm.endsWith('CAMERA')?'Kamera':'Mikrofon';
  return `<div class="card"><b>${name} izni gerekli</b><p class="muted small" style="margin:6px 0 12px">${why}</p><button class="btn pri" onclick="sync('askPerm',{perm:'${perm}'})">İzin ver</button>
    <p class="muted tiny" style="margin-top:10px">Daha önce "İzin verme" dediysen pencere çıkmaz: <button class="link tiny" style="padding:0" onclick="sync('openShortcut',{id:'my_app'})">uygulama izinlerinden</button> aç.</p></div>`;
}

// ---------------- Araç listesi ----------------
const CATS_T=[['olcum','Ölçüm'],['test','Telefon testleri'],['gunluk','Günlük'],['hesap','Hesaplayıcılar'],['diger','Diğer']];
const TOOLS={};
function T(id,cat,emoji,t,d,def){ TOOLS[id]=Object.assign({id,cat,emoji,t,d},def); }

function vTools(){
  const q=trl((TS.q||'').trim());
  let h=`<div class="search">${ic('search')}<input type="text" placeholder="Araç ara (ör. pusula, kredi, QR)" value="${esc(TS.q||'')}" oninput="TS.q=this.value;$('#tList').innerHTML=toolList()"></div><div id="tList">${toolList()}</div>`;
  V(h);
}
function toolList(){
  const q=trl((TS.q||'').trim()); let h='';
  for(const [c,ct] of CATS_T){
    const L=Object.values(TOOLS).filter(t=>t.cat===c&&(!q||trl(t.t+' '+t.d).includes(q))&&(!t.need||t.need()));
    if(!L.length) continue;
    h+=`<h3>${ct}</h3><div class="grid4" style="margin-top:0;gap:10px">${L.map(t=>`<button class="tile" style="min-height:118px;padding:14px;gap:6px" onclick="go('tool','${t.id}')"><div style="font-size:30px;line-height:1">${t.emoji}</div><b style="font-size:16px">${t.t}</b><span style="font-size:12.5px">${t.d}</span></button>`).join('')}</div>`;
  }
  return h||`<div class="card empty">Eşleşen araç yok.</div>`;
}
function vTool(soft){
  if(!soft||!TOOL||TOOL.id!==viewArg){
    if(TOOL) stopTool();
    TOOL=TOOLS[viewArg]; TS={};
    $('#ttl').textContent=TOOL.t;
    if(TOOL.sensor && !sync('sensorStart',{kind:TOOL.sensor})){ V(`<div class="note bad">${ic('warn')}<div>Bu telefonda gerekli sensör yok, bu araç çalışamaz.</div></div>`); return; }
  }
  $('#ttl').textContent=TOOL.t;
  TOOL.view(soft);
}

// =====================================================================
//  ÖLÇÜM
// =====================================================================
const DIRS=['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'];
const DIRN={K:'Kuzey',KD:'Kuzeydoğu',D:'Doğu',GD:'Güneydoğu',G:'Güney',GB:'Güneybatı',B:'Batı',KB:'Kuzeybatı'};
T('compass','olcum','🧭','Pusula','Yön ve derece',{sensor:'orient',
  view(){
    V(`<div class="card" style="text-align:center">
      <div style="position:relative;width:280px;height:280px;margin:10px auto">
        <svg id="cDial" viewBox="0 0 200 200" style="width:100%;height:100%;transition:transform .12s linear">
          <circle cx="100" cy="100" r="96" fill="var(--card2)" stroke="var(--line)" stroke-width="2"/>
          ${Array.from({length:72},(_, i)=>{const a=i*5*Math.PI/180,l=i%18===0?14:i%2===0?8:4;return `<line x1="${100+92*Math.sin(a)}" y1="${100-92*Math.cos(a)}" x2="${100+(92-l)*Math.sin(a)}" y2="${100-(92-l)*Math.cos(a)}" stroke="${i===0?'#F26D6D':'#6B7686'}" stroke-width="${i%18===0?3:1.5}"/>`;}).join('')}
          ${[['K',0,'#F26D6D'],['D',90,'#E8EDF3'],['G',180,'#E8EDF3'],['B',270,'#E8EDF3']].map(([t,a,c])=>`<text x="${100+66*Math.sin(a*Math.PI/180)}" y="${100-66*Math.cos(a*Math.PI/180)+7}" text-anchor="middle" font-size="20" font-weight="800" fill="${c}" transform="rotate(${a} ${100+66*Math.sin(a*Math.PI/180)} ${100-66*Math.cos(a*Math.PI/180)})">${t}</text>`).join('')}
        </svg>
        <div style="position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid var(--ac)"></div>
      </div>
      <div id="cVal">${big('—','°')}</div></div>
      <div class="note info" id="cCal">${ic('info')}<div class="small">Telefonu düz tut. Değerler tutarsızsa telefonu havada <b>8 çizerek</b> kalibre et. Metal eşyalar ve mıknatıslı kılıflar pusulayı şaşırtır.</div></div>`);
  },
  onSensor(k,v){
    const az=v[0]; const d=$('#cDial'); if(!d) return;
    // Kadranı en kısa yoldan döndür
    TS.rot=TS.rot??-az; let target=-az; while(target-TS.rot>180) target-=360; while(target-TS.rot<-180) target+=360; TS.rot=target;
    d.style.transform=`rotate(${TS.rot}deg)`;
    const dir=DIRS[Math.round(az/22.5)%16];
    $('#cVal').innerHTML=big(Math.round(az),'°',`<b style="font-size:22px;color:var(--tx)">${dir}</b> · ${DIRN[dir]||''}`);
    if(v[3]!==undefined&&v[3]<2) $('#cCal').className='note warn'; else $('#cCal').className='note info';
  }});

T('level','olcum','📐','Su terazisi','Eğim ve düzlük',{sensor:'level',
  view(){
    V(`<div class="card" style="text-align:center"><div id="lvBox" style="position:relative;width:260px;height:260px;margin:14px auto;border-radius:50%;background:var(--card2);border:2px solid var(--line);overflow:hidden">
        <div style="position:absolute;left:50%;top:50%;width:70px;height:70px;margin:-35px;border-radius:50%;border:2px dashed var(--tx3)"></div>
        <div style="position:absolute;left:0;right:0;top:50%;height:1px;background:var(--line)"></div><div style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:var(--line)"></div>
        <div id="lvB" style="position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px;border-radius:50%;background:var(--ac);opacity:.85;box-shadow:0 0 20px var(--ac)"></div></div>
      <div id="lvV">${big('—','°')}</div></div>
      <div class="note info">${ic('info')}<div class="small">Telefonu ölçeceğin yüzeye sırtüstü koy. Kenar ölçümü için telefonu yan çevirip kenarını yüzeye daya: üstteki değer o yönün eğimidir.</div></div>`);
  },
  onSensor(k,v){
    const [x,y,z]=v; const g=Math.sqrt(x*x+y*y+z*z)||9.81;
    const roll=Math.atan2(x,z)*180/Math.PI, pitch=Math.atan2(y,z)*180/Math.PI;
    const flat=Math.abs(z)>Math.abs(x)&&Math.abs(z)>Math.abs(y);
    const b=$('#lvB'); if(!b) return;
    if(flat){
      const px=Math.max(-100,Math.min(100,-roll*4)), py=Math.max(-100,Math.min(100,pitch*4));
      b.style.transform=`translate(${px}px,${py}px)`;
      const tot=Math.sqrt(roll*roll+pitch*pitch); const ok=tot<1;
      b.style.background=ok?'var(--ac)':'var(--warn)'; b.style.boxShadow=`0 0 20px ${ok?'var(--ac)':'var(--warn)'}`;
      $('#lvV').innerHTML=big(num(tot,1),'°',ok?'<b style="color:var(--ac)">Düz ✓</b>':`Yan: ${num(roll,1)}° · Ön/arka: ${num(pitch,1)}°`);
    } else {
      const e=Math.atan2(Math.abs(x),Math.abs(y))*180/Math.PI; const dev=Math.min(e,90-e);
      b.style.transform='translate(0,0)';
      $('#lvV').innerHTML=big(num(dev,1),'°',dev<1?'<b style="color:var(--ac)">Düz ✓ (kenar)</b>':'Kenar eğimi');
    }
  }});

const LUX=[[1,'Zifiri karanlık'],[10,'Çok karanlık'],[50,'Loş'],[150,'Oturma odası'],[400,'İyi aydınlatılmış oda'],[1000,'Ofis / mağaza'],[10000,'Kapalı hava, dışarısı'],[1e9,'Güneş ışığı']];
T('light','olcum','💡','Işık ölçer','Ortam aydınlığı (lüks)',{sensor:'light',
  view(){ V(`<div class="card"><div id="lxV">${big('—','lx')}</div><div class="bar" style="margin:14px 0"><i id="lxB" style="width:0"></i></div><div class="row small" style="justify-content:space-between"><span class="muted">En düşük: <b id="lxMin">—</b></span><span class="muted">En yüksek: <b id="lxMax">—</b></span></div></div>
    <div class="list">${[['Kitap okumak','300–500 lx'],['Bilgisayar başı','300–500 lx'],['Mutfak tezgâhı','500+ lx'],['Bitki (gölge seven)','1.000+ lx'],['Uyumadan önce','< 50 lx']].map(([a,b])=>`<div class="item" style="min-height:48px"><div class="grow small">${a}</div><div class="small muted">${b}</div></div>`).join('')}</div>
    <p class="muted tiny" style="margin:0 4px">Sensör ekranın üst kısmında, ön kameranın yanındadır. Yaklaşık değerdir.</p>`); },
  onSensor(k,v){ const l=v[0]; TS.min=Math.min(TS.min??l,l); TS.max=Math.max(TS.max??l,l);
    const e=$('#lxV'); if(!e) return; e.innerHTML=big(num(l,0),'lx',(LUX.find(x=>l<x[0])||LUX[7])[1]);
    $('#lxB').style.width=Math.min(100,Math.log10(l+1)/5*100)+'%'; $('#lxMin').textContent=num(TS.min,0); $('#lxMax').textContent=num(TS.max,0); }});

const DB=[[30,'Fısıltı'],[45,'Sessiz oda'],[60,'Normal konuşma'],[70,'Elektrikli süpürge'],[85,'Yoğun trafik (uzun süre zararlı)'],[100,'Konser / motosiklet'],[200,'Çok yüksek, kulak sağlığı riski']];
T('sound','olcum','🔊','Ses ölçer','Ortam gürültüsü (dB)',{
  view(){
    const p=needPerm('android.permission.RECORD_AUDIO','Ortam sesini ölçmek için mikrofon gerekli. Ses kaydedilmez, saklanmaz.');
    if(p){ V(p); return; }
    if(!TS.on){ TS.on=sync('soundMeter'); TS.hist=[]; }
    V(`<div class="card"><div id="dbV">${big('—','dB')}</div><div class="bar" style="margin:14px 0;height:16px"><i id="dbB" style="width:0"></i></div>
      <div class="row small" style="justify-content:space-between"><span class="muted">Ort: <b id="dbAvg">—</b></span><span class="muted">En yüksek: <b id="dbMax">—</b></span></div></div>
      <div class="list">${DB.slice(0,6).map(([d,t])=>`<div class="item" style="min-height:44px"><div class="grow small">${t}</div><div class="small muted">~${d} dB</div></div>`).join('')}</div>
      <div class="note warn">${ic('warn')}<div class="small">Telefon mikrofonu kalibre edilmiş bir ölçüm cihazı değildir; değerler yaklaşıktır (±5–10 dB). Karşılaştırma için kullan.</div></div>`);
  },
  onPerm(){ vTool(true); },
  onSensor(k,v){ if(k!=='sound') return; const d=v[0]; TS.hist.push(d); if(TS.hist.length>60) TS.hist.shift(); TS.max=Math.max(TS.max||0,d);
    const avg=TS.hist.reduce((a,b)=>a+b,0)/TS.hist.length; const e=$('#dbV'); if(!e) return;
    e.innerHTML=big(Math.round(d),'dB',(DB.find(x=>d<x[0])||DB[6])[1]);
    const bar=$('#dbB'); bar.style.width=Math.min(100,d/120*100)+'%'; bar.style.background=d>85?'var(--bad)':d>70?'var(--warn)':'';
    $('#dbAvg').textContent=Math.round(avg)+' dB'; $('#dbMax').textContent=Math.round(TS.max)+' dB'; },
  pause(){ TS.on=false; }, stop(){ sync('sensorStop'); }});

T('metal','olcum','🧲','Metal dedektörü','Demir/çelik, duvardaki kablo',{sensor:'mag',
  view(){ V(`<div class="card"><div id="mgV">${big('—','µT')}</div><div class="bar" style="margin:14px 0;height:18px"><i id="mgB" style="width:0"></i></div>
      <button class="btn" onclick="TS.base=TS.last;toast('Sıfırlandı')">Burayı sıfır kabul et</button></div>
      <div class="note info">${ic('info')}<div class="small">Telefonun manyetik sensörünü kullanır. Sadece <b>demir ve çelik</b> gibi manyetik metalleri (vida, çivi, duvardaki boru/kablo kanalı) bulur; altın, gümüş, alüminyumu bulamaz. Telefonun üst kısmını yavaşça gezdir. Normal ortam: 25–65 µT.</div></div>`); },
  onSensor(k,v){ const t=v[0]; TS.last=t; TS.base=TS.base??t; const diff=Math.abs(t-TS.base); const e=$('#mgV'); if(!e) return;
    const hit=diff>25; e.innerHTML=big(Math.round(t),'µT',hit?'<b style="color:var(--bad)">Metal var! (+'+Math.round(diff)+')</b>':'Fark: '+Math.round(diff));
    const b=$('#mgB'); b.style.width=Math.min(100,diff/150*100)+'%'; b.style.background=hit?'var(--bad)':'';
    if(hit&&Date.now()-(TS.vib||0)>700){ TS.vib=Date.now(); sync('vibrate',{p:[60]}); } }});

T('ruler','olcum','📏','Cetvel','Ekranda santim ve inç',{
  view(){
    const sc=sync('screen')||{xdpi:400,density:2.75}; const cal=LS.get('rulerCal',1);
    const pxmm=sc.ydpi/sc.density/25.4*cal; const H=innerHeight-140; const mm=Math.floor(H/pxmm);
    let ticks=''; for(let i=0;i<=mm;i++){ const l=i%10===0?34:i%5===0?22:12; ticks+=`<div style="position:absolute;left:0;top:${i*pxmm}px;width:${l}px;height:1.5px;background:var(--tx)"></div>${i%10===0?`<div style="position:absolute;left:40px;top:${i*pxmm-9}px;font-weight:800;font-size:15px">${i/10}</div>`:''}`; }
    const pxin=pxmm*25.4; let inch=''; for(let i=0;i<=H/pxin*8;i++){ const l=i%8===0?30:i%4===0?20:10; inch+=`<div style="position:absolute;right:0;top:${i*pxin/8}px;width:${l}px;height:1.5px;background:var(--tx2)"></div>${i%8===0?`<div style="position:absolute;right:36px;top:${i*pxin/8-9}px;font-weight:700;color:var(--tx2)">${i/8}"</div>`:''}`; }
    V(`<div style="position:relative;height:${H}px;margin:0 -16px;background:var(--bg2)">${ticks}${inch}<div style="position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);text-align:center" class="muted small">Sol: cm · Sağ: inç<br>Ölçeceğin şeyi ekranın<br>üst kenarına hizala</div></div>
      <div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b class="small">İnce ayar</b><span class="muted tiny">Bilinen bir şeyle (kredi kartı: 85,6 mm) karşılaştır</span></div>
      <input type="range" min="0.9" max="1.1" step="0.002" value="${cal}" onchange="LS.set('rulerCal',+this.value);vTool(true)"></div>`);
  }});

// =====================================================================
//  TELEFON TESTLERİ
// =====================================================================
T('screen','test','🟥','Ekran testi','Ölü piksel, renk, parlaklık',{
  view(){ V(`<div class="card"><p class="small muted" style="margin-bottom:14px">Ekran sırayla siyah, beyaz, kırmızı, yeşil, mavi ve gri renge boyanır. Her renkte ekranı dikkatlice incele: farklı renkte kalan küçük nokta <b>ölü/takılı piksel</b>, lekeler <b>yanık (burn-in)</b> veya sızma olabilir.</p>
    <button class="btn pri" onclick="TOOL.run()">Testi başlat</button><p class="muted tiny" style="margin-top:10px;text-align:center">Sonraki renk için dokun · çıkmak için geri tuşu</p></div>`); },
  run(){ const C=['#000','#fff','#f00','#0f0','#00f','#808080','#ff0','#0ff','#f0f']; let i=0;
    overlay(`<div id="scr" style="position:absolute;inset:0;background:${C[0]}"></div>`,()=>{ i++; if(i>=C.length){ closeOverlay(); toast('Ekran testi bitti'); return; } $('#scr').style.background=C[i]; }); }});

T('touch','test','👆','Dokunmatik testi','Ölü bölge ve çoklu dokunma',{
  view(){ V(`<div class="card"><p class="small muted" style="margin-bottom:14px">Tam ekranda parmağınla her yeri boya. Çizgi kesiliyorsa o bölgede dokunmatik sorunu var demektir. Aynı anda kaç parmağı algıladığını da gösterir.</p>
    <button class="btn pri" onclick="TOOL.run()">Testi başlat</button></div>`); },
  run(){
    overlay(`<canvas id="tc" style="position:absolute;inset:0;background:#000"></canvas><div id="ti" style="position:absolute;left:12px;top:12px;color:#fff;font:600 14px system-ui;pointer-events:none;background:rgba(0,0,0,.5);padding:6px 10px;border-radius:10px">Parmakla boya · Geri tuşu: çık</div>
      <button id="tclr" style="position:absolute;right:12px;top:10px;color:#fff;background:#333;border-radius:10px;padding:8px 14px;font:600 14px system-ui">Temizle</button>`);
    const c=$('#tc'), dpr=devicePixelRatio||1; c.width=innerWidth*dpr; c.height=innerHeight*dpr; const g=c.getContext('2d'); g.scale(dpr,dpr);
    const last={}, cols=['#4FD1A5','#6AA8FF','#F5B94A','#F26D6D','#C39BFF','#FF8FB1','#fff','#0ff','#ff0','#f0f']; let maxT=0;
    const draw=e=>{ e.preventDefault(); maxT=Math.max(maxT,e.touches.length); $('#ti').textContent=`Aynı anda ${e.touches.length} parmak · en fazla ${maxT}`;
      for(const t of e.changedTouches){ const p=last[t.identifier]; g.strokeStyle=cols[t.identifier%10]; g.lineWidth=10; g.lineCap='round'; g.beginPath(); g.moveTo(p?p[0]:t.clientX,p?p[1]:t.clientY); g.lineTo(t.clientX,t.clientY); g.stroke(); last[t.identifier]=[t.clientX,t.clientY]; } };
    c.addEventListener('touchstart',draw,{passive:false}); c.addEventListener('touchmove',draw,{passive:false});
    c.addEventListener('touchend',e=>{ for(const t of e.changedTouches) delete last[t.identifier]; });
    $('#tclr').addEventListener('click',()=>g.clearRect(0,0,c.width,c.height));
  }});

let AC=null;
function tone(freq,pan,dur){ AC=AC||new (window.AudioContext||window.webkitAudioContext)(); const o=AC.createOscillator(), gn=AC.createGain(), p=AC.createStereoPanner?AC.createStereoPanner():null;
  o.frequency.value=freq; gn.gain.setValueAtTime(0.0001,AC.currentTime); gn.gain.exponentialRampToValueAtTime(0.4,AC.currentTime+0.05); gn.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+dur);
  if(p){ p.pan.value=pan; o.connect(gn).connect(p).connect(AC.destination);} else o.connect(gn).connect(AC.destination); o.start(); o.stop(AC.currentTime+dur+0.05); return o; }
T('speaker','test','🔈','Hoparlör testi','Sol, sağ, frekans taraması',{
  view(){ V(`<div class="note info">${ic('info')}<div class="small">Medya sesini aç. Kulaklıkla sol/sağ kanalı da test edebilirsin. Telefon hoparlöründe "sol/sağ" ancak stereo hoparlörlü modellerde ayrılır.</div></div>
    <div class="btns" style="margin-bottom:10px"><button class="btn" onclick="tone(440,-1,1)">◀ Sol</button><button class="btn" onclick="tone(440,1,1)">Sağ ▶</button></div>
    <div class="btns" style="margin-bottom:10px"><button class="btn" onclick="tone(440,0,1)">İkisi (440 Hz)</button><button class="btn" onclick="tone(100,0,1.2)">Bas (100 Hz)</button></div>
    <button class="btn pri" onclick="TOOL.sweep()">Frekans taraması (50 Hz → 15 kHz)</button><p class="muted small" id="swV" style="text-align:center;margin-top:10px">Cızırtı veya kesilme varsa hoparlörde sorun olabilir.</p>`); },
  sweep(){ AC=AC||new AudioContext(); const o=AC.createOscillator(), g=AC.createGain(); g.gain.value=0.3; o.connect(g).connect(AC.destination);
    const t=AC.currentTime; o.frequency.setValueAtTime(50,t); o.frequency.exponentialRampToValueAtTime(15000,t+8); o.start(); o.stop(t+8); TS.osc=o;
    const st=Date.now(); clearInterval(TS.iv); TS.iv=setInterval(()=>{ const k=(Date.now()-st)/8000; if(k>=1){ clearInterval(TS.iv); $('#swV').textContent='Bitti'; return; } const e=$('#swV'); if(e) e.textContent=Math.round(50*Math.pow(300,k)).toLocaleString('tr-TR')+' Hz'; },100); },
  stop(){ clearInterval(TS.iv); try{ TS.osc&&TS.osc.stop(); }catch(e){} }});

T('vibe','test','📳','Titreşim testi','Titreşim motorunu dene',{
  view(){ V(`<div class="list">${[['Kısa','[80]'],['Uzun (1 sn)','[1000]'],['Çift','[120,120,120]'],['Kalp atışı','[60,120,140,600,60,120,140]'],['Uyarı','[300,150,300,150,300]']].map(([t,p])=>`<button class="item" onclick="sync('vibrate',{p:${p}})"><div class="grow" style="font-weight:700">${t}</div>${ic('chev')}</button>`).join('')}</div>
    <p class="muted tiny" style="margin:0 4px">Hiç titreşmiyorsa: Ayarlar → Ses ve titreşim → titreşim kapalı olabilir veya motor arızalıdır.</p>`); }});

T('mic','test','🎙️','Mikrofon testi','5 sn kaydet, geri dinlet',{
  view(){ const p=needPerm('android.permission.RECORD_AUDIO','Mikrofonu test etmek için 5 saniyelik kayıt yapılır ve hemen çalınır. Hiçbir yere kaydedilmez.');
    if(p){ V(p); return; }
    V(`<div class="card" style="text-align:center"><div style="font-size:60px" id="mcI">🎙️</div><p id="mcS" class="muted" style="margin:10px 0 16px">Butona bas, 5 saniye konuş. Sonra kayıt otomatik çalınır.</p>
      <button class="btn pri" id="mcB" onclick="if(sync('micTest')){this.disabled=true}else toast('Başlatılamadı')">Kaydı başlat</button></div>
      <p class="muted tiny" style="margin:0 4px">Ses boğuk veya cızırtılıysa mikrofon deliği tıkalı olabilir (alt kenardaki küçük delik).</p>`); },
  onPerm(){ vTool(true); },
  onMic(st){ const s=$('#mcS'), i=$('#mcI'), b=$('#mcB'); if(!s) return;
    if(st==='rec'){ i.textContent='🔴'; s.textContent='Kaydediliyor… konuş (5 sn)'; }
    if(st==='play'){ i.textContent='🔊'; s.textContent='Kayıt çalınıyor…'; }
    if(st==='done'||st==='error'){ i.textContent=st==='done'?'✅':'⚠️'; s.textContent=st==='done'?'Bitti. Sesini net duyduysan mikrofon sağlam.':'Mikrofon açılamadı (başka uygulama kullanıyor olabilir).'; b.disabled=false; b.textContent='Tekrar dene'; } }});

T('charge','test','⚡','Şarj hızı testi','Kablo ve adaptörü ölç',{
  view(){
    V(`<div class="card"><div id="chV">${big('—','W')}</div><div class="row small" style="justify-content:space-around;margin-top:8px"><span class="muted">Akım <b id="chA">—</b></span><span class="muted">Voltaj <b id="chU">—</b></span><span class="muted">Pil <b id="chL">—</b></span></div></div>
      <div class="note info">${ic('info')}<div class="small"><b>Nasıl kullanılır?</b> Şarj aletini tak, ekranı açık tut ve 30 sn bekle. Farklı kablo ve adaptörleri aynı pil seviyesinde karşılaştır: daha yüksek watt = daha hızlı şarj. Pil %80'in üstündeyken telefon şarjı kendisi yavaşlatır.</div></div>
      <p class="muted tiny" style="margin:0 4px">Değerler telefonun bildirdiği pil akımıdır (ekranın harcadığı düşülmüş haliyle); adaptörün tam gücü değildir.</p>`);
    TS.hist=[]; TS.iv=setInterval(()=>TOOL.tick(),1000); TOOL.tick();
  },
  tick(){ const b=sync('battery')||{}; const e=$('#chV'); if(!e) return;
    const I=Math.abs(b.currentMa||0), U=(b.voltage||0)/1000, W=I*U/1000;
    if(b.charging){ TS.hist.push(W); if(TS.hist.length>15) TS.hist.shift(); }
    const avg=TS.hist.length?TS.hist.reduce((a,c)=>a+c,0)/TS.hist.length:0;
    e.innerHTML=big(b.charging?num(avg,1):'0',' W',b.charging?`${esc(b.plug||'Şarj oluyor')}${b.fullInMin?` · ~${b.fullInMin} dk'da dolar`:''}`:'<b style="color:var(--warn)">Şarj aleti takılı değil</b>');
    $('#chA').textContent=b.currentMa!==undefined?I+' mA':'okunamadı'; $('#chU').textContent=U?num(U,2)+' V':'—'; $('#chL').textContent='%'+(b.level??'?'); },
  stop(){ clearInterval(TS.iv); }, pause(){ clearInterval(TS.iv); }});

T('sensorlist','test','🛰️','Sensör listesi','Telefondaki tüm sensörler',{
  view(){ const d=sync('device')||{}; const L=d.sensors||[]; const s=sync('sensors')||{};
    V(`<div class="card">${[['Pusula',s.orient],['Işık sensörü',s.light],['Manyetik sensör',s.mag],['İvmeölçer',s.level],['Flaş (fener)',s.flash],['Titreşim motoru',s.vibrator]].map(([t,ok])=>`<div class="kv"><span>${t}</span><span style="color:${ok?'var(--ac)':'var(--bad)'}">${ok?'Var':'Yok'}</span></div>`).join('')}</div>
      <h3>Tüm sensörler (${L.length})</h3><div class="list">${L.map(x=>`<div class="item" style="min-height:44px"><div class="grow small">${esc(x)}</div></div>`).join('')}</div>`); }});

// =====================================================================
//  GÜNLÜK
// =====================================================================
T('notes','gunluk','📝','Notlar','Hızlı not defteri',{
  view(){
    const N=LS.get('notes',[]); const q=trl((TS.q||'').trim());
    if(TS.edit!==undefined){
      const n=TS.edit>=0?N[TS.edit]:{t:'',b:''};
      V(`<input type="text" id="nT" placeholder="Başlık" value="${esc(n.t)}" style="margin-bottom:10px;font-weight:700">
        <textarea id="nB" placeholder="Notunu yaz…" style="width:100%;min-height:52vh;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;font-size:16.5px;padding:14px;resize:vertical">${esc(n.b)}</textarea>
        <div class="btns" style="margin-top:12px"><button class="btn pri" onclick="TOOL.save()">Kaydet</button>${TS.edit>=0?`<button class="btn sm ghost" style="flex:0 0 auto" onclick="sync('copy',{text:$('#nB').value});toast('Kopyalandı')">Kopyala</button><button class="btn sm red" style="flex:0 0 auto" onclick="TOOL.del()">Sil</button>`:''}</div>`);
      return;
    }
    const L=N.map((n,i)=>[n,i]).filter(([n])=>!q||trl(n.t+' '+n.b).includes(q)).sort((a,b)=>(b[0].pin?1:0)-(a[0].pin?1:0)||b[0].at-a[0].at);
    V(`<div class="search">${ic('search')}<input type="text" placeholder="Notlarda ara" value="${esc(TS.q||'')}" oninput="TS.q=this.value;clearTimeout(TS.t);TS.t=setTimeout(()=>{vTool(true);const e=document.querySelector('.search input');e.focus();e.setSelectionRange(99,99)},300)"></div>
      <button class="btn pri" style="margin-bottom:12px" onclick="TS.edit=-1;vTool(true)">${ic('plus')} Yeni not</button>
      ${L.length?`<div class="list">${L.map(([n,i])=>`<div class="item"><button class="grow" style="text-align:left;min-width:0" onclick="TS.edit=${i};vTool(true)"><div class="ellip" style="font-weight:700">${n.pin?'📌 ':''}${esc(n.t||n.b.split('\n')[0]||'Adsız not')}</div><div class="muted tiny ellip">${esc(n.b.replace(/\n/g,' ').slice(0,90))}</div><div class="muted tiny">${new Date(n.at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div></button>
        <button class="btn sm ghost" style="width:46px;padding:0" onclick="TOOL.pin(${i})">${n.pin?'📌':'📍'}</button></div>`).join('')}</div>`:`<div class="card empty">${N.length?'Eşleşen not yok.':'Henüz not yok. İlk notunu ekle.'}</div>`}
      ${N.length?`<button class="btn ghost" onclick="TOOL.exp()">Tüm notları dosyaya kaydet (yedek)</button>`:''}
      <p class="muted tiny" style="margin:10px 4px">Notlar sadece bu telefonda, uygulamanın içinde saklanır. Uygulamayı silersen gider: ara sıra yedek al.</p>`);
  },
  save(){ const N=LS.get('notes',[]); const n={t:$('#nT').value.trim(),b:$('#nB').value,at:Date.now()}; if(!n.t&&!n.b.trim()){ toast('Not boş'); return; }
    if(TS.edit>=0){ n.pin=N[TS.edit].pin; N[TS.edit]=n; } else N.push(n); LS.set('notes',N); delete TS.edit; toast('Kaydedildi'); vTool(true); },
  del(){ const N=LS.get('notes',[]); N.splice(TS.edit,1); LS.set('notes',N); delete TS.edit; toast('Not silindi'); vTool(true); },
  pin(i){ const N=LS.get('notes',[]); N[i].pin=!N[i].pin; LS.set('notes',N); vTool(true); },
  exp(){ const N=LS.get('notes',[]); const txt=N.map(n=>`# ${n.t||'Adsız'}\n${new Date(n.at).toLocaleString('tr-TR')}\n\n${n.b}\n`).join('\n----------\n\n');
    const r=sync('saveText',{name:'notlar-'+new Date().toISOString().slice(0,10)+'.txt',text:txt}); toast(r&&!r.error?'Kaydedildi: '+r:'Kaydedilemedi'); },
  back(){ if(TS.edit!==undefined){ delete TS.edit; vTool(true); return true; } return false; }});

T('todo','gunluk','✅','Yapılacaklar','Basit görev listesi',{
  view(){ const L=LS.get('todo',[]); const open=L.filter(x=>!x.d).length;
    V(`<div class="row" style="gap:8px;margin-bottom:12px"><input type="text" id="tdI" placeholder="Yeni görev…" onkeydown="if(event.key==='Enter')TOOL.add()"><button class="btn pri sm" style="flex:0 0 auto;min-height:54px" onclick="TOOL.add()">${ic('plus')}</button></div>
      <p class="muted small" style="margin:0 4px 10px">${open} görev açık${L.length-open?` · ${L.length-open} bitti`:''}</p>
      ${L.length?`<div class="list">${L.map((x,i)=>`<div class="item ${x.d?'sel':''}"><div class="chk" onclick="TOOL.tog(${i})">${ic('check')}</div><div class="grow" style="${x.d?'text-decoration:line-through;color:var(--tx3)':''}">${esc(x.t)}</div><button class="muted" style="padding:8px" onclick="TOOL.del(${i})">${ic('x')}</button></div>`).join('')}</div>`:'<div class="card empty">Liste boş.</div>'}
      ${L.length-open?`<button class="btn ghost" onclick="TOOL.clr()">Bitenleri temizle</button>`:''}`); },
  add(){ const v=$('#tdI').value.trim(); if(!v) return; const L=LS.get('todo',[]); L.unshift({t:v,d:false}); LS.set('todo',L); vTool(true); setTimeout(()=>$('#tdI').focus(),50); },
  tog(i){ const L=LS.get('todo',[]); L[i].d=!L[i].d; L.sort((a,b)=>a.d-b.d); LS.set('todo',L); vTool(true); },
  del(i){ const L=LS.get('todo',[]); L.splice(i,1); LS.set('todo',L); vTool(true); },
  clr(){ LS.set('todo',LS.get('todo',[]).filter(x=>!x.d)); vTool(true); }});

const fmtT=ms=>{ const h=Math.floor(ms/3600000), m=Math.floor(ms/60000)%60, s=Math.floor(ms/1000)%60, c=Math.floor(ms/10)%100; return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+`<span style="font-size:.5em;color:var(--tx2)">,${String(c).padStart(2,'0')}</span>`; };
T('stopwatch','gunluk','⏱️','Kronometre','Tur zamanlı',{
  view(){ const S=TS; S.acc=S.acc||0; S.laps=S.laps||[];
    V(`<div class="card">${`<div id="swD" style="text-align:center;font-size:68px;font-weight:800;font-variant-numeric:tabular-nums;padding:16px 0">${fmtT(S.acc+(S.st?Date.now()-S.st:0))}</div>`}
      <div class="btns"><button class="btn ${S.st?'red':'pri'}" onclick="TOOL.tg()">${S.st?'Durdur':'Başlat'}</button><button class="btn" onclick="TOOL.lap()">${S.st?'Tur':'Sıfırla'}</button></div></div>
      ${S.laps.length?`<div class="list">${S.laps.map((l,i)=>`<div class="kv" style="padding:12px 16px"><span>Tur ${S.laps.length-i}</span><span style="font-variant-numeric:tabular-nums">${fmtT(l)}</span></div>`).join('')}</div>`:''}`);
    clearInterval(S.iv); if(S.st) S.iv=setInterval(()=>{ const e=$('#swD'); if(e) e.innerHTML=fmtT(S.acc+Date.now()-S.st); },33); },
  tg(){ if(TS.st){ TS.acc+=Date.now()-TS.st; TS.st=0; } else TS.st=Date.now(); vTool(true); },
  lap(){ if(TS.st){ const now=TS.acc+Date.now()-TS.st; TS.laps.unshift(now-(TS.lastLap||0)); TS.lastLap=now; } else { TS.acc=0; TS.laps=[]; TS.lastLap=0; } vTool(true); },
  stop(){ clearInterval(TS.iv); }});

function beep(){ for(let i=0;i<3;i++) setTimeout(()=>tone(880,0,0.35),i*500); sync('vibrate',{p:[400,200,400,200,400]}); }
T('timer','gunluk','⏲️','Geri sayım ve Pomodoro','Zamanlayıcı, odaklanma',{
  view(){ const S=TS;
    const left=S.end?Math.max(0,S.end-Date.now()):(S.dur||0);
    V(`<div class="card" style="text-align:center">${S.pomo?`<span class="badge ${S.pomo==='work'?'warn':'ok'}">${S.pomo==='work'?'🍅 Odaklan':'☕ Mola'} · ${S.round||1}. tur</span>`:''}
      <div id="tmD" style="font-size:72px;font-weight:800;font-variant-numeric:tabular-nums;padding:10px 0">${fmtT(left).replace(/<span.*span>/,'')}</div>
      <div class="btns">${S.end?`<button class="btn red" onclick="TOOL.cancel()">Durdur</button>`:S.dur?`<button class="btn pri" onclick="TOOL.start(TS.dur)">Başlat</button>`:''}</div></div>
      ${S.end?'':`<h3>Hazır süreler</h3><div class="seg">${[1,3,5,10,15,20,30,45,60].map(m=>`<button onclick="TS.pomo=null;TOOL.start(${m*60000})">${m} dk</button>`).join('')}</div>
      <h3>Özel süre</h3><div class="row" style="gap:8px"><input type="text" inputmode="numeric" id="tmM" placeholder="dakika"><input type="text" inputmode="numeric" id="tmS" placeholder="saniye"><button class="btn pri sm" style="flex:0 0 auto;min-height:54px" onclick="TOOL.start((pf($('#tmM').value)||0)*60000+(pf($('#tmS').value)||0)*1000)">Başlat</button></div>
      <h3>Pomodoro</h3><div class="card"><p class="small muted" style="margin-bottom:12px">25 dk odaklan, 5 dk mola; 4 turda bir 15 dk uzun mola. Ders çalışmak için birebir.</p><button class="btn" onclick="TS.pomo='work';TS.round=1;TOOL.start(25*60000)">🍅 Pomodoro başlat</button></div>`}
      <p class="muted tiny" style="margin:10px 4px">Süre bitince ses ve titreşimle uyarır. Uygulama açık kalmalı (ekran kapanırsa telefon uyarıyı geciktirebilir).</p>`);
    clearInterval(S.iv); if(S.end) S.iv=setInterval(()=>TOOL.tick(),250); },
  start(ms){ if(!ms){ toast('Süre gir'); return; } TS.dur=ms; TS.end=Date.now()+ms; vTool(true); },
  cancel(){ TS.end=0; TS.pomo=null; vTool(true); },
  tick(){ const left=TS.end-Date.now(); const e=$('#tmD'); if(e) e.innerHTML=fmtT(Math.max(0,left)).replace(/<span.*span>/,'');
    if(left<=0){ TS.end=0; beep();
      if(TS.pomo==='work'){ const longB=(TS.round||1)%4===0; TS.pomo='break'; toast(longB?'Uzun mola: 15 dk':'Mola: 5 dk'); TOOL.start((longB?15:5)*60000); return; }
      if(TS.pomo==='break'){ TS.round=(TS.round||1)+1; TS.pomo='work'; toast('Odaklanma zamanı'); TOOL.start(25*60000); return; }
      toast('Süre doldu!'); vTool(true); } },
  stop(){ clearInterval(TS.iv); }});

T('torch','gunluk','🔦','Fener','Aç/kapat, SOS, çakar',{need:()=>(sync('sensors')||{}).flash!==false,
  view(){ const on=TS.on;
    V(`<button onclick="TOOL.set(!TS.on)" style="display:block;width:220px;height:220px;margin:20px auto;border-radius:50%;background:${on?'radial-gradient(circle,#fff6c9,#F5B94A)':'var(--card)'};box-shadow:${on?'0 0 60px #F5B94A':'none'};font-size:80px">${on?'💡':'🔦'}</button>
      <p style="text-align:center;font-weight:700;margin-bottom:16px">${on?'Açık':'Kapalı'}${TS.mode?' · '+TS.mode:''}</p>
      <div class="btns" style="margin-bottom:12px"><button class="btn ${TS.mode==='SOS'?'pri':''}" onclick="TOOL.sos()">SOS</button><button class="btn ${TS.mode==='Çakar'?'pri':''}" onclick="TOOL.strobe()">Çakar</button></div>
      <div class="card"><div class="row" style="justify-content:space-between"><b class="small">Çakar hızı</b><span class="muted small">${TS.spd||5} / sn</span></div><input type="range" min="1" max="12" value="${TS.spd||5}" onchange="TS.spd=+this.value;if(TS.mode==='Çakar')TOOL.strobe(true);else vTool(true)"></div>
      <p class="muted tiny" style="margin:4px">SOS: ··· −−− ··· (uluslararası yardım işareti). Çakar hızlı yanıp söner; ışığa duyarlı kişilerin yanında kullanma.</p>`); },
  raw(on){ sync('torch',{on}); },
  set(on){ TOOL.halt(); TS.on=on; TOOL.raw(on); vTool(true); },
  halt(){ clearTimeout(TS.tm); clearInterval(TS.iv); TS.mode=null; },
  sos(){ TOOL.halt(); TS.mode='SOS'; TS.on=true; const u=220, seq=[1,1,1,1,1,3,3,1,3,1,3,3,1,1,1,1,1,7]; // açık/kapalı süreleri (birim)
    const pat=[u,u,u,u,u,u*3,u*3,u,u*3,u,u*3,u*3,u,u,u,u,u,u*7]; let i=0;
    const step=()=>{ if(TS.mode!=='SOS') return; TOOL.raw(i%2===0); TS.tm=setTimeout(step,pat[i]); i=(i+1)%pat.length; }; step(); vTool(true); },
  strobe(keep){ if(!keep||TS.mode!=='Çakar'){ TOOL.halt(); } clearInterval(TS.iv); TS.mode='Çakar'; TS.on=true; let s=false; TS.iv=setInterval(()=>{ s=!s; TOOL.raw(s); },500/(TS.spd||5)); vTool(true); },
  stop(){ TOOL.halt(); TOOL.raw(false); }, pause(){ TOOL.halt(); TOOL.raw(false); TS.on=false; }});

T('qrscan','gunluk','📷','QR okuyucu','Link, Wi-Fi, metin',{
  view(){
    const p=needPerm('android.permission.CAMERA','QR kodu okumak için kamera gerekli. Görüntü kaydedilmez, telefondan çıkmaz.');
    if(p){ V(p); return; }
    if(TS.res){ V(TOOL.result(TS.res)); return; }
    V(`<div style="position:relative;border-radius:22px;overflow:hidden;background:#000;aspect-ratio:3/4"><video id="qv" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
      <div style="position:absolute;inset:18%;border:3px solid var(--ac);border-radius:22px;box-shadow:0 0 0 2000px rgba(0,0,0,.35)"></div></div>
      <p class="muted small" style="text-align:center;margin-top:12px" id="qs">Kamera açılıyor…</p>`);
    TOOL.cam();
  },
  async cam(){
    try{
      TS.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}});
      const v=$('#qv'); if(!v){ TOOL.stop(); return; } v.srcObject=TS.stream; await v.play(); $('#qs').textContent='QR kodu çerçevenin içine getir';
      const c=document.createElement('canvas'), g=c.getContext('2d',{willReadFrequently:true});
      const loop=()=>{ if(!TS.stream) return; const v2=$('#qv'); if(!v2) return;
        if(v2.videoWidth){ const w=480, h=Math.round(480*v2.videoHeight/v2.videoWidth); c.width=w; c.height=h; g.drawImage(v2,0,0,w,h);
          const r=jsQR(g.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});
          if(r&&r.data){ sync('vibrate',{p:[60]}); TS.res=r.data; TOOL.stop(); vTool(true); return; } }
        TS.raf=requestAnimationFrame(loop); };
      loop();
    }catch(e){ const s=$('#qs'); if(s) s.textContent='Kamera açılamadı: '+e.message; }
  },
  result(d){
    let body=`<div class="card"><b>Okunan içerik</b><p style="margin:8px 0 14px;word-break:break-word;font-size:17px">${esc(d)}</p>`;
    const wifi=/^WIFI:/i.test(d)? Object.fromEntries((d.slice(5).match(/([STPH]):((?:\\.|[^;])*)/g)||[]).map(x=>[x[0],x.slice(2).replace(/\\(.)/g,'$1')])) : null;
    if(wifi) body+=`<div class="kv"><span>Ağ adı</span><span>${esc(wifi.S||'')}</span></div><div class="kv"><span>Şifre</span><span>${esc(wifi.P||'(yok)')}</span></div><div class="kv"><span>Güvenlik</span><span>${esc(wifi.T||'')}</span></div>
      <div class="btns" style="margin-top:12px"><button class="btn pri" onclick="sync('copy',{text:${esc(JSON.stringify(wifi.P||''))}});toast('Şifre kopyalandı')">Şifreyi kopyala</button><button class="btn" onclick="sync('panel',{which:'wifi'})">Wi-Fi paneli</button></div>
      <p class="muted tiny" style="margin-top:8px">Android uygulamaların Wi-Fi'ye kendiliğinden bağlanmasına izin vermiyor: şifreyi kopyala, panelden ağı seçip yapıştır.</p>`;
    else if(/^https?:\/\//i.test(d)) body+=`<div class="btns"><a class="btn pri" href="${esc(d)}" style="text-decoration:none">${ic('ext')} Linki aç</a><button class="btn" onclick="sync('copy',{text:${esc(JSON.stringify(d))}});toast('Kopyalandı')">Kopyala</button></div>
      <p class="muted tiny" style="margin-top:8px">Linke girmeden önce adresi kontrol et: QR kodlarla dolandırıcılık yaygın.</p>`;
    else if(/^tel:/i.test(d)) body+=`<a class="btn pri" href="${esc(d)}" style="text-decoration:none">Ara</a>`;
    else body+=`<button class="btn pri" onclick="sync('copy',{text:${esc(JSON.stringify(d))}});toast('Kopyalandı')">Kopyala</button>`;
    return body+`</div><button class="btn ghost" onclick="TS.res=null;vTool(true)">Yeni kod oku</button>`;
  },
  stop(){ cancelAnimationFrame(TS.raf); if(TS.stream){ TS.stream.getTracks().forEach(t=>t.stop()); TS.stream=null; } },
  pause(){ TOOL.stop(); }, onPerm(){ vTool(true); }});

T('qrgen','gunluk','🔳','QR oluşturucu','Wi-Fi şifresi, link, metin',{
  view(){ const m=TS.m||'wifi';
    V(`<div class="seg" style="margin-bottom:12px"><button class="${m==='wifi'?'on':''}" onclick="TS.m='wifi';vTool(true)">Wi-Fi paylaş</button><button class="${m==='text'?'on':''}" onclick="TS.m='text';vTool(true)">Link / metin</button></div>
      <div class="card">${m==='wifi'?`<label class="small muted">Ağ adı (SSID)</label><input type="text" id="qS" style="margin:6px 0 10px" oninput="TOOL.make()" value="${esc(LS.get('qrS',''))}"><label class="small muted">Şifre</label><input type="text" id="qP" style="margin-top:6px" oninput="TOOL.make()" value="${esc(LS.get('qrP',''))}">`
        :`<label class="small muted">Link veya metin</label><textarea id="qT" oninput="TOOL.make()" style="width:100%;min-height:90px;margin-top:6px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:12px"></textarea>`}</div>
      <div id="qOut" style="background:#fff;border-radius:22px;padding:18px;display:flex;justify-content:center;min-height:120px;align-items:center;color:#555"></div>
      <p class="muted small" style="margin:12px 4px">${m==='wifi'?'Misafirin telefon kamerasıyla bu kodu okutunca şifre yazmadan Wi-Fi\'ye bağlanır.':'Karşıdaki kişi kamerasıyla okutur.'} Ekran parlaklığını artırırsan daha kolay okunur.</p>`);
    TOOL.make(); },
  make(){ const o=$('#qOut'); if(!o) return; let d='';
    if((TS.m||'wifi')==='wifi'){ const s=$('#qS').value, p=$('#qP').value; LS.set('qrS',s); LS.set('qrP',p); const e=x=>x.replace(/([\\;,:"])/g,'\\$1'); if(s) d=`WIFI:T:${p?'WPA':'nopass'};S:${e(s)};P:${e(p)};;`; }
    else d=$('#qT').value;
    if(!d){ o.innerHTML='Bilgileri gir, kod burada çıkar'; return; }
    try{ qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8']; const q=qrcode(0,'M'); q.addData(d); q.make(); o.innerHTML=q.createSvgTag({cellSize:8,margin:0,scalable:true}); const sv=o.querySelector('svg'); sv.style.width='100%'; sv.style.maxWidth='300px'; sv.style.height='auto'; }
    catch(e){ o.innerHTML='Metin çok uzun'; } }});

// =====================================================================
//  HESAPLAYICILAR
// =====================================================================
const UNITS={
  'Uzunluk':{m:1,km:1000,cm:.01,mm:.001,mil:1609.344,yarda:.9144,fit:.3048,'inç':.0254,'deniz mili':1852},
  'Ağırlık':{kg:1,g:.001,ton:1000,mg:1e-6,libre:.45359237,ons:.0283495,okka:1.2829},
  'Alan':{'m²':1,'km²':1e6,'cm²':1e-4,hektar:1e4,'dönüm':1000,'ft²':.092903,akre:4046.86},
  'Hacim':{L:1,mL:.001,'m³':1000,'galon (ABD)':3.78541,'su bardağı':.2,'çay bardağı':.1,'yemek kaşığı':.015,'çay kaşığı':.005},
  'Hız':{'km/sa':1,'m/sn':3.6,'mil/sa':1.609344,knot:1.852},
  'Veri':{B:1,KB:1024,MB:1048576,GB:1073741824,TB:1099511627776,bit:.125,Mbit:131072},
  'Zaman':{saniye:1,dakika:60,saat:3600,'gün':86400,hafta:604800,ay:2629746,'yıl':31556952},
  'Sıcaklık':{'°C':0,'°F':0,K:0},
};
const tempConv=(v,f,t)=>{ const c=f==='°C'?v:f==='°F'?(v-32)*5/9:v-273.15; return t==='°C'?c:t==='°F'?c*9/5+32:c+273.15; };
T('units','hesap','📏','Birim çevirici','Uzunluk, ağırlık, sıcaklık…',{
  view(){ const c=TS.c||'Uzunluk', U=Object.keys(UNITS[c]); TS.f=U.includes(TS.f)?TS.f:U[0]; TS.t=U.includes(TS.t)?TS.t:U[1];
    V(`<div class="seg" style="margin-bottom:12px">${Object.keys(UNITS).map(k=>`<button class="${k===c?'on':''}" onclick="TS.c='${k}';vTool(true)">${k}</button>`).join('')}</div>
      <div class="card"><input type="text" inputmode="decimal" id="uV" value="${esc(TS.v??'1')}" oninput="TS.v=this.value;TOOL.calc()" style="font-size:24px;font-weight:700">
      <div class="row" style="gap:8px;margin-top:10px"><select id="uF" onchange="TS.f=this.value;TOOL.calc()">${U.map(u=>`<option ${u===TS.f?'selected':''}>${u}</option>`).join('')}</select>
      <button class="btn sm" style="flex:0 0 auto" onclick="[TS.f,TS.t]=[TS.t,TS.f];vTool(true)">⇄</button>
      <select id="uT" onchange="TS.t=this.value;TOOL.calc()">${U.map(u=>`<option ${u===TS.t?'selected':''}>${u}</option>`).join('')}</select></div>
      <div id="uR" style="font-size:30px;font-weight:800;margin-top:14px;word-break:break-all"></div></div><div class="list" id="uAll"></div>`);
    TOOL.calc(); },
  calc(){ const c=TS.c||'Uzunluk', v=pf($('#uV').value), f=TS.f, t=TS.t, U=UNITS[c];
    const conv=(to)=>c==='Sıcaklık'?tempConv(v,f,to):v*U[f]/U[to];
    $('#uR').textContent=isFinite(v)?num(conv(t),6)+' '+t:'—';
    $('#uAll').innerHTML=isFinite(v)?Object.keys(U).filter(u=>u!==f).map(u=>`<div class="kv" style="padding:11px 16px"><span>${u}</span><span>${num(conv(u),6)}</span></div>`).join(''):''; }});

T('percent','hesap','％','Yüzde, KDV, indirim','Günlük yüzde hesapları',{
  view(){ const m=TS.m||'of';
    const M={of:'X\'in %Y\'si',ratio:'X, Y\'nin yüzde kaçı',change:'Değişim yüzdesi',disc:'İndirimli fiyat',kdv:'KDV'};
    let f='';
    if(m==='of') f=field('a','Sayı (X)','','1500')+field('b','Yüzde (Y)','','18');
    if(m==='ratio') f=field('a','Parça (X)','','45')+field('b','Bütün (Y)','','60');
    if(m==='change') f=field('a','Eski değer','','100')+field('b','Yeni değer','','125');
    if(m==='disc') f=field('a','Fiyat (₺)','','1200')+field('b','İndirim %','','25');
    if(m==='kdv') f=field('a','Tutar (₺)','','1000')+`<div class="seg" style="margin-top:12px">${[1,10,20].map(r=>`<button class="${(TS.r||20)===r?'on':''}" onclick="TS.r=${r};vTool(true)">%${r}</button>`).join('')}</div>`;
    V(`<div class="seg" style="margin-bottom:12px">${Object.entries(M).map(([k,t])=>`<button class="${k===m?'on':''}" onclick="TS.m='${k}';vTool(true)">${t}</button>`).join('')}</div><div class="card">${f}${resBox('pR')}</div>`);
    TOOL.calc(); },
  calc(){ const a=val('a'), b=val('b'), m=TS.m||'of'; if(!isFinite(a)||(m!=='kdv'&&!isFinite(b))){ setRes('pR','Değerleri gir.'); return; }
    if(m==='of') setRes('pR',`<b style="font-size:22px">${num(a*b/100)}</b><br><span class="small">Toplam (ekleyince): ${num(a+a*b/100)} · Düşünce: ${num(a-a*b/100)}</span>`);
    if(m==='ratio') setRes('pR',`<b style="font-size:22px">%${num(a/b*100)}</b>`);
    if(m==='change') setRes('pR',`<b style="font-size:22px">${b>=a?'+':''}%${num((b-a)/a*100)}</b> ${b>=a?'artış':'azalış'}<br><span class="small">Fark: ${num(b-a)}</span>`);
    if(m==='disc') setRes('pR',`<b style="font-size:22px">${num(a*(1-b/100))} ₺</b><br><span class="small">Kazancın: ${num(a*b/100)} ₺</span>`);
    if(m==='kdv'){ const r=(TS.r||20)/100; setRes('pR',`<b>KDV dahil:</b> ${num(a*(1+r))} ₺ <span class="small">(KDV ${num(a*r)} ₺)</span><br><b>Tutar zaten KDV dahilse:</b> KDV'siz ${num(a/(1+r))} ₺ <span class="small">(KDV ${num(a-a/(1+r))} ₺)</span>`); } }});

T('loan','hesap','🏦','Kredi taksit','Aylık ödeme ve toplam faiz',{
  view(){ V(`<div class="card">${field('a','Kredi tutarı (₺)','','100000')}${field('r','Aylık faiz oranı (%)','','3,59')}${field('n','Vade (ay)','','24','numeric')}
    <div class="row" style="justify-content:space-between;margin-top:14px" onclick="TS.tax=!TS.tax;vTool(true)"><span class="small">KKDF + BSMV ekle (%15 + %15, ihtiyaç kredisi)</span><div class="sw ${TS.tax?'on':''}"></div></div>${resBox('lR')}</div>
    <p class="muted tiny" style="margin:0 4px">Yaklaşık hesaptır; bankanın dosya masrafı ve sigortası dahil değildir. Konut kredisinde KKDF/BSMV yoktur.</p>`); TOOL.calc(); },
  calc(){ const P=val('a'), n=val('n'); let r=val('r')/100; if(!(P>0&&n>0&&r>=0)){ setRes('lR','Değerleri gir.'); return; } if(TS.tax) r*=1.3;
    const A=r===0?P/n:P*r/(1-Math.pow(1+r,-n)); setRes('lR',`<b style="font-size:22px">Aylık taksit: ${num(A)} ₺</b><br>Toplam geri ödeme: ${num(A*n)} ₺<br>Toplam faiz${TS.tax?' + vergi':''}: <b style="color:var(--warn)">${num(A*n-P)} ₺</b>`); }});

T('split','hesap','🍽️','Hesap bölme','Bahşiş ve kişi başı',{
  view(){ V(`<div class="card">${field('a','Hesap (₺)','','1850')}${field('k','Kişi sayısı','','4','numeric')}<label class="small muted" style="display:block;margin:12px 0 6px">Bahşiş</label>
    <div class="seg">${[0,5,10,15,20].map(p=>`<button class="${(TS.p??10)===p?'on':''}" onclick="TS.p=${p};vTool(true)">%${p}</button>`).join('')}</div>${resBox('sR')}</div>`); TOOL.calc(); },
  calc(){ const a=val('a'), k=val('k')||1, p=TS.p??10; if(!(a>0)){ setRes('sR','Değerleri gir.'); return; } const t=a*(1+p/100);
    setRes('sR',`<b style="font-size:22px">Kişi başı: ${num(t/k)} ₺</b><br>Bahşiş: ${num(a*p/100)} ₺ · Toplam: ${num(t)} ₺<br><span class="small">Yuvarlarsan: kişi başı ${num(Math.ceil(t/k/5)*5,0)} ₺</span>`); }});

T('dates','hesap','📅','Tarih ve yaş','Gün farkı, yaş, tarih ekle',{
  view(){ const today=new Date().toISOString().slice(0,10);
    V(`<div class="card"><b>Yaş hesapla</b><input type="date" id="dB" value="${esc(LS.get('birth',''))}" onchange="LS.set('birth',this.value);TOOL.calc()" style="margin-top:8px;color-scheme:dark;width:100%;min-height:54px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:0 12px">${resBox('dR1')}</div>
      <div class="card"><b>İki tarih arası</b><div class="row" style="gap:8px;margin-top:8px"><input type="date" id="d1" value="${today}" onchange="TOOL.calc()" style="color-scheme:dark;flex:1;min-height:50px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:0 8px"><input type="date" id="d2" onchange="TOOL.calc()" style="color-scheme:dark;flex:1;min-height:50px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:0 8px"></div>${resBox('dR2')}</div>
      <div class="card"><b>Bugüne gün ekle/çıkar</b>${field('dn','Gün sayısı (eksi de olabilir)','','90','numeric')}${resBox('dR3')}</div>`); TOOL.calc(); },
  calc(){ const day=864e5, now=new Date(); now.setHours(0,0,0,0);
    const b=$('#dB').value; if(b){ const B=new Date(b+'T00:00'); let y=now.getFullYear()-B.getFullYear(), m=now.getMonth()-B.getMonth(), d=now.getDate()-B.getDate(); if(d<0){ m--; d+=new Date(now.getFullYear(),now.getMonth(),0).getDate(); } if(m<0){ y--; m+=12; }
      const nb=new Date(now.getFullYear(),B.getMonth(),B.getDate()); if(nb<now) nb.setFullYear(nb.getFullYear()+1); const left=Math.round((nb-now)/day);
      setRes('dR1',`<b style="font-size:20px">${y} yıl ${m} ay ${d} gün</b><br>Toplam ${num(Math.round((now-B)/day),0)} gün yaşadın.<br>${left===0?'🎂 Doğum günün kutlu olsun!':'Doğum gününe '+left+' gün var.'}`); } else setRes('dR1','Doğum tarihini seç.');
    const a=$('#d1').value, c=$('#d2').value; if(a&&c){ const n=Math.round((new Date(c)-new Date(a))/day); setRes('dR2',`<b style="font-size:20px">${num(Math.abs(n),0)} gün</b> ${n<0?'(geçmişte)':''}<br>${num(Math.abs(n)/7,1)} hafta · ~${num(Math.abs(n)/30.44,1)} ay · iş günü ~${num(Math.round(Math.abs(n)*5/7),0)}`); } else setRes('dR2','İkinci tarihi seç.');
    const k=val('dn'); if(isFinite(k)){ const t=new Date(now.getTime()+k*day); setRes('dR3',`<b style="font-size:20px">${t.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b>`); } else setRes('dR3','Gün sayısı gir.'); }});

T('bmi','hesap','⚖️','Vücut kitle indeksi','Boy-kilo oranı',{
  view(){ V(`<div class="card">${field('h','Boy (cm)',LS.get('bh',''),'175')}${field('w','Kilo (kg)',LS.get('bw',''),'72')}${resBox('bR')}</div>
    <p class="muted tiny" style="margin:0 4px">Dünya Sağlık Örgütü sınıflaması. Kas oranını hesaba katmaz; sağlık kararı için doktoruna danış.</p>`); TOOL.calc(); },
  calc(){ const h=val('h')/100, w=val('w'); if(!(h>0&&w>0)){ setRes('bR','Değerleri gir.'); return; } LS.set('bh',$('#h').value); LS.set('bw',$('#w').value);
    const b=w/(h*h); const c=b<18.5?['Zayıf','var(--blue)']:b<25?['Normal','var(--ac)']:b<30?['Fazla kilolu','var(--warn)']:['Obez','var(--bad)'];
    setRes('bR',`<b style="font-size:24px">${num(b,1)}</b> · <b style="color:${c[1]}">${c[0]}</b><br><span class="small">Bu boy için normal aralık: ${num(18.5*h*h,1)} – ${num(24.9*h*h,1)} kg</span>`); }});

// =====================================================================
//  DİĞER
// =====================================================================
const WORDS='elma armut kiraz deniz bulut ayna kalem kitap masa sandalye kapi pencere orman nehir dag tepe yildiz gunes ay toprak ruzgar yagmur kar firtina limon portakal karpuz kavun cilek uzum zeytin peynir ekmek simit cay kahve bardak tabak kasik catal bicak ocak firin buzdolabi saat telefon kamera radyo gitar keman davul piyano kedi kopek kus balik at esek inek koyun keci tavuk horoz kartal sahin baykus aslan kaplan ayi kurt tilki tavsan sincap kirpi kaplumbaga yilan kertenkele kelebek ari karinca orumcek sinek boncuk dugme fermuar cizme ayakkabi gomlek ceket pantolon etek sapka atki eldiven corap canta cuzdan anahtar kilit zincir halat ip igne makas cetvel silgi defter tahta tebesir harita pusula fener cadir kamp ates odun komur tas kum cakil kaya magara vadi ova gol cesme kopru yol sokak cadde meydan pazar carsi han hamam cami kule kale sur bahce cicek gul lale papatya menekse sumbul nergis cinar mese cam kavak sogut ihlamur'.split(' ');
T('password','diger','🔑','Şifre üretici','Güçlü ve rastgele',{
  view(){ const o=TS.o||(TS.o=LS.get('pwo',{n:16,U:1,L:1,D:1,S:1,X:1,mode:'char'}));
    V(`<div class="seg" style="margin-bottom:12px"><button class="${o.mode==='char'?'on':''}" onclick="TS.o.mode='char';vTool(true)">Karakter</button><button class="${o.mode==='word'?'on':''}" onclick="TS.o.mode='word';vTool(true)">Kelime (akılda kalır)</button></div>
      <div class="card"><div id="pwV" style="font:700 22px ui-monospace,monospace;word-break:break-all;text-align:center;padding:14px 4px;min-height:70px"></div><div class="bar"><i id="pwB"></i></div><p class="muted small" id="pwS" style="text-align:center;margin:8px 0 14px"></p>
      <div class="btns"><button class="btn pri" onclick="sync('copy',{text:$('#pwV').textContent});toast('Kopyalandı')">Kopyala</button><button class="btn" onclick="TOOL.gen()">Yenile</button></div></div>
      <div class="card"><div class="row" style="justify-content:space-between"><b class="small">${o.mode==='word'?'Kelime sayısı':'Uzunluk'}</b><b id="pwN">${o.mode==='word'?(o.w||4):o.n}</b></div>
      <input type="range" min="${o.mode==='word'?3:8}" max="${o.mode==='word'?8:40}" value="${o.mode==='word'?(o.w||4):o.n}" oninput="TS.o[TS.o.mode==='word'?'w':'n']=+this.value;$('#pwN').textContent=this.value;TOOL.gen()">
      ${o.mode==='char'?[['U','Büyük harf (A-Z)'],['L','Küçük harf (a-z)'],['D','Rakam (0-9)'],['S','Sembol (!@#…)'],['X','Karışan karakterleri çıkar (0/O, 1/l)']].map(([k,t])=>`<div class="row" style="justify-content:space-between;padding:8px 0" onclick="TS.o.${k}=TS.o.${k}?0:1;vTool(true)"><span class="small">${t}</span><div class="sw ${o[k]?'on':''}"></div></div>`).join(''):''}</div>
      <p class="muted tiny" style="margin:0 4px">Şifreler telefonun güvenli rastgele sayı üreteciyle üretilir ve hiçbir yere kaydedilmez.</p>`);
    TOOL.gen(); },
  gen(){ const o=TS.o; LS.set('pwo',o); const R=n=>{ const a=new Uint32Array(1); const lim=Math.floor(4294967296/n)*n; do crypto.getRandomValues(a); while(a[0]>=lim); return a[0]%n; };
    let pw='', bits=0;
    if(o.mode==='word'){ const w=o.w||4; const L=[]; for(let i=0;i<w;i++) L.push(WORDS[R(WORDS.length)]); pw=L.join('-')+'-'+R(100); bits=w*Math.log2(WORDS.length)+Math.log2(100); }
    else { let set=(o.U?'ABCDEFGHJKLMNPQRSTUVWXYZ'+(o.X?'':'IO'):'')+(o.L?'abcdefghijkmnopqrstuvwxyz'+(o.X?'':'l'):'')+(o.D?'23456789'+(o.X?'':'01'):'')+(o.S?'!@#$%&*?-_=+':''); if(!set){ o.L=1; set='abcdefghijkmnopqrstuvwxyz'; }
      for(let i=0;i<o.n;i++) pw+=set[R(set.length)]; bits=o.n*Math.log2(set.length); }
    if(!$('#pwV')) return;
    $('#pwV').textContent=pw;
    const s=bits<40?['Zayıf','var(--bad)']:bits<60?['Orta','var(--warn)']:bits<80?['Güçlü','var(--ac)']:['Çok güçlü','var(--ac)'];
    $('#pwB').style.width=Math.min(100,bits)+'%'; $('#pwB').style.background=s[1]; $('#pwS').innerHTML=`<b style="color:${s[1]}">${s[0]}</b> · ${Math.round(bits)} bit`; }});

T('random','diger','🎲','Zar, yazı-tura, kura','Rastgele karar ver',{
  view(){ const m=TS.m||'coin';
    const tabs=[['coin','Yazı-tura'],['dice','Zar'],['num','Sayı'],['draw','Kura / takım']];
    let b='';
    if(m==='coin') b=`<div id="rO" style="font-size:90px;text-align:center;padding:20px">🪙</div><button class="btn pri" onclick="TOOL.coin()">At</button>`;
    if(m==='dice') b=`<div class="seg" style="margin-bottom:12px">${[1,2,3,4,5].map(n=>`<button class="${(TS.n||2)===n?'on':''}" onclick="TS.n=${n};vTool(true)">${n} zar</button>`).join('')}</div><div id="rO" style="font-size:64px;text-align:center;padding:16px;letter-spacing:6px">🎲</div><button class="btn pri" onclick="TOOL.dice()">At</button>`;
    if(m==='num') b=`<div class="row" style="gap:8px"><input type="text" inputmode="numeric" id="rA" value="1"><input type="text" inputmode="numeric" id="rB" value="100"></div><div id="rO" style="font-size:64px;font-weight:800;text-align:center;padding:16px">?</div><button class="btn pri" onclick="TOOL.num()">Seç</button>`;
    if(m==='draw') b=`<label class="small muted">Her satıra bir isim</label><textarea id="rL" style="width:100%;min-height:130px;margin:6px 0 10px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:12px">${esc(LS.get('names',''))}</textarea>
      <div class="row" style="gap:8px;margin-bottom:10px"><span class="small">Takım sayısı</span><input type="text" inputmode="numeric" id="rT" value="2" style="max-width:90px"></div>
      <div class="btns"><button class="btn pri" onclick="TOOL.draw(1)">Bir kişi seç</button><button class="btn" onclick="TOOL.draw(0)">Takımlara ayır</button></div><div id="rO" style="margin-top:14px"></div>`;
    V(`<div class="seg" style="margin-bottom:12px">${tabs.map(([k,t])=>`<button class="${k===m?'on':''}" onclick="TS.m='${k}';vTool(true)">${t}</button>`).join('')}</div><div class="card">${b}</div>`); },
  R(n){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; },
  anim(fn,end){ let i=0; const iv=setInterval(()=>{ fn(); if(++i>8){ clearInterval(iv); end(); sync('vibrate',{p:[40]}); } },70); },
  coin(){ const o=$('#rO'); TOOL.anim(()=>o.textContent=TOOL.R(2)?'🪙':'⚪',()=>{ const r=TOOL.R(2); o.innerHTML=`<div style="font-size:90px">${r?'👑':'🔢'}</div><b style="font-size:30px">${r?'Tura':'Yazı'}</b>`; }); },
  dice(){ const F='⚀⚁⚂⚃⚄⚅', n=TS.n||2, o=$('#rO'); TOOL.anim(()=>o.textContent=Array.from({length:n},()=>F[TOOL.R(6)]).join(''),()=>{ const v=Array.from({length:n},()=>TOOL.R(6)); o.innerHTML=`<div style="font-size:70px">${v.map(x=>F[x]).join('')}</div><b style="font-size:22px">Toplam: ${v.reduce((a,b)=>a+b+1,0)}</b>`; }); },
  num(){ let a=Math.round(pf($('#rA').value)), b=Math.round(pf($('#rB').value)); if(!isFinite(a)||!isFinite(b)){ toast('Aralık gir'); return; } if(a>b) [a,b]=[b,a]; const o=$('#rO'); TOOL.anim(()=>o.textContent=a+TOOL.R(b-a+1),()=>o.textContent=a+TOOL.R(b-a+1)); },
  draw(one){ const raw=$('#rL').value; LS.set('names',raw); const L=raw.split('\n').map(x=>x.trim()).filter(Boolean); if(L.length<2){ toast('En az 2 isim gir'); return; }
    for(let i=L.length-1;i>0;i--){ const j=TOOL.R(i+1); [L[i],L[j]]=[L[j],L[i]]; }
    if(one){ $('#rO').innerHTML=`<div class="note ok" style="font-size:20px">${ic('check')}<div><b>${esc(L[0])}</b></div></div>`; return; }
    const k=Math.max(2,Math.min(L.length,Math.round(pf($('#rT').value))||2)); const G=Array.from({length:k},()=>[]); L.forEach((x,i)=>G[i%k].push(x));
    $('#rO').innerHTML=G.map((g,i)=>`<div class="card" style="background:var(--card2)"><b>${i+1}. takım</b><div class="small" style="margin-top:4px">${g.map(esc).join(', ')}</div></div>`).join(''); }});

T('apkbackup','diger','📦','APK yedekle','Yüklü uygulamayı dosyaya kaydet',{
  view(){ V(`<div class="note info">${ic('info')}<div class="small">Uygulama yöneticisinde bir uygulamaya dokun → <b>APK'sını yedekle</b>. Dosya <b>İndirilenler/AracKutusu</b> klasörüne kaydedilir; uygulama mağazadan kalksa bile tekrar kurabilirsin. Verileri (sohbetler vb.) yedeklenmez.</div></div><button class="btn pri" onclick="go('apps')">Uygulama yöneticisini aç</button>`); }});
