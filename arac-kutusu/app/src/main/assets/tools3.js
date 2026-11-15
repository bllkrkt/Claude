'use strict';
// =====================================================================
//  v5: Telefon Check-up, genel arama + favoriler, dosya yöneticisi, fotoğraf küçültücü,
//  Wi-Fi sinyal ölçer, pil geçmişi grafiği, gece saati, Mors kodu, resmi tatiller
// =====================================================================

// ---------------- Favoriler ----------------
const FAV={ get:()=>LS.get('favs',['compass','torch','qrscan','notes']), has:id=>FAV.get().includes(id),
  tog(id){ const f=FAV.get(); const i=f.indexOf(id); if(i>=0) f.splice(i,1); else f.push(id); LS.set('favs',f); toast(i>=0?'Favorilerden çıkarıldı':'Ana ekrana eklendi ⭐'); } };
function favRow(){
  const f=FAV.get().filter(id=>TOOLS[id]); if(!f.length) return '';
  return `<h3>Favori araçlar</h3><div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;margin:0 -16px;padding-left:16px;padding-right:16px">${f.map(id=>`<button onclick="go('tool','${id}')" style="flex:0 0 auto;width:84px;background:var(--card);border-radius:18px;padding:12px 6px;text-align:center"><div style="font-size:28px">${TOOLS[id].emoji}</div><div class="tiny" style="margin-top:6px;font-weight:600;line-height:1.2">${esc(TOOLS[id].t)}</div></button>`).join('')}</div>`;
}
// Araç ekranının başlığına ⭐ butonu
const _vToolOrig=vTool;
vTool=function(soft){ _vToolOrig(soft); const h=$('#hdr'); let b=$('#favB');
  if(!b){ b=document.createElement('button'); b.id='favB'; b.style.cssText='width:44px;height:44px;border-radius:14px;background:var(--card);font-size:20px'; h.appendChild(b); }
  b.style.display=''; b.textContent=TOOL&&FAV.has(TOOL.id)?'⭐':'☆'; b.onclick=()=>{ FAV.tog(TOOL.id); b.textContent=FAV.has(TOOL.id)?'⭐':'☆'; }; };
const _renderOrig=render;
render=function(soft){ const b=$('#favB'); if(b&&stack[stack.length-1]!=='tool') b.style.display='none'; _renderOrig(soft); };

// ---------------- Genel arama ----------------
const SECTIONS=[['clean','🧹','Temizlik','büyük dosya kopya fotoğraf apk çöp boş klasör yer aç depolama'],['sec','🛡️','Güvenlik kontrolü','virüs izin sms erişilebilirlik yönetici bilinmeyen kaynak puan'],
  ['hidden','🔑','Gizli ayarlar','xiaomi hyperos miui otomatik başlatma pil kısıtlama geliştirici'],['quick','⚡','Tek tık ayarlar','mod parlaklık sessiz titreşim rahatsız etmeyin animasyon wifi bluetooth zamanlayıcı kutucuk'],
  ['tools','🧰','Araçlar','araç'],['device','📱','Telefon durumu','pil sağlık sıcaklık işlemci ram ekran sistem döngü kapasite'],['usage','⏳','Ekran süresi','kullanım süre uygulama bağımlılık'],
  ['apps','📦','Uygulama yöneticisi','uygulama boyut kaldır önbellek apk yedek'],['perms','👁️','İzin denetimi','kamera mikrofon konum rehber izin'],['files','🗂️','Dosya yöneticisi','dosya klasör aç paylaş sil yeniden adlandır'],
  ['checkup','🩺','Telefon Check-up','bakım rapor kontrol sağlık'],['about','⚙️','Ayarlar ve hakkında','tema açık koyu şarj alarm widget yedek geri yükle güncelleme'],['xtips','📘','Xiaomi rehberi','reklam msa bildirim gecikme ipucu'],
  ['shizuku','🔧','Shizuku kurulumu','shizuku kablosuz hata ayıklama'],['limits','🔒','Android\'in izin vermedikleri','sınır yapılamayan']];
let SHC=null;
function searchResults(q){
  q=trl(q.trim()); if(!q) return '';
  const R=[];
  for(const [v,e,t,k] of SECTIONS) if(trl(t+' '+k).includes(q)) R.push(`<button class="item" onclick="go('${v}')"><div style="font-size:24px;width:32px;text-align:center">${e}</div><div class="grow"><b>${t}</b><div class="muted tiny">Bölüm</div></div>${ic('chev')}</button>`);
  for(const t of Object.values(TOOLS)) if(trl(t.t+' '+t.d).includes(q)) R.push(`<button class="item" onclick="go('tool','${t.id}')"><div style="font-size:24px;width:32px;text-align:center">${t.emoji}</div><div class="grow"><b>${esc(t.t)}</b><div class="muted tiny">Araç · ${esc(t.d)}</div></div>${ic('chev')}</button>`);
  if(SHC&&SHC.items) for(const s of SHC.items) if(trl(s.title+' '+s.desc).includes(q)) R.push(`<button class="item" onclick="openSc0('${s.id}')"><div style="font-size:24px;width:32px;text-align:center">🔑</div><div class="grow"><b>${esc(s.title)}</b><div class="muted tiny">Ayar kısayolu · ${esc(s.group)}</div></div>${ic('ext')}</button>`);
  return R.length?`<div class="list">${R.slice(0,30).join('')}</div>`:`<div class="card empty">"${esc(q)}" için sonuç yok.</div>`;
}
function openSc0(id){ if(!sync('openShortcut',{id})) toast('Bu ekran açılamadı'); }
function homeSearch(v){ HQ=v; if(!SHC){ SHC={}; call('shortcuts').then(r=>{ SHC=r; const e=$('#hsR'); if(e&&HQ) e.innerHTML=searchResults(HQ); }); }
  const e=$('#hsR'); if(e) e.innerHTML=searchResults(v); const g=$('#homeBody'); if(g) g.style.display=v.trim()?'none':''; }
