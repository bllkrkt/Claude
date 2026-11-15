'use strict';
// =====================================================================
//  Araçlar (2. paket): namaz vakitleri, kıble, zikirmatik, kayan yazı, büyüteç, ayna,
//  metronom, akort, uyku sesleri, nefes, sayıyı yazıya, doğrulayıcılar, yakıt, su, rehber
// =====================================================================
const PERM_NAMES={'android.permission.CAMERA':'Kamera','android.permission.RECORD_AUDIO':'Mikrofon','android.permission.READ_CONTACTS':'Rehber','android.permission.ACCESS_COARSE_LOCATION':'Yaklaşık konum','android.permission.ACCESS_FINE_LOCATION':'Konum'};
function needPerm2(perm,why){
  if(sync('hasPerm',{perm})) return '';
  return `<div class="card"><b>${PERM_NAMES[perm]} izni gerekli</b><p class="muted small" style="margin:6px 0 12px">${why}</p><button class="btn pri" onclick="sync('askPerm',{perm:'${perm}'})">İzin ver</button>
    <p class="muted tiny" style="margin-top:10px">Pencere çıkmazsa: <button class="link tiny" style="padding:0" onclick="sync('openShortcut',{id:'my_app'})">uygulama izinlerinden</button> aç.</p></div>`;
}

// ---------------- Namaz vakitleri + kıble ----------------
const CITIES={'Adana':[37.00,35.32],'Afyonkarahisar':[38.76,30.54],'Ankara':[39.93,32.86],'Antalya':[36.90,30.70],'Aydın':[37.85,27.85],'Balıkesir':[39.65,27.88],'Batman':[37.88,41.13],'Bursa':[40.19,29.06],'Çanakkale':[40.15,26.41],'Denizli':[37.78,29.09],'Diyarbakır':[37.91,40.24],'Edirne':[41.68,26.56],'Elazığ':[38.68,39.22],'Erzurum':[39.90,41.27],'Eskişehir':[39.78,30.52],'Gaziantep':[37.07,37.38],'Hatay':[36.20,36.16],'Isparta':[37.76,30.55],'İstanbul':[41.01,28.98],'İzmir':[38.42,27.14],'Kahramanmaraş':[37.58,36.94],'Kayseri':[38.73,35.48],'Kocaeli':[40.77,29.92],'Konya':[37.87,32.48],'Kütahya':[39.42,29.98],'Malatya':[38.35,38.31],'Manisa':[38.61,27.43],'Mardin':[37.31,40.74],'Mersin':[36.81,34.64],'Muğla':[37.22,28.36],'Ordu':[40.98,37.88],'Rize':[41.03,40.52],'Sakarya':[40.78,30.40],'Samsun':[41.29,36.33],'Sivas':[39.75,37.02],'Şanlıurfa':[37.16,38.79],'Tekirdağ':[40.98,27.51],'Trabzon':[41.00,39.72],'Van':[38.49,43.38],'Zonguldak':[41.45,31.79]};
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
function sunPos(jd){ const D=jd-2451545, g=(357.529+0.98560028*D)%360, q=(280.459+0.98564736*D)%360, L=(q+1.915*Math.sin(rad(g))+0.020*Math.sin(rad(2*g)))%360, e=23.439-0.00000036*D;
  const RA=deg(Math.atan2(Math.cos(rad(e))*Math.sin(rad(L)),Math.cos(rad(L))))/15, dec=deg(Math.asin(Math.sin(rad(e))*Math.sin(rad(L)))), eqt=q/15-((RA+24)%24);
  return {dec,eqt:((eqt+12)%24+24)%24-12}; }
