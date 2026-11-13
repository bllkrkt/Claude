/* Efsane Avcısı — 3B savaş sahnesi (Three.js r149).
   Hiçbir dış model/resim yok: kahramanlar, yoldaşlar, canavarlar ve bölgeler koddan "low-poly" olarak kurulur.
   Oyun koduyla bağlantı: window.S3D (init, setZone, setHero, setPet, spawn, hit, die, monAttack, heroAttack,
   petAttack, cast, buffs, heal, levelUp, lootBeam, shake, setActive, monScreen, heroScreen). */
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const rnd=(a,b)=>a+Math.random()*(b-a);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const PI=Math.PI;

/* ---------------- yardımcılar ---------------- */
function mat(c,o){return new T.MeshStandardMaterial(Object.assign({color:c,flatShading:true,roughness:.8,metalness:0},o||{}))}
function metal(c){return mat(c,{metalness:.65,roughness:.35})}
function glow(c,i,o){return new T.MeshStandardMaterial(Object.assign({color:c,emissive:c,emissiveIntensity:i==null?1:i,flatShading:true,roughness:.5},o||{}))}
function M(geo,mt,x,y,z,p){const o=new T.Mesh(geo,mt);o.position.set(x||0,y||0,z||0);o.castShadow=true;if(p)p.add(o);return o}
const box=(w,h,d)=>new T.BoxGeometry(w,h,d);
const sph=(r,w,h)=>new T.SphereGeometry(r,w||12,h||9);
const cyl=(a,b,h,s)=>new T.CylinderGeometry(a,b,h,s||8);
const cone=(r,h,s)=>new T.ConeGeometry(r,h,s||8);
const cap=(r,l)=>new T.CapsuleGeometry(r,l,3,8);
const dod=r=>new T.DodecahedronGeometry(r,0);
const oct=r=>new T.OctahedronGeometry(r,0);
const ico=(r,d)=>new T.IcosahedronGeometry(r,d||0);
const tor=(r,t,a)=>new T.TorusGeometry(r,t,5,16,a||PI*2);
function G(p){const g=new T.Group();if(p)p.add(g);return g}
function S(o,x,y,z){o.scale.set(x,y==null?x:y,z==null?x:z);return o}
function Rz(o,x,y,z){o.rotation.set(x||0,y||0,z||0);return o}
/* a noktasından b noktasına uzanan silindir (kol, bacak, kuyruk, dal) */
function seg(a,b,r1,r2,m,p){const d=b.clone().sub(a),len=d.length(),o=M(cyl(r2,r1,len,7),m,0,0,0,p);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o}
function eyes(p,y,z,sep,r,col){const m=col?glow(col,1.6):mat(0x151515);M(sph(r,8,6),m,-sep,y,z,p);M(sph(r,8,6),m,sep,y,z,p)}
function wingGeo(w,h){const s=new T.Shape();s.moveTo(0,0);s.lineTo(w*.3,h*.6);s.lineTo(w,h*.75);s.lineTo(w*.82,h*.3);s.lineTo(w*.66,h*.42);s.lineTo(w*.55,h*.05);s.lineTo(w*.4,h*.2);s.lineTo(w*.22,-h*.1);s.lineTo(0,0);return new T.ShapeGeometry(s)}
function wings(p,u,col,w,h,y,z,sep){u.wings=[];const m=mat(col,{side:T.DoubleSide});for(const s of[-1,1]){const g=G(p);g.position.set(sep*s,y,z);g.rotation.y=-s*.45;const w0=M(wingGeo(w,h),m,0,0,0,g);if(s<0)w0.scale.x=-1;u.wings.push(g)}}
function softDot(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
function dispose(o){o.traverse(n=>{if(n.geometry&&!n.geometry.userData.keep)n.geometry.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.userData.keep)return;if(m.map)m.map.dispose();m.dispose()})})}

/* ---------------- insansı (kahramanlar ve pek çok canavar) ---------------- */
function humanoid(o){
  o=Object.assign({skin:0xf1c27d,cloth:0x3a6ea5,pants:0x3b3b4f,boots:0x3a2a1a,b:1,arm:1},o);
  const g=G(),u=g.userData,b=o.b;
  const sk=mat(o.skin),cl=o.metal?metal(o.cloth):mat(o.cloth),pa=mat(o.pants),bo=mat(o.boots);
  if(o.float){u.fly=1;const tl=M(cone(.36*b,1.15,10),o.robe?mat(o.robe):cl,0,.6,0,g);tl.rotation.x=PI}
  else for(const s of[-1,1]){const L=G(g);L.position.set(.16*b*s,.84,0);M(cap(.105*b,.44),pa,0,-.34,0,L);M(box(.22*b,.13,.33),bo,0,-.76,.05,L);u[s<0?'legL':'legR']=L}
  if(o.robe&&!o.float)M(cyl(.27*b,.5*b,.98,10),mat(o.robe),0,.5,0,g);
  M(cyl(.29*b,.22*b,.68,10),cl,0,1.14,0,g);
  if(o.belly)M(sph(.31*b),cl,0,1.02,.07,g);
  if(!o.robe&&!o.float)M(cyl(.245*b,.245*b,.08,10),o.belt?metal(o.belt):mat(0x3a2a1a),0,.84,0,g);
  if(o.pauldron)for(const s of[-1,1])M(sph(.15*b,10,6),metal(o.pauldron),.33*b*s,1.42,0,g);
  if(o.wraps)for(let i=0;i<4;i++)Rz(M(tor(.27*b,.025),mat(0xcdbb94),0,.92+i*.15,0,g),PI/2+(i%2?.18:-.18));
  if(o.ribs)for(let i=0;i<3;i++)M(tor(.2,.03,PI),mat(0xeee8d5),0,.98+i*.13,.05,g);
  if(o.cape)Rz(M(box(.62*b,1.0,.04),mat(o.cape,{side:T.DoubleSide}),0,1.0,-.24,g),.13);
  if(o.wings)wings(g,u,o.wings,1.1,.8,1.3,-.2,.15);
  /* baş */
  const hd=G(g);hd.position.set(0,1.66,0);u.head=hd;
  if(o.head==='skull'){M(sph(.21),mat(0xeee8d5),0,0,0,hd);M(box(.2,.08,.17),mat(0xeee8d5),0,-.17,.04,hd);eyes(hd,.02,.17,.075,.05,o.eye||0x000001)}
  else if(o.head==='void'){M(sph(.2),mat(0x050505),0,0,.03,hd);eyes(hd,.02,.18,.07,.04,o.eye||0xff2a2a)}
  else{M(sph(.22,12,10),sk,0,0,0,hd);eyes(hd,.03,.19,.075,.035,o.eye)}
  if(o.ears)for(const s of[-1,1])Rz(M(cone(.07,.32,6),sk,.25*s,.04,0,hd),0,0,-s*PI/2.3);
  if(o.tusks)for(const s of[-1,1])Rz(M(cone(.03,.12,5),mat(0xfff8e0),.07*s,-.1,.18,hd),-.3);
  if(o.horns)for(const s of[-1,1])Rz(M(cone(.06*(o.hs||1),.32*(o.hs||1),6),mat(o.horns),.13*s,.2,0,hd),0,0,-s*.45);
  if(o.headWrap)for(let i=0;i<3;i++)Rz(M(tor(.22,.025),mat(0xcdbb94),0,-.08+i*.09,0,hd),PI/2+(i-1)*.2);
  if(o.hood){const h=S(M(sph(.28,12,10),mat(o.hood),0,.03,-.09,hd),1,1.12,1);if(o.hoodTip)Rz(M(cone(.14,.3,8),mat(o.hood),0,.32,-.15,hd),-.5)}
  if(o.hat==='wizard'){M(cyl(.38,.38,.03,16),mat(o.hatC),0,.16,0,hd);Rz(M(cone(.22,.62,10),mat(o.hatC),0,.47,-.02,hd),-.18);M(tor(.22,.03),glow(0xffd84a,.6),0,.2,0,hd).rotation.x=PI/2}
  if(o.turban){S(M(sph(.25),mat(o.turban),0,.13,0,hd),1,.7,1);M(sph(.05),glow(0xff3df0,1.2),0,.14,.23,hd)}
  if(o.helmet){M(new T.SphereGeometry(.25,12,8,0,PI*2,0,PI*.55),metal(o.helmet),0,.02,0,hd);M(box(.36,.05,.06),mat(0x111111),0,-.0,.21,hd);if(o.plume)Rz(M(cone(.06,.35,6),mat(o.plume),0,.32,-.06,hd),-.4)}
  if(o.crown){M(cyl(.21,.2,.1,8),metal(o.crown),0,.22,0,hd);for(let i=0;i<5;i++){const a=i/5*PI*2;M(cone(.04,.13,4),metal(o.crown),Math.sin(a)*.2,.33,Math.cos(a)*.2,hd)}M(sph(.04),glow(0xff2a6a,1.4),0,.24,.21,hd)}
  if(o.beard)Rz(M(cone(.15,.38,8),mat(o.beard),0,-.24,.13,hd),PI);
  /* kollar */
  const ar=.085*b*o.arm;
  for(const s of[-1,1]){const A=G(g);A.position.set(.36*b*s,1.38,0);M(cap(ar,.42*o.arm),o.sleeve?cl:sk,0,-.28*o.arm,0,A);M(sph(ar*1.12),o.glove?mat(o.glove):sk,0,-.6*o.arm,0,A);if(s>0)u.armR=A;else u.armL=A}
  if(o.ring){u.orb=G(g);u.orb.position.y=1.15;M(oct(.075),glow(o.ring,2),.62,0,0,u.orb);M(oct(.05),glow(o.ring,2),-.62,.15,0,u.orb)}
  /* silah */
  if(o.weapon){const W=G(u.armR);W.position.set(0,-.62*o.arm,.04);W.rotation.x=PI/2;weapon(W,o);u.wep=W}
  if(o.shield){const Sg=G(u.armL);Sg.position.set(-.06,-.5,.14);const d=Rz(M(cyl(.3,.3,.06,10),mat(o.shield),0,0,0,Sg),PI/2);M(sph(.07),metal(0xffd84a),0,0,.05,Sg);Rz(M(tor(.3,.03),metal(0xd4af37),0,0,0,Sg),0)}
  if(o.bow){const Bg=G(u.armL);Bg.position.set(0,-.6,.05);Bg.rotation.y=PI/2;Rz(M(tor(.48,.03,PI),mat(0x7a4a22),0,0,0,Bg),0,0,PI/2);M(cyl(.006,.006,.96,3),mat(0xeeeeee),0,0,0,Bg);
    const Q=G(g);Q.position.set(-.16,1.22,-.24);Q.rotation.x=.3;M(cyl(.08,.07,.5),mat(0x6b3d1d),0,0,0,Q);for(let i=0;i<3;i++)M(cone(.035,.1,4),mat(0xe8e8e8),-.03+i*.03,.3,0,Q)}
  return g}
