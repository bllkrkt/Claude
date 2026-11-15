'use strict';
// =====================================================================
//  v8: veri kullanımı, bildirim geçmişi, alışveriş listesi, borç-alacak, skor tutucu,
//  ekran ışığı, namaz vakti bildirimleri + hicri tarih, klasör boyutları
// =====================================================================

// ---------------- Veri kullanımı ----------------
T('datausage','diger','📊','Veri kullanımı','Hangi uygulama ne kadar internet yedi',{
  view(){
    if(!INFO.usage){ V(`<div class="card"><b>Kullanım erişimi gerekli</b><p class="muted small" style="margin:6px 0 12px">Uygulama başına veri kullanımını görmek için Android'in "Kullanım erişimi" iznini ver.</p><button class="btn pri" onclick="sync('openPerm',{which:'usage'})">İzni ver</button></div>`); return; }
    const per=TS.per||'month';
    if(!TS.r||TS.rper!==per){ V(`<div class="card row"><div class="spin"></div><span class="muted">Hesaplanıyor…</span></div>`);
      const n=new Date(); let st; if(per==='today'){ n.setHours(0,0,0,0); st=n.getTime(); } else if(per==='month'){ st=new Date(n.getFullYear(),n.getMonth(),1).getTime(); } else st=Date.now()-30*864e5;
      call('dataUsage',{start:st}).then(r=>{ TS.r=r; TS.rper=per; if(TOOL&&TOOL.id==='datausage') vTool(true); }); return; }
    const r=TS.r; if(r.error){ V(`<div class="note bad">${ic('warn')}<div>${esc(r.error)}</div></div>`); return; }
    const k=TS.k||'mobile', L=r.apps.filter(a=>a[k]>0).sort((a,b)=>b[k]-a[k]), mx=L.length?L[0][k]:1;
    V(`<div class="seg" style="margin-bottom:12px">${[['today','Bugün'],['month','Bu ay'],['30','Son 30 gün']].map(([p,t])=>`<button class="${per===p?'on':''}" onclick="TS.per='${p}';vTool(true)">${t}</button>`).join('')}</div>
      <div class="stats"><button class="stat ${k==='mobile'?'on':''}" onclick="TS.k='mobile';vTool(true)"><span>📶 Mobil veri</span><b>${bytes(r.mobile)}</b></button><button class="stat ${k==='wifi'?'on':''}" onclick="TS.k='wifi';vTool(true)"><span>📡 Wi-Fi</span><b>${bytes(r.wifi)}</b></button></div>
      ${L.length?`<div class="list">${L.map(a=>`<button class="item" ${a.pkg?`onclick="sync('appSettings',{pkg:'${esc(a.pkg)}'})"`:''}>${a.pkg?`<img class="th" style="width:40px;height:40px" loading="lazy" src="/icon/${esc(a.pkg)}" onerror="this.style.visibility='hidden'">`:'<div style="width:40px;font-size:24px;text-align:center">⚙️</div>'}<div class="grow" style="min-width:0"><div class="ellip" style="font-weight:700">${esc(a.label)}</div><div class="bar" style="height:6px;margin-top:6px"><i style="width:${a[k]/mx*100}%"></i></div></div><div class="sz">${bytes(a[k])}</div></button>`).join('')}</div>`:'<div class="card empty">Bu dönemde kullanım yok.</div>'}
      <p class="muted tiny" style="margin:6px 4px">Mobil veri kotanı korumak için: çok yiyen uygulamaya dokun → Ayarlar → Mobil veri / arka plan verisi kısıtla. Telefonun kendi sayacıyla birkaç MB fark olabilir.</p>`); }});

