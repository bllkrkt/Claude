/* Efsane Avcısı — kodla çizilen SVG ikonlar (v22). Emoji yerine: eşyalar, sekmeler, sınıf portreleri, yetenekler, para birimleri.
   Renkler nadirliğe göre: 0 demir, 1 çelik-mavi, 2 mor büyülü, 3 altın efsanevi. Ortak gradyanlar bir kez <body>'ye eklenir (ICO.init). */
(function(){
const MET=[['#eef1f7','#a6adbd','#5d6476'],['#eaf5ff','#7fb0ee','#2f5c9e'],['#f6e8ff','#b98af0','#5e2fa0'],['#fff6c8','#f2c14a','#a8640c'],['#ffe6f0','#ff5a8c','#6e0a36']];
const GEM=[['#d9dee8','#8a93a8'],['#bfe6ff','#2f86ff'],['#f3c8ff','#a63cf0'],['#ffd0c0','#ff3a1a'],['#e8fdff','#19e0ff']];
const CLO=[['#8b93a6','#4c5366'],['#4f86d8','#1f3f7a'],['#9a5ae0','#43207a'],['#e0503c','#7a1a14'],['#ff4a86','#4a0626']];
const OL='#160d1e';
function defs(){let h='';for(let r=0;r<5;r++){const m=MET[r],g=GEM[r],c=CLO[r];
  h+='<linearGradient id="im'+r+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+m[0]+'"/><stop offset=".45" stop-color="'+m[1]+'"/><stop offset="1" stop-color="'+m[2]+'"/></linearGradient>'+
     '<radialGradient id="ig'+r+'" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="'+g[0]+'"/><stop offset="1" stop-color="'+g[1]+'"/></radialGradient>'+
     '<linearGradient id="ic'+r+'" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient>'}
  h+='<linearGradient id="iw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c98b52"/><stop offset="1" stop-color="#5e3418"/></linearGradient>'+
     '<linearGradient id="il" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b47a48"/><stop offset="1" stop-color="#4e2a12"/></linearGradient>'+
     '<linearGradient id="iau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#f5c242"/><stop offset="1" stop-color="#9a5a08"/></linearGradient>'+
     '<radialGradient id="igem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#8ff0ff"/><stop offset="1" stop-color="#1a7fc0"/></radialGradient>'+
     '<radialGradient id="iess" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#e2b8ff"/><stop offset="1" stop-color="#7a2fd0"/></radialGradient>';
  return h}
/* her parça: r = nadirlik; M metal, G mücevher, C kumaş, W ahşap, L deri */
const P=r=>({M:'url(#im'+r+')',G:'url(#ig'+r+')',C:'url(#ic'+r+')',W:'url(#iw)',L:'url(#il)'});
const hl=(d)=>'<path d="'+d+'" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>';
const SH={
 sword:p=>'<g transform="rotate(45 24 24)"><path d="M24 2 L28.5 8 L28.5 31 L19.5 31 L19.5 8Z" fill="'+p.M+'"/>'+hl('M24 7 V29')+'<rect x="12" y="30" width="24" height="5" rx="2.5" fill="'+p.M+'"/><rect x="21.5" y="35" width="5" height="8" rx="1.5" fill="'+p.L+'"/><circle cx="24" cy="44.5" r="3.2" fill="'+p.G+'"/><circle cx="24" cy="32.5" r="2" fill="'+p.G+'"/></g>',
 axe:p=>'<g transform="rotate(28 24 24)"><rect x="21.8" y="6" width="4.4" height="40" rx="2.2" fill="'+p.W+'"/><path d="M26 7 C36 4 44 11 43 23 C38 20 32 20 26 23Z" fill="'+p.M+'"/><path d="M22 9 C16 9 12 13 12 18 C15 17 19 17 22 19Z" fill="'+p.M+'"/>'+hl('M30 8.5 C36 8 40 12 41 18')+'<circle cx="24" cy="15" r="2.4" fill="'+p.G+'"/></g>',
 hammer:p=>'<g transform="rotate(-30 24 24)"><rect x="21.8" y="16" width="4.4" height="30" rx="2.2" fill="'+p.W+'"/><path d="M11 4 H37 Q40 4 40 7 V17 Q40 20 37 20 H11 Q8 20 8 17 V7 Q8 4 11 4Z" fill="'+p.M+'"/><path d="M14 4 V20 M34 4 V20" stroke="'+OL+'" stroke-opacity=".45" stroke-width="1.3"/>'+hl('M12 7.5 H36')+'<circle cx="24" cy="12" r="3" fill="'+p.G+'"/></g>',
 spear:p=>'<g transform="rotate(35 24 24)"><rect x="22.5" y="15" width="3" height="32" rx="1.5" fill="'+p.W+'"/><path d="M24 1 L30.5 13 L24 20 L17.5 13Z" fill="'+p.M+'"/>'+hl('M24 5 V16')+'<rect x="20" y="19" width="8" height="3.5" rx="1.5" fill="'+p.M+'"/><path d="M22 23 Q19 30 21 33 M26 23 Q29 30 27 33" stroke="'+p.G+'" stroke-width="2.4" fill="none"/></g>',
 bow:p=>'<path d="M14 3 C38 9 38 39 14 45" fill="none" stroke="'+OL+'" stroke-width="7.5" stroke-linecap="round"/><path d="M14 3 C38 9 38 39 14 45" fill="none" stroke="'+p.W+'" stroke-width="4.4" stroke-linecap="round"/><path d="M15 4 V44" stroke="#f3ead4" stroke-width="1.3"/><rect x="28" y="18.5" width="5.5" height="11" rx="2" fill="'+p.L+'"/><circle cx="15" cy="4" r="2.6" fill="'+p.G+'"/><circle cx="15" cy="44" r="2.6" fill="'+p.G+'"/>',
 staff:p=>'<path d="M14 46 L28 14" stroke="'+OL+'" stroke-width="6.5" stroke-linecap="round"/><path d="M14 46 L28 14" stroke="'+p.W+'" stroke-width="4" stroke-linecap="round"/><path d="M24 15 C20 9 24 3 30 3 C37 3 40 10 36 15" fill="none" stroke="'+p.M+'" stroke-width="3"/><circle cx="30" cy="10" r="6.5" fill="'+p.G+'"/><circle cx="28" cy="8" r="2" fill="#fff" fill-opacity=".8" stroke="none"/>',
 plate:p=>'<path d="M12 10 L19 5 Q24 10 29 5 L36 10 L41 21 L34 23 L34 41 Q24 45 14 41 L14 23 L7 21Z" fill="'+p.M+'"/><path d="M24 11 V41" stroke="'+OL+'" stroke-opacity=".5" stroke-width="1.2"/>'+hl('M16 14 Q20 12 22 15')+'<rect x="14" y="31" width="20" height="4" fill="'+p.L+'"/><circle cx="24" cy="21" r="3.2" fill="'+p.G+'"/>',
 tunic:p=>'<path d="M12 10 L19 5 Q24 10 29 5 L36 10 L41 21 L34 23 L34 42 L14 42 L14 23 L7 21Z" fill="'+p.C+'"/><path d="M19 5 L24 18 L29 5" fill="none" stroke="'+p.M+'" stroke-width="2"/><rect x="14" y="29" width="20" height="4.5" fill="'+p.L+'"/><rect x="22" y="28.5" width="4.5" height="5.5" rx="1" fill="'+p.M+'"/>',
 robe:p=>'<path d="M14 8 L20 5 Q24 9 28 5 L34 8 L41 25 L35 27 L38 45 L10 45 L13 27 L7 25Z" fill="'+p.C+'"/><path d="M20 5 L24 13 L28 5 M24 13 V45" fill="none" stroke="'+p.M+'" stroke-width="2"/><path d="M11 42 H37" stroke="'+p.M+'" stroke-width="2.4"/><circle cx="24" cy="20" r="2.6" fill="'+p.G+'"/>',
 helm:p=>'<path d="M9 30 C9 11 39 11 39 30 L39 38 L30 38 L30 27 L18 27 L18 38 L9 38Z" fill="'+p.M+'"/><path d="M22.5 27 V36 H25.5 V27Z" fill="'+p.M+'"/><path d="M24 9 V27" stroke="'+OL+'" stroke-opacity=".4" stroke-width="1.2"/>'+hl('M14 20 Q16 14 21 13')+'<circle cx="24" cy="18" r="2.6" fill="'+p.G+'"/>',
 helm2:p=>'<path d="M9 31 C9 12 39 12 39 31 L36 38 L12 38Z" fill="'+p.M+'"/><path d="M12 28 H36 V32 H12Z" fill="'+OL+'" fill-opacity=".8"/><path d="M24 12 C27 4 36 3 40 7 C34 7 30 10 26 14" fill="'+p.C+'"/>'+hl('M14 22 Q16 16 21 15'),
 crown:p=>'<path d="M7 37 L6 15 L15 25 L24 8 L33 25 L42 15 L41 37Z" fill="'+p.M+'"/><rect x="7" y="33" width="34" height="6" rx="1.5" fill="'+p.M+'"/><circle cx="24" cy="29" r="3.3" fill="'+p.G+'"/><circle cx="15" cy="30" r="2.2" fill="'+p.G+'"/><circle cx="33" cy="30" r="2.2" fill="'+p.G+'"/><circle cx="24" cy="8" r="2" fill="'+p.G+'"/>'+hl('M10 35.5 H38'),
 what:p=>'<path d="M14 36 L27 3 Q30 12 35 36Z" fill="'+p.C+'"/><path d="M5 38 Q24 31 43 38 Q24 45 5 38Z" fill="'+p.C+'"/><path d="M14.5 34 Q24 31 34.5 34" fill="none" stroke="'+p.M+'" stroke-width="2.6"/><path d="M24 15 L25.4 19 L29.5 19 L26.2 21.4 L27.4 25.4 L24 23 L20.6 25.4 L21.8 21.4 L18.5 19 L22.6 19Z" fill="'+p.G+'" stroke-width="0.8"/>',
 glove:p=>'<path d="M14 43 L13 23 Q13 18 16.5 18 L16.5 11 Q16.5 8 19.2 8 Q22 8 22 11 L22 9 Q22 6 24.7 6 Q27.4 6 27.4 9 L27.4 11 Q27.4 8 30 8 Q32.6 8 32.6 11 L32.6 25 L35.5 20 Q38.5 18 39.5 21.5 L34.5 34 L34.5 43Z" fill="'+p.L+'"/><rect x="12" y="35" width="24" height="9" rx="2" fill="'+p.M+'"/><circle cx="24" cy="39.5" r="2.2" fill="'+p.G+'"/>',
 gaunt:p=>'<path d="M14 43 L13 23 Q13 18 16.5 18 L16.5 11 Q16.5 8 19.2 8 Q22 8 22 11 L22 9 Q22 6 24.7 6 Q27.4 6 27.4 9 L27.4 11 Q27.4 8 30 8 Q32.6 8 32.6 11 L32.6 25 L35.5 20 Q38.5 18 39.5 21.5 L34.5 34 L34.5 43Z" fill="'+p.M+'"/><path d="M17 20 H32 M17 15 H32" stroke="'+OL+'" stroke-opacity=".45" stroke-width="1.2"/>'+hl('M18 11 V17')+'<rect x="12" y="35" width="24" height="9" rx="2" fill="'+p.M+'"/><circle cx="24" cy="39.5" r="2.2" fill="'+p.G+'"/>',
 boot:p=>'<path d="M15 5 L29 5 L29 29 L40 33 Q43.5 35 42.5 40 L42.5 42 L12 42 L12 33Z" fill="'+p.L+'"/><rect x="13" y="4" width="18" height="6" rx="2" fill="'+p.M+'"/><rect x="11" y="40" width="32.5" height="4.5" rx="2" fill="'+OL+'"/><path d="M15 20 H27 M15 25 H27" stroke="'+p.M+'" stroke-width="1.8"/>',
 tboot:p=>'<path d="M16 3 L30 3 L30 30 L40 34 Q43.5 36 42.5 41 L12 41 L13 30Z" fill="'+p.C+'"/><path d="M14 3 H32 L31 11 H15Z" fill="'+p.M+'"/><rect x="11" y="39.5" width="32.5" height="5" rx="2" fill="'+OL+'"/><circle cx="23" cy="7" r="2" fill="'+p.G+'"/>',
 ring:p=>'<ellipse cx="24" cy="30" rx="13" ry="12" fill="none" stroke="'+OL+'" stroke-width="8"/><ellipse cx="24" cy="30" rx="13" ry="12" fill="none" stroke="'+p.M+'" stroke-width="5"/>'+hl('M14 24 Q17 19 22 18')+'<path d="M24 5 L32 13 L24 22 L16 13Z" fill="'+p.G+'"/><path d="M16 13 H32 M24 5 L21 13 L24 22 L27 13Z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".9"/>',
 amulet:p=>'<path d="M9 4 Q24 32 39 4" fill="none" stroke="'+OL+'" stroke-width="4.5"/><path d="M9 4 Q24 32 39 4" fill="none" stroke="'+p.M+'" stroke-width="2.4" stroke-dasharray="3 1.6"/><path d="M24 22 L34 32 L24 46 L14 32Z" fill="'+p.M+'"/><circle cx="24" cy="33" r="5.5" fill="'+p.G+'"/>',
 knife:p=>'<g transform="rotate(45 24 24)"><path d="M24 6 L29 12 L29 30 L19 30 L19 14 Z" fill="'+p.M+'"/>'+hl('M26 12 V28')+'<rect x="14" y="30" width="20" height="4" rx="2" fill="'+p.M+'"/><rect x="21.5" y="34" width="5" height="9" rx="1.5" fill="'+p.L+'"/><circle cx="24" cy="32" r="1.8" fill="'+p.G+'"/></g>',
 twin:p=>'<g transform="rotate(35 24 24) translate(-5 0)"><path d="M24 3 L27.5 8 L27.5 30 L20.5 30 L20.5 8Z" fill="'+p.M+'"/><rect x="15" y="30" width="18" height="4" rx="2" fill="'+p.M+'"/><rect x="22" y="34" width="4" height="8" rx="1.5" fill="'+p.L+'"/></g><g transform="rotate(-35 24 24) translate(5 0)"><path d="M24 3 L27.5 8 L27.5 30 L20.5 30 L20.5 8Z" fill="'+p.M+'"/>'+hl('M24 8 V28')+'<rect x="15" y="30" width="18" height="4" rx="2" fill="'+p.M+'"/><rect x="22" y="34" width="4" height="8" rx="1.5" fill="'+p.L+'"/><circle cx="24" cy="32" r="1.8" fill="'+p.G+'"/></g>',
 tome:p=>'<path d="M8 8 Q8 5 11 5 H38 V39 H11 Q8 39 8 42Z" fill="'+p.C+'"/><path d="M8 42 Q8 39 11 39 H38 V44 H11 Q8 44 8 42Z" fill="#efe6cc"/><path d="M12 5 V39" stroke="'+p.M+'" stroke-width="2.4"/><circle cx="25" cy="21" r="7" fill="none" stroke="'+p.M+'" stroke-width="2.2"/><path d="M25 14 L27 19.5 L32 21 L27 22.5 L25 28 L23 22.5 L18 21 L23 19.5Z" fill="'+p.G+'" stroke-width=".8"/>',
 cloak:p=>'<path d="M17 6 Q24 9 31 6 L36 12 Q42 30 40 44 Q24 40 8 44 Q6 30 12 12Z" fill="'+p.C+'"/><path d="M17 6 Q24 18 31 6" fill="none" stroke="'+p.M+'" stroke-width="2.4"/><path d="M24 14 V42" stroke="'+OL+'" stroke-opacity=".35" stroke-width="1.2"/><circle cx="24" cy="12" r="3" fill="'+p.G+'"/>',
 mask:p=>'<path d="M6 14 Q24 6 42 14 Q42 34 24 42 Q6 34 6 14Z" fill="'+p.M+'"/><path d="M11 20 Q16 16 21 20 Q16 24 11 20Z M27 20 Q32 16 37 20 Q32 24 27 20Z" fill="'+OL+'"/><path d="M18 32 Q24 35 30 32" fill="none" stroke="'+OL+'" stroke-width="1.6"/><circle cx="24" cy="12" r="2.4" fill="'+p.G+'"/>'+hl('M10 15 Q14 12 18 12'),
 mecharm:p=>'<path d="M14 44 L13 22 Q13 16 18 15 L30 14 Q35 14 35 20 L35 44Z" fill="'+p.M+'"/><path d="M13 24 H35 M13 31 H35 M13 38 H35" stroke="'+OL+'" stroke-opacity=".45" stroke-width="1.2"/><path d="M16 15 L16 7 Q16 5 18.5 5 Q21 5 21 7 V14 M22 14 V5 Q22 3 24.5 3 Q27 3 27 5 V14 M28 14 V6 Q28 4 30.5 4 Q33 4 33 6 V15" fill="'+p.M+'"/>'+hl('M17 18 V40')+'<circle cx="24" cy="27" r="3" fill="'+p.G+'"/>',
 jewel:p=>'<path d="M14 10 H34 L42 20 L24 44 L6 20Z" fill="'+p.G+'"/><path d="M6 20 H42 M14 10 L19 20 L24 44 L29 20 L34 10 M19 20 L24 10 L29 20" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1"/><path d="M14 10 H34" stroke="'+p.M+'" stroke-width="3"/>',
 charm:p=>'<circle cx="24" cy="26" r="17" fill="'+p.G+'"/><circle cx="24" cy="26" r="17" fill="none" stroke="'+p.M+'" stroke-width="3"/><circle cx="24" cy="26" r="10" fill="#f6fbff"/><circle cx="24" cy="26" r="6" fill="#2f86ff"/><circle cx="24" cy="26" r="3" fill="'+OL+'"/><circle cx="21.5" cy="23.5" r="1.6" fill="#fff" stroke="none"/><rect x="21" y="5" width="6" height="5" rx="1.5" fill="'+p.M+'"/>'
};
const BYE={'🔪':'knife','⚔️':'twin','📖':'tome','🧥':'cloak','🎭':'mask','🦾':'mecharm','💎':'jewel','🗡️':'sword','🪓':'axe','🔨':'hammer','🔱':'spear','🏹':'bow','🪄':'staff','🦺':'plate','🥋':'tunic','👘':'robe','🪖':'helm','⛑️':'helm2','👑':'crown','🎩':'what','🧤':'glove','🥊':'gaunt','🥾':'boot','👢':'tboot','💍':'ring','📿':'amulet','🧿':'charm'};
const BYS={weapon:'sword',armor:'plate',helmet:'helm',gloves:'glove',boots:'boot',ring:'ring',neck:'amulet',cape:'cloak'};
function svg(inner,cls){return '<svg class="ico'+(cls?' '+cls:'')+'" viewBox="0 0 48 48" stroke="'+OL+'" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>'}
function shape(e,slot){return BYE[e]||BYS[slot]||'ring'}
/* eşya ikonu */
function item(it){const r=Math.max(0,Math.min(4,it.r|0));return svg(SH[shape(it.e,it.slot)](P(r)),'ii q'+r)}
/* boş yuva ikonu (soluk) */
function slot(k){return svg(SH[BYS[k]||'ring'](P(0)),'ii emp')}
/* sekme ikonları (altın çizgi) */
const AU='url(#iau)';
const TAB={
 battle:'<g transform="rotate(45 24 24)"><path d="M24 3 L27 7 L27 30 L21 30 L21 7Z" fill="'+AU+'"/><rect x="15" y="30" width="18" height="4" rx="2" fill="'+AU+'"/><rect x="22" y="34" width="4" height="9" rx="1.5" fill="url(#il)"/></g><g transform="rotate(-45 24 24)"><path d="M24 3 L27 7 L27 30 L21 30 L21 7Z" fill="'+AU+'"/><rect x="15" y="30" width="18" height="4" rx="2" fill="'+AU+'"/><rect x="22" y="34" width="4" height="9" rx="1.5" fill="url(#il)"/></g>',
 inv:'<path d="M17 14 Q17 6 24 6 Q31 6 31 14" fill="none" stroke="'+OL+'" stroke-width="5"/><path d="M17 14 Q17 6 24 6 Q31 6 31 14" fill="none" stroke="'+AU+'" stroke-width="2.6"/><path d="M9 16 Q24 11 39 16 L42 40 Q24 46 6 40Z" fill="url(#il)"/><path d="M9 22 Q24 18 39 22 L39 28 Q24 24 9 28Z" fill="'+AU+'"/><rect x="20" y="22" width="8" height="9" rx="2" fill="'+AU+'"/>',
 hero:'<path d="M9 30 C9 10 39 10 39 30 L39 39 L30 39 L30 27 L18 27 L18 39 L9 39Z" fill="'+AU+'"/><path d="M22.5 27 V37 H25.5 V27Z" fill="'+AU+'"/><path d="M24 10 C28 2 36 2 40 6 C34 6 30 8 27 12" fill="#c8322c"/>',
 adv:'<path d="M6 44 V20 H12 V15 H16 V20 H20 V12 H17 V7 H22 V11 H26 V7 H31 V12 H28 V20 H32 V15 H36 V20 H42 V44Z" fill="'+AU+'"/><path d="M20 44 V35 Q24 30 28 35 V44Z" fill="'+OL+'"/><rect x="10" y="25" width="4" height="6" fill="'+OL+'"/><rect x="34" y="25" width="4" height="6" fill="'+OL+'"/>',
 quest:'<path d="M12 8 H36 Q40 8 40 12 V38 Q40 44 34 44 H14 Q8 44 8 38 V36 H12Z" fill="#f2deb0"/><path d="M12 8 Q8 8 8 12 Q8 16 12 16Z" fill="#d8b878"/><path d="M17 17 H34 M17 23 H34 M17 29 H29" stroke="#7a5420" stroke-width="2.2" stroke-linecap="round"/><circle cx="33" cy="37" r="5" fill="#c8322c"/>',
 shop:'<path d="M14 18 Q12 8 24 8 Q36 8 34 18" fill="none" stroke="'+OL+'" stroke-width="5"/><path d="M14 18 Q12 8 24 8 Q36 8 34 18" fill="none" stroke="url(#il)" stroke-width="2.8"/><path d="M8 20 Q24 14 40 20 L37 42 Q24 47 11 42Z" fill="url(#il)"/><circle cx="24" cy="31" r="7" fill="'+AU+'"/><path d="M24 26.5 V35.5 M21.5 28.5 H26.5" stroke="'+OL+'" stroke-width="1.6"/>'
};
function tab(k){return svg(TAB[k]||TAB.battle,'tab')}
/* para birimleri */
const CUR={
 gold:'<ellipse cx="24" cy="27" rx="17" ry="15" fill="#9a5a08"/><ellipse cx="24" cy="24" rx="17" ry="15" fill="url(#iau)"/><ellipse cx="24" cy="24" rx="11" ry="9.5" fill="none" stroke="#9a5a08" stroke-width="2"/><path d="M24 17 L26 22 L31 22 L27 25 L28.5 30 L24 27 L19.5 30 L21 25 L17 22 L22 22Z" fill="#fff3b8" stroke-width="1"/>',
 gem:'<path d="M14 9 H34 L43 19 L24 43 L5 19Z" fill="url(#igem)"/><path d="M5 19 H43 M14 9 L19 19 L24 43 L29 19 L34 9 M19 19 L24 9 L29 19" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/>',
 ess:'<path d="M24 3 L36 24 L24 45 L12 24Z" fill="url(#iess)"/><path d="M24 3 L24 45 M12 24 H36" stroke="#fff" stroke-opacity=".5" stroke-width="1.1"/>'
};
function cur(k){return svg(CUR[k]||CUR.gold,'cur')}
/* sınıf portreleri */
const CLP={
 war:'<path d="M9 30 C9 9 39 9 39 30 L39 41 L29 41 L29 27 L19 27 L19 41 L9 41Z" fill="url(#im1)"/><path d="M22.5 27 V39 H25.5 V27Z" fill="url(#im1)"/><path d="M24 9 C27 1 37 1 42 5 C35 5 30 8 27 12" fill="#c8322c"/><circle cx="24" cy="18" r="2.6" fill="url(#ig3)"/>',
 arc:'<path d="M24 4 C36 4 42 16 40 30 C38 40 32 45 24 45 C16 45 10 40 8 30 C6 16 12 4 24 4Z" fill="#2f6a3a"/><path d="M15 28 C15 20 33 20 33 28 C33 36 29 40 24 40 C19 40 15 36 15 28Z" fill="#f0c8a0"/><path d="M14 26 C16 14 32 14 34 26 C30 21 18 21 14 26Z" fill="#1f4a28"/><circle cx="20" cy="30" r="1.6" fill="'+OL+'"/><circle cx="28" cy="30" r="1.6" fill="'+OL+'"/><path d="M40 6 L30 20" stroke="url(#iw)" stroke-width="2.4"/><path d="M40 6 L42 3 M40 6 L43 8" stroke="#e0503c" stroke-width="2"/>',
 mag:'<path d="M12 34 L26 2 Q30 12 36 34Z" fill="url(#ic2)"/><path d="M4 36 Q24 29 44 36 Q24 44 4 36Z" fill="url(#ic2)"/><path d="M13 32 Q24 28 35 32" fill="none" stroke="url(#iau)" stroke-width="2.6"/><path d="M24 14 L25.5 18 L29.5 18 L26.3 20.4 L27.5 24.4 L24 22 L20.5 24.4 L21.7 20.4 L18.5 18 L22.5 18Z" fill="url(#iau)" stroke-width="0.8"/><path d="M16 40 Q24 47 32 40" fill="#e8e8f0"/>',
 asn:'<path d="M24 4 C37 4 42 16 41 28 C40 40 32 45 24 45 C16 45 8 40 7 28 C6 16 11 4 24 4Z" fill="#26283a"/><path d="M12 26 Q24 20 36 26 L35 31 Q24 27 13 31Z" fill="#f0c8a0"/><path d="M15 27.5 L21 28.5 M27 28.5 L33 27.5" stroke="#ff3a3a" stroke-width="2.2" stroke-linecap="round"/><path d="M10 31 Q24 35 38 31 L36 40 Q24 44 12 40Z" fill="#3a3d54"/><path d="M36 4 L44 16" stroke="url(#im2)" stroke-width="3" stroke-linecap="round"/>'
};
function cls(k){return svg(CLP[k]||CLP.war,'clsp')}
/* yetenekler: ikon emojisine göre glif + renk */
const SKC={'💥':['#ff8a3d','burst'],'🛡️':['#7fc8ff','shield'],'🌪️':['#c8f0ff','whirl'],'📯':['#ffd56a','horn'],'🏹':['#c8ff8a','arrow'],'🌧️':['#8ad0ff','rain'],'💨':['#b8c8e8','dash'],'🦅':['#ffd56a','eye'],
  '🔥':['#ff6a2a','fire'],'🧊':['#8fe8ff','ice'],'⚡':['#ffe94a','bolt'],'💚':['#5df08f','heal'],'🗡️':['#ff5a7a','dagger'],'🌀':['#c58bff','whirl'],'☠️':['#e0e0ff','skull'],'🧪':['#ff5a7a','potion']};
const GLY={
 burst:'<path d="M24 4 L28 17 L41 12 L32 23 L44 30 L30 30 L32 44 L24 33 L16 44 L18 30 L4 30 L16 23 L7 12 L20 17Z"/>',
 shield:'<path d="M24 4 L40 10 Q40 34 24 44 Q8 34 8 10Z"/><path d="M24 10 V38 M14 16 H34" fill="none" stroke="#0006" stroke-width="2"/>',
 whirl:'<path d="M24 24 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" fill="none" stroke-width="3.6" stroke-linecap="round"/>',
 horn:'<path d="M6 30 L26 20 Q36 14 42 6 Q44 24 34 32 Q28 36 22 34 L10 38Z"/><path d="M6 30 L10 38" stroke-width="3"/>',
 arrow:'<path d="M6 42 L36 12" fill="none" stroke-width="3.4"/><path d="M42 6 L30 10 L38 18Z"/><path d="M6 42 L4 34 M6 42 L14 44 M10 38 L8 31 M10 38 L17 40" fill="none" stroke-width="2.6"/>',
 rain:'<path d="M12 4 V20 M24 8 V24 M36 4 V20 M18 22 V38 M30 22 V38" fill="none" stroke-width="3" stroke-linecap="round"/><path d="M8 18 L12 26 L16 18Z M20 22 L24 30 L28 22Z M32 18 L36 26 L40 18Z M14 36 L18 44 L22 36Z M26 36 L30 44 L34 36Z"/>',
 dash:'<path d="M4 16 H26 M10 24 H34 M4 32 H26" fill="none" stroke-width="3.4" stroke-linecap="round"/><path d="M30 10 Q46 24 30 38 Q38 24 30 10Z"/>',
 eye:'<path d="M4 24 Q24 6 44 24 Q24 42 4 24Z"/><circle cx="24" cy="24" r="7" fill="#0008"/><circle cx="24" cy="24" r="3"/>',
 fire:'<path d="M24 44 C12 44 8 34 12 26 C14 30 18 30 18 30 C14 20 22 12 24 4 C28 12 38 18 36 30 C36 30 40 28 40 24 C44 34 36 44 24 44Z"/><path d="M24 40 C19 40 17 35 20 31 C22 34 24 32 24 28 C28 32 30 37 24 40Z" fill="#fff3a0"/>',
 ice:'<path d="M24 3 V45 M6 13 L42 35 M6 35 L42 13" fill="none" stroke-width="3.6" stroke-linecap="round"/><path d="M24 10 L19 5 M24 10 L29 5 M24 38 L19 43 M24 38 L29 43" fill="none" stroke-width="2.6" stroke-linecap="round"/>',
 bolt:'<path d="M28 3 L10 27 L22 27 L18 45 L38 19 L26 19Z"/>',
 heal:'<path d="M18 6 H30 V18 H42 V30 H30 V42 H18 V30 H6 V18 H18Z"/>',
 dagger:'<g transform="rotate(45 24 24)"><path d="M24 3 L28 10 L28 30 L20 30 L20 10Z"/><rect x="14" y="30" width="20" height="4" rx="2"/><rect x="22" y="34" width="4" height="9" rx="1.5"/></g>',
 skull:'<path d="M24 4 C36 4 42 12 42 22 C42 28 38 31 36 32 L36 40 L12 40 L12 32 C10 31 6 28 6 22 C6 12 12 4 24 4Z"/><circle cx="17" cy="22" r="5" fill="#0009"/><circle cx="31" cy="22" r="5" fill="#0009"/><path d="M24 27 L21 33 H27Z" fill="#0009"/>',
 potion:'<path d="M19 4 H29 V14 Q40 20 38 32 Q36 44 24 44 Q12 44 10 32 Q8 20 19 14Z"/><path d="M11 28 Q24 24 37 28 Q36 42 24 42 Q12 42 11 28Z" fill="#ffffff55"/>'
};
function skill(e){const s=SKC[e];if(!s)return null;return '<svg class="ico sk" viewBox="0 0 48 48" aria-hidden="true" fill="'+s[0]+'" stroke="'+s[0]+'" stroke-width="0" style="filter:drop-shadow(0 0 5px '+s[0]+'aa) drop-shadow(0 2px 0 #000a)">'+GLY[s[1]]+'</svg>'}
function init(){if(document.getElementById('icoDefs'))return;const d=document.createElement('div');d.innerHTML='<svg id="icoDefs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>'+defs()+'</defs></svg>';document.body.insertBefore(d.firstChild,document.body.firstChild)}
window.ICO={item,slot,tab,cur,cls,skill,init,has:e=>!!BYE[e],_sh:(k,r)=>SH[k]?SH[k](P(r|0)):'',_tab:k=>TAB[k]||'',_cur:k=>CUR[k]||'',_cls:k=>CLP[k]||'',_gly:(e)=>{const q=SKC[e];return q?{c:q[0],g:GLY[q[1]]}:null}};
})();