function weapon(W,o){const t=o.weapon,wc=o.wepC,gm=o.wepGlow&&wc?glow(wc,.75,{metalness:.4,roughness:.3}):null,BM=d=>gm||metal(wc||d);
  if(o.wepLight&&wc){const l=new T.PointLight(wc,1.3,3.2);l.position.set(0,.8,0);W.add(l)}
  if(t==='sword'){M(cyl(.03,.03,.22),mat(0x4a2a12),0,0,0,W);M(box(.3,.05,.07),metal(0xd4af37),0,.12,0,W);M(box(.08,.95,.03),BM(0xdfe6ef),0,.62,0,W);M(cone(.04,.12,4),BM(0xdfe6ef),0,1.15,0,W)}
  else if(t==='club'){M(cyl(.05,.14,.95),mat(wc||0x6b4a2a),0,.45,0,W);for(let i=0;i<4;i++)M(cone(.03,.1,4),mat(0xcccccc),Math.sin(i*1.6)*.12,.7+i*.05,Math.cos(i*1.6)*.12,W)}
  else if(t==='axe'){M(cyl(.03,.03,1.0),mat(0x4a2a12),0,.4,0,W);M(box(.32,.26,.05),BM(0xaab3bf),.14,.78,0,W);M(box(.12,.2,.05),BM(0xaab3bf),-.1,.78,0,W)}
  else if(t==='hammer'){M(cyl(.035,.035,1.0),mat(0x4a2a12),0,.4,0,W);M(box(.42,.26,.26),BM(0x8a929e),0,.88,0,W);M(box(.46,.08,.3),metal(0xd4af37),0,.88,0,W)}
  else if(t==='spear'){M(cyl(.028,.028,1.7),mat(0x6b4a2a),0,.55,0,W);M(cone(.07,.34,4),BM(0xdfe6ef),0,1.55,0,W);M(cyl(.05,.05,.06,6),metal(0xd4af37),0,1.36,0,W)}
  else if(t==='staff'){W.rotation.x=.35;M(cyl(.035,.04,1.7),mat(0x5a3a1a),0,.3,0,W);M(ico(.12,1),glow(o.orb||0x7fe7ff,2),0,1.2,0,W);M(tor(.13,.02),metal(0xd4af37),0,1.08,0,W).rotation.x=PI/2;const l=new T.PointLight(o.orb||0x7fe7ff,1.2,3);l.position.set(0,1.2,0);W.add(l)}
  else if(t==='scythe'){W.rotation.x=.25;M(cyl(.03,.03,2.0),mat(0x2a1a10),0,.5,0,W);Rz(M(tor(.45,.045,PI*.75),metal(0xb8c4d0),-.4,1.4,0,W),0,0,-.2)}
  else if(t==='trident'){M(cyl(.03,.03,1.4),metal(0xd4af37),0,.5,0,W);for(const x of[-.1,0,.1])M(cone(.03,.25,4),metal(0xd4af37),x,1.3,0,W);M(box(.24,.04,.04),metal(0xd4af37),0,1.18,0,W)}}

/* ---------------- dört ayaklılar ---------------- */
function quad(o){
  o=Object.assign({c:0x7d6b5a,len:1.3,h:.45,w:.6,head:'wolf',tail:'thin',lt:1,bh:1},o);
  const g=G(),u=g.userData,bm=mat(o.c),am=mat(o.c2==null?o.c:o.c2),y=o.h+.3;
  S(M(sph(.5,12,9),bm,0,y,0,g),o.w,.62*o.bh,o.len);
  S(M(sph(.45,10,8),am,0,y-.1,.05,g),o.w*.85,.45*o.bh,o.len*.8);
  const lx=o.w*.3,lz=o.len*.3;
  for(const sx of[-1,1])for(const sz of[-1,1]){M(cyl(.09*o.lt,.07*o.lt,y,6),bm,lx*sx,y/2,lz*sz,g);M(sph(.08*o.lt,8,6),mat(o.paw||0x2a2018),lx*sx,.04,lz*sz+.03,g)}
  const hd=G(g);hd.position.set(0,y+.18+(o.neckH||0),o.len*.5);u.head=hd;
  const nose=mat(0x161616);
  switch(o.head){
    case'wolf':case'fox':{M(box(.36,.32,.36),bm,0,0,0,hd);M(box(.2,.15,.3),am,0,-.06,.28,hd);M(sph(.05,8,6),nose,0,-.01,.44,hd);
      const eh=o.head==='fox'?.24:.18;for(const s of[-1,1])M(cone(.075,eh,4),bm,.12*s,.24,-.04,hd);eyes(hd,.06,.185,.09,.035,o.eye);break}
    case'boar':{S(M(sph(.28),bm,0,0,0,hd),1,1,1.25);Rz(M(cyl(.12,.12,.14,8),mat(0xc98a7a),0,-.05,.36,hd),PI/2);for(const s of[-1,1]){Rz(M(cone(.035,.2,5),mat(0xfff8e0),.11*s,-.08,.33,hd),-.7);M(cone(.07,.15,4),bm,.16*s,.24,-.05,hd)}eyes(hd,.07,.25,.11,.035,o.eye);break}
    case'bear':{M(sph(.3),bm,0,0,0,hd);for(const s of[-1,1])M(sph(.09,8,6),bm,.19*s,.22,-.02,hd);M(sph(.14),am,0,-.06,.24,hd);M(sph(.05,8,6),nose,0,-.02,.37,hd);eyes(hd,.07,.25,.11,.035,o.eye);break}
    case'deer':{S(M(sph(.22),bm,0,0,0,hd),1,1,1.4);M(sph(.045,8,6),nose,0,-.03,.3,hd);eyes(hd,.06,.17,.1,.035,o.eye);
      const am2=o.glow?glow(o.glow,1.3):mat(0xe8dcc0);for(const s of[-1,1]){const a=V(.1*s,.18,0),b=V(.3*s,.55,-.05),c=V(.48*s,.75,-.1);seg(a,b,.03,.025,am2,hd);seg(b,c,.025,.015,am2,hd);seg(b,V(.2*s,.75,.05),.02,.012,am2,hd);seg(V(.4*s,.66,-.08),V(.55*s,.58,.05),.018,.01,am2,hd)}
      if(o.glow){const l=new T.PointLight(o.glow,1.2,4);l.position.set(0,.6,0);hd.add(l)}break}
    case'lion':{M(ico(.46,1),mat(o.mane||0x8a4a1a),0,.02,-.1,hd);M(sph(.3),bm,0,0,.05,hd);M(sph(.13),am,0,-.08,.3,hd);M(sph(.05,8,6),nose,0,-.02,.41,hd);eyes(hd,.07,.3,.11,.035,o.eye);break}
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
  if(o.glow){const l=new T.PointLight(o.glow,1,3);l.position.set(0,.8,0);g.add(l)}return g}

/* ---------------- elementaller, golemler, diğerleri ---------------- */
function elemental(o){const g=G(),u=g.userData;u.fly=1;
  if(o.type==='fire'){M(sph(.38),glow(0xff6a10,1.6),0,1,0,g);u.flames=[];for(let i=0;i<8;i++){const a=i/8*PI*2,c=[0xffd23d,0xff8a1f,0xff3d10][i%3];const f=M(cone(.15,.6+Math.random()*.35,6),glow(c,1.6,{transparent:true,opacity:.92}),Math.sin(a)*.22,1.35,Math.cos(a)*.22,g);f.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35);u.flames.push(f)}
    for(const s of[-1,1])Rz(M(cone(.11,.55,6),glow(0xff8a1f,1.5),.5*s,1.0,0,g),0,0,-s*PI/2.2);eyes(g,1.07,.34,.11,.06,0x2a0a00);const l=new T.PointLight(0xff7a1a,2,6);l.position.set(0,1.1,.4);g.add(l)}
  else if(o.type==='ice'){const c1=o.c||0x8fe0ff,c2=o.c2||0xbff0ff;S(M(oct(.5),glow(c1,.45,{transparent:true,opacity:.92,metalness:.2,roughness:.15}),0,1.1,0,g),1,1.5,.8);
    for(const s of[-1,1]){M(oct(.2),glow(c2,.4),.45*s,1.45,0,g);M(oct(.17),glow(c2,.4),.6*s,.9,.05,g);S(M(oct(.14),glow(c2,.4),.65*s,.6,.08,g),1,1.6,1)}
    eyes(g,1.25,.28,.1,.05,0xeaffff);const sp=G(g);sp.position.y=1.1;u.spin=sp;for(let i=0;i<6;i++){const a=i/6*PI*2;Rz(M(oct(.1),glow(c2,.8),Math.sin(a)*.95,Math.cos(a*2)*.2,Math.cos(a)*.95,sp),a,a,0)}
    const l=new T.PointLight(c1,1.5,5);l.position.set(0,1.2,.5);g.add(l)}
  else{const gm=glow(o.c||0xe8f0ff,.35,{transparent:true,opacity:.8});M(sph(.4),gm,0,1.35,0,g);const b=M(cone(.42,1.1,10),gm,0,.75,0,g);b.rotation.x=PI;
    for(const s of[-1,1])Rz(M(cone(.1,.5,6),gm,.42*s,1.05,.05,g),0,0,-s*PI/2.4);for(const s of[-1,1])S(M(sph(.08,8,6),mat(0x111111),.14*s,1.42,.34,g),1,1.5,.5);S(M(sph(.09,8,6),mat(0x111111),0,1.22,.36,g),1,1.3,.4);
    const l=new T.PointLight(o.c||0xbfd8ff,.8,4);l.position.set(0,1.3,.5);g.add(l)}
  return g}