// ---------------- Bildirim geçmişi ----------------
T('notiflog','diger','🔔','Bildirim geçmişi','Silinen mesajları da gör',{
  view(){ const st=sync('notifLog',{items:true})||{};
    if(!st.enabled){ V(`<div class="card"><div style="font-size:40px;text-align:center">🔔</div><b style="display:block;text-align:center;margin:8px 0">Bildirim geçmişi kapalı</b>
        <p class="muted small" style="margin-bottom:12px">Açarsan gelen bildirimlerin başlığı ve metni <b>sadece bu telefonda</b> saklanır (son 1000 bildirim). Böylece WhatsApp'ta "Bu mesaj silindi" olan mesajı veya yanlışlıkla kaydırdığın bildirimi sonradan okuyabilirsin.</p>
        <div class="note info">${ic('lock')}<div class="small">Uygulamanın internet izni yok; bildirimlerin hiçbir yere gönderilemez. İstediğin an durdurabilir veya tüm geçmişi silebilirsin.</div></div>
        <button class="btn pri" onclick="sync('notifLogOpen')">Bildirim erişimini ver</button><p class="muted tiny" style="margin-top:10px">Açılan ekranda "Araç Kutusu: bildirim geçmişi"ni aç, sonra geri dön.</p></div>`); return; }
    const L=(st.items||[]).slice().reverse(), q=trl((TS.q||'').trim()), app=TS.app;
    const apps={}; L.forEach(n=>{ apps[n.p]=apps[n.p]||{a:n.a,c:0}; apps[n.p].c++; });
    const F=L.filter(n=>(!app||n.p===app)&&(!q||trl(n.a+' '+n.t+' '+n.b).includes(q)));
    V(`<div class="search">${ic('search')}<input type="text" placeholder="Bildirimlerde ara" value="${esc(TS.q||'')}" oninput="TS.q=this.value;clearTimeout(TS.tm);TS.tm=setTimeout(()=>{vTool(true);const e=document.querySelector('.search input');e.focus();e.setSelectionRange(99,99)},300)"></div>
      <div style="display:flex;gap:8px;overflow-x:auto;margin:0 -16px 12px;padding:0 16px"><button class="badge ${!app?'ok':''}" style="padding:8px 12px;font-size:13px;flex:none" onclick="TS.app=null;vTool(true)">Hepsi · ${L.length}</button>${Object.entries(apps).sort((a,b)=>b[1].c-a[1].c).map(([p,x])=>`<button class="badge ${app===p?'ok':''}" style="padding:8px 12px;font-size:13px;flex:none" onclick="TS.app='${esc(p)}';vTool(true)">${esc(x.a)} · ${x.c}</button>`).join('')}</div>
      ${F.length?`<div class="list">${F.slice(0,300).map(n=>`<div class="item" style="align-items:flex-start"><img class="th" style="width:36px;height:36px" loading="lazy" src="/icon/${esc(n.p)}" onerror="this.style.visibility='hidden'"><div class="grow" style="min-width:0"><div class="row" style="justify-content:space-between;gap:8px"><b class="small ellip">${esc(n.t||n.a)}</b><span class="muted tiny" style="white-space:nowrap">${new Date(n.at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div class="muted tiny">${esc(n.a)}</div><div class="small" style="margin-top:4px;white-space:pre-wrap;word-break:break-word">${esc(n.b)}</div></div></div>`).join('')}</div>`:'<div class="card empty">Henüz kayıtlı bildirim yok. Yeni bildirimler geldikçe burada görünecek.</div>'}
      <div class="row" style="justify-content:space-between;margin:14px 4px" onclick="sync('notifLogPause',{on:${!st.paused}});vTool(true)"><span class="small">Kaydetmeyi duraklat</span><div class="sw ${st.paused?'on':''}"></div></div>
      <div class="btns"><button class="btn ghost" onclick="notifClear()">Geçmişi sil</button><button class="btn ghost" onclick="sync('notifLogOpen')">Erişimi kapat</button></div>
      <p class="muted tiny" style="margin:10px 4px">Sadece bildirim olarak gelenler kaydedilir: sohbet açıkken gelen mesajlar, fotoğraf/ses içerikleri kaydedilmez.</p>`); }});

function notifClear(){ openSheet(`<h4>Tüm geçmiş silinsin mi?</h4><p class="muted" style="margin-bottom:14px">Kayıtlı bütün bildirimler kalıcı olarak silinir.</p><div class="btns"><button class="btn ghost" onclick="closeSheet()">Vazgeç</button><button class="btn red" onclick="sync('notifLogClear');closeSheet();vTool(true)">Sil</button></div>`); }