let HQ='';
const _vHomeOrig=vHome;
vHome=function(){ _vHomeOrig(); if(!B) return;
  const hero=document.querySelector('.hero'); if(!hero) return;
  // Hero sonrasını sar: arama sonuçları gelince gizlensin
  const body=document.createElement('div'); body.id='homeBody';
  while(hero.nextSibling) body.appendChild(hero.nextSibling);
  hero.insertAdjacentHTML('afterend',`<div class="search" style="margin-top:16px">${ic('search')}<input type="text" placeholder="Ara: araç, ayar, bölüm…" value="${esc(HQ)}" oninput="homeSearch(this.value)"></div><div id="hsR"></div>
    <button class="btn" style="margin-bottom:4px;background:linear-gradient(135deg,var(--acbg),var(--card));justify-content:flex-start;padding:0 18px" onclick="go('checkup')"><span style="font-size:24px">🩺</span><span class="grow" style="text-align:left">Telefon Check-up<br><span class="muted tiny" style="font-weight:500">Tek tuşla bakım raporu</span></span>${ic('chev')}</button>`);
  document.getElementById('hsR').after(body);
  body.insertAdjacentHTML('afterbegin',favRow());
  if(HQ) homeSearch(HQ);
};

// ---------------- Telefon Check-up ----------------
let CU=null;
async function vCheckup(soft){
  if(soft&&CU&&!CU.busy){ drawCheckup(); return; }
  CU={busy:true}; V(`<div class="card" style="text-align:center;padding:40px 16px"><div class="spin" style="width:48px;height:48px;margin:0 auto 16px;border-width:5px"></div><b>Telefonun kontrol ediliyor…</b><p class="muted small" id="cuP" style="margin-top:6px">Depolama, pil, güvenlik, uygulamalar</p></div>`);
  const dev=sync('device')||{}, pc=sync('phoneChecks')||{checks:[]};
  let apps=null; if(INFO.usage){ apps=await call('scanApps',{system:false,unusedDays:60},t=>{ const e=$('#cuP'); if(e) e.textContent=t; }); }
  else apps=await call('scanApps',{system:false,unusedDays:60});
  const I=[]; const add=(lv,t,d,btn)=>I.push({lv,t,d,btn});
  const fr=dev.storageFree/dev.storageTotal;
  if(fr<0.1) add(3,'Depolama neredeyse dolu',`Sadece ${bytes(dev.storageFree)} boş (%${Math.round(fr*100)}). Telefon yavaşlar, güncelleme alamaz.`,`<button class="btn sm pri" onclick="go('clean')">Temizliğe git</button>`);
  else if(fr<0.2) add(2,'Depolama azalıyor',`${bytes(dev.storageFree)} boş (%${Math.round(fr*100)}).`,`<button class="btn sm" onclick="go('clean')">Temizliğe git</button>`);
  else add(0,'Depolama yeterli',`${bytes(dev.storageFree)} boş.`);
  const b=dev.battery||{};
  if(b.chargeMah&&b.designMah&&b.level>15){ const h=Math.round(b.chargeMah*100/b.level/b.designMah*100);
    if(h<80) add(2,'Pil yıpranmış olabilir',`Tahmini kapasite tasarımın %${h}'i. %80'in altı pil değişimi için işarettir (tahmini değer).`,`<button class="btn sm" onclick="go('device')">Ayrıntı</button>`); else add(0,'Pil kapasitesi iyi',`Tahmini %${Math.min(100,h)}.`); }
  if(b.temp>=42) add(2,'Pil sıcak',`${b.temp} °C. Kılıfı çıkar, ağır uygulamaları kapat.`);
  if(b.health&&b.health!=='İyi'&&b.health!=='Bilinmiyor') add(3,'Pil sağlığı: '+b.health,'Telefonun pil sağlığını kötü bildiriyor.');
  const ram=dev.ramTotal?(dev.ramTotal-dev.ramFree)/dev.ramTotal:0; if(ram>0.9) add(1,'RAM çok dolu',`%${Math.round(ram*100)} dolu. Kullanmadığın uygulamaları son uygulamalardan kapat.`);
  const up=(dev.system||{}).uptimeMin||0; if(up>14*1440) add(1,'Telefon uzun süredir yeniden başlatılmadı',`${Math.floor(up/1440)} gündür açık. Haftada bir yeniden başlatmak takılmaları azaltır.`);
  for(const c of pc.checks||[]) if(!c.ok&&c.w>0) add(c.w>=3?3:c.w>=2?2:1,c.t,c.d,`<button class="btn sm" onclick="go('sec')">Güvenliğe git</button>`);
  if(apps&&apps.apps){ const hi=apps.apps.filter(a=>a.risks.some(r=>r.lv>=3)).length, un=apps.apps.filter(a=>a.risks.some(r=>r.k==='unused')).length, unk=apps.apps.filter(a=>a.risks.some(r=>r.k==='unknown')).length;
    if(hi) add(2,`${hi} uygulamada yüksek riskli izin`,'SMS, erişilebilirlik veya cihaz yöneticisi yetkisi var. Tanıyorsan sorun yok.',`<button class="btn sm" onclick="SC.res=null;go('sec')">İncele</button>`);
    if(un) add(1,`${un} uygulama 60+ gündür açılmamış`,'Kaldırarak yer aç ve gereksiz izinlerden kurtul.',`<button class="btn sm" onclick="go('apps')">Uygulamalar</button>`);
    if(unk) add(1,`${unk} uygulama mağaza dışından`,'APK dosyasından kurulmuşlar. Kaynağını bilmediklerini kaldır.'); }
  if(!INFO.usage) add(1,'Kullanım erişimi verilmemiş','Kullanılmayan uygulamaları ve ekran süresini görebilmem için gerekli.',`<button class="btn sm" onclick="sync('openPerm',{which:'usage'})">İzin ver</button>`);
  const sc=Math.max(0,100-I.reduce((s,x)=>s+[0,4,10,20][x.lv],0));
  CU={busy:false,I:I.sort((a,b)=>b.lv-a.lv),sc,at:Date.now()}; LS.set('lastCheckup',{sc,at:CU.at});
  if(stack[stack.length-1]==='checkup') drawCheckup();
}
function drawCheckup(){
  const {I,sc}=CU, col=sc>=80?'var(--ac)':sc>=55?'var(--warn)':'var(--bad)', bad=I.filter(x=>x.lv>0);
  V(`<div class="card" style="text-align:center"><div class="ring" style="width:130px;height:130px;margin:6px auto 12px;background:conic-gradient(${col} ${sc*3.6}deg,var(--card2) 0)"><span style="width:106px;height:106px;font-size:40px;color:${col}">${sc}</span></div>
      <b style="font-size:20px">${sc>=80?'Telefonun iyi durumda 👍':sc>=55?'Birkaç şeyi düzeltebilirsin':'Bakım zamanı'}</b><p class="muted small" style="margin-top:4px">${bad.length?bad.length+' öneri var':'Önemli bir sorun bulunamadı'}</p></div>
    ${I.map(x=>`<div class="card" style="border-left:4px solid ${['var(--ac)','var(--blue)','var(--warn)','var(--bad)'][x.lv]};padding:14px 16px"><div class="row" style="align-items:flex-start"><div style="color:${['var(--ac)','var(--blue)','var(--warn)','var(--bad)'][x.lv]}">${ic(x.lv?'warn':'check')}</div><div class="grow"><b>${esc(x.t)}</b><p class="muted small" style="margin-top:2px">${esc(x.d)}</p></div></div>${x.btn?`<div class="btns" style="margin-top:10px">${x.btn}</div>`:''}</div>`).join('')}
    <button class="btn ghost" onclick="CU=null;vCheckup()">Tekrar kontrol et</button>`);
}

