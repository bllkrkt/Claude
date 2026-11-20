/* Efsane Avcısı — 3B savaş sahnesi (Three.js r149).
   Hiçbir dış model/resim yok: kahramanlar, yoldaşlar, canavarlar ve bölgeler koddan "low-poly" olarak kurulur.
   Oyun koduyla bağlantı: window.S3D (init, setZone, setHero, setPet, spawn, hit, die, monAttack, heroAttack,
   petAttack, cast, buffs, heal, levelUp, lootBeam, shake, setActive, monScreen, heroScreen, legFx ...).
   Bölge indeksleri (ZD/BD/GD ve buildEnv): 0 Orman … 6 Gök Tapınağı, 7 Batık Şehir, 8 Hiçlik. Sınıflar: war, arc, mag, asn. */
(function(){
'use strict';
const T=window.THREE;if(!T)return;
/* doğru renk yönetimi: onaltılı renkler sRGB kabul edilir, ışık hesabı doğrusal yapılır, çıktı sRGB + ACES ton eşleme */
if(T.ColorManagement)T.ColorManagement.legacyMode=false;
const rnd=(a,b)=>a+Math.random()*(b-a);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const PI=Math.PI;

/* ---------------- yardımcılar ---------------- */
/* kalite (0 düşük · 1 orta · 2 yüksek): en başta tanımlı, çünkü geometri yardımcıları segment sayısını buna göre seçer */
let QF=1,QL=2;
const SQ=n=>QL>0?n:Math.max(4,Math.round(n*.65));
/* yumuşak gölgelendirme (flatShading yok); çok yüzlüler (dod/oct/ico 0) yine köşeli kalır */
function mat(c,o){return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.75,metalness:0,envMapIntensity:.5},o||{}))}
function metal(c){return mat(c,{metalness:.7,roughness:.3,envMapIntensity:1.1})}
function glow(c,i,o){return new T.MeshStandardMaterial(Object.assign({color:c,emissive:c,emissiveIntensity:i==null?1:i,roughness:.5},o||{}))}
function M(geo,mt,x,y,z,p){const o=new T.Mesh(geo,mt);o.position.set(x||0,y||0,z||0);o.castShadow=true;if(p)p.add(o);return o}
const box=(w,h,d)=>new T.BoxGeometry(w,h,d);
const sph=(r,w,h)=>new T.SphereGeometry(r,SQ(w||12),SQ(h||9));
const cyl=(a,b,h,s)=>new T.CylinderGeometry(a,b,h,SQ(s||8));
const cone=(r,h,s)=>new T.ConeGeometry(r,h,s||8);
const cap=(r,l)=>new T.CapsuleGeometry(r,l,2,SQ(8));
const dod=r=>new T.DodecahedronGeometry(r,0);
const oct=r=>new T.OctahedronGeometry(r,0);
const ico=(r,d)=>new T.IcosahedronGeometry(r,d||0);
const tor=(r,t,a)=>new T.TorusGeometry(r,t,5,SQ(16),a||PI*2);
const torS=(r,t)=>new T.TorusGeometry(r,t,3,SQ(12));
function PL(c,i,d){const o=new T.Object3D();o.userData.pl={c,i,d:d||5};return o}
function G(p){const g=new T.Group();if(p)p.add(g);return g}
function S(o,x,y,z){o.scale.set(x,y==null?x:y,z==null?x:z);return o}
function Rz(o,x,y,z){o.rotation.set(x||0,y||0,z||0);return o}
/* a noktasından b noktasına uzanan silindir (kol, bacak, kuyruk, dal) */
function seg(a,b,r1,r2,m,p){const d=b.clone().sub(a),len=d.length(),o=M(cyl(r2,r1,len,7),m,0,0,0,p);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o}
/* gözler: renkliyse parlayan iris + dikey göz bebeği; her gözde küçük beyaz ışıltı (canlı bakış) */
function eyes(p,y,z,sep,r,col){const m=col?glow(col,1.7):mat(0x151515,{roughness:.2}),pm=mat(0x050505,{roughness:.2}),hl=glow(0xffffff,2.2);
  for(const s of[-1,1]){const x=sep*s;M(sph(r,8,6),m,x,y,z,p);if(col)S(N(sph(r*.5,6,4),pm,x,y,z+r*.72,p),.7,1.4,.6);N(sph(r*.3,4,3),hl,x+r*.35,y+r*.4,z+r*.85,p)}}
function wingGeo(w,h){const s=new T.Shape();s.moveTo(0,0);s.lineTo(w*.3,h*.6);s.lineTo(w,h*.75);s.lineTo(w*.82,h*.3);s.lineTo(w*.66,h*.42);s.lineTo(w*.55,h*.05);s.lineTo(w*.4,h*.2);s.lineTo(w*.22,-h*.1);s.lineTo(0,0);return new T.ShapeGeometry(s)}
function wings(p,u,col,w,h,y,z,sep){u.wings=[];const m=mat(col,{side:T.DoubleSide});for(const s of[-1,1]){const g=G(p);g.position.set(sep*s,y,z);g.rotation.y=-s*.45;const w0=M(wingGeo(w,h),m,0,0,0,g);if(s<0)w0.scale.x=-1;u.wings.push(g)}}
function softDot(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
/* dört kollu yıldız parıltısı (kritik vuruş) */
function starTex(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.translate(64,64);const g=x.createRadialGradient(0,0,0,0,0,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.7)');g.addColorStop(.35,'rgba(255,255,255,.1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-64,-64,128,128);
  for(const r of[0,PI/2,PI/4,-PI/4]){x.save();x.rotate(r);const l=x.createLinearGradient(-64,0,64,0),k=r%(PI/2)?.45:1;l.addColorStop(0,'rgba(255,255,255,0)');l.addColorStop(.5,'rgba(255,255,255,'+k+')');l.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=l;x.beginPath();x.ellipse(0,0,r%(PI/2)?40:64,r%(PI/2)?2:3.5,0,0,PI*2);x.fill();x.restore()}return new T.CanvasTexture(c)}
/* kenarları koyulaşan doku: ekran vinyeti ve zemin karartması (merkez saydam) */
function vigTex(a0,a1,inner){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(inner,'rgba(0,0,0,'+a0+')');g.addColorStop(1,'rgba(0,0,0,'+a1+')');x.fillStyle='rgba(0,0,0,'+a1+')';x.fillRect(0,0,128,128);x.fillStyle=g;x.clearRect(0,0,128,128);x.fillRect(0,0,128,128);return new T.CanvasTexture(c)}
/* aynı gruptaki, aynı malzemeyi paylaşan sabit parçaları tek geometride birleştirir: çizim çağrısı sayısı çok düşer (telefonda asıl maliyet) */
function bake(root){root.traverse(p=>{if(!p.children.length)return;const by=new Map();
  for(const c of p.children){const gm=c.geometry;if(c.isMesh&&!c.isInstancedMesh&&!c.children.length&&gm&&!gm.userData.keep&&gm.attributes.normal&&gm.attributes.uv&&!Array.isArray(c.material)){if(!by.has(c.material))by.set(c.material,[]);by.get(c.material).push(c)}}
  by.forEach((ls,m)=>{if(ls.length<2)return;let n=0,ni=0;const gs=ls.map(c=>{c.updateMatrix();const g=c.geometry.clone();g.applyMatrix4(c.matrix);const k=g.attributes.position.count;n+=k;ni+=g.index?g.index.count:k;return g});
    /* indeks korunur: köşe sayısı artmaz (köşe gölgelendiricisi ucuz kalır) */
    const P=new Float32Array(n*3),Nr=new Float32Array(n*3),U=new Float32Array(n*2),I=new (n>65535?Uint32Array:Uint16Array)(ni);let o=0,q=0;
    gs.forEach(g=>{const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);Nr.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);
      if(g.index){const ix=g.index.array;for(let j=0;j<ix.length;j++)I[q++]=ix[j]+o}else for(let j=0;j<c;j++)I[q++]=o+j;o+=c;g.dispose()});
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(P,3));bg.setAttribute('normal',new T.BufferAttribute(Nr,3));bg.setAttribute('uv',new T.BufferAttribute(U,2));bg.setIndex(new T.BufferAttribute(I,1));
    const cs=ls.some(c=>c.castShadow);ls.forEach(c=>{p.remove(c);c.geometry.dispose()});const mm=new T.Mesh(bg,m);mm.castShadow=cs;p.add(mm)})});return root}
function dispose(o){o.traverse(n=>{if(n.isInstancedMesh)n.dispose();if(n.geometry&&!n.geometry.userData.keep)n.geometry.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.userData.keep)return;if(m.map&&!m.userData.keepMap)m.map.dispose();m.dispose()})})}

/* ---------------- insansı (kahramanlar ve pek çok canavar) ---------------- */
/* yuvarlak gövde/etek: (yarıçap, y) profilinden döndürülmüş yüzey */
function lathe(pts,s){return new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),SQ(s||12))}
/* kıvrımlı kumaş (pelerin, atkı, önlük): üstü dar, altı geniş ve dalgalı; üst kenar y=0'da */
function clothGeo(w,h,fold,flare,wrap){const g=new T.PlaneGeometry(w,h,QL?6:4,QL?5:3),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),k=.5-y/h,xn=x/w*2;
    p.setXYZ(i,x*(1+(flare==null?.45:flare)*k),y-h/2,xn*xn*w*(wrap==null?.22:wrap)+Math.sin(xn*PI*1.5+.5)*(fold||.035)*(.3+k))}
  g.computeVertexNormals();return g}
const dk=(c,k)=>TC.set(c).multiplyScalar(k==null?.55:k).getHex();
/* yüz: göz akı + iris + göz bebeği + ışıltı, kaşlar, burun, ağız. Canavarlarda kaşlar öfkeli çatılır */
function faceMk(hd,o,sk){const mon=!o.hero,z0=.2,wm=mat(0xf6f2ea,{roughness:.3}),im=o.eye?glow(o.eye,1.6):mat(o.iris||0x4a2e1a,{roughness:.3}),pm=mat(0x080808,{roughness:.2}),hl=glow(0xffffff,2.2),
    bm=mat(o.brow!=null?o.brow:dk(o.hair!=null?o.hair:o.skin,.45));
  for(const s of[-1,1]){const x=.078*s;S(N(sph(.044,7,5),wm,x,.035,z0-.006,hd),1,1.05,.55);S(N(sph(.028,6,4),im,x,.035,z0+.008,hd),1,1,.5);S(N(sph(.015,6,4),pm,x,.035,z0+.016,hd),1,1.15,.5);N(sph(.009,4,3),hl,x+.011,.049,z0+.023,hd);
    Rz(N(box(.078,.022,.026),bm,x*1.05,.09,.188,hd),0,-s*.18,s*(mon?.34:.1));
    if(!o.mask&&!o.hood&&!o.helmet)S(N(sph(.045,6,5),sk,.214*s,.01,-.01,hd),.45,1,.8)}
  if(!o.mask){S(N(sph(.03,6,5),sk,0,-.012,.21,hd),1,1.1,1.1);N(box(mon?.1:.065,.016,.02),mat(mon?0x2a0808:0x7a3a2a),0,-.092,.193,hd).rotation.x=-.2}}
function humanoid(o){
  o=Object.assign({skin:0xf1c27d,cloth:0x3a6ea5,pants:0x3b3b4f,boots:0x3a2a1a,b:1,arm:1},o);
  const g=G(),u=g.userData,b=o.b,hero=!!o.hero,tw=o.slim?.86:1;
  const sk=mat(o.skin,{roughness:.62}),cl=o.metal?metal(o.cloth):mat(o.cloth),pa=mat(o.pants),bo=mat(o.boots,{roughness:.55}),so=mat(0x1a120c),
    tr=metal(o.trim||0xd4af37),lt=mat(0x5a3a1e,{roughness:.6}),cdk=mat(dk(o.cloth,.5));
  /* bacaklar: uyluk + baldır, yuvarlak burunlu çizme */
  if(o.float){u.fly=1;const r=.36*b;M(lathe([[0,-.02],[r*.22,.08],[r*.55,.45],[r*.95,1.0],[r,1.1],[r*.6,1.14]],12),o.robe?mat(o.robe):cl,0,.07,0,g)}
  else for(const s of[-1,1]){const L=G(g);L.position.set(.16*b*s,.84,0);M(cap(.11*b,.2),pa,0,-.17,0,L);M(cap(.088*b,.2),pa,0,-.47,0,L);
    if(o.metal)S(M(sph(.075*b,6,4),cl,0,-.33,.07,L),1,1,.6);
    M(cyl(.1*b,.095*b,.2,8),bo,0,-.63,0,L);S(M(sph(.11*b,7,5),bo,0,-.76,.05,L),1,.65,1.5);N(box(.2*b,.035,.32*b),so,0,-.816,.05,L);
    if(hero)Rz(N(torS(.1*b,.025),bo,0,-.53,0,L),PI/2);u[s<0?'legL':'legR']=L}
  /* cübbe / tunik eteği */
  if(o.robe&&!o.float){const rb=mat(o.robe),r=b;M(lathe([[.24*r,1.0],[.29*r,.72],[.38*r,.35],[.5*r,.04],[.47*r,0]],12),rb,0,0,0,g);if(hero)Rz(N(torS(.49*r,.03),tr,0,.05,0,g),PI/2)}
  if(o.tunic&&!o.robe&&!o.float)M(lathe([[.23*b,.88],[.27*b,.7],[.33*b,.52]],12),cl,0,0,0,g);
  /* gövde: göğüs geniş, bel ince */
  S(M(lathe([[.2*b,-.36],[.235*b,-.22],[.25*b,-.04],[.29*b,.16],[.285*b,.26],[.2*b,.34],[.09,.39]],12),cl,0,1.14,0,g),tw,1,.8);
  if(o.metal){S(M(sph(.25*b,10,7),cl,0,1.26,.06,g),1.04*tw,.82,.62);if(hero)N(box(.02,.3,.05),tr,0,1.24,.205,g)}
  else if(hero){N(box(.018,.36,.03),cdk,0,1.2,.215*tw,g);for(let i=0;i<3;i++)N(box(.07,.012,.03),cdk,0,1.1+i*.1,.217*tw,g)}
  if(o.belly)M(sph(.31*b),cl,0,1.02,.07,g);
  N(cyl(.075,.085,.16,8),sk,0,1.53,0,g);
  if(hero&&!o.hood)Rz(N(torS(.15*b,.035),o.metal?tr:cdk,0,1.49,0,g),PI/2);
  /* kemer + toka + kese; cübbede kuşak */
  if(!o.float){const bm=o.belt?metal(o.belt):mat(0x3a2a1a),yb=o.robe?.98:.84,rr=(o.robe?.26:.225)*b*tw;S(M(cyl(rr,rr,.075,12),bm,0,yb,0,g),1,1,.82);
    if(!o.robe||hero){N(box(.085,.075,.03),hero||o.belt?tr:mat(0x8a8a8a),0,yb,rr*.82+.01,g);if(hero&&!o.robe)S(N(box(.09,.1,.06),lt,.17*b*tw,yb-.05,.12,g),1,1,1).rotation.y=.6}
    if(o.robe&&hero)for(const s of[-1,1])Rz(N(box(.05,.3,.015),bm,.06*s,yb-.18,rr*.8,g),0,0,s*.12)}
  /* önlük (savaşçı): göğüsten dizlere kumaş */
  if(o.tabard&&!o.robe){const tc=mat(o.cape||o.cloth,{side:T.DoubleSide}),tb=G(g);tb.position.set(0,.88,.2*tw);tb.rotation.x=-.08;N(clothGeo(.24*b,.42,.012,.2,.05),tc,0,0,0,tb);N(box(.2*b,.02,.02),tr,0,-.42,.02,tb)}
  /* omuzluk: iki katlı zırh + altın kenar */
  if(o.pauldron){const pm=metal(o.pauldron);for(const s of[-1,1]){const P=G(g);P.position.set(.34*b*s,1.45,0);P.rotation.z=-s*.38;
    S(M(new T.SphereGeometry(.17*b,SQ(10),SQ(5),0,PI*2,0,PI*.55),pm,0,0,0,P),1,.85,1.05);S(M(new T.SphereGeometry(.15*b,SQ(10),SQ(4),0,PI*2,0,PI*.5),pm,0,-.075,0,P),1.12,.7,1.12);
    Rz(N(torS(.16*b,.02),tr,0,-.01,0,P),PI/2);if(hero)N(cone(.035,.1,4),tr,0,.15*b,0,P)}}
  if(o.wraps)for(let i=0;i<4;i++)Rz(M(torS(.27*b,.028),mat(0xcdbb94),0,.92+i*.15,0,g),PI/2+(i%2?.18:-.18));
  if(o.ribs)for(let i=0;i<3;i++)M(tor(.2,.03,PI),mat(0xeee8d5),0,.98+i*.13,.05,g);
  /* pelerin: kıvrımlı kumaş, bekleme animasyonunda dalgalanır */
  if(o.cape){const ch=o.capeH||1,cg=G(g);cg.position.set(0,1.49,-.215*b);cg.rotation.x=.14;u.cape=cg;M(clothGeo(.6*b,ch,.045,.55),mat(o.cape,{side:T.DoubleSide}),0,0,0,cg);
    if(hero)for(const s of[-1,1])N(sph(.04,6,4),tr,.17*b*s,1.47,.12,g)}
  /* atkı (suikastçı): boyun sargısı + arkada savrulan iki uç */
  if(o.scarf){const sm=mat(o.scarf,{side:T.DoubleSide});Rz(M(torS(.12,.045),sm,0,1.5,.0,g),PI/2);u.scarf=[];for(const s of[-1,1]){const sg=G(g);sg.position.set(.07*s,1.5,-.13);sg.rotation.set(.9,s*.25,0);N(clothGeo(.09,.5,.02,.3,.1),sm,0,0,0,sg);u.scarf.push(sg)}}
  /* sırt yüzgeci (balık adam, köpekbalığı) */
  if(o.fin)Rz(S(M(cone(.2*b,.6*b,4),mat(o.finC||o.skin),0,1.4,-.3*b,g),.22,1,1),-.45);
  if(o.wings)wings(g,u,o.wings,1.1,.8,1.3,-.2,.15);
  /* baş */
  const hd=G(g);hd.position.set(0,1.66,0);u.head=hd;if(o.hs2)hd.scale.setScalar(o.hs2);
  if(o.head==='skull'){const bn=mat(0xeee8d5,{roughness:.5});S(M(sph(.21,12,10),bn,0,.01,0,hd),1,1.05,1.05);M(box(.17,.07,.15),bn,0,-.17,.05,hd);for(const s of[-1,1])S(N(sph(.055,8,6),mat(0x140c08),.075*s,.02,.165,hd),1,1.1,.5);
    for(let i=0;i<5;i++)N(box(.022,.035,.02),bn,-.06+i*.03,-.14,.13,hd);eyes(hd,.02,.18,.075,.03,o.eye||0x000001)}
  else if(o.head==='void'){M(sph(.2),mat(0x050505),0,0,.03,hd);eyes(hd,.02,.18,.07,.04,o.eye||0xff2a2a)}
  else if(o.head==='fish'){const fm=mat(o.finC||0xff8a4a,{side:T.DoubleSide});S(M(sph(.22,12,10),sk,0,0,.05,hd),.85,1.05,1.35);S(M(sph(.16,10,8),mat(0xd8f0e0),0,-.09,.12,hd),.9,.6,1.2);
    for(const s of[-1,1]){M(sph(.075,10,8),mat(0xfff8d0),.16*s,.06,.13,hd);M(sph(.04,8,6),glow(o.eye||0xffd000,1.2),.2*s,.06,.16,hd);N(sph(.014,4,3),glow(0xffffff,2),.21*s,.075,.195,hd);Rz(S(M(cone(.09,.24,4),fm,.2*s,-.04,-.03,hd),.3,1,1),0,0,-s*1.2)}
    S(M(tor(.07,.024),mat(0x3a1020),0,-.08,.32,hd),1,.6,1);Rz(S(M(cone(.13,.42,4),fm,0,.22,-.06,hd),.25,1,1.6),-.5)}
  else if(o.head==='shark'){S(M(sph(.24,12,10),sk,0,0,.02,hd),.9,.95,1.3);Rz(S(M(cone(.2,.42,10),sk,0,.03,.38,hd),1,.85,1),PI/2);S(M(sph(.2,10,8),mat(0xe8eef2),0,-.1,.14,hd),.85,.6,1.3);
    M(box(.26,.05,.12),mat(0x3a0a10),0,-.12,.3,hd);for(let i=0;i<7;i++)Rz(N(cone(.018,.05,3),mat(0xffffff),-.11+i*.037,-.1,.34,hd),PI);eyes(hd,.06,.2,.16,.035,o.eye)}
  else{S(M(sph(.22,12,10),sk,0,0,0,hd),.97,1.04,1);faceMk(hd,o,sk)}
  /* saç: kask/sarık yoksa; başlık altında sadece perçem, büyücüde uzun beyaz saç */
  if(o.hair!=null&&!o.helmet&&!o.turban&&!o.head){const hm=mat(o.hair,{roughness:.5});
    if(!o.hood&&!o.hat){Rz(M(new T.SphereGeometry(.238,SQ(14),SQ(7),0,PI*2,0,PI*.44),hm,0,.02,-.02,hd),-.42);for(let i=-1;i<=1;i++)Rz(S(N(sph(.07,8,6),hm,i*.085,.15,.15,hd),1.15,.65,.7),0,0,i*.35)}
    else for(const s of[-1,1])Rz(S(N(sph(.06,8,6),hm,.075*s,.135,.165,hd),1.2,.6,.7),0,0,s*.4);
    if(o.hat==='wizard'){S(M(sph(.21,10,8),hm,0,-.1,-.08,hd),1.12,1.35,.75);for(const s of[-1,1])S(M(sph(.08,8,6),hm,.19*s,-.06,.0,hd),.6,1.5,.9)}}
  if(o.ears)for(const s of[-1,1])Rz(M(cone(.07,.32,6),sk,.25*s,.04,0,hd),0,0,-s*PI/2.3);
  if(o.tusks)for(const s of[-1,1])Rz(M(cone(.03,.12,5),mat(0xfff8e0),.07*s,-.1,.18,hd),-.3);
  if(o.horns)for(const s of[-1,1]){const hs=o.hs||1,hn=mat(o.horns,{roughness:.4});Rz(M(cone(.06*hs,.22*hs,8),hn,.13*s,.2,0,hd),0,0,-s*.45);Rz(M(cone(.035*hs,.2*hs,7),hn,(.13+.1*hs)*s,.2+.17*hs,-.02,hd),-.35,0,-s*.05)}
  if(o.headWrap)for(let i=0;i<3;i++)Rz(M(torS(.22,.028),mat(0xcdbb94),0,-.08+i*.09,0,hd),PI/2+(i-1)*.2);
  /* başlık: yüzü açık kabuk + geriye kıvrık uç + boyun sargısı */
  if(o.hood){const hm=mat(o.hood,{side:T.DoubleSide});S(M(new T.SphereGeometry(.285,SQ(14),SQ(5),0,PI*2,0,PI*.36),hm,0,.03,-.035,hd),1,1.1,1.05);S(M(new T.SphereGeometry(.285,SQ(14),SQ(6),PI*.5+.82,PI*2-1.64,PI*.36,PI*.44),hm,0,.03,-.035,hd),1,1.1,1.05);
    Rz(N(torS(.17,.055),mat(o.hood),0,-.2,-.02,hd),PI/2+.25);if(o.hoodTip)Rz(M(cone(.13,.34,8),hm,0,.3,-.2,hd),-.95)}
  /* yüz maskesi: yüzün alt yarısını örter, gözler açıkta kalır */
  if(o.mask)S(M(sph(.228,12,10),mat(o.mask),0,-.085,.015,hd),1,.55,1);
  /* büyücü şapkası: geniş kenar, geriye bükülen külah, altın bant ve yıldız */
  if(o.hat==='wizard'){const hm=mat(o.hatC);M(cyl(.41,.39,.025,SQ(18)),hm,0,.15,0,hd);Rz(N(torS(.4,.022),hm,0,.15,0,hd),PI/2);
    let P=G(hd),r=.23;P.position.set(0,.16,-.02);for(const h of[.24,.2,.17]){const r2=r*.6;M(cyl(r2,r,h,10),hm,0,h/2,0,P);const Q=G(P);Q.position.y=h;Q.rotation.x=-.3;P=Q;r=r2}M(cone(r,.16,8),hm,0,.08,0,P);
    Rz(N(torS(.225,.028),glow(0xffd84a,.6),0,.2,0,hd),PI/2);N(oct(.045),glow(0xffe14a,1.8),0,.27,.19,hd)}
  if(o.turban){S(M(sph(.25),mat(o.turban),0,.13,0,hd),1,.7,1);M(sph(.05),glow(0xff3df0,1.2),0,.14,.23,hd)}
  /* miğfer: kubbe + yüz açıklığı, burun siperi, yanak plakaları, sırt, tüy */
  if(o.helmet){const hm=metal(o.helmet);M(new T.SphereGeometry(.25,SQ(14),SQ(6),0,PI*2,0,PI*.4),hm,0,.02,0,hd);
    M(new T.SphereGeometry(.25,SQ(14),SQ(4),PI*.5+.9,PI*2-1.8,PI*.4,PI*.22),hm,0,.02,0,hd);Rz(N(torS(.248,.024),o.plume?tr:hm,0,.085,0,hd),PI/2);
    N(box(.035,.15,.035),hm,0,.02,.245,hd);for(const s of[-1,1])Rz(N(box(.07,.15,.04),hm,.165*s,-.06,.15,hd),0,s*.62,0);Rz(N(new T.TorusGeometry(.25,.022,3,SQ(10),PI),hm,0,.025,0,hd),0,PI/2,0);
    if(o.plume){const pm=mat(o.plume,{roughness:.7});for(let i=0;i<4;i++){const a=1.1+i*.3;S(N(sph(.078-i*.008,7,5),pm,0,.06+.27*Math.sin(a),.27*Math.cos(a)-.02,hd),.6,1.35,1.2).rotation.x=a-PI/2}}}
  if(o.crown){const cm=metal(o.crown);M(cyl(.21,.2,.1,10),cm,0,.22,0,hd);for(let i=0;i<5;i++){const a=i/5*PI*2;M(cone(.04,.13,4),cm,Math.sin(a)*.2,.33,Math.cos(a)*.2,hd);N(sph(.022,6,4),glow(0xffe14a,1.2),Math.sin(a)*.2,.4,Math.cos(a)*.2,hd)}M(sph(.04),glow(0xff2a6a,1.4),0,.24,.21,hd)}
  /* sakal: dolgun alt kısım + bıyık */
  if(o.beard){const bm=mat(o.beard,{roughness:.7});S(M(sph(.15,10,8),bm,0,-.15,.1,hd),1,1.05,.8);Rz(M(cone(.13,.3,10),bm,0,-.32,.11,hd),PI+.15);for(const s of[-1,1])Rz(S(N(sph(.05,6,5),bm,.05*s,-.075,.2,hd),1.7,.6,.7),0,0,-s*.35)}
  /* kollar: omuz, üst kol, ön kol, eldiven/el + başparmak */
  const ar=.085*b*o.arm,a=o.arm,slv=o.sleeve?cl:sk,gl=o.glove!=null?mat(o.glove,{roughness:.55}):sk;
  for(const s of[-1,1]){const A=G(g);A.position.set(.36*b*s,1.38,0);M(sph(ar*1.28,7,5),slv,0,-.01,0,A);M(cap(ar,.2*a),slv,0,-.16*a,0,A);M(cap(ar*.92,.17*a),o.sleeve&&!o.metal?slv:sk,0,-.42*a,0,A);
    if(o.glove!=null)M(cyl(ar*1.25,ar*1.05,.1*a,8),gl,0,-.5*a,0,A);if(o.bracer)M(cyl(ar*1.2,ar*1.1,.14*a,8),lt,0,-.43*a,0,A);
    S(M(sph(ar*1.12,7,5),gl,0,-.6*a,.01,A),.95,1.1,.85);S(N(sph(ar*.45,6,4),gl,-s*ar*.75,-.56*a,.05,A),1,1.3,1);if(s>0)u.armR=A;else u.armL=A}
  if(o.ring){u.orb=G(g);u.orb.position.y=1.15;M(oct(.075),glow(o.ring,2),.62,0,0,u.orb);M(oct(.05),glow(o.ring,2),-.62,.15,0,u.orb)}
  /* silah */
  if(o.weapon){const W=G(u.armR);W.position.set(0,-.62*o.arm,.04);W.rotation.x=PI/2;weapon(W,o);u.wep=W;
    /* çift el (suikastçı): sol ele de aynı silah, ışıksız */
    if(o.dual){const W2=G(u.armL);W2.position.set(0,-.62*o.arm,.04);W2.rotation.x=PI/2;weapon(W2,Object.assign({},o,{wepLight:0}));u.wep2=W2}}
  /* kalkan: yuvarlak gövde, altın kenar, iç halka, göbek ve haç amblem */
  if(o.shield){const Sg=G(u.armL);Sg.position.set(-.06,-.5,.14);const sm=mat(o.shield,{roughness:.5});Rz(M(cyl(.3,.3,.06,SQ(18)),sm,0,0,0,Sg),PI/2);Rz(M(torS(.3,.035),tr,0,0,0,Sg),0);
    Rz(N(torS(.19,.014),tr,0,0,.032,Sg),0);N(box(.05,.36,.02),tr,0,0,.035,Sg);N(box(.36,.05,.02),tr,0,0,.035,Sg);M(sph(.07,7,5),tr,0,0,.05,Sg)}
  if(o.bow){const Bg=G(u.armL);Bg.position.set(0,-.6,.05);Bg.rotation.y=PI/2;Rz(M(tor(.48,.03,PI),mat(0x7a4a22),0,0,0,Bg),0,0,PI/2);M(cyl(.006,.006,.96,3),mat(0xeeeeee),0,0,0,Bg);
    for(const s of[-1,1])N(sph(.035,6,4),tr,0,.47*s,0,Bg);
    const Q=G(g);Q.position.set(-.16,1.22,-.25);Q.rotation.x=.3;M(cyl(.08,.065,.5,8),lt,0,0,0,Q);Rz(N(torS(.082,.015),tr,0,.24,0,Q),PI/2);for(let i=0;i<3;i++){N(cyl(.008,.008,.12,3),mat(0x8a5a2a),-.03+i*.03,.3,0,Q);N(cone(.03,.09,4),mat([0xff4040,0xffffff,0xff4040][i]),-.03+i*.03,.36,0,Q)}
    const st=G(g);st.position.set(0,1.2,0);st.rotation.z=.75;S(N(torS(.3,.02),lt,0,0,0,st),1,.78,1).rotation.x=PI/2}
  return g}
/* silah parıltısı: çapraz iki yumuşak düzlem (ışık eklemez) */
let auraGeo=null;
function wepAura(W,c,y,h,w){if(!auraGeo)auraGeo=KEEP(new T.PlaneGeometry(1,1));const m=new T.MeshBasicMaterial({map:dot(),color:c,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});m.userData.keepMap=1;m.userData.fx=1;
  for(let i=0;i<2;i++){const p=new T.Mesh(auraGeo,m);p.scale.set(w,h,1);p.position.y=y;p.rotation.y=i*PI/2;W.add(p)}}