function golem(o){const g=G(),u=g.userData,rm=mat(o.c||0x8a7f70),gm=o.lava?glow(o.gc||0xff6a10,1.6):mat(o.moss||0x5a7a3a);
  S(M(dod(.62),rm,0,1.25,0,g),1.15,.95,.85);M(dod(.3),rm,0,2.0,.05,g);eyes(g,2.02,.3,.11,.05,o.eye||(o.lava?0xffd23d:0x7fffd4));
  for(const s of[-1,1]){const A=G(g);A.position.set(.75*s,1.55,0);M(dod(.24),rm,0,-.1,0,A);M(dod(.22),rm,0,-.5,.05,A);M(dod(.32),rm,0,-.95,.1,A);if(s>0)u.armR=A;else u.armL=A;
    M(dod(.3),rm,.32*s,.32,0,g)}
  for(let i=0;i<6;i++)M(sph(.09,6,5),gm,Math.sin(i*2.1)*.5,1.0+Math.cos(i*1.3)*.35,.45,g);
  if(o.lava){const l=new T.PointLight(o.gc||0xff6a10,2,6);l.position.set(0,1.3,.8);g.add(l)}return g}
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
  n.position.copy(p);S(M(box(.4,.32,.45),bm,0,0,.1,n),1);M(box(.3,.18,.4),bm,0,-.06,.45,n);M(box(.26,.06,.38),gl,0,-.15,.42,n);
  eyes(n,.1,.32,.13,.05,o.glow||0xffd000);for(const s of[-1,1]){Rz(M(cone(.06,.45,6),mat(o.horn||0xf0e6c8),.14*s,.3,-.15,n),-.9,0,-s*.2);M(cone(.03,.1,4),mat(0xffffff),.1*s,-.17,.6,n).rotation.x=PI}
  wings(g,u,o.wc||o.c,2.2,1.4,1.35,-.1,.25);
  p=V(0,.95,-.85);r=.2;for(let i=0;i<6;i++){const q=V(Math.sin(i*.8)*.2,.85-i*.1,-.85-.35*(i+1));seg(p,q,r,r*.78,bm,g);p=q;r*=.8}M(cone(.12,.3,4),am,p.x,p.y,p.z-.12,g).rotation.x=-PI/2;
  for(let i=0;i<5;i++)M(cone(.07,.25,4),am,0,1.35,.5-i*.3,g);
  const l=new T.PointLight(o.glow||0xff5a00,1.2,5);l.position.set(0,2,1.6);g.add(l);return g}
function reaper(){const g=G(),u=g.userData;u.fly=1;const rb=mat(0x1a1622);M(cone(.6,1.7,10),rb,0,.85,0,g);
  for(let i=0;i<6;i++){const a=i/6*PI*2;M(cone(.1,.35,4),rb,Math.sin(a)*.5,.05,Math.cos(a)*.5,g).rotation.x=PI}
  const hd=G(g);hd.position.set(0,1.85,0);u.head=hd;S(M(sph(.32),rb,0,0,-.04,hd),1,1.15,1);M(sph(.22),mat(0x030303),0,-.02,.1,hd);eyes(hd,0,.28,.08,.045,0x6affff);
  for(const s of[-1,1]){const A=G(g);A.position.set(.38*s,1.5,0);Rz(M(cone(.16,.7,8),rb,0,-.3,0,A),0,0,0);M(sph(.06),mat(0xeee8d5),0,-.68,0,A);if(s>0)u.armR=A;else u.armL=A}
  const W=G(u.armR);W.position.set(0,-.7,.05);W.rotation.x=PI/2;weapon(W,{weapon:'scythe'});const l=new T.PointLight(0x6affff,1,4);l.position.set(0,1.9,.5);g.add(l);return g}
function turtle(){const g=G(),sm=mat(0x3f8a3a),bm=mat(0x9ac46a);S(M(new T.SphereGeometry(.5,12,8,0,PI*2,0,PI/2),sm,0,.18,0,g),1,.8,1.2);M(cyl(.52,.52,.08,12),mat(0x6a5a2a),0,.2,0,g).scale.z=1.2;
  for(let i=0;i<5;i++)M(cyl(.1,.12,.05,6),mat(0x2f6a2a),Math.sin(i*1.25)*.25,.55,Math.cos(i*1.25)*.3,g);M(sph(.18),bm,0,.28,.7,g);eyes(g,.34,.84,.08,.035);
  for(const sx of[-1,1])for(const sz of[-1,1])S(M(sph(.13),bm,.38*sx,.1,.4*sz,g),1,.6,1.2);M(cone(.06,.2,5),bm,0,.15,-.68,g).rotation.x=-PI/2;return g}
function eyeMon(o){const g=G(),u=g.userData;u.fly=1;const bm=mat(o.c||0x2a1a40);M(sph(.6,16,12),bm,0,1.3,0,g);
  M(sph(.42,14,10),mat(0xf4f0ff),0,1.3,.3,g);M(sph(.24,12,9),glow(o.glow||0xc060ff,1.6),0,1.3,.55,g);M(sph(.11,10,8),mat(0x050505),0,1.3,.72,g);
  for(let i=0;i<6;i++){const a=i/6*PI*2;Rz(M(cone(.08,.3,5),bm,Math.sin(a)*.55,1.3+Math.cos(a)*.55,0,g),0,0,-a)}
  u.legs=[];for(let i=0;i<5;i++){const a=i/5*PI*2,L=G(g);L.position.set(Math.sin(a)*.3,.8,Math.cos(a)*.3);let p=V(0,0,0),r=.07;for(let j=0;j<4;j++){const q=V(Math.sin(a)*.12*(j+1),-.22*(j+1),Math.cos(a)*.12*(j+1));seg(p,q,r,r*.75,bm,L);p=q;r*=.75}u.legs.push(L)}
  const l=new T.PointLight(o.glow||0xc060ff,1.5,5);l.position.set(0,1.3,1);g.add(l);return g}
function mimic(){const g=G(),u=g.userData,wd=mat(0x8a5a2a),mt=metal(0xd4af37);M(box(1.2,.6,.8),wd,0,.3,0,g);for(const x of[-.56,.56])M(box(.08,.62,.84),mt,x,.3,0,g);
  M(box(1.12,.05,.72),glow(0x7a0a1a,.7),0,.6,0,g);const lid=G(g);lid.position.set(0,.6,-.4);u.chomp=lid;M(box(1.2,.32,.8),wd,0,.16,.4,lid);M(box(1.24,.06,.84),mt,0,.3,.4,lid);
  for(let i=0;i<7;i++){M(cone(.05,.16,4),mat(0xffffff),-.5+i*.166,.68,.36,g);M(cone(.05,.16,4),mat(0xffffff),-.5+i*.166,-.02,.76,lid).rotation.x=PI}
  eyes(lid,.2,.81,.26,.07,0xffd000);seg(V(0,.62,.05),V(0,.48,.75),.1,.07,mat(0xd04060),g);
  for(let i=0;i<7;i++)M(cyl(.08,.08,.03,10),metal(0xffcf4a),rnd(-.9,.9),.02,rnd(.45,1),g);return g}
function emojiSprite(e){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.font='200px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(e||'❔',128,140);
  const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c)}));sp.scale.set(2,2,1);const g=G();g.add(sp);return g}