// ---------------- Alışveriş listesi ----------------
const SHOP_Q=['Ekmek','Süt','Yumurta','Peynir','Zeytin','Domates','Salatalık','Patates','Soğan','Muz','Elma','Tavuk','Kıyma','Pirinç','Makarna','Yağ','Şeker','Çay','Su','Deterjan','Tuvalet kâğıdı','Diş macunu'];
T('shopping','gunluk','🛒','Alışveriş listesi','Hızlı ekle, WhatsApp\'tan paylaş',{
  view(){ const L=LS.get('shop',[]), open=L.filter(x=>!x.d);
    V(`<div class="row" style="gap:8px;margin-bottom:10px"><input type="text" id="shI" placeholder="Ürün (ör. 2 kg domates)" onkeydown="if(event.key==='Enter')TOOL.add($('#shI').value)"><button class="btn pri sm" style="flex:0 0 auto;min-height:54px" onclick="TOOL.add($('#shI').value)">${ic('plus')}</button></div>
      <div style="display:flex;gap:8px;overflow-x:auto;margin:0 -16px 12px;padding:0 16px">${SHOP_Q.filter(q=>!L.some(x=>!x.d&&trl(x.t)===trl(q))).map(q=>`<button class="badge" style="padding:8px 12px;font-size:13px;flex:none" onclick="TOOL.add('${q}')">+ ${q}</button>`).join('')}</div>
      ${L.length?`<div class="list">${L.map((x,i)=>`<div class="item ${x.d?'sel':''}"><div class="chk" onclick="TOOL.tog(${i})">${ic('check')}</div><div class="grow" style="${x.d?'text-decoration:line-through;color:var(--tx3)':''};font-size:17px">${esc(x.t)}</div><button class="muted" style="padding:8px" onclick="TOOL.del(${i})">${ic('x')}</button></div>`).join('')}</div>`:'<div class="card empty">Liste boş. Yukarıdan ekle veya hızlı düğmelere dokun.</div>'}
      <div class="btns" style="margin-top:12px">${open.length?`<button class="btn pri" onclick="TOOL.share()">Paylaş (${open.length})</button>`:''}${L.length-open.length?`<button class="btn ghost" onclick="LS.set('shop',LS.get('shop',[]).filter(x=>!x.d));vTool(true)">Alınanları temizle</button>`:''}</div>`); },
  add(t){ t=(t||'').trim(); if(!t) return; const L=LS.get('shop',[]); L.unshift({t,d:false}); LS.set('shop',L); vTool(true); setTimeout(()=>{ const e=$('#shI'); if(e) e.focus(); },50); },
  tog(i){ const L=LS.get('shop',[]); L[i].d=!L[i].d; L.sort((a,b)=>a.d-b.d); LS.set('shop',L); sync('vibrate',{p:[20]}); vTool(true); },
  del(i){ const L=LS.get('shop',[]); L.splice(i,1); LS.set('shop',L); vTool(true); },
  share(){ const L=LS.get('shop',[]).filter(x=>!x.d); sync('shareText',{title:'Listeyi paylaş',text:'🛒 Alışveriş listesi\n'+L.map(x=>'▫️ '+x.t).join('\n')}); }});