function weapon(W,o){const t=o.weapon,wc=o.wepC,gm=o.wepGlow&&wc?glow(wc,.75,{metalness:.4,roughness:.3}):null,BM=d=>gm||metal(wc||d),au=(y,h,w)=>{if(gm)wepAura(W,wc,y,h,w)},
    gd=metal(0xd4af37),gr=mat(0x3a2414,{roughness:.6});
  if(o.wepLight&&wc){const l=PL(wc,1.3,3.2);l.position.set(0,.8,0);W.add(l)}
  if(t==='sword'){M(cyl(.03,.034,.22,8),gr,0,0,0,W);Rz(N(torS(.034,.009),gd,0,0,0,W),PI/2);N(sph(.045,6,4),gd,0,-.13,0,W);
    M(box(.3,.045,.07),gd,0,.12,0,W);for(const s of[-1,1])N(sph(.038,6,4),gd,.155*s,.12,0,W);N(oct(.032),glow(o.gem||0xff3d6a,1.3),0,.12,.045,W);
    M(box(.085,.95,.026),BM(0xdfe6ef),0,.62,0,W);N(box(.022,.78,.032),metal(0x8a929e),0,.58,0,W);M(cone(.043,.14,4),BM(0xdfe6ef),0,1.16,0,W);au(.65,1.35,.42)}
  else if(t==='dagger'){M(cyl(.026,.028,.18,8),gr,0,0,0,W);N(sph(.035,8,6),gd,0,-.1,0,W);M(box(.17,.035,.05),metal(0x5a5a6a),0,.1,0,W);for(const s of[-1,1])Rz(N(cone(.02,.06,4),metal(0x5a5a6a),.09*s,.12,0,W),0,0,-s*.6);
    M(box(.065,.44,.02),BM(0xdfe6ef),0,.34,0,W);N(box(.016,.36,.026),metal(0x8a929e),0,.32,0,W);M(cone(.033,.12,4),BM(0xdfe6ef),0,.62,0,W);au(.36,.75,.3)}
  else if(t==='club'){M(cyl(.05,.14,.95,8),mat(wc||0x6b4a2a),0,.45,0,W);for(let i=0;i<5;i++)M(cone(.03,.1,4),mat(0xcccccc),Math.sin(i*1.6)*.12,.68+i*.05,Math.cos(i*1.6)*.12,W)}
  else if(t==='axe'){M(cyl(.03,.03,1.0,8),gr,0,.4,0,W);for(let i=0;i<2;i++)Rz(N(torS(.036,.01),gd,0,.05+i*.1,0,W),PI/2);M(box(.32,.26,.05),BM(0xaab3bf),.14,.78,0,W);N(box(.04,.3,.06),BM(0xd8e0ea),.3,.78,0,W);
    M(box(.12,.2,.05),BM(0xaab3bf),-.1,.78,0,W);N(cyl(.05,.05,.12,8),gd,0,.78,0,W);M(cone(.03,.12,4),gd,0,.95,0,W);au(.78,.6,.6)}
  else if(t==='hammer'){M(cyl(.035,.035,1.0,8),gr,0,.4,0,W);M(box(.42,.26,.26),BM(0x8a929e),0,.88,0,W);M(box(.46,.08,.3),gd,0,.88,0,W);for(const s of[-1,1])N(box(.04,.28,.28),BM(0xb8c0cc),.21*s,.88,0,W);au(.88,.6,.7)}
  else if(t==='spear'){M(cyl(.028,.028,1.7,8),mat(0x6b4a2a),0,.55,0,W);M(cone(.07,.34,4),BM(0xdfe6ef),0,1.55,0,W);M(cyl(.05,.05,.06,8),gd,0,1.36,0,W);for(const s of[-1,1])Rz(N(cone(.025,.12,4),gd,.06*s,1.36,0,W),0,0,-s*1.1);au(1.5,.6,.35)}
  else if(t==='staff'){W.rotation.x=.35;const oc=o.orb||0x7fe7ff;M(cyl(.032,.042,1.7,8),mat(0x5a3a1a),0,.3,0,W);for(let i=0;i<2;i++)Rz(N(torS(.045,.012),gd,0,.55+i*.35,0,W),PI/2);
    M(ico(.12,1),glow(oc,2),0,1.22,0,W);M(torS(.13,.02),gd,0,1.08,0,W).rotation.x=PI/2;for(let i=0;i<3;i++){const a=i/3*PI*2;Rz(N(cone(.02,.24,4),gd,Math.sin(a)*.1,1.2,Math.cos(a)*.1,W),Math.cos(a)*.35,0,-Math.sin(a)*.35)}
    wepAura(W,oc,1.22,.75,.75);const l=PL(oc,1.2,3);l.position.set(0,1.2,0);W.add(l)}
  else if(t==='scythe'){W.rotation.x=.25;M(cyl(.03,.03,2.0,8),mat(0x2a1a10),0,.5,0,W);Rz(M(tor(.45,.045,PI*.75),metal(0xb8c4d0),-.4,1.4,0,W),0,0,-.2);wepAura(W,0x6affff,1.45,.9,.9)}
  else if(t==='trident'){const tm=metal(0xd4af37);M(cyl(.03,.03,1.4,8),tm,0,.5,0,W);for(const x of[-.1,0,.1])M(cone(.03,.25,4),tm,x,1.3,0,W);M(box(.24,.04,.04),tm,0,1.18,0,W);N(oct(.04),glow(0xff3d6a,1.4),0,1.2,.03,W)}}

/* ---------------- dört ayaklılar ---------------- */
function quad(o){
  o=Object.assign({c:0x7d6b5a,len:1.3,h:.45,w:.6,head:'wolf',tail:'thin',lt:1,bh:1},o);
  const g=G(),u=g.userData,bm=mat(o.c),am=mat(o.c2==null?o.c:o.c2),y=o.h+.3;
  S(M(sph(.5,12,9),bm,0,y,0,g),o.w,.62*o.bh,o.len);
  S(M(sph(.45,10,8),am,0,y-.1,.05,g),o.w*.85,.45*o.bh,o.len*.8);
  const lx=o.w*.3,lz=o.len*.3;
  const pw=mat(o.paw||0x2a2018),cw=mat(0xf4ecd8,{roughness:.35}),th=mat(0xfffaf0,{roughness:.3});
  for(const sx of[-1,1])for(const sz of[-1,1]){const lt=o.lt,x=lx*sx,z=lz*sz;S(M(sph(.15*lt,10,8),bm,x*1.05,y*.82,z,g),1,1.25,1.1);M(cyl(.09*lt,.07*lt,y,8),bm,x,y/2,z,g);S(M(sph(.085*lt,8,6),pw,x,.045,z+.03,g),1,.75,1.2);
    /* pençeler: her ayakta üç küçük tırnak */
    for(let k=-1;k<=1;k++)Rz(N(cone(.017*lt,.07*lt,4),cw,x+k*.04*lt,.03,z+.1*lt,g),PI/2)}
  if(o.head!=='camel'&&o.head!=='mammoth')seg(V(0,y+.08,o.len*.28),V(0,y+.12+(o.neckH||0),o.len*.48),.17*o.w/.55,.13*o.w/.55,bm,g);
  const hd=G(g);hd.position.set(0,y+.18+(o.neckH||0),o.len*.5);u.head=hd;
  const nose=mat(0x161616,{roughness:.25}),fang=(x,y2,z,l)=>Rz(N(cone(.017,l||.06,4),th,x,y2,z,hd),PI);
  switch(o.head){
    case'wolf':case'fox':{S(M(sph(.2,12,10),bm,0,0,0,hd),1,.9,1.05);S(M(sph(.12,10,8),am,0,-.06,.22,hd),.85,.72,1.55);M(sph(.045,8,6),nose,0,-.01,.42,hd);
      N(box(.13,.012,.16),mat(0x2a0808),0,-.115,.3,hd);for(const s of[-1,1]){fang(.04*s,-.13,.37);fang(.07*s,-.13,.3,.045)}
      const eh=o.head==='fox'?.24:.18,ie=mat(0xc89088);for(const s of[-1,1]){M(cone(.075,eh,6),bm,.12*s,.22,-.04,hd);N(cone(.045,eh*.7,5),ie,.12*s,.21,-.015,hd);Rz(S(N(sph(.09,8,6),am,.17*s,-.07,.02,hd),.5,1,1),0,0,s*.5)}
      eyes(hd,.06,.17,.09,.035,o.eye);break}
    case'boar':{S(M(sph(.28),bm,0,0,0,hd),1,1,1.25);Rz(M(cyl(.12,.12,.14,8),mat(0xc98a7a),0,-.05,.36,hd),PI/2);for(const s of[-1,1]){Rz(M(cone(.035,.2,5),mat(0xfff8e0),.11*s,-.08,.33,hd),-.7);M(cone(.07,.15,4),bm,.16*s,.24,-.05,hd)}eyes(hd,.07,.25,.11,.035,o.eye);break}
    case'bear':{M(sph(.3),bm,0,0,0,hd);for(const s of[-1,1]){M(sph(.09,8,6),bm,.19*s,.22,-.02,hd);N(sph(.05,6,4),am,.19*s,.22,.03,hd);fang(.05*s,-.15,.33)}S(M(sph(.14),am,0,-.06,.24,hd),1,.85,1);M(sph(.05,8,6),nose,0,-.02,.37,hd);
      N(box(.12,.012,.05),mat(0x2a0808),0,-.13,.33,hd);eyes(hd,.07,.25,.11,.035,o.eye);break}
    case'deer':{S(M(sph(.22),bm,0,0,0,hd),1,1,1.4);M(sph(.045,8,6),nose,0,-.03,.3,hd);eyes(hd,.06,.17,.1,.035,o.eye);
      const am2=o.glow?glow(o.glow,1.3):mat(0xe8dcc0);for(const s of[-1,1]){const a=V(.1*s,.18,0),b=V(.3*s,.55,-.05),c=V(.48*s,.75,-.1);seg(a,b,.03,.025,am2,hd);seg(b,c,.025,.015,am2,hd);seg(b,V(.2*s,.75,.05),.02,.012,am2,hd);seg(V(.4*s,.66,-.08),V(.55*s,.58,.05),.018,.01,am2,hd)}
      if(o.glow){const l=PL(o.glow,1.2,4);l.position.set(0,.6,0);hd.add(l)}break}
    case'lion':{const mn=mat(o.mane||0x8a4a1a);M(ico(.46,1),mn,0,.02,-.1,hd);for(let i=0;i<12;i++){const a=i/12*PI*2;Rz(N(cone(.1,.32,5),mn,Math.sin(a)*.42,.02+Math.cos(a)*.42,-.12,hd),PI/2-.3,0,-a)}
      for(const s of[-1,1])fang(.05*s,-.16,.36);M(sph(.3),bm,0,0,.05,hd);M(sph(.13),am,0,-.08,.3,hd);M(sph(.05,8,6),nose,0,-.02,.41,hd);eyes(hd,.07,.3,.11,.035,o.eye);break}
    case'camel':{const n=seg(V(0,-.45,-.15),V(0,.25,.15),.14,.11,bm,hd);S(M(sph(.17),bm,0,.3,.28,hd),1,.9,1.6);eyes(hd,.36,.4,.1,.03,o.eye);for(let i=0;i<(o.humps||1);i++)S(M(sph(.28),bm,0,y+.15,-.15+i*.35-(o.humps>1?.15:0),g),1,.9,1.1);break}
    case'mammoth':{M(sph(.42),bm,0,0,0,hd);let p=V(0,-.1,.35),pts=[V(0,-.45,.5),V(0,-.8,.48),V(0,-1.05,.38)];let r=.13;for(const q of pts){seg(p,q,r,r*.8,bm,hd);p=q;r*=.8}
      for(const s of[-1,1]){Rz(M(tor(.42,.05,PI*.8),mat(0xfff4dc),.18*s,-.35,.35,hd),0,PI/2,PI*.85);S(M(sph(.25),bm,.38*s,.02,-.05,hd),.3,1.2,1)}
      eyes(hd,.08,.37,.17,.04,o.eye);M(ico(.45,1),mat(o.fur||0x5a3a22),0,.25,-.2,hd);break}
    case'rat':{S(M(sph(.2),bm,0,0,0,hd),1,.9,1.5);M(sph(.04,8,6),mat(0xff9aa8),0,-.02,.3,hd);for(const s of[-1,1])S(M(sph(.09,8,6),mat(0xe8a0a8),.13*s,.17,-.05,hd),1,1,.35);eyes(hd,.06,.2,.08,.03,o.eye);break}
    case'horse':{Rz(M(box(.22,.26,.55),bm,0,0,.1,hd),-.35);eyes(hd,.12,.15,.12,.035,o.eye);for(const s of[-1,1])M(cone(.05,.14,4),bm,.08*s,.28,-.06,hd);
      if(o.horn){Rz(M(cone(.045,.5,6),glow(o.horn,1),0,.35,.12,hd),.55)}for(let i=0;i<4;i++)M(box(.08,.2,.12),mat(o.mane||0xff8ad8),0,.15-i*.12,-.2-i*.09,hd);break}}
  if(o.tail==='thin')seg(V(0,y+.05,-o.len*.48),V(0,y-.1,-o.len*.48-.55),.05,.025,bm,g);
  else if(o.tail==='bushy'){const t=Rz(S(M(sph(.17),bm,0,y+.1,-o.len*.5-.28,g),1,1,2.4),.6);if(o.tip)M(sph(.11),mat(o.tip),0,y+.25,-o.len*.5-.6,g)}
  else if(o.tail==='tuft'){seg(V(0,y,-o.len*.48),V(0,y-.3,-o.len*.48-.5),.04,.03,bm,g);M(sph(.09),mat(o.mane||0x5a2a10),0,y-.33,-o.len*.48-.55,g)}
  else if(o.tail==='long'){let p=V(0,y,-o.len*.45),r=.12;for(let i=0;i<5;i++){const q=V(0,y-.1-i*.05,-o.len*.45-.3*(i+1));seg(p,q,r,r*.75,bm,g);p=q;r*=.75}}
  if(o.bristle)for(let i=0;i<5;i++)M(cone(.05,.18,4),mat(0x2a1a10),0,y+.3,.35-i*.18,g);
  if(o.wings)wings(g,u,o.wings,1.0,.7,y+.25,0,.12);
  return g}

/* ---------------- kuşlar, yarasa, penguen ---------------- */
function bird(o){const g=G(),u=g.userData,bm=mat(o.c||0x6d5640),am=mat(o.c2||0xc8b18a);
  if(o.type==='owl'){u.fly=1;S(M(sph(.45),bm,0,.9,0,g),1,1.2,.9);S(M(sph(.3),am,0,.85,.2,g),1,1.3,.5);M(sph(.38),bm,0,1.45,0,g);
    for(const s of[-1,1]){Rz(M(cyl(.13,.13,.04,12),mat(0xffe08a),.15*s,1.5,.33,g),PI/2);M(sph(.06,8,6),mat(0x111111),.15*s,1.5,.36,g);Rz(M(cone(.07,.22,4),bm,.22*s,1.82,0,g),0,0,-s*.3)}
    Rz(M(cone(.05,.14,4),mat(0xe0a020),0,1.38,.38,g),PI*.6);u.wings=[];for(const s of[-1,1]){const w=G(g);w.position.set(.42*s,1.05,0);S(M(sph(.28),bm,0,-.15,0,w),.3,1.1,.8);u.wings.push(w)}
    for(const s of[-1,1])M(cone(.05,.1,4),mat(0xe0a020),.12*s,.42,.1,g)}
  else if(o.type==='eagle'){u.fly=1;S(M(sph(.4),bm,0,1,0,g),.8,.7,1.5);M(sph(.24),mat(0xf5f5f0),0,1.25,.5,g);Rz(M(cone(.07,.24,5),mat(0xf0b020),0,1.2,.75,g),PI/2.3);
    eyes(g,1.3,.68,.11,.035,0xffc000);wings(g,u,o.c||0x5a3b22,1.5,.7,1.08,0,.18);Rz(S(M(cone(.25,.5,5),mat(0xf5f5f0),0,1,-.65,g),1,.25,1),-PI/2)}
  else if(o.type==='bat'){u.fly=1;u.fast=1;M(sph(.24),bm,0,1,0,g);M(sph(.18),bm,0,1.3,.08,g);for(const s of[-1,1])Rz(M(cone(.07,.24,4),bm,.1*s,1.5,.05,g),0,0,-s*.25);
    eyes(g,1.33,.23,.065,.035,o.eye||0xff2a2a);for(const s of[-1,1])M(cone(.02,.06,3),mat(0xffffff),.04*s,1.22,.22,g).rotation.x=PI;wings(g,u,o.c||0x3a3040,1.1,.7,1.05,0,.12)}
  else if(o.type==='penguin'){S(M(sph(.42),mat(0x1c2230),0,.7,0,g),1,1.5,.9);S(M(sph(.36),mat(0xf5f5f5),0,.66,.1,g),.9,1.35,.7);M(sph(.28),mat(0x1c2230),0,1.32,0,g);
    for(const s of[-1,1]){M(sph(.06,8,6),mat(0xffffff),.1*s,1.38,.22,g);M(sph(.03,6,5),mat(0x000000),.1*s,1.38,.27,g);Rz(M(box(.12,.03,.04),mat(0x000000),.1*s,1.47,.25,g),0,0,s*.4)}
    Rz(M(cone(.06,.2,5),mat(0xff9a1f),0,1.28,.33,g),PI/2);u.wings=[];for(const s of[-1,1]){const w=G(g);w.position.set(.4*s,1.0,0);S(M(sph(.2),mat(0x1c2230),0,-.25,0,w),.3,1.4,.6);u.wings.push(w)}
    for(const s of[-1,1])M(box(.16,.04,.22),mat(0xff9a1f),.14*s,.02,.1,g)}
  return g}

/* ---------------- örümcek, yılan, akrep, kertenkele ---------------- */
function spider(o){const g=G(),u=g.userData,bm=mat(o.c||0x2b2233);M(sph(.33),bm,0,.6,.35,g);S(M(sph(.55),bm,0,.78,-.4,g),1,.85,1.1);
  for(let i=0;i<4;i++)M(sph(.09,8,6),mat(o.c2||0xb03040),Math.sin(i)*.15,1.12-i*.08,-.35-i*.12,g);
  for(let i=0;i<6;i++)M(sph(.04,6,5),glow(0xff2020,2),(i%3-1)*.09,.7+Math.floor(i/3)*.07,.65,g);
  for(const s of[-1,1])Rz(M(cone(.04,.16,4),mat(0x111111),.08*s,.45,.6,g),PI);
  u.legs=[];for(let i=0;i<4;i++)for(const s of[-1,1]){const L=G(g);L.position.set(s*.22,.6,.5-i*.22);const dir=V(s,0,(1.5-i)*.5).normalize();
    const k=dir.clone().multiplyScalar(.55).add(V(0,.45,0)),f=dir.clone().multiplyScalar(1.15).add(V(0,-.6,0));seg(V(0,0,0),k,.055,.045,bm,L);seg(k,f,.045,.02,bm,L);u.legs.push(L)}
  return g}
function snake(o){const g=G(),u=g.userData,bm=mat(o.c||0x3c9a3c),am=mat(o.c2||0xd4e157);
  Rz(M(tor(.5,.16),bm,0,.16,0,g),PI/2);Rz(M(tor(.33,.14),bm,0,.42,0,g),PI/2);
  const n=G(g);n.position.set(0,.45,-.1);u.neck=n;const pts=[V(0,0,0),V(0,.35,.05),V(0,.7,.15),V(0,.95,.3)];let r=.15;for(let i=1;i<pts.length;i++){seg(pts[i-1],pts[i],r,r*.9,bm,n);M(sph(r*.92,8,6),bm,pts[i].x,pts[i].y,pts[i].z,n);r*=.9}
  S(M(sph(.17),bm,0,1.02,.42,n),1,.7,1.4);eyes(n,1.08,.5,.09,.035,0xffd000);M(box(.02,.01,.18),mat(0xff2040),0,.98,.68,n);
  if(o.hood){S(M(sph(.3),bm,0,.95,.28,n),1.25,1.35,.18);for(let i=0;i<3;i++)M(sph(.05,6,5),am,0,.85+i*.1,.33,n)}
  for(let i=0;i<5;i++)M(sph(.06,6,5),am,Math.sin(i*2)*.5,.24,Math.cos(i*2)*.5,g);
  return g}
function scorpion(o){const g=G(),u=g.userData,bm=mat(o.c||0xc08a3a),dm=mat(o.c2||0x7a4a1a);
  S(M(sph(.35),bm,0,.35,0,g),1,.55,1.4);M(sph(.25),bm,0,.38,.5,g);eyes(g,.5,.72,.08,.035,0x111111);
  for(let i=0;i<3;i++)for(const s of[-1,1]){const a=V(.25*s,.35,.2-i*.25),k=V(.6*s,.5,.25-i*.3),f=V(.85*s,0,.3-i*.35);seg(a,k,.04,.035,dm,g);seg(k,f,.035,.02,dm,g)}
  for(const s of[-1,1]){const a=V(.2*s,.38,.6),k=V(.45*s,.42,.95),c=V(.35*s,.42,1.25);seg(a,k,.06,.05,bm,g);seg(k,c,.06,.07,bm,g);S(M(sph(.13),bm,c.x,c.y,c.z+.05,g),1,.7,1.4);Rz(M(cone(.045,.25,4),dm,c.x-.07*s,c.y,c.z+.25,g),PI/2)}
  const t=G(g);u.tail=t;const pts=[V(0,.4,-.45),V(0,.65,-.85),V(0,1.05,-1.0),V(0,1.45,-.85),V(0,1.65,-.5),V(0,1.6,-.2)];let r=.13;for(let i=1;i<pts.length;i++){seg(pts[i-1],pts[i],r,r*.9,bm,t);M(sph(r,8,6),bm,pts[i].x,pts[i].y,pts[i].z,t);r*=.9}
  Rz(M(cone(.06,.3,5),glow(o.sting||0x9aff3a,1),0,1.48,-.05,t),PI*.8);return g}
function lizard(o){const g=G(),bm=mat(o.c||0x5a7a4a),am=o.glow?glow(o.glow,1.2):mat(o.c2||0x3a5a2a);
  S(M(sph(.4),bm,0,.35,0,g),.7,.45,1.8);Rz(M(box(.3,.2,.45),bm,0,.42,.85,g),-.1);eyes(g,.52,1.0,.12,.04,o.eye||0xffd000);
  for(const sx of[-1,1])for(const sz of[-1,1]){const a=V(.2*sx,.3,.4*sz),k=V(.45*sx,.3,.45*sz),f=V(.5*sx,0,.5*sz+.1);seg(a,k,.06,.05,bm,g);seg(k,f,.05,.04,bm,g)}
  let p=V(0,.35,-.65),r=.15;for(let i=0;i<5;i++){const q=V(Math.sin(i*.7)*.12,.3-i*.05,-.65-.3*(i+1));seg(p,q,r,r*.75,bm,g);p=q;r*=.75}
  for(let i=0;i<6;i++)M(cone(.05,.16,4),am,0,.55,.55-i*.22,g);
  if(o.glow){const l=PL(o.glow,1,3);l.position.set(0,.8,0);g.add(l)}return g}

/* ---------------- elementaller, golemler, diğerleri ---------------- */
function elemental(o){const g=G(),u=g.userData;u.fly=1;
  if(o.type==='fire'){M(sph(.38),glow(0xff6a10,1.6),0,1,0,g);u.flames=[];for(let i=0;i<8;i++){const a=i/8*PI*2,c=[0xffd23d,0xff8a1f,0xff3d10][i%3];const f=M(cone(.15,.6+Math.random()*.35,6),glow(c,1.6,{transparent:true,opacity:.92}),Math.sin(a)*.22,1.35,Math.cos(a)*.22,g);f.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35);u.flames.push(f)}
    for(const s of[-1,1])Rz(M(cone(.11,.55,6),glow(0xff8a1f,1.5),.5*s,1.0,0,g),0,0,-s*PI/2.2);eyes(g,1.07,.34,.11,.06,0x2a0a00);const l=PL(0xff7a1a,2,6);l.position.set(0,1.1,.4);g.add(l)}
  else if(o.type==='ice'){const c1=o.c||0x8fe0ff,c2=o.c2||0xbff0ff;S(M(oct(.5),glow(c1,.45,{transparent:true,opacity:.92,metalness:.2,roughness:.15}),0,1.1,0,g),1,1.5,.8);
    for(const s of[-1,1]){M(oct(.2),glow(c2,.4),.45*s,1.45,0,g);M(oct(.17),glow(c2,.4),.6*s,.9,.05,g);S(M(oct(.14),glow(c2,.4),.65*s,.6,.08,g),1,1.6,1)}
    eyes(g,1.25,.28,.1,.05,0xeaffff);const sp=G(g);sp.position.y=1.1;u.spin=sp;for(let i=0;i<6;i++){const a=i/6*PI*2;Rz(M(oct(.1),glow(c2,.8),Math.sin(a)*.95,Math.cos(a*2)*.2,Math.cos(a)*.95,sp),a,a,0)}
    const l=PL(c1,1.5,5);l.position.set(0,1.2,.5);g.add(l)}
  else{const gm=glow(o.c||0xe8f0ff,.35,{transparent:true,opacity:.8});M(sph(.4),gm,0,1.35,0,g);const b=M(cone(.42,1.1,10),gm,0,.75,0,g);b.rotation.x=PI;
    for(const s of[-1,1])Rz(M(cone(.1,.5,6),gm,.42*s,1.05,.05,g),0,0,-s*PI/2.4);for(const s of[-1,1])S(M(sph(.08,8,6),mat(0x111111),.14*s,1.42,.34,g),1,1.5,.5);S(M(sph(.09,8,6),mat(0x111111),0,1.22,.36,g),1,1.3,.4);
    const l=PL(o.c||0xbfd8ff,.8,4);l.position.set(0,1.3,.5);g.add(l)}
  return g}
function golem(o){const g=G(),u=g.userData,rm=mat(o.c||0x8a7f70),gm=o.lava?glow(o.gc||0xff6a10,1.6):mat(o.moss||0x5a7a3a);
  S(M(dod(.62),rm,0,1.25,0,g),1.15,.95,.85);M(dod(.3),rm,0,2.0,.05,g);eyes(g,2.02,.3,.11,.05,o.eye||(o.lava?0xffd23d:0x7fffd4));
  for(const s of[-1,1]){const A=G(g);A.position.set(.75*s,1.55,0);M(dod(.24),rm,0,-.1,0,A);M(dod(.22),rm,0,-.5,.05,A);M(dod(.32),rm,0,-.95,.1,A);if(s>0)u.armR=A;else u.armL=A;
    M(dod(.3),rm,.32*s,.32,0,g)}
  for(let i=0;i<6;i++)M(sph(.09,6,5),gm,Math.sin(i*2.1)*.5,1.0+Math.cos(i*1.3)*.35,.45,g);
  if(o.lava){const l=PL(o.gc||0xff6a10,2,6);l.position.set(0,1.3,.8);g.add(l)}return g}
function snowman(){const g=G(),w=mat(0xf6fbff);M(sph(.55),w,0,.5,0,g);M(sph(.4),w,0,1.22,0,g);M(sph(.29),w,0,1.82,0,g);
  eyes(g,1.88,.25,.1,.045,0xff2020);Rz(M(cone(.05,.3,6),mat(0xff8a1f),0,1.82,.4,g),PI/2);for(let i=0;i<5;i++)M(sph(.03,6,5),mat(0x111111),(i-2)*.06,1.72-Math.abs(i-2)*.02,.26,g);
  M(cyl(.3,.3,.03,14),mat(0x1a1a1a),0,2.05,0,g);M(cyl(.19,.19,.32,12),mat(0x1a1a1a),0,2.22,0,g);M(cyl(.195,.195,.06,12),mat(0xb22222),0,2.1,0,g);
  Rz(M(tor(.3,.07),mat(0xb22222),0,1.56,0,g),PI/2);const st=mat(0x5a3a1a);for(const s of[-1,1]){seg(V(.35*s,1.3,0),V(.95*s,1.65,.05),.04,.03,st,g);seg(V(.8*s,1.56,.05),V(.95*s,1.4,.15),.02,.015,st,g)}
  for(let i=0;i<3;i++)M(sph(.05,6,5),mat(0x111111),0,1.4-i*.17,.4,g);return g}
function seal(){const g=G(),bm=mat(0x8a9aa8),am=mat(0xc8d4dc);Rz(S(M(sph(.5),bm,0,.45,0,g),.75,.6,1.5),-.35);M(sph(.3),bm,0,.95,.55,g);M(sph(.13),am,0,.88,.8,g);
  M(sph(.05,8,6),mat(0x111111),0,.92,.92,g);for(const s of[-1,1]){M(sph(.07,8,6),mat(0x0a0a0a),.12*s,1.02,.8,g);Rz(S(M(sph(.2),bm,.4*s,.35,.3,g),1.4,.2,.6),0,0,s*.4)}
  Rz(S(M(sph(.2),bm,0,.15,-.75,g),1.6,.2,.6),0);return g}
function dragon(o){const g=G(),u=g.userData,bm=mat(o.c),am=mat(o.c2),gl=glow(o.glow||0xff5a00,1.6);
  S(M(sph(.6),bm,0,.95,0,g),.9,.7,1.5);S(M(sph(.5),am,0,.85,.1,g),.75,.55,1.2);
  for(const sx of[-1,1])for(const sz of[-1,1]){const a=V(.35*sx,.8,.45*sz),k=V(.45*sx,.4,.5*sz+.1),f=V(.45*sx,0,.55*sz+.15);seg(a,k,.13,.11,bm,g);seg(k,f,.11,.09,bm,g);M(sph(.11,8,6),am,f.x,.05,f.z+.08,g)}
  const n=G(g);u.head=n;let p=V(0,1.1,.6),r=.22;const np=[V(0,1.45,.85),V(0,1.8,.95),V(0,2.05,1.0)];for(const q of np){seg(p,q,r,r*.9,bm,g);M(sph(r*.9,8,6),bm,q.x,q.y,q.z,g);p=q;r*=.9}
  n.position.copy(p);S(M(sph(.25,12,10),bm,0,0,.08,n),.9,.75,1.1);S(M(sph(.17,10,8),bm,0,-.05,.42,n),.95,.62,1.55);S(N(sph(.13,8,6),gl,0,-.14,.4,n),.85,.3,1.5);
  for(let i=0;i<4;i++)for(const s of[-1,1])Rz(N(cone(.022,.07,4),mat(0xfffaf0),.035*s+.06*s*i/3,-.12,.62-i*.08,n),PI);for(const s of[-1,1]){N(sph(.025,6,4),mat(0x0a0a0a),.06*s,.0,.67,n);Rz(S(N(sph(.07,8,6),am,.13*s,.12,.28,n),1.4,.45,.8),0,0,-s*.3)}
  for(let i=0;i<5;i++)S(N(sph(.22,10,6),am,0,.72,.45-i*.24,g),1.15,.35,.6);
  eyes(n,.1,.32,.13,.05,o.glow||0xffd000);for(const s of[-1,1]){Rz(M(cone(.06,.45,6),mat(o.horn||0xf0e6c8),.14*s,.3,-.15,n),-.9,0,-s*.2);M(cone(.03,.1,4),mat(0xffffff),.1*s,-.17,.6,n).rotation.x=PI}
  wings(g,u,o.wc||o.c,2.2,1.4,1.35,-.1,.25);
  p=V(0,.95,-.85);r=.2;for(let i=0;i<6;i++){const q=V(Math.sin(i*.8)*.2,.85-i*.1,-.85-.35*(i+1));seg(p,q,r,r*.78,bm,g);p=q;r*=.8}M(cone(.12,.3,4),am,p.x,p.y,p.z-.12,g).rotation.x=-PI/2;
  for(let i=0;i<5;i++)M(cone(.07,.25,4),am,0,1.35,.5-i*.3,g);
  const l=PL(o.glow||0xff5a00,1.2,5);l.position.set(0,2,1.6);g.add(l);return g}
