'use strict';
// =====================================================================
//  v6: ses kaydedici, hatırlatıcılar, gelir-gider defteri, acil durum kartı, park yeri, doğum günleri
// =====================================================================
const pad2=n=>String(n).padStart(2,'0');
const mmss=ms=>{ const s=Math.floor(ms/1000); return (s>=3600?Math.floor(s/3600)+':':'')+pad2(Math.floor(s/60)%60)+':'+pad2(s%60); };
const DAYN=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const dayTxt2=d=>!d||!d.length||d.length===7?'Her gün':(d.length===5&&!d.includes(6)&&!d.includes(7)?'Hafta içi':(d.length===2&&d.includes(6)&&d.includes(7)?'Hafta sonu':d.map(x=>DAYN[x-1]).join(', ')));

// ---------------- Ses kaydedici ----------------
T('recorder','gunluk','🎙️','Ses kaydedici','Ekran kapalıyken de kaydeder',{
  view(){
    const p=needPerm2('android.permission.RECORD_AUDIO','Ses kaydı için mikrofon gerekli. Kayıtlar sadece telefonuna kaydedilir.'); if(p){ V(p); return; }
    const st=sync('recState')||{}; const L=sync('recList')||[];
    V(`<div class="card" style="text-align:center">
        <div id="rcT" style="font-size:56px;font-weight:800;font-variant-numeric:tabular-nums;margin:6px 0">${st.on?mmss(st.ms):'00:00'}</div>
        <div class="bar" style="height:12px;margin:4px 20px 18px"><i id="rcL" style="width:0;background:var(--bad)"></i></div>
        ${st.on?'':`<input type="text" id="rcN" placeholder="Kayıt adı (isteğe bağlı)" style="margin-bottom:12px">`}
        <button onclick="TOOL.tg()" style="width:96px;height:96px;border-radius:50%;background:${st.on?'var(--card2)':'var(--bad)'};border:6px solid ${st.on?'var(--bad)':'var(--card2)'};display:inline-flex;align-items:center;justify-content:center">
          ${st.on?'<span style="width:30px;height:30px;border-radius:6px;background:var(--bad)"></span>':'<span style="width:34px;height:34px;border-radius:50%;background:#fff"></span>'}</button>
        <p class="muted small" style="margin-top:10px">${st.on?'Kaydediliyor… Ekranı kapatabilirsin; bildirimden de durdurabilirsin.':'Kaydetmek için dokun'}</p>
        ${st.error?`<div class="note warn" style="margin-top:12px;text-align:left">${ic('warn')}<div class="small">${esc(st.error)}</div></div>`:''}</div>
      <h3>Kayıtlar (${L.length})</h3>
      ${L.length?`<div class="list">${L.map(r=>`<div class="item" style="flex-wrap:wrap"><div class="grow" style="min-width:0"><div class="ellip" style="font-weight:700">${esc(r.name.replace(/\.m4a$/,''))}</div><div class="muted tiny">${mmss(r.dur)} · ${bytes(r.size)} · ${new Date(r.date).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
        <button class="btn sm ghost" style="width:46px;padding:0" onclick="TOOL.more(${r.id})">⋯</button>
        <audio controls preload="none" src="/media/${r.id}" style="width:100%;height:40px;margin-top:8px"></audio></div>`).join('')}</div>
        <p class="muted tiny" style="margin:0 4px">Dosyalar: ${INFO.sdk>=31?'Kayıtlar':'Müzik'}/AracKutusu klasöründe.</p>`:'<div class="card empty">Henüz kayıt yok.</div>'}`);
    clearInterval(TS.iv); if(st.on) TS.iv=setInterval(()=>TOOL.tick(),250);
  },
  tick(){ const s=sync('recState')||{}; if(!s.on){ clearInterval(TS.iv); vTool(true); return; }
    const t=$('#rcT'); if(t) t.textContent=mmss(s.ms); const l=$('#rcL'); if(l) l.style.width=Math.min(100,Math.sqrt(s.amp/32767)*120)+'%'; },
  tg(){ const s=sync('recState')||{};
    if(s.on){ sync('recStop'); setTimeout(()=>vTool(true),600); }
    else { sync('recStart',{name:($('#rcN')||{}).value||'Kayıt'}); setTimeout(()=>vTool(true),500); } },
  more(id){ const r=(sync('recList')||[]).find(x=>x.id===id); if(!r) return;
    openSheet(`<h4 style="word-break:break-all">${esc(r.name)}</h4><input type="text" id="rnN" value="${esc(r.name.replace(/\.m4a$/,''))}" style="margin:12px 0">
      <div class="btns"><button class="btn" onclick="if(sync('recRename',{id:${id},name:$('#rnN').value})){closeSheet();vTool(true)}else toast('Ad değiştirilemedi')">Adı kaydet</button><button class="btn" onclick="closeSheet();sync('recShare',{id:${id}})">Paylaş</button></div>
      <button class="btn red" style="margin-top:10px" onclick="if(sync('recDelete',{id:${id}})){closeSheet();toast('Kayıt silindi');vTool(true)}else toast('Silinemedi')">Sil</button>`); },
  onPerm(){ vTool(true); }, stop(){ clearInterval(TS.iv); }, pause(){ clearInterval(TS.iv); }});