function prayerTimes(date,lat,lon){
  const y=date.getFullYear(), m=date.getMonth()+1, d=date.getDate(), tz=-date.getTimezoneOffset()/60;
  const jd=367*y-Math.floor(7*(y+Math.floor((m+9)/12))/4)+Math.floor(275*m/9)+d+1721013.5-lon/360;
  const {dec,eqt}=sunPos(jd+0.5);
  const noon=12+tz-lon/15-eqt;
  const T=a=>deg(Math.acos((-Math.sin(rad(a))-Math.sin(rad(dec))*Math.sin(rad(lat)))/(Math.cos(rad(dec))*Math.cos(rad(lat)))))/15;
  const asrA=-deg(Math.atan(1/(1+Math.tan(rad(Math.abs(lat-dec))))));
  // Diyanet: imsak 18°, yatsı 17°, ikindi asr-ı evvel; temkinler: güneş −7, öğle +5, ikindi +4, akşam +7 dk
  return [['İmsak',noon-T(18)],['Güneş',noon-T(0.833)-7/60],['Öğle',noon+5/60],['İkindi',noon+T(asrA)+4/60],['Akşam',noon+T(0.833)+7/60],['Yatsı',noon+T(17)]];
}
const hhmm=h=>{ const t=Math.round(h*60); return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); };
function qibla(lat,lon){ const K=[21.4225,39.8262]; const dl=rad(K[1]-lon); return (deg(Math.atan2(Math.sin(dl),Math.cos(rad(lat))*Math.tan(rad(K[0]))-Math.sin(rad(lat))*Math.cos(dl)))+360)%360; }
T('prayer','gunluk','🕌','Namaz vakitleri ve kıble','Bulunduğun şehre göre',{
  view(){
    const loc=LS.get('loc',null);
    if(!loc||TS.pick){
      V(`<div class="card"><b>Konum seç</b><p class="muted small" style="margin:6px 0 12px">Vakitler bulunduğun yere göre hesaplanır. İnternet gerekmez.</p>
        <button class="btn pri" style="margin-bottom:12px" onclick="TOOL.gps()">📍 Konumumu kullan</button><div id="pgS" class="muted small"></div>
        <select style="width:100%" onchange="if(this.value){const c=CITIES[this.value];LS.set('loc',{name:this.value,lat:c[0],lon:c[1]});TS.pick=0;vTool(true)}"><option value="">…veya şehir seç</option>${Object.keys(CITIES).map(c=>`<option>${c}</option>`).join('')}</select></div>`);
      return;
    }
    const now=new Date(), P=prayerTimes(now,loc.lat,loc.lon), h=now.getHours()+now.getMinutes()/60+now.getSeconds()/3600;
    let ni=P.findIndex(p=>p[1]>h), nextH, nextN;
    if(ni<0){ const P2=prayerTimes(new Date(now.getTime()+864e5),loc.lat,loc.lon); nextH=P2[0][1]+24; nextN='İmsak'; } else { nextH=P[ni][1]; nextN=P[ni][0]; }
    const left=Math.max(0,(nextH-h)*3600), q=qibla(loc.lat,loc.lon);
    V(`<div class="card" style="text-align:center"><p class="muted small">${esc(loc.name)} · ${now.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})}</p>
        <div style="font-size:15px;margin-top:10px"><b>${nextN}</b> vaktine</div><div style="font-size:52px;font-weight:800;font-variant-numeric:tabular-nums" id="prL">${hhmm(left/3600).replace(':',' sa ')} dk</div></div>
      <div class="list">${P.map((p,i)=>`<div class="kv" style="padding:14px 18px;${i===ni?'background:var(--acbg)':''}"><span style="${i===ni?'color:var(--ac);font-weight:700':''}">${p[0]}</span><span style="font-size:18px">${hhmm(p[1])}</span></div>`).join('')}</div>
      <div class="card" style="text-align:center"><b>Kıble yönü</b><div style="position:relative;width:200px;height:200px;margin:14px auto;border-radius:50%;background:var(--card2)">
        <div id="qbA" style="position:absolute;inset:0;transition:transform .15s"><div style="position:absolute;left:50%;top:8px;transform:translateX(-50%);font-size:34px">🕋</div><div style="position:absolute;left:calc(50% - 3px);top:46px;width:6px;height:54px;border-radius:3px;background:var(--ac)"></div></div>
        <div style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;border-radius:50%;background:var(--tx)"></div></div>
        <p id="qbT">Kuzeyden saat yönünde <b>${Math.round(q)}°</b></p><p class="muted tiny" style="margin-top:6px">Telefonu düz tut; 🕋 işareti telefonun üst kenarıyla hizalanınca kıbleye bakıyorsun. Pusula metale yakınken şaşar.</p></div>
      <button class="btn ghost" onclick="TS.pick=1;vTool(true)">Konumu değiştir</button>
      <p class="muted tiny" style="margin:10px 4px">Diyanet yöntemiyle (imsak 18°, yatsı 17°, temkinli) hesaplanır; Diyanet takviminden 1–2 dk farklı olabilir. Kesin vakit için Diyanet'in takvimine bak.</p>`);
    TS.q=q; if(!TS.sens){ TS.sens=sync('sensorStart',{kind:'orient'}); }
    clearInterval(TS.iv); TS.iv=setInterval(()=>{ if(TS.pick) return; const n=new Date(), hh=n.getHours()+n.getMinutes()/60+n.getSeconds()/3600; const l=Math.max(0,(nextH-hh)*3600); const e=$('#prL'); if(e) e.textContent=hhmm(l/3600).replace(':',' sa ')+' dk'; if(l<=0) vTool(true); },15000);
  },
  async gps(){ if(!sync('hasPerm',{perm:'android.permission.ACCESS_COARSE_LOCATION'})){ sync('askPerm',{perm:'android.permission.ACCESS_COARSE_LOCATION'}); return; }
    $('#pgS').textContent='Konum alınıyor…'; const r=await call('location');
    if(r.error){ $('#pgS').innerHTML=r.error==='off'?'Konum kapalı. Bildirim panelinden <b>Konum</b>\'u aç ve tekrar dene.':esc(r.error); return; }
    let near='Konumum', best=1e9; for(const [n,c] of Object.entries(CITIES)){ const dd=(c[0]-r.lat)**2+(c[1]-r.lon)**2; if(dd<best){ best=dd; near=n; } }
    LS.set('loc',{name:best<0.6?near+' (konum)':'Konumum',lat:r.lat,lon:r.lon}); TS.pick=0; vTool(true); },
  onPerm(p,ok){ if(ok&&p.includes('LOCATION')) TOOL.gps(); },
  onSensor(k,v){ if(k!=='orient') return; const a=$('#qbA'); if(a) a.style.transform=`rotate(${TS.q-v[0]}deg)`; },
  stop(){ clearInterval(TS.iv); sync('sensorStop'); }, pause(){ TS.sens=false; }});