function reaper(){const g=G(),u=g.userData;u.fly=1;const rb=mat(0x1a1622);M(cone(.6,1.7,10),rb,0,.85,0,g);
  for(let i=0;i<6;i++){const a=i/6*PI*2;M(cone(.1,.35,4),rb,Math.sin(a)*.5,.05,Math.cos(a)*.5,g).rotation.x=PI}
  const hd=G(g);hd.position.set(0,1.85,0);u.head=hd;S(M(sph(.32),rb,0,0,-.04,hd),1,1.15,1);M(sph(.22),mat(0x030303),0,-.02,.1,hd);eyes(hd,0,.28,.08,.045,0x6affff);
  for(const s of[-1,1]){const A=G(g);A.position.set(.38*s,1.5,0);Rz(M(cone(.16,.7,8),rb,0,-.3,0,A),0,0,0);M(sph(.06),mat(0xeee8d5),0,-.68,0,A);if(s>0)u.armR=A;else u.armL=A}
  const W=G(u.armR);W.position.set(0,-.7,.05);W.rotation.x=PI/2;weapon(W,{weapon:'scythe'});const l=PL(0x6affff,1,4);l.position.set(0,1.9,.5);g.add(l);return g}
function turtle(){const g=G(),sm=mat(0x3f8a3a),bm=mat(0x9ac46a);S(M(new T.SphereGeometry(.5,12,8,0,PI*2,0,PI/2),sm,0,.18,0,g),1,.8,1.2);M(cyl(.52,.52,.08,12),mat(0x6a5a2a),0,.2,0,g).scale.z=1.2;
  for(let i=0;i<5;i++)M(cyl(.1,.12,.05,6),mat(0x2f6a2a),Math.sin(i*1.25)*.25,.55,Math.cos(i*1.25)*.3,g);M(sph(.18),bm,0,.28,.7,g);eyes(g,.34,.84,.08,.035);
  for(const sx of[-1,1])for(const sz of[-1,1])S(M(sph(.13),bm,.38*sx,.1,.4*sz,g),1,.6,1.2);M(cone(.06,.2,5),bm,0,.15,-.68,g).rotation.x=-PI/2;return g}
function eyeMon(o){const g=G(),u=g.userData;u.fly=1;const bm=mat(o.c||0x2a1a40);M(sph(.6,16,12),bm,0,1.3,0,g);
  M(sph(.42,14,10),mat(0xf4f0ff),0,1.3,.3,g);M(sph(.24,12,9),glow(o.glow||0xc060ff,1.6),0,1.3,.55,g);M(sph(.11,10,8),mat(0x050505),0,1.3,.72,g);
  for(let i=0;i<6;i++){const a=i/6*PI*2;Rz(M(cone(.08,.3,5),bm,Math.sin(a)*.55,1.3+Math.cos(a)*.55,0,g),0,0,-a)}
  u.legs=[];for(let i=0;i<5;i++){const a=i/5*PI*2,L=G(g);L.position.set(Math.sin(a)*.3,.8,Math.cos(a)*.3);let p=V(0,0,0),r=.07;for(let j=0;j<4;j++){const q=V(Math.sin(a)*.12*(j+1),-.22*(j+1),Math.cos(a)*.12*(j+1));seg(p,q,r,r*.75,bm,L);p=q;r*=.75}u.legs.push(L)}
  const l=PL(o.glow||0xc060ff,1.5,5);l.position.set(0,1.3,1);g.add(l);return g}
function sunkChest(){const g=G(),u=g.userData,wd=mat(0x2f5a5a,{roughness:.9}),mt=metal(0xc9a24a),bar=mat(0xd8e0d0,{roughness:.6}),moss=mat(0x3f8a4a,{roughness:.95});
  M(box(1.2,.6,.8),wd,0,.3,0,g);for(const x of[-.56,0,.56])M(box(.08,.62,.84),mt,x,.3,0,g);M(box(1.1,.04,.7),glow(0x6fe8ff,1.4),0,.61,0,g);
  const lid=G(g);lid.position.set(0,.6,-.4);u.chomp=lid;M(box(1.2,.3,.8),wd,0,.15,.4,lid);for(const x of[-.56,0,.56])M(box(.08,.32,.84),mt,x,.15,.4,lid);
  M(box(.18,.2,.06),mt,0,.0,.83,lid);M(sph(.05,8,6),glow(0xbff4ff,1.6),0,-.02,.87,lid);
  for(let i=0;i<9;i++){const a=i*2.4,x=Math.cos(a)*.5,z=Math.sin(a)*.32;M(sph(.045+(i%3)*.015,7,5),bar,x,.08+(i%4)*.12,z>0?.41:-.41,g)}
  for(let i=0;i<5;i++){const x=-.5+i*.25,w=M(cone(.035,.45+(i%2)*.2,5),moss,x,.2+(i%2)*.1,i%2?.42:-.42,g);w.rotation.z=(i%2?.25:-.25)}
  M(sph(.12,10,8),glow(0xe8fbff,1.2),0,.62,.05,g);return g}
function mimic(){const g=G(),u=g.userData,wd=mat(0x8a5a2a),mt=metal(0xd4af37);M(box(1.2,.6,.8),wd,0,.3,0,g);for(const x of[-.56,.56])M(box(.08,.62,.84),mt,x,.3,0,g);
  M(box(1.12,.05,.72),glow(0x7a0a1a,.7),0,.6,0,g);const lid=G(g);lid.position.set(0,.6,-.4);u.chomp=lid;M(box(1.2,.32,.8),wd,0,.16,.4,lid);M(box(1.24,.06,.84),mt,0,.3,.4,lid);
  for(let i=0;i<7;i++){M(cone(.05,.16,4),mat(0xffffff),-.5+i*.166,.68,.36,g);M(cone(.05,.16,4),mat(0xffffff),-.5+i*.166,-.02,.76,lid).rotation.x=PI}
  eyes(lid,.2,.81,.26,.07,0xffd000);seg(V(0,.62,.05),V(0,.48,.75),.1,.07,mat(0xd04060),g);
  for(let i=0;i<7;i++)M(cyl(.08,.08,.03,10),metal(0xffcf4a),rnd(-.9,.9),.02,rnd(.45,1),g);return g}
/* ---------------- deniz canlıları (Batık Şehir) ---------------- */
/* eklemli dokunaç: her eklem ayrı grup; idle'da u.tj listesiyle dalga gibi kıvrılır. cu: eklem başına kıvrım, sm: vantuz malzemesi */
function tentacle(p,n,L,r,m,tj,ph,amp,cu,sm){let par=p;for(let j=0;j<n;j++){const g=G(par);if(j)g.position.y=L;const r0=r*(1-j/n*.8),r1=r*(1-(j+1)/n*.8);M(cyl(r1,r0,L*1.04,6),m,0,L/2,0,g);if(j)M(sph(r0,6,4),m,0,0,0,g);
  if(sm&&j<n-1)M(sph(r0*.42,5,4),sm,0,L*.5,r0*.8,g);const x0=cu||0;g.rotation.x=x0;tj.push({g,x0,ph:ph-j*.75,a:amp*(.45+j*.22)});par=g}return par}
function crab(o){const g=G(),u=g.userData,bm=mat(o.c||0xd0482a),am=mat(o.c2||0xf0a070),dm=mat(o.c3||0x7a2010);
  S(M(sph(.6,14,9),bm,0,.66,0,g),1.25,.55,.95);S(M(sph(.5,12,8),am,0,.52,.06,g),1.1,.35,.85);
  for(let i=0;i<5;i++)M(cone(.06,.17,4),dm,-.4+i*.2,.97,-.12,g);
  for(const s of[-1,1]){seg(V(.15*s,.82,.4),V(.2*s,1.17,.45),.035,.03,bm,g);M(sph(.075,8,6),mat(0x111111),.2*s,1.21,.46,g);M(sph(.032,6,5),glow(o.eye||0xffd000,1.4),.2*s,1.23,.53,g)}
  u.legs=[];for(let i=0;i<4;i++)for(const s of[-1,1]){const L=G(g);L.position.set(.55*s,.58,.3-i*.22);const k=V(.32*s,.18,.08-i*.06),f=V(.5*s,-.56,.12-i*.1);seg(V(0,0,0),k,.07,.06,bm,L);seg(k,f,.06,.025,dm,L);u.legs.push(L)}
  u.pinch=[];for(const s of[-1,1]){const A=G(g);A.position.set(.55*s,.68,.45);const e=V(.3*s,.22,.4);seg(V(0,0,0),e,.11,.1,bm,A);const C=G(A);C.position.copy(e);
    S(M(sph(.36,10,8),bm,0,0,.2,C),.85,.75,1.2);Rz(M(cone(.13,.56,5),am,0,-.07,.64,C),PI/2);const J=G(C);J.position.set(0,.1,.34);Rz(M(cone(.12,.54,5),am,0,0,.28,J),PI/2);u.pinch.push(J);
    if(s>0)u.armR=A;else u.armL=A}
  return g}
/* deniz yılanı / leviathan: kumdan çıkan kamburlar + yükselen boyun ve yelpaze yüzgeçli baş */
function serpent(o){const g=G(),u=g.userData,bm=mat(o.c||0x2a7a8a),am=mat(o.c2||0x9ae8d8),fm=mat(o.fin||0x3ab0c0,{side:T.DoubleSide}),sp=mat(o.spike||0xe8f0e0),gl=o.glow?glow(o.glow,1.5):null,B=o.boss?1.4:1.3;
  const hs=o.boss?[[-.95,.5,.17],[-1.85,.42,.15],[-2.6,.33,.12],[-3.2,.24,.09]]:[[-.8,.38,.14],[-1.5,.3,.11],[-2.05,.22,.08]];
  hs.forEach(([z,r,tb])=>{const h=M(new T.TorusGeometry(r,tb,7,12,PI),bm,0,0,z,g);h.rotation.y=PI/2;
    for(let k=0;k<5;k++){const a=PI*(k+.5)/5,c=M(cone(tb*.55,tb*(o.boss?2.4:1.6),4),o.boss?sp:fm,0,(r+tb*.8)*Math.sin(a),z+(r+tb*.8)*Math.cos(a),g);c.rotation.x=PI/2-a}
    if(gl)for(const s of[-1,1])M(sph(tb*.32,6,4),gl,tb*.9*s,r,z,g)});
  {const l=hs[hs.length-1],tz=l[0]-l[1];Rz(S(M(cone(.2*B,.45*B,4),fm,0,.12,tz-.12,g),.25,1,1),-1.1)}
  const n=G(g);n.position.set(0,0,-.1);u.neck=n;const pts=[V(0,0,0),V(0,.55,.08),V(0,1.05,.2),V(0,1.45,.42),V(0,1.7,.72)].map(p=>p.multiplyScalar(B));let r=.2*B;
  for(let i=1;i<pts.length;i++){const p=pts[i];seg(pts[i-1],p,r,r*.9,bm,n);M(sph(r*.93,8,6),bm,p.x,p.y,p.z,n);M(sph(r*.55,6,4),am,p.x,p.y-.02,p.z+r*.6,n);r*=.9}
  for(let i=1;i<pts.length-1;i++){const p=pts[i];Rz(S(M(cone(.12*B,.35*B,4),o.boss?sp:fm,0,p.y+.02,p.z-.18*B,n),.3,1,1),-.9)}
  const hd=G(n);hd.position.copy(pts[pts.length-1]);hd.rotation.x=.25;
  S(M(sph(.28*B,10,8),bm,0,0,0,hd),.95,.8,1.3);M(box(.3*B,.14*B,.4*B),bm,0,-.02,.36*B,hd);M(box(.26*B,.07*B,.38*B),am,0,-.14*B,.3*B,hd);
  eyes(hd,.09*B,.22*B,.14*B,.045*B,o.eye||0xffd000);
  for(const s of[-1,1]){const f=S(M(cone(.26*B,.6*B,5),fm,.24*B*s,.02,-.12*B,hd),.2,1,1);f.rotation.set(-.6,0,-s*1.1)}
  if(o.boss){for(const s of[-1,1])Rz(M(cone(.07*B,.6*B,6),sp,.13*B*s,.2*B,-.15*B,hd),-1.0,0,-s*.35);for(let i=0;i<6;i++)Rz(M(cone(.025*B,.08*B,3),mat(0xffffff),(-.1+i*.04)*B,-.1*B,.5*B,hd),PI);
    const l=PL(o.glow||0x6fe8ff,1.6,5);l.position.set(0,.3,.6);hd.add(l)}
  return g}
/* yarı saydam, parlayan denizanası: yüzer, dokunaçları dalgalanır */
function jelly(o){const g=G(),u=g.userData;u.fly=1;const c=o.c||0xd050ff,bl=glow(c,.65,{transparent:true,opacity:.6}),cr=glow(o.c2||0xffa8ff,1.5),tm=glow(c,.9,{transparent:true,opacity:.75});
  S(M(new T.SphereGeometry(.6,16,9,0,PI*2,0,PI*.56),bl,0,1.3,0,g),1,.8,1);S(M(sph(.28,10,8),cr,0,1.36,0,g),1,.75,1);Rz(M(tor(.55,.06),tm,0,1.24,0,g),PI/2);
  for(let i=0;i<6;i++){const a=i/6*PI*2;M(sph(.06,6,5),cr,Math.sin(a)*.4,1.56,Math.cos(a)*.4,g)}eyes(g,1.42,.54,.16,.055,0xfff0ff);
  u.tj=[];for(let i=0;i<8;i++){const a=i/8*PI*2,b=G(g);b.position.set(Math.sin(a)*.42,1.22,Math.cos(a)*.42);b.rotation.x=PI;tentacle(b,5,.24,.045,tm,u.tj,i*1.1,.22,.06)}
  for(let i=0;i<4;i++){const a=(i+.5)/4*PI*2,b=G(g);b.position.set(Math.sin(a)*.13,1.2,Math.cos(a)*.13);b.rotation.x=PI;tentacle(b,4,.22,.09,bl,u.tj,i*1.7,.15,.1)}
  const l=PL(c,1.4,4);l.position.set(0,1.3,.5);g.add(l);return g}
/* kraken: dev manto, iri parlak gözler, 8 kol (ön ikisi havada) */
function kraken(o){const g=G(),u=g.userData,bm=mat(o.c||0x8a2a4a),am=mat(o.c2||0xf0a8b8),gl=glow(o.glow||0xffd23d,1.8),dk=mat(0x3a0a1a);
  S(M(sph(.62,12,8),bm,0,.8,0,g),1.15,.65,1.05);
  const hd=G(g);hd.position.set(0,1.3,-.1);hd.rotation.x=-.2;u.head=hd;S(M(sph(.68,14,10),bm,0,.62,-.12,hd),1,1.4,1.05);
  for(let i=0;i<6;i++){const a=-1.1+i*.44;M(sph(.07+(i%2)*.03,6,4),am,Math.sin(a)*.6,.9+(i%3)*.22,-.12-Math.cos(a)*.55,hd)}
  for(const s of[-1,1]){M(sph(.18,10,8),mat(0xfff0c0),.36*s,.15,.5,hd);M(sph(.1,8,6),gl,.38*s,.15,.63,hd);M(box(.03,.12,.03),mat(0x050505),.39*s,.15,.72,hd);Rz(M(cone(.1,.35,4),dk,.38*s,.36,.5,hd),0,0,s*1.25)}
  Rz(M(cone(.1,.24,5),mat(0x2a1a10),0,.62,.62,g),2.2);
  u.tj=[];for(let i=0;i<8;i++){const a=(i+.5)/8*PI*2,b=G(g),up=i===0||i===7;b.position.set(Math.sin(a)*.55,.6,Math.cos(a)*.55);b.rotation.y=a;const r2=G(b);r2.rotation.x=up?.45:2.25;
    tentacle(r2,6,.4,.16,bm,u.tj,i*.9,up?.2:.1,up?.28:-.28,am)}
  const l=PL(o.glow||0xffd23d,1.6,5);l.position.set(0,1.6,1);g.add(l);return g}
/* deniz cadısı: süzülen cadı, alt gövdesi dokunaç, asası parlar */
function seaWitch(){const g=humanoid({skin:0x8ad0c0,cloth:0x3a1a6a,float:1,robe:0x2a1a5a,b:1.2,arm:1.1,eye:0x6affd4,weapon:'staff',orb:0x6affd4,crown:0x3ac8b0,sleeve:1}),u=g.userData,tm=mat(0x5a2a8a),sm=mat(0xd8a0e8),hm=mat(0x1a5a5a);
  if(u.head){Rz(S(M(cone(.26,.75,8),hm,0,-.28,-.1,u.head),1,1,.7),PI+.15);for(const s of[-1,1])Rz(M(cone(.07,.5,6),hm,.2*s,-.25,.02,u.head),PI,0,s*.15)}
  for(const s of[-1,1])S(M(new T.SphereGeometry(.14,8,4,0,PI*2,0,PI/2),mat(0xffc8d8),.43*s,1.45,0,g),1,.6,1);
  u.tj=[];for(let i=0;i<6;i++){const a=(i+.5)/6*PI*2,b=G(g);b.position.set(Math.sin(a)*.22,.5,Math.cos(a)*.22);b.rotation.y=a;const r2=G(b);r2.rotation.x=2.4;tentacle(r2,5,.26,.1,tm,u.tj,i*1.1,.14,-.35,sm)}
  return g}
function emojiSprite(e){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const tx0={};if(window.ICO&&ICO.emoUrl){const im=new Image();im.onload=()=>{x.drawImage(im,24,24,208,208);if(tx0.t)tx0.t.needsUpdate=true};im.src=ICO.emoUrl(e||'❔')}
  const tx=new T.CanvasTexture(c);tx0.t=tx;tx.encoding=T.sRGBEncoding;const sp=new T.Sprite(new T.SpriteMaterial({map:tx}));sp.scale.set(2,2,1);const g=G();g.add(sp);return g}

/* ---------------- model listeleri ---------------- */
const SKIN=0xf1c27d;
const SK={
  war:{gold:{cloth:0xd4af37,cape:0xfff6e0,plume:0xffffff,shield:0xd4af37,pauldron:0xfff0a0,helmet:0xd4af37,wepC:0xfff0a0},dark:{cloth:0x2a2a35,cape:0x5a0a8a,plume:0x9a3aff,shield:0x2a2a35,pauldron:0x5a5a7a,helmet:0x2a2a35,eye:0xc060ff,wepC:0x9a6aff},ice:{cloth:0xbfe6ff,cape:0x3a8ad8,plume:0x7fe7ff,shield:0x3a8ad8,pauldron:0xffffff,helmet:0xdff4ff,wepC:0xbff6ff}},
  arc:{gold:{cloth:0xc89a2a,hood:0xc89a2a,cape:0xfff0c0,pants:0x7a5a1a},dark:{cloth:0x2a2a35,hood:0x1a1a22,cape:0x5a0a8a,pants:0x1a1a22,eye:0xc060ff},ice:{cloth:0x7ec0ec,hood:0x5aa8d8,cape:0xffffff,pants:0x3a6a9a}},
  mag:{gold:{cloth:0xd4a017,robe:0xd4a017,hatC:0xb8860b,orb:0xfff0a0,cape:0x8a5a10},dark:{cloth:0x1a1a22,robe:0x1a1a22,hatC:0x0a0a12,cape:0x3a0a5a,orb:0xc060ff,beard:0x3a3a3a,eye:0xc060ff},ice:{cloth:0x8fd0f5,robe:0x8fd0f5,hatC:0x5aa8d8,orb:0xffffff,cape:0x3a7ac8}},
  asn:{gold:{cloth:0x8a6a1a,hood:0xc89a2a,scarf:0xfff0c0,pants:0x5a4210,mask:0x3a2a08,glove:0x5a4210,wepC:0xfff0a0},dark:{cloth:0x0e0c14,hood:0x0a0810,scarf:0x5a0a8a,pants:0x0a0810,mask:0x050508,glove:0x0a0810,eye:0xc060ff,wepC:0x9a6aff},ice:{cloth:0x5a8ab8,hood:0x3a6a9a,scarf:0xdff4ff,pants:0x2a4a6a,mask:0xbfe6ff,glove:0x2a4a6a,wepC:0xbff6ff}}};
const HB={
  war:{hero:1,hs2:1.1,cloth:0x9aa3b0,metal:1,pants:0x4a4f5c,helmet:0xb8c0cc,plume:0xd62828,weapon:'sword',shield:0xb22222,cape:0xb22222,tabard:1,pauldron:0xd4af37,belt:0xd4af37,sleeve:1,glove:0x6b4a2a,b:1.06},
  arc:{hero:1,hs2:1.1,cloth:0x2f7d32,pants:0x5a4a32,hood:0x2f7d32,hoodTip:1,bow:1,cape:0x3e5f2a,capeH:.85,glove:0x6b4a2a,sleeve:1,hair:0x8a4a1e,bracer:1,tunic:1,belt:0x8a6a3a},
  mag:{hero:1,hs2:1.1,cloth:0x3b2a8a,robe:0x3b2a8a,hat:'wizard',hatC:0x2d1f6e,weapon:'staff',orb:0x7fe7ff,beard:0xeeeeee,hair:0xe8e8e8,sleeve:1,cape:0x241a5a,capeH:1.25},
  /* suikastçı: koyu deri, başlık, yüz maskesi, kısa pelerin, iki hançer */
  asn:{hero:1,hs2:1.1,slim:1,cloth:0x2e2329,pants:0x1e1a1e,boots:0x141014,hood:0x231c22,hoodTip:1,mask:0x121014,scarf:0x7a1830,belt:0x6a4a2a,sleeve:1,glove:0x1a1418,weapon:'dagger',dual:1,wepC:0xc8d0dc,hair:0x1a1418,bracer:1}};
const RC=[0xc8d0dc,0x4f9cff,0xb56bff,0xffa52a,0xff4a86],RM=[0x9aa3b0,0x3a6ed8,0x7a3ad8,0xd4a017,0xc0185a];
const fe=e=>String(e||'').replace(/\uFE0F/g,'');
const WT={'🗡':'sword','🪓':'axe','🔨':'hammer','🔱':'spear','🏹':'bow','🪄':'staff','🔪':'sword','⚔':'sword','📖':'staff'},AT={'🦺':'plate','🥋':'gi','👘':'robe','🧥':'robe'};
/* kuşanılan eşyalar karakterin üstünde görünür; kostüm seçiliyse renkler kostümden, şekiller eşyadan gelir */
function applyGear(o,g,col){if(!g)return o;
  const w=g.weapon;if(w){const t=o.dual?'dagger':WT[fe(w.e)]||'sword';if(t==='bow'){o.bow=1;delete o.weapon;delete o.shield}else{delete o.bow;o.weapon=t}
    if(col||!o.wepC)o.wepC=RC[w.r];if(t==='staff')o.orb=col||!o.orb?RC[w.r]:o.orb;o.wepGlow=w.r>=2;o.wepLight=w.r>=3||w.up>=10}
  const a=g.armor;if(a){const t=AT[fe(a.e)]||'plate',c=col?RM[a.r]:o.cloth;o.cloth=c;o.sleeve=1;
    if(t==='plate'){o.metal=1;delete o.robe;o.pauldron=col?(a.r>=2?0xd4af37:RM[a.r]):(o.pauldron||c)}else if(t==='gi'){o.metal=0;delete o.robe;delete o.pauldron;o.belt=0x1a1a1a}else{o.metal=0;o.robe=c;delete o.pauldron}}
  const h=g.helmet;if(h){const e=fe(h.e),c=col?RM[h.r]:(o.helmet||o.hood||o.hatC||o.cloth);delete o.helmet;delete o.plume;delete o.hood;delete o.hoodTip;delete o.hat;delete o.crown;
    if(e==='👑')o.crown=col?(h.r>=3?0xffd84a:RM[h.r]):c;else if(e==='🎩'){o.hat='wizard';o.hatC=c}else{o.helmet=c;if(h.r>=2)o.plume=RC[h.r]}}
  if(g.gloves)o.glove=col?RM[g.gloves.r]:(o.glove||o.cloth);if(g.boots)o.boots=col?RM[g.boots.r]:o.boots;if(g.ring)o.ring=RC[g.ring.r];return o}
const HERO={};for(const k in HB)HERO[k]=(sk,g)=>humanoid(applyGear(Object.assign({},HB[k],SK[k][sk]||{}),g,!SK[k][sk]));
function petEvo(root,m,st){const gold=st>=2,tc=new T.Color(gold?0xffc94a:0x6fd8ff),wc=new T.Color(0xfff2c8);
  m.traverse(n=>{if(!n.isMesh||!n.material)return;const mt=n.material;if(gold&&mt.color&&!mt.transparent)mt.color.lerp(wc,.22);
    if(mt.emissive){mt.emissive.lerp(tc,gold?.55:.4);mt.emissiveIntensity=Math.max(mt.emissiveIntensity||0,gold?.42:.24);mt.userData.e0=mt.emissive.clone();mt.userData.i0=mt.emissiveIntensity}});
  root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(m),cw=b.getCenter(V(0,0,0)),c=root.worldToLocal(cw.clone()),top=root.worldToLocal(V(cw.x,b.max.y,cw.z)).y,bot=root.worldToLocal(V(cw.x,b.min.y,cw.z)).y,mid=(top+bot)/2;
  const add=(o,x,y,z)=>{o.position.set(x,y,z);root.add(o);return o},bm=(col,op)=>new T.MeshBasicMaterial({color:col,transparent:true,opacity:op==null?.9:op,blending:T.AdditiveBlending,depthWrite:false});
  const orb=G(root);orb.position.set(c.x,mid,c.z);const n=gold?5:3;
  for(let i=0;i<n;i++){const a=i/n*PI*2,o=new T.Mesh(gold?sph(.07,8,6):new T.OctahedronGeometry(.08),bm(gold?0xffd56a:0x8fe8ff));o.position.set(Math.cos(a)*.62,Math.sin(a*2)*.12,Math.sin(a)*.62);orb.add(o)}
  const ev={orb,wings:[],halo:null,st};
  if(gold){const cr=G(root);cr.position.set(c.x,top+.08,c.z);const cm=bm(0xffd56a,1);
    for(let i=0;i<6;i++){const a=i/6*PI*2,k=new T.Mesh(cone(.035,.16,4),cm);k.position.set(Math.cos(a)*.14,.06,Math.sin(a)*.14);cr.add(k)}
    const rg=new T.Mesh(new T.TorusGeometry(.15,.022,5,20),cm);rg.rotation.x=PI/2;cr.add(rg);ev.halo=cr;
    for(const sd of[-1,1]){const w=new T.Mesh(new T.PlaneGeometry(.75,.42),bm(0xffe7a0,.4));w.geometry.translate(.38*sd,0,0);const p=G(root);p.position.set(c.x,mid+.12,c.z-.12);p.add(w);w.rotation.y=sd*.35;ev.wings.push(p)}}
  else{const rn=new T.Mesh(new T.TorusGeometry(.32,.018,5,24),bm(0x8fe8ff,.7));rn.rotation.x=PI/2;add(rn,c.x,top+.12,c.z);ev.halo=rn}
  root.userData.evo=ev}
const PETM={
  wolf:()=>quad({c:0x8a8d96,c2:0xd5d8de,len:1.2,h:.4,w:.55,head:'wolf',tail:'bushy'}),
  owl:()=>bird({type:'owl'}),
  fox:()=>quad({c:0xe86a1f,c2:0xfff4e8,len:1.1,h:.32,w:.5,head:'fox',tail:'bushy',tip:0xffffff}),
  turtle:()=>turtle(),
  unicorn:()=>quad({c:0xfafaff,c2:0xf0e8ff,len:1.4,h:.7,w:.55,head:'horse',horn:0xffd84a,mane:0xff8ad8,tail:'tuft',paw:0xd4af37}),
  dragon:()=>dragon({c:0x3aa84a,c2:0xc8e86a,glow:0xffd000,wc:0x2a7a3a})};