// ---------------- Dosya yöneticisi ----------------
const FM={path:'',hidden:false,sel:new Set(),res:null};
const FICON=n=>{ const e=(n.split('.').pop()||'').toLowerCase(); return /^(jpe?g|png|gif|webp|heic)$/.test(e)?'🖼️':/^(mp4|mkv|mov|avi|3gp|webm)$/.test(e)?'🎬':/^(mp3|m4a|aac|ogg|opus|wav|flac|amr)$/.test(e)?'🎵':/^(pdf)$/.test(e)?'📕':/^(docx?|odt|txt|rtf)$/.test(e)?'📄':/^(xlsx?|csv)$/.test(e)?'📊':/^(zip|rar|7z|tar|gz)$/.test(e)?'🗜️':e==='apk'?'📦':e==='vcf'?'👥':'📃'; };
function vFiles(){
  if(!INFO.files){ V(`<div class="card"><b>Dosya izni gerekli</b><p class="muted small" style="margin:6px 0 12px">Dosyalarını gösterebilmem için "Tüm dosyalara erişim" iznini ver.</p><button class="btn pri" onclick="sync('openPerm',{which:'files'})">İzni ver</button></div>`); return; }
  const r=sync('fsList',{path:FM.path,hidden:FM.hidden}); if(!r||r.error){ toast(r&&r.error||'Açılamadı'); FM.path=''; return; } FM.res=r; FM.path=r.path;
  const rel=r.path===r.root?'':r.path.slice(r.root.length+1), parts=rel?rel.split('/'):[];
  const crumbs=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;font-size:14px"><button class="link" style="padding:4px" onclick="fmGo('')">📱 Dahili</button>${parts.map((p,i)=>`<span class="muted" style="padding:4px 0">›</span><button class="link" style="padding:4px" onclick="fmGo(${esc(JSON.stringify(r.root+'/'+parts.slice(0,i+1).join('/')))})">${esc(p)}</button>`).join('')}</div>`;
  const quick=!rel?`<div class="seg" style="margin-bottom:12px">${['Download','DCIM','Pictures','Documents','Music','Movies'].map(d=>`<button onclick="fmGo('${r.root}/${d}')">${{Download:'⬇️ İndirilenler',DCIM:'📷 Kamera',Pictures:'🖼️ Resimler',Documents:'📄 Belgeler',Music:'🎵 Müzik',Movies:'🎬 Videolar'}[d]}</button>`).join('')}</div>`:'';
  V(crumbs+quick+`<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn sm" onclick="fmMk()">${ic('plus')} Klasör</button><div class="grow"></div><span class="small muted">Gizli</span><div class="sw ${FM.hidden?'on':''}" onclick="FM.hidden=!FM.hidden;vFiles()"></div></div>
    ${r.items.length?`<div class="list">${r.items.map(f=>`<div class="item ${FM.sel.has(f.path)?'sel':''}"><div class="chk" onclick="fmSel(${esc(JSON.stringify(f.path))})">${ic('check')}</div>
      <button class="grow row" style="text-align:left;min-width:0;gap:10px" onclick="${f.dir?`fmGo(${esc(JSON.stringify(f.path))})`:`fmFile(${esc(JSON.stringify(f.path))})`}">${/\.(jpe?g|png|webp|gif)$/i.test(f.name)?`<div class="th" style="width:42px;height:42px"><img loading="lazy" src="/thumb/${b64url(f.path)}" onerror="this.remove()"></div>`:`<div style="font-size:28px;width:42px;text-align:center">${f.dir?'📁':FICON(f.name)}</div>`}
        <div class="grow" style="min-width:0"><div class="ellip" style="font-weight:600">${esc(f.name)}</div><div class="muted tiny">${f.dir?f.count+' öğe':bytes(f.size)} · ${date(f.mtime)}</div></div></button></div>`).join('')}</div>`:'<div class="card empty">Klasör boş.</div>'}
    <p class="muted tiny" style="margin:6px 4px">Boş alan: ${bytes(r.free)}. Android/data klasörüne Android izin vermiyor.</p>`);
  const d=$('#dock');
  if(FM.sel.size){ $('#dockIn').innerHTML=`<div class="grow"><b>${FM.sel.size} seçili</b></div>${FM.sel.size===1?`<button class="btn sm" onclick="fmRen()">Ad değiştir</button>`:''}<button class="btn red sm" onclick="fmDel()">${ic('trash')}</button><button class="btn sm ghost" onclick="FM.sel.clear();vFiles()">${ic('x')}</button>`; d.classList.add('show'); }
  else d.classList.remove('show');
}
function fmGo(p){ FM.path=p; FM.sel.clear(); vFiles(); scrollTo(0,0); }
function fmSel(p){ FM.sel.has(p)?FM.sel.delete(p):FM.sel.add(p); const y=scrollY; vFiles(); scrollTo(0,y); }
function fmFile(p){ const f=FM.res.items.find(x=>x.path===p); openSheet(`<div class="row" style="margin-bottom:12px"><div style="font-size:36px">${FICON(f.name)}</div><div class="grow" style="min-width:0"><h4 style="margin:0;word-break:break-all">${esc(f.name)}</h4><p class="muted tiny">${bytes(f.size)} · ${date(f.mtime)}</p></div></div>
  <div class="btns"><button class="btn pri" onclick="closeSheet();sync('fsOpen',{path:${esc(JSON.stringify(p))}})||toast('Bu dosyayı açacak uygulama yok')">Aç</button><button class="btn" onclick="closeSheet();sync('fsShare',{path:${esc(JSON.stringify(p))}})">Paylaş</button></div>
  <div class="btns" style="margin-top:10px"><button class="btn ghost" onclick="closeSheet();FM.sel=new Set([${esc(JSON.stringify(p))}]);fmRen()">Ad değiştir</button><button class="btn red" onclick="closeSheet();FM.sel=new Set([${esc(JSON.stringify(p))}]);fmDel()">Sil</button></div>`); }