// ---------------- Hatırlatıcılar ----------------
const REM_EMO=['💊','🪴','💧','💳','🐶','🏋️','📞','🛒','🎂','🚗','📚','⏰'];
T('reminders','gunluk','⏰','Hatırlatıcılar','İlaç, sulama, fatura…',{
  view(){ const L=sync('reminders')||[];
    V(`${!INFO.notif?`<div class="note warn">${ic('warn')}<div class="small">Hatırlatma bildirimi gösterebilmem için <b>bildirim izni</b> gerekli. <button class="link tiny" style="padding:0" onclick="askNotif()">İzin ver</button></div></div>`:''}
      ${!INFO.exact?`<div class="note warn">${ic('warn')}<div class="small">Tam saatinde çalması için <b>"Alarmlar ve hatırlatıcılar"</b> izni gerekli. <button class="link tiny" style="padding:0" onclick="sync('openPerm',{which:'exactAlarm'})">Ver</button></div></div>`:''}
      <button class="btn pri" style="margin-bottom:12px" onclick="TOOL.edit(-1)">${ic('plus')} Hatırlatıcı ekle</button>
      ${L.length?`<div class="list">${L.map((r,i)=>`<div class="item"><button class="grow row" style="text-align:left;gap:12px;min-width:0" onclick="TOOL.edit(${i})"><div style="font-size:30px">${r.emoji||'⏰'}</div><div style="min-width:0"><div class="ellip" style="font-weight:700;${r.on===false?'color:var(--tx3)':''}">${esc(r.text)}</div><div class="muted small">${pad2(r.h)}:${pad2(r.m)} · ${r.once?'Bir kez':dayTxt2(r.days)}${r.note?' · '+esc(r.note):''}</div></div></button>
        <div class="sw ${r.on!==false?'on':''}" onclick="TOOL.tog(${i})"></div></div>`).join('')}</div>`:`<div class="card empty">Henüz hatırlatıcı yok.<br><span class="small">Örn: "Tansiyon ilacı" her gün 09:00 · "Çiçekleri sula" Pzt-Per 19:00</span></div>`}
      ${L.length&&INFO.xiaomi?`<p class="muted tiny" style="margin:8px 4px">Xiaomi bildirimi geciktirirse: <button class="link tiny" style="padding:0" onclick="sync('openPerm',{which:'autostart'})">Otomatik başlatma</button> ve <button class="link tiny" style="padding:0" onclick="sync('openPerm',{which:'batteryApps'})">Pil: Kısıtlama yok</button> ayarlarını aç.</p>`:''}`); },
  save(L){ sync('saveReminders',{list:L}); },
  tog(i){ const L=sync('reminders')||[]; L[i].on=L[i].on===false; TOOL.save(L); vTool(true); },
  edit(i){ const L=sync('reminders')||[]; TS.e=i>=0?Object.assign({},L[i]):{id:'r'+Date.now().toString(36),text:'',emoji:'💊',h:9,m:0,days:[],on:true,once:false,note:''}; TS.ei=i; TOOL.draw(); },
  draw(){ const e=TS.e;
    openSheet(`<h4>${TS.ei>=0?'Hatırlatıcıyı düzenle':'Yeni hatırlatıcı'}</h4>
      <input type="text" id="reT" placeholder="Ne hatırlatılsın? (ör. Tansiyon ilacı)" value="${esc(e.text)}" oninput="TS.e.text=this.value" style="margin:10px 0">
      <div class="seg" style="margin-bottom:12px">${REM_EMO.map(x=>`<button class="${e.emoji===x?'on':''}" style="min-width:48px;font-size:20px;padding:0 8px" onclick="TS.e.emoji='${x}';TOOL.draw()">${x}</button>`).join('')}</div>
      <input type="time" value="${pad2(e.h)}:${pad2(e.m)}" onchange="const p=this.value.split(':');TS.e.h=+p[0];TS.e.m=+p[1]" style="margin-bottom:12px">
      <div class="seg" style="margin-bottom:10px"><button class="${!e.once?'on':''}" onclick="TS.e.once=false;TOOL.draw()">Tekrarla</button><button class="${e.once?'on':''}" onclick="TS.e.once=true;TOOL.draw()">Bir kez</button></div>
      ${e.once?'':`<div class="seg" style="margin-bottom:12px">${DAYN.map((n,k)=>`<button class="${(e.days||[]).includes(k+1)?'on':''}" style="min-width:52px;padding:0 8px" onclick="TOOL.day(${k+1})">${n}</button>`).join('')}</div><p class="muted tiny" style="margin:-4px 0 12px">Gün seçmezsen her gün.</p>`}
      <input type="text" id="reN" placeholder="Not (isteğe bağlı, ör. tok karnına)" value="${esc(e.note||'')}" oninput="TS.e.note=this.value" style="margin-bottom:14px">
      <div class="btns"><button class="btn pri" onclick="TOOL.ok()">Kaydet</button><button class="btn sm" style="flex:0 0 auto" onclick="sync('testReminder',{r:TS.e});toast('Deneme bildirimi gönderildi')">Dene</button>${TS.ei>=0?`<button class="btn red sm" style="flex:0 0 auto" onclick="TOOL.del()">Sil</button>`:''}</div>`); },
  day(n){ const d=TS.e.days=TS.e.days||[]; const i=d.indexOf(n); i>=0?d.splice(i,1):d.push(n); d.sort(); TOOL.draw(); },
  ok(){ const e=TS.e; e.text=(e.text||'').trim(); if(!e.text){ toast('Ne hatırlatılacağını yaz'); return; } e.on=true; const L=sync('reminders')||[];
    if(TS.ei>=0) L[TS.ei]=e; else L.push(e); L.sort((a,b)=>a.h*60+a.m-(b.h*60+b.m)); TOOL.save(L); closeSheet(); toast('Kaydedildi'); if(!INFO.notif) askNotif(); vTool(true); },
  del(){ const L=sync('reminders')||[]; L.splice(TS.ei,1); TOOL.save(L); closeSheet(); toast('Silindi'); vTool(true); }});