const MON={
  'Yaban Domuzu':()=>quad({c:0x6b4a32,c2:0x4a3222,len:1.3,h:.35,w:.65,head:'boar',bristle:1,tail:'thin',eye:0xff3020}),
  'Boz Kurt':()=>quad({c:0x6f727a,c2:0xa9adb5,len:1.3,h:.45,head:'wolf',tail:'bushy',eye:0xffd000}),
  'Dev Örümcek':()=>spider({c:0x2b2233,c2:0xb03040}),
  'Zehirli Yılan':()=>snake({c:0x3c9a3c,c2:0xd4e157}),
  'Gece Baykuşu':()=>bird({type:'owl',c:0x4a3a5a,c2:0x9a8ab0}),
  'Koca Ayı':()=>quad({c:0x5a3a22,c2:0x8a6a4a,len:1.5,h:.5,w:.85,head:'bear',lt:1.5,bh:1.2,tail:'none',eye:0xff3020}),
  'Orman Ruhu':()=>quad({c:0x3a7a5a,c2:0x9ad8b0,len:1.4,h:.75,w:.5,head:'deer',glow:0x6affb0,tail:'none',eye:0x6affb0}),
  'Orman Devi':()=>humanoid({skin:0x3a2e28,cloth:0x3a2e28,pants:0x2a201c,boots:0x2a201c,b:1.5,arm:1.4,eye:0xff3020,belly:1}),
  'Mağara Yarasası':()=>bird({type:'bat',c:0x3a3040}),
  'Dev Sıçan':()=>quad({c:0x6a6058,c2:0x9a9088,len:1.1,h:.25,w:.5,head:'rat',tail:'long',eye:0xff2020}),
  'İskelet':()=>humanoid({head:'skull',skin:0xeee8d5,cloth:0xeee8d5,pants:0xeee8d5,boots:0xd8d0b8,b:.7,ribs:1,weapon:'sword',wepC:0x8a8a8a,eye:0xff3020}),
  'Goblin':()=>humanoid({skin:0x6aa84a,cloth:0x6b4a2a,pants:0x4a3a2a,b:.85,ears:1,weapon:'club',eye:0xffd000}),
  'Mağara Kertenkelesi':()=>lizard({c:0x5a7a4a,c2:0x8ab06a}),
  'Mağara Trolü':()=>humanoid({skin:0x7a8a7a,cloth:0x5a4a3a,pants:0x4a3a2a,b:1.5,arm:1.3,tusks:1,belly:1,weapon:'club',eye:0xffd000}),
  'Örümcek Ana':()=>spider({c:0x3a1450,c2:0xd040ff}),
  'Ogre Reisi':()=>humanoid({skin:0xd08a4a,cloth:0x6b2a1a,pants:0x4a2a1a,b:1.6,arm:1.3,horns:0xf0e6c8,tusks:1,belly:1,weapon:'axe',crown:0xd4af37,eye:0xff3020}),
  'Kum Akrebi':()=>scorpion({c:0xc08a3a,c2:0x7a4a1a}),
  'Azgın Deve':()=>quad({c:0xc8a06a,c2:0xe0c090,len:1.4,h:.7,w:.55,head:'camel',humps:2,tail:'thin',eye:0xff3020}),
  'Çöl Kartalı':()=>bird({type:'eagle',c:0x5a3b22}),
  'Mumya':()=>humanoid({skin:0xcdbb94,cloth:0xcdbb94,pants:0xcdbb94,boots:0xb8a67e,wraps:1,headWrap:1,eye:0x7affd4,sleeve:1}),
  'Kobra':()=>snake({c:0xa07a3a,c2:0xe8c97a,hood:1}),
  'Kum Aslanı':()=>quad({c:0xd8a050,c2:0xf0d090,len:1.5,h:.55,w:.7,head:'lion',mane:0x8a4a1a,tail:'tuft',lt:1.3,eye:0xffd000}),
  'Çöl Cini':()=>humanoid({skin:0x3a8ad8,cloth:0x6a3ab0,float:1,robe:0x3a8ad8,turban:0xd8b030,b:1.3,arm:1.2,eye:0xfff0a0,belt:0xd4af37}),
  'Taş Dev':()=>golem({c:0x9a8f80,moss:0x6a8a4a}),
  'Kar Kurdu':()=>quad({c:0xe8eef5,c2:0xb9c9db,len:1.3,h:.45,head:'wolf',tail:'bushy',eye:0x5fe3ff}),
  'Kardan Canavar':()=>snowman(),
  'Buz Elementali':()=>elemental({type:'ice'}),
  'Buz Foku':()=>seal(),
  'Vahşi Penguen':()=>bird({type:'penguin'}),
  'Mamut':()=>quad({c:0x6a4a2a,c2:0x8a6a4a,len:1.7,h:.7,w:.95,head:'mammoth',lt:1.9,bh:1.3,tail:'thin',fur:0x5a3a22,eye:0xff3020}),
  'Kutup Ayısı':()=>quad({c:0xf2f4f8,c2:0xdde4ec,len:1.5,h:.5,w:.85,head:'bear',lt:1.5,bh:1.2,tail:'none',eye:0x5fe3ff}),
  'Buz Ejderi':()=>dragon({c:0x8fd0f5,c2:0xe8f6ff,glow:0x6fdcff,wc:0x5aa8d8,horn:0xffffff}),
  'Ateş Ruhu':()=>elemental({type:'fire'}),
  'Küçük İblis':()=>humanoid({skin:0xc8282a,cloth:0x4a0a0a,pants:0x2a0505,b:.8,horns:0x2a1a10,wings:0x5a0a0a,eye:0xffd000,weapon:'trident'}),
  'Lav Kertenkelesi':()=>lizard({c:0x3a1a10,glow:0xff5a00,eye:0xffd000}),
  'Yanık İskelet':()=>humanoid({head:'skull',skin:0x4a3a30,cloth:0x3a2a20,pants:0x3a2a20,boots:0x2a1a10,b:.7,ribs:1,weapon:'axe',eye:0xff8a00}),
  'Kül Yarasası':()=>bird({type:'bat',c:0x4a4a4a,eye:0xff8a00}),
  'Lav Devi':()=>golem({c:0x2a1a14,lava:1}),
  'İblis Lordu':()=>humanoid({skin:0x9a1a1a,cloth:0x2a0a0a,metal:1,pants:0x1a0505,b:1.4,arm:1.2,horns:0x1a1010,hs:1.6,wings:0x3a0505,eye:0xffd000,weapon:'trident',cape:0x5a0a0a,pauldron:0x3a3a3a}),
  'Kızıl Ejder':()=>dragon({c:0xb22222,c2:0xffb347,glow:0xff5a00,wc:0x7a1010}),
  'Hayalet':()=>elemental({type:'ghost'}),
  'Vampir':()=>humanoid({skin:0xe8e0f0,cloth:0x1a1a2a,pants:0x1a1a2a,cape:0x8a0a1a,eye:0xff2040,sleeve:1,weapon:'sword',wepC:0xc0c0d0}),
  'Zombi':()=>humanoid({skin:0x7aa86a,cloth:0x5a5a7a,pants:0x3a3a4a,eye:0xffff60,belly:0}),
  'Kara Şövalye':()=>humanoid({cloth:0x2a2a35,metal:1,pants:0x1a1a22,helmet:0x2a2a35,plume:0x5a0a8a,weapon:'sword',wepC:0x5a5a7a,shield:0x2a2a35,pauldron:0x3a3a48,sleeve:1,glove:0x1a1a22,eye:0xff2040}),
  'Kara Büyücü':()=>humanoid({cloth:0x2a1440,robe:0x2a1440,hood:0x1a0a2a,head:'void',eye:0xc060ff,weapon:'staff',orb:0xc060ff,sleeve:1}),
  'Vampir Kontu':()=>humanoid({skin:0xe8e0f0,cloth:0x1a1a2a,pants:0x1a1a2a,cape:0xaa0a2a,crown:0xd4af37,b:1.2,eye:0xff2040,sleeve:1,wings:0x2a0a1a,weapon:'sword'}),
  'Ölüm Meleği':()=>reaper(),
  'Karanlık Kral':()=>humanoid({cloth:0x3a1a5a,metal:1,pants:0x1a0a2a,crown:0xd4af37,cape:0x5a1a8a,weapon:'sword',wepC:0x9a6aff,b:1.25,pauldron:0xd4af37,eye:0xc060ff,sleeve:1,beard:0x2a2a2a}),
  'Fırtına Kartalı':()=>bird({type:'eagle',c:0x8fb8e8}),
  'Bulut Ruhu':()=>elemental({type:'ghost',c:0xbfe8ff}),
  'Gök Muhafızı':()=>humanoid({cloth:0xf4f0e0,metal:1,pants:0xd8d0b8,boots:0xd4af37,helmet:0xd4af37,plume:0xffffff,weapon:'trident',wings:0xffffff,pauldron:0xd4af37,sleeve:1,eye:0x7fe7ff,cape:0x3a8ad8}),
  'Yıldırım Elementali':()=>elemental({type:'ice',c:0xffe14a,c2:0xfff6b0}),
  'Pegasus':()=>quad({c:0xfafaff,c2:0xe8f0ff,len:1.4,h:.7,w:.55,head:'horse',mane:0x7fc8ff,tail:'tuft',wings:0xffffff,paw:0xd4af37,eye:0x3a8ad8}),
  'Grifon':()=>quad({c:0xd8a050,c2:0xf8f0e0,len:1.5,h:.6,w:.7,head:'lion',mane:0xf8f0e0,tail:'tuft',wings:0xc89040,lt:1.3,eye:0xffd000}),
  'Fırtına Devi':()=>golem({c:0x6a8ab8,lava:1,gc:0x9fe8ff,eye:0xffffff}),
  'Gök Ejderi':()=>dragon({c:0xf4f4ff,c2:0xffe9a0,glow:0x7fe7ff,wc:0xd4af37,horn:0xd4af37}),
  'Boşluk Gözcüsü':()=>eyeMon({c:0x2a1a40,glow:0xc060ff}),
  'Gölge Avcı':()=>humanoid({skin:0x0a0a12,cloth:0x14141e,pants:0x0a0a12,boots:0x050508,hood:0x14141e,head:'void',eye:0xc060ff,weapon:'sword',wepC:0x9a3aff,cape:0x2a0a4a,sleeve:1}),
  'Kristal Golem':()=>golem({c:0x3a2a5a,lava:1,gc:0xff3df0,eye:0xff9af8}),
  'Kaos Yılanı':()=>snake({c:0x2a1040,c2:0xff3df0,hood:1}),
  'Hiçlik Hayaleti':()=>elemental({type:'ghost',c:0x8a5aff}),
  'Kaos Lordu':()=>humanoid({skin:0x3a1a5a,cloth:0x14081e,metal:1,pants:0x0a0410,b:1.4,arm:1.2,horns:0xff3df0,hs:1.5,wings:0x2a0a4a,eye:0xff3df0,weapon:'scythe',cape:0x5a0a8a,crown:0x9a3aff,pauldron:0x5a2a8a}),
  'Yıldız Yutan':()=>dragon({c:0x14101e,c2:0x5a2a8a,glow:0xff3df0,wc:0x2a0a4a,horn:0xc060ff}),
  'Sonsuzluk':()=>eyeMon({c:0x0a0612,glow:0x7fe7ff}),
  'Balık Adam':()=>humanoid({head:'fish',skin:0x4aa090,cloth:0x2a5a6a,pants:0x1f4450,boots:0x2a5a5a,fin:1,finC:0xff8a4a,weapon:'spear',wepC:0x9fe8ff,eye:0xffd000,belt:0x8a7a4a,glove:0x3a8a7a}),
  'Dev Yengeç':()=>crab({c:0xd0482a,c2:0xf0a070,c3:0x7a2010}),
  'Deniz Yılanı':()=>serpent({c:0x2a7a8a,c2:0xbfeee0,fin:0xff7a5a,eye:0xffd000}),
  'Zehirli Denizanası':()=>jelly({c:0x9a4aff,c2:0x9aff5a}),
  'Köpekbalığı Savaşçı':()=>humanoid({head:'shark',skin:0x6a7e90,cloth:0x3a4a5a,metal:1,pants:0x2a3440,boots:0x1f2830,b:1.35,arm:1.25,weapon:'axe',wepC:0x9fb8c8,pauldron:0x8a9aa8,fin:1,finC:0x5a6e80,eye:0xff3020,belt:0x8a7a4a}),
  'Deniz Cadısı':()=>seaWitch(),
  'Kraken':()=>kraken({c:0x8a2a4a,c2:0xf0a8b8,glow:0xffd23d}),
  'Leviathan':()=>serpent({boss:1,c:0x123a5a,c2:0x5fd0d8,fin:0x2a8aa8,spike:0xd8e8f0,glow:0x6fe8ff,eye:0x6fe8ff}),
  'Mimik':()=>mimic(),
  'Batık Sandık':()=>sunkChest(),
  'Rün Muhafızı':()=>golem({c:0x4a5a7a,lava:1,gc:0x5fe3ff,eye:0x5fe3ff}),
  'Kadim Ejder':()=>dragon({c:0xd4a017,c2:0xfff0a0,glow:0xff3df0,wc:0x8a5a10,horn:0x2a1a10})};

/* ---------------- bölgeler ---------------- */
const ZD=[
  /* fn/ff: sis başlangıç/bitiş · rim: karakterlerin kenar ışığı rengi · g2: zemindeki ikinci ton */
  {top:0x6fb8ff,bot:0xd8f0d0,fog:0xc2e2cc,gnd:0x4f8a3a,g2:0x74ac46,plat:0x8a7a62,hs:0xe2f2ff,hg:0x47662f,sun:0xffe8b8,si:1.25,hi:.72,pt:'leaf',fn:13,ff:38,rim:0xfff2b8},
  {top:0x07080f,bot:0x232842,fog:0x121624,gnd:0x34343f,g2:0x26283a,plat:0x4a4a58,hs:0x8fa8ff,hg:0x22222a,sun:0x9fb4ff,si:.5,hi:.62,pt:'mote',fn:9,ff:30,rim:0x7fc0ff},
  {top:0x3a95f0,bot:0xffe3a8,fog:0xf4d8a4,gnd:0xd9a95c,g2:0xc08c46,plat:0xb8875a,hs:0xfff1d6,hg:0xb07a3a,sun:0xffe4a8,si:1.35,hi:.78,pt:'dust',fn:14,ff:40,rim:0xffdc98},
  {top:0x7fc2ff,bot:0xeef8ff,fog:0xdcecff,gnd:0xeaf3ff,g2:0xb4cdec,plat:0x9ab8d6,hs:0xf4faff,hg:0x9ab8dc,sun:0xfff2dc,si:.95,hi:.66,pt:'snow',fn:12,ff:36,rim:0xcfeaff},
  {top:0x120302,bot:0x7a2008,fog:0x3d0e06,gnd:0x2a1410,g2:0x40190e,plat:0x3a2a24,hs:0xff9a6a,hg:0x2a0a05,sun:0xffa060,si:.8,hi:.6,pt:'ember',fn:10,ff:31,rim:0xff6a22},
  {top:0x05030c,bot:0x2a1650,fog:0x1a0f30,gnd:0x221a2e,g2:0x302444,plat:0x3a3048,hs:0xb59aff,hg:0x150c22,sun:0xc0acff,si:.6,hi:.6,pt:'wisp',fn:10,ff:32,rim:0xa080ff},
  {top:0x2a7ae8,bot:0xffe0b0,fog:0xbcd4f4,gnd:0xa8c0e4,g2:0xc8d8f4,plat:0xcfc4a4,hs:0xdfeaff,hg:0x7a90b8,sun:0xfff0c8,si:.95,hi:.6,pt:'gold',fn:14,ff:42,rim:0xfff0c4},
  /* 7: Batık Şehir (deniz dibi) */
  {top:0x2a9ab8,bot:0x041a30,fog:0x0b3a55,gnd:0xb8a67a,g2:0x8a8a6a,plat:0x4a5c64,hs:0x8fe8ff,hg:0x0a2a3a,sun:0x9fe8ff,si:.72,hi:.72,pt:'bubble',fn:7,ff:26,rim:0x5fe8ff},
  /* 8: Hiçlik */
  {top:0x020108,bot:0x1e0a3a,fog:0x0e061c,gnd:0x140c24,g2:0x22133e,plat:0x2a1a44,hs:0x9a7aff,hg:0x0a0614,sun:0xb090ff,si:.5,hi:.6,pt:'star',fn:10,ff:33,rim:0xc860ff}];
function pine(p,x,z,s,c,snow){const g=G(p);g.position.set(x,0,z);M(cyl(.12,.16,.8,6),mat(0x5a3a1a),0,.4,0,g);for(let i=0;i<3;i++){M(cone(.9-i*.22,1.1,7),mat(c||0x2f6a3a),0,1.0+i*.6,0,g);if(snow)M(cone(.45-i*.11,.4,7),mat(0xffffff),0,1.45+i*.6,0,g)}S(g,s);return g}
function roundTree(p,x,z,s){const g=G(p);g.position.set(x,0,z);M(cyl(.14,.2,1.2,6),mat(0x6a4a2a),0,.6,0,g);M(ico(.85,1),mat(0x4a9a3a),0,1.7,0,g);M(ico(.55,1),mat(0x6ab84a),.35,2.1,.2,g);S(g,s);return g}
function rock(p,x,z,s,c){const r=M(dod(.6),mat(c||0x7a7a7a),x,.25*s,z,p);S(r,s,s*.7,s);r.rotation.y=Math.random()*3;r.receiveShadow=true;return r}
function mushroom(p,x,z,s){const g=G(p);g.position.set(x,0,z);M(cyl(.08,.12,.35,6),mat(0xf5ecd8),0,.17,0,g);M(new T.SphereGeometry(.3,10,6,0,PI*2,0,PI/2),mat(0xd62828),0,.32,0,g);for(let i=0;i<4;i++)M(sph(.04,5,4),mat(0xffffff),Math.sin(i*1.6)*.17,.5,Math.cos(i*1.6)*.17,g);S(g,s);return g}
function cactus(p,x,z,s){const g=G(p);g.position.set(x,0,z);const c=mat(0x4a8a3a);M(cyl(.18,.2,1.8,8),c,0,.9,0,g);M(cyl(.12,.12,.6,8),c,.35,1.0,0,g);M(cyl(.12,.12,.5,8),c,.35,1.3,0,g).position.set(.38,1.25,0);M(cyl(.1,.1,.4,8),c,-.32,1.3,0,g);M(cyl(.1,.1,.35,8),c,-.32,1.0,0,g).rotation.z=PI/2;S(g,s);return g}
function crystal(p,x,z,s,c){const g=G(p);g.position.set(x,0,z);for(let i=0;i<4;i++){const k=S(M(oct(.25),glow(c,.9),Math.sin(i*1.7)*.2,.4,Math.cos(i*1.7)*.2,g),.6,1.8+Math.random(),.6);k.rotation.set(rnd(-.4,.4),0,rnd(-.4,.4))}S(g,s);return g}
/* batık şehir süsleri */
function sColumn(p,x,z,s,m,ms,broken){const g=G(p);g.position.set(x,0,z);const h=broken?rnd(.9,2.2):3.2;M(box(.85,.22,.85),m,0,.11,0,g);M(cyl(.3,.34,h,10),m,0,.22+h/2,0,g);
  if(broken){const r=M(cyl(.3,.3,1.1,10),m,.75,.3,.2,g);r.rotation.set(0,rnd(-.8,.8),PI/2);M(dod(.22),m,-.5,.12,.4,g)}else M(box(.8,.22,.8),m,0,.33+h,0,g);
  for(let i=0;i<3;i++)S(M(sph(.12,6,4),ms,Math.sin(i*2.1)*.3,rnd(.3,h*.7),Math.cos(i*2.1)*.3,g),1,.5,1);S(g,s);return g}
function sArch(p,x,z,s,m,broken){const g=G(p);g.position.set(x,0,z);for(const sx of[-1,1]){M(box(.6,.2,.6),m,1.25*sx,.1,0,g);M(cyl(.22,.25,2.8,8),m,1.25*sx,1.6,0,g)}
  M(new T.TorusGeometry(1.25,.24,6,14,broken?PI*.55:PI),m,0,3,0,g);if(broken)M(dod(.3),m,-1.9,.2,.5,g);g.rotation.y=rnd(-.4,.4);S(g,s);return g}
function coral(p,x,z,s,c){const g=G(p);g.position.set(x,0,z);const m=glow(c,.35);
  for(let i=0;i<5;i++){const a=i/5*PI*2+rnd(-.3,.3),h=rnd(.5,1.1),b=V(Math.sin(a)*.28,h,Math.cos(a)*.28);seg(V(0,0,0),b,.07,.05,m,g);M(sph(.065,6,4),m,b.x,b.y,b.z,g);
    const b2=b.clone().add(V(Math.sin(a+.8)*.22,rnd(.2,.4),Math.cos(a+.8)*.22));seg(b,b2,.045,.035,m,g);M(sph(.05,6,4),m,b2.x,b2.y,b2.z,g)}S(g,s);return g}
function kelp(p,x,z,s,m,arr){const g=G(p);g.position.set(x,0,z);for(let j=0;j<3;j++){const st=G(g),h=rnd(1.8,3.4);st.position.set(rnd(-.25,.25),0,rnd(-.25,.25));M(cone(.07,h,5),m,0,h/2,0,st);
  for(let q=0;q<5;q++){const lf=S(M(sph(.13,6,4),m,q%2?.09:-.09,.4+q*h/6,0,st),.5,1.6,.25);lf.rotation.z=q%2?-.5:.5}arr.push({g:st,ph:rnd(0,6),a:rnd(.06,.12)})}S(g,s);return g}
function buildEnv(z){const d=ZD[z],e=G();e.userData.tk=[];
  /* gökyüzü */
  const sg=new T.SphereGeometry(60,24,12),cs=[],ct=new T.Color(d.top),cb=new T.Color(d.bot);const pos=sg.attributes.position;
  for(let i=0;i<pos.count;i++){const k=Math.max(0,Math.min(1,pos.getY(i)/40+.15));const c=cb.clone().lerp(ct,k);cs.push(c.r,c.g,c.b)}
  sg.setAttribute('color',new T.Float32BufferAttribute(cs,3));e.add(new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,toneMapped:false})));
  /* zemin + arena platformu */
  const gg=new T.PlaneGeometry(84,84,28,28);gg.rotateX(-PI/2);const gc=[],g0=new T.Color(d.gnd),g2=new T.Color(d.g2),gp=gg.attributes.position,gk=new T.Color();
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),q=gp.getZ(i),k=.5+.3*Math.sin(x*.33+q*.21+z)+.2*Math.sin(q*.57-x*.19+2),r=Math.hypot(x+.4,q-.25),v=Math.min(1,Math.max(0,(r-4)/16));
    /* arena dışına doğru yumuşak karartma (radyal vinyet / ortam kapanması hissi) */
    gk.copy(g0).lerp(g2,Math.max(0,Math.min(1,k))*.8).multiplyScalar(rnd(.94,1.05)*(1-.5*v*v*(3-2*v)));gc.push(gk.r,gk.g,gk.b)}
  /* platformun altında yumuşak koyuluk: arena zemine otursun */
  {const ao=new T.Mesh(new T.PlaneGeometry(11.5,11.5).rotateX(-PI/2),new T.MeshBasicMaterial({map:dot(),color:new T.Color(d.hg).multiplyScalar(.3),transparent:true,opacity:.3,depthWrite:false}));ao.material.userData.keepMap=1;ao.position.set(-.4,.02,.25);e.add(ao)}
  gg.setAttribute('color',new T.Float32BufferAttribute(gc,3));const gm=new T.Mesh(gg,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));gm.receiveShadow=true;e.add(gm);
  const pl=M(cyl(3.3,3.5,.14,20),mat(d.plat,{roughness:.9}),-.4,.0,.25,e);pl.receiveShadow=true;pl.castShadow=false;
  for(let i=0;i<20;i++){const a=i/20*PI*2;const st=M(box(.5,.06,.25),mat(new T.Color(d.plat).multiplyScalar(.8).getHex()),-.4+Math.sin(a)*3.4,.08,.25+Math.cos(a)*3.4,e);st.rotation.y=a;st.receiveShadow=true}
  const SP=[[-4.6,-1.6],[4.6,-2.2],[-6.2,-5],[6.4,-5.6],[-2.6,-7.4],[2.4,-8.4],[0,-12],[-8.5,-9],[8.8,-9.8],[-5,-13],[5.4,-14],[-12,-15],[12,-16],[-9.5,-3],[9.5,-3.5],[-1.5,-16]];
  const sc=()=>rnd(.8,1.3);
  switch(z){
    case 0:SP.forEach(([x,q],i)=>{i%3===0?roundTree(e,x,q,sc()):pine(e,x,q,sc()*1.2)});for(let i=0;i<6;i++)mushroom(e,rnd(-6,6),rnd(-6,-3),rnd(.7,1.3));rock(e,3.8,.8,.7);rock(e,-4,1.2,.5);for(let i=0;i<8;i++)M(ico(.35,0),mat(0x3a8a3a),rnd(-9,9),.15,rnd(-10,-3),e);break;
    case 1:SP.forEach(([x,q],i)=>{if(i%2)M(cone(rnd(.4,.8),rnd(1.5,3.5),6),mat(0x4a4a58),x,1,q,e);else rock(e,x,q,sc()*1.5,0x4a4a55)});
      [[-3.6,-3,0x6fdcff],[3.8,-3.6,0xc060ff],[-6,-8,0x6fdcff],[6,-9,0xc060ff],[0,-10,0x6fdcff]].forEach(([x,q,c])=>{crystal(e,x,q,rnd(1,1.6),c);const l=new T.PointLight(c,1.4,6);l.position.set(x,1.2,q);e.add(l)});break;
    case 2:SP.forEach(([x,q],i)=>{if(i%3===0)cactus(e,x,q,sc());else if(i%3===1)S(M(sph(2,12,6),mat(0xe0b06a),x,-1.1,q-2,e),1.6,.6,1);else rock(e,x,q,sc(),0xb07a4a)});
      M(cone(4.5,5,4),mat(0xe0b878),-7,2.5,-20,e).rotation.y=PI/4;M(cone(3,3.5,4),mat(0xd0a868),3,1.75,-23,e).rotation.y=PI/4;rock(e,4,1,.5,0xb07a4a);break;
    case 3:SP.forEach(([x,q],i)=>{if(i%2)pine(e,x,q,sc()*1.2,0x2a5a5a,1);else{const k=S(M(cone(.4,2.2,5),glow(0xbfeaff,.25,{transparent:true,opacity:.85,roughness:.1}),x,1.1,q,e),sc());k.rotation.z=rnd(-.2,.2)}});
      M(cone(6,8,6),mat(0xf0f6ff),-8,4,-22,e);M(cone(5,6.5,6),mat(0xe6f0fa),6,3.2,-24,e);M(cone(7,9,6),mat(0xf6faff),0,4.5,-28,e);for(let i=0;i<6;i++)S(M(sph(.8,10,6),mat(0xffffff),rnd(-8,8),-.4,rnd(-10,-3),e),1.5,.6,1);break;
    case 4:SP.forEach(([x,q],i)=>{if(i%2){const b=M(cyl(.35,.4,rnd(1,2.5),6),mat(0x2a2020),x,.6,q,e);b.position.y=b.geometry.parameters.height/2}else rock(e,x,q,sc()*1.3,0x2a1c18)});
      [[-4,-3.4],[4.2,-4],[-1,-8],[6,-9],[-7,-7]].forEach(([x,q])=>{const lp=new T.Mesh(new T.CircleGeometry(rnd(.8,1.4),12).rotateX(-PI/2),glow(0xff5a00,1.6));lp.position.set(x,.03,q);e.add(lp);const l=new T.PointLight(0xff6a10,1.6,5);l.position.set(x,.6,q);e.add(l)});
      const v=M(cyl(1.2,6,7,9),mat(0x1a0f0c),-4,3.5,-24,e);M(cyl(1.15,1.15,.2,9),glow(0xff5a00,2),-4,7,-24,e);break;
    case 5:SP.forEach(([x,q],i)=>{if(i%3===0){const tw=G(e);tw.position.set(x,0,q-4);M(cyl(1,1.1,5,8),mat(0x2a2238),0,2.5,0,tw);M(cone(1.3,2,8),mat(0x3a1a5a),0,6,0,tw);M(box(.3,.5,.1),glow(0xffc060,1.2),0,3.5,1.02,tw)}
        else if(i%3===1){const t=M(box(.5,.8,.15),mat(0x5a5a68),x,.4,q,e);t.rotation.z=rnd(-.2,.2);M(box(.5,.12,.15),mat(0x5a5a68),x,.62,q,e)}
        else{const tr=G(e);tr.position.set(x,0,q);const bm=mat(0x2a2020);seg(V(0,0,0),V(0,2,0),.18,.1,bm,tr);seg(V(0,1.3,0),V(.8,2.1,0),.08,.04,bm,tr);seg(V(0,1.6,0),V(-.7,2.4,.2),.07,.03,bm,tr)}});
      const moon=new T.Mesh(sph(2.2,16,12),new T.MeshBasicMaterial({color:0xf4f0ff,fog:false,toneMapped:false}));moon.position.set(8,9.8,-40);e.add(moon);
      [[-3.8,-2.5],[3.9,-3]].forEach(([x,q])=>{M(cyl(.06,.06,1.6,6),mat(0x2a2a2a),x,.8,q,e);M(sph(.13),glow(0xc060ff,2),x,1.65,q,e);const l=new T.PointLight(0xc060ff,1.5,5);l.position.set(x,1.7,q);e.add(l)});break;
    case 6:SP.forEach(([x,q],i)=>{if(i%3===0){const c=G(e);c.position.set(x,0,q);M(cyl(.35,.4,3.2,10),mat(0xf4f0e4),0,1.6,0,c);M(box(1,.2,1),mat(0xf4f0e4),0,.1,0,c);M(box(.95,.2,.95),metal(0xd4af37),0,3.3,0,c);S(c,sc())}
        else if(i%3===1){const c=G(e);c.position.set(x*1.3,rnd(2.5,6),q-5);M(cyl(1.6,1.1,.45,9),mat(0x6ac86a),0,0,0,c);M(cone(1.1,1.6,9),mat(0x8a7a62),0,-1.0,0,c).rotation.x=PI;pine(c,0,0,.6);S(c,rnd(.9,1.6))}
        else{const c=G(e);c.position.set(x,rnd(.2,.6),q);for(let j=0;j<4;j++)S(M(sph(.7,10,7),mat(0xffffff),j*.7-1,rnd(0,.3),rnd(-.3,.3),c),rnd(.8,1.3),.7,1);S(c,sc())}});
      for(let i=0;i<7;i++){const c=G(e);c.position.set(rnd(-16,16),rnd(6,11),rnd(-30,-16));for(let j=0;j<4;j++)S(M(sph(1.2,10,7),new T.MeshBasicMaterial({color:0xffffff,fog:false}),j*1.2-2,rnd(0,.5),0,c),rnd(.8,1.4),.6,1)}
      {const sun=new T.Mesh(sph(3,16,12),new T.MeshBasicMaterial({color:0xfff6c8,fog:false,toneMapped:false}));sun.position.set(-9,10.8,-45);e.add(sun)}break;
    case 7:{/* Batık Şehir: yıkık sütunlar, kemerler, mercanlar, sallanan yosunlar (hiçbiri gölge atmaz) */
      const bs=G(e),st=mat(0x6f8e94),st2=mat(0x5a777e),ms=mat(0x2f7a4a),kp=mat(0x2f8a5a),kp2=mat(0x4a9a4a),cs=[0xff6a8a,0xff9a5a,0xc070ff,0xffd23d,0x5fe3ff],kl=[];
      SP.forEach(([x,q],i)=>{const r=i%5;if(r===0)sArch(bs,x*1.1,q-1.2,sc()*.95,i%2?st:st2,i>7);else if(r===1||r===3)sColumn(bs,x,q,sc(),i%2?st:st2,ms,i%3!==0);
        else if(r===2)coral(bs,x*.85,q+1,sc(),pick(cs));else kelp(bs,x*.9,q+.8,sc(),i%2?kp:kp2,kl)});
      [[-4.2,.2],[3.6,-.6],[-3.4,-2.4],[4.4,-3]].forEach(([x,q],i)=>coral(bs,x,q,rnd(.55,.85),cs[i]));
      for(let i=0,n=Math.round(8*QF)+2;i<n;i++)kelp(bs,rnd(-9,9),rnd(-12,-3.6),rnd(.7,1.2),i%2?kp:kp2,kl);
      rock(bs,3.9,.9,.55,0x5a6a6a);rock(bs,-4.3,1.4,.45,0x5a6a6a);
      bs.traverse(n=>{n.castShadow=false});
      e.userData.tk.push(()=>{for(let i=0;i<kl.length;i++){const k=kl[i];k.g.rotation.z=Math.sin(t*.9+k.ph)*k.a;k.g.rotation.x=Math.cos(t*.7+k.ph)*k.a*.6}});break}
    case 8:SP.forEach(([x,q],i)=>{if(i%2)crystal(e,x,q,rnd(1.2,2.2),i%4===1?0xc060ff:0xff3df0);else{const r=M(dod(rnd(.5,1.1)),mat(0x2a1a44),x*1.2,rnd(2,6),q-3,e);r.rotation.set(rnd(0,3),rnd(0,3),0)}});
      [[-4,-3,0xc060ff],[4.2,-3.5,0xff3df0],[0,-9,0x7fe7ff]].forEach(([x,q,c])=>{const l=new T.PointLight(c,1.6,7);l.position.set(x,1.5,q);e.add(l)});
      {const rg=new T.Mesh(new T.TorusGeometry(7,.25,8,48),new T.MeshBasicMaterial({color:0xc060ff,fog:false}));rg.position.set(0,9,-36);rg.rotation.x=.5;e.add(rg);
       const hole=new T.Mesh(sph(5.5,20,14),new T.MeshBasicMaterial({color:0x000000,fog:false}));hole.position.set(0,9,-37);e.add(hole);
       const rg2=new T.Mesh(new T.TorusGeometry(9.5,.1,6,48),new T.MeshBasicMaterial({color:0xff3df0,fog:false}));rg2.position.set(0,9,-36);rg2.rotation.x=.8;e.add(rg2)}break}
  backdrop(e,z,d);decor(e,z);return e}

/* ---------------- uzak arka plan, gök cisimleri, bulutlar, zemin süsleri ---------------- */
const KP=o=>{o.userData.keep=1;return o},DUM=new T.Object3D(),TC=new T.Color();
function dot(){if(!dotTex){dotTex=softDot();dotTex.userData={}}return dotTex}
/* gölge atmayan sade mesh (süsler ve efektler için) */
function N(geo,mt,x,y,z,p){const o=new T.Mesh(geo,mt);o.position.set(x||0,y||0,z||0);if(p)p.add(o);return o}
const DG={ot:KP(new T.ConeGeometry(.055,.36,3,1,true).translate(0,.18,0)),cicek:KP(cone(.075,.05,5).rotateX(PI).translate(0,.13,0)),cakil:KP(oct(.14).scale(1,.55,1)),kristal:KP(oct(.12).translate(0,.1,0)),tumsek:KP(sph(.5,7,4).scale(1,.3,1)),kabuk:KP(new T.SphereGeometry(.13,7,3,0,PI*2,0,PI/2).scale(1.1,.4,1))};
const cloudGeo=KP(ico(1,0)),stalGeo=KP(cone(.5,1,5).rotateX(PI).translate(0,-.5,0)),rockGeo=KP(dod(1));
/* sr: siluet katmanları [tür, yarıçap, yükseklik, renk, ufka solma] · gk: gök cismi [x,y,z, disk yarıçapı (0=bölgede zaten var), disk rengi, hale rengi, hale boyu]
   bl: bulut [renk, adet] · ek: gökyüzü olmayan bölgelerin özel süsü */