// ---------------- Zikirmatik / sayaç ----------------
T('counter','gunluk','📿','Zikirmatik / sayaç','Dokun say, hedefte titre',{
  view(){ const C=LS.get('counters',[{n:'Sayaç',v:0,goal:33}]); const i=Math.min(TS.i||0,C.length-1); const c=C[i];
    V(`<div class="seg" style="margin-bottom:12px">${C.map((x,j)=>`<button class="${j===i?'on':''}" onclick="TS.i=${j};vTool(true)">${esc(x.n)}</button>`).join('')}<button onclick="TOOL.add()">${ic('plus')}</button></div>
      <button id="cnB" onclick="TOOL.inc()" style="display:block;width:100%;height:46vh;border-radius:28px;background:var(--card);text-align:center">
        <div id="cnV" style="font-size:96px;font-weight:800;font-variant-numeric:tabular-nums">${c.v}</div><div class="muted">${c.goal?`Hedef: ${c.goal} · tur ${Math.floor(c.v/c.goal)}`:'Hedefsiz'}</div></button>
      <div class="btns" style="margin-top:12px"><button class="btn" onclick="TOOL.chg(-1)">−1</button><button class="btn" onclick="TOOL.reset()">Sıfırla</button><button class="btn" onclick="TOOL.edit()">Düzenle</button></div>
      <p class="muted tiny" style="margin:10px 4px">Hedefe her ulaştığında telefon titrer. Sayılar kaydedilir.</p>`); },
  save(C){ LS.set('counters',C); },
  inc(){ TOOL.chg(1); },
  chg(d){ const C=LS.get('counters',[{n:'Sayaç',v:0,goal:33}]); const c=C[TS.i||0]; c.v=Math.max(0,c.v+d); TOOL.save(C);
    $('#cnV').textContent=c.v; if(d>0) sync('vibrate',{p:c.goal&&c.v%c.goal===0?[300,100,300]:[15]}); if(c.goal&&c.v%c.goal===0&&d>0) vTool(true); },
  reset(){ const C=LS.get('counters',[]); C[TS.i||0].v=0; TOOL.save(C); vTool(true); },
  add(){ const C=LS.get('counters',[{n:'Sayaç',v:0,goal:33}]); C.push({n:'Sayaç '+(C.length+1),v:0,goal:33}); TOOL.save(C); TS.i=C.length-1; vTool(true); },
  edit(){ const C=LS.get('counters',[]); const c=C[TS.i||0];
    openSheet(`<h4>Sayacı düzenle</h4><label class="small muted">Ad</label><input type="text" id="ceN" value="${esc(c.n)}" style="margin:6px 0 12px"><label class="small muted">Hedef (0 = hedefsiz)</label><input type="text" inputmode="numeric" id="ceG" value="${c.goal||0}" style="margin:6px 0 16px">
      <div class="btns"><button class="btn pri" onclick="TOOL.saveEd()">Kaydet</button>${C.length>1?`<button class="btn red sm" style="flex:0 0 auto" onclick="TOOL.delC()">Sil</button>`:''}</div>`); },
  saveEd(){ const C=LS.get('counters',[]); const c=C[TS.i||0]; c.n=$('#ceN').value.trim()||'Sayaç'; c.goal=Math.max(0,parseInt($('#ceG').value)||0); TOOL.save(C); closeSheet(); vTool(true); },
  delC(){ const C=LS.get('counters',[]); C.splice(TS.i||0,1); TOOL.save(C); TS.i=0; closeSheet(); vTool(true); }});

// ---------------- Su takibi ----------------
T('water','gunluk','💧','Su takibi','Günlük su hedefi',{
  view(){ const k=new Date().toISOString().slice(0,10), W=LS.get('water',{}), goal=LS.get('waterGoal',8), n=W[k]||0;
    const last=Array.from({length:7},(_,i)=>{ const d=new Date(Date.now()-(6-i)*864e5).toISOString().slice(0,10); return [d,W[d]||0]; });
    V(`<div class="card" style="text-align:center"><div style="font-size:60px">${n>=goal?'🎉':'💧'}</div>${big(n,'/ '+goal+' bardak',n>=goal?'<b style="color:var(--ac)">Bugünkü hedef tamam!</b>':`${goal-n} bardak kaldı (~${num((goal-n)*0.2,1)} L)`)}
        <div class="bar" style="margin:12px 0 16px;height:14px"><i style="width:${Math.min(100,n/goal*100)}%;background:var(--blue)"></i></div>
        <div class="btns"><button class="btn pri" onclick="TOOL.add(1)">+1 bardak</button><button class="btn" onclick="TOOL.add(-1)">−1</button></div></div>
      <div class="card"><b>Son 7 gün</b><div style="display:flex;align-items:flex-end;gap:8px;height:90px;margin-top:12px">${last.map(([d,v])=>`<div style="flex:1;text-align:center"><div style="height:${Math.max(3,Math.min(1,v/goal)*70)}px;border-radius:6px;background:${v>=goal?'var(--blue)':'var(--card2)'}"></div><div class="tiny muted" style="margin-top:4px">${new Date(d).toLocaleDateString('tr-TR',{weekday:'narrow'})}</div></div>`).join('')}</div></div>
      <div class="card"><div class="row" style="justify-content:space-between"><b class="small">Günlük hedef</b><b>${goal} bardak</b></div><input type="range" min="4" max="16" value="${goal}" onchange="LS.set('waterGoal',+this.value);vTool(true)"></div>`); },
  add(d){ const k=new Date().toISOString().slice(0,10), W=LS.get('water',{}); W[k]=Math.max(0,(W[k]||0)+d); LS.set('water',W); if(d>0) sync('vibrate',{p:[30]}); vTool(true); }});