/* ---------------- model listeleri ---------------- */
const SKIN=0xf1c27d;
const SK={
  war:{gold:{cloth:0xd4af37,cape:0xfff6e0,plume:0xffffff,shield:0xd4af37,pauldron:0xfff0a0,helmet:0xd4af37,wepC:0xfff0a0},dark:{cloth:0x2a2a35,cape:0x5a0a8a,plume:0x9a3aff,shield:0x2a2a35,pauldron:0x5a5a7a,helmet:0x2a2a35,eye:0xc060ff,wepC:0x9a6aff},ice:{cloth:0xbfe6ff,cape:0x3a8ad8,plume:0x7fe7ff,shield:0x3a8ad8,pauldron:0xffffff,helmet:0xdff4ff,wepC:0xbff6ff}},
  arc:{gold:{cloth:0xc89a2a,hood:0xc89a2a,cape:0xfff0c0,pants:0x7a5a1a},dark:{cloth:0x2a2a35,hood:0x1a1a22,cape:0x5a0a8a,pants:0x1a1a22,eye:0xc060ff},ice:{cloth:0x7ec0ec,hood:0x5aa8d8,cape:0xffffff,pants:0x3a6a9a}},
  mag:{gold:{cloth:0xd4a017,robe:0xd4a017,hatC:0xb8860b,orb:0xfff0a0},dark:{cloth:0x1a1a22,robe:0x1a1a22,hatC:0x0a0a12,orb:0xc060ff,beard:0x3a3a3a,eye:0xc060ff},ice:{cloth:0x8fd0f5,robe:0x8fd0f5,hatC:0x5aa8d8,orb:0xffffff}}};
const HB={
  war:{cloth:0x9aa3b0,metal:1,pants:0x4a4f5c,helmet:0xb8c0cc,plume:0xd62828,weapon:'sword',shield:0xb22222,cape:0xb22222,pauldron:0xd4af37,belt:0xd4af37,sleeve:1,glove:0x6b4a2a},
  arc:{cloth:0x2f7d32,pants:0x5a4a32,hood:0x2f7d32,hoodTip:1,bow:1,cape:0x3e5f2a,glove:0x6b4a2a,sleeve:1},
  mag:{cloth:0x3b2a8a,robe:0x3b2a8a,hat:'wizard',hatC:0x2d1f6e,weapon:'staff',orb:0x7fe7ff,beard:0xeeeeee,sleeve:1}};
const RC=[0xc8d0dc,0x4f9cff,0xb56bff,0xffa52a],RM=[0x9aa3b0,0x3a6ed8,0x7a3ad8,0xd4a017];
const fe=e=>String(e||'').replace(/\uFE0F/g,'');
const WT={'🗡':'sword','🪓':'axe','🔨':'hammer','🔱':'spear','🏹':'bow','🪄':'staff'},AT={'🦺':'plate','🥋':'gi','👘':'robe'};
/* kuşanılan eşyalar karakterin üstünde görünür; kostüm seçiliyse renkler kostümden, şekiller eşyadan gelir */
function applyGear(o,g,col){if(!g)return o;
  const w=g.weapon;if(w){const t=WT[fe(w.e)]||'sword';if(t==='bow'){o.bow=1;delete o.weapon;delete o.shield}else{delete o.bow;o.weapon=t}
    if(col||!o.wepC)o.wepC=RC[w.r];if(t==='staff')o.orb=col||!o.orb?RC[w.r]:o.orb;o.wepGlow=w.r>=2;o.wepLight=w.r>=3||w.up>=10}
  const a=g.armor;if(a){const t=AT[fe(a.e)]||'plate',c=col?RM[a.r]:o.cloth;o.cloth=c;o.sleeve=1;
    if(t==='plate'){o.metal=1;delete o.robe;o.pauldron=col?(a.r>=2?0xd4af37:RM[a.r]):(o.pauldron||c)}else if(t==='gi'){o.metal=0;delete o.robe;delete o.pauldron;o.belt=0x1a1a1a}else{o.metal=0;o.robe=c;delete o.pauldron}}
  const h=g.helmet;if(h){const e=fe(h.e),c=col?RM[h.r]:(o.helmet||o.hood||o.hatC||o.cloth);delete o.helmet;delete o.plume;delete o.hood;delete o.hoodTip;delete o.hat;delete o.crown;
    if(e==='👑')o.crown=col?(h.r>=3?0xffd84a:RM[h.r]):c;else if(e==='🎩'){o.hat='wizard';o.hatC=c}else{o.helmet=c;if(h.r>=2)o.plume=RC[h.r]}}
  if(g.gloves)o.glove=col?RM[g.gloves.r]:(o.glove||o.cloth);if(g.boots)o.boots=col?RM[g.boots.r]:o.boots;if(g.ring)o.ring=RC[g.ring.r];return o}
const HERO={};for(const k in HB)HERO[k]=(sk,g)=>humanoid(applyGear(Object.assign({},HB[k],SK[k][sk]||{}),g,!SK[k][sk]));
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
  'Mimik':()=>mimic(),
  'Rün Muhafızı':()=>golem({c:0x4a5a7a,lava:1,gc:0x5fe3ff,eye:0x5fe3ff}),
  'Kadim Ejder':()=>dragon({c:0xd4a017,c2:0xfff0a0,glow:0xff3df0,wc:0x8a5a10,horn:0x2a1a10})};

/* ---------------- bölgeler ---------------- */
const ZD=[
  {top:0x6fb8ff,bot:0xd8f0d0,fog:0xbfe0c8,gnd:0x4f8a3a,plat:0x8a7a62,hs:0xe8f6ff,hg:0x3d5a2a,sun:0xfff2d0,si:1.15,hi:.75,pt:'leaf'},
  {top:0x07080f,bot:0x232842,fog:0x141826,gnd:0x34343f,plat:0x4a4a58,hs:0x8fa8ff,hg:0x22222a,sun:0x9fb4ff,si:.5,hi:.6,pt:'mote'},
  {top:0x3a95f0,bot:0xffe3a8,fog:0xf2d8a8,gnd:0xd9a95c,plat:0xb8875a,hs:0xfff1d6,hg:0xb07a3a,sun:0xfff0c0,si:1.3,hi:.8,pt:'dust'},
  {top:0x7fc2ff,bot:0xeef8ff,fog:0xdcecff,gnd:0xeef6ff,plat:0xa8c4dc,hs:0xffffff,hg:0x9fbcd8,sun:0xffffff,si:1.0,hi:.85,pt:'snow'},
  {top:0x120302,bot:0x7a2008,fog:0x3a0d06,gnd:0x2a1410,plat:0x3a2a24,hs:0xff9a6a,hg:0x2a0a05,sun:0xffb070,si:.75,hi:.6,pt:'ember'},
  {top:0x05030c,bot:0x2a1650,fog:0x1a0f30,gnd:0x221a2e,plat:0x3a3048,hs:0xb59aff,hg:0x150c22,sun:0xc8b4ff,si:.55,hi:.6,pt:'wisp'},
  {top:0x2a7ae8,bot:0xffe0b0,fog:0xbcd4f4,gnd:0xa8c0e4,plat:0xcfc4a4,hs:0xdfeaff,hg:0x7a90b8,sun:0xfff0c8,si:.95,hi:.6,pt:'gold'},
  {top:0x020108,bot:0x1e0a3a,fog:0x0e061c,gnd:0x140c24,plat:0x2a1a44,hs:0x9a7aff,hg:0x0a0614,sun:0xb090ff,si:.5,hi:.6,pt:'star'}];