const BD=[
  {sr:[['peak',54,8,0x86a8d0,.5],['hill',46,5,0x5a9668,.3],['hill',38,3,0x3f7c42,.12]],gk:[9,10.5,-50,2.2,0xfff8dc,0xffe9a8,16],bl:[0xffffff,6]},
  {sr:[['spike',34,15,0x1f2439,0],['spike',27,9,0x171b2c,0]],ek:'sarkit'},
  {sr:[['mesa',54,6,0xc89868,.45],['hill',46,4,0xe0b070,.25],['hill',38,2.4,0xd8a660,.1]],gk:[9.5,10.5,-51,3,0xfff6d0,0xffd488,22],bl:[0xfff4e0,3]},
  {sr:[['peak',54,9,0xa8c4e8,.4],['peak',46,6,0xcfe2f8,.2]],gk:[12.5,10.5,-51,2,0xffffff,0xeaf6ff,15],bl:[0xffffff,5]},
  {sr:[['peak',54,8,0x30100a,.25],['spike',46,6,0x1e0a07,.1],['hill',38,3,0x140605,0]],gk:[9,9.5,-50,2.8,0xff6a2a,0xff3a10,20],bl:[0x2a1410,5]},
  {sr:[['peak',54,9,0x1c1440,.3],['wall',46,6.5,0x120c28,.12],['hill',38,2.4,0x0c0819,0]],gk:[8,9.8,-40.6,0,0,0x8f7dff,13],bl:[0x1c1634,4],ek:'yildiz'},
  {sr:[['hill',54,6.5,0xffffff,.25],['hill',46,3.6,0xf2f6ff,.1]],gk:[-9,10.8,-45.8,0,0,0xfff0b0,20],bl:[0xffffff,4]},
  {sr:[['wall',52,7,0x0f4560,.35],['wall',44,4.5,0x0b3650,.2],['hill',37,2,0x082a40,.05]],gk:[0,15,-42,0,0,0x7fe8ff,36],ek:'batik'},
  {sr:[['spike',50,6,0x341466,.2],['spike',41,3,0x180a30,0]],ek:'hiclik'}];
/* sıradağ / tepe / sur silueti: tek parça, ışıksız; tabanı sis rengine karışır, böylece ufukta katman katman görünür */
function ridge(e,kind,R,H,col,fade,d){const n={peak:22,spike:36,hill:32,mesa:18,wall:46}[kind],A=.74,step=kind==='mesa'||kind==='wall',ps=[],cs=[],ct=new T.Color(col).lerp(new T.Color(d.bot),fade),cb=new T.Color(d.fog),c=new T.Color(),f1=rnd(6,10),f2=rnd(13,19),p1=rnd(0,6),p2=rnd(0,6),hs=[];
  for(let i=0;i<=n;i++){const k=i/n;hs.push(H*(kind==='peak'?(i%2?rnd(.6,1):rnd(.25,.5)):kind==='spike'?(i%3===1?rnd(.55,1):rnd(.1,.3)):kind==='hill'?.5+.3*Math.sin(k*f1+p1)+.2*Math.sin(k*f2+p2):kind==='mesa'?pick([.22,.3,.55,.85,1,.3]):(i%6===2?rnd(.7,1):i%2?.34:.28)))}
  const P=(i,y)=>{const a=(i/n-.5)*2*A;ps.push(Math.sin(a)*R,y,-Math.cos(a)*R);c.copy(cb).lerp(ct,Math.max(0,Math.min(1,(y+1)/(H*.5))));cs.push(c.r,c.g,c.b)};
  for(let i=0;i<n;i++){const a=hs[i],b=step?a:hs[i+1];P(i,-1);P(i+1,-1);P(i+1,b);P(i,-1);P(i+1,b);P(i,a);
    if(kind==='wall'&&i%6===2){P(i-.15,a);P(i+1.15,a);P(i+.5,a+H*.26)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('color',new T.Float32BufferAttribute(cs,3));
  e.add(new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide,toneMapped:false})))}
function skyGlow(e,x,y,z,size,col,op){const m=N(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:dot(),color:col,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),x,y,z,e);m.material.userData.keepMap=1;return m}
/* yavaş süzülen low-poly bulutlar: tek InstancedMesh; karede sadece x kayması yazılır */
function clouds(e,col,n,tk){n=Math.max(2,Math.round(n*(QL?1:.5)));const pn=4,im=new T.InstancedMesh(cloudGeo,new T.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:.6,flatShading:true,fog:false}),n*pn),cx=new Float32Array(n),sp=new Float32Array(n),ox=new Float32Array(n*pn),a=im.instanceMatrix.array;im.frustumCulled=false;
  for(let i=0;i<n;i++){cx[i]=-30+60*(i+rnd(.1,.9))/n;sp[i]=rnd(.12,.3);const y=rnd(6,10.5),z=rnd(-45,-30),s=rnd(1.3,2.3);
    for(let j=0;j<pn;j++){const k=i*pn+j,q=s*(j===0||j===pn-1?.75:1.1);ox[k]=(j-1.5)*s*.95+rnd(-.3,.3);DUM.position.set(cx[i]+ox[k],y+(j%2?s*.35:0)+rnd(-.2,.2),z+rnd(-.5,.5));DUM.rotation.set(0,rnd(0,6),0);DUM.scale.set(q*1.25,q*.7,q);DUM.updateMatrix();im.setMatrixAt(k,DUM.matrix)}}
  e.add(im);tk.push(dt=>{for(let i=0;i<n;i++){cx[i]+=sp[i]*dt;if(cx[i]>34)cx[i]=-34;for(let j=0;j<pn;j++){const k=i*pn+j;a[k*16+12]=cx[i]+ox[k]}}im.instanceMatrix.needsUpdate=true})}
function stars(e,n,col,size,tk){n=Math.max(20,Math.round(n*QF));const p=new Float32Array(n*3),R=57;for(let i=0;i<n;i++){const a=rnd(-1.15,1.15),el=rnd(.01,.8);p[i*3]=R*Math.cos(el)*Math.sin(a);p[i*3+1]=R*Math.sin(el);p[i*3+2]=-R*Math.cos(el)*Math.cos(a)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));const m=new T.PointsMaterial({color:col,size,map:dot(),transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,fog:false});m.userData.keepMap=1;
  const o=new T.Points(g,m);o.frustumCulled=false;e.add(o);tk.push(()=>{m.opacity=.65+.3*Math.sin(t*2.3)})}
function backdrop(e,z,d){const b=BD[z],tk=e.userData.tk;
  b.sr.forEach(s=>ridge(e,s[0],s[1],s[2],s[3],s[4],d));
  if(b.gk){const g=b.gk;if(g[3]){const s=N(new T.CircleGeometry(g[3],22),new T.MeshBasicMaterial({color:g[4],fog:false,toneMapped:false}),g[0],g[1],g[2],e);s.lookAt(0,2,7)}
    const h=skyGlow(e,g[0],g[1],g[2]-.7,g[6],g[5],.6);tk.push(()=>{const k=1+Math.sin(t*.9)*.05;h.scale.set(k,k,1)})}
  if(b.bl)clouds(e,b.bl[0],b.bl[1],tk);
  if(b.ek==='yildiz')stars(e,110,0xdcd4ff,.8,tk);
  if(b.ek==='sarkit'){/* mağara tavanından sarkan sarkıtlar + uzakta parıldayan kristal tozu */
    const n=Math.max(8,Math.round(24*QF)),im=new T.InstancedMesh(stalGeo,mat(0x3c3e52),n);im.frustumCulled=false;
    for(let i=0;i<n;i++){const q=rnd(-20,-3),x=rnd(-1,1)*((7.6-q)*.5+1),L=rnd(3,6),tip=2.1+(7.4-q)*.315-rnd(.5,2.6);DUM.position.set(x,tip+L,q);DUM.rotation.set(rnd(-.06,.06),rnd(0,6),rnd(-.06,.06));DUM.scale.set(rnd(.6,1.3),L,rnd(.6,1.3));DUM.updateMatrix();im.setMatrixAt(i,DUM.matrix)}
    e.add(im);stars(e,60,0x8fe8ff,.6,tk)}
  if(b.ek==='batik'){/* yukarıdan süzülen ışık huzmeleri: ışık değil, yarı saydam düzlemler; parlaklıkları yavaşça dalgalanır */
    const n=Math.max(3,Math.round(7*QF)),rm=new T.MeshBasicMaterial({map:dot(),color:0x9ff4ff,transparent:true,opacity:.14,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide}),rs=[];rm.userData.keepMap=1;
    for(let i=0;i<n;i++){const m=i?rm.clone():rm,o=N(new T.PlaneGeometry(rnd(1.6,3.2),26),m,-11+22*(i+.5)/n+rnd(-1,1),9,rnd(-18,-5),e);o.rotation.z=rnd(.12,.3);m.userData.b=rnd(.14,.26);rs.push(m)}
    tk.push(()=>{for(let i=0;i<rs.length;i++)rs[i].opacity=rs[i].userData.b*(.6+.4*Math.sin(t*.4+i*1.7))})}
  if(b.ek==='hiclik'){/* yıldızlar + ağır ağır süzülen kaya parçaları */
    stars(e,200,0xffffff,.75,tk);const n=Math.max(4,Math.round(12*QF)),im=new T.InstancedMesh(rockGeo,new T.MeshLambertMaterial({color:0x3e2670,flatShading:true,fog:false}),n),by=new Float32Array(n),a=im.instanceMatrix.array;im.frustumCulled=false;
    for(let i=0;i<n;i++){const s=rnd(.5,1.5);by[i]=rnd(3.5,13);DUM.position.set(rnd(-24,24),by[i],rnd(-34,-17));DUM.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3));DUM.scale.set(s,s*.7,s);DUM.updateMatrix();im.setMatrixAt(i,DUM.matrix)}
    e.add(im);tk.push(()=>{for(let i=0;i<n;i++)a[i*16+13]=by[i]+Math.sin(t*.6+i*1.7)*.5;im.instanceMatrix.needsUpdate=true})}}
/* zemin süsleri: [tür, adet, renkler, ışıltılı mı]; hepsi InstancedMesh, gölgesiz; arena ortası boş kalır */
const GD=[
  [['ot',220,[0x4f9a3a,0x6ab84a,0x3d8236,0x86c85a]],['cicek',36,[0xffffff,0xffe14a,0xff8ad8,0xff6a5a]],['cakil',26,[0x8a8a84,0x6f6f6a]]],
  [['cakil',70,[0x4a4a58,0x3a3a46,0x5a5a6a]],['kristal',26,[0x6fdcff,0xc060ff],1],['ot',40,[0x2f4a44,0x3a5a50]]],
  [['ot',70,[0xb89a4a,0xa8863a,0xc8aa5a]],['cakil',60,[0xb07a4a,0x9a6a3c,0xc89a64]],['cicek',10,[0xff6a8a,0xffd23d]]],
  [['tumsek',34,[0xffffff,0xeaf4ff]],['kristal',30,[0xbfeaff,0x9fd8ff],1],['cakil',30,[0x9fb4c8,0x8aa0b8]]],
  [['cakil',80,[0x2a1c18,0x3a2420,0x1a100c]],['kristal',30,[0xff6a10,0xffb347,0xff3d10],1],['ot',30,[0x3a2a22,0x4a3026]]],
  [['ot',120,[0x3a3550,0x2e2a44,0x4a4460]],['cakil',46,[0x4a4a58,0x5a5a68]],['cicek',16,[0xc060ff,0x8f7dff],1]],
  [['tumsek',26,[0xffffff,0xf0f6ff]],['cicek',40,[0xffe14a,0xffffff,0xffd0f0]],['cakil',30,[0xe4dcc4,0xd4af37]]],
  [['ot',90,[0x2a8a6a,0x3aa078,0x1f6a5a]],['kabuk',40,[0xfff0e0,0xffc8b8,0xf4d8a8]],['kristal',24,[0xff6a8a,0xff9a5a,0xc070ff],1],['cakil',40,[0x8a9a9a,0x6a7a80]]],
  [['kristal',50,[0xc060ff,0xff3df0,0x7fe7ff],1],['cakil',60,[0x2a1a44,0x1e1232,0x3a2460]]]];
function decor(e,z){const lm=new T.MeshLambertMaterial({flatShading:true}),bm=new T.MeshBasicMaterial();
  for(const [k,n0,cols,gl] of GD[z]){const n=Math.max(4,Math.round(n0*QF)),im=new T.InstancedMesh(DG[k],gl?bm:lm,n);im.frustumCulled=false;let cx=0,cz=0;
    for(let i=0;i<n;i++){if(k!=='ot'||i%3===0)for(let tr=0;tr<30;tr++){cz=4.6-Math.pow(Math.random(),1.5)*19;cx=rnd(-1,1)*((7.6-cz)*.52+.8)+.35;const dx=cx+.4,dz=cz-.25;if(dx*dx+dz*dz>16.4)break}
      const ot=k==='ot',s=k==='tumsek'?rnd(.6,1.5):rnd(.7,1.4),tl=ot||k==='kristal'?.35:0;
      DUM.position.set(cx+(ot?rnd(-.16,.16):0),0,cz+(ot?rnd(-.16,.16):0));DUM.rotation.set(rnd(-tl,tl),rnd(0,6),rnd(-tl,tl));DUM.scale.set(s,s*(ot?rnd(.7,1.5):k==='kristal'?rnd(1.8,3.4):1),s);DUM.updateMatrix();im.setMatrixAt(i,DUM.matrix);im.setColorAt(i,TC.set(pick(cols)).multiplyScalar(rnd(.85,1.1)))}
    e.add(im)}}

/* ---------------- parçacıklar ---------------- */
const PT={leaf:{c:0x7ad04a,s:.16,n:70,vy:-.5,sway:1,add:0},snow:{c:0xffffff,s:.13,n:140,vy:-.8,sway:.6,add:0},ember:{c:0xff8a2a,s:.12,n:110,vy:.9,sway:.4,add:1},
  dust:{c:0xfff0c8,s:.09,n:90,vx:1.4,vy:0,sway:.2,add:0},gold:{c:0xffe9a0,s:.1,n:90,vy:.3,sway:.5,add:1},star:{c:0xffffff,s:.09,n:160,vy:.05,sway:.15,add:1},mote:{c:0x8fe8ff,s:.1,n:80,vy:.25,sway:.5,add:1},wisp:{c:0xc08bff,s:.12,n:80,vy:.35,sway:.6,add:1},
  bubble:{c:0xd8fbff,s:.15,n:90,vy:1.1,sway:.5,add:1}};
let dotTex=null;
function buildParts(z){const k=PT[ZD[z].pt],nn=Math.max(10,Math.round(k.n*QF)),geo=new T.BufferGeometry(),p=new Float32Array(nn*3);
  for(let i=0;i<nn;i++){p[i*3]=rnd(-10,10);p[i*3+1]=rnd(0,9);p[i*3+2]=rnd(-12,4)}
  geo.setAttribute('position',new T.BufferAttribute(p,3));dotTex=dotTex||softDot();dotTex.userData={};
  const m=new T.PointsMaterial({color:k.c,size:k.s,map:dotTex,transparent:true,opacity:.9,depthWrite:false,blending:k.add?T.AdditiveBlending:T.NormalBlending});m.userData.keepMap=1;
  const o=new T.Points(geo,m);o.userData.k=k;o.frustumCulled=false;return o}

/* ---------------- motor ---------------- */
const API={},HP=V(-1.15,0,1.3),MP=V(.55,0,-.9),PP=V(-2.05,0,.2),LOOK=V(-.3,1.35,-.4);
let ren,scene,cam,clock,host,W=1,H=1,act=true,t=0,shk=0,camZ=7.4,ts=1,tsT=0,stopT=0,punch=0,focus=0;
let env=null,parts=null,zoneI=-1,heroId=null,heroK=null,heroRoot=null,heroM=null,petK=null,petRoot=null,petM=null,monRoot=null,monM=null,eliteFx=null;
const anims=[],buff={};const lights={};
/* ===== v22 CANLI SAVAŞ: ikili sahnede ağır ağır döner, mesafe açılıp kapanır, boşta duranlar adım atar, kamera izler.
   HP/MP/PP her karede güncellenir; eski kod bunları okuduğu için her şey yeni yerleri izler (oyun mantığı değişmez) ===== */
const B0={hp:HP.clone(),mp:MP.clone(),pp:PP.clone(),lk:LOOK.clone()},B0C=V((HP.x+MP.x)/2,0,(HP.z+MP.z)/2);
const LV={a:0,aT:0,g:0,gT:0,x:0,xT:0,tm:1.5,ox:0};let SHK=1;
function lvNudge(da,dg){LV.aT=Math.max(-.45,Math.min(.45,LV.aT+(da||0)));LV.gT=Math.max(-.25,Math.min(.38,LV.gT+(dg||0)));LV.tm=Math.max(LV.tm,1.4)}
function lvRot(b,a,sc,o){const c=B0C,dx=b.x-c.x,dz=b.z-c.z,ca=Math.cos(a),sa=Math.sin(a);o.set(c.x+(dx*ca+dz*sa)*sc+LV.x,0,c.z+(-dx*sa+dz*ca)*sc)}
function turnTo(o,tg,dt){const a=Math.atan2(tg.x-o.position.x,tg.z-o.position.z);let d=a-o.rotation.y;while(d>PI)d-=PI*2;while(d<-PI)d+=PI*2;o.rotation.y+=d*Math.min(1,dt*7)}
function dust(at,n){if(!act||QL<1)return;burst(V(at.x+rnd(-.15,.15),.06,at.z+rnd(-.15,.15)),0xd8c8a8,n,.32)}
function liveTick(dt){if((LV.tm-=dt)<=0){LV.tm=rnd(1.8,3.4);LV.aT=rnd(-.32,.32);LV.xT=rnd(-.32,.32);LV.gT=rnd(-.12,.24)}
  const k=1-Math.pow(.3,dt);LV.a+=(LV.aT-LV.a)*k;LV.g+=(LV.gT-LV.g)*k;LV.x+=(LV.xT-LV.x)*k*.7;
  lvRot(B0.hp,LV.a,1+LV.g*.45,HP);lvRot(B0.mp,LV.a,1+LV.g,MP);lvRot(B0.pp,LV.a,1+LV.g*.3,PP);LOOK.set(B0.lk.x+LV.x*.85,B0.lk.y,B0.lk.z);LV.ox=LV.x*.8+LV.a*.55;
  const kk=1-Math.pow(.02,dt);
  if(heroRoot&&heroM){const u=heroM.userData,p=heroRoot.position;if(!u.busy){const d=Math.hypot(p.x-HP.x,p.z-HP.z);p.x+=(HP.x-p.x)*kk;p.z+=(HP.z-p.z)*kk;p.y*=.8;turnTo(heroRoot,monRoot?monRoot.position:MP,dt);
    const amp=Math.min(1,d*5),w0=u.wk||0;u.wk=w0+amp*dt*15;heroM.position.y=u.y0+Math.abs(Math.sin(u.wk))*.07*amp;if(amp>.3&&Math.floor(u.wk/PI)!==Math.floor(w0/PI))dust(p,2)}}
  if(monRoot&&monM&&!monRoot.userData.busy&&!monM.userData.dying){const p=monRoot.position,d=Math.hypot(p.x-MP.x,p.z-MP.z);p.x+=(MP.x-p.x)*kk;p.z+=(MP.z-p.z)*kk;p.y*=.8;turnTo(monRoot,heroRoot?heroRoot.position:HP,dt);
    const u=monRoot.userData,amp=Math.min(1,d*4),w0=u.wk||0;u.wk=w0+amp*dt*12;if(amp>.3){p.y=Math.abs(Math.sin(u.wk))*.1*amp;if(Math.floor(u.wk/PI)!==Math.floor(w0/PI))dust(p,2)}}
  if(chR&&chR.visible){const q=chR.userData;q.t+=dt;const p=heroRoot?heroRoot.position:HP,s=1+Math.sin(q.t*14)*.12;chR.position.set(p.x,.07,p.z);chR.scale.set(s,s,s);chR.material.opacity=.4+.4*Math.abs(Math.sin(q.t*7));if(monM&&!monM.userData.dying)monM.userData.rx=-.32-.08*Math.sin(q.t*22)}
  if(petRoot&&!petRoot.userData.busy){const p=petRoot.position;p.x+=(PP.x-p.x)*kk;p.z+=(PP.z-p.z)*kk;turnTo(petRoot,monRoot?monRoot.position:MP,dt)}}
/* hız izi: atılırken arkada kalan ışık şeridi (tek paylaşılan düzlem) */
let stG=null,chR=null;
function streak(a,b,col,w){if(!act||QL<1)return;if(!stG)stG=KEEP(new T.PlaneGeometry(1,1));const m=new T.Mesh(stG,new T.MeshBasicMaterial({color:col,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false}));
  const dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz)||.01;let ry=Math.atan2(dx,dz)+PI/2;if(Math.cos(ry)<0)ry+=PI;w=w||.45;m.position.set((a.x+b.x)/2,a.y,(a.z+b.z)/2);m.rotation.y=ry;m.scale.set(L,w,1);scene.add(m);
  anim(.24,k=>{m.material.opacity=.6*(1-k);m.scale.y=w*(1-k*.8)},()=>remove(m))}
/* ölen canavar savrulup yuvarlanır, yere çarpınca parçalanır (ayrı nesne; yenisi beklemeden gelebilir) */
function launch(r,m,cols,pow){const hp=heroRoot?heroRoot.position:HP,dx=r.position.x-hp.x,dz=r.position.z-hp.z,L=Math.hypot(dx,dz)||1,p0=r.position.clone(),D=rnd(2,3.2)*pow,sp=Math.random()<.5?1:-1,u=m.userData,s0=u.s;
  anim(.46,k=>{r.position.set(p0.x+dx/L*D*k,Math.sin(k*PI)*1.3*pow*(1-k*.35),p0.z+dz/L*D*k);r.rotation.x=-k*2.4;r.rotation.z=sp*k*1.7;m.scale.setScalar(s0*(1-k*.3))},
    ()=>{const q=r.position;debris(V(q.x,.3,q.z),cols,7,.9);dust(q,6);ring(V(q.x,0,q.z),0xffffff,.2,1.4,.3,.05,.04);remove(r)})}
function webglOk(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch(e){return false}}
/* sahne görünmüyorken (menüdeyken savaş sürerken) animasyon biriktirme: anında bitir */
function anim(d,f,end){if(!act){try{f(1,0)}catch(e){}try{end&&end()}catch(e){}return}anims.push({t:0,d,f,end})}
function face(o,tg){o.rotation.y=Math.atan2(tg.x-o.position.x,tg.z-o.position.z)}
function fit(m,h,w){m.updateMatrixWorld(true);let b=new T.Box3().setFromObject(m),s=b.getSize(V(0,0,0));const k=Math.min(h/s.y,w/Math.max(s.x,s.z));m.scale.setScalar(k);
  m.updateMatrixWorld(true);b=new T.Box3().setFromObject(m);m.position.y=-b.min.y;const u=m.userData;u.s=k;u.h=b.max.y-b.min.y;u.w=Math.max(b.max.x-b.min.x,b.max.z-b.min.z);u.y0=m.position.y;return m}
/* kenar ışığı: karakter malzemelerine küçük bir gölgelendirici eki; kameraya yan duran yüzler bölge renginde hafifçe parlar (ek ışık yok) */
const RIM={value:new T.Color(0)},rimKey=()=>'rim';
/* ucuz sahte yansıma: yansıma yönü yukarı bakıyorsa bölgenin gök rengi, aşağı bakıyorsa zemin rengi; metaliklikle ölçeklenir (doku/PMREM yok) */
const SKYU={value:new T.Color(.5,.6,.8)},GNDU={value:new T.Color(.15,.12,.1)};
function rimCompile(sh){sh.uniforms.uRim=RIM;sh.uniforms.uSky=SKYU;sh.uniforms.uGnd=GNDU;sh.fragmentShader='uniform vec3 uRim;uniform vec3 uSky;uniform vec3 uGnd;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{vec3 vv=normalize(vViewPosition);float rk=1.0-saturate(dot(vv,normal));totalEmissiveRadiance+=uRim*rk*rk*(.35+.65*saturate(normal.y+.35));vec3 rv=reflect(-vv,normal);totalEmissiveRadiance+=mix(uGnd,uSky,smoothstep(-.35,.6,rv.y))*diffuseColor.rgb*metalnessFactor*(1.1+rk);diffuseColor.rgb*=.78+.3*saturate(normal.y*.5+.5);}')}
function rimify(m){if(m.isMeshStandardMaterial){m.onBeforeCompile=rimCompile;m.customProgramCacheKey=rimKey}return m}
function prep(o){bake(o);o.traverse(n=>{if(n.isMesh){n.material=rimify(n.material.clone());const m=n.material;if(m.emissive){m.userData.e0=m.emissive.clone();m.userData.i0=m.emissiveIntensity}}})}
function flash(o,col,d){if(!o)return;const c=new T.Color(col),ms=[];o.traverse(n=>{if(n.isMesh&&n.material.emissive&&n.material.userData.e0)ms.push(n.material)});
  anim(d||.17,k=>{for(const m of ms){m.emissive.copy(c).lerp(m.userData.e0,k);m.emissiveIntensity=1.3*(1-k)+m.userData.i0*k}})}
function remove(o){if(!o)return;scene.remove(o);dispose(o)}
function resize(){W=host.clientWidth||1;H=host.clientHeight||1;ren.setSize(W,H,false);cam.aspect=W/H;camZ=6.3*Math.max(1,.8/cam.aspect);cam.updateProjectionMatrix();
  if(lights.vg){const h=Math.tan(23*PI/180)*1.06;lights.vg.scale.set(h*cam.aspect,h,1)}}