// ---------------- Borç-alacak defteri ----------------
T('debts','hesap','🤝','Borç-alacak defteri','Kime ne verdim, kimden ne aldım',{
  view(){ const L=LS.get('debts',[]); const by={};
    L.filter(x=>!x.paid).forEach(x=>{ by[x.who]=(by[x.who]||0)+(x.dir==='verdim'?x.amt:-x.amt); });
    const alacak=Object.values(by).filter(v=>v>0).reduce((a,b)=>a+b,0), borc=-Object.values(by).filter(v=>v<0).reduce((a,b)=>a+b,0);
    V(`<div class="stats"><div class="stat"><span>Alacağım</span><b style="color:var(--ac)">${tl(alacak)}</b></div><div class="stat"><span>Borcum</span><b style="color:var(--bad)">${tl(borc)}</b></div></div>
      <div class="btns" style="margin-bottom:12px"><button class="btn pri" onclick="TOOL.edit('verdim')">Borç verdim</button><button class="btn red" onclick="TOOL.edit('aldım')">Borç aldım</button></div>
      ${Object.keys(by).length?`<h3>Kişiler</h3><div class="list">${Object.entries(by).filter(([,v])=>Math.abs(v)>0.001).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(([w,v])=>`<div class="item"><div class="grow"><b>${esc(w)}</b><div class="muted tiny">${v>0?'Sana borçlu':'Sen borçlusun'}</div></div><div class="sz" style="color:${v>0?'var(--ac)':'var(--bad)'}">${tl(Math.abs(v))}</div></div>`).join('')}</div>`:''}
      ${L.length?`<h3>Kayıtlar</h3><div class="list">${L.slice().sort((a,b)=>b.id-a.id).map(x=>`<div class="item"><div class="chk" style="${x.paid?'background:var(--ac);border-color:var(--ac);color:#06281C':''}" onclick="TOOL.paid(${x.id})">${x.paid?ic('check'):''}</div><div class="grow" style="min-width:0;${x.paid?'opacity:.5':''}"><b>${esc(x.who)}</b> <span class="muted small">${x.dir==='verdim'?'→ ona verdim':'← ondan aldım'}</span><div class="muted tiny ellip">${new Date(x.id).toLocaleDateString('tr-TR')}${x.note?' · '+esc(x.note):''}${x.paid?' · ödendi':''}</div></div><div class="sz">${tl(x.amt)}</div><button class="muted" style="padding:6px" onclick="TOOL.del(${x.id})">${ic('x')}</button></div>`).join('')}</div>
      <p class="muted tiny" style="margin:6px 4px">Ödenince soldaki kutuya dokun; kişinin bakiyesinden düşer.</p>`:'<div class="card empty">Henüz kayıt yok.</div>'}`); },
  edit(dir){ const names=[...new Set(LS.get('debts',[]).map(x=>x.who))];
    openSheet(`<h4>${dir==='verdim'?'Borç verdim':'Borç aldım'}</h4><input type="text" id="dbW" placeholder="Kime / kimden" list="dbList" style="margin:10px 0"><datalist id="dbList">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
      <input type="text" inputmode="decimal" id="dbA" placeholder="Tutar (₺)" style="margin-bottom:10px;font-size:22px;font-weight:700"><input type="text" id="dbN" placeholder="Not (isteğe bağlı)" style="margin-bottom:14px">
      <button class="btn pri" onclick="TOOL.ok('${dir}')">Kaydet</button>`); },
  ok(dir){ const w=$('#dbW').value.trim(), a=pf($('#dbA').value); if(!w||!(a>0)){ toast('Kişi ve tutar gir'); return; } const L=LS.get('debts',[]); L.push({id:Date.now(),who:w,amt:a,dir,note:$('#dbN').value.trim(),paid:false}); LS.set('debts',L); closeSheet(); vTool(true); },
  paid(id){ const L=LS.get('debts',[]); const x=L.find(y=>y.id===id); x.paid=!x.paid; LS.set('debts',L); vTool(true); },
  del(id){ LS.set('debts',LS.get('debts',[]).filter(y=>y.id!==id)); vTool(true); }});

// ---------------- Skor tutucu ----------------
T('score','gunluk','🏆','Skor tutucu','Okey, tavla, maç, oyun puanı',{
  view(){ const G=LS.get('score',{p:[{n:'Oyuncu 1',s:0},{n:'Oyuncu 2',s:0}],step:1,h:[]}); const mx=Math.max(...G.p.map(x=>x.s));
    V(`<div class="seg" style="margin-bottom:12px"><span class="small muted" style="align-self:center;margin-right:4px">Adım:</span>${[1,5,10,50,100].map(n=>`<button class="${G.step===n?'on':''}" onclick="TOOL.st(${n})">${n}</button>`).join('')}</div>
      ${G.p.map((p,i)=>`<div class="card row" style="gap:10px;${p.s===mx&&mx!==0?'border:1.5px solid var(--ac)':''}"><button class="grow" style="text-align:left;min-width:0" onclick="TOOL.ren(${i})"><b class="ellip" style="font-size:18px">${p.s===mx&&mx!==0?'👑 ':''}${esc(p.n)}</b><div class="muted tiny">Adı değiştirmek için dokun</div></button>
        <button class="btn sm" style="width:52px;padding:0;font-size:22px" onclick="TOOL.ch(${i},-1)">−</button><div style="min-width:70px;text-align:center;font-size:34px;font-weight:800;font-variant-numeric:tabular-nums">${p.s}</div><button class="btn sm pri" style="width:52px;padding:0;font-size:22px" onclick="TOOL.ch(${i},1)">+</button></div>`).join('')}
      <div class="btns"><button class="btn" onclick="TOOL.addP()">${ic('plus')} Oyuncu</button><button class="btn ghost" onclick="TOOL.undo()" ${G.h.length?'':'disabled'}>Geri al</button><button class="btn ghost" onclick="TOOL.reset()">Sıfırla</button></div>`); },
  g(){ return LS.get('score',{p:[{n:'Oyuncu 1',s:0},{n:'Oyuncu 2',s:0}],step:1,h:[]}); },
  st(n){ const G=TOOL.g(); G.step=n; LS.set('score',G); vTool(true); },
  ch(i,d){ const G=TOOL.g(); G.p[i].s+=d*G.step; G.h.push([i,d*G.step]); G.h=G.h.slice(-50); LS.set('score',G); sync('vibrate',{p:[15]}); vTool(true); },
  undo(){ const G=TOOL.g(); const x=G.h.pop(); if(x) G.p[x[0]].s-=x[1]; LS.set('score',G); vTool(true); },
  reset(){ const G=TOOL.g(); G.p.forEach(p=>p.s=0); G.h=[]; LS.set('score',G); vTool(true); },
  addP(){ const G=TOOL.g(); if(G.p.length>=8){ toast('En fazla 8 oyuncu'); return; } G.p.push({n:'Oyuncu '+(G.p.length+1),s:0}); LS.set('score',G); vTool(true); },
  ren(i){ const G=TOOL.g(); openSheet(`<h4>Oyuncu</h4><input type="text" id="scN" value="${esc(G.p[i].n)}" style="margin:10px 0 14px"><div class="btns"><button class="btn pri" onclick="const G=TOOL.g();G.p[${i}].n=$('#scN').value.trim()||G.p[${i}].n;LS.set('score',G);closeSheet();vTool(true)">Kaydet</button>${G.p.length>2?`<button class="btn red sm" style="flex:0 0 auto" onclick="const G=TOOL.g();G.p.splice(${i},1);G.h=[];LS.set('score',G);closeSheet();vTool(true)">Çıkar</button>`:''}</div>`); }});

