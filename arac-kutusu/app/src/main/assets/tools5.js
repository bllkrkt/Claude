'use strict';
// =====================================================================
//  v7: belge tarayıcı (PDF), son tarihler, abonelikler, GPS hız göstergesi, barometre,
//  hız testi, renk seçici, dünya saati, hazır metinler, mevduat getirisi, barkod desteği
// =====================================================================
const dateIn=(id,v)=>`<input type="date" id="${id}" value="${v||''}" style="color-scheme:dark;width:100%;min-height:52px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:0 12px">`;
const daysTo=d=>{ const n=new Date(); n.setHours(0,0,0,0); return Math.round((new Date(d+'T00:00')-n)/864e5); };

// ---------------- Belge tarayıcı ----------------
T('docscan','gunluk','📄','Belge tarayıcı','Kâğıdı PDF\'e çevir',{
  view(){
    const p=needPerm2('android.permission.CAMERA','Belgeyi çekmek için kamera gerekli. Çekilen sayfalar sadece senin kaydettiğin PDF\'e girer.'); if(p){ V(p); return; }
    TS.pages=TS.pages||[]; TS.f=TS.f||'doc';
    V(`<div style="position:relative;border-radius:20px;overflow:hidden;background:#000;aspect-ratio:3/4"><video id="dsv" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;inset:6%;border:2px dashed rgba(255,255,255,.6);border-radius:12px;pointer-events:none"></div></div>
      <div class="seg" style="margin:12px 0">${[['doc','📄 Belge'],['bw','⚫ Siyah-beyaz'],['orig','🎨 Renkli']].map(([k,t])=>`<button class="${TS.f===k?'on':''}" onclick="TS.f='${k}';TOOL.paintSeg()">${t}</button>`).join('')}</div>
      <button class="btn pri" onclick="TOOL.snap()" style="min-height:64px;font-size:18px">📸 Sayfayı çek (${TS.pages.length+1}. sayfa)</button>
      <div id="dsP" style="display:flex;gap:10px;overflow-x:auto;margin:14px 0">${TS.pages.map((s,i)=>`<div style="position:relative;flex:0 0 auto"><img src="${s}" style="height:120px;border-radius:10px;border:1px solid var(--line)"><button onclick="TS.pages.splice(${i},1);vTool(true)" style="position:absolute;top:4px;right:4px;background:#000a;color:#fff;border-radius:50%;width:28px;height:28px">✕</button><div class="tiny" style="text-align:center">${i+1}</div></div>`).join('')}</div>
      ${TS.pages.length?`<div class="card"><input type="text" id="dsN" placeholder="Belge adı (ör. Kira sözleşmesi)" style="margin-bottom:10px"><button class="btn pri" id="dsS" onclick="TOOL.save()">PDF olarak kaydet (${TS.pages.length} sayfa)</button></div>`:''}
      <p class="muted tiny" style="margin:4px">İpucu: belgeyi düz ve aydınlık bir yere koy, kâğıt çerçeveyi doldursun. Kenar kırpma otomatik değildir.</p>`);
    TOOL.cam(); },
  paintSeg(){ document.querySelectorAll('#view .seg button').forEach((b,i)=>b.classList.toggle('on',['doc','bw','orig'][i]===TS.f)); },
  async cam(){ try{ if(TS.stream) camStop(); TS.track=await camStart('environment','dsv'); }catch(e){ toast('Kamera açılamadı: '+e.message); } },
  snap(){ const v=$('#dsv'); if(!v||!v.videoWidth) return; const sc=Math.min(1,1700/Math.max(v.videoWidth,v.videoHeight));
    const vw=v.videoWidth, vh=v.videoHeight, cx=vw*0.06, cy=vh*0.06; // çerçeve içini al
    const c=document.createElement('canvas'); c.width=Math.round((vw-2*cx)*sc); c.height=Math.round((vh-2*cy)*sc); const g=c.getContext('2d');
    g.drawImage(v,cx,cy,vw-2*cx,vh-2*cy,0,0,c.width,c.height);
    if(TS.f!=='orig'){ const im=g.getImageData(0,0,c.width,c.height), d=im.data; let sum=0; for(let i=0;i<d.length;i+=4) sum+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
      const avg=sum/(d.length/4);
      for(let i=0;i<d.length;i+=4){ let y=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        if(TS.f==='bw') y=y>avg*0.82?255:0; else { y=(y-avg*0.55)*255/(avg*0.95); y=Math.max(0,Math.min(255,y)); y=y>235?255:y; }
        d[i]=d[i+1]=d[i+2]=y; } g.putImageData(im,0,0); }
    TS.pages.push(c.toDataURL('image/jpeg',0.82)); sync('vibrate',{p:[40]}); vTool(true); },
  async save(){ const b=$('#dsS'); b.disabled=true; b.innerHTML='<div class="spin"></div> Kaydediliyor…';
    const r=await call('makePdf',{pages:TS.pages,name:($('#dsN')||{}).value||'Belge'}); b.disabled=false;
    if(r.error){ toast('Kaydedilemedi: '+r.error); return; } toast('Kaydedildi: '+r.path); TS.pages=[]; vTool(true); },
  stop(){ camStop(); }, pause(){ camStop(); }, onPerm(){ vTool(true); }});