const KEEP=o=>{o.userData.keep=1;return o};
const sparkGeo=KEEP(new T.BoxGeometry(.08,.08,.08)),coinGeo=KEEP(new T.CylinderGeometry(.13,.13,.035,12)),sparkMats={};
const coinMat=KEEP(new T.MeshStandardMaterial({color:0xffcf4a,metalness:.8,roughness:.25,emissive:0x6a4a00,emissiveIntensity:.5}));
function sparkMat(c){if(!sparkMats[c])sparkMats[c]=KEEP(new T.MeshBasicMaterial({color:c,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));return sparkMats[c]}
function burst(at,c,n,sp){if(!act)return;n=Math.max(1,Math.round(n*QF));for(let i=0;i<n;i++){const s=new T.Mesh(sparkGeo,sparkMat(c).clone());s.material.userData={};s.position.copy(at);scene.add(s);const v=V(rnd(-1,1),rnd(-.2,1.2),rnd(-1,1)).normalize().multiplyScalar(rnd(2,4.5)*(sp||1));
  anim(rnd(.35,.6),(k,dt)=>{s.position.addScaledVector(v,dt);v.y-=9*dt;s.rotation.x+=dt*8;s.material.opacity=1-k;s.scale.setScalar(1-k*.6)},()=>{scene.remove(s);s.material.dispose()})}}
function ring(at,c,r0,r1,d,y,thick){const m=new T.Mesh(new T.TorusGeometry(1,thick||.06,6,40),new T.MeshBasicMaterial({color:c,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.rotation.x=PI/2;m.position.set(at.x,y==null?.08:y,at.z);scene.add(m);
  anim(d,k=>{const r=r0+(r1-r0)*k;m.scale.set(r,r,1);m.material.opacity=1-k},()=>remove(m));return m}
/* sabit ışık havuzu: sahnedeki ışık sayısı hiç değişmez → telefonda takılma olmaz */
const LP=[],ML=[];let lpI=0,mk=[];
function relight(){mk=[];for(const r of [monRoot,heroRoot,petRoot])if(r)r.traverse(n=>{if(n.userData.pl)mk.push(n)});mk=mk.slice(0,4)}
function light(at,c,i,d,dist){if(!LP.length)return;const l=LP[lpI++%LP.length];l.color.set(c);l.distance=dist||6;l.position.copy(at);l.intensity=i;const tok=(l.userData.tok||0)+1;l.userData.tok=tok;
  anim(d,k=>{if(l.userData.tok===tok)l.intensity=i*(1-k)},()=>{if(l.userData.tok===tok)l.intensity=0})}
function monC(){if(!monRoot||!monM)return V(MP.x,1,MP.z);const u=monM.userData;return V(monRoot.position.x,monM.position.y+u.h*.5,monRoot.position.z)}
function heroC(){return V(heroRoot?heroRoot.position.x:HP.x,.95,heroRoot?heroRoot.position.z:HP.z)}
function scr(v){const p=v.clone().project(cam);return {x:(p.x+1)/2*W,y:(1-p.y)/2*H}}

const KEEPG=o=>{o.userData.keep=1;return o};
const arcGeo=KEEPG(new T.TorusGeometry(1,.07,4,28,PI*.95)),arcGeo2=KEEPG(new T.TorusGeometry(1,.2,4,28,PI*.95)),shardGeo=KEEPG(new T.TetrahedronGeometry(.16,0)),orbGeo=KEEPG(new T.IcosahedronGeometry(.09,0));
/* kılıç izi: canavarın önünde parlayan yay */
function slashArc(at,col,big,ang){const m=new T.Mesh(arcGeo,new T.MeshBasicMaterial({color:col,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  m.position.copy(at);m.position.z+=.45;m.lookAt(cam.position);m.rotateZ(ang==null?rnd(-.9,.6):ang);const s0=big?1.1:.8;m.scale.setScalar(s0);scene.add(m);
  const h=new T.Mesh(arcGeo2,new T.MeshBasicMaterial({color:col,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));m.add(h);
  anim(big?.3:.22,k=>{m.rotateZ(.12);m.scale.setScalar(s0*(.7+k*.6));m.scale.z=1;m.material.opacity=1-k*k;h.material.opacity=.35*(1-k)},()=>{scene.remove(m);m.material.dispose();h.material.dispose()})}
/* parçalanma: canavar renginde yerde seken kırıntılar */
function monColors(m){const cs=[];if(m)m.traverse(n=>{if(n.isMesh&&n.material.color&&cs.length<6)cs.push(n.material.color.getHex())});return cs.length?cs:[0xffffff]}
const dMats={};function dMat(c){if(!dMats[c])dMats[c]=KEEPG(new T.MeshLambertMaterial({color:c,flatShading:true}));return dMats[c]}
function debris(at,cols,n,pow,life){if(!act)return;n=Math.round(Math.min(n,18)*QF);for(let i=0;i<n;i++){const d=new T.Mesh(shardGeo,dMat(pick(cols)));d.position.copy(at);
  d.position.x+=rnd(-.3,.3);d.position.y+=rnd(-.4,.4);const sc=rnd(.6,1.6)*(pow>1.5?1.4:1);d.scale.setScalar(sc);scene.add(d);const v=V(rnd(-1,1),rnd(.4,1.4),rnd(-.9,.5)).normalize().multiplyScalar(rnd(2.5,5.5)*pow),sp=V(rnd(-12,12),rnd(-12,12),rnd(-12,12));
  anim(life||rnd(.9,1.4),(k,dt)=>{d.position.addScaledVector(v,dt);v.y-=13*dt;if(d.position.y<.08){d.position.y=.08;v.y*=-.35;v.x*=.6;v.z*=.6;sp.multiplyScalar(.6)}d.rotation.x+=sp.x*dt;d.rotation.y+=sp.y*dt;if(k>.7)d.scale.setScalar(sc*(1-k)/.3)},()=>scene.remove(d))}}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
/* XP küreleri: canavardan kahramana süzülür */
function xpOrbs(at,n){if(!act)return;n=Math.max(1,Math.round(n*QF));const mt=new T.MeshBasicMaterial({color:0x7fd8ff,transparent:true,blending:T.AdditiveBlending});for(let i=0;i<n;i++){const o=new T.Mesh(orbGeo,mt);o.position.copy(at);scene.add(o);
  const mid=V(at.x+rnd(-1.5,1.5),at.y+rnd(1,2.5),at.z+rnd(-.5,1.5)),d0=rnd(0,.25);
  anim(.75+d0,k=>{const q=Math.max(0,(k*(.75+d0)-d0)/.75),e=q*q,h=heroC();const a=at.clone().lerp(mid,q),b=mid.clone().lerp(h,q);o.position.copy(a.lerp(b,e));o.scale.setScalar(1+Math.sin(q*PI)*.6)},()=>scene.remove(o))}
  setTimeout(()=>{if(heroM){flash(heroM,0x7fd8ff,.25);burst(heroC(),0x7fd8ff,6,.5)}},950);setTimeout(()=>mt.dispose(),1300)}
function idle(dt){
  if(heroM){const u=heroM.userData;if(u.orb)u.orb.rotation.y+=dt*2.2;heroM.scale.y=u.s*(1+Math.sin(t*2.4)*.015);if(!u.busy){if(u.armR){u.armR.rotation.x=(u.wep?-1.15:0)+Math.sin(t*2)*.08;u.armR.rotation.z=u.wep?.25:0}if(u.armL){u.armL.rotation.x=(u.wep2?-1.0:0)-Math.sin(t*2)*.08;if(u.wep2)u.armL.rotation.z=-.25}heroM.rotation.z=Math.sin(t*1.3)*.018}
    /* canlılık: baş etrafı kollar, nefesle birlikte hafifçe eğilir */
    if(u.head){u.head.rotation.y=Math.sin(t*.6)*.1;u.head.rotation.x=Math.sin(t*2.4+.5)*.03}
    if(u.cape)u.cape.rotation.x=.14+Math.sin(t*1.7)*.05+Math.sin(t*3.1)*.015;if(u.scarf)for(let i=0;i<u.scarf.length;i++)u.scarf[i].rotation.x=.9+Math.sin(t*2.6+i*1.3)*.16}
  if(petM){const u=petM.userData;petM.position.y=u.y0+(u.fly?.7+Math.sin(t*3)*.12:Math.abs(Math.sin(t*3))*.05);if(u.wings)u.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*10)*.6);
    petM.scale.y=u.s*(1+Math.sin(t*3.1)*.02);if(u.fly)petM.rotation.z=Math.sin(t*1.7)*.07;else petM.rotation.x=Math.sin(t*3)*.03;if(u.head)u.head.rotation.y=Math.sin(t*.9+1)*.22}
  if(petRoot&&petRoot.userData.evo){const e=petRoot.userData.evo;e.orb.rotation.y+=dt*(e.st>=2?1.6:1.1);e.orb.position.y+=Math.sin(t*2)*.002;if(e.halo){e.halo.position.y+=Math.sin(t*2.2+1)*.0015;e.halo.rotation.y+=dt*.8}
    e.wings.forEach((w,i)=>{w.rotation.y=(i?-1:1)*(.2+Math.sin(t*2.6)*.35)})}
  if(monM&&!monM.userData.dying)monIdle(monM,dt,t);
  if(eliteFx){eliteFx.rotation.z+=dt;const s=1+Math.sin(t*4)*.06;eliteFx.scale.set(s,s,1)}
  if(buff.shield&&buff.shield.visible){buff.shield.rotation.y+=dt;const s=1+Math.sin(t*5)*.03;buff.shield.scale.setScalar(s)}
  if(buff.buff&&buff.buff.visible)buff.buff.rotation.z+=dt*2;if(buff.crit&&buff.crit.visible)buff.crit.rotation.z-=dt*2.5}
/* canavar bekleme animasyonu (ana canavar ve dalgadakiler ortak); tt = kendi zaman fazı */
function monIdle(m,dt,tt){const u=m.userData;
    u.kb=(u.kb||0)*Math.pow(.0008,dt);u.sq=(u.sq||0)*Math.pow(.0005,dt);u.tl=(u.tl||0)*Math.pow(.002,dt);
    m.position.y=u.y0+(u.fly?.55+Math.sin(tt*2.2)*.15:0);m.position.z=-u.kb;m.rotation.x=(u.rx||0)-u.tl;
    m.scale.set(u.s*(1+u.sq*.6),u.s*(1+Math.sin(tt*2)*.025)*(1-u.sq),u.s*(1+u.sq*.6));
    if(u.wings)u.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(tt*(u.fast?14:u.fly?7:2.2))*.5);
    if(u.spin)u.spin.rotation.y+=dt*1.4;if(u.flames)u.flames.forEach((f,i)=>f.scale.y=1+Math.sin(tt*11+i*1.7)*.28);
    if(u.neck)u.neck.rotation.z=Math.sin(tt*1.6)*.15;if(u.chomp)u.chomp.rotation.x=-.3-Math.abs(Math.sin(tt*3.2))*.5;if(u.enr)m.position.x=(Math.random()-.5)*.04;if(u.tail)u.tail.rotation.x=Math.sin(tt*2.5)*.08;
    if(u.legs)u.legs.forEach((l,i)=>l.rotation.x=Math.sin(tt*6+i)*.08);
    /* dokunaçlar dalga gibi kıvrılır, yengeç kıskaçlarını açıp kapar */
    if(u.tj)for(let i=0;i<u.tj.length;i++){const j=u.tj[i];j.g.rotation.x=j.x0+Math.sin(tt*1.7+j.ph)*j.a;j.g.rotation.z=Math.cos(tt*1.25+j.ph)*j.a*.5}
    if(u.pinch)for(let i=0;i<u.pinch.length;i++)u.pinch[i].rotation.x=-.12-Math.abs(Math.sin(tt*2.2+i*1.3))*.4;if(u.head&&!u.neck)u.head.rotation.y=Math.sin(tt*1.1)*.18;
    /* türe göre küçük farklar: uçanlar süzülüp yalpalar, insansılar/golemler kollarını tartar, dört ayaklılar başını eğip koklar; iriler daha ağır */
    const q=u.h>2.6?.7:1;m.rotation.y=Math.sin(tt*.7*q+1)*.05;m.rotation.z=Math.sin(tt*1.3*q)*(u.fly?.05:.018);if(u.fly&&!u.enr)m.position.x=Math.sin(tt*1.1*q)*.07;
    if(u.armR){u.armR.rotation.x=(u.wep?-.35:0)+Math.sin(tt*1.7*q)*.09;if(u.armL)u.armL.rotation.x=-Math.sin(tt*1.7*q)*.09}
    if(u.head)u.head.rotation.x=Math.sin(tt*1.9*q+.7)*(u.armR?.03:.06);if(u.cape)u.cape.rotation.x=.14+Math.sin(tt*1.5)*.06;if(u.neck)u.neck.rotation.x=Math.sin(tt*1.1)*.07}
function tickParts(dt){if(!parts)return;const k=parts.userData.k,p=parts.geometry.attributes.position,a=p.array;
  for(let i=0;i<a.length;i+=3){a[i]+=((k.vx||0)+Math.sin(t*1.5+i)*k.sway*.4)*dt;a[i+1]+=k.vy*dt;a[i+2]+=Math.cos(t+i)*k.sway*.1*dt;
    if(a[i+1]<0)a[i+1]=9;if(a[i+1]>9)a[i+1]=0;if(a[i]>10)a[i]=-10}p.needsUpdate=true}
function loop(){const rdt=Math.min(.05,clock.getDelta());if(SC.on&&scVis())renderSC(rdt);if(!act)return;
  if(tsT>0){tsT-=rdt;if(tsT<=0)ts=1}let dt=rdt*ts;if(stopT>0){stopT-=rdt;dt=rdt*.04}t+=dt;
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t+=dt;const k=Math.min(1,a.t/a.d);try{a.f(k,dt)}catch(e){}if(k>=1){anims.splice(i,1);try{a.end&&a.end()}catch(e){}}}
  liveTick(dt);idle(dt);wvTick(dt);tickParts(dt);if(env){const a=env.userData.tk;for(let i=0;i<a.length;i++)a[i](dt)}tickFx(dt);shk=Math.max(0,shk-rdt*2.4);
  for(let i=0;i<ML.length;i++){const l=ML[i],m=mk[i];if(m&&m.parent){m.getWorldPosition(l.position);if(l.userData.m!==m){l.userData.m=m;l.color.set(m.userData.pl.c);l.distance=m.userData.pl.d}l.intensity=m.userData.pl.i}else l.intensity=0}punch=Math.max(0,punch-rdt*5);focus=Math.max(0,focus-rdt*1.6);
  const fz=Math.min(1,focus),cx=LV.ox+.35+Math.sin(t*.35)*.15+Math.sin(t*41)*shk*.13*SHK,cy=2.1+Math.sin(t*.27)*.06+Math.cos(t*37)*shk*.1*SHK;
  const wp=WV.cz*.4;/* dalga varken kamera biraz geri çekilir ve sağa kayar: sıradakiler sağda görünür */
  cam.position.set(cx+wp+(MP.x-cx-wp)*fz*.3,cy+WV.cz*.35-fz*.3,camZ+WV.cz*1.2-fz*1.4);const nf=46-punch*3*SHK;if(Math.abs(cam.fov-nf)>.01){cam.fov=nf;cam.updateProjectionMatrix()}
  cam.lookAt(LOOK.x+wp+(MP.x-LOOK.x-wp)*fz*.6,LOOK.y,LOOK.z+(MP.z-LOOK.z)*fz*.5);
  ren.render(scene,cam)}

/* ---------------- kalıcı efekt nesneleri: bir kez kurulur, karede yeni nesne üretilmez ---------------- */
const FX={pop:[],pi:0,bd:null,bOn:false,blob:[],pack:[],bolt:[],shield:null,weak:null,aura:null,sOn:false,wOn:false,wSet:false,aOn:false,pN:0,wx:0,wy:0,ws:.25,pFor:null,bTok:0};
const TA=V(0,0,0),TB=V(0,0,0),TD=V(0,0,0),UP=V(0,1,0),PKO=[[1.2,-1.1],[-1.25,-1.4]];
function buildFx(){
  /* ayak altı temas gölgeleri: kahraman, yoldaş, canavar */
  const bg=new T.PlaneGeometry(1,1).rotateX(-PI/2);
  for(let i=0;i<3;i++){const b=N(bg,new T.MeshBasicMaterial({map:dot(),color:0,transparent:true,opacity:.4,depthWrite:false}),0,.085,0,scene);b.visible=false;FX.blob.push(b)}
  /* canavar kalkanı */
  const ad={transparent:true,blending:T.AdditiveBlending,depthWrite:false};
  const sh=N(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial(Object.assign({color:0x58c8ff,opacity:.2},ad)),0,0,0,scene);N(new T.IcosahedronGeometry(1.01,1),new T.MeshBasicMaterial(Object.assign({color:0xbfeeff,opacity:.4,wireframe:true},ad)),0,0,0,sh);sh.visible=false;FX.shield=sh;
  /* zayıf nokta hedefi: her zaman üstte çizilir */
  const wd={transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide},wm=new T.MeshBasicMaterial(Object.assign({color:0xffe14a},wd)),wk=G(scene);
  N(new T.RingGeometry(.66,1.12,24),new T.MeshBasicMaterial(Object.assign({color:0x2a0a00,opacity:.55},wd)),0,0,0,wk).renderOrder=20;N(new T.RingGeometry(.74,1,24),wm,0,0,0,wk).renderOrder=21;
  wk.userData.in=N(new T.RingGeometry(.3,.46,4),wm,0,0,0,wk);wk.userData.in.renderOrder=21;N(new T.CircleGeometry(.13,10),new T.MeshBasicMaterial(Object.assign({color:0xffffff},wd)),0,0,0,wk).renderOrder=22;wk.userData.m=wm;wk.visible=false;FX.weak=wk;
  /* kahraman aurası */
  const am=new T.MeshBasicMaterial({color:0xffcf4a,opacity:.85,transparent:true,depthWrite:false}),gm=new T.MeshBasicMaterial(Object.assign({map:dot(),color:0xffcf4a,opacity:.22},ad)),au=G(scene),au1=N(new T.TorusGeometry(1.02,.03,5,40),am,0,0,0,au),au2=N(new T.TorusGeometry(.8,.022,4,6),am,0,0,0,au);
  au1.rotation.x=au2.rotation.x=PI/2;N(new T.PlaneGeometry(2.7,2.7).rotateX(-PI/2),gm,0,-.01,0,au);au.userData={a:au1,b:au2,ms:[am,gm]};au.visible=false;FX.aura=au;
  /* sürü arkadaşları: koyu, sade siluetler */
  FX.pm=new T.MeshLambertMaterial({color:0x222222,flatShading:true});FX.pe=new T.MeshBasicMaterial({color:0xffd23d});
  for(let i=0;i<2;i++){const g=G(scene);S(N(dod(.5),FX.pm,0,.42,0,g),1,.85,1.2);N(ico(.3,0),FX.pm,0,.86,.42,g);for(const s of[-1,1]){N(cone(.09,.26,4),FX.pm,.16*s,1.14,.36,g);N(oct(.05),FX.pe,.11*s,.9,.69,g)}g.visible=false;FX.pack.push(g)}
  /* şimşek: ince parlak çekirdek + geniş soluk hale, 9 parçalı zikzak */
  const bx=new T.BoxGeometry(1,1,1);[.06,.22].forEach((w,i)=>{const im=new T.InstancedMesh(bx,new T.MeshBasicMaterial(Object.assign({color:i?0x6fc8ff:0xf0fbff,opacity:i?.35:1,fog:false},ad)),9);im.frustumCulled=false;im.visible=false;im.userData.w=w;scene.add(im);FX.bolt.push(im)});
  /* parıltı havuzu: kameraya dönük toplamsal düzlemler (vuruş, kritik yıldızı, ölüm, büyü çarpması); hepsi init'te kurulur */
  FX.st=starTex();for(let i=0;i<12;i++){const m=new T.MeshBasicMaterial({map:dot(),color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,depthTest:false});m.userData.keepMap=1;
    const p=N(new T.PlaneGeometry(1,1),m,0,0,0,scene);p.visible=false;p.renderOrder=15;p.frustumCulled=false;FX.pop.push(p)}
  /* boss/arena: ayak altında dönen büyü dairesi, yumuşak ışık lekesi ve yükselen kıvılcımlar */
  {const bd=G(scene),B=(o)=>{const m=new T.MeshBasicMaterial(Object.assign({color:0xff3040},ad,o));if(m.map)m.userData.keepMap=1;return m},g1=B({map:dot(),opacity:.55}),r1=B({opacity:.75}),r2=B({opacity:.45}),mo=B({map:dot(),opacity:.9});
   N(new T.PlaneGeometry(1,1).rotateX(-PI/2),g1,0,.05,0,bd).scale.set(3.8,1,3.8);const rg=G(bd);rg.position.y=.07;N(new T.RingGeometry(2.25,2.34,SQ(48)).rotateX(-PI/2),r1,0,0,0,rg);N(new T.RingGeometry(1.7,1.74,SQ(40)).rotateX(-PI/2),r2,0,0,0,rg);
   const tk=new T.PlaneGeometry(.12,.34).rotateX(-PI/2);for(let i=0;i<12;i++){const a=i/12*PI*2,q=N(tk,r1,Math.sin(a)*2,0,Math.cos(a)*2,rg);q.rotation.y=a}
   bd.userData={rg,ms:[g1,r1,r2,mo],mo:[]};for(let i=0;i<8;i++)bd.userData.mo.push(N(new T.PlaneGeometry(1,1),mo,0,0,0,bd));bd.visible=false;FX.bd=bd}
  try{legBuild()}catch(e){LEG.o={}}}
/* kısa parıltı: havuzdan sıradaki düzlem; star → dört kollu yıldız */
function pop(at,col,size,dur,star){if(!act||!FX.pop.length)return;const p=FX.pop[FX.pi++%FX.pop.length],m=p.material,tok=(p.userData.tok||0)+1,r0=rnd(0,PI),sz=size*(QL?.7:.56);p.userData.tok=tok;
  m.map=star?FX.st:dot();m.color.set(col);p.position.copy(at);p.position.z+=.25;p.visible=true;
  anim(dur,k=>{if(p.userData.tok!==tok)return;p.quaternion.copy(cam.quaternion);p.rotateZ(r0+k*.8);const e=star?.35+k*1.1:.55+k*.6;p.scale.set(sz*e,sz*e,1);m.opacity=.55*(1-k)*(1-k*.5)},()=>{if(p.userData.tok===tok)p.visible=false})}
/* ---------------- efsanevi güç efektleri: kahramanın üstünde ince, sürekli görseller (en fazla 3) ----------------
   hepsi init'te bir kez kurulur, paylaşımlı malzemelerle; sahnede kalır ve her kare kahramanı izler (setHero sonrası kendiliğinden yeniden bağlanır) */
const LEG={on:[],o:{},tw:null,twFor:null,gm:null},LQ=new T.Quaternion();
function legBuild(){const ad={transparent:true,blending:T.AdditiveBlending,depthWrite:false},ms=[],add=m=>{ms.push(m);return m},
  B=(c,op)=>add(new T.MeshBasicMaterial(Object.assign({color:c,opacity:op},ad))),D=(c,op)=>{const m=add(new T.MeshBasicMaterial(Object.assign({map:dot(),color:c,opacity:op},ad)));m.userData.keepMap=1;return m},
  pq=new T.PlaneGeometry(1,1),bx=new T.BoxGeometry(1,1,1),oc=oct(.06),mk=(k,f)=>{const g=G(scene);g.visible=false;g.userData.f=f;LEG.o[k]=g;return g};
  /* storm: silah çevresinde mavi elektrik kıvılcımları */
  {const sm=B(0xbff6ff,.95),gm=D(0x6fc8ff,.6),g=mk('storm',(g,x,y,z,u)=>{const w=u.wep||u.armR;if(w){TB.set(0,u.wep?.55:-.6,0);w.localToWorld(TB)}else TB.set(x,1.2,z);
    const c=g.children,n=QL?6:3;c[0].position.copy(TB);c[0].quaternion.copy(cam.quaternion);c[0].scale.setScalar(.8+Math.random()*.3);
    for(let i=1;i<c.length;i++){const s=c[i];s.visible=i<=n&&Math.random()<.6;if(!s.visible)continue;s.position.set(TB.x+rnd(-.28,.28),TB.y+rnd(-.35,.35),TB.z+rnd(-.28,.28));s.rotation.set(rnd(0,6),rnd(0,6),rnd(0,6));s.scale.set(.018,.018,rnd(.12,.3))}});
   N(pq,gm,0,0,0,g);for(let i=0;i<6;i++)N(bx,sm,0,0,0,g)}
  /* vamp: ayak altında kırmızı sis, dönen halka, yükselen kan damlaları */
  {const fm=D(0xff2030,.5),rm=B(0xff3040,.55),dm=D(0xff4050,.75),g=mk('vamp',(g,x,y,z,u,dt)=>{const c=g.children;c[0].position.set(x,.07,z);c[0].scale.set(1.9,1,1.9);fm.opacity=.42+.12*Math.sin(t*2.2);
    c[1].position.set(x,.09,z);c[1].rotation.z+=dt*.8;for(let i=2;i<c.length;i++){const k=(t*.45+i/4)%1,s=c[i];s.position.set(x+Math.sin(i*1.9)*.5,.1+k*1.3,z+Math.cos(i*1.9)*.45);s.quaternion.copy(cam.quaternion);s.scale.setScalar(.2*(1-k)+.02)}});
   N(new T.PlaneGeometry(1,1).rotateX(-PI/2),fm,0,0,0,g);N(new T.TorusGeometry(.75,.025,4,32),rm,0,0,0,g).rotation.x=PI/2;for(let i=0;i<4;i++)N(pq,dm,0,0,0,g)}
  /* twin: kahramanın arkasında silik hayalet yansıma (kahraman değişince kopyası yeniden alınır) */
  LEG.gm=B(0x9fd8ff,.2);
  mk('twin',(g,x,y,z,u,dt,hm,hr)=>{if(LEG.twFor!==hm)legTwin(hm,g);g.position.set(x-.5,y+Math.sin(t*2)*.04,z-.45);g.rotation.y=hr.rotation.y;
    if(LEG.tw){LEG.tw.position.copy(hm.position);LEG.tw.rotation.copy(hm.rotation);LEG.tw.scale.copy(hm.scale)}LEG.gm.opacity=.16+.07*Math.sin(t*2.6)});
  /* exec: gözlerde kırmızı parıltı + başın üstünde dönen kıvılcımlar */
  {const gm=D(0xff2020,.75),sm=B(0xff4040,.9),g=mk('exec',(g,x,y,z,u)=>{const c=g.children;if(u.head){TB.set(0,.04,.14);u.head.localToWorld(TB)}else TB.set(x,1.6,z);c[0].position.copy(TB);c[0].quaternion.copy(cam.quaternion);c[0].scale.setScalar(.5+.08*Math.sin(t*6));
    for(let i=1;i<4;i++){const a=t*3+i*2.1;c[i].position.set(TB.x+Math.sin(a)*.3,TB.y+.34+Math.sin(t*4+i)*.05,TB.z+Math.cos(a)*.3);c[i].rotation.y=a}});
   N(pq,gm,0,0,0,g);for(let i=0;i<3;i++)N(oc,sm,0,0,0,g)}
  /* pack: kahramanın yanında soluk altın kurt silueti + pati parıltıları */
  {const wm=B(0xffa020,.3),em=B(0xfff4c0,.9),pm=D(0xffc040,.8),g=mk('pack',(g,x,y,z,u,dt,hm,hr)=>{g.position.set(x+.85,Math.abs(Math.sin(t*2.6))*.05,z+.3);g.rotation.y=hr.rotation.y;wm.opacity=.24+.08*Math.sin(t*3);
    LQ.copy(g.quaternion).invert().multiply(cam.quaternion);const sp=g.userData.sp;for(let i=0;i<sp.length;i++){const k=(t*.8+i/3)%1,s=sp[i];s.position.set(Math.sin(i*2.3)*.3,.04+k*.45,Math.cos(i*2.3)*.35-.05);s.scale.setScalar(.16*(1-k)+.01);s.quaternion.copy(LQ)}});
   const w=G(g);w.scale.setScalar(.6);S(N(dod(.5),wm,0,.42,0,w),1,.85,1.2);N(ico(.3,0),wm,0,.86,.42,w);Rz(N(cone(.1,.55,4),wm,0,.55,-.6,w),-1.9);
   for(const s of[-1,1]){N(cone(.09,.26,4),wm,.16*s,1.14,.36,w);N(oct(.05),em,.11*s,.9,.69,w);for(const q of[-1,1])N(cyl(.07,.06,.42,5),wm,.2*s,.2,.3*q,w)}
   g.userData.sp=[];for(let i=0;i<3;i++)g.userData.sp.push(N(pq,pm,0,0,0,g))}
  /* gold: etrafında dönen altın pırıltılar */
  {const gm=B(0xffd23d,.9),g=mk('gold',(g,x,y,z)=>{const c=g.children,n=QL?8:4;for(let i=0;i<c.length;i++){const s=c[i];s.visible=i<n;if(!s.visible)continue;const a=t*1.4+i/n*PI*2;
    s.position.set(x+Math.sin(a)*.78,.35+(i%3)*.42+Math.sin(t*2+i)*.08,z+Math.cos(a)*.78);s.rotation.y=t*4+i;s.scale.setScalar(.8+.5*Math.abs(Math.sin(t*5+i)))}});
   for(let i=0;i<8;i++)N(oc,gm,0,0,0,g)}
  /* echo: ayak altında yavaşça genişleyen mavi halka darbeleri */
  {const m2=[B(0x6fc8ff,.8),B(0x6fc8ff,.8)],tg=new T.TorusGeometry(1,.03,4,40),g=mk('echo',(g,x,y,z)=>{for(let i=0;i<2;i++){const k=(t*.55+i*.5)%1,r=g.children[i],s=.3+k*1.3;r.position.set(x,.08,z);r.scale.set(s,s,1);m2[i].opacity=.85*(1-k)}});
   for(let i=0;i<2;i++)N(tg,m2[i],0,0,0,g).rotation.x=PI/2}
  /* giant: başın üstünde süzülen küçük taç */
  {const cm=add(new T.MeshLambertMaterial({color:0xffcf4a,emissive:0x7a5200,flatShading:true})),jm=B(0xff3d6a,.95),g=mk('giant',(g,x,y,z,u,dt)=>{if(u.head){TB.set(0,0,0);u.head.localToWorld(TB)}else TB.set(x,1.6,z);
    g.position.set(TB.x,TB.y+.44+Math.sin(t*2)*.04,TB.z);g.rotation.y+=dt*.8});
   N(cyl(.17,.15,.08,8),cm,0,0,0,g);for(let i=0;i<5;i++){const a=i/5*PI*2;N(cone(.035,.12,4),cm,Math.sin(a)*.16,.09,Math.cos(a)*.16,g)}for(let i=0;i<3;i++){const a=i/3*PI*2;N(oct(.035),jm,Math.sin(a)*.17,.01,Math.cos(a)*.17,g)}}
  /* thorn: ayak altında yeşil diken halkası */
  {const tm=add(new T.MeshLambertMaterial({color:0x3aa84a,emissive:0x0a3a10,flatShading:true})),rm=B(0x6aff7a,.5),g=mk('thorn',(g,x,y,z,u,dt)=>{g.position.set(x,0,z);g.rotation.y+=dt*.4;const s=1+.05*Math.sin(t*3);g.scale.set(s,1+.12*Math.sin(t*3),s)});
   const cg=cone(.05,.26,4);for(let i=0;i<10;i++){const a=i/10*PI*2,c=N(cg,tm,Math.sin(a)*.72,.11,Math.cos(a)*.72,g);c.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35)}N(new T.TorusGeometry(.72,.02,4,40),rm,0,.06,0,g).rotation.x=PI/2}
  /* swift: ayaklarda geriye akan rüzgâr çizgileri */
  {const wm=B(0xeaf6ff,.5),g=mk('swift',(g,x,y,z,u,dt,hm,hr)=>{g.position.set(x,0,z);g.rotation.y=hr.rotation.y;const c=g.children;for(let i=0;i<c.length;i++){const k=(t*1.6+i*.37)%1,s=c[i];s.position.set((i%2?.22:-.22)+(i-2)*.05,.12+(i%3)*.16,.5-k*1.5);s.scale.set(.02,.02,.45*Math.sin(k*PI)+.01)}});
   for(let i=0;i<5;i++)N(bx,wm,0,0,0,g)}
  /* tutucular: bu malzemelerin çizim programı açılışta derlensin, güç ilk açıldığında takılma olmasın */
  const kg=new T.BoxGeometry(.001,.001,.001);ms.forEach(m=>{const k=new T.Mesh(kg,m);k.frustumCulled=false;k.position.set(0,-3,0);scene.add(k)})}
function legTwin(hm,g){if(LEG.tw){g.remove(LEG.tw);LEG.tw=null}LEG.twFor=hm;const ud=hm.userData;let c=null;hm.userData={};try{c=hm.clone(true)}finally{hm.userData=ud}
  c.traverse(n=>{if(n.isMesh){n.material=LEG.gm;n.castShadow=false;n.receiveShadow=false}});g.add(c);LEG.tw=c}
function legTick(dt){if(!LEG.on.length)return;const hr=heroRoot,hm=heroM;
  if(!hr||!hm){for(let i=0;i<LEG.on.length;i++)LEG.o[LEG.on[i]].visible=false;return}
  const x=hr.position.x,y=hr.position.y,z=hr.position.z,u=hm.userData;
  for(let i=0;i<LEG.on.length;i++){const g=LEG.o[LEG.on[i]];g.visible=true;try{g.userData.f(g,x,y,z,u,dt,hm,hr)}catch(e){g.visible=false}}}
function blob(b,root,m,op){if(!root||!m){b.visible=false;return}const u=m.userData,lift=Math.max(0,m.position.y-u.y0)+root.position.y,f=1/(1+lift*.9),r=Math.min(u.w||1,u.h*1.1)*1.25*root.scale.x*(.65+.35*f);
  b.visible=true;b.position.x=root.position.x;b.position.z=root.position.z;b.scale.set(r,1,r);b.material.opacity=op*f}
function placeWeak(){const u=monM.userData,w=Math.min(u.w||1,u.h);FX.wx=rnd(-.2,.2)*w;FX.wy=rnd(-.1,.22)*u.h;FX.ws=Math.max(.2,Math.min(.36,u.h*.11));FX.wSet=true}
function tickFx(dt){if(!FX.shield)return;legTick(dt);const B=FX.blob,op=QL>0?.3:.44,live=!!(monM&&monRoot&&!monM.userData.dying);
  blob(B[0],heroRoot,heroM,op);blob(B[1],petRoot,petM,op*.85);blob(B[2],live?monRoot:null,monM,op);
  let u=null,mx=0,my=0,mz=0;if(live){u=monM.userData;mx=monRoot.position.x;my=monRoot.position.y+monM.position.y-u.y0+u.h*.5;mz=monRoot.position.z}
  const sh=FX.shield;sh.visible=FX.sOn&&live;if(sh.visible){const p=Math.sin(t*4.5);sh.position.set(mx,my,mz);sh.scale.setScalar(Math.max(u.h*.62,Math.min(u.w||1,u.h*1.3)*.6)*(1+p*.035)*monRoot.scale.x);sh.rotation.y+=dt*.5;sh.material.opacity=.17+p*.07}
  const wk=FX.weak;wk.visible=FX.wOn&&live;if(wk.visible){if(!FX.wSet)placeWeak();const p=Math.sin(t*7);wk.position.set(mx+FX.wx,my+FX.wy,mz+.2);wk.quaternion.copy(cam.quaternion);wk.scale.setScalar(FX.ws*(1+p*.14));wk.userData.in.rotation.z+=dt*2.5;wk.userData.m.opacity=.82+p*.18}
  const bd=FX.bd;if(bd){bd.visible=FX.bOn&&live;if(bd.visible){const s=Math.max(1,Math.min(1.6,(u.w||2)*.42))*monRoot.scale.x,ud=bd.userData;bd.position.set(mx,0,mz);bd.scale.set(s,1,s);ud.rg.rotation.y+=dt*.35;ud.ms[0].opacity=.4+.12*Math.sin(t*2.4);
    LQ.copy(cam.quaternion);for(let i=0;i<ud.mo.length;i++){const k=(t*.35+i/ud.mo.length)%1,q=ud.mo[i],a=i*2.4+t*.2;q.visible=QL>0||i<4;q.position.set(Math.sin(a)*1.9,.2+k*3.2,Math.cos(a)*1.9);q.quaternion.copy(LQ);q.scale.setScalar(.22*Math.sin(k*PI)+.02)}}}
  const au=FX.aura;au.visible=FX.aOn&&!!heroRoot;if(au.visible){au.position.set(heroRoot.position.x,.1,heroRoot.position.z);au.userData.a.rotation.z+=dt*1.2;au.userData.b.rotation.z-=dt*1.8;const s=.86+Math.sin(t*3)*.035;au.scale.set(s,1,s)}
  const n=live&&!WV.n?FX.pN-1:0;if(n>0&&FX.pFor!==monM){FX.pFor=monM;FX.pm.color.set(monColors(monM)[0]).lerp(TC.set(ZD[Math.max(0,zoneI)].fog),.5).multiplyScalar(.7);FX.pe.color.copy(RIM.value).multiplyScalar(1.6)}
  for(let i=0;i<2;i++){const g=FX.pack[i];g.visible=i<n;if(g.visible){const s=Math.max(.55,Math.min(1.25,u.h*.4))*monRoot.scale.x;g.position.set(MP.x+PKO[i][0],.07+Math.abs(Math.sin(t*2.6+i*1.9))*.07,MP.z+PKO[i][1]);g.rotation.y=monRoot.rotation.y;g.scale.set(s,s*(1+Math.sin(t*2.2+i)*.03),s)}}}
/* yeni, isteğe bağlı API'ler asla hata fırlatmaz */
const safe=f=>function(){try{return f.apply(null,arguments)}catch(e){return null}};
/* canavarın etrafında nabız atan enerji kalkanı (spawn/die otomatik kapatır) */
API.shieldFx=safe(on=>{FX.sOn=!!on});
/* canavarın gövdesinde parlayan hedef halkası; her açılışta yeri yeniden seçilir (die otomatik kapatır) */
API.weakSpot=safe(on=>{FX.wOn=!!on;FX.wSet=false;if(on&&monM)placeWeak()});
/* zayıf noktanın sahne kabı içindeki konumu (CSS piksel, sol-üst köşeye göre); yoksa null */
API.weakPos=safe(()=>{if(!act||!FX.wOn||!monM||!monRoot||monM.userData.dying)return null;if(!FX.wSet)placeWeak();const u=monM.userData;TA.set(monRoot.position.x+FX.wx,monRoot.position.y+monM.position.y-u.y0+u.h*.5+FX.wy,monRoot.position.z+.2).project(cam);return {x:(TA.x+1)/2*W,y:(1-TA.y)/2*H}});
/* kahramanın ayak altında dönen aura halkası; renk: hex sayı ya da '#rrggbb', null → kapalı */
API.setAura=safe(c=>{if(c==null||c===false||c===''){FX.aOn=false;return}TC.set(c);FX.aura.userData.ms.forEach(m=>m.color.copy(TC));FX.aOn=true});
/* canavarın arkasında n-1 sürü arkadaşı (n 1–3; 0/1 → gizli). Çağıran kapatana kadar geçerlidir; canavar yokken görünmez */
/* efsanevi güç efektleri: keys = ['storm','vamp',...]; ilk 3 bilinen anahtar gösterilir, [] → hepsi kapalı. Liste hatırlanır, kahraman değişince de sürer */
API.legFx=safe(keys=>{const on=[];(Array.isArray(keys)?keys:[]).forEach(k=>{if(LEG.o[k]&&on.indexOf(k)<0&&on.length<3)on.push(k)});LEG.on=on;
  for(const k in LEG.o)if(on.indexOf(k)<0)LEG.o[k].visible=false;return on.length});
API.packCount=safe(n=>{FX.pN=Math.max(0,Math.min(3,n|0));FX.pFor=null});
/* canavarın tepesine gökten inen kısa şimşek: önceden kurulmuş zikzak + havuzdan ışık + kıvılcım */
API.bolt=safe(()=>{if(!act||!monM||!monRoot||monM.userData.dying||!FX.bolt.length)return;const u=monM.userData,bx=monRoot.position.x,bz=monRoot.position.z,by=monM.position.y-u.y0+u.h*.85,top=by+7.5,n=9;
  TA.set(bx+rnd(-1.3,1.3),top,bz+rnd(-.3,.3));
  for(let i=0;i<n;i++){const k=(i+1)/n;if(i===n-1)TB.set(bx,by,bz);else TB.set(bx+rnd(-.55,.55),top+(by-top)*k,bz+rnd(-.25,.25));
    TD.copy(TB).sub(TA);const len=TD.length();DUM.position.copy(TA).add(TB).multiplyScalar(.5);DUM.quaternion.setFromUnitVectors(UP,TD.normalize());
    for(const im of FX.bolt){DUM.scale.set(im.userData.w,len,im.userData.w);DUM.updateMatrix();im.setMatrixAt(i,DUM.matrix)}TA.copy(TB)}
  const c=FX.bolt[0],h=FX.bolt[1],tok=++FX.bTok;c.instanceMatrix.needsUpdate=h.instanceMatrix.needsUpdate=true;c.visible=h.visible=true;
  anim(.3,k=>{if(tok!==FX.bTok)return;const on=k<.14||k>.22;c.visible=h.visible=on;c.material.opacity=1-k*k;h.material.opacity=.35*(1-k)},()=>{if(tok===FX.bTok)c.visible=h.visible=false});
  light(TB,0x9fe8ff,3.5,.3,8);burst(TB,0xbff6ff,10,1.2);ring(TB,0x9fe8ff,.3,2.6,.4,.08,.08);flash(monM,0xbff6ff,.2);shk=Math.max(shk,.45)});

/* ---------------- dış arayüz ---------------- */
/* ---------------- dalga savaşı: ana canavarın arkasında sıradaki düşmanlar (en fazla 4, düşük kalitede 2) ----------------
   modeller ada göre önbellekte kalır, sadece değişenler kurulur/kaldırılır; gölge atmazlar, model ışığı (PL) havuzuna girmezler
   (relight yalnızca ana canavar/kahraman/yoldaşı tarar). Karede yeni nesne üretilmez. */
const WV={pool:[],idx:[],list:[],n:0,cz:0,rg:null};
const WSL=[[1.55,-1.3],[2.3,-2.9],[-.55,-3.1],[1.1,-4.6]];/* MP'ye göre (x,z) yuvalar: sağ-arka, uzak sağ, sol-arka, en arka; düşük kalitede ilk ikisi (ikisi de sağda, açıkta) */
function wvShared(){if(WV.rg)return;WV.rg=KEEP(new T.TorusGeometry(1,.05,6,40));WV.rm=KEEP(new T.MeshBasicMaterial({color:0xc45bff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));
  WV.pg=KEEP(new T.PlaneGeometry(1,1).rotateX(-PI/2));WV.gm=KEEP(new T.MeshBasicMaterial({map:dot(),color:0xb050ff,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}))}
const wvKey=it=>String(it.name||'')+'|'+(MON[it.name]?'':String(it.emoji||''))+'|'+(it.elite?1:0);
function wvMake(it,tx,tz){const f=MON[it.name],m=f?f():emojiSprite(it.emoji);prep(m);const r=G(scene),el=!!it.elite,k=el?.86:.8;r.add(m);fit(m,2.1*k,2.8*k);
  m.traverse(n=>{n.castShadow=false;n.receiveShadow=false});
  if(el){wvShared();const s=Math.max(.85,Math.min(1.4,(m.userData.w||1)*.55)),a=new T.Mesh(WV.rg,WV.rm),g=new T.Mesh(WV.pg,WV.gm);a.rotation.x=PI/2;a.position.y=.08;a.scale.set(s,s,1);g.position.y=.06;g.scale.setScalar(s*2.5);r.add(a);r.add(g);r.userData.ring=a;
    /* elit: malzemelere hafif mor parıltı (aynı çizim programı, sadece renk) */
    TC.set(0x8a3aff);m.traverse(n=>{const d=n.isMesh&&n.material.userData;if(d&&d.e0){d.e0=d.e0.clone().lerp(TC,.35);d.i0=Math.max(d.i0,.45);n.material.emissive.copy(d.e0);n.material.emissiveIntensity=d.i0}})}
  const e={key:wvKey(it),r,m,ph:rnd(0,6),bx:MP.x+tx,bz:MP.z+tz,tx,tz,lx:0,ly:0,lz:0,dead:false,pi:-1};r.position.set(e.bx,0,e.bz);face(r,HP);
  /* giriş: yerden büyüyerek belirir */
  r.scale.setScalar(.01);anim(.35,q=>{const s=q<.7?q/.7*1.1:1.1-(q-.7)/.3*.1;r.scale.setScalar(Math.max(.01,s))},()=>r.scale.setScalar(1));return e}
function wvApply(){if(!scene)return;const L=WV.list,max=QL?4:2,old=WV.pool.slice(),out=[],idx=[],want=[];let s=0;
  for(let i=0;i<L.length;i++){const it=L[i];want.push(it&&typeof it==='object'&&!it.dead&&s<max?{it,key:wvKey(it),s:s++}:null)}
  const take=(w,i,same)=>{for(let j=0;j<old.length;j++){const e=old[j];if(e&&e.key===w.key&&(!same||e.pi===i)){old[j]=null;return e}}return null};
  for(let i=0;i<want.length;i++)if(want[i])idx[i]=take(want[i],i,true);
  for(let i=0;i<want.length;i++)if(want[i]&&!idx[i])idx[i]=take(want[i],i,false);
  for(const e of old)if(e)remove(e.r);
  for(let i=0;i<want.length;i++){const w=want[i];if(!w){idx[i]=null;continue}const sl=WSL[w.s];let e=idx[i];
    if(e){e.tx=sl[0];e.tz=sl[1]}else{try{e=wvMake(w.it,sl[0],sl[1])}catch(x){e=null}idx[i]=e}if(e){e.pi=i;out.push(e)}}
  WV.pool=out;WV.idx=idx}
function wvC(e){const u=e.m.userData;return V(e.r.position.x,e.r.position.y+(e.m.position.y-u.y0)+u.h*.5*e.r.scale.y,e.r.position.z)}
function wvTick(dt){let n=0;const k=1-Math.pow(.02,dt);
  for(const e of WV.pool){if(e.dead)continue;n++;const x=MP.x+e.tx,z=MP.z+e.tz;e.bx+=(x-e.bx)*k;e.bz+=(z-e.bz)*k;const r=e.r,pw=Math.sin(t*.7+e.ph)*.4,pz=Math.cos(t*.55+e.ph*1.3)*.25;r.position.set(e.bx+e.lx+pw,e.ly+Math.abs(Math.sin(t*5+e.ph))*.05*Math.abs(Math.cos(t*.7+e.ph)),e.bz+e.lz+pz);
    r.rotation.y=Math.atan2(HP.x-r.position.x,HP.z-r.position.z);if(!e.m.userData.dying)monIdle(e.m,dt,t+e.ph);if(r.userData.ring)r.userData.ring.rotation.z+=dt}
  WV.n=n;WV.cz+=((n?1:0)-WV.cz)*Math.min(1,dt*2.2)}
/* ana canavar öldüğünde sıradaki öne geçer: oyun spawn(aynı ad) çağırınca 0. dalga modelinin yerinden yürüyerek gelir */
function wvTake(name){const e=WV.idx[0];if(!e||e.dead||e.key.split('|')[0]!==String(name))return null;const p={x:e.r.position.x,z:e.r.position.z};
  WV.idx[0]=null;const i=WV.pool.indexOf(e);if(i>=0)WV.pool.splice(i,1);remove(e.r);return p}
API.wave=safe(list=>{WV.list=Array.isArray(list)?list.slice(0,16):[];wvApply()});
API.waveHit=safe((i,crit)=>{const e=WV.idx[i|0];if(!e||e.dead)return;const m=e.m,u=m.userData,c=wvC(e);flash(m,crit?0xffe14a:0xffffff,crit?.22:.14);
  u.kb=Math.min(.8,(u.kb||0)+(crit?.4:.2));u.sq=Math.min(.3,(u.sq||0)+(crit?.2:.1));u.tl=Math.min(.5,(u.tl||0)+(crit?.3:.15));
  burst(c,crit?0xffd23d:0xffffff,crit?12:6,crit?1.15:.85);if(crit){debris(c,monColors(m),3,.9);shk=Math.max(shk,.3)}});
API.waveDie=safe(i=>{i=i|0;const e=WV.idx[i];if(!e||e.dead)return;e.dead=true;WV.idx[i]=null;const p=WV.pool.indexOf(e);if(p>=0)WV.pool.splice(p,1);
  const m=e.m,r=e.r,c=wvC(e),u=m.userData;u.dying=1;burst(c,0xffffff,10,1);burst(c,0x8a8a8a,6,.5);ring(V(c.x,0,c.z),0xffffff,.3,1.8,.45);debris(c,monColors(m),9,1);flash(m,0xffffff,.12);
  launch(r,m,monColors(m),.8)});
API.waveAtk=safe(i=>{const e=WV.idx[i|0];if(!e||e.dead)return;const dx=HP.x-e.bx,dz=HP.z-e.bz,L=Math.hypot(dx,dz)||1,D=Math.min(1.5,L*.32),u=e.m.userData;
  anim(.32,k=>{const s=Math.sin(k*PI);e.lx=dx/L*D*s;e.lz=dz/L*D*s;e.ly=s*.22;u.rx=.25*s},()=>{e.lx=e.lz=e.ly=0;u.rx=0});
  setTimeout(()=>{try{if(!heroM||e.dead)return;const c=heroC();flash(heroM,0xff4040,.18);burst(c,0xff6040,4,.55);slashArc(c,0xff7050,false)}catch(x){}},150)});
/* vitrin için ortam yansıması (yalnızca Çanta/Kahraman ekranındaki tek karakter): gök/ufuk/zemin küresi + parlak lekeler → PMREM */
function envFor(d,r,pm){if(!pm)return null;const es=new T.Scene(),sg=new T.SphereGeometry(10,16,10),cs=[],c1=new T.Color(d.top),c2=new T.Color(d.bot),c3=new T.Color(d.gnd).multiplyScalar(.5),c=new T.Color(),ps=sg.attributes.position;
  for(let i=0;i<ps.count;i++){const y=ps.getY(i)/10;if(y>0)c.copy(c2).lerp(c1,Math.pow(y,.6));else c.copy(c2).lerp(c3,Math.min(1,-y*3));cs.push(c.r,c.g,c.b)}
  sg.setAttribute('color',new T.Float32BufferAttribute(cs,3));es.add(new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
  const sn=new T.Mesh(new T.SphereGeometry(1.8,8,6),new T.MeshBasicMaterial({color:new T.Color(d.sun).multiplyScalar(4)}));sn.position.set(4,7,5);es.add(sn);
  const k=new T.Mesh(new T.SphereGeometry(1.2,8,6),new T.MeshBasicMaterial({color:new T.Color(d.rim||0xffffff).multiplyScalar(1.5)}));k.position.set(-5,3,-6);es.add(k);
  const rt=pm.fromScene(es,.03,.1,50);es.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose()}});return rt}
API.init=function(stage){if(!webglOk())return false;
  try{ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){return false}
  ren.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFShadowMap;
  ren.outputEncoding=T.sRGBEncoding;ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.22;
  host=stage;const c=ren.domElement;c.id='c3d';host.insertBefore(c,host.firstChild);
  scene=new T.Scene();cam=new T.PerspectiveCamera(46,1,.1,150);
  lights.hemi=new T.HemisphereLight(0xffffff,0x444444,.8);scene.add(lights.hemi);
  const d=new T.DirectionalLight(0xffffff,1);d.position.set(4,10,6);d.castShadow=true;d.shadow.mapSize.set(1024,1024);const sc=d.shadow.camera;sc.left=-7;sc.right=7;sc.top=7;sc.bottom=-7;sc.near=1;sc.far=35;d.shadow.bias=-.002;
  scene.add(d);scene.add(d.target);lights.sun=d;
  /* sabit arka ışık (kenar vurgusu): init'te bir kez eklenir, ışık sayısı hiç değişmez */
  const bk=new T.DirectionalLight(0x9fc0ff,.6);bk.position.set(-3,5,-7);scene.add(bk);lights.back=bk;
  /* ekran vinyeti: kameraya bağlı tek düzlem, en son çizilir (post-processing yok) */
  {scene.add(cam);const vm=new T.MeshBasicMaterial({map:vigTex(.0,.62,.64),transparent:true,depthTest:false,depthWrite:false,fog:false});vm.userData.keepMap=1;
   const rg=new T.RingGeometry(.64,1.5,32,1),uv=rg.attributes.uv,rp=rg.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,rp.getX(i)*.5+.5,rp.getY(i)*.5+.5);
   const vg=new T.Mesh(rg,vm);vg.position.z=-1;vg.renderOrder=999;vg.frustumCulled=false;cam.add(vg);lights.vg=vg}for(let k=0;k<4;k++){const pl=new T.PointLight(0xffffff,0,6);scene.add(pl);LP.push(pl);const ml=new T.PointLight(0xffffff,0,5);scene.add(ml);ML.push(ml)}
  /* tutucular: geçici efekt malzemelerinin çizim programı hiç silinmesin → vuruşta yeniden derleme takılması olmaz */
  {const kg=new T.BoxGeometry(.001,.001,.001);[new T.MeshBasicMaterial({transparent:true}),new T.MeshBasicMaterial({transparent:true,side:T.DoubleSide}),new T.MeshBasicMaterial({transparent:true,wireframe:true}),
    new T.MeshStandardMaterial({transparent:true,flatShading:true,emissive:0x111111}),new T.MeshStandardMaterial({flatShading:true,emissive:0x111111}),new T.MeshStandardMaterial({flatShading:true,metalness:.6}),new T.MeshLambertMaterial({flatShading:true})]
    .forEach(m=>{const k=new T.Mesh(kg,m);k.frustumCulled=false;k.position.set(0,-3,0);scene.add(k)});
   const kl=new T.Line(new T.BufferGeometry().setFromPoints([V(0,-3,0),V(0,-3.001,0)]),new T.LineBasicMaterial({transparent:true}));kl.frustumCulled=false;scene.add(kl);
   /* kenar ışıklı karakter malzemeleri + yeni efektlerin (kalkan, şimşek, sürü, gölge) çeşitleri de önceden derlensin */
   [rimify(new T.MeshStandardMaterial({flatShading:true})),rimify(new T.MeshStandardMaterial({flatShading:true,transparent:true})),rimify(new T.MeshStandardMaterial({flatShading:true,side:T.DoubleSide})),rimify(new T.MeshStandardMaterial({flatShading:true,side:T.DoubleSide,transparent:true})),
    new T.MeshBasicMaterial(),new T.MeshBasicMaterial({map:dot(),transparent:true})].forEach(m=>{if(m.map)m.userData.keepMap=1;const k=new T.Mesh(kg,m);k.frustumCulled=false;k.position.set(0,-3,0);scene.add(k)});
   /* yumuşak (flatShading'siz) kenar ışıklı ve ışıksız standart çeşitler + çift yüzlü parıltı düzlemi + derinliksiz düzlem + sprite */
   [rimify(new T.MeshStandardMaterial()),rimify(new T.MeshStandardMaterial({transparent:true})),rimify(new T.MeshStandardMaterial({side:T.DoubleSide})),rimify(new T.MeshStandardMaterial({side:T.DoubleSide,transparent:true})),
    new T.MeshStandardMaterial(),new T.MeshStandardMaterial({transparent:true}),new T.MeshStandardMaterial({emissive:0x111111}),
    new T.MeshBasicMaterial({map:dot(),transparent:true,side:T.DoubleSide,blending:T.AdditiveBlending}),new T.MeshBasicMaterial({map:dot(),transparent:true,depthTest:false})].forEach(m=>{if(m.map)m.userData.keepMap=1;const k=new T.Mesh(kg,m);k.frustumCulled=false;k.position.set(0,-3,0);scene.add(k)});
   [new T.MeshBasicMaterial({fog:false,toneMapped:false}),new T.MeshBasicMaterial({map:dot(),transparent:true,fog:false,toneMapped:false}),new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,toneMapped:false}),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:false,toneMapped:false})].forEach(m=>{const k=new T.Mesh(kg,m);k.frustumCulled=false;k.position.set(0,-3,0);scene.add(k)});
   {const sp=new T.Sprite(new T.SpriteMaterial({map:dot()}));sp.material.userData.keepMap=1;sp.scale.setScalar(.001);sp.position.set(0,-3,0);scene.add(sp)}
   const ki=new T.InstancedMesh(kg,new T.MeshBasicMaterial({transparent:true,fog:false}),1);ki.frustumCulled=false;ki.position.set(0,-3,0);scene.add(ki)}
  buildFx();
  clock=new T.Clock();resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(host);else window.addEventListener('resize',resize);
  ren.setAnimationLoop(loop);return true};