function pine(p,x,z,s,c,snow){const g=G(p);g.position.set(x,0,z);M(cyl(.12,.16,.8,6),mat(0x5a3a1a),0,.4,0,g);for(let i=0;i<3;i++){M(cone(.9-i*.22,1.1,7),mat(c||0x2f6a3a),0,1.0+i*.6,0,g);if(snow)M(cone(.45-i*.11,.4,7),mat(0xffffff),0,1.45+i*.6,0,g)}S(g,s);return g}
function roundTree(p,x,z,s){const g=G(p);g.position.set(x,0,z);M(cyl(.14,.2,1.2,6),mat(0x6a4a2a),0,.6,0,g);M(ico(.85,1),mat(0x4a9a3a),0,1.7,0,g);M(ico(.55,1),mat(0x6ab84a),.35,2.1,.2,g);S(g,s);return g}
function rock(p,x,z,s,c){const r=M(dod(.6),mat(c||0x7a7a7a),x,.25*s,z,p);S(r,s,s*.7,s);r.rotation.y=Math.random()*3;r.receiveShadow=true;return r}
function mushroom(p,x,z,s){const g=G(p);g.position.set(x,0,z);M(cyl(.08,.12,.35,6),mat(0xf5ecd8),0,.17,0,g);M(new T.SphereGeometry(.3,10,6,0,PI*2,0,PI/2),mat(0xd62828),0,.32,0,g);for(let i=0;i<4;i++)M(sph(.04,5,4),mat(0xffffff),Math.sin(i*1.6)*.17,.5,Math.cos(i*1.6)*.17,g);S(g,s);return g}
function cactus(p,x,z,s){const g=G(p);g.position.set(x,0,z);const c=mat(0x4a8a3a);M(cyl(.18,.2,1.8,8),c,0,.9,0,g);M(cyl(.12,.12,.6,8),c,.35,1.0,0,g);M(cyl(.12,.12,.5,8),c,.35,1.3,0,g).position.set(.38,1.25,0);M(cyl(.1,.1,.4,8),c,-.32,1.3,0,g);M(cyl(.1,.1,.35,8),c,-.32,1.0,0,g).rotation.z=PI/2;S(g,s);return g}
function crystal(p,x,z,s,c){const g=G(p);g.position.set(x,0,z);for(let i=0;i<4;i++){const k=S(M(oct(.25),glow(c,.9),Math.sin(i*1.7)*.2,.4,Math.cos(i*1.7)*.2,g),.6,1.8+Math.random(),.6);k.rotation.set(rnd(-.4,.4),0,rnd(-.4,.4))}S(g,s);return g}
function buildEnv(z){const d=ZD[z],e=G();
  /* gökyüzü */
  const sg=new T.SphereGeometry(60,24,12),cs=[],ct=new T.Color(d.top),cb=new T.Color(d.bot);const pos=sg.attributes.position;
  for(let i=0;i<pos.count;i++){const k=Math.max(0,Math.min(1,pos.getY(i)/40+.15));const c=cb.clone().lerp(ct,k);cs.push(c.r,c.g,c.b)}
  sg.setAttribute('color',new T.Float32BufferAttribute(cs,3));e.add(new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false})));
  /* zemin + arena platformu */
  const gg=new T.CircleGeometry(40,40);gg.rotateX(-PI/2);const gc=[],g0=new T.Color(d.gnd);for(let i=0;i<gg.attributes.position.count;i++){const c=g0.clone().multiplyScalar(rnd(.88,1.08));gc.push(c.r,c.g,c.b)}
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
      const moon=new T.Mesh(sph(2.2,16,12),new T.MeshBasicMaterial({color:0xf4f0ff,fog:false}));moon.position.set(9,14,-40);e.add(moon);
      [[-3.8,-2.5],[3.9,-3]].forEach(([x,q])=>{M(cyl(.06,.06,1.6,6),mat(0x2a2a2a),x,.8,q,e);M(sph(.13),glow(0xc060ff,2),x,1.65,q,e);const l=new T.PointLight(0xc060ff,1.5,5);l.position.set(x,1.7,q);e.add(l)});break;
    case 6:SP.forEach(([x,q],i)=>{if(i%3===0){const c=G(e);c.position.set(x,0,q);M(cyl(.35,.4,3.2,10),mat(0xf4f0e4),0,1.6,0,c);M(box(1,.2,1),mat(0xf4f0e4),0,.1,0,c);M(box(.95,.2,.95),metal(0xd4af37),0,3.3,0,c);S(c,sc())}
        else if(i%3===1){const c=G(e);c.position.set(x*1.3,rnd(2.5,6),q-5);M(cyl(1.6,1.1,.45,9),mat(0x6ac86a),0,0,0,c);M(cone(1.1,1.6,9),mat(0x8a7a62),0,-1.0,0,c).rotation.x=PI;pine(c,0,0,.6);S(c,rnd(.9,1.6))}
        else{const c=G(e);c.position.set(x,rnd(.2,.6),q);for(let j=0;j<4;j++)S(M(sph(.7,10,7),mat(0xffffff),j*.7-1,rnd(0,.3),rnd(-.3,.3),c),rnd(.8,1.3),.7,1);S(c,sc())}});
      for(let i=0;i<7;i++){const c=G(e);c.position.set(rnd(-16,16),rnd(6,11),rnd(-30,-16));for(let j=0;j<4;j++)S(M(sph(1.2,10,7),new T.MeshBasicMaterial({color:0xffffff,fog:false}),j*1.2-2,rnd(0,.5),0,c),rnd(.8,1.4),.6,1)}
      {const sun=new T.Mesh(sph(3,16,12),new T.MeshBasicMaterial({color:0xfff6c8,fog:false}));sun.position.set(-10,16,-45);e.add(sun)}break;
    case 7:SP.forEach(([x,q],i)=>{if(i%2)crystal(e,x,q,rnd(1.2,2.2),i%4===1?0xc060ff:0xff3df0);else{const r=M(dod(rnd(.5,1.1)),mat(0x2a1a44),x*1.2,rnd(2,6),q-3,e);r.rotation.set(rnd(0,3),rnd(0,3),0)}});
      [[-4,-3,0xc060ff],[4.2,-3.5,0xff3df0],[0,-9,0x7fe7ff]].forEach(([x,q,c])=>{const l=new T.PointLight(c,1.6,7);l.position.set(x,1.5,q);e.add(l)});
      {const rg=new T.Mesh(new T.TorusGeometry(7,.25,8,48),new T.MeshBasicMaterial({color:0xc060ff,fog:false}));rg.position.set(0,9,-36);rg.rotation.x=.5;e.add(rg);
       const hole=new T.Mesh(sph(5.5,20,14),new T.MeshBasicMaterial({color:0x000000,fog:false}));hole.position.set(0,9,-37);e.add(hole);
       const rg2=new T.Mesh(new T.TorusGeometry(9.5,.1,6,48),new T.MeshBasicMaterial({color:0xff3df0,fog:false}));rg2.position.set(0,9,-36);rg2.rotation.x=.8;e.add(rg2)}break}
  return e}

/* ---------------- parçacıklar ---------------- */
const PT={leaf:{c:0x7ad04a,s:.16,n:70,vy:-.5,sway:1,add:0},snow:{c:0xffffff,s:.13,n:140,vy:-.8,sway:.6,add:0},ember:{c:0xff8a2a,s:.12,n:110,vy:.9,sway:.4,add:1},
  dust:{c:0xfff0c8,s:.09,n:90,vx:1.4,vy:0,sway:.2,add:0},gold:{c:0xffe9a0,s:.1,n:90,vy:.3,sway:.5,add:1},star:{c:0xffffff,s:.09,n:160,vy:.05,sway:.15,add:1},mote:{c:0x8fe8ff,s:.1,n:80,vy:.25,sway:.5,add:1},wisp:{c:0xc08bff,s:.12,n:80,vy:.35,sway:.6,add:1}};
let dotTex=null;
function buildParts(z){const k=PT[ZD[z].pt],geo=new T.BufferGeometry(),p=new Float32Array(k.n*3);
  for(let i=0;i<k.n;i++){p[i*3]=rnd(-10,10);p[i*3+1]=rnd(0,9);p[i*3+2]=rnd(-12,4)}
  geo.setAttribute('position',new T.BufferAttribute(p,3));dotTex=dotTex||softDot();dotTex.userData={};
  const m=new T.PointsMaterial({color:k.c,size:k.s,map:dotTex,transparent:true,opacity:.9,depthWrite:false,blending:k.add?T.AdditiveBlending:T.NormalBlending});m.userData.keepMap=1;
  const o=new T.Points(geo,m);o.userData.k=k;o.frustumCulled=false;return o}

/* ---------------- motor ---------------- */
const API={},HP=V(-1.15,0,1.3),MP=V(.55,0,-.9),PP=V(-2.05,0,.2),LOOK=V(-.3,1.35,-.4);
let ren,scene,cam,clock,host,W=1,H=1,act=true,t=0,shk=0,camZ=7.4,ts=1,tsT=0,stopT=0,punch=0,focus=0;
let env=null,parts=null,zoneI=-1,heroId=null,heroK=null,heroRoot=null,heroM=null,petK=null,petRoot=null,petM=null,monRoot=null,monM=null,eliteFx=null;
const anims=[],buff={};const lights={};
function webglOk(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch(e){return false}}
function anim(d,f,end){anims.push({t:0,d,f,end})}
function face(o,tg){o.rotation.y=Math.atan2(tg.x-o.position.x,tg.z-o.position.z)}
function fit(m,h,w){m.updateMatrixWorld(true);let b=new T.Box3().setFromObject(m),s=b.getSize(V(0,0,0));const k=Math.min(h/s.y,w/Math.max(s.x,s.z));m.scale.setScalar(k);
  m.updateMatrixWorld(true);b=new T.Box3().setFromObject(m);m.position.y=-b.min.y;const u=m.userData;u.s=k;u.h=b.max.y-b.min.y;u.y0=m.position.y;return m}
function prep(o){o.traverse(n=>{if(n.isMesh){n.material=n.material.clone();const m=n.material;if(m.emissive){m.userData.e0=m.emissive.clone();m.userData.i0=m.emissiveIntensity}}})}
function flash(o,col,d){if(!o)return;const c=new T.Color(col),ms=[];o.traverse(n=>{if(n.isMesh&&n.material.emissive&&n.material.userData.e0)ms.push(n.material)});
  anim(d||.17,k=>{for(const m of ms){m.emissive.copy(c).lerp(m.userData.e0,k);m.emissiveIntensity=1.3*(1-k)+m.userData.i0*k}})}
function remove(o){if(!o)return;scene.remove(o);dispose(o)}
function resize(){W=host.clientWidth||1;H=host.clientHeight||1;ren.setSize(W,H,false);cam.aspect=W/H;camZ=6.3*Math.max(1,.8/cam.aspect);cam.updateProjectionMatrix()}
const KEEP=o=>{o.userData.keep=1;return o};
const sparkGeo=KEEP(new T.BoxGeometry(.08,.08,.08)),coinGeo=KEEP(new T.CylinderGeometry(.13,.13,.035,12)),sparkMats={};
const coinMat=KEEP(new T.MeshStandardMaterial({color:0xffcf4a,metalness:.8,roughness:.25,emissive:0x6a4a00,emissiveIntensity:.5}));
function sparkMat(c){if(!sparkMats[c])sparkMats[c]=KEEP(new T.MeshBasicMaterial({color:c,transparent:true}));return sparkMats[c]}
function burst(at,c,n,sp){for(let i=0;i<n;i++){const s=new T.Mesh(sparkGeo,sparkMat(c).clone());s.material.userData={};s.position.copy(at);scene.add(s);const v=V(rnd(-1,1),rnd(-.2,1.2),rnd(-1,1)).normalize().multiplyScalar(rnd(2,4.5)*(sp||1));
  anim(rnd(.35,.6),(k,dt)=>{s.position.addScaledVector(v,dt);v.y-=9*dt;s.rotation.x+=dt*8;s.material.opacity=1-k;s.scale.setScalar(1-k*.6)},()=>{scene.remove(s);s.material.dispose()})}}