function fmMk(){ openSheet(`<h4>Yeni klasör</h4><input type="text" id="fmN" placeholder="Klasör adı" style="margin:10px 0 14px"><button class="btn pri" onclick="const r=sync('fsMkdir',{path:FM.path,name:$('#fmN').value});if(r&&r.error)toast(r.error);else{closeSheet();vFiles();}">Oluştur</button>`); setTimeout(()=>$('#fmN')&&$('#fmN').focus(),250); }
function fmRen(){ const p=[...FM.sel][0], n=p.split('/').pop();
  openSheet(`<h4>Ad değiştir</h4><input type="text" id="fmN" value="${esc(n)}" style="margin:10px 0 14px"><button class="btn pri" onclick="const r=sync('fsRename',{path:${esc(JSON.stringify(p))},name:$('#fmN').value});if(r&&r.error)toast(r.error);else{closeSheet();FM.sel.clear();vFiles();}">Kaydet</button>`); }
function fmDel(){ const L=[...FM.sel], dirs=L.filter(p=>(FM.res.items.find(x=>x.path===p)||{}).dir).length;
  openSheet(`<h4>${L.length} öğe silinsin mi?</h4>${dirs?`<div class="note bad">${ic('warn')}<div><b>${dirs} klasör içindekilerle birlikte</b> silinecek.</div></div>`:''}<div class="note bad">${ic('warn')}<div>Kalıcı olarak silinir, geri alınamaz.</div></div>
    <div class="btns"><button class="btn ghost" onclick="closeSheet()">Vazgeç</button><button class="btn red" id="fmD">Evet, sil</button></div>`);
  $('#fmD').onclick=async()=>{ $('#fmD').disabled=true; const r=await call('fsDelete',{paths:L}); closeSheet(); FM.sel.clear(); refreshInfo(); vFiles();
    toast(r.error?'Hata: '+r.error:`${r.done} öğe silindi, ${bytes(r.freed)} açıldı`+(r.failed.length?` · ${r.failed.length} silinemedi`:'')); }; }