API.setActive=on=>{if(on&&!act)clock.getDelta();act=!!on};
API.setZone=function(z){if(z===zoneI)return;zoneI=z;remove(env);if(parts){scene.remove(parts);parts.geometry.dispose();parts.material.dispose()}
  const d=ZD[z];env=buildEnv(z);scene.add(env);parts=buildParts(z);scene.add(parts);scene.fog=new T.Fog(d.fog,d.fn||12,d.ff||34);RIM.value.set(d.rim).multiplyScalar(.75);FX.pFor=null;
  lights.hemi.color.set(d.hs);lights.hemi.groundColor.set(d.hg);lights.hemi.intensity=d.hi*HK;lights.sun.color.set(d.sun);lights.sun.intensity=d.si*SKL;
  RIM.value.set(d.rim).multiplyScalar(RK);if(lights.back){lights.back.color.set(d.rim);lights.back.intensity=BK*(d.si<.7?1.4:1)}
  if(lights.vg)lights.vg.material.opacity=d.si<.7?.8:.62;
  SKYU.value.set(d.hs).lerp(TC.set(d.top),.4).multiplyScalar(.85);GNDU.value.set(d.gnd).multiplyScalar(.3)};
/* ışık ayarı katsayıları (ACES + doğrusal renk için) */
const HK=.85,SKL=1.05,RK=1.1,BK=.7;
API.setHero=function(k,sk,gear){const id=k+'/'+(sk||'def')+'/'+(gear?JSON.stringify(gear):'');if(id===heroId&&heroRoot)return;heroId=id;heroK=k;remove(heroRoot);heroRoot=G(scene);heroRoot.position.copy(HP);face(heroRoot,MP);
  heroM=(HERO[k]||HERO.war)(sk||"def",gear);prep(heroM);heroRoot.add(heroM);fit(heroM,1.75,1.6);relight();for(const b in buff){buff[b].parent&&buff[b].parent.remove(buff[b]);delete buff[b]}};
API.setPet=function(k,st){st=st||0;const id=k?k+'/'+st:null;if(id===petK)return;petK=id;remove(petRoot);petRoot=petM=null;relight();if(!k||!PETM[k])return;petRoot=G(scene);petRoot.position.copy(PP);face(petRoot,MP);
  petM=PETM[k]();prep(petM);petRoot.add(petM);fit(petM,(petM.userData.fly?.75:.95)*(1+.22*st),1.3*(1+.22*st));
  if(st>=1)try{petEvo(petRoot,petM,st)}catch(e){}
  if(st>=1){const a=new T.Mesh(new T.TorusGeometry(.55+.1*st,.035,6,32),new T.MeshBasicMaterial({color:st>=2?0xffd56a:0x9fe8ff,transparent:true,opacity:.85,blending:T.AdditiveBlending}));a.rotation.x=PI/2;a.position.y=.06;petRoot.add(a);
    if(st>=2){const l=PL(0xffd56a,1.2,3.5);l.position.y=.9;petRoot.add(l)}}
  relight();const pr=petRoot;anim(.4,q=>{const s=q<.7?q/.7*1.15:1.15-(q-.7)/.3*.15;pr.scale.setScalar(s)})};
API.spawn=function(name,emoji,o){o=o||{};let fw=null;try{if(!o.boss&&!o.arena&&!o.hero)fw=wvTake(name)}catch(e){}remove(monRoot);eliteFx=null;FX.sOn=false;FX.wSet=false;
  const f=o.hero?()=>(HERO[o.hero]||HERO.war)(o.skin||'def',o.gear):MON[name];monM=f?f():emojiSprite(emoji);prep(monM);monRoot=G(scene);monRoot.position.copy(MP);monRoot.add(monM);
  const big=o.boss||o.arena;fit(monM,(o.arena?3.4:big?3.0:o.hero?1.85:2.1)*(o.scale||1),(big?4.2:2.8)*(o.scale||1));face(monRoot,HP);
  FX.bOn=!!big;if(big&&FX.bd){const c=o.arena?0xffb030:0xff3040;FX.bd.userData.ms.forEach((m,i)=>m.color.set(i===3?(o.arena?0xffe08a:0xff9070):c))}
  if(o.elite||big){const c=o.elite?(o.aura||0xc45bff):o.arena?0xffcf4a:0xff3040;eliteFx=new T.Mesh(new T.TorusGeometry(big?2:1.4,.06,6,48),new T.MeshBasicMaterial({color:c,transparent:true,opacity:.85,blending:T.AdditiveBlending}));
    eliteFx.rotation.x=PI/2;eliteFx.position.y=.1;monRoot.add(eliteFx);const l=PL(c,o.elite?1.6:2.2,6);l.position.set(0,1.5,.8);monRoot.add(l)}
  const r=monRoot,mm=monM;r.userData.big=!!big;r.userData.busy=1;if(fw){/* dalgadan öne koşarak geçer */const fx=fw.x,fz=fw.z;r.position.set(fx,0,fz);r.scale.setScalar(.8);let du=0;
    anim(.42,(k,dt)=>{const e=k*k*(3-2*k);r.position.set(fx+(MP.x-fx)*e,Math.abs(Math.sin(k*PI*3))*.16,fz+(MP.z-fz)*e);r.scale.setScalar(.8+.2*e);if((du+=dt)>.08){du=0;dust(r.position,2)}},()=>{r.position.copy(MP);r.scale.setScalar(1);r.userData.busy=0})}
  else if(!big){/* uzaktan koşarak gelir, toz kaldırır, gelince kükrer */const sx=MP.x+rnd(2.4,3.3),sz=MP.z-rnd(1.4,2.6);r.position.set(sx,0,sz);face(r,MP);let du=0;
    anim(.55,(k,dt)=>{const e=1-(1-k)*(1-k);r.position.set(sx+(MP.x-sx)*e,Math.abs(Math.sin(k*PI*3.5))*.2*(1-k),sz+(MP.z-sz)*e);if((du+=dt)>.08){du=0;dust(r.position,2)}},
      ()=>{r.position.copy(MP);r.userData.busy=0;if(mm&&mm.userData)mm.userData.sq=.3;dust(MP,5);ring(MP,0xffffff,.2,1.3,.3,.05,.04)})}
  else{r.scale.setScalar(.01);r.position.y=3;
  anim(.6,k=>{const e=k<.7?k/.7*1.12:1.12-(k-.7)/.3*.12;r.scale.setScalar(Math.max(.01,e));r.position.y=3*(1-k)*(1-k)},()=>{r.position.y=0;r.scale.setScalar(1);r.userData.busy=0;ring(MP,0xff6040,.5,4,.6);ring(MP,0xffd0a0,.3,2.6,.45,.05,.1);dust(MP,12);shk=.8})}
  relight();if(big)light(V(MP.x,2,MP.z+1),o.arena?0xffcf4a:0xff2020,5,1.2,10)};
API.hit=function(crit,src,pow){if(!monM||monM.userData.dying)return;pow=pow||1;const pet=src==='pet',u=monM.userData,c=monC();if(!pet)lvNudge(0,crit?.05:pow>1.2?.04:.012);
  flash(monM,crit?0xffe14a:pet?0x9fd8ff:0xffffff,crit?.22:.14);
  u.kb=Math.min(.9,(u.kb||0)+(pet?.08:crit?.42:.22)*pow);u.sq=Math.min(.35,(u.sq||0)+(pet?.04:crit?.22:.12)*pow);u.tl=Math.min(.6,(u.tl||0)+(crit?.35:.18)*pow);
  if(!pet&&heroK==='war')slashArc(c,crit?0xffd23d:0xffffff,crit||pow>1.2,pow>1.2?-1.4:null);
  burst(c,crit?0xffd23d:pet?0x9fd8ff:0xffffff,crit?16:pet?4:8,crit?1.3:1);
  pop(c,crit?0xffc040:pet?0x7fc8ff:0xfff4e0,crit?2.6:pet?1:1.6,crit?.26:.16);if(crit)pop(c,0xffffff,2.4,.22,1);
  if(crit||pow>1.2)debris(c,monColors(monM),crit?5:3,1);
  if(crit){shk=Math.max(shk,.45);punch=Math.max(punch,.8);stopT=Math.max(stopT,.07);light(c,0xffd23d,2.5,.22)}else if(!pet){punch=Math.max(punch,.25);stopT=Math.max(stopT,pow>1.2?.05:.025)}
  if(pow>1.2){ring(V(c.x,0,c.z),0xffcf4a,.3,2.4,.35,.06,.06);shk=Math.max(shk,.5)}};
function shot(kind,big){const a=V(HP.x+.25,1.25,HP.z-.1),b=monC();b.x+=rnd(-.25,.25);b.y+=rnd(-.3,.3);let m;
  if(kind==='arrow'){m=G();M(cyl(.035,.035,1.05,5),mat(0x8a5a2a),0,0,0,m).rotation.x=PI/2;M(cone(.075,.22,4),glow(big?0xffd23d:0xffffff,.8),0,0,.6,m).rotation.x=PI/2;M(box(.2,.025,.2),mat(big?0xffd23d:0xff4040),0,0,-.48,m)}
  else{m=new T.Mesh(ico(big?.2:.13,1),glow(big?0xffb0ff:0x9fe8ff,2.4))}
  if(kind==='arrow')m.scale.setScalar(1.35);m.position.copy(a);m.lookAt(b);scene.add(m);const dur=kind==='arrow'?.16:.18;let tt=0;
  anim(dur,(k,dt)=>{m.position.lerpVectors(a,b,k);tt+=dt;if(kind==='arrow'&&tt>.015){tt=0;burst(m.position,big?0xffd23d:0xffffff,1,.15)}if(kind!=='arrow'){m.position.y+=Math.sin(k*PI)*.25;tt+=dt;if(tt>.02){tt=0;burst(m.position,big?0xffb0ff:0x9fe8ff,1,.25)}}},()=>{remove(m);if(kind!=='arrow'){pop(b,big?0xff9af8:0x7fe7ff,big?3:2,.25);ring(V(b.x,b.y,b.z),big?0xff9af8:0x7fe7ff,.2,big?1.6:1,.25,null,.05)}})}
API.heroAttack=function(step,crit){if(!heroM)return;step=step||0;const u=heroM.userData,r=heroRoot,dir=V(MP.x-HP.x,0,MP.z-HP.z).normalize(),fin=step===2;u.busy=(u.busy||0)+1;r.rotation.y=Math.atan2(dir.x,dir.z);
  lvNudge((step%2?1:-1)*(fin?.12:.07),fin?.05:.015);if(heroK!=='arc'&&heroK!=='mag'){const a=heroC(),b=V(HP.x+dir.x*(fin?1.1:.6),.95,HP.z+dir.z*(fin?1.1:.6));streak(a,b,crit?0xffd23d:heroK==='asn'?0xb48cff:0xffffff,fin?.6:.35);dust(r.position,fin?4:2)}
  if(heroK==='arc'){anim(.18,k=>{const s=Math.sin(k*PI);r.position.set(HP.x-dir.x*.12*s,0,HP.z-dir.z*.12*s);if(u.armL)u.armL.rotation.x=-1.5*Math.min(1,k*3);if(u.armR)u.armR.rotation.x=-1.3+.6*s},()=>{r.position.copy(HP);u.busy--});
    shot('arrow',fin);if(fin){setTimeout(()=>shot('arrow',true),50);setTimeout(()=>shot('arrow',true),100)}return}
  if(heroK==='asn'){/* suikastçı: hızlı çift hançer, çapraz iki kesik; bitiricide öne atılıp dönerek keser */
    const ry=r.rotation.y,D=fin?1.15:.55,dur=fin?.36:.2,ms=dur*1000,c1=crit?0xffd23d:0xff5a8a,c2=crit?0xfff0a0:0xd8c8ff;
    anim(dur,k=>{const s=Math.sin(k*PI);r.position.set(HP.x+dir.x*D*s,fin?s*.2:0,HP.z+dir.z*D*s);if(fin)r.rotation.y=ry+k*PI*2;
      if(u.armR){u.armR.rotation.x=-1.15-1.6*s;u.armR.rotation.z=-.9*s}if(u.armL){u.armL.rotation.x=-1.0-1.6*Math.sin(Math.min(1,k*1.3)*PI);u.armL.rotation.z=.9*s}},
      ()=>{r.position.copy(HP);r.rotation.y=ry;u.busy--});
    setTimeout(()=>{if(monM)slashArc(monC(),c1,fin||crit,.9)},ms*.4);setTimeout(()=>{if(monM)slashArc(monC(),c2,fin||crit,-1.05)},ms*.4+60);
    if(fin)setTimeout(()=>{if(!monM)return;const c=monC();slashArc(c,0xffffff,true,0);ring(V(c.x,0,c.z),0xff5a8a,.2,2.2,.3,.05,.05)},ms*.8);return}
  if(heroK==='mag'){anim(.22,k=>{const s=Math.sin(k*PI);r.position.set(HP.x+dir.x*.15*s,0,HP.z+dir.z*.15*s);if(u.armR)u.armR.rotation.x=-1.15-.9*s},()=>{r.position.copy(HP);u.busy--});shot('orb',fin);return}
  const D=fin?.9:.6;anim(fin?.32:.2,k=>{const s=Math.sin(k*PI);r.position.set(HP.x+dir.x*D*s,fin?Math.sin(k*PI)*.45:0,HP.z+dir.z*D*s);r.rotation.z=(step===1?.25:step===0?-.2:0)*s;
    if(u.armR)u.armR.rotation.x=fin?-1.15-2.2*Math.sin(Math.min(1,k*1.6)*PI*.6)+1.6*k*k:(u.wep?-1.15-1.5*s+2.2*s*s:-2.3*s);if(u.armR)u.armR.rotation.z=(step===1?-.9:step===0?.7:.1)*s},
    ()=>{r.position.copy(HP);r.rotation.z=0;u.busy--;if(fin){const c=monC();ring(V(c.x,0,c.z),0xffffff,.2,2,.3,.05,.05);debris(V(c.x,.1,c.z+.4),[0x8a7a62,0x6a5a42],4,.8,.8)}})};