// ---------------- Gelir-gider defteri ----------------
const ECAT={gider:[['🛒','Market'],['🧾','Fatura'],['🏠','Kira'],['🚌','Ulaşım'],['⛽','Yakıt'],['🍔','Yemek'],['👕','Giyim'],['💊','Sağlık'],['🎬','Eğlence'],['📱','Telefon/internet'],['🎓','Eğitim'],['📦','Diğer']],
  gelir:[['💼','Maaş'],['💰','Ek gelir'],['🎁','Hediye'],['📦','Diğer']]};
const tl=n=>num(n,2)+' ₺';
T('money','hesap','💰','Gelir-gider defteri','Aylık harcamalarını takip et',{
  view(){ const E=LS.get('money',[]); const now=new Date(); TS.y=TS.y??now.getFullYear(); TS.mo=TS.mo??now.getMonth();
    const key=`${TS.y}-${pad2(TS.mo+1)}`, M=E.filter(e=>e.d.startsWith(key));
    const inc=M.filter(e=>e.t==='gelir').reduce((s,e)=>s+e.amt,0), exp=M.filter(e=>e.t==='gider').reduce((s,e)=>s+e.amt,0);
    const byCat={}; M.filter(e=>e.t==='gider').forEach(e=>byCat[e.cat]=(byCat[e.cat]||0)+e.amt); const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const days={}; M.slice().sort((a,b)=>b.d.localeCompare(a.d)||b.id-a.id).forEach(e=>(days[e.d]=days[e.d]||[]).push(e));
    const em=c=>([...ECAT.gider,...ECAT.gelir].find(x=>x[1]===c)||['📦'])[0];
    V(`<div class="row" style="justify-content:space-between;margin-bottom:12px"><button class="btn sm" style="width:52px" onclick="TOOL.mv(-1)">‹</button><b style="font-size:18px">${new Date(TS.y,TS.mo,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</b><button class="btn sm" style="width:52px" onclick="TOOL.mv(1)">›</button></div>
      <div class="stats"><div class="stat"><span>Gelir</span><b style="color:var(--ac)">${tl(inc)}</b></div><div class="stat"><span>Gider</span><b style="color:var(--bad)">${tl(exp)}</b></div></div>
      <div class="card" style="text-align:center;padding:12px"><span class="muted small">Kalan</span><div style="font-size:28px;font-weight:800;color:${inc-exp>=0?'var(--ac)':'var(--bad)'}">${tl(inc-exp)}</div></div>
      <div class="btns" style="margin-bottom:12px"><button class="btn red" onclick="TOOL.add('gider')">− Gider</button><button class="btn pri" onclick="TOOL.add('gelir')">+ Gelir</button></div>
      ${cats.length?`<div class="card"><b>Nereye harcadım?</b>${cats.map(([c,v])=>`<div style="margin-top:10px"><div class="row small" style="justify-content:space-between"><span>${em(c)} ${esc(c)}</span><span><b>${tl(v)}</b> <span class="muted">%${Math.round(v/exp*100)}</span></span></div><div class="bar" style="height:7px;margin-top:4px"><i style="width:${v/exp*100}%;background:var(--warn)"></i></div></div>`).join('')}</div>`:''}
      ${Object.keys(days).length?Object.entries(days).map(([d,L])=>`<h3>${new Date(d+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'})}</h3><div class="list">${L.map(e=>`<button class="item" onclick="TOOL.edit(${e.id})"><div style="font-size:24px">${em(e.cat)}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(e.cat)}</div>${e.note?`<div class="muted tiny ellip">${esc(e.note)}</div>`:''}</div><div class="sz" style="color:${e.t==='gelir'?'var(--ac)':'var(--tx)'}">${e.t==='gelir'?'+':'−'}${tl(e.amt)}</div></button>`).join('')}</div>`).join(''):'<div class="card empty">Bu ay kayıt yok.</div>'}
      ${E.length?`<button class="btn ghost" style="margin-top:12px" onclick="TOOL.csv()">Excel için dışa aktar (CSV)</button>`:''}`); },
  mv(d){ TS.mo+=d; if(TS.mo<0){ TS.mo=11; TS.y--; } if(TS.mo>11){ TS.mo=0; TS.y++; } vTool(true); },
  add(t){ TS.e={id:Date.now(),t,amt:'',cat:ECAT[t][0][1],note:'',d:new Date().toISOString().slice(0,10)}; TS.new=true; TOOL.draw(); },
  edit(id){ const e=LS.get('money',[]).find(x=>x.id===id); if(!e) return; TS.e=Object.assign({},e); TS.new=false; TOOL.draw(); },
  draw(){ const e=TS.e;
    openSheet(`<h4>${e.t==='gelir'?'Gelir':'Gider'} ${TS.new?'ekle':'düzenle'}</h4>
      <input type="text" inputmode="decimal" id="mA" placeholder="Tutar (₺)" value="${e.amt===''?'':String(e.amt).replace('.',',')}" style="margin:10px 0;font-size:24px;font-weight:700">
      <div class="seg" style="margin-bottom:12px">${ECAT[e.t].map(([x,c])=>`<button class="${e.cat===c?'on':''}" onclick="TS.e.amt=$('#mA').value;TS.e.note=$('#mN').value;TS.e.cat='${c}';TOOL.draw()">${x} ${c}</button>`).join('')}</div>
      <input type="text" id="mN" placeholder="Not (isteğe bağlı)" value="${esc(e.note)}" style="margin-bottom:10px">
      <input type="date" id="mD" value="${e.d}" style="color-scheme:dark;width:100%;min-height:50px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg2);color:var(--tx);font:inherit;padding:0 10px;margin-bottom:14px">
      <div class="btns"><button class="btn pri" onclick="TOOL.ok()">Kaydet</button>${TS.new?'':`<button class="btn red sm" style="flex:0 0 auto" onclick="TOOL.del()">Sil</button>`}</div>`);
    setTimeout(()=>{ const a=$('#mA'); if(a&&TS.new&&!a.value) a.focus(); },250); },
  ok(){ const a=pf($('#mA').value); if(!(a>0)){ toast('Tutar gir'); return; } const e=Object.assign(TS.e,{amt:Math.round(a*100)/100,note:$('#mN').value.trim(),d:$('#mD').value||TS.e.d});
    const E=LS.get('money',[]); const i=E.findIndex(x=>x.id===e.id); if(i>=0) E[i]=e; else E.push(e); LS.set('money',E); closeSheet(); vTool(true); },
  del(){ LS.set('money',LS.get('money',[]).filter(x=>x.id!==TS.e.id)); closeSheet(); toast('Silindi'); vTool(true); },
  csv(){ const E=LS.get('money',[]).slice().sort((a,b)=>a.d.localeCompare(b.d)); const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
    const txt='﻿Tarih;Tür;Kategori;Tutar;Not\n'+E.map(e=>[e.d,e.t,q(e.cat),String(e.amt).replace('.',','),q(e.note)].join(';')).join('\n');
    call('saveFile',{name:'gelir-gider-'+new Date().toISOString().slice(0,10)+'.csv',text:txt,mime:'text/csv'}).then(r=>toast(r.error?'Kaydedilemedi':'Kaydedildi: '+r.path)); }});

// ---------------- Acil durum kartı ----------------
const ICEF=[['name','Ad soyad'],['blood','Kan grubu'],['allergy','Alerjiler'],['meds','Kullandığı ilaçlar'],['cond','Kronik hastalıklar'],['c1','Acil kişi 1 (ad ve telefon)'],['c2','Acil kişi 2 (ad ve telefon)'],['note','Diğer notlar (organ bağışı vb.)']];
T('ice','diger','🆘','Acil durum kartı','Kan grubu, alerji, acil kişiler',{
  view(){ const D=LS.get('ice',{});
    if(TS.edit||!D.name){ V(`<div class="note info">${ic('info')}<div class="small">Bir kaza veya acil durumda yardım edenlerin bilmesi gerekenler. Bilgiler sadece bu telefonda saklanır.</div></div>
      <div class="card">${ICEF.map(([k,t])=>`<label class="small muted" style="display:block;margin:10px 0 6px">${t}</label>${k==='blood'?`<div class="seg">${['A Rh+','A Rh−','B Rh+','B Rh−','AB Rh+','AB Rh−','0 Rh+','0 Rh−'].map(b=>`<button class="${D.blood===b?'on':''}" onclick="TOOL.set('blood','${b}')">${b}</button>`).join('')}</div>`:`<input type="text" id="ice_${k}" value="${esc(D[k]||'')}" ${k[0]==='c'&&k.length===2?'inputmode="text"':''}>`}`).join('')}
      <button class="btn pri" style="margin-top:16px" onclick="TOOL.save()">Kaydet</button></div>`); return; }
    const tel=s=>{ const m=(s||'').match(/\+?\d[\d\s]{8,}/); return m?m[0].replace(/\s/g,''):''; };
    V(`<div class="card" style="border:2px solid var(--bad)"><div class="row" style="margin-bottom:10px"><div style="font-size:34px">🆘</div><div class="grow"><b style="font-size:20px">${esc(D.name)}</b><div class="muted small">Acil durum bilgileri</div></div>${D.blood?`<div style="background:var(--bad);color:#fff;border-radius:14px;padding:8px 12px;font-weight:800;font-size:20px">${esc(D.blood)}</div>`:''}</div>
      ${ICEF.slice(2).filter(([k])=>D[k]).map(([k,t])=>`<div class="kv"><span>${t.replace(' (ad ve telefon)','').replace(' (organ bağışı vb.)','')}</span><span>${esc(D[k])}${tel(D[k])&&k[0]==='c'?` <a class="badge ok" href="tel:${tel(D[k])}" style="text-decoration:none">Ara</a>`:''}</span></div>`).join('')}</div>
      <div class="btns" style="margin-bottom:12px"><button class="btn pri" onclick="TOOL.full()">Tam ekran göster</button><button class="btn" onclick="TS.edit=1;vTool(true)">Düzenle</button></div>
      <div class="note warn">${ic('info')}<div class="small"><b>Kilit ekranından da görünsün:</b> Ayarlar → Güvenlik ve acil durum → <b>Tıbbi bilgiler</b> ve <b>Acil durum kişileri</b>. Orada girdiğin bilgiler telefon kilitliyken de "Acil durum" butonundan görülebilir.</div></div>`); },
  set(k,v){ const D=LS.get('ice',{}); TOOL.collect(D); D[k]=D[k]===v?'':v; LS.set('ice',D); vTool(true); },
  collect(D){ ICEF.forEach(([k])=>{ const e=$('#ice_'+k); if(e) D[k]=e.value.trim(); }); },
  save(){ const D=LS.get('ice',{}); TOOL.collect(D); if(!D.name){ toast('En azından adını yaz'); return; } LS.set('ice',D); TS.edit=0; toast('Kaydedildi'); vTool(true); },
  full(){ const D=LS.get('ice',{});
    overlay(`<div style="position:absolute;inset:0;background:#B3261E;color:#fff;padding:40px 24px;overflow:auto;font-family:system-ui"><div style="font-size:30px;font-weight:900">🆘 ACİL DURUM</div><div style="font-size:26px;font-weight:800;margin-top:14px">${esc(D.name)}</div>
      ${D.blood?`<div style="font-size:44px;font-weight:900;margin:10px 0">🩸 ${esc(D.blood)}</div>`:''}${ICEF.slice(2).filter(([k])=>D[k]).map(([k,t])=>`<div style="margin-top:16px"><div style="opacity:.8;font-size:15px">${t}</div><div style="font-size:22px;font-weight:700">${esc(D[k])}</div></div>`).join('')}
      <div style="margin-top:30px;opacity:.7;font-size:13px">Kapatmak için dokun</div></div>`,()=>closeOverlay()); }});

// ---------------- Park yerim ----------------
function hav(a,b){ const R=6371000, dLa=rad(b.lat-a.lat), dLo=rad(b.lon-a.lon); const x=Math.sin(dLa/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
function brg(a,b){ const y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat)), x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon)); return (deg(Math.atan2(y,x))+360)%360; }
T('parking','gunluk','🅿️','Park yerim','Arabayı nereye bıraktım?',{
  view(){ const P=LS.get('park',null);
    if(!sync('hasPerm',{perm:'android.permission.ACCESS_FINE_LOCATION'})){ V(needPerm2('android.permission.ACCESS_FINE_LOCATION','Park yerini birkaç metre hassasiyetle kaydetmek için konum gerekli. Konum sadece bu telefonda saklanır.')); return; }
    const me=TS.me;
    const dist=P&&me?hav(me,P):null, b=P&&me?brg(me,P):null;
    V(`${P?`<div class="card" style="text-align:center"><p class="muted small">Park: ${new Date(P.at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${P.note?' · '+esc(P.note):''}</p>
        <div style="position:relative;width:180px;height:180px;margin:14px auto;border-radius:50%;background:var(--card2)"><div id="pkA" style="position:absolute;inset:0;transition:transform .15s">${b!=null?`<div style="position:absolute;left:50%;top:10px;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:60px solid var(--ac)"></div>`:''}</div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px">🚗</div></div>
        ${dist!=null?big(dist<1000?Math.round(dist):num(dist/1000,2),dist<1000?'m':'km',`yaklaşık · konum hassasiyeti ±${Math.round(me.acc||0)} m`):`<p class="muted" id="pkS">Konumun alınıyor…</p>`}
        <div class="btns" style="margin-top:12px"><button class="btn pri" onclick="sync('openGeo',{lat:${P.lat},lon:${P.lon},label:'Park yerim'})||toast('Harita uygulaması bulunamadı')">🗺️ Haritada yol tarifi</button><button class="btn" onclick="TOOL.locate()">Yenile</button></div></div>`
      :`<div class="card empty">Kayıtlı park yeri yok.</div>`}
      <div class="card"><input type="text" id="pkN" placeholder="Not (ör. B2 katı, 34 numaralı yer)" style="margin-bottom:10px"><button class="btn ${P?'':'pri'}" onclick="TOOL.save()">📍 ${P?'Yeni park yeri olarak kaydet':'Buraya park ettim'}</button>
        ${P?`<button class="btn ghost" style="margin-top:10px" onclick="LS.set('park',null);TS.me=null;vTool(true)">Park yerini sil</button>`:''}</div>
      <p class="muted tiny" style="margin:4px">Kapalı otoparkta GPS zayıftır; notuna kat ve yer numarasını yaz. Ok, telefonu düz tutunca araca doğru döner.</p>`);
    TS.b=b; if(P&&!TS.me&&!TS.loading) TOOL.locate(); if(P&&!TS.sens) TS.sens=sync('sensorStart',{kind:'orient'}); },
  async locate(){ TS.loading=1; const r=await call('location',{precise:true}); TS.loading=0; if(!TOOL||TOOL.id!=='parking') return;
    if(r.error){ const s=$('#pkS'); if(s) s.innerHTML=r.error==='off'?'Konum kapalı; bildirim panelinden aç.':esc(r.error); return; } TS.me=r; vTool(true); },
  async save(){ toast('Konum alınıyor…'); const r=await call('location',{precise:true}); if(r.error){ toast(r.error==='off'?'Konum kapalı: bildirim panelinden aç':r.error); return; }
    LS.set('park',{lat:r.lat,lon:r.lon,acc:r.acc,at:Date.now(),note:($('#pkN')||{}).value||''}); TS.me=r; toast(`Kaydedildi (±${Math.round(r.acc||0)} m)`); vTool(true); },
  onPerm(){ vTool(true); },
  onSensor(k,v){ if(k!=='orient'||TS.b==null) return; const a=$('#pkA'); if(a) a.style.transform=`rotate(${TS.b-v[0]}deg)`; },
  stop(){ sync('sensorStop'); }});

// ---------------- Doğum günleri ----------------
T('birthdays','gunluk','🎂','Doğum günleri','Rehberdeki yaklaşanlar',{
  view(){ const p=needPerm2('android.permission.READ_CONTACTS','Rehberdeki doğum günlerini görmek için gerekli. Hiçbir şey değiştirilmez, dışarı gönderilmez.'); if(p){ V(p); return; }
    if(!TS.L){ V(`<div class="card row"><div class="spin"></div><span class="muted">Rehber okunuyor…</span></div>`); call('birthdays').then(r=>{ TS.L=r.error?[]:r; if(TOOL&&TOOL.id==='birthdays') vTool(true); }); return; }
    const now=new Date(); now.setHours(0,0,0,0);
    const L=TS.L.map(x=>{ const m=String(x.date||'').match(/^(\d{4}|-)-?-?(\d{2})-(\d{2})/); if(!m) return null; const y=m[1]==='-'?null:+m[1], mo=+m[2]-1, d=+m[3];
      let n=new Date(now.getFullYear(),mo,d); if(n<now) n=new Date(now.getFullYear()+1,mo,d); const left=Math.round((n-now)/864e5);
      return {name:x.name,cid:x.cid,n,left,age:y&&y>1900?n.getFullYear()-y:null}; }).filter(Boolean).sort((a,b)=>a.left-b.left);
    V(L.length?`<div class="list">${L.map(x=>`<button class="item" onclick="sync('openContact',{id:${x.cid}})"><div style="text-align:center;min-width:54px"><b style="font-size:20px">${x.n.getDate()}</b><div class="muted tiny">${x.n.toLocaleDateString('tr-TR',{month:'short'})}</div></div><div class="grow"><b>${esc(x.name)}</b><div class="muted small">${x.left===0?'🎉 Bugün!':x.left===1?'Yarın':x.left+' gün sonra'}${x.age?` · ${x.age} yaşına giriyor`:''}</div></div>${x.left<=7?'<span class="badge warn">Yakında</span>':''}</button>`).join('')}</div>`
      :`<div class="card empty">Rehberinde doğum günü kayıtlı kişi yok.<br><span class="small">Kişiler uygulamasında kişiyi düzenleyip "Önemli tarih → Doğum günü" ekleyebilirsin.</span></div>`); },
  onPerm(){ vTool(true); }});