const _goBackOrig=goBack;
goBack=function(){ if(!sheetOpen()&&stack[stack.length-1]==='files'&&FM.res&&FM.res.path!==FM.res.root){ fmGo(FM.res.path.slice(0,FM.res.path.lastIndexOf('/'))); return true; } return _goBackOrig(); };

// ---------------- Fotoğraf küçültücü ----------------
T('compress','diger','🗜️','Fotoğraf küçültücü','Büyük fotoğraflarla yer aç',{
  view(){
    if(!INFO.files){ V(`<div class="card"><b>Dosya izni gerekli</b><p class="muted small" style="margin:6px 0 12px">Fotoğrafları okuyup küçültebilmem için "Tüm dosyalara erişim" gerekli.</p><button class="btn pri" onclick="sync('openPerm',{which:'files'})">İzni ver</button></div>`); return; }
    if(!TS.r){ V(`<div class="card row"><div class="spin"></div><span class="muted">Büyük fotoğraflar aranıyor…</span></div>`); call('bigPhotos',{min:(TS.min||3)<<20}).then(r=>{ TS.r=r; TS.sel=TS.sel||new Set(); if(TOOL&&TOOL.id==='compress') vTool(true); }); return; }
    const r=TS.r, S=TS.sel; let ss=0; r.items.forEach(f=>{ if(S.has(f.path)) ss+=f.size; });
    const est=Math.round(ss*0.55);
    V(`<div class="note info">${ic('info')}<div class="small">Fotoğraf en uzun kenarı <b>${TS.max||2560} piksele</b> indirilir ve yeniden kaydedilir. Telefonda ve sosyal medyada fark edilmez; çoğu fotoğraf <b>%40–70 küçülür</b>. Çekim tarihi korunur. Baskı için orijinali sakla.</div></div>
      <div class="card"><b class="small">En küçük boyut</b><div class="seg" style="margin:8px 0 12px">${[2,3,5,8].map(m=>`<button class="${(TS.min||3)===m?'on':''}" onclick="TS.min=${m};TS.r=null;TS.sel=new Set();vTool(true)">${m} MB+</button>`).join('')}</div>
        <b class="small">Hedef çözünürlük</b><div class="seg" style="margin:8px 0 12px">${[[1920,'Full HD'],[2560,'2K (önerilen)'],[3840,'4K']].map(([p,t])=>`<button class="${(TS.max||2560)===p?'on':''}" onclick="TS.max=${p};vTool(true)">${t}</button>`).join('')}</div>
        <div class="row" style="justify-content:space-between" onclick="TS.rep=!TS.rep;vTool(true)"><div><b class="small">Orijinalin yerine kaydet</b><p class="muted tiny">Kapalıysa yanına "-kucuk.jpg" olarak kaydedilir</p></div><div class="sw ${TS.rep?'on':''}"></div></div></div>
      <p class="muted small" style="margin:0 4px 10px">${r.count} fotoğraf · toplam ${bytes(r.total)}</p>
      <div class="btns" style="margin-bottom:10px"><button class="btn sm" onclick="TS.r.items.forEach(f=>TS.sel.add(f.path));vTool(true)">Tümünü seç</button><button class="btn sm ghost" onclick="TS.sel.clear();vTool(true)">Seçimi kaldır</button></div>
      ${r.items.length?`<div class="list">${r.items.map(f=>`<button class="item ${S.has(f.path)?'sel':''}" onclick="TS.sel.has('${esc(f.path)}')?TS.sel.delete('${esc(f.path)}'):TS.sel.add('${esc(f.path)}');const y=scrollY;vTool(true);scrollTo(0,y)"><div class="chk">${ic('check')}</div><div class="th"><img loading="lazy" src="/thumb/${b64url(f.path)}" onerror="this.remove()"></div><div class="grow" style="min-width:0"><div class="ellip" style="font-weight:600">${esc(f.name)}</div><div class="muted tiny">${date(f.mtime)}</div></div><div class="sz">${bytes(f.size)}</div></button>`).join('')}</div>`:'<div class="card empty">Bu boyutta fotoğraf yok.</div>'}`);
    const d=$('#dock'); if(S.size){ $('#dockIn').innerHTML=`<div class="grow"><b>${S.size} fotoğraf</b><div class="muted small">~${bytes(est)} yer açılır (tahmini)</div></div><button class="btn pri sm" id="cmpB" onclick="TOOL.run()">Küçült</button>`; d.classList.add('show'); } else d.classList.remove('show');
  },
  run(){ const L=[...TS.sel];
    openSheet(`<h4>${L.length} fotoğraf küçültülsün mü?</h4>${TS.rep?`<div class="note warn">${ic('warn')}<div>Orijinallerin yerine kaydedilecek. Geri alınamaz.</div></div>`:`<p class="muted" style="margin-bottom:12px">Küçük kopyalar orijinallerin yanına kaydedilecek. Beğenirsen orijinalleri sonra silebilirsin.</p>`}
      <div class="btns"><button class="btn ghost" onclick="closeSheet()">Vazgeç</button><button class="btn pri" id="cmGo">Başlat</button></div><p class="muted small" id="cmP" style="margin-top:10px;text-align:center"></p>`);
    $('#cmGo').onclick=async()=>{ $('#cmGo').disabled=true; const r=await call('compress',{paths:L,max:TS.max||2560,q:85,replace:!!TS.rep},t=>{ const e=$('#cmP'); if(e) e.textContent=t; });
      closeSheet(); if(r.error){ toast('Hata: '+r.error); return; } const errs=r.results.filter(x=>x.error).length, skip=r.results.filter(x=>x.skipped).length;
      openSheet(`<h4>Tamamlandı</h4><div class="note ok">${ic('check')}<div><b>${bytes(r.saved)}</b> ${TS.rep?'yer açıldı':'daha küçük kopya oluşturuldu'}.${skip?`<br>${skip} fotoğraf zaten küçüktü, dokunulmadı.`:''}${errs?`<br>${errs} fotoğraf işlenemedi.`:''}</div></div><button class="btn" onclick="closeSheet()">Tamam</button>`);
      TS.r=null; TS.sel=new Set(); refreshInfo(); vTool(true); }; },
  stop(){ $('#dock').classList.remove('show'); }});