API.die=function(big){if(!monM)return;const m=monM,r=monRoot,c=monC();m.userData.dying=1;monM=null;monRoot=null;eliteFx=null;FX.sOn=false;FX.wOn=false;FX.bOn=false;relight();
  pop(c,0xffffff,big?6:3,big?.5:.3);pop(c,big?0xff7050:0xffe0a0,big?9:4.5,big?.7:.4);if(big)pop(c,0xffffff,7,.6,1);
  burst(c,0xffffff,big?26:12,big?1.4:1);ring(V(c.x,0,c.z),big?0xff5263:0xffffff,.3,big?4:2.2,.5);
  for(let i=0;i<Math.round((big?14:6)*QF)&&act;i++){const s=new T.Mesh(coinGeo,coinMat);s.position.copy(c);s.castShadow=true;scene.add(s);const v=V(rnd(-1.5,1.5),rnd(3,5.5),rnd(-.5,1.8));
    anim(rnd(.8,1.1),(k,dt)=>{s.position.addScaledVector(v,dt);v.y-=11*dt;if(s.position.y<.05){s.position.y=.05;v.y*=-.4;v.x*=.7;v.z*=.7}s.rotation.x+=dt*10;s.rotation.y+=dt*6;s.scale.setScalar(k>.8?(1-k)*5:1)},()=>scene.remove(s))}
  xpOrbs(c,big?14:6);const cols=monColors(m);
  if(big){ts=.3;tsT=.75;focus=.7;punch=1;stopT=.12;flash(m,0xffffff,.6);anim(.55,k=>{m.rotation.z=k*.5;m.position.y=m.userData.y0-k*.2;m.scale.setScalar(m.userData.s*(1+k*.15))},()=>{debris(c,cols,22,1.35,1.4);light(c,0xffffff,8,.4,12);remove(r)})}
  else{stopT=Math.max(stopT,.06);punch=Math.max(punch,.6);debris(c,cols,7,1.15);flash(m,0xffffff,.3);launch(r,m,cols,1)}};
/* canavar saldırısı türe göre: iri olanlar sıçrayıp yere çakılır, uçanlar dalış yapar, diğerleri atılma / pençe / dönerek vuruş */
API.monAttack=function(miss,noRoll){if(!monRoot||!monM)return;const r=monRoot,m=monM,u=m.userData,ru=r.userData,from=r.position.clone(),hp=heroRoot?heroRoot.position:HP,dx=hp.x-from.x,dz=hp.z-from.z,L=Math.hypot(dx,dz)||1,dir=V(dx/L,0,dz/L);
  const ty=ru.big||u.h>2.6?'slam':u.fly?'dive':pick(['lunge','claw','spin','lunge']);ru.busy=(ru.busy||0)+1;lvNudge(rnd(-.06,.06),-.07);const done=()=>{ru.busy=Math.max(0,(ru.busy||1)-1);u.rx=0;m.rotation.y=0};let at=160;
  if(ty==='slam'){at=380;const D=Math.min(L*.5,2.2);anim(.55,k=>{const a=k<.2?0:Math.min(1,(k-.2)/.55),e=a*a*(3-2*a);u.sq=k<.2?k*1.4:u.sq;r.position.set(from.x+dir.x*D*e,k<.2?0:Math.sin(a*PI)*1.2,from.z+dir.z*D*e);u.rx=k<.2?-1.2*k:.35*Math.sin(a*PI)},done);
    setTimeout(()=>{if(!r.parent)return;const p=r.position;ring(V(p.x,0,p.z),0xffb070,.3,3.2,.45,.05,.08);dust(p,9);shk=Math.max(shk,.7);light(V(p.x,.5,p.z),0xffa040,2,.25)},at)}
  else if(ty==='dive'){at=230;const D=Math.min(L*.75,2.6);anim(.48,k=>{const s=Math.sin(k*PI);r.position.set(from.x+dir.x*D*s,Math.max(-.35,Math.cos(k*PI*2)*.55-.1),from.z+dir.z*D*s);u.rx=.7*s},done)}
  else if(ty==='spin'){at=210;anim(.42,k=>{const s=Math.sin(k*PI);r.position.set(from.x+dir.x*1.2*s,s*.15,from.z+dir.z*1.2*s);m.rotation.y=k*PI*2},done)}
  else{const back=ty==='claw';anim(back?.4:.32,k=>{const w=back&&k<.3?-Math.sin(k/.3*PI*.5)*.35:0,s=back?(k<.3?w:Math.sin((k-.3)/.7*PI)):Math.sin(k*PI);r.position.set(from.x+dir.x*1.15*s,0,from.z+dir.z*1.15*s);u.rx=back?(k<.3?-.3:.4*s):.25*s},done);if(back)at=200}
  setTimeout(()=>{if(!heroM)return;const hr=heroRoot,hu=heroM.userData,p0=hr.position.clone();
    if(miss&&noRoll)return;
    if(miss){/* yana takla atarak kaçar */const sd=Math.random()<.5?1:-1,px=-dir.z*sd,pz=dir.x*sd,ry=hr.rotation.y;hu.busy=(hu.busy||0)+1;streak(heroC(),V(p0.x+px*.9,.9,p0.z+pz*.9),0x9fe8ff,.4);
      anim(.32,k=>{const s=Math.sin(k*PI);hr.position.set(p0.x+px*.9*s,s*.35,p0.z+pz*.9*s);hr.rotation.y=ry+sd*k*PI*2},()=>{hr.rotation.y=ry;hr.position.y=0;hu.busy=Math.max(0,hu.busy-1)})}
    else{const c=heroC();flash(heroM,0xff2020,.25);burst(c,0xff4040,6,.7);pop(c,0xff3020,1.8,.22);if(ty==='claw'||ty==='spin')slashArc(c,0xff5040,true,ty==='spin'?0:-.9);
      const hm=heroM,kb=ty==='slam'?.6:.3;hu.busy=(hu.busy||0)+1;anim(.26,k=>{const s=Math.sin(k*PI);hm.rotation.x=-.28*s;hr.position.set(p0.x+dir.x*kb*s,0,p0.z+dir.z*kb*s)},()=>{hm.rotation.x=0;hu.busy=Math.max(0,hu.busy-1)})}},at)};
API.petAttack=function(){if(!petRoot)return;const r=petRoot,to=V(MP.x-PP.x,0,MP.z-PP.z);
  r.userData.busy=1;anim(.36,k=>{const s=Math.sin(k*PI);r.position.set(PP.x+to.x*.45*s,Math.sin(k*PI)*.5,PP.z+to.z*.45*s)},()=>{r.position.copy(PP);r.userData.busy=0})};
function proj(mesh,dur,cb,lc,trail){const a=V(HP.x+.3,1.3,HP.z),b=monC();mesh.position.copy(a);scene.add(mesh);
  const dir=b.clone().sub(a);mesh.lookAt(b);let tt=0;
  anim(dur,(k,dt)=>{mesh.position.copy(a).addScaledVector(dir,k);mesh.position.y+=Math.sin(k*PI)*.6;mesh.rotation.z+=dt*12;tt+=dt;if(trail&&tt>.03){tt=0;burst(mesh.position,trail,1,.3)}},()=>{remove(mesh);pop(b,lc||trail||0xffffff,4,.4);pop(b,0xffffff,2.6,.3,1);ring(V(b.x,0,b.z),lc||0xffffff,.3,2.6,.45);burst(b,trail||0xffffff,16,1.2);if(lc)light(b,lc,4,.35);shk=Math.max(shk,.5);cb&&cb()})}
function arrow(){const g=G();M(cyl(.025,.025,.9,5),mat(0x8a5a2a),0,0,0,g).rotation.x=PI/2;M(cone(.06,.18,4),metal(0xdddddd),0,0,.5,g).rotation.x=PI/2;M(box(.12,.02,.15),mat(0xff4040),0,0,-.42,g);return g}
API.cast=function(ic,cb){const to=monC();
  switch(ic){
    case'🔥':proj(M(ico(.3,1),glow(0xff7a1a,2.2)),.32,cb,0xff7a1a,0xffb347);break;
    case'🏹':{const a=arrow();proj(a,.2,cb,null,0xffffff);break}
    case'💥':API.heroAttack();setTimeout(()=>{ring(V(to.x,0,to.z),0xffb347,.3,3.4,.5,.1,.1);burst(to,0xffb347,20,1.4);light(to,0xffb347,5,.3);shk=.7;cb&&cb()},130);break;
    case'⚡':{const pts=[];let p=V(to.x+rnd(-.5,.5),12,to.z);for(let i=0;i<9;i++){pts.push(p.clone());p=V(to.x+rnd(-.5,.5),12-(i+1)*12/8+.5,to.z+rnd(-.4,.4))}pts.push(to.clone());
      const geo=new T.BufferGeometry().setFromPoints(pts),ln=new T.Line(geo,new T.LineBasicMaterial({color:0xbff6ff,transparent:true}));scene.add(ln);
      const ln2=ln.clone();ln2.position.x=.06;scene.add(ln2);light(to,0x9fe8ff,8,.35,12);shk=1;burst(to,0xbff6ff,22,1.5);ring(V(to.x,0,to.z),0x9fe8ff,.3,3.8,.5,.1,.1);
      anim(.3,k=>{ln.material.opacity=1-k;ln2.visible=k<.5},()=>{remove(ln);scene.remove(ln2)});cb&&cb();break}
    case'🌧️':for(let i=0;i<8;i++)setTimeout(()=>{const a=arrow(),s=V(to.x+rnd(-.9,.9),7,to.z+rnd(-.6,.6)),e=V(s.x,to.y-.3,s.z);a.position.copy(s);a.lookAt(e);scene.add(a);
      anim(.22,k=>a.position.lerpVectors(s,e,k),()=>{burst(e,0xffffff,4,.6);remove(a)})},i*95);setTimeout(()=>cb&&cb(),200);break;
    case'🌪️':{const tw=new T.Mesh(new T.CylinderGeometry(1.2,.25,3,14,4,true),new T.MeshBasicMaterial({color:0xdff6ff,wireframe:true,transparent:true,opacity:.7}));tw.position.set(to.x,1.5,to.z);scene.add(tw);
      anim(.9,k=>{tw.rotation.y+=.5;tw.material.opacity=.7*(1-k*k);tw.scale.set(1+k*.3,1,1+k*.3)},()=>remove(tw));cb&&cb();break}
    case'💚':API.heal();cb&&cb();break;
    default:cb&&cb()}};
/* ===== v24: güçlü saldırı uyarısı (kahramanın altında kırmızı halka, canavar geriye kasılır), kaçış taklası, sınıf ultileri ===== */
API.charge=safe(on=>{if(on){if(!chR){chR=new T.Mesh(new T.RingGeometry(.55,.9,40),new T.MeshBasicMaterial({color:0xff2a2a,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}));chR.rotation.x=-PI/2;scene.add(chR)}
    chR.visible=true;chR.userData.t=0;if(monRoot&&monM&&!chR.userData.mr){monRoot.userData.busy=(monRoot.userData.busy||0)+1;chR.userData.mr=monRoot;monM.userData.sq=.25;flash(monM,0xff2020,.5)}}
  else if(chR){chR.visible=false;const r=chR.userData.mr;if(r){r.userData.busy=Math.max(0,(r.userData.busy||1)-1);chR.userData.mr=null}if(monM)monM.userData.rx=0}});
API.roll=safe((sd,pf)=>{if(!heroRoot||!heroM)return;const hr=heroRoot,hu=heroM.userData,p0=hr.position.clone(),to=monRoot?monRoot.position:MP,dx=to.x-p0.x,dz=to.z-p0.z,L=Math.hypot(dx,dz)||1,px=-dz/L*sd,pz=dx/L*sd,ry=hr.rotation.y;hu.busy=(hu.busy||0)+1;
  streak(heroC(),V(p0.x+px*1.1,.9,p0.z+pz*1.1),pf?0x7fffd4:0x9fe8ff,.5);dust(p0,4);
  anim(.34,k=>{const s=Math.sin(k*PI);hr.position.set(p0.x+px*1.1*s,s*.4,p0.z+pz*1.1*s);hr.rotation.y=ry+sd*k*PI*2},()=>{hr.rotation.y=ry;hr.position.y=0;hu.busy=Math.max(0,hu.busy-1)});
  if(pf){ts=.25;tsT=.7;focus=Math.max(focus,.5);const c=heroC();ring(V(c.x,0,c.z),0x7fffd4,.3,3,.5,.06,.06);pop(c,0x7fffd4,3,.4);light(c,0x7fffd4,3,.4)}});
API.ult=safe((k,cb)=>{if(!heroRoot||!heroM){cb&&cb();return}const hr=heroRoot,hu=heroM.userData,p0=hr.position.clone(),mc=monC(),dx=mc.x-p0.x,dz=mc.z-p0.z,L=Math.hypot(dx,dz)||1,dir=V(dx/L,0,dz/L),col={war:0xffb347,arc:0x9fe8ff,mag:0xd07bff,asn:0xb48cff}[k]||0xffffff;
  hu.busy=(hu.busy||0)+1;focus=1;lvNudge(Math.random()<.5?.35:-.35,0);light(heroC(),col,4,.6,8);ring(V(p0.x,0,p0.z),col,.2,2.2,.5,.06,.08);pop(heroC(),col,3,.5);burst(heroC(),col,12,1);
  const fin=()=>{hu.busy=Math.max(0,hu.busy-1);hr.position.y=0;hr.visible=true},done=()=>{if(cb){const f=cb;cb=null;f()}};
  const boom=(at,big)=>{ring(V(at.x,0,at.z),col,.3,big?5:3,.6,.06,.12);ring(V(at.x,0,at.z),0xffffff,.2,big?3.4:2,.4,.05,.06);pop(at,col,big?7:4,.5);pop(at,0xffffff,big?5:3,.4,1);burst(at,col,big?28:14,1.6);light(at,col,big?9:5,.45,12);shk=Math.max(shk,big?.6:.35);punch=1;if(monM)debris(at,monColors(monM),big?14:6,1.3);dust(at,10)};
  if(k==='war'){ts=.55;tsT=.9;const D0=Math.max(0,L-1.1);anim(.55,q=>{const e=q*q*(3-2*q),s=Math.sin(q*PI);hr.position.set(p0.x+dir.x*D0*e,s*2.4,p0.z+dir.z*D0*e);if(hu.armR)hu.armR.rotation.x=-1.15-2.6*Math.min(1,q*1.4)+(q>.8?3*(q-.8)/.2:0)},
      ()=>{boom(mc,true);slashArc(mc,0xffd23d,true,0);slashArc(mc,0xffffff,true,1.57);done();anim(.35,q=>{hr.position.set(p0.x+dir.x*D0*(1-q),0,p0.z+dir.z*D0*(1-q))},fin)})}
  else if(k==='arc'){ts=.6;tsT=.8;anim(.25,q=>{hr.position.set(p0.x-dir.x*.8*q,Math.sin(q*PI)*1.2,p0.z-dir.z*.8*q)},()=>{const tg=[mc].concat(WV.pool.filter(e=>!e.dead).map(wvC));
      for(let i=0;i<14;i++)setTimeout(()=>{try{const t=pick(tg),a=arrow(),s=V(t.x+rnd(-.6,.6),8,t.z+rnd(-.5,.5)),e=V(s.x,Math.max(.2,t.y-.3),s.z);a.position.copy(s);a.lookAt(e);scene.add(a);anim(.2,q=>a.position.lerpVectors(s,e,q),()=>{burst(e,col,5,.8);pop(e,col,1.4,.18);remove(a)})}catch(x){}},i*55);
      setTimeout(()=>{boom(mc,false);done()},420);anim(.3,q=>{hr.position.set(p0.x-dir.x*.8*(1-q),0,p0.z-dir.z*.8*(1-q))},fin)})}
  else if(k==='mag'){ts=.6;tsT=1;if(hu.armR)hu.armR.rotation.x=-2.6;const m=new T.Mesh(ico(.7,1),glow(0xff8a3a,2.6)),s=V(mc.x-3,9,mc.z-2);m.position.copy(s);scene.add(m);let du=0;
    anim(.6,(q,dt)=>{m.position.lerpVectors(s,mc,q*q);m.rotation.x+=dt*6;if((du+=dt)>.03){du=0;burst(m.position,0xffb347,2,.5)}},()=>{remove(m);boom(mc,true);pop(mc,0xff5a1a,9,.7);done();fin()})}
  else{ts=.5;tsT=.9;const ry=hr.rotation.y;hr.visible=false;const pts=[0,1.3,2.6,3.9,5.2].map(a=>V(mc.x+Math.cos(a)*1.1,0,mc.z+Math.sin(a)*1.1));
    pts.forEach((p,i)=>setTimeout(()=>{try{const q=pts[(i+1)%pts.length];streak(V(p.x,.9,p.z),V(q.x,.9,q.z),col,.6);slashArc(mc,i%2?0xffffff:col,true,i*.6-1.2);burst(mc,col,6,1)}catch(x){}},i*90));
    setTimeout(()=>{hr.position.copy(p0);hr.rotation.y=ry;boom(mc,true);done();fin()},520)}
  setTimeout(()=>{done();if(!hr.visible)fin()},3000)});
API.heal=function(){const c=heroC();for(let i=0;i<3;i++)setTimeout(()=>{const r=ring(V(c.x,0,c.z),0x5df08f,.9,.9,.7,.1,.05);anim(.7,k=>{r.position.y=.1+k*2})},i*120);burst(c,0x5df08f,12,.7)};
API.levelUp=function(){const c=heroC();pop(c,0xffd56a,4,.6);pop(c,0xffffff,3,.45,1);for(let i=0;i<4;i++)setTimeout(()=>{const r=ring(V(c.x,0,c.z),0xffd56a,1,1.3,.8,.1,.07);anim(.8,k=>{r.position.y=.1+k*2.4})},i*110);
  const b=new T.Mesh(new T.CylinderGeometry(.6,.6,8,16,1,true),new T.MeshBasicMaterial({color:0xffd56a,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));b.position.set(c.x,4,c.z);scene.add(b);
  anim(1.1,k=>{b.material.opacity=.5*(1-k);b.scale.set(1-k*.6,1,1-k*.6)},()=>remove(b));light(c,0xffd56a,4,1)};
API.lootBeam=function(col){const c=new T.Color(col),b=new T.Mesh(new T.CylinderGeometry(.25,.5,9,12,1,true),new T.MeshBasicMaterial({color:c,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  b.position.set(MP.x+.9,4.5,MP.z+.6);scene.add(b);const s=M(oct(.18),glow(c.getHex(),2),MP.x+.9,.5,MP.z+.6,scene);light(V(MP.x+.9,1,MP.z+.6),c.getHex(),3,1.6);
  anim(1.8,k=>{b.material.opacity=.6*(1-k);s.rotation.y+=.1;s.position.y=.5+Math.sin(k*PI*3)*.15},()=>{remove(b);remove(s)})};
API.buffs=function(f){if(!heroRoot)return;
  if(!buff.shield){buff.shield=new T.Mesh(new T.IcosahedronGeometry(1.15,1),new T.MeshStandardMaterial({color:0x7fe7ff,emissive:0x2a8aa8,transparent:true,opacity:.28,flatShading:true,depthWrite:false}));buff.shield.position.y=.95;heroRoot.add(buff.shield)}
  if(!buff.buff){buff.buff=new T.Mesh(new T.TorusGeometry(.9,.05,6,40),new T.MeshBasicMaterial({color:0xff5a3d,transparent:true,opacity:.9,blending:T.AdditiveBlending}));buff.buff.rotation.x=PI/2;buff.buff.position.y=.08;heroRoot.add(buff.buff)}
  if(!buff.crit){buff.crit=new T.Mesh(new T.TorusGeometry(.7,.04,6,6),new T.MeshBasicMaterial({color:0xffd23d,transparent:true,opacity:.9,blending:T.AdditiveBlending}));buff.crit.rotation.x=PI/2;buff.crit.position.y=1.9;heroRoot.add(buff.crit)}
  buff.shield.visible=!!f.shield;buff.buff.visible=!!f.buff;buff.crit.visible=!!f.crit;
  if(heroM&&heroM.userData.ghost!==!!f.dodge){heroM.userData.ghost=!!f.dodge;heroM.traverse(n=>{if(n.isMesh&&!n.material.userData.fx){n.material.transparent=!!f.dodge;n.material.opacity=f.dodge?.4:1}})}};
API.shake=b=>{shk=Math.max(shk,b?.6:.15)};
API.setShake=v=>{SHK=v?1:0};
/* efekt yoğunluğu: 0 düşük (gölge yok, düşük çözünürlük, az parçacık) · 1 orta · 2 yüksek */
API.setQuality=function(q){q=Math.max(0,Math.min(2,q|0));if(q===QL&&ren.userData)return;QL=q;QF=[.35,.7,1][q];ren.userData=1;ren.setPixelRatio(Math.min(window.devicePixelRatio||1,[1,1.3,1.6][q]));
  const sh=q>0;if(ren.shadowMap.enabled!==sh){ren.shadowMap.enabled=sh;lights.sun.castShadow=sh;scene.traverse(n=>{if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{m.needsUpdate=true})})}
  resize();if(zoneI>=0){const z=zoneI;zoneI=-1;API.setZone(z)}try{wvApply()}catch(e){}};
API.hitStop=s=>{stopT=Math.max(stopT,s)};
API.petSkill=function(kind){if(!petRoot)return;const pc=V(petRoot.position.x,.8,petRoot.position.z),c=monC();ring(V(pc.x,0,pc.z),0xffd56a,.2,1.6,.4,.06,.06);light(pc,0xffd56a,3,.4);
  if(kind==='fire'){for(let i=0;i<10;i++)setTimeout(()=>{const f=new T.Mesh(ico(.18,0),glow(pick([0xff6a10,0xffb347,0xff3d10]),2,{transparent:true}));f.position.copy(pc);scene.add(f);const e=c.clone().add(V(rnd(-.4,.4),rnd(-.4,.4),0));
    anim(.3,k=>{f.position.lerpVectors(pc,e,k);f.scale.setScalar(1+k*1.5);f.material.opacity=1-k*.6},()=>remove(f))},i*35);setTimeout(()=>{burst(c,0xff8a1f,18,1.3);light(c,0xff6a10,5,.4)},380)}
  else if(kind==='heal'||kind==='shell'){API.heal()}
  else if(kind==='gold'){burst(c,0xffcf4a,14,1.1)}
  else{const r=petRoot;anim(.5,k=>{const s=Math.sin(k*PI);r.position.set(PP.x+(MP.x-PP.x)*.6*s,s*.8,PP.z+(MP.z-PP.z)*.6*s);r.rotation.y+=.5},()=>{r.position.copy(PP);face(r,MP)});setTimeout(()=>{burst(c,0xff4040,12,1);slashArc(c,0xff6060,true)},250)}};
API.monScreen=function(){if(!monM)return {x:W*.55,y:H*.5,w:120,h:150};const c=monC(),u=monM.userData,a=scr(c),tp=scr(V(c.x,c.y+u.h/2,c.z)),bt=scr(V(c.x,c.y-u.h/2,c.z)),h=Math.abs(bt.y-tp.y);return {x:a.x,y:a.y,w:h*.8,h}};
API.heroScreen=function(){const a=scr(heroC());return {x:a.x,y:a.y}};
let tele=null;
API.telegraph=function(on,dur){if(tele){remove(tele);tele=null}if(!on||!heroRoot)return;
  tele=new T.Mesh(new T.RingGeometry(.15,1.15,40),new T.MeshBasicMaterial({color:0xff2020,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));tele.rotation.x=-PI/2;tele.position.set(HP.x,.08,HP.z);scene.add(tele);
  const m=monM,tl=tele;if(m)flash(m,0xff3030,.5);light(V(MP.x,2,MP.z+1),0xff2020,3,dur||1.6,8);
  anim(dur||1.6,k=>{if(tl.parent){tl.material.opacity=.3+.4*Math.abs(Math.sin(k*PI*6));const s=.6+k*.5;tl.scale.set(s,s,1)}if(m&&!m.userData.dying)m.userData.rx=.4*Math.min(1,k*2)},()=>{if(m)m.userData.rx=0})};
API.bigHit=function(){API.monAttack(false);shk=1;setTimeout(()=>{const c=heroC();ring(V(c.x,0,c.z),0xff3030,.3,2.6,.4,.1,.1);burst(c,0xff5030,18,1.2)},170)};
API.block=function(){const c=heroC();pop(c,0x7fe7ff,3.5,.35);pop(c,0xffffff,2.5,.25,1);ring(V(c.x,0,c.z),0x5fe3ff,.3,2.8,.45,.1,.12);burst(c,0x9ff0ff,20,1.3);light(c,0x5fe3ff,5,.4);
  const b=new T.Mesh(new T.IcosahedronGeometry(1.2,1),new T.MeshBasicMaterial({color:0x7fe7ff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,wireframe:true}));b.position.copy(c);scene.add(b);
  anim(.5,k=>{b.scale.setScalar(1+k*.4);b.material.opacity=.6*(1-k)},()=>remove(b));if(monM){const m=monM;anim(.6,k=>{m.userData.rx=-.5*Math.sin(k*PI)},()=>{m.userData.rx=0})}};
API.enrage=function(){if(!monM||!monRoot)return;const m=monM,red=new T.Color(0x6a0000);m.userData.enr=1;m.traverse(n=>{if(n.isMesh&&n.material.userData.e0){n.material.userData.e0=n.material.userData.e0.clone().lerp(red,.7);n.material.userData.i0=Math.max(n.material.userData.i0,.7)}});
  flash(m,0xff2020,.5);const l=PL(0xff2020,2.5,6);l.position.set(0,2,1);monRoot.add(l);relight();ring(MP,0xff2020,.5,4.5,.7,.1,.1);shk=.8};
/* karakter vitrini: Çanta/Kahraman ekranında dönen 3B kahraman */
const SC={on:false};
/* v27: vitrin sadece ekranda görünürken ve 30 kare/sn çizilir (önceden her sekmede 60 kare çiziyordu: menü takılması) */
function scVis(){const e=SC.ren&&SC.ren.domElement.parentElement;if(!e||!e.isConnected||!e.offsetParent)return false;const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0}
function renderSC(dt){SC.acc=(SC.acc||0)+dt;if(SC.acc<1/30)return;dt=SC.acc;SC.acc=0;SC.root.rotation.y+=dt*.55;if(SC.hm&&SC.hm.userData.orb)SC.hm.userData.orb.rotation.y+=dt*2.2;if(SC.pm&&SC.pm.userData.wings)SC.pm.userData.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*10)*.5);SC.ren.render(SC.scene,SC.cam)}
API.showcase=function(el,o){try{if(!el)return false;
  /* v29: telefon arka plana alınınca 3B bağlamı kaybolabilir: kaybolduysa vitrini baştan kur */
  if(SC.ren&&(SC.lost||SC.ren.getContext().isContextLost())){try{SC.ren.dispose()}catch(e){}try{SC.ren.domElement.remove()}catch(e){}SC.ren=null;SC.key=null;SC.lost=false;if(SC.root)SC.root.clear&&SC.root.clear()}
  if(!SC.ren){SC.ren=new T.WebGLRenderer({antialias:true,alpha:true});SC.ren.domElement.addEventListener('webglcontextlost',ev=>{ev.preventDefault();SC.lost=true},false);SC.ren.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));SC.ren.outputEncoding=T.sRGBEncoding;SC.ren.toneMapping=T.ACESFilmicToneMapping;SC.ren.toneMappingExposure=1.1;
    SC.scene=new T.Scene();SC.cam=new T.PerspectiveCamera(30,1,.1,60);SC.cam.position.set(0,1.45,5.6);SC.cam.lookAt(0,.95,0);
    SC.scene.add(new T.HemisphereLight(0xffffff,0x3a3050,.95));const d=new T.DirectionalLight(0xfff4e0,1.15);d.position.set(3,5,4);SC.scene.add(d);const d2=new T.DirectionalLight(0x9fb4ff,.6);d2.position.set(-4,2,-3);SC.scene.add(d2);
    try{const pm=new T.PMREMGenerator(SC.ren),rt=envFor({top:0x5a6aa8,bot:0x2a2e48,gnd:0x1a1c2a,sun:0xfff4e0,rim:0x9fb4ff},SC.ren,pm);if(rt)SC.scene.environment=rt.texture;pm.dispose()}catch(e){}
    M(cyl(1.25,1.35,.14,36),mat(0x2a2e48,{roughness:.55}),0,-.07,0,SC.scene);Rz(M(tor(1.3,.035),glow(0xffcf4a,.9),0,.01,0,SC.scene),PI/2);SC.root=G(SC.scene)}
  const c=SC.ren.domElement;c.style.cssText='width:100%;height:100%;display:block';if(c.parentNode!==el)el.appendChild(c);
  const w=el.clientWidth||300,h=el.clientHeight||240;SC.ren.setSize(w,h,false);SC.cam.aspect=w/h;SC.cam.updateProjectionMatrix();
  const id=JSON.stringify(o);if(id!==SC.id){SC.id=id;while(SC.root.children.length){const ch=SC.root.children[0];SC.root.remove(ch);dispose(ch)}
    SC.hm=bake((HERO[o.cls]||HERO.war)(o.skin||'def',o.gear));fit(SC.hm,1.8,1.5);SC.root.add(SC.hm);SC.pm=null;
    if(o.pet&&PETM[o.pet]){const pg=G(SC.root);pg.position.set(1.0,0,.35);pg.rotation.y=-.5;SC.pm=bake(PETM[o.pet]());fit(SC.pm,.8*(1+.15*(o.st||0)),1.1);if(SC.pm.userData.fly)SC.pm.position.y+=.5;pg.add(SC.pm);if(o.st>=1)try{SC.pm.traverse(n=>{if(n.isMesh&&n.material){n.material=n.material.clone()}});petEvo(pg,SC.pm,o.st)}catch(e){}}}
  SC.on=true;return true}catch(e){return false}};
API.showcaseStop=()=>{SC.on=false};
window.S3D=API;
})();