// ---------------- Kayan yazı ----------------
T('banner','gunluk','🪧','Kayan yazı','Telefonu LED tabelaya çevir',{
  view(){ const o=TS.o||(TS.o=LS.get('banner',{t:'HOŞ GELDİN',c:'#FFD43B',bg:'#000000',sp:6,sz:60}));
    V(`<div class="card"><label class="small muted">Yazı</label><input type="text" id="bnT" value="${esc(o.t)}" style="margin:6px 0 12px" oninput="TS.o.t=this.value">
      <b class="small">Renk</b><div class="seg" style="margin:8px 0 12px">${['#FFD43B','#FF4D4D','#4FD1A5','#6AA8FF','#FFFFFF','#FF8FB1'].map(c=>`<button class="${o.c===c?'on':''}" style="min-width:46px" onclick="TS.o.c='${c}';vTool(true)"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${c}"></span></button>`).join('')}</div>
      <div class="row" style="justify-content:space-between"><b class="small">Hız</b><span class="muted small">${o.sp}</span></div><input type="range" min="1" max="12" value="${o.sp}" onchange="TS.o.sp=+this.value;vTool(true)">
      <div class="row" style="justify-content:space-between"><b class="small">Boyut</b><span class="muted small">${o.sz}%</span></div><input type="range" min="30" max="90" value="${o.sz}" onchange="TS.o.sz=+this.value;vTool(true)">
      <button class="btn pri" style="margin-top:10px" onclick="TOOL.show()">Tam ekran göster</button></div>
      <p class="muted tiny" style="margin:4px">Telefonu yatay tut. Havaalanında karşılama, konser, kalabalıkta işaret için. Çıkmak için dokun.</p>`); },
  show(){ const o=TS.o; LS.set('banner',o); const W=innerHeight, H=innerWidth; const fs=Math.round(H*o.sz/100);
    const dur=Math.max(2,(o.t.length*fs*0.6+W)/(o.sp*60));
    overlay(`<style>@keyframes bnr{from{transform:translateX(${W}px)}to{transform:translateX(-100%)}}</style><div style="position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;margin-left:${-W/2}px;margin-top:${-H/2}px;transform:rotate(90deg);background:${o.bg};overflow:hidden;display:flex;align-items:center">
      <div style="white-space:nowrap;font:900 ${fs}px system-ui;color:${o.c};text-shadow:0 0 ${fs/6}px ${o.c};animation:bnr ${dur}s linear infinite">${esc(o.t)}</div></div>`,()=>closeOverlay()); }});

// ---------------- Büyüteç / Ayna (kamera) ----------------
async function camStart(facing,elId){
  const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920}}}); TS.stream=s;
  const v=$('#'+elId); if(!v){ s.getTracks().forEach(t=>t.stop()); return null; } v.srcObject=s; await v.play(); return s.getVideoTracks()[0];
}
const camStop=()=>{ if(TS.stream){ TS.stream.getTracks().forEach(t=>t.stop()); TS.stream=null; } };
T('magnifier','gunluk','🔍','Büyüteç','Küçük yazıları büyüt',{
  view(){ const p=needPerm2('android.permission.CAMERA','Küçük yazıları büyütmek için arka kamera kullanılır. Görüntü kaydedilmez.'); if(p){ V(p); return; }
    V(`<div style="position:relative;border-radius:22px;overflow:hidden;background:#000;height:58vh"><video id="mgv" playsinline muted style="width:100%;height:100%;object-fit:cover;transform-origin:center"></video></div>
      <div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b class="small">Yakınlaştırma</b><b id="mgZ">2x</b></div><input type="range" id="mgR" min="1" max="8" step="0.1" value="2" oninput="TOOL.zoom(+this.value)">
      <div class="btns"><button class="btn" id="mgF" onclick="TOOL.freeze()">Dondur</button><button class="btn" onclick="TOOL.light()">💡 Işık</button></div></div>`);
    TOOL.go(); },
  async go(){ try{ TS.track=await camStart('environment','mgv'); TOOL.zoom(2); }catch(e){ toast('Kamera açılamadı: '+e.message); } },
  zoom(z){ $('#mgZ').textContent=num(z,1)+'x'; const t=TS.track, cap=t&&t.getCapabilities?t.getCapabilities():{};
    if(cap.zoom){ t.applyConstraints({advanced:[{zoom:Math.min(cap.zoom.max,Math.max(cap.zoom.min,z))}]}).catch(()=>{}); $('#mgv').style.transform=''; } else $('#mgv').style.transform=`scale(${z})`; },
  freeze(){ const v=$('#mgv'); if(v.paused){ v.play(); $('#mgF').textContent='Dondur'; } else { v.pause(); $('#mgF').textContent='Devam'; } },
  light(){ const t=TS.track; TS.lt=!TS.lt; if(t&&t.getCapabilities&&t.getCapabilities().torch) t.applyConstraints({advanced:[{torch:TS.lt}]}).catch(()=>{}); else toast('Bu telefonda kamera açıkken fener kullanılamıyor'); },
  stop(){ camStop(); }, pause(){ camStop(); }, onPerm(){ vTool(true); }});

T('mirror','gunluk','🪞','Ayna','Ön kamerayla ayna',{
  view(){ const p=needPerm2('android.permission.CAMERA','Ön kamera ayna olarak kullanılır. Görüntü kaydedilmez.'); if(p){ V(p); return; }
    V(`<div style="position:relative;border-radius:28px;overflow:hidden;background:#000;height:72vh;box-shadow:0 0 0 10px #fff3"><video id="mrv" playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video></div>
      <p class="muted tiny" style="text-align:center;margin-top:10px">Karanlıkta yüzünü aydınlatmak için ekran parlaklığını artır.</p>`);
    camStart('user','mrv').catch(e=>toast('Kamera açılamadı: '+e.message)); },
  stop(){ camStop(); }, pause(){ camStop(); }, onPerm(){ vTool(true); }});

// ---------------- Metronom ----------------
T('metronome','gunluk','🥁','Metronom','Tempo tutucu',{
  view(){ const o=TS; o.bpm=o.bpm||LS.get('bpm',100); o.bars=o.bars||4;
    V(`<div class="card" style="text-align:center"><div style="display:flex;justify-content:center;gap:12px;margin:10px 0 18px">${Array.from({length:o.bars},(_,i)=>`<div class="mtD" style="width:26px;height:26px;border-radius:50%;background:var(--card2)"></div>`).join('')}</div>
      <div id="mtB">${big(o.bpm,'BPM',o.bpm<66?'Largo (yavaş)':o.bpm<108?'Andante / Moderato':o.bpm<168?'Allegro (hızlı)':'Presto (çok hızlı)')}</div>
      <input type="range" min="30" max="240" value="${o.bpm}" oninput="TS.bpm=+this.value;LS.set('bpm',TS.bpm);$('#mtB').innerHTML=big(this.value,'BPM','')">
      <div class="btns" style="margin-top:8px"><button class="btn" onclick="TS.bpm=Math.max(30,TS.bpm-1);vTool(true)">−</button><button class="btn ${o.on?'red':'pri'}" onclick="TOOL.tg()">${o.on?'Durdur':'Başlat'}</button><button class="btn" onclick="TS.bpm=Math.min(240,TS.bpm+1);vTool(true)">+</button></div></div>
      <div class="card"><b class="small">Ölçü</b><div class="seg" style="margin:8px 0 12px">${[2,3,4,6].map(b=>`<button class="${o.bars===b?'on':''}" onclick="TS.bars=${b};vTool(true)">${b}/4</button>`).join('')}</div>
      <button class="btn ghost" onclick="TOOL.tap()">Ritme göre dokun (tempo bul)</button></div>`);
    if(o.on) TOOL.run(); },
  tg(){ TS.on=!TS.on; if(!TS.on) clearTimeout(TS.tm); vTool(true); },
  run(){ clearTimeout(TS.tm); AC=AC||new AudioContext(); let i=TS.beat||0;
    const tick=()=>{ if(!TS.on) return; const acc=i%TS.bars===0; tone(acc?1500:1000,0,0.05);
      document.querySelectorAll('.mtD').forEach((d,j)=>d.style.background=j===i%TS.bars?(acc?'var(--ac)':'var(--blue)'):'var(--card2)');
      i++; TS.beat=i; TS.tm=setTimeout(tick,60000/TS.bpm); }; tick(); },
  tap(){ const n=Date.now(); TS.taps=(TS.taps||[]).filter(t=>n-t<3000); TS.taps.push(n); if(TS.taps.length>=2){ const d=(TS.taps[TS.taps.length-1]-TS.taps[0])/(TS.taps.length-1); TS.bpm=Math.max(30,Math.min(240,Math.round(60000/d))); LS.set('bpm',TS.bpm); vTool(true); } },
  stop(){ TS.on=false; clearTimeout(TS.tm); }});

// ---------------- Akort (ses perdesi bulucu) ----------------
const NOTE=['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'], NOTE_EN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function autoCorr(buf,sr){ let n=buf.length, rms=0; for(let i=0;i<n;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/n); if(rms<0.01) return -1;
  let r1=0,r2=n-1; const th=0.2; for(let i=0;i<n/2;i++) if(Math.abs(buf[i])<th){ r1=i; break; } for(let i=1;i<n/2;i++) if(Math.abs(buf[n-i])<th){ r2=n-i; break; }
  buf=buf.slice(r1,r2); n=buf.length; const c=new Array(n).fill(0); for(let i=0;i<n;i++) for(let j=0;j<n-i;j++) c[i]+=buf[j]*buf[j+i];
  let d=0; while(d<n-1&&c[d]>c[d+1]) d++; let mx=-1,mp=-1; for(let i=d;i<n;i++) if(c[i]>mx){ mx=c[i]; mp=i; }
  let T0=mp; const x1=c[T0-1],x2=c[T0],x3=c[T0+1]; const a=(x1+x3-2*x2)/2, b=(x3-x1)/2; if(a) T0-=b/(2*a); return sr/T0; }
T('tuner','gunluk','🎸','Akort','Gitar, bağlama, keman…',{
  view(){ const p=needPerm2('android.permission.RECORD_AUDIO','Çaldığın notayı duymak için mikrofon gerekli. Ses kaydedilmez.'); if(p){ V(p); return; }
    V(`<div class="card" style="text-align:center"><div id="tnN" style="font-size:80px;font-weight:800;line-height:1.1">—</div><div id="tnF" class="muted">Bir tel çal</div>
      <div style="position:relative;height:46px;margin:18px 6px 6px;border-radius:12px;background:var(--card2)"><div style="position:absolute;left:50%;top:0;bottom:0;width:3px;margin-left:-1.5px;background:var(--ac)"></div><div id="tnI" style="position:absolute;top:6px;bottom:6px;width:8px;margin-left:-4px;left:50%;border-radius:4px;background:var(--tx);transition:left .1s"></div></div>
      <div class="row tiny muted" style="justify-content:space-between;margin:0 6px"><span>Pes (−50)</span><span id="tnC">0 sent</span><span>Tiz (+50)</span></div></div>
      <div class="card small"><b>Standart gitar akordu</b><p class="muted" style="margin-top:4px">6. tel (kalın) → 1. tel: Mi (E2) · La (A2) · Re (D3) · Sol (G3) · Si (B3) · Mi (E4)</p><p class="muted" style="margin-top:6px">Bağlama (kısa sap, bağlama düzeni): La – Re – Sol</p></div>`);
    TOOL.go(); },
  async go(){ try{ TS.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      AC=AC||new AudioContext(); const src=AC.createMediaStreamSource(TS.stream), an=AC.createAnalyser(); an.fftSize=2048; src.connect(an); const buf=new Float32Array(an.fftSize);
      TS.iv=setInterval(()=>{ an.getFloatTimeDomainData(buf); const f=autoCorr(buf,AC.sampleRate); const N=$('#tnN'); if(!N) return; if(f<40||f>2000) return;
        const nn=12*Math.log2(f/440)+69, r=Math.round(nn), cents=Math.round((nn-r)*100);
        N.textContent=NOTE[r%12]; $('#tnF').textContent=`${NOTE_EN[r%12]}${Math.floor(r/12)-1} · ${num(f,1)} Hz`;
        $('#tnI').style.left=(50+cents)+'%'; $('#tnI').style.background=Math.abs(cents)<6?'var(--ac)':'var(--warn)'; $('#tnC').textContent=(cents>0?'+':'')+cents+' sent'; },90);
    }catch(e){ toast('Mikrofon açılamadı: '+e.message); } },
  stop(){ clearInterval(TS.iv); camStop(); }, pause(){ TOOL.stop(); }, onPerm(){ vTool(true); }});

// ---------------- Uyku sesleri ----------------
const SOUNDS=[['white','Beyaz gürültü','Fan sesi gibi, dikkat dağıtan sesleri örter'],['pink','Pembe gürültü','Daha yumuşak, uyku için'],['brown','Kahverengi gürültü','Derin uğultu, şelale gibi'],['rain','Yağmur','Hafif dalgalanan yağmur'],['ocean','Okyanus','Gelip giden dalgalar']];
T('sleep','gunluk','🌧️','Uyku ve odak sesleri','Beyaz gürültü, yağmur, dalga',{
  view(){ const o=TS;
    V(`<div class="list">${SOUNDS.map(([k,t,d])=>`<button class="item ${o.k===k?'sel':''}" onclick="TOOL.play('${k}')"><div style="font-size:26px">${o.k===k?'⏸️':'▶️'}</div><div class="grow"><b>${t}</b><div class="muted tiny">${d}</div></div></button>`).join('')}</div>
      <div class="card"><div class="row" style="justify-content:space-between"><b class="small">Ses</b></div><input type="range" min="0" max="1" step="0.01" value="${o.vol??0.5}" oninput="TS.vol=+this.value;if(TS.g)TS.g.gain.value=TS.vol">
      <b class="small">Kapanma zamanlayıcısı</b><div class="seg" style="margin-top:8px">${[0,15,30,45,60,90].map(m=>`<button class="${(o.min||0)===m?'on':''}" onclick="TOOL.timer(${m})">${m?m+' dk':'Kapalı'}</button>`).join('')}</div>
      ${o.end?`<p class="muted small" style="margin-top:10px" id="slL"></p>`:''}</div>
      <p class="muted tiny" style="margin:4px">Ekranı kapatabilirsin; Xiaomi uygulamayı arka planda kapatırsa ses durur (Otomatik başlatma iznini açmak yardımcı olur).</p>`);
    clearInterval(TS.iv2); if(o.end) TS.iv2=setInterval(()=>{ const l=o.end-Date.now(); const e=$('#slL'); if(e) e.textContent=`${Math.ceil(l/60000)} dk sonra yavaşça kapanacak`; if(l<=0){ TOOL.fade(); } },1000); },
  play(k){ if(TS.k===k){ TOOL.halt(); vTool(true); return; } TOOL.halt(); AC=AC||new AudioContext(); AC.resume();
    const len=AC.sampleRate*4, b=AC.createBuffer(2,len,AC.sampleRate);
    for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,last=0;
      for(let i=0;i<len;i++){ const w=Math.random()*2-1;
        if(k==='white') d[i]=w*0.35;
        else if(k==='pink'||k==='rain'){ b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.969*b2+w*0.153852; b3=0.8665*b3+w*0.3104856; b4=0.55*b4+w*0.5329522; b5=-0.7616*b5-w*0.016898; d[i]=(b0+b1+b2+b3+b4+b5+w*0.5362)*0.11; if(k==='rain'&&Math.random()<0.0004) d[i]+=(Math.random()-0.5)*0.8; }
        else { last=(last+0.02*w)/1.02; d[i]=last*3.2; } } }
    const src=AC.createBufferSource(); src.buffer=b; src.loop=true; const g=AC.createGain(); g.gain.value=TS.vol??0.5; let node=src;
    if(k==='ocean'){ const lfo=AC.createOscillator(), lg=AC.createGain(), og=AC.createGain(); lfo.frequency.value=0.09; lg.gain.value=0.45; og.gain.value=0.55; lfo.connect(lg).connect(og.gain); lfo.start(); src.connect(og); node=og; TS.lfo=lfo; }
    if(k==='rain'){ const f=AC.createBiquadFilter(); f.type='highpass'; f.frequency.value=400; src.connect(f); node=f; }
    node.connect(g).connect(AC.destination); src.start(); TS.src=src; TS.g=g; TS.k=k; vTool(true); },
  timer(m){ TS.min=m; TS.end=m?Date.now()+m*60000:0; vTool(true); },
  fade(){ clearInterval(TS.iv2); TS.end=0; TS.min=0; if(TS.g){ TS.g.gain.setTargetAtTime(0,AC.currentTime,4); setTimeout(()=>{ TOOL.halt(); if(TOOL&&TOOL.id==='sleep') vTool(true); },15000); } },
  halt(){ try{ TS.src&&TS.src.stop(); TS.lfo&&TS.lfo.stop(); }catch(e){} TS.src=TS.lfo=TS.g=null; TS.k=null; },
  stop(){ clearInterval(TS.iv2); TOOL.halt(); }});

// ---------------- Nefes egzersizi ----------------
const BREATH={'478':['4-7-8 rahatlama',[['Nefes al',4],['Tut',7],['Ver',8]]],'box':['Kutu nefesi (odak)',[['Nefes al',4],['Tut',4],['Ver',4],['Tut',4]]],'calm':['Sakinleş (5-5)',[['Nefes al',5],['Ver',5]]]};
T('breath','gunluk','🫁','Nefes egzersizi','Stres ve uyku için',{
  view(){ const m=TS.m||'478';
    V(`<div class="seg" style="margin-bottom:12px">${Object.entries(BREATH).map(([k,[t]])=>`<button class="${k===m?'on':''}" onclick="TOOL.stop();TS.m='${k}';vTool(true)">${t}</button>`).join('')}</div>
      <div class="card" style="text-align:center;padding:30px 16px"><div style="height:240px;display:flex;align-items:center;justify-content:center"><div id="brC" style="width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,var(--ac),var(--ac2));opacity:.85;transition:all 1s ease-in-out"></div></div>
        <div id="brT" style="font-size:26px;font-weight:800;margin-top:10px">Hazır</div><div id="brN" class="muted" style="margin-top:4px">${BREATH[m][1].map(p=>p[0]+' '+p[1]+' sn').join(' · ')}</div>
        <button class="btn ${TS.on?'red':'pri'}" style="margin-top:18px" onclick="TS.on?TOOL.stop():TOOL.start()">${TS.on?'Durdur':'Başla'}</button></div>
      <p class="muted tiny" style="margin:4px">Her aşamada telefon hafifçe titrer; gözlerini kapatıp yapabilirsin. Başın dönerse dur.</p>`); },
  start(){ TS.on=true; TS.cyc=0; vTool(true); const P=BREATH[TS.m||'478'][1]; let i=0;
    const step=()=>{ if(!TS.on) return; const [t,s]=P[i%P.length], c=$('#brC'); if(!c) return;
      c.style.transitionDuration=s+'s'; c.style.transform=t==='Nefes al'?'scale(2.4)':t==='Ver'?'scale(1)':c.style.transform;
      sync('vibrate',{p:[40]}); let left=s; $('#brT').textContent=t+' · '+left; clearInterval(TS.cd); TS.cd=setInterval(()=>{ left--; const e=$('#brT'); if(e&&left>0) e.textContent=t+' · '+left; },1000);
      if(i%P.length===P.length-1){ TS.cyc++; } $('#brN').textContent=TS.cyc+' tur tamamlandı';
      i++; TS.tm=setTimeout(step,s*1000); }; step(); },
  stop(){ TS.on=false; clearTimeout(TS.tm); clearInterval(TS.cd); if(TOOL&&TOOL.id==='breath'&&$('#brT')) vTool(true); }});

// ---------------- Sayıyı yazıya ----------------
function trWords(n){
  const B=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'], O=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'], G=['','bin','milyon','milyar','trilyon'];
  if(n===0) return 'sıfır'; const parts=[]; let g=0;
  while(n>0){ const k=n%1000; if(k){ const y=Math.floor(k/100), o=Math.floor(k%100/10), b=k%10; let w=(y?(y>1?B[y]+' ':'')+'yüz ':'')+(o?O[o]+' ':'')+(b?B[b]:''); w=w.trim();
      if(g===1&&k===1) w=''; parts.unshift((w+' '+G[g]).trim()); } n=Math.floor(n/1000); g++; }
  return parts.join(' ').replace(/\s+/g,' ').trim(); }
T('numwords','hesap','✍️','Sayıyı yazıya çevir','Çek, fatura, senet için',{
  view(){ V(`<div class="card">${field('nw','Tutar','','12.750,50')}${resBox('nwR')}</div><p class="muted tiny" style="margin:4px">Çek ve senetlerde araya boşluk koymadan yazılır (sonradan ekleme yapılamasın diye).</p>`); TOOL.calc(); },
  calc(){ const v=val('nw'); if(!isFinite(v)||v<0||v>=1e15){ setRes('nwR','Bir tutar gir.'); return; } const tl=Math.floor(v), kr=Math.round((v-tl)*100);
    const w=trWords(tl)+' Türk lirası'+(kr?' '+trWords(kr)+' kuruş':''); const j=(trWords(tl)+'TL'+(kr?trWords(kr)+'Kr':'')).replace(/\s/g,'');
    setRes('nwR',`<b style="font-size:18px">${esc(w)}</b><br><span class="small">Bitişik (çek/senet): <b>#${esc(j)}#</b></span><br><button class="link small" style="padding:6px 0 0" onclick="sync('copy',{text:${esc(JSON.stringify(j))}});toast('Kopyalandı')">Bitişik yazıyı kopyala</button>`); }});

// ---------------- Doğrulayıcılar ----------------
function tcOk(t){ if(!/^[1-9]\d{10}$/.test(t)) return false; const d=t.split('').map(Number); const o=d[0]+d[2]+d[4]+d[6]+d[8], e=d[1]+d[3]+d[5]+d[7];
  return ((o*7-e)%10+10)%10===d[9] && d.slice(0,10).reduce((a,b)=>a+b,0)%10===d[10]; }
function ibanOk(s){ s=s.replace(/\s/g,'').toUpperCase(); if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false; if(s.startsWith('TR')&&s.length!==26) return false;
  const r=(s.slice(4)+s.slice(0,4)).replace(/[A-Z]/g,c=>c.charCodeAt(0)-55); let m=0; for(const ch of r) m=(m*10+ +ch)%97; return m===1; }
function luhn(s){ s=s.replace(/\D/g,''); if(s.length<12) return false; let sum=0; for(let i=0;i<s.length;i++){ let d=+s[s.length-1-i]; if(i%2){ d*=2; if(d>9) d-=9; } sum+=d; } return sum%10===0; }
const BANKS={'00010':'Ziraat Bankası','00012':'Halkbank','00015':'VakıfBank','00046':'Akbank','00062':'Garanti BBVA','00064':'İş Bankası','00067':'Yapı Kredi','00111':'QNB','00032':'TEB','00134':'Denizbank','00099':'ING','00206':'Türkiye Finans','00205':'Kuveyt Türk','00209':'Ziraat Katılım','00210':'Vakıf Katılım','00203':'Albaraka','00123':'HSBC','00059':'Şekerbank','00829':'Papara'};
T('validate','hesap','🧾','IBAN, TC, kart kontrolü','Yazım hatası var mı?',{
  view(){ V(`<div class="card">${field('vI','IBAN','','TR00 0000 0000 0000 0000 0000 00','text')}<div id="vIR" class="small" style="margin-top:8px"></div></div>
      <div class="card">${field('vT','TC kimlik no','','11 haneli','numeric')}<div id="vTR" class="small" style="margin-top:8px"></div></div>
      <div class="card">${field('vK','Kart numarası','','16 hane','numeric')}<div id="vKR" class="small" style="margin-top:8px"></div></div>
      <div class="note info">${ic('info')}<div class="small">Bu kontrol sadece <b>yazım hatası</b> olup olmadığını matematiksel olarak doğrular; numaranın gerçekten var olduğunu veya kime ait olduğunu göstermez. Hiçbir şey kaydedilmez, internete gitmez.</div></div>`); TOOL.calc(); },
  calc(){ const I=($('#vI').value||'').replace(/\s/g,'').toUpperCase(), Tc=($('#vT').value||'').trim(), K=$('#vK').value||'';
    const out=(id,v,ok,okT,badT)=>$('#'+id).innerHTML=v?`<b style="color:${ok?'var(--ac)':'var(--bad)'}">${ok?'✓ '+okT:'✕ '+badT}</b>`:'';
    const bank=I.startsWith('TR')&&I.length>=9?BANKS[I.slice(4,9)]:''; out('vIR',I,ibanOk(I),'Geçerli IBAN'+(bank?' · '+bank:''),'Geçersiz IBAN (rakam eksik veya hatalı)');
    out('vTR',Tc,tcOk(Tc),'Geçerli TC kimlik no biçimi','Geçersiz TC kimlik no'); out('vKR',K.replace(/\D/g,''),luhn(K),'Geçerli kart numarası biçimi','Geçersiz kart numarası'); }});

// ---------------- Yol / yakıt masrafı ----------------
T('fuel','hesap','⛽','Yol ve yakıt masrafı','Kaç lira tutar, kişi başı',{
  view(){ const f=LS.get('fuel',{});
    V(`<div class="card">${field('fk','Mesafe (km)',f.k||'','450')}${field('fc','Ortalama tüketim (L/100 km)',f.c||'','6,5')}${field('fp','Yakıt fiyatı (₺/L)',f.p||'','')}${field('fn','Kişi sayısı',f.n||'1','1','numeric')}
      <div class="row" style="justify-content:space-between;margin-top:14px" onclick="TS.rt=!TS.rt;vTool(true)"><span class="small">Gidiş-dönüş</span><div class="sw ${TS.rt?'on':''}"></div></div>${resBox('fR')}</div>
      <div class="card">${field('fl','Bu depoda doldurduğun litre','','')}${field('fd','Son dolumdan beri gidilen km','','')}<div id="fR2" class="small" style="margin-top:10px"></div></div>`); TOOL.calc(); },
  calc(){ const k=val('fk')*(TS.rt?2:1), c=val('fc'), p=val('fp'), n=val('fn')||1; LS.set('fuel',{k:$('#fk').value,c:$('#fc').value,p:$('#fp').value,n:$('#fn').value});
    if(k>0&&c>0&&p>0){ const L=k*c/100; setRes('fR',`<b style="font-size:22px">${num(L*p)} ₺</b> (${num(L,1)} L yakıt)<br>Kişi başı: <b>${num(L*p/n)} ₺</b> · km başı ${num(c*p/100)} ₺`); } else setRes('fR','Değerleri gir.');
    const l=val('fl'), d=val('fd'); $('#fR2').innerHTML=l>0&&d>0?`Aracının gerçek tüketimi: <b>${num(l/d*100,2)} L/100 km</b>`:'<span class="muted">Depoyu fulleyip son dolumdan beri gittiğin km\'yi yazarsan gerçek tüketimini hesaplarım.</span>'; }});

// ---------------- Rehber ----------------
T('contacts','diger','👥','Rehber yedeği ve kopyalar','VCF yedek, aynı numaralar',{
  view(){ const p=needPerm2('android.permission.READ_CONTACTS','Rehberi yedeklemek ve aynı numaraya kayıtlı kişileri bulmak için gerekli. Hiçbir kişi dışarı gönderilmez; değişiklik yapılmaz.'); if(p){ V(p); return; }
    if(!TS.r){ V(`<div class="card row"><div class="spin"></div><span class="muted">Rehber okunuyor…</span></div>`); call('contacts').then(r=>{ TS.r=r; if(TOOL&&TOOL.id==='contacts') vTool(true); }); return; }
    const r=TS.r; if(r.error){ V(`<div class="note bad">${ic('warn')}<div>${esc(r.error)}</div></div>`); return; }
    V(`<div class="stats"><div class="stat"><b>${r.total}</b><span>Kişi</span></div><div class="stat"><b>${r.dupes.length}</b><span>Aynı numaralı grup</span></div></div>
      <div class="card"><b>Rehberi yedekle</b><p class="muted small" style="margin:6px 0 12px">Tüm kişiler tek bir .vcf dosyasına kaydedilir (İndirilenler/AracKutusu). Yeni telefonda bu dosyayı açınca hepsi geri gelir.</p><button class="btn pri" id="vcB" onclick="TOOL.exp()">VCF olarak kaydet</button></div>
      ${r.noNumber?`<p class="muted small" style="margin:0 4px 12px">${r.noNumber} kişinin telefon numarası yok.</p>`:''}
      ${r.dupes.length?`<h3>Aynı numaraya kayıtlı kişiler</h3><div class="list">${r.dupes.map(d=>`<div class="item" style="align-items:flex-start"><div class="grow"><b class="small">…${esc(d.num.slice(-7))}</b><div class="muted small">${d.names.map(esc).join(' · ')}</div></div></div>`).join('')}</div>
        <p class="muted tiny" style="margin:0 4px">Birleştirmek için Kişiler uygulamasında ⋮ → "Kopyaları birleştir" (veya kişiyi açıp "Birleştir") kullan. Bu araç rehberinde değişiklik yapmaz.</p>`:'<div class="card empty">Aynı numaraya kayıtlı kişi yok. 👍</div>'}`); },
  async exp(){ const b=$('#vcB'); b.disabled=true; b.innerHTML='<div class="spin"></div> Kaydediliyor…'; const r=await call('exportVcf'); b.disabled=false; b.textContent='VCF olarak kaydet'; toast(r.error?'Kaydedilemedi: '+r.error:'Kaydedildi: '+r.path); },
  onPerm(){ vTool(true); }});

// ---------------- Kısayol araçları ----------------
T('screentime','diger','⏳','Ekran süresi','Hangi uygulamada ne kadar',{view(){ stack.pop(); go('usage'); }});
T('xtipsT','diger','📘','Xiaomi rehberi','Reklamları kapat, ipuçları',{view(){ stack.pop(); go('xtips'); }});