// ---------------- Ekran ışığı ----------------
T('screenlight','gunluk','💡','Ekran ışığı','Selfie ışığı, gece lambası',{
  view(){ const C=[['#FFFFFF','Beyaz (selfie)'],['#FFE9C7','Sıcak beyaz'],['#FFB86B','Gece lambası'],['#FF3B30','Kırmızı (gözü yormaz)'],['#9AD0FF','Soğuk mavi']];
    V(`<p class="muted small" style="margin:4px 4px 12px">Ekran tamamen seçtiğin renkle ve en yüksek parlaklıkla yanar. Karanlıkta selfie, makyaj veya gece lambası olarak kullan. Çıkmak için dokun.</p>
      <div class="list">${C.map(([c,t])=>`<button class="item" onclick="TOOL.show('${c}')"><div style="width:44px;height:44px;border-radius:12px;background:${c};border:1px solid var(--line)"></div><div class="grow"><b>${t}</b></div>${ic('chev')}</button>`).join('')}</div>`); },
  show(c){ sync('screenBoost',{on:true}); overlay(`<div style="position:absolute;inset:0;background:${c}"></div>`,()=>closeOverlay()); },
  onOverlayClose(){ sync('screenBoost',{on:false}); }, stop(){ sync('screenBoost',{on:false}); }});

// QR oluşturucu ve kayan yazı açıkken ekranı parlat
(function(){ const t=TOOLS.qrgen; if(t){ const v=t.view, st=t.stop; t.view=function(s){ v.call(this,s); sync('screenBoost',{on:true}); }; t.stop=function(){ sync('screenBoost',{on:false}); if(st) st.call(this); }; }
  // Tam ekran gösterimlerde (kayan yazı, gece saati, ekran testi…) ekranı en parlak yap, kapanınca eski haline dön
  const o=overlay, c=closeOverlay; overlay=function(h,f){ o(h,f); sync('screenBoost',{on:true}); }; closeOverlay=function(){ const had=!!OVL; c(); if(had&&!(TOOL&&TOOL.id==='qrgen')) sync('screenBoost',{on:false}); }; })();