// ---------------- Wi-Fi sinyal ölçer ----------------
T('wifisig','olcum','📶','Wi-Fi sinyal ölçer','Modemin en iyi çektiği yer',{
  view(){ V(`<div class="card"><div id="wsV">${big('—','dBm')}</div><div class="bar" style="margin:14px 0;height:16px"><i id="wsB" style="width:0"></i></div><div id="wsK"></div></div>
      <div class="card"><b class="small">Son 60 sn</b><svg id="wsG" viewBox="0 0 300 80" style="width:100%;height:90px;margin-top:8px"></svg></div>
      <div class="note info">${ic('info')}<div class="small">Evde dolaşarak sinyalin en güçlü olduğu yeri bul. <b>−50</b> mükemmel, <b>−67</b> iyi (görüntülü arama), <b>−75</b> zayıf, <b>−85</b> altı kopar. 5 GHz daha hızlı ama duvarlardan zor geçer.</div></div>`);
    TS.h=[]; TS.iv=setInterval(()=>TOOL.tick(),1000); TOOL.tick(); },
  tick(){ const w=sync('wifi')||{}; const e=$('#wsV'); if(!e) return;
    if(!w.on){ e.innerHTML=big('—','','<b style="color:var(--warn)">Wi-Fi kapalı</b>'); return; } if(!w.connected){ e.innerHTML=big('—','','Bir ağa bağlı değilsin'); return; }
    const r=w.rssi, q=r>=-55?['Mükemmel','var(--ac)']:r>=-67?['İyi','var(--ac)']:r>=-75?['Orta','var(--warn)']:['Zayıf','var(--bad)'];
    e.innerHTML=big(r,'dBm',`<b style="color:${q[1]}">${q[0]}</b>`); const b=$('#wsB'); b.style.width=Math.max(0,Math.min(100,(r+95)/60*100))+'%'; b.style.background=q[1];
    $('#wsK').innerHTML=`<div class="kv"><span>Ağ</span><span>${esc(w.ssid||'(adı gizli — konum izni gerekir)')}</span></div><div class="kv"><span>Bant</span><span>${w.freq>=5900?'6 GHz':w.freq>=4900?'5 GHz':'2,4 GHz'} (${w.freq} MHz)</span></div><div class="kv"><span>Bağlantı hızı</span><span>${w.speed} Mbps</span></div><div class="kv"><span>Yerel IP</span><span>${esc(w.ip)}</span></div>${w.std?`<div class="kv"><span>Standart</span><span>Wi-Fi ${{4:'4 (n)',5:'5 (ac)',6:'6 (ax)',7:'7 (be)'}[w.std]||w.std}</span></div>`:''}`;
    TS.h.push(r); if(TS.h.length>60) TS.h.shift(); const g=$('#wsG'); if(g) g.innerHTML=`<polyline fill="none" stroke="var(--ac)" stroke-width="2.5" points="${TS.h.map((v,i)=>`${i*5},${80-Math.max(0,Math.min(80,(v+95)/60*80))}`).join(' ')}"/>`; },
  stop(){ clearInterval(TS.iv); }, pause(){ clearInterval(TS.iv); }});