function ring(at,c,r0,r1,d,y,thick){const m=new T.Mesh(new T.TorusGeometry(1,thick||.06,6,40),new T.MeshBasicMaterial({color:c,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.rotation.x=PI/2;m.position.set(at.x,y==null?.08:y,at.z);scene.add(m);
  anim(d,k=>{const r=r0+(r1-r0)*k;m.scale.set(r,r,1);m.material.opacity=1-k},()=>remove(m));return m}
/* sabit ışık havuzu: sahnedeki ışık sayısı hiç değişmez → telefonda takılma olmaz */
const LP=[];let lpI=0;
function light(at,c,i,d,dist){if(!LP.length)return;const l=LP[lpI++%LP.length];l.color.set(c);l.distance=dist||6;l.position.copy(at);l.intensity=i;const tok=(l.userData.tok||0)+1;l.userData.tok=tok;
  anim(d,k=>{if(l.userData.tok===tok)l.intensity=i*(1-k)},()=>{if(l.userData.tok===tok)l.intensity=0})}
function monC(){if(!monRoot||!monM)return V(MP.x,1,MP.z);const u=monM.userData;return V(monRoot.position.x,monM.position.y+u.h*.5,monRoot.position.z)}
function heroC(){return V(heroRoot?heroRoot.position.x:HP.x,.95,heroRoot?heroRoot.position.z:HP.z)}
function scr(v){const p=v.clone().project(cam);return {x:(p.x+1)/2*W,y:(1-p.y)/2*H}}

const KEEPG=o=>{o.userData.keep=1;return o};
const arcGeo=KEEPG(new T.TorusGeometry(1,.07,4,28,PI*.95)),shardGeo=KEEPG(new T.TetrahedronGeometry(.16,0)),orbGeo=KEEPG(new T.IcosahedronGeometry(.09,0));
/* kılıç izi: canavarın önünde parlayan yay */
function slashArc(at,col,big,ang){const m=new T.Mesh(arcGeo,new T.MeshBasicMaterial({color:col,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  m.position.copy(at);m.position.z+=.45;m.lookAt(cam.position);m.rotateZ(ang==null?rnd(-.9,.6):ang);const s0=big?1.1:.8;m.scale.setScalar(s0);scene.add(m);
  anim(big?.3:.22,k=>{m.rotateZ(.12);m.scale.setScalar(s0*(.7+k*.6));m.scale.z=1;m.material.opacity=1-k*k},()=>{scene.remove(m);m.material.dispose()})}
/* parçalanma: canavar renginde yerde seken kırıntılar */
function monColors(m){const cs=[];if(m)m.traverse(n=>{if(n.isMesh&&n.material.color&&cs.length<6)cs.push(n.material.color.getHex())});return cs.length?cs:[0xffffff]}
const dMats={};function dMat(c){if(!dMats[c])dMats[c]=KEEPG(new T.MeshLambertMaterial({color:c,flatShading:true}));return dMats[c]}
function debris(at,cols,n,pow,life){n=Math.min(n,18);for(let i=0;i<n;i++){const d=new T.Mesh(shardGeo,dMat(pick(cols)));d.position.copy(at);
  d.position.x+=rnd(-.3,.3);d.position.y+=rnd(-.4,.4);const sc=rnd(.6,1.6)*(pow>1.5?1.4:1);d.scale.setScalar(sc);scene.add(d);const v=V(rnd(-1,1),rnd(.4,1.4),rnd(-.9,.5)).normalize().multiplyScalar(rnd(2.5,5.5)*pow),sp=V(rnd(-12,12),rnd(-12,12),rnd(-12,12));
  anim(life||rnd(.9,1.4),(k,dt)=>{d.position.addScaledVector(v,dt);v.y-=13*dt;if(d.position.y<.08){d.position.y=.08;v.y*=-.35;v.x*=.6;v.z*=.6;sp.multiplyScalar(.6)}d.rotation.x+=sp.x*dt;d.rotation.y+=sp.y*dt;if(k>.7)d.scale.setScalar(sc*(1-k)/.3)},()=>scene.remove(d))}}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
/* XP küreleri: canavardan kahramana süzülür */
function xpOrbs(at,n){const mt=new T.MeshBasicMaterial({color:0x7fd8ff,transparent:true,blending:T.AdditiveBlending});for(let i=0;i<n;i++){const o=new T.Mesh(orbGeo,mt);o.position.copy(at);scene.add(o);
  const mid=V(at.x+rnd(-1.5,1.5),at.y+rnd(1,2.5),at.z+rnd(-.5,1.5)),d0=rnd(0,.25);
  anim(.75+d0,k=>{const q=Math.max(0,(k*(.75+d0)-d0)/.75),e=q*q,h=heroC();const a=at.clone().lerp(mid,q),b=mid.clone().lerp(h,q);o.position.copy(a.lerp(b,e));o.scale.setScalar(1+Math.sin(q*PI)*.6)},()=>scene.remove(o))}
  setTimeout(()=>{if(heroM){flash(heroM,0x7fd8ff,.25);burst(heroC(),0x7fd8ff,6,.5)}},950);setTimeout(()=>mt.dispose(),1300)}
function idle(dt){
  if(heroM){const u=heroM.userData;if(u.orb)u.orb.rotation.y+=dt*2.2;heroM.scale.y=u.s*(1+Math.sin(t*2.4)*.015);if(!u.busy){if(u.armR){u.armR.rotation.x=(u.wep?-1.15:0)+Math.sin(t*2)*.08;u.armR.rotation.z=u.wep?.25:0}if(u.armL)u.armL.rotation.x=-Math.sin(t*2)*.08}}
  if(petM){const u=petM.userData;petM.position.y=u.y0+(u.fly?.7+Math.sin(t*3)*.12:Math.abs(Math.sin(t*3))*.05);if(u.wings)u.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*10)*.6)}
  if(monM&&!monM.userData.dying){const u=monM.userData;
    u.kb=(u.kb||0)*Math.pow(.0008,dt);u.sq=(u.sq||0)*Math.pow(.0005,dt);u.tl=(u.tl||0)*Math.pow(.002,dt);
    monM.position.y=u.y0+(u.fly?.55+Math.sin(t*2.2)*.15:0);monM.position.z=-u.kb;monM.rotation.x=(u.rx||0)-u.tl;
    monM.scale.set(u.s*(1+u.sq*.6),u.s*(1+Math.sin(t*2)*.025)*(1-u.sq),u.s*(1+u.sq*.6));
    if(u.wings)u.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*(u.fast?14:u.fly?7:2.2))*.5);
    if(u.spin)u.spin.rotation.y+=dt*1.4;if(u.flames)u.flames.forEach((f,i)=>f.scale.y=1+Math.sin(t*11+i*1.7)*.28);
    if(u.neck)u.neck.rotation.z=Math.sin(t*1.6)*.15;if(u.chomp)u.chomp.rotation.x=-.3-Math.abs(Math.sin(t*3.2))*.5;if(u.enr)monM.position.x=(Math.random()-.5)*.04;if(u.tail)u.tail.rotation.x=Math.sin(t*2.5)*.08;
    if(u.legs)u.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*6+i)*.08);if(u.head&&!u.neck)u.head.rotation.y=Math.sin(t*1.1)*.18}
  if(eliteFx){eliteFx.rotation.z+=dt;const s=1+Math.sin(t*4)*.06;eliteFx.scale.set(s,s,1)}
  if(buff.shield&&buff.shield.visible){buff.shield.rotation.y+=dt;const s=1+Math.sin(t*5)*.03;buff.shield.scale.setScalar(s)}
  if(buff.buff&&buff.buff.visible)buff.buff.rotation.z+=dt*2;if(buff.crit&&buff.crit.visible)buff.crit.rotation.z-=dt*2.5}
function tickParts(dt){if(!parts)return;const k=parts.userData.k,p=parts.geometry.attributes.position,a=p.array;
  for(let i=0;i<a.length;i+=3){a[i]+=((k.vx||0)+Math.sin(t*1.5+i)*k.sway*.4)*dt;a[i+1]+=k.vy*dt;a[i+2]+=Math.cos(t+i)*k.sway*.1*dt;
    if(a[i+1]<0)a[i+1]=9;if(a[i+1]>9)a[i+1]=0;if(a[i]>10)a[i]=-10}p.needsUpdate=true}
function loop(){const rdt=Math.min(.05,clock.getDelta());if(SC.on)renderSC(rdt);if(!act)return;
  if(tsT>0){tsT-=rdt;if(tsT<=0)ts=1}let dt=rdt*ts;if(stopT>0){stopT-=rdt;dt=rdt*.04}t+=dt;
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t+=dt;const k=Math.min(1,a.t/a.d);try{a.f(k,dt)}catch(e){}if(k>=1){anims.splice(i,1);try{a.end&&a.end()}catch(e){}}}
  idle(dt);tickParts(dt);shk=Math.max(0,shk-rdt*2.4);punch=Math.max(0,punch-rdt*5);focus=Math.max(0,focus-rdt*1.6);
  const fz=Math.min(1,focus),cx=.35+Math.sin(t*.35)*.15+(Math.random()-.5)*shk*.4,cy=2.1+Math.sin(t*.27)*.06+(Math.random()-.5)*shk*.4;
  cam.position.set(cx+(MP.x-cx)*fz*.3,cy-fz*.3,camZ-fz*1.4);const nf=46-punch*7;if(Math.abs(cam.fov-nf)>.01){cam.fov=nf;cam.updateProjectionMatrix()}
  cam.lookAt(LOOK.x+(MP.x-LOOK.x)*fz*.6,LOOK.y,LOOK.z+(MP.z-LOOK.z)*fz*.5);
  ren.render(scene,cam)}