// ---------------- Namaz vakti bildirimleri + Hicri tarih ----------------
function hijri(d){ try{ return new Intl.DateTimeFormat('tr-TR-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(d); }catch(e){ return ''; } }
function prayerReminders(){
  const cfg=LS.get('prayNotif',null), loc=LS.get('loc',null); let R=(sync('reminders')||[]).filter(r=>!String(r.id).startsWith('pv-'));
  if(cfg&&cfg.on&&loc){ const names=['İmsak','Güneş','Öğle','İkindi','Akşam','Yatsı'];
    for(let k=0;k<7;k++){ const d=new Date(Date.now()+k*864e5); const P=prayerTimes(d,loc.lat,loc.lon); const ds=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      P.forEach((p,i)=>{ if(!cfg.v.includes(i)) return; let t=Math.round(p[1]*60)-(cfg.before||0); if(t<0) return; const h=Math.floor(t/60), m=t%60;
        R.push({id:`pv-${ds}-${i}`,text:`${names[i]} vakti${cfg.before?` (${cfg.before} dk sonra)`:''}`,emoji:'🕌',h,m,date:ds,once:true,on:true,note:loc.name}); }); } }
  sync('saveReminders',{list:R}); }
(function(){ const t=TOOLS.prayer; if(!t) return; const v=t.view;
  t.view=function(s){ v.call(this,s); const loc=LS.get('loc',null); if(!loc||TS.pick) return;
    const cfg=LS.get('prayNotif',{on:false,v:[0,2,3,4,5],before:0}); const names=['İmsak','Güneş','Öğle','İkindi','Akşam','Yatsı'];
    const hj=hijri(new Date()); const head=document.querySelector('#view .card p.muted'); if(head&&hj) head.insertAdjacentHTML('beforeend',`<br>${esc(hj)} (Hicri, yaklaşık)`);
    const box=document.querySelector('#view .list'); if(!box) return;
    box.insertAdjacentHTML('afterend',`<div class="card"><div class="row" style="justify-content:space-between" onclick="prayCfg({on:${!cfg.on}})"><div><b>Vakit bildirimleri</b><p class="muted tiny">Seçtiğin vakitlerde bildirim gönderir</p></div><div class="sw ${cfg.on?'on':''}"></div></div>
      ${cfg.on?`<div class="seg" style="margin-top:12px">${names.map((n,i)=>`<button class="${cfg.v.includes(i)?'on':''}" onclick="prayCfg({tog:${i}})">${n}</button>`).join('')}</div>
        <div class="seg" style="margin-top:10px"><span class="small muted" style="align-self:center">Önceden:</span>${[0,5,10,15].map(m=>`<button class="${(cfg.before||0)===m?'on':''}" onclick="prayCfg({before:${m}})">${m?m+' dk':'Tam vaktinde'}</button>`).join('')}</div>
        <p class="muted tiny" style="margin-top:10px">Önümüzdeki 7 günün vakitleri kurulur ve uygulamayı her açtığında yenilenir. Haftada en az bir kez açman yeterli.</p>`:''}</div>`); };
})();
function prayCfg(o){ const c=LS.get('prayNotif',{on:false,v:[0,2,3,4,5],before:0}); if('on' in o) c.on=o.on; if('before' in o) c.before=o.before;
  if('tog' in o){ const i=c.v.indexOf(o.tog); i>=0?c.v.splice(i,1):c.v.push(o.tog); }
  LS.set('prayNotif',c); prayerReminders(); if(c.on&&!INFO.notif) askNotif(); if(c.on) toast('Vakit bildirimleri kuruldu'); vTool(true); }
// Uygulama her açıldığında 7 günlük pencereyi kaydır
try{ if(B&&LS.get('prayNotif',{}).on) prayerReminders(); }catch(e){}

// ---------------- Dosya yöneticisi: klasör boyutları ----------------
(function(){ const orig=vFiles; vFiles=function(){ orig(); if(!FM.res) return;
  const S=FM.sizes&&FM.sizes.path===FM.res.path?FM.sizes.v:null;
  if(S){ FM.res.items.forEach((f,i)=>{ if(!f.dir||S[f.path]==null) return; const el=document.querySelectorAll('#view .list .item')[i]; if(!el) return; const t=el.querySelector('.muted.tiny'); const v=S[f.path]; if(t) t.innerHTML=`<b style="color:var(--tx)">${v<0?'>'+bytes(-v-1):bytes(v)}</b> · `+t.innerHTML; }); }
  const tool=document.querySelector('#view .row .btn.sm'); if(tool&&!S) tool.insertAdjacentHTML('afterend',`<button class="btn sm" id="fsz" onclick="fmSizes()">📏 Boyutlar</button>`); }; })();
async function fmSizes(){ const b=$('#fsz'); if(b){ b.disabled=true; b.innerHTML='<div class="spin" style="width:16px;height:16px"></div>'; } const r=await call('folderSizes',{path:FM.res.path}); if(r.error){ toast(r.error); return; }
  FM.sizes={path:FM.res.path,v:r}; vFiles(); }