// ---------------- Pil geçmişi grafiği (Telefon durumu ekranında) ----------------
function battChart(){
  const H=sync('battHist')||[]; const on=(sync('charge')||{}).on;
  if(H.length<2) return `<div class="card"><b>Pil geçmişi</b><p class="muted small" style="margin-top:6px">${on?'Kayıt başladı; birkaç saat sonra grafik burada görünür.':'Pil seviyesini zamanla kaydetmek için <b>Ayarlar → Şarj izleyici</b>\'yi aç.'}</p>${on?'':`<button class="btn sm" style="margin-top:10px" onclick="go('about')">Şarj izleyiciyi aç</button>`}</div>`;
  const t0=Date.now()-24*3600e3, P=H.filter(x=>x[0]>=t0); const L=P.length>1?P:H.slice(-50);
  const a=L[0][0], z=Date.now(); const X=t=>(t-a)/(z-a)*300, Y=v=>100-v;
  let path=''; L.forEach((p,i)=>path+=(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]));
  const chg=L.filter(p=>p[2]).map(p=>`<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1])}" r="1.8" fill="var(--warn)"/>`).join('');
  let drain=''; const dis=L.filter(p=>!p[2]); if(dis.length>2){ const f=dis[0], l=dis[dis.length-1]; const hrs=(l[0]-f[0])/3600e3; if(hrs>0.5&&f[1]>l[1]) drain=`Ortalama tüketim: saatte <b>%${num((f[1]-l[1])/hrs,1)}</b>`; }
  return `<div class="card"><div class="row" style="justify-content:space-between"><b>Pil geçmişi</b><span class="muted tiny">son 24 saat</span></div>
    <svg viewBox="0 -4 300 108" style="width:100%;height:140px;margin-top:8px"><line x1="0" y1="20" x2="300" y2="20" stroke="var(--line)" stroke-dasharray="3"/><line x1="0" y1="80" x2="300" y2="80" stroke="var(--line)" stroke-dasharray="3"/>
      <path d="${path}" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-linejoin="round"/>${chg}<text x="2" y="17" font-size="9" fill="var(--tx3)">%80</text><text x="2" y="77" font-size="9" fill="var(--tx3)">%20</text></svg>
    <p class="muted tiny"><span style="color:var(--warn)">●</span> şarjdayken · ${drain}</p></div>`;
}
const _vDeviceOrig=vDevice;
vDevice=function(soft){ _vDeviceOrig(soft); const c=document.querySelectorAll('#view > .card')[0]; if(c) c.insertAdjacentHTML('afterend',battChart()); };

// ---------------- Gece saati ----------------
T('nightclock','gunluk','🕰️','Gece saati','Komodin saati, kırmızı ışık',{
  view(){ V(`<div class="card"><p class="small muted" style="margin-bottom:12px">Tam ekran büyük saat. Kırmızı renk gece gözü yormaz. Ekranın kapanmaması için Tek tık → ekran zaman aşımını uzat ya da Kafein kutucuğunu kullan.</p>
      <b class="small">Renk</b><div class="seg" style="margin:8px 0 14px">${[['#FF3B30','Kırmızı'],['#FFB020','Turuncu'],['#4FD1A5','Yeşil'],['#FFFFFF','Beyaz']].map(([c,t])=>`<button class="${(TS.c||'#FF3B30')===c?'on':''}" onclick="TS.c='${c}';vTool(true)">${t}</button>`).join('')}</div>
      <button class="btn pri" onclick="TOOL.show()">Saati göster</button></div>`); },
  show(){ const c=TS.c||'#FF3B30';
    overlay(`<div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${c};font-family:system-ui"><div id="ncT" style="font-size:${Math.min(innerWidth/3.2,innerHeight/3)}px;font-weight:200;letter-spacing:-.04em;font-variant-numeric:tabular-nums;opacity:.85"></div><div id="ncD" style="font-size:22px;opacity:.55;margin-top:6px"></div><div style="position:absolute;bottom:20px;font-size:12px;opacity:.3">Çıkmak için dokun</div></div>`,()=>closeOverlay());
    const tick=()=>{ const n=new Date(), t=$('#ncT'); if(!t) return; t.textContent=n.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); $('#ncD').textContent=n.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}); };
    tick(); clearInterval(TS.iv); TS.iv=setInterval(tick,5000); },
  onOverlayClose(){ clearInterval(TS.iv); }, stop(){ clearInterval(TS.iv); }});