/* ---------------- dış arayüz ---------------- */
API.init=function(stage){if(!webglOk())return false;
  try{ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){return false}
  ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  host=stage;const c=ren.domElement;c.id='c3d';host.insertBefore(c,host.firstChild);
  scene=new T.Scene();cam=new T.PerspectiveCamera(46,1,.1,150);
  lights.hemi=new T.HemisphereLight(0xffffff,0x444444,.8);scene.add(lights.hemi);
  const d=new T.DirectionalLight(0xffffff,1);d.position.set(4,10,6);d.castShadow=true;d.shadow.mapSize.set(1024,1024);const sc=d.shadow.camera;sc.left=-7;sc.right=7;sc.top=7;sc.bottom=-7;sc.near=1;sc.far=35;d.shadow.bias=-.002;
  scene.add(d);scene.add(d.target);lights.sun=d;for(let k=0;k<4;k++){const pl=new T.PointLight(0xffffff,0,6);scene.add(pl);LP.push(pl)}
  clock=new T.Clock();resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(host);else window.addEventListener('resize',resize);
  ren.setAnimationLoop(loop);return true};
API.setActive=on=>{if(on&&!act)clock.getDelta();act=!!on};
API.setZone=function(z){if(z===zoneI)return;zoneI=z;remove(env);if(parts){scene.remove(parts);parts.geometry.dispose();parts.material.dispose()}
  const d=ZD[z];env=buildEnv(z);scene.add(env);parts=buildParts(z);scene.add(parts);scene.fog=new T.Fog(d.fog,12,34);
  lights.hemi.color.set(d.hs);lights.hemi.groundColor.set(d.hg);lights.hemi.intensity=d.hi;lights.sun.color.set(d.sun);lights.sun.intensity=d.si};
API.setHero=function(k,sk,gear){const id=k+'/'+(sk||'def')+'/'+(gear?JSON.stringify(gear):'');if(id===heroId&&heroRoot)return;heroId=id;heroK=k;remove(heroRoot);heroRoot=G(scene);heroRoot.position.copy(HP);face(heroRoot,MP);
  heroM=(HERO[k]||HERO.war)(sk||"def",gear);prep(heroM);heroRoot.add(heroM);fit(heroM,1.75,1.6);for(const b in buff){buff[b].parent&&buff[b].parent.remove(buff[b]);delete buff[b]}};
API.setPet=function(k,st){st=st||0;const id=k?k+'/'+st:null;if(id===petK)return;petK=id;remove(petRoot);petRoot=petM=null;if(!k||!PETM[k])return;petRoot=G(scene);petRoot.position.copy(PP);face(petRoot,MP);
  petM=PETM[k]();prep(petM);petRoot.add(petM);fit(petM,(petM.userData.fly?.75:.95)*(1+.22*st),1.3*(1+.22*st));
  if(st>=1){const a=new T.Mesh(new T.TorusGeometry(.55+.1*st,.035,6,32),new T.MeshBasicMaterial({color:st>=2?0xffd56a:0x9fe8ff,transparent:true,opacity:.85,blending:T.AdditiveBlending}));a.rotation.x=PI/2;a.position.y=.06;petRoot.add(a);
    if(st>=2){const l=new T.PointLight(0xffd56a,1.2,3.5);l.position.y=.9;petRoot.add(l)}}
  anim(.4,q=>{const s=q<.7?q/.7*1.15:1.15-(q-.7)/.3*.15;petRoot.scale.setScalar(s)})};
API.spawn=function(name,emoji,o){o=o||{};remove(monRoot);eliteFx=null;
  const f=o.hero?()=>(HERO[o.hero]||HERO.war)(o.skin||'def',o.gear):MON[name];monM=f?f():emojiSprite(emoji);prep(monM);monRoot=G(scene);monRoot.position.copy(MP);monRoot.add(monM);
  const big=o.boss||o.arena;fit(monM,(o.arena?3.4:big?3.0:o.hero?1.85:2.1)*(o.scale||1),(big?4.2:2.8)*(o.scale||1));face(monRoot,HP);
  if(o.elite||big){const c=o.elite?(o.aura||0xc45bff):o.arena?0xffcf4a:0xff3040;eliteFx=new T.Mesh(new T.TorusGeometry(big?2:1.4,.06,6,48),new T.MeshBasicMaterial({color:c,transparent:true,opacity:.85,blending:T.AdditiveBlending}));
    eliteFx.rotation.x=PI/2;eliteFx.position.y=.1;monRoot.add(eliteFx);const l=new T.PointLight(c,o.elite?1.6:2.2,6);l.position.set(0,1.5,.8);monRoot.add(l)}
  const r=monRoot;r.scale.setScalar(.01);r.position.y=big?3:1.5;
  anim(big?.6:.35,k=>{const e=k<.7?k/.7*1.12:1.12-(k-.7)/.3*.12;r.scale.setScalar(Math.max(.01,e));r.position.y=(big?3:1.5)*(1-k)*(1-k)},()=>{r.position.y=0;r.scale.setScalar(1);if(big){ring(MP,0xff6040,.5,4,.6);shk=.8}});
  if(big)light(V(MP.x,2,MP.z+1),o.arena?0xffcf4a:0xff2020,5,1.2,10)};
API.hit=function(crit,src,pow){if(!monM||monM.userData.dying)return;pow=pow||1;const pet=src==='pet',u=monM.userData,c=monC();
  flash(monM,crit?0xffe14a:pet?0x9fd8ff:0xffffff,crit?.22:.14);
  u.kb=Math.min(.9,(u.kb||0)+(pet?.08:crit?.42:.22)*pow);u.sq=Math.min(.35,(u.sq||0)+(pet?.04:crit?.22:.12)*pow);u.tl=Math.min(.6,(u.tl||0)+(crit?.35:.18)*pow);
  if(!pet&&heroK==='war')slashArc(c,crit?0xffd23d:0xffffff,crit||pow>1.2,pow>1.2?-1.4:null);
  burst(c,crit?0xffd23d:pet?0x9fd8ff:0xffffff,crit?16:pet?4:8,crit?1.3:1);
  if(crit||pow>1.2)debris(c,monColors(monM),crit?5:3,1);
  if(crit){shk=Math.max(shk,.45);punch=Math.max(punch,.8);stopT=Math.max(stopT,.07);light(c,0xffd23d,2.5,.22)}else if(!pet){punch=Math.max(punch,.25);stopT=Math.max(stopT,pow>1.2?.05:.025)}
  if(pow>1.2){ring(V(c.x,0,c.z),0xffcf4a,.3,2.4,.35,.06,.06);shk=Math.max(shk,.5)}};
function shot(kind,big){const a=V(HP.x+.25,1.25,HP.z-.1),b=monC();b.x+=rnd(-.25,.25);b.y+=rnd(-.3,.3);let m;
  if(kind==='arrow'){m=G();M(cyl(.035,.035,1.05,5),mat(0x8a5a2a),0,0,0,m).rotation.x=PI/2;M(cone(.075,.22,4),glow(big?0xffd23d:0xffffff,.8),0,0,.6,m).rotation.x=PI/2;M(box(.2,.025,.2),mat(big?0xffd23d:0xff4040),0,0,-.48,m)}
  else{m=new T.Mesh(ico(big?.2:.13,1),glow(big?0xffb0ff:0x9fe8ff,2.4))}
  if(kind==='arrow')m.scale.setScalar(1.35);m.position.copy(a);m.lookAt(b);scene.add(m);const dur=kind==='arrow'?.16:.18;let tt=0;
  anim(dur,(k,dt)=>{m.position.lerpVectors(a,b,k);tt+=dt;if(kind==='arrow'&&tt>.015){tt=0;burst(m.position,big?0xffd23d:0xffffff,1,.15)}if(kind!=='arrow'){m.position.y+=Math.sin(k*PI)*.25;tt+=dt;if(tt>.02){tt=0;burst(m.position,big?0xffb0ff:0x9fe8ff,1,.25)}}},()=>{remove(m);if(kind!=='arrow'){ring(V(b.x,b.y,b.z),big?0xff9af8:0x7fe7ff,.2,big?1.6:1,.25,null,.05)}})}
API.heroAttack=function(step,crit){if(!heroM)return;step=step||0;const u=heroM.userData,r=heroRoot,dir=V(MP.x-HP.x,0,MP.z-HP.z).normalize(),fin=step===2;u.busy=(u.busy||0)+1;
  if(heroK==='arc'){anim(.18,k=>{const s=Math.sin(k*PI);r.position.set(HP.x-dir.x*.12*s,0,HP.z-dir.z*.12*s);if(u.armL)u.armL.rotation.x=-1.5*Math.min(1,k*3);if(u.armR)u.armR.rotation.x=-1.3+.6*s},()=>{r.position.copy(HP);u.busy--});
    shot('arrow',fin);if(fin){setTimeout(()=>shot('arrow',true),50);setTimeout(()=>shot('arrow',true),100)}return}
  if(heroK==='mag'){anim(.22,k=>{const s=Math.sin(k*PI);r.position.set(HP.x+dir.x*.15*s,0,HP.z+dir.z*.15*s);if(u.armR)u.armR.rotation.x=-1.15-.9*s},()=>{r.position.copy(HP);u.busy--});shot('orb',fin);return}
  const D=fin?.9:.6;anim(fin?.32:.2,k=>{const s=Math.sin(k*PI);r.position.set(HP.x+dir.x*D*s,fin?Math.sin(k*PI)*.45:0,HP.z+dir.z*D*s);r.rotation.z=(step===1?.25:step===0?-.2:0)*s;
    if(u.armR)u.armR.rotation.x=fin?-1.15-2.2*Math.sin(Math.min(1,k*1.6)*PI*.6)+1.6*k*k:(u.wep?-1.15-1.5*s+2.2*s*s:-2.3*s);if(u.armR)u.armR.rotation.z=(step===1?-.9:step===0?.7:.1)*s},
    ()=>{r.position.copy(HP);r.rotation.z=0;u.busy--;if(fin){const c=monC();ring(V(c.x,0,c.z),0xffffff,.2,2,.3,.05,.05);debris(V(c.x,.1,c.z+.4),[0x8a7a62,0x6a5a42],4,.8,.8)}})};