// ---------------- Belgeler ve son tarihler ----------------
const DL_PRE=[['🚗','Araç muayenesi'],['🛡️','Trafik sigortası'],['🚘','Kasko'],['🏠','DASK'],['🛂','Pasaport'],['🪪','Ehliyet'],['🆔','Kimlik kartı'],['🧾','Garanti'],['💳','Kart son kullanma'],['🛢️','Yağ değişimi'],['🦷','Diş kontrolü'],['📄','Diğer']];
T('deadlines','gunluk','📆','Son tarihler','Muayene, sigorta, pasaport, garanti',{
  view(){ const L=LS.get('deadlines',[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
    V(`<button class="btn pri" style="margin-bottom:12px" onclick="TOOL.edit(null)">${ic('plus')} Tarih ekle</button>
      ${L.length?`<div class="list">${L.map(x=>{ const d=daysTo(x.date), col=d<0?'var(--bad)':d<=30?'var(--warn)':'var(--ac)';
        return `<button class="item" onclick="TOOL.edit(${x.id})"><div style="font-size:28px">${x.emoji}</div><div class="grow" style="min-width:0"><b class="ellip">${esc(x.t)}</b><div class="muted small">${new Date(x.date+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}${x.note?' · '+esc(x.note):''}</div></div>
          <div style="text-align:right;color:${col}"><b style="font-size:18px">${d<0?Math.abs(d):d}</b><div class="tiny">${d<0?'gün geçti':d===0?'BUGÜN':'gün kaldı'}</div></div></button>`; }).join('')}</div>`
      :`<div class="card empty">Henüz tarih yok.<br><span class="small">Araç muayenesi, sigorta, pasaport gibi kaçırmak istemediğin tarihleri ekle; önceden hatırlatayım.</span></div>`}`); },
  edit(id){ const x=id?LS.get('deadlines',[]).find(y=>y.id===id):{id:Date.now(),emoji:'🚗',t:'Araç muayenesi',date:'',before:7,note:''}; TS.e=Object.assign({},x); TS.isNew=!id; TOOL.draw(); },
  draw(){ const e=TS.e;
    openSheet(`<h4>${TS.isNew?'Yeni son tarih':'Düzenle'}</h4><div class="seg" style="margin:10px 0">${DL_PRE.map(([em,t])=>`<button class="${e.t===t?'on':''}" onclick="TS.e.emoji='${em}';TS.e.t='${t}';TS.e.date=$('#dlD').value;TOOL.draw()">${em} ${t}</button>`).join('')}</div>
      <input type="text" id="dlT" value="${esc(e.t)}" placeholder="Ad" style="margin-bottom:10px">${dateIn('dlD',e.date)}
      <label class="small muted" style="display:block;margin:12px 0 6px">Kaç gün önce hatırlatayım?</label><div class="seg">${[0,1,3,7,15,30].map(n=>`<button class="${e.before===n?'on':''}" onclick="TS.e.t=$('#dlT').value;TS.e.date=$('#dlD').value;TS.e.before=${n};TOOL.draw()">${n?n+' gün':'Hatırlatma'}</button>`).join('')}</div>
      <input type="text" id="dlN" value="${esc(e.note||'')}" placeholder="Not (ör. poliçe no, plaka)" style="margin:12px 0 14px">
      <div class="btns"><button class="btn pri" onclick="TOOL.ok()">Kaydet</button>${TS.isNew?'':`<button class="btn red sm" style="flex:0 0 auto" onclick="TOOL.del()">Sil</button>`}</div>`); },
  ok(){ const e=Object.assign(TS.e,{t:$('#dlT').value.trim()||TS.e.t,date:$('#dlD').value,note:$('#dlN').value.trim()}); if(!e.date){ toast('Tarih seç'); return; }
    const L=LS.get('deadlines',[]).filter(y=>y.id!==e.id); L.push(e); LS.set('deadlines',L); TOOL.syncRem(e); closeSheet(); toast('Kaydedildi'); vTool(true); },
  del(){ LS.set('deadlines',LS.get('deadlines',[]).filter(y=>y.id!==TS.e.id)); TOOL.syncRem(TS.e,true); closeSheet(); vTool(true); },
  syncRem(e,remove){ const R=(sync('reminders')||[]).filter(r=>r.id!=='dl'+e.id);
    if(!remove&&e.before){ const d=new Date(e.date+'T00:00'); d.setDate(d.getDate()-e.before); const ds=d.toISOString().slice(0,10);
      if(daysTo(ds)>=0) R.push({id:'dl'+e.id,text:`${e.t}: ${e.before} gün kaldı`,emoji:e.emoji,h:10,m:0,date:ds,once:true,on:true,note:new Date(e.date+'T00:00').toLocaleDateString('tr-TR')+(e.note?' · '+e.note:'')}); }
    sync('saveReminders',{list:R}); if(!remove&&e.before&&!INFO.notif) askNotif(); }});

// ---------------- Abonelikler ----------------
const SUB_PRE=[['🎬','Netflix'],['🎵','Spotify'],['▶️','YouTube Premium'],['🏰','Disney+'],['📦','Amazon Prime'],['📺','Exxen'],['🎞️','Max (BluTV)'],['☁️','iCloud / Google One'],['🏋️','Spor salonu'],['🌐','İnternet'],['📱','Telefon faturası'],['💡','Elektrik'],['🔥','Doğalgaz'],['💧','Su'],['📰','Diğer']];
T('subs','hesap','🔁','Abonelikler','Aylık ne kadar ödüyorum?',{
  view(){ const L=LS.get('subs',[]); const now=new Date();
    const nextPay=s=>{ let d=new Date(now.getFullYear(),now.getMonth(),Math.min(s.day,28)); if(s.cycle==='yıl') d=new Date(now.getFullYear(),(s.month||1)-1,Math.min(s.day,28)); d.setHours(0,0,0,0); const t=new Date(now); t.setHours(0,0,0,0);
      if(d<t){ if(s.cycle==='yıl') d.setFullYear(d.getFullYear()+1); else d.setMonth(d.getMonth()+1); } return d; };
    const monthly=L.reduce((a,s)=>a+(s.cycle==='yıl'?s.amt/12:s.amt),0);
    const S=L.map(s=>({s,n:nextPay(s)})).sort((a,b)=>a.n-b.n);
    V(`<div class="stats"><div class="stat"><span>Aylık</span><b>${tl(monthly)}</b></div><div class="stat"><span>Yıllık</span><b>${tl(monthly*12)}</b></div></div>
      <button class="btn pri" style="margin-bottom:12px" onclick="TOOL.edit(null)">${ic('plus')} Abonelik ekle</button>
      ${S.length?`<div class="list">${S.map(({s,n})=>{ const left=Math.round((n-new Date().setHours(0,0,0,0))/864e5); return `<button class="item" onclick="TOOL.edit(${s.id})"><div style="font-size:28px">${s.emoji}</div><div class="grow"><b>${esc(s.name)}</b><div class="muted small">${s.cycle==='yıl'?'Yılda bir':'Her ay'} · ${n.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})} (${left===0?'bugün':left+' gün sonra'})</div></div><div class="sz">${tl(s.amt)}</div></button>`; }).join('')}</div>
        <p class="muted tiny" style="margin:4px">Kullanmadığın aboneliği iptal et: yılda ${tl(monthly*12)} ödüyorsun.</p>`:'<div class="card empty">Henüz abonelik yok.</div>'}`); },
  edit(id){ const x=id?LS.get('subs',[]).find(y=>y.id===id):{id:Date.now(),emoji:'🎬',name:'Netflix',amt:'',cycle:'ay',day:new Date().getDate(),month:new Date().getMonth()+1}; TS.e=Object.assign({},x); TS.isNew=!id; TOOL.draw(); },
  keep(){ const e=TS.e; e.name=$('#sbN').value; e.amt=$('#sbA').value; e.day=parseInt($('#sbD').value)||1; },
  draw(){ const e=TS.e;
    openSheet(`<h4>${TS.isNew?'Yeni abonelik':'Düzenle'}</h4><div class="seg" style="margin:10px 0">${SUB_PRE.map(([em,t])=>`<button class="${e.name===t?'on':''}" onclick="TOOL.keep();TS.e.emoji='${em}';TS.e.name='${t}';TOOL.draw()">${em} ${t}</button>`).join('')}</div>
      <input type="text" id="sbN" value="${esc(e.name)}" placeholder="Ad" style="margin-bottom:10px"><input type="text" inputmode="decimal" id="sbA" value="${esc(String(e.amt).replace('.',','))}" placeholder="Tutar (₺)" style="margin-bottom:10px">
      <div class="seg" style="margin-bottom:10px"><button class="${e.cycle==='ay'?'on':''}" onclick="TOOL.keep();TS.e.cycle='ay';TOOL.draw()">Aylık</button><button class="${e.cycle==='yıl'?'on':''}" onclick="TOOL.keep();TS.e.cycle='yıl';TOOL.draw()">Yıllık</button></div>
      <div class="row" style="gap:8px;margin-bottom:14px"><span class="small" style="white-space:nowrap">Ödeme günü</span><input type="text" inputmode="numeric" id="sbD" value="${e.day}" style="max-width:90px">${e.cycle==='yıl'?`<select onchange="TOOL.keep();TS.e.month=+this.value">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${e.month===i+1?'selected':''}>${new Date(2026,i,1).toLocaleDateString('tr-TR',{month:'long'})}</option>`).join('')}</select>`:''}</div>
      <div class="btns"><button class="btn pri" onclick="TOOL.ok()">Kaydet</button>${TS.isNew?'':`<button class="btn red sm" style="flex:0 0 auto" onclick="TOOL.del()">Sil</button>`}</div>`); },
  ok(){ TOOL.keep(); const e=TS.e; e.amt=pf(e.amt); if(!(e.amt>0)){ toast('Tutar gir'); return; } e.day=Math.max(1,Math.min(31,e.day)); const L=LS.get('subs',[]).filter(y=>y.id!==e.id); L.push(e); LS.set('subs',L); closeSheet(); vTool(true); },
  del(){ LS.set('subs',LS.get('subs',[]).filter(y=>y.id!==TS.e.id)); closeSheet(); vTool(true); }});

// ---------------- GPS hız göstergesi ----------------
T('speedo','olcum','🏎️','Hız göstergesi','GPS ile hız, mesafe, rakım',{
  view(){
    const p=needPerm2('android.permission.ACCESS_FINE_LOCATION','GPS ile hızını ölçmek için konum gerekli. Konum hiçbir yere gönderilmez.'); if(p){ V(p); return; }
    const S=TS; S.max=S.max||0; S.dist=S.dist||0;
    V(`<div class="card" style="text-align:center"><div id="spV">${big(S.v!=null?Math.round(S.v):'—','km/sa',S.v==null?'GPS sinyali bekleniyor… (açık alanda daha hızlı)':'')}</div>
      <div class="stats" style="margin-top:12px"><div class="stat"><span>En yüksek</span><b id="spM">${Math.round(S.max)} km/sa</b></div><div class="stat"><span>Mesafe</span><b id="spD">${S.dist<1000?Math.round(S.dist)+' m':num(S.dist/1000,2)+' km'}</b></div></div>
      <div class="row small muted" style="justify-content:space-around"><span>Rakım <b id="spA">—</b></span><span>Hassasiyet <b id="spC">—</b></span></div></div>
      <div class="btns"><button class="btn" onclick="TS.max=0;TS.dist=0;TS.last=null;vTool(true)">Sıfırla</button><button class="btn pri" onclick="TOOL.hud()">Ön cama yansıt (HUD)</button></div>
      <p class="muted tiny" style="margin:10px 4px">GPS hızı araç göstergesinden biraz farklı olabilir (araç göstergeleri genelde biraz fazla gösterir). Sürerken telefona bakma; HUD modunda telefonu ön cam dibine koy.</p>`);
    if(!TS.on){ TS.on=sync('sensorStart',{kind:'gps'}); if(!TS.on) toast('GPS başlatılamadı (konum kapalı olabilir)'); } },
  onSensor(k,v){ if(k!=='gps') return; const [sp,alt,acc,,lat,lon]=v; const S=TS;
    S.v=sp>=0?sp*3.6:null; if(S.v!=null&&acc<25) S.max=Math.max(S.max,S.v);
    const p={lat,lon}; if(S.last&&acc<25){ const d=hav(S.last,p); if(d>2&&d<200) S.dist+=d; } if(acc<25) S.last=p;
    const e=$('#spV'); if(e){ e.innerHTML=big(S.v!=null?Math.round(S.v):'—','km/sa',''); $('#spM').textContent=Math.round(S.max)+' km/sa'; $('#spD').textContent=S.dist<1000?Math.round(S.dist)+' m':num(S.dist/1000,2)+' km'; $('#spA').textContent=alt!=null?Math.round(alt)+' m':'—'; $('#spC').textContent='±'+Math.round(acc)+' m'; }
    const h=$('#hudV'); if(h) h.textContent=S.v!=null?Math.round(S.v):'—'; },
  hud(){ overlay(`<div style="position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;transform:scaleY(-1)"><div style="text-align:center;color:#4FD1A5"><div id="hudV" style="font:900 ${Math.round(innerWidth/2.2)}px system-ui;line-height:1">—</div><div style="font:700 32px system-ui">km/sa</div></div></div>`,()=>closeOverlay()); },
  onPerm(){ vTool(true); }, stop(){ TS.on=false; sync('sensorStop'); }, pause(){ TS.on=false; }});

// ---------------- Barometre ----------------
T('barometer','olcum','🌡️','Barometre ve rakım','Hava basıncı, yükseklik',{need:()=>(sync('sensors')||{}).pressure,sensor:'pressure',
  view(){ V(`<div class="card"><div id="bpV">${big('—','hPa')}</div><div class="kv"><span>Tahmini rakım</span><span id="bpA">—</span></div><div class="kv"><span>Bu oturumdaki değişim</span><span id="bpT">—</span></div></div>
      <div class="card"><b class="small">Son dakikalar</b><svg id="bpG" viewBox="0 0 300 80" style="width:100%;height:90px;margin-top:8px"></svg></div>
      <p class="muted tiny" style="margin:4px">Rakım, deniz seviyesi standart basıncına göre tahmindir; hava durumuna göre ±50 m sapabilir. Basınç hızla düşüyorsa yağış/fırtına olasılığı artar. Asansörde veya merdivende kat değişimini bile görebilirsin.</p>`); TS.h=[]; },
  onSensor(k,v){ const [p,alt]=v; TS.first=TS.first??p; TS.h.push(p); if(TS.h.length>300) TS.h.shift(); const e=$('#bpV'); if(!e) return;
    e.innerHTML=big(num(p,1),'hPa',p>1022?'Yüksek basınç: genelde açık hava':p<1009?'Alçak basınç: yağış olasılığı':'Normal basınç'); $('#bpA').textContent=Math.round(alt)+' m';
    const dlt=p-TS.first; $('#bpT').textContent=(dlt>=0?'+':'')+num(dlt,2)+' hPa (~'+Math.round(-dlt*8.3)+' m)';
    const mn=Math.min(...TS.h)-0.05, mx=Math.max(...TS.h)+0.05; const g=$('#bpG'); if(g&&TS.h.length%3===0) g.innerHTML=`<polyline fill="none" stroke="var(--blue)" stroke-width="2.5" points="${TS.h.map((x,i)=>`${i*300/Math.max(1,TS.h.length-1)},${80-(x-mn)/(mx-mn)*76}`).join(' ')}"/>`; }});

// ---------------- Hız testi ----------------
T('bench','test','🚀','Hız testi','Depolama ve işlemci',{
  view(){ const H=LS.get('bench',[]);
    V(`<div class="card"><p class="small muted" style="margin-bottom:12px">Depolamaya 256 MB yazıp okur, işlemciyi 2 saniye zorlar. Telefon yavaşladıysa veya ısınma sonrası performansı karşılaştırmak için kullan. ~10 sn sürer, geçici dosya silinir.</p>
      <button class="btn pri" id="bnB" onclick="TOOL.run()">Testi başlat</button><p class="muted small" id="bnP" style="text-align:center;margin-top:8px"></p></div>
      ${H.length?`<h3>Sonuçlar</h3>${H.slice().reverse().map((r,i)=>`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>${i===0?'Son test':new Date(r.at).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</b><span class="muted tiny">${new Date(r.at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div class="kv"><span>Sıralı yazma</span><span>${num(r.write,0)} MB/sn</span></div><div class="kv"><span>Sıralı okuma</span><span>${num(r.read,0)} MB/sn</span></div><div class="kv"><span>Küçük dosya (4K)</span><span>${num(r.iops,0)} işlem/sn</span></div>
        <div class="kv"><span>İşlemci (tek çekirdek)</span><span>${num(r.single,0)} puan</span></div><div class="kv"><span>İşlemci (${r.cores} çekirdek)</span><span>${num(r.multi,0)} puan</span></div></div>`).join('')}
        <p class="muted tiny" style="margin:4px">Okuma hızı telefonun önbelleği yüzünden olduğundan yüksek görünebilir. Puanlar sadece aynı telefonda karşılaştırma içindir.</p>`:''}`); },
  async run(){ const b=$('#bnB'); b.disabled=true; b.innerHTML='<div class="spin"></div> Test ediliyor…';
    const s=await call('bench',{},t=>{ const e=$('#bnP'); if(e) e.textContent=t; }); const e=$('#bnP'); if(e) e.textContent='İşlemci testi…';
    const c=await call('cpuBench'); if(s.error||c.error){ toast('Test yapılamadı: '+(s.error||c.error)); vTool(true); return; }
    const H=LS.get('bench',[]); H.push(Object.assign({at:Date.now()},s,c)); LS.set('bench',H.slice(-8)); vTool(true); }});

// ---------------- Renk seçici ----------------
const CNAMES=[['Kırmızı',[220,40,40]],['Turuncu',[245,140,30]],['Sarı',[245,215,40]],['Yeşil',[50,170,70]],['Açık yeşil',[150,215,90]],['Turkuaz',[40,190,190]],['Mavi',[40,100,220]],['Lacivert',[25,35,100]],['Mor',[130,60,170]],['Pembe',[240,130,180]],['Kahverengi',[120,75,40]],['Bej',[225,205,170]],['Beyaz',[245,245,245]],['Gri',[128,128,128]],['Siyah',[20,20,20]],['Bordo',[120,20,40]],['Haki',[120,120,60]]];
T('colorpick','diger','🎨','Renk seçici','Kameradaki rengin kodu',{
  view(){ const p=needPerm2('android.permission.CAMERA','Rengi okumak için kamera gerekli. Görüntü kaydedilmez.'); if(p){ V(p); return; }
    V(`<div style="position:relative;border-radius:20px;overflow:hidden;background:#000;height:50vh"><video id="cpv" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #000"></div></div>
      <div class="card row" style="margin-top:12px"><div id="cpS" style="width:72px;height:72px;border-radius:18px;flex:none;border:1px solid var(--line)"></div><div class="grow"><b id="cpN" style="font-size:20px">—</b><div id="cpH" class="muted" style="font-family:ui-monospace,monospace"></div></div><button class="btn sm" onclick="sync('copy',{text:TS.hex||''});toast('Kopyalandı: '+(TS.hex||''))">Kopyala</button></div>
      <button class="btn" onclick="TS.frz=!TS.frz;this.textContent=TS.frz?'Devam':'Dondur'">Dondur</button>`);
    TOOL.go(); },
  async go(){ try{ await camStart('environment','cpv'); }catch(e){ toast('Kamera açılamadı'); return; } const c=document.createElement('canvas'), g=c.getContext('2d',{willReadFrequently:true}); c.width=c.height=9;
    clearInterval(TS.iv); TS.iv=setInterval(()=>{ const v=$('#cpv'); if(!v||!v.videoWidth||TS.frz) return; g.drawImage(v,v.videoWidth/2-4,v.videoHeight/2-4,9,9,0,0,9,9);
      const d=g.getImageData(0,0,9,9).data; let r=0,gg=0,b=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; gg+=d[i+1]; b+=d[i+2]; } const n=d.length/4; r=Math.round(r/n); gg=Math.round(gg/n); b=Math.round(b/n);
      const hex='#'+[r,gg,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase(); TS.hex=hex;
      const nm=CNAMES.reduce((best,[t,[R,G,B]])=>{ const dd=(R-r)**2+(G-gg)**2+(B-b)**2; return dd<best[1]?[t,dd]:best; },['',1e9])[0];
      $('#cpS').style.background=hex; $('#cpN').textContent=nm; $('#cpH').textContent=`${hex} · rgb(${r}, ${gg}, ${b})`; },200); },
  stop(){ clearInterval(TS.iv); camStop(); }, pause(){ TOOL.stop(); }, onPerm(){ vTool(true); }});

// ---------------- Dünya saati ----------------
const ZONES=[['İstanbul','Europe/Istanbul'],['Londra','Europe/London'],['Berlin','Europe/Berlin'],['Paris','Europe/Paris'],['Amsterdam','Europe/Amsterdam'],['Moskova','Europe/Moscow'],['Bakü','Asia/Baku'],['Tahran','Asia/Tehran'],['Dubai','Asia/Dubai'],['Mekke','Asia/Riyadh'],['Taşkent','Asia/Tashkent'],['Delhi','Asia/Kolkata'],['Pekin','Asia/Shanghai'],['Tokyo','Asia/Tokyo'],['Seul','Asia/Seoul'],['Sidney','Australia/Sydney'],['New York','America/New_York'],['Chicago','America/Chicago'],['Los Angeles','America/Los_Angeles'],['Toronto','America/Toronto'],['São Paulo','America/Sao_Paulo'],['Kahire','Africa/Cairo']];
T('worldclock','gunluk','🌍','Dünya saati','Şehirlerde saat kaç?',{
  view(){ const F=LS.get('zones',['Europe/London','Europe/Berlin','America/New_York','Asia/Tokyo']); const now=new Date();
    const off=z=>{ const a=new Date(now.toLocaleString('en-US',{timeZone:z})), b=new Date(now.toLocaleString('en-US')); return Math.round((a-b)/36e5*2)/2; };
    const row=([n,z])=>{ const t=now.toLocaleTimeString('tr-TR',{timeZone:z,hour:'2-digit',minute:'2-digit'}), h=+now.toLocaleString('en-US',{timeZone:z,hour:'numeric',hour12:false}), o=off(z);
      return `<div class="item"><div style="font-size:24px">${h>=7&&h<19?'☀️':'🌙'}</div><div class="grow"><b>${n}</b><div class="muted tiny">${o===0?'Seninle aynı':(o>0?'+':'')+String(o).replace('.',',')+' saat'} · ${now.toLocaleDateString('tr-TR',{timeZone:z,weekday:'short',day:'numeric',month:'short'})}</div></div><b style="font-size:24px;font-variant-numeric:tabular-nums">${t}</b>
        <button class="muted" style="padding:8px" onclick="TOOL.tg('${z}')">${F.includes(z)?ic('x'):ic('plus')}</button></div>`; };
    V(`<div class="list">${ZONES.filter(x=>F.includes(x[1])).map(row).join('')||'<div class="item muted">Aşağıdan şehir ekle</div>'}</div><h3>Diğer şehirler</h3><div class="list">${ZONES.filter(x=>!F.includes(x[1])).map(row).join('')}</div>`);
    clearInterval(TS.iv); TS.iv=setInterval(()=>{ if(!sheetOpen()){ const y=scrollY; vTool(true); scrollTo(0,y);} },30000); },
  tg(z){ const F=LS.get('zones',['Europe/London','Europe/Berlin','America/New_York','Asia/Tokyo']); const i=F.indexOf(z); i>=0?F.splice(i,1):F.push(z); LS.set('zones',F); vTool(true); },
  stop(){ clearInterval(TS.iv); }});

// ---------------- Hazır metinler ----------------
T('snippets','diger','📋','Hazır metinler','IBAN, adres… tek dokunuşla kopyala',{
  view(){ const L=LS.get('snips',[]);
    V(`<p class="muted small" style="margin:4px 4px 12px">Sık yazdığın şeyleri kaydet; dokununca panoya kopyalanır, istediğin yere yapıştırırsın.</p>
      ${L.length?`<div class="list">${L.map((s,i)=>`<div class="item"><button class="grow" style="text-align:left;min-width:0" onclick="sync('copy',{text:LS.get('snips',[])[${i}].v});toast('Kopyalandı: ${esc(s.t).replace(/'/g,'')}')"><b>${esc(s.t)}</b><div class="muted small ellip">${esc(s.v)}</div></button><button class="btn sm ghost" style="width:46px;padding:0" onclick="TOOL.edit(${i})">✎</button></div>`).join('')}</div>`:'<div class="card empty">Henüz metin yok.<br><span class="small">Örn: IBAN numaran, ev adresin, e-posta adresin, vergi numaran</span></div>'}
      <button class="btn pri" style="margin-top:12px" onclick="TOOL.edit(-1)">${ic('plus')} Metin ekle</button>`); },
  edit(i){ const s=i>=0?LS.get('snips',[])[i]:{t:'',v:''};
    openSheet(`<h4>${i>=0?'Düzenle':'Yeni metin'}</h4><input type="text" id="snT" value="${esc(s.t)}" placeholder="Başlık (ör. IBAN — Ziraat)" style="margin:10px 0"><textarea id="snV" placeholder="Metin" style="width:100%;min-height:110px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:12px;margin-bottom:14px">${esc(s.v)}</textarea>
      <div class="btns"><button class="btn pri" onclick="TOOL.ok(${i})">Kaydet</button>${i>=0?`<button class="btn red sm" style="flex:0 0 auto" onclick="const L=LS.get('snips',[]);L.splice(${i},1);LS.set('snips',L);closeSheet();vTool(true)">Sil</button>`:''}</div>`); },
  ok(i){ const t=$('#snT').value.trim(), v=$('#snV').value; if(!v.trim()){ toast('Metin boş'); return; } const L=LS.get('snips',[]); const s={t:t||v.slice(0,30),v}; if(i>=0) L[i]=s; else L.push(s); LS.set('snips',L); closeSheet(); vTool(true); }});

// ---------------- Mevduat getirisi ----------------
T('deposit','hesap','🏦','Mevduat getirisi','Faiz ve stopaj sonrası net',{
  view(){ const o=LS.get('dep',{});
    V(`<div class="card">${field('dA','Anapara (₺)',o.a||'','100000')}${field('dR','Yıllık faiz oranı (%)',o.r||'','45')}${field('dG','Vade (gün)',o.g||'32','32','numeric')}${field('dS','Stopaj (%)',o.s||'15','15')}${resBox('dRes')}</div>
      <p class="muted tiny" style="margin:4px">Stopaj oranı vadeye ve döneme göre değişir; bankanın uyguladığı oranı yaz. Yıllık bileşik tahmin her vade sonunda faizin yeniden yatırıldığını varsayar.</p>`); TOOL.calc(); },
  calc(){ const a=val('dA'), r=val('dR')/100, g=val('dG'), s=(val('dS')||0)/100; LS.set('dep',{a:$('#dA').value,r:$('#dR').value,g:$('#dG').value,s:$('#dS').value});
    if(!(a>0&&r>0&&g>0)){ setRes('dRes','Değerleri gir.'); return; } const brut=a*r*g/365, net=brut*(1-s), n=365/g, yearly=a*(Math.pow(1+net/a,n)-1);
    setRes('dRes',`<b style="font-size:22px">Net getiri: ${tl(net)}</b><br>Brüt: ${tl(brut)} · Stopaj: ${tl(brut-net)}<br>Vade sonu: <b>${tl(a+net)}</b><br><span class="small">Aynı oranla 1 yıl döndürürsen ~${tl(yearly)} net kazanç (yıllık net %${num(yearly/a*100,1)})</span>`); }});

// ---------------- QR okuyucuya barkod desteği ----------------
(function(){ const q=TOOLS.qrscan; if(!q||!('BarcodeDetector' in window)) return; const orig=q.cam;
  q.cam=async function(){ await orig.call(this); try{ const bd=new BarcodeDetector(); TS.bd=setInterval(async()=>{ const v=$('#qv'); if(!v||!v.videoWidth||!TS.stream) return;
      try{ const r=await bd.detect(v); if(r&&r.length&&r[0].rawValue){ clearInterval(TS.bd); sync('vibrate',{p:[60]}); TS.res=r[0].rawValue+(r[0].format&&r[0].format!=='qr_code'?'':''); TOOLS.qrscan.stop(); vTool(true); } }catch(e){} },400); }catch(e){} };
  const st=q.stop; q.stop=function(){ clearInterval(TS.bd); st.call(this); };
  q.t='QR ve barkod okuyucu'; q.d='Link, Wi-Fi, ürün barkodu'; })();

// ---------------- Ekran kapanıp açılınca sensörleri yeniden başlat ----------------
(function(){ const prev=window.__onResume; window.__onResume=function(){ if(TOOL&&TOOL.sensor&&stack[stack.length-1]==='tool') sync('sensorStart',{kind:TOOL.sensor}); if(prev) prev(); }; })();