// ---------------- Mors kodu ----------------
const MORSE={A:'.-',B:'-...',C:'-.-.',Ç:'-.-..',D:'-..',E:'.',F:'..-.',G:'--.',Ğ:'--.-.',H:'....',I:'..',İ:'.-..-',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',Ö:'---.',P:'.--.',Q:'--.-',R:'.-.',S:'...',Ş:'.--..',T:'-',U:'..-',Ü:'..--',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.','.':'.-.-.-',',':'--..--','?':'..--..'};
T('morse','diger','📡','Mors kodu','Çevir, fenerle/sesle gönder',{
  view(){ V(`<div class="card"><label class="small muted">Metin</label><input type="text" id="msT" value="${esc(TS.t||'SOS')}" oninput="TS.t=this.value;TOOL.conv()" style="margin:6px 0 12px">
      <div id="msO" style="font:700 22px ui-monospace,monospace;word-break:break-all;letter-spacing:2px;min-height:40px"></div>
      <div class="btns" style="margin-top:12px"><button class="btn pri" onclick="TOOL.play('light')">🔦 Fenerle</button><button class="btn" onclick="TOOL.play('sound')">🔊 Sesle</button><button class="btn" onclick="TOOL.play('vib')">📳 Titreşimle</button></div></div>
      <div class="card"><b class="small">Mors → metin</b><input type="text" id="msR" placeholder=".- -... (harfler arası boşluk, kelime arası /)" oninput="TOOL.rev()" style="margin-top:8px"><div id="msRO" style="font-size:20px;font-weight:700;margin-top:10px"></div></div>`); TOOL.conv(); },
  code(){ return trl(TS.t||'').toLocaleUpperCase('tr-TR').split(' ').map(w=>[...w].map(c=>MORSE[c]||'').filter(Boolean).join(' ')).join(' / '); },
  conv(){ const e=$('#msO'); if(e) e.textContent=TOOL.code().replace(/\./g,'·').replace(/-/g,'−'); },
  rev(){ const inv=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k])); $('#msRO').textContent=$('#msR').value.trim().split('/').map(w=>w.trim().split(/\s+/).map(c=>inv[c.replace(/·/g,'.').replace(/[−–]/g,'-')]||'').join('')).join(' '); },
  play(mode){ TOOL.halt(); const u=180, seq=[]; for(const ch of TOOL.code()){ if(ch==='.') seq.push([1,u],[0,u]); else if(ch==='-') seq.push([1,u*3],[0,u]); else if(ch===' ') seq.push([0,u*2]); else if(ch==='/') seq.push([0,u*2]); }
    let i=0; TS.run=true; const step=()=>{ if(!TS.run||i>=seq.length){ TOOL.halt(); return; } const [on,d]=seq[i++];
      if(mode==='light') sync('torch',{on:!!on}); else if(on&&mode==='sound') tone(700,0,d/1000); else if(on&&mode==='vib') sync('vibrate',{p:[d]});
      TS.tm=setTimeout(step,d); }; step(); },
  halt(){ TS.run=false; clearTimeout(TS.tm); sync('torch',{on:false}); }, stop(){ TOOL.halt(); }, pause(){ TOOL.halt(); }});

// ---------------- Resmi tatiller ----------------
const HOL=[['2026-01-01','Yılbaşı',1],['2026-03-19','Ramazan Bayramı arifesi',0.5],['2026-03-20','Ramazan Bayramı',3],['2026-04-23','Ulusal Egemenlik ve Çocuk Bayramı',1],['2026-05-01','Emek ve Dayanışma Günü',1],['2026-05-19','Atatürk\'ü Anma, Gençlik ve Spor Bayramı',1],['2026-05-26','Kurban Bayramı arifesi',0.5],['2026-05-27','Kurban Bayramı',4],['2026-07-15','Demokrasi ve Millî Birlik Günü',1],['2026-08-30','Zafer Bayramı',1],['2026-10-28','Cumhuriyet Bayramı arifesi',0.5],['2026-10-29','Cumhuriyet Bayramı',1],
  ['2027-01-01','Yılbaşı',1],['2027-03-08','Ramazan Bayramı arifesi',0.5],['2027-03-09','Ramazan Bayramı',3],['2027-04-23','Ulusal Egemenlik ve Çocuk Bayramı',1],['2027-05-01','Emek ve Dayanışma Günü',1],['2027-05-15','Kurban Bayramı arifesi',0.5],['2027-05-16','Kurban Bayramı',4],['2027-05-19','Atatürk\'ü Anma, Gençlik ve Spor Bayramı',1],['2027-07-15','Demokrasi ve Millî Birlik Günü',1],['2027-08-30','Zafer Bayramı',1],['2027-10-28','Cumhuriyet Bayramı arifesi',0.5],['2027-10-29','Cumhuriyet Bayramı',1]];
T('holidays','gunluk','🎉','Resmi tatiller','Geri sayım ve köprü günleri',{
  view(){ const now=new Date(); now.setHours(0,0,0,0); const up=HOL.filter(h=>new Date(h[0]+'T00:00')>=now); const nx=up[0];
    const days=d=>Math.round((new Date(d+'T00:00')-now)/864e5); const wd=d=>new Date(d+'T00:00').toLocaleDateString('tr-TR',{weekday:'long'});
    const bridge=h=>{ const w=new Date(h[0]+'T00:00').getDay(); return h[2]===1&&(w===2?'Pazartesi izin alırsan 4 gün':w===4?'Cuma izin alırsan 4 gün':''); };
    V((nx?`<div class="card" style="text-align:center">${big(days(nx[0]),'gün',`<b style="color:var(--tx)">${nx[1]}</b><br>${new Date(nx[0]+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}, ${wd(nx[0])}`)}</div>`:'')
      +`<div class="list">${up.map(h=>`<div class="item" style="align-items:flex-start"><div style="text-align:center;min-width:52px"><b style="font-size:20px">${new Date(h[0]+'T00:00').getDate()}</b><div class="muted tiny">${new Date(h[0]+'T00:00').toLocaleDateString('tr-TR',{month:'short'})}</div></div><div class="grow"><b>${h[1]}</b><div class="muted tiny">${wd(h[0])} · ${h[2]===0.5?'yarım gün (öğleden sonra)':h[2]+' gün'} · ${days(h[0])} gün kaldı</div>${bridge(h)?`<span class="badge ok">🌉 ${bridge(h)}</span>`:''}</div></div>`).join('')}</div>
      <p class="muted tiny" style="margin:4px">Dini bayram tarihleri Diyanet takvimine göre bir gün değişebilir. Hükümet ek "idari izin" ilan edebilir.</p>`); }});