API.die=function(big){if(!monM)return;const m=monM,r=monRoot,c=monC();m.userData.dying=1;monM=null;monRoot=null;eliteFx=null;
  burst(c,0xffffff,big?26:12,big?1.4:1);ring(V(c.x,0,c.z),big?0xff5263:0xffffff,.3,big?4:2.2,.5);
  for(let i=0;i<(big?14:6);i++){const s=new T.Mesh(coinGeo,coinMat);s.position.copy(c);s.castShadow=true;scene.add(s);const v=V(rnd(-1.5,1.5),rnd(3,5.5),rnd(-.5,1.8));
    anim(rnd(.8,1.1),(k,dt)=>{s.position.addScaledVector(v,dt);v.y-=11*dt;if(s.position.y<.05){s.position.y=.05;v.y*=-.4;v.x*=.7;v.z*=.7}s.rotation.x+=dt*10;s.rotation.y+=dt*6;s.scale.setScalar(k>.8?(1-k)*5:1)},()=>scene.remove(s))}
  xpOrbs(c,big?14:6);const cols=monColors(m);
  if(big){ts=.3;tsT=.75;focus=.7;punch=1;stopT=.12;flash(m,0xffffff,.6);anim(.55,k=>{m.rotation.z=k*.5;m.position.y=m.userData.y0-k*.2;m.scale.setScalar(m.userData.s*(1+k*.15))},()=>{debris(c,cols,22,1.35,1.4);light(c,0xffffff,8,.4,12);remove(r)})}
  else{stopT=Math.max(stopT,.06);punch=Math.max(punch,.6);debris(c,cols,12,1.15);flash(m,0xffffff,.12);anim(.14,k=>{m.scale.setScalar(m.userData.s*(1+k*.25))},()=>remove(r))}};
API.monAttack=function(miss){if(!monRoot||!monM)return;const r=monRoot,dir=V(HP.x-MP.x,0,HP.z-MP.z).normalize(),m=monM;
  anim(.32,k=>{const s=Math.sin(k*PI);r.position.set(MP.x+dir.x*1.1*s,0,MP.z+dir.z*1.1*s);m.userData.rx=.25*s},()=>{if(r.parent){r.position.copy(MP)}m.userData.rx=0});
  setTimeout(()=>{if(!heroM)return;if(miss){const hr=heroRoot;anim(.3,k=>{hr.position.x=HP.x-Math.sin(k*PI)*.7},()=>hr.position.copy(HP))}
    else{flash(heroM,0xff2020,.25);burst(heroC(),0xff4040,6,.7);const hm=heroM;anim(.2,k=>{hm.rotation.x=-.25*Math.sin(k*PI)},()=>{hm.rotation.x=0})}},160)};
API.petAttack=function(){if(!petRoot)return;const r=petRoot,to=V(MP.x-PP.x,0,MP.z-PP.z);
  anim(.36,k=>{const s=Math.sin(k*PI);r.position.set(PP.x+to.x*.45*s,Math.sin(k*PI)*.5,PP.z+to.z*.45*s)},()=>r.position.copy(PP))};
function proj(mesh,dur,cb,lc,trail){const a=V(HP.x+.3,1.3,HP.z),b=monC();mesh.position.copy(a);scene.add(mesh);
  const dir=b.clone().sub(a);mesh.lookAt(b);let tt=0;
  anim(dur,(k,dt)=>{mesh.position.copy(a).addScaledVector(dir,k);mesh.position.y+=Math.sin(k*PI)*.6;mesh.rotation.z+=dt*12;tt+=dt;if(trail&&tt>.03){tt=0;burst(mesh.position,trail,1,.3)}},()=>{remove(mesh);ring(V(b.x,0,b.z),lc||0xffffff,.3,2.6,.45);burst(b,trail||0xffffff,16,1.2);if(lc)light(b,lc,4,.35);shk=Math.max(shk,.5);cb&&cb()})}
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
API.heal=function(){const c=heroC();for(let i=0;i<3;i++)setTimeout(()=>{const r=ring(V(c.x,0,c.z),0x5df08f,.9,.9,.7,.1,.05);anim(.7,k=>{r.position.y=.1+k*2})},i*120);burst(c,0x5df08f,12,.7)};
API.levelUp=function(){const c=heroC();for(let i=0;i<4;i++)setTimeout(()=>{const r=ring(V(c.x,0,c.z),0xffd56a,1,1.3,.8,.1,.07);anim(.8,k=>{r.position.y=.1+k*2.4})},i*110);
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
  if(heroM&&heroM.userData.ghost!==!!f.dodge){heroM.userData.ghost=!!f.dodge;heroM.traverse(n=>{if(n.isMesh){n.material.transparent=!!f.dodge;n.material.opacity=f.dodge?.4:1}})}};
API.shake=b=>{shk=Math.max(shk,b?.8:.3)};
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
API.block=function(){const c=heroC();ring(V(c.x,0,c.z),0x5fe3ff,.3,2.8,.45,.1,.12);burst(c,0x9ff0ff,20,1.3);light(c,0x5fe3ff,5,.4);
  const b=new T.Mesh(new T.IcosahedronGeometry(1.2,1),new T.MeshBasicMaterial({color:0x7fe7ff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,wireframe:true}));b.position.copy(c);scene.add(b);
  anim(.5,k=>{b.scale.setScalar(1+k*.4);b.material.opacity=.6*(1-k)},()=>remove(b));if(monM){const m=monM;anim(.6,k=>{m.userData.rx=-.5*Math.sin(k*PI)},()=>{m.userData.rx=0})}};
API.enrage=function(){if(!monM||!monRoot)return;const m=monM,red=new T.Color(0x6a0000);m.userData.enr=1;m.traverse(n=>{if(n.isMesh&&n.material.userData.e0){n.material.userData.e0=n.material.userData.e0.clone().lerp(red,.7);n.material.userData.i0=Math.max(n.material.userData.i0,.7)}});
  flash(m,0xff2020,.5);const l=new T.PointLight(0xff2020,2.5,6);l.position.set(0,2,1);monRoot.add(l);ring(MP,0xff2020,.5,4.5,.7,.1,.1);shk=.8};
/* karakter vitrini: Çanta/Kahraman ekranında dönen 3B kahraman */
const SC={on:false};
function renderSC(dt){SC.root.rotation.y+=dt*.55;if(SC.hm&&SC.hm.userData.orb)SC.hm.userData.orb.rotation.y+=dt*2.2;if(SC.pm&&SC.pm.userData.wings)SC.pm.userData.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(t*10)*.5);SC.ren.render(SC.scene,SC.cam)}
API.showcase=function(el,o){try{if(!el)return false;if(!SC.ren){SC.ren=new T.WebGLRenderer({antialias:true,alpha:true});SC.ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    SC.scene=new T.Scene();SC.cam=new T.PerspectiveCamera(30,1,.1,60);SC.cam.position.set(0,1.45,5.6);SC.cam.lookAt(0,.95,0);
    SC.scene.add(new T.HemisphereLight(0xffffff,0x3a3050,.95));const d=new T.DirectionalLight(0xfff4e0,1.15);d.position.set(3,5,4);SC.scene.add(d);const d2=new T.DirectionalLight(0x9fb4ff,.6);d2.position.set(-4,2,-3);SC.scene.add(d2);
    M(cyl(1.25,1.35,.14,36),mat(0x2a2e48,{roughness:.55}),0,-.07,0,SC.scene);Rz(M(tor(1.3,.035),glow(0xffcf4a,.9),0,.01,0,SC.scene),PI/2);SC.root=G(SC.scene)}
  const c=SC.ren.domElement;c.style.cssText='width:100%;height:100%;display:block';if(c.parentNode!==el)el.appendChild(c);
  const w=el.clientWidth||300,h=el.clientHeight||240;SC.ren.setSize(w,h,false);SC.cam.aspect=w/h;SC.cam.updateProjectionMatrix();
  const id=JSON.stringify(o);if(id!==SC.id){SC.id=id;while(SC.root.children.length){const ch=SC.root.children[0];SC.root.remove(ch);dispose(ch)}
    SC.hm=(HERO[o.cls]||HERO.war)(o.skin||'def',o.gear);fit(SC.hm,1.8,1.5);SC.root.add(SC.hm);SC.pm=null;
    if(o.pet&&PETM[o.pet]){const pg=G(SC.root);pg.position.set(1.0,0,.35);pg.rotation.y=-.5;SC.pm=PETM[o.pet]();fit(SC.pm,.8*(1+.15*(o.st||0)),1.1);if(SC.pm.userData.fly)SC.pm.position.y+=.5;pg.add(SC.pm)}}
  SC.on=true;return true}catch(e){return false}};
API.showcaseStop=()=>{SC.on=false};
window.S3D=API;
})();
