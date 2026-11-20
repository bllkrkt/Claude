/* Efsane Avcısı — EMOJİSİZ OYUN (v22). Oyunda görünen her emoji, burada kodla çizilen bir SVG simgeyle değiştirilir.
   Nasıl çalışır: ekrana eklenen her metin taranır (MutationObserver), emoji bulunursa <i class="em"><svg…></i> konur.
   Yeni emoji eklersen EMO tablosuna bir satır ekle (yoksa altın bir nokta çizilir). Kod içi kimlikler (canavar adları vb.) değişmez. */
(function(){
const OL='#160d1e';
const GOLD='#f5c242',GEM='#5fd8ff',ESS='#c58bff',RED='#e8453c',GRN='#4fd17a',BLU='#4f9cff',WHT='#eef2f8',GRY='#a0a8ba',BRN='#a26c3a',DRK='#4a4560',PUR='#9a5ae0',ORG='#ff9a2a',YEL='#ffe04a',PNK='#ff8ab0',CYN='#8fe8ff',SKN='#f0c8a0',LGR='#8fdc6a';
const P=(d,c,x)=>'<path d="'+d+'" fill="'+c+'"'+(x||'')+'/>';
const Cc=(x,y,r,c,a)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"'+(a||'')+'/>';
const ln=(d,c,w)=>'<path d="'+d+'" fill="none" stroke="'+OL+'" stroke-width="'+(w+1.8)+'" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
const th=(d,c,w)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(w||1)+'" stroke-linecap="round" stroke-linejoin="round"/>';
const eye=(x,y,c)=>Cc(x,y,1.3,c||OL,' stroke="none"');
/* --- temel çizimler: g(c,k) → SVG içi --- */
const G={
 coin:(c)=>Cc(12,12.8,9,'#9a5a08')+Cc(12,11.5,9,c||GOLD)+Cc(12,11.5,5.6,'none',' stroke="#9a5a08" stroke-width="1.2"')+P('M12 7.6l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z','#fff3b8',' stroke-width=".6"'),
 gem:(c)=>P('M7 4h10l4.5 5.2L12 21 2.5 9.2z',c||GEM)+th('M2.5 9.2h19M7 4l2.3 5.2L12 21l2.7-11.8L17 4M9.3 9.2L12 4l2.7 5.2','#fff',.7),
 ess:(c)=>P('M12 2l7.5 10L12 22 4.5 12z',c||ESS)+th('M12 2v20M4.5 12h15','#fff',.7),
 sword:(c,k)=>P('M20.5 3.5l-.6 3.4-9.5 9.5-2.8-2.8 9.5-9.5z',c||'#dfe6f0')+ln('M5.6 12.4l6 6',k||GOLD,2)+ln('M8.4 15.6L4 20',BRN,2.2),
 swords:(c,k)=>G.sword(c,k)+'<g transform="matrix(-1 0 0 1 24 0)">'+G.sword(c,k)+'</g>',
 dagger:(c)=>P('M19 5l-.4 2.6-7 7-2.2-2.2 7-7z',c||'#dfe6f0')+ln('M7.6 11.6l4.8 4.8',GOLD,1.8)+ln('M10 14l-4.5 4.5',BRN,2),
 shield:(c,k)=>P('M12 2.5l8.2 3v6c0 5-3.6 8.6-8.2 10.2-4.6-1.6-8.2-5.2-8.2-10.2v-6z',c||BLU)+P('M12 5.2l5.6 2v4.4c0 3.4-2.4 6-5.6 7.3z',k||'#ffffff40',' stroke="none"'),
 bolt:(c)=>P('M14.2 1.8L4.6 13.6h6.2L9 22.2l10.2-12.8h-6.4z',c||YEL),
 sparkle:(c)=>P('M11 3l2 6.8 6.8 2-6.8 2L11 21l-2-7.2-6.8-2 6.8-2z',c||YEL)+P('M19 2.2l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8z',c||YEL),
 star:(c)=>P('M12 2.3l3 6.3 6.8.8-5 4.7 1.3 6.8L12 17.6l-6.1 3.3 1.3-6.8-5-4.7 6.8-.8z',c||YEL),
 lock:(c)=>ln('M8 10.5V7.6a4 4 0 0 1 8 0v2.9','#c8ccd8',1.8)+'<rect x="5" y="10" width="14" height="11" rx="2.2" fill="'+(c||GOLD)+'"/>'+Cc(12,15,1.7,OL)+P('M11.3 15.5h1.4v2.6h-1.4z',OL),
 unlock:(c)=>ln('M8 10.5V7.6a4 4 0 0 1 7.6-1.8','#c8ccd8',1.8)+'<rect x="5" y="10" width="14" height="11" rx="2.2" fill="'+(c||GOLD)+'"/>'+Cc(12,15,1.7,OL),
 gift:(c,k)=>'<rect x="3.5" y="10" width="17" height="11" rx="1.5" fill="'+(c||RED)+'"/><rect x="2.5" y="6.8" width="19" height="4.2" rx="1" fill="'+(c||RED)+'"/>'+P('M10.6 6.8h2.8V21h-2.8z',k||GOLD)+ln('M12 6.8C9.5 2.5 5.5 3.8 7.6 6.6M12 6.8c2.5-4.3 6.5-3 4.4-.2',k||GOLD,1.3),
 bag:(c)=>ln('M8.7 8a3.3 3.3 0 0 1 6.6 0',BRN,1.8)+P('M5 8.5h14l1.6 12.5H3.4z',c||BRN)+'<rect x="9.3" y="11.5" width="5.4" height="4" rx="1" fill="'+GOLD+'"/>',
 hammer:(c)=>'<g transform="rotate(-38 12 12)"><rect x="10.8" y="9" width="2.6" height="13.5" rx="1.2" fill="'+BRN+'"/><rect x="5.5" y="3" width="13" height="6.4" rx="1.3" fill="'+(c||'#c8ccd8')+'"/></g>',
 forge:(c)=>G.hammer(c)+'<g transform="matrix(-1 0 0 1 24 0)"><g transform="rotate(-38 12 12)"><rect x="10.8" y="9" width="2.6" height="13.5" rx="1.2" fill="'+BRN+'"/>'+P('M4 6.5Q12 1 20 6.5L18.5 8Q12 5 5.5 8z','#c8ccd8')+'</g></g>',
 fire:(c,k)=>P('M12 22c-4.4 0-7-2.8-7-6.5 0-3 2-5 3-6.6.3 1.9 1.3 3.1 2.2 3.4C9.6 8.4 11 5 13.6 2c.4 3.6 5.4 6 5.4 12.1 0 4.5-3 7.9-7 7.9z',c||'#ff6a2a')+P('M12 21c-2 0-3.2-1.3-3.2-3 0-1.8 1.4-2.8 2.2-4 .5 1.2 1.1 1.6 1.7 1.7.2-1.4.7-2.4 1.5-3.2.6 2 2 3 2 5.3 0 2-1.8 3.2-4.2 3.2z',k||YEL,' stroke="none"'),
 skull:(c)=>P('M12 2.5c5 0 8.5 3.2 8.5 7.8 0 2.6-1.4 4.2-2.8 5v3.4H6.3v-3.4c-1.4-.8-2.8-2.4-2.8-5 0-4.6 3.5-7.8 8.5-7.8z',c||WHT)+Cc(8.6,10.8,2.2,OL)+Cc(15.4,10.8,2.2,OL)+P('M12 13.3l-1.3 2.4h2.6z',OL)+th('M9.2 18.7v2.8M12 18.7v2.8M14.8 18.7v2.8',OL,1),
 crown:(c,k)=>P('M3 18L2.4 6.8l5.1 4.6L12 3.8l4.5 7.6 5.1-4.6L21 18z',c||GOLD)+'<rect x="3" y="17" width="18" height="3.6" rx="1" fill="'+(c||GOLD)+'"/>'+Cc(12,14.2,1.7,k||RED)+Cc(7,15,1.1,k||RED)+Cc(17,15,1.1,k||RED),
 disk:(c)=>P('M4 3h13l3 3v15H4z',c||BLU)+'<rect x="7" y="3" width="9" height="6" fill="#dfe6f0"/><rect x="7" y="13" width="10" height="8" rx="1" fill="#dfe6f0"/>',
 spiral:(c)=>ln('M12 12m-1.8 0a1.8 1.8 0 1 1 3.6 0a3.8 3.8 0 1 1-7.6 0a5.8 5.8 0 1 1 11.6 0a7.8 7.8 0 1 1-15.6 0',c||ESS,2),
 potion:(c)=>P('M9.5 2.5h5v5.2c3 1.3 5 3.8 5 7 0 4-3.3 7-7.5 7s-7.5-3-7.5-7c0-3.2 2-5.7 5-7z','#e8f0ff')+P('M5.4 14c2.4-1.4 10.8-1.4 13.2 0 .1 3.9-2.9 6.6-6.6 6.6S5.3 17.9 5.4 14z',c||RED,' stroke="none"')+'<rect x="8.8" y="1.5" width="6.4" height="2.6" rx=".8" fill="'+BRN+'"/>',
 cube:(c)=>P('M12 2.8l8.2 4.2v10L12 21.2 3.8 17V7z',c||CYN)+th('M3.8 7L12 11.2 20.2 7M12 11.2v10','#fff',.9),
 flake:(c)=>ln('M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6',c||CYN,1.8)+ln('M9.6 4L12 6.4 14.4 4M9.6 20L12 17.6l2.4 2.4',c||CYN,1.2),
 check:(c)=>'<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="'+(c||GRN)+'"/>'+ln('M7 12.5l3.3 3.3L17.2 8.6','#fff',2.2),
 cross:(c)=>'<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="'+(c||RED)+'"/>'+ln('M8 8l8 8M16 8l-8 8','#fff',2.2),
 scroll:(c)=>'<rect x="5" y="3.5" width="14" height="17" rx="1.5" fill="'+(c||'#f2deb0')+'"/>'+P('M4 3.5h16v2.6H4zM4 18h16v2.6H4z','#c89a50')+th('M8 9h8M8 12h8M8 15h5','#7a5420',1.2),
 target:(c)=>Cc(11,13,9,c||RED)+Cc(11,13,6.2,WHT)+Cc(11,13,3.4,c||RED)+ln('M11 13l8.5-8.5',BRN,1.4)+P('M18.5 2.5l3 1-1 3-2.5.6z',GRN),
 tower:(c)=>P('M8.6 21.5l1.6-14h3.6l1.6 14z',c||'#b8b0c8')+P('M7.6 7.5h8.8l-1-3.6H8.6z',PUR)+th('M12 1.5v2.6',GOLD,1.4)+P('M11 11h2v3h-2z',OL),
 warn:(c)=>P('M12 2.6L22 20.6H2z',c||YEL)+ln('M12 9v5.4',OL,.6)+Cc(12,17.6,1.3,OL),
 tree:(c)=>'<rect x="10.8" y="14" width="2.6" height="8" rx="1" fill="'+BRN+'"/>'+Cc(12,10,7.5,c||'#3fa34a')+Cc(9,8,3,'#ffffff22',' stroke="none"'),
 pine:(c)=>'<rect x="10.8" y="17" width="2.6" height="5" fill="'+BRN+'"/>'+P('M12 2l6 7h-3l4.5 5.5h-3.5l4 4.5H4l4-4.5H4.5L9 9H6z',c||'#2f7a3a'),
 play:(c)=>P('M7 3.8l13 8.2-13 8.2z',c||GOLD),
 back:(c)=>P('M17 3.8L4 12l13 8.2z',c||GOLD),
 ffwd:(c)=>P('M3 5l9 7-9 7zM12 5l9 7-9 7z',c||GOLD),
 pause:(c)=>'<rect x="5.5" y="4" width="4.6" height="16" rx="1.2" fill="'+(c||GOLD)+'"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.2" fill="'+(c||GOLD)+'"/>',
 paw:(c)=>P('M12 12.5c3.4 0 6 3.2 6 5.6 0 2.2-2 2.9-3.2 2.4-1.2-.4-1.8-.7-2.8-.7s-1.6.3-2.8.7C8 21 6 20.3 6 18.1c0-2.4 2.6-5.6 6-5.6z',c||BRN)+Cc(5.2,10.5,2.1,c||BRN)+Cc(9,6.2,2.2,c||BRN)+Cc(15,6.2,2.2,c||BRN)+Cc(18.8,10.5,2.1,c||BRN),
 note:(c)=>ln('M9 17.5V5.5l10-2v12',c||ESS,1.8)+Cc(6.8,17.8,2.8,c||ESS)+Cc(16.8,15.8,2.8,c||ESS),
 heart:(c)=>P('M12 21C5 16 2.5 12.5 2.5 8.6 2.5 5.5 4.8 3.5 7.5 3.5c2 0 3.5 1 4.5 2.6 1-1.6 2.5-2.6 4.5-2.6 2.7 0 5 2 5 5.1 0 3.9-2.5 7.4-9.5 12.4z',c||RED)+P('M6 6.5c1-.8 2.2-.7 3 0',  'none',' stroke="#fff8" stroke-width="1.2" stroke-linecap="round"'),
 castle:(c)=>P('M3 22V10h3V7.5h2V10h2V6H8.5V3.5H11v2h2v-2h2.5V6H14v4h2V7.5h2V10h3v12z',c||'#b8a888')+P('M10 22v-4.5a2 2 0 0 1 4 0V22z',OL)+P('M5.5 13h1.8v2.4H5.5zM16.7 13h1.8v2.4h-1.8z',OL),
 bulb:(c)=>Cc(12,9.5,6.8,c||YEL)+'<rect x="9" y="15.5" width="6" height="5" rx="1" fill="#b8bcc8"/>'+th('M10 13.5l2-3 2 3',ORG,1),
 book:(c)=>P('M12 6C9.5 4.3 6 4 2.5 4.6V19c3.5-.6 7-.3 9.5 1.4 2.5-1.7 6-2 9.5-1.4V4.6C18 4 14.5 4.3 12 6z',c||'#c84a3a')+P('M12 6v14.4','none',' stroke="'+OL+'"')+th('M4.8 8h4.6M4.8 11h4.6M14.6 8h4.6M14.6 11h4.6','#fff9',1),
 wizard:(c)=>P('M5 15L12.6 1.8 18.5 15z',c||PUR)+P('M2.5 15.5Q12 12 21.5 15.5Q12 19 2.5 15.5z',c||PUR)+P('M7.5 17q4.5 6.5 9 0z',WHT)+P('M12.3 6.5l.8 1.8 2 .2-1.5 1.3.4 2-1.7-1-1.7 1 .4-2-1.5-1.3 2-.2z',GOLD,' stroke-width=".5"'),
 trophy:(c)=>P('M6.5 3h11v5.5c0 3.2-2.4 5.8-5.5 5.8S6.5 11.7 6.5 8.5z',c||GOLD)+ln('M6.5 5.5H3.6c0 3 1.4 4.5 3.4 4.8M17.5 5.5h2.9c0 3-1.4 4.5-3.4 4.8',c||GOLD,1.4)+P('M10.6 14h2.8v3.5h-2.8z',c||GOLD)+'<rect x="7" y="17.5" width="10" height="3.5" rx="1" fill="'+BRN+'"/>',
 rock:(c)=>P('M3 18l2.5-7.5L10 6l6 1.5 4.5 5L21.5 18z',c||'#8a8a96')+th('M10 6l1.5 6L6 14m5.5-2l5 1','#0004',1),
 dragon:(c,k)=>P('M2.5 15c0-5.5 4.2-9.6 10.2-9.6l2.8-3.4 1.4 4.2c2.8 1 4.9 3 5.4 5.6l-3.6 1.2 2.2 2.8c-2 2.6-5.4 3.6-8.6 3.6H8.4l-3 3.2v-4.2c-1.8-1-2.9-2.4-2.9-3.4z',c||'#3fa36a')+Cc(15.3,10.5,1.4,k||YEL)+th('M18.5 13.5l2 .4','#0006',1),
 watch:(c)=>Cc(12,13.5,8,c||WHT)+'<rect x="10" y="2.5" width="4" height="3" rx=".8" fill="'+GRY+'"/>'+ln('M12 13.5V9M12 13.5l3 2',OL,.4),
 hourglass:(c)=>P('M6 2.5h12v3.2L13.6 12l4.4 6.3v3.2H6v-3.2l4.4-6.3L6 5.7z',c||'#e8d8b0')+P('M8.5 19.5h7l-3.5-4.5zM9.5 6h5L12 9.5z',GOLD,' stroke="none"')+th('M5 2.5h14M5 21.5h14',BRN,1.6),
 broom:(c)=>ln('M17.5 2.5L10 12',BRN,1.8)+P('M10.4 10.5l3.6 3.6-3.2 7.4c-2.5-.2-6.8-4.6-7.3-7.3z',c||'#e0b860')+th('M6.4 15.6l3-1.4M8.2 18.3l2.4-2.2','#0005',.9),
 dice:(c)=>'<rect x="3" y="3" width="18" height="18" rx="4" fill="'+(c||WHT)+'"/>'+Cc(8,8,1.6,RED,' stroke="none"')+Cc(16,16,1.6,RED,' stroke="none"')+Cc(12,12,1.6,RED,' stroke="none"')+Cc(16,8,1.6,RED,' stroke="none"')+Cc(8,16,1.6,RED,' stroke="none"'),
 speaker:(c)=>P('M3 9h4l5.5-4.5v15L7 15H3z',c||WHT)+ln('M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',c||WHT,1.4),
 mute:(c)=>P('M3 9h4l5.5-4.5v15L7 15H3z',c||GRY)+ln('M15.5 9l6 6M21.5 9l-6 6',RED,1.6),
 map:(c)=>P('M2.5 5.5l6-2.5 7 2.5 6-2.5v15.5l-6 2.5-7-2.5-6 2.5z',c||'#e8d8a0')+th('M8.5 3v15.5M15.5 5.5V21','#0004',1)+th('M5 13.5c2-1 3-3 5-2s3 4 6 1',RED,1.2),
 point:(c)=>P('M10 21.5c-2.6-1.4-4.6-4.3-4.6-6.7v-3.3c0-1 .8-1.6 1.6-1.6s1.4.6 1.4 1.4V5c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v5.2l4.6.7c1.6.2 2.6 1.6 2.4 3.2l-.6 4.4c-.3 1.9-1.8 3.2-3.7 3.2z',c||SKN),
 anger:(c)=>ln('M4 9.5C7 9.5 9.5 7 9.5 4M14.5 4c0 3 2.5 5.5 5.5 5.5M20 14.5c-3 0-5.5 2.5-5.5 5.5M9.5 20c0-3-2.5-5.5-5.5-5.5',c||RED,2),
 drop:(c)=>P('M12 2.5c3 4.6 6.8 8.6 6.8 12.6a6.8 6.8 0 0 1-13.6 0c0-4 3.8-8 6.8-12.6z',c||'#d02030')+P('M9 15.5a3 3 0 0 0 2 3','none',' stroke="#fff9" stroke-width="1.3" stroke-linecap="round"'),
 wind:(c)=>ln('M3 8.5h11.5a2.8 2.8 0 1 0-2.8-2.8M3 13h16a2.8 2.8 0 1 1-2.8 2.8M3 17.5h7',c||'#cfe6ff',1.8),
 candle:(c)=>'<rect x="8" y="10" width="8" height="11.5" rx="1" fill="'+(c||'#f2e8d0')+'"/>'+P('M12 2.5c1.8 2.2 2.6 3.6 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.2.8-2.6 2.6-4.8z',ORG),
 palette:(c)=>P('M12 2.5c5.5 0 9.5 3.6 9.5 8 0 3-2.4 4.4-4.6 4.4h-1.8c-1.2 0-2 1-1.4 2.2.8 1.6-.2 4.4-2.6 4.4C6.6 21.5 2.5 17.2 2.5 12S6.5 2.5 12 2.5z',c||'#e8d0a0')+Cc(7.5,11,1.8,RED)+Cc(10,6.8,1.8,BLU)+Cc(15,6.8,1.8,GRN)+Cc(17.5,10.8,1.6,YEL),
 bow:(c)=>ln('M6 2.5c11 3 11 16 0 19',c||BRN,2)+th('M6.5 3v18','#f3ead4',.9)+ln('M3 12h16',BRN,1.2)+P('M21.5 12l-3.6-2v4z','#dfe6f0'),
 tag:(c)=>P('M3 4.5V11l9.5 9.5 8-8L11 3H4.5z',c||GOLD)+Cc(7.5,7.5,1.5,OL),
 repeat:(c)=>ln('M5 11V9a3 3 0 0 1 3-3h10M16 3.5L18.5 6 16 8.5M19 13v2a3 3 0 0 1-3 3H6M8 20.5L5.5 18 8 15.5',c||GRN,1.8),
 moon:(c)=>P('M15.5 3a9 9 0 1 0 5.5 13.5A7.5 7.5 0 0 1 15.5 3z',c||YEL),
 newmoon:(c)=>Cc(12,12,9,c||'#3a3550')+Cc(9,9,2,'#ffffff18',' stroke="none"'),
 fullmoon:(c)=>Cc(12,12,9,c||'#f6e8b0')+Cc(9,9,2,'#d8c890',' stroke="none"')+Cc(15,14,1.5,'#d8c890',' stroke="none"'),
 tent:(c)=>P('M12 2.5L22 19H2z',c||RED)+P('M12 2.5l-3.5 16.5h7z',WHT)+P('M10 19a2 2 0 0 1 4 0',OL)+th('M12 2.5V1',GOLD,1.4),
 trash:(c)=>'<rect x="5" y="6.5" width="14" height="15" rx="1.6" fill="'+(c||GRY)+'"/><rect x="3.5" y="4" width="17" height="3" rx="1" fill="'+(c||GRY)+'"/>'+th('M9.5 10v8M14.5 10v8',OL,1)+P('M9.5 4V2.5h5V4','none',' stroke="'+OL+'"'),
 trident:(c)=>ln('M12 22V6M6.5 3.5v4.5a5.5 5.5 0 0 0 11 0V3.5M12 2.5v4',c||GOLD,1.8),
 mountain:(c)=>P('M1.5 20.5L9 7l3.5 5.5L15.5 8l7 12.5z',c||'#8a98b8')+P('M9 7l-2.4 4.4 1.6-.6 1.4 1.2 1.2-1.4z',WHT,' stroke="none"')+P('M15.5 8l-1.9 3.4 1.9-.8 1.6 1z',WHT,' stroke="none"'),
 columns:(c)=>P('M2.5 8L12 2.5 21.5 8z',c||'#e8e0cc')+'<rect x="3.5" y="19" width="17" height="2.5" fill="'+(c||'#e8e0cc')+'"/>'+[5.5,10.5,15.5].map(x=>'<rect x="'+x+'" y="9" width="3" height="10" fill="'+(c||'#e8e0cc')+'"/>').join(''),
 fountain:(c)=>P('M3 15h18l-2 5H5z',c||'#b8b0c8')+ln('M12 15V6M12 6c-3 0-5 3-5 6M12 6c3 0 5 3 5 6',BLU,1.4)+Cc(12,5,1.6,CYN),
 wrench:(c)=>P('M20.5 6.5a5 5 0 0 1-6.6 5.3l-8 8a2 2 0 0 1-2.8-2.8l8-8a5 5 0 0 1 5.3-6.6L13.5 5.3l.8 3.1 3.1.8z',c||'#c8ccd8'),
 tools:(c)=>G.wrench(c)+'<g transform="rotate(90 12 12)">'+G.hammer(c)+'</g>',
 calendar:(c)=>'<rect x="3" y="4.5" width="18" height="17" rx="2" fill="'+WHT+'"/>'+P('M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3z',c||RED)+th('M7.5 2.5v4M16.5 2.5v4',OL,1.6)+th('M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2','#0007',1.4),
 key:(c)=>Cc(7,8,4.6,c||GOLD)+Cc(7,8,1.6,OL)+ln('M10 11l9 9M15.5 16.5l2-2M18 19l2-2',c||GOLD,1.8),
 clip:(c)=>'<rect x="4.5" y="4" width="15" height="18" rx="2" fill="'+(c||BRN)+'"/><rect x="7" y="6.5" width="10" height="13" fill="'+WHT+'"/><rect x="9" y="2.5" width="6" height="3.5" rx="1" fill="'+GRY+'"/>'+th('M9 10h6M9 13h6M9 16h4','#0007',1.1),
 party:(c)=>P('M3 21l4.5-13 8.5 8.5z',c||GOLD)+th('M14 4l1-2M18.5 7.5l2.5-1M17 3.5l1.5 1.5M20 11l2 .5',RED,1.4)+Cc(12,6,1.1,BLU,' stroke="none"')+Cc(19,14,1.1,GRN,' stroke="none"'),
 phone:(c)=>'<rect x="6.5" y="2.5" width="11" height="19" rx="2.2" fill="'+(c||'#3a3550')+'"/><rect x="8" y="5" width="8" height="12.5" fill="'+CYN+'"/>'+ln('M3 8v8M21 8v8',c==='off'?GRY:YEL,1.2),
 phoneoff:(c)=>'<rect x="6.5" y="2.5" width="11" height="19" rx="2.2" fill="#3a3550"/><rect x="8" y="5" width="8" height="12.5" fill="'+GRY+'"/>'+ln('M3 3l18 18',RED,1.5),
 image:(c)=>'<rect x="2.5" y="4" width="19" height="16" rx="2" fill="'+(c||GOLD)+'"/><rect x="4.5" y="6" width="15" height="12" fill="'+CYN+'"/>'+P('M4.5 18l5-6 3 3.5 2.5-2.5 4.5 5z',GRN,' stroke="none"')+Cc(16,9,1.4,YEL,' stroke="none"'),
 info:(c)=>Cc(12,12,9.5,c||BLU)+Cc(12,7.3,1.5,'#fff',' stroke="none"')+th('M12 10.8v6.5','#fff',2.4),
 question:(c)=>Cc(12,12,9.5,c||GRY)+th('M9 9.2a3 3 0 1 1 4.4 2.6c-.9.5-1.4 1.1-1.4 2.2v.6','#fff',2)+Cc(12,17.6,1.3,'#fff',' stroke="none"'),
 excl:(c)=>Cc(12,12,9.5,c||RED)+th('M12 6.5v7','#fff',2.6)+Cc(12,17.2,1.4,'#fff',' stroke="none"'),
 plus:(c)=>'<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="'+(c||GRN)+'"/>'+ln('M12 7v10M7 12h10','#fff',2.2),
 up:(c)=>'<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="'+(c||BLU)+'"/>'+ln('M12 17.5V7M7.5 11.5L12 7l4.5 4.5','#fff',2),
 cactus:(c)=>P('M10 22V5.5a2 2 0 0 1 4 0V22z',c||'#4a9a4a')+ln('M10 14H7.5a1.5 1.5 0 0 1-1.5-1.5V9M14 11.5h2.5A1.5 1.5 0 0 0 18 10V7',c||'#4a9a4a',2.4),
 volcano:(c)=>P('M2 21.5l6.5-11h7l6.5 11z',c||'#6a4a3a')+P('M8.5 10.5L10 13l2-1.5 2 1.5 1.5-2.5z',ORG,' stroke="none"')+P('M10 9c-1-3 1-5.5 2-6.5 1 1 3 3.5 2 6.5z',ORG),
 cloud:(c)=>P('M6.5 19a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4-1.6A5.2 5.2 0 0 1 17.5 19z',c||WHT),
 rain:(c)=>P('M6.5 14a4.2 4.2 0 0 1-.6-8.4 5.6 5.6 0 0 1 10.6-1.5A4.9 4.9 0 0 1 17 14z',c||'#b8c4d8')+ln('M8 17l-1 3M12 17l-1 3M16 17l-1 3',BLU,1.3),
 storm:(c)=>P('M6.5 13a4.2 4.2 0 0 1-.6-8.4 5.6 5.6 0 0 1 10.6-1.5A4.9 4.9 0 0 1 17 13z',c||'#6a7088')+P('M13 11.5l-4 6h3l-1 5 5-7h-3l1.5-4z',YEL),
 suncloud:(c)=>Cc(9,9,5,YEL)+P('M8 20a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.4-1.4A4.8 4.8 0 0 1 18 20z',c||WHT),
 tornado:(c)=>ln('M3 4h18M5 8h14M7.5 12h9M9.5 16h5M11 20h2',c||'#cfe0f0',1.8),
 puzzle:(c)=>P('M4 7h4a2.2 2.2 0 1 1 4 0h4v4a2.2 2.2 0 1 1 0 4v4h-4a2.2 2.2 0 1 0-4 0H4v-4a2.2 2.2 0 1 0 0-4z',c||GRN),
 shop:(c)=>'<rect x="4" y="11" width="16" height="10" fill="'+WHT+'"/>'+P('M2.5 11l2-7.5h15l2 7.5z',c||RED)+th('M7.5 3.5L6.5 11M12 3.5V11M16.5 3.5l1 7.5','#fff9',1.2)+'<rect x="9.5" y="14" width="5" height="7" fill="'+BRN+'"/>',
 muscle:(c)=>P('M4 20c0-6 1-10 4-13.5L10.5 3.5l3 1.5-1.5 3 1 2c2.5-1.5 6.5-1 7.5 2.5s-1.5 7.5-6 7.5z',c||SKN),
 brick:(c)=>'<rect x="2.5" y="4" width="19" height="16" rx="1" fill="'+(c||'#c0583a')+'"/>'+th('M2.5 9.3h19M2.5 14.6h19M9 4v5.3M15 9.3v5.3M9 14.6V20M5.5 9.3v5.3M18.5 4v5.3M18.5 14.6V20',OL,1),
 snake:(c)=>ln('M4 19c3 0 3-4 6-4s3 4 6 4 3.5-3 3.5-6-2-5-5-5H9',c||'#5ab04a',3)+Cc(8,8,2.6,c||'#5ab04a')+eye(7.5,7.3,YEL),
 desert:(c)=>Cc(17,7,3.5,YEL)+P('M1.5 20.5c3-5 7-6.5 11-3.5 3-3 7-3 10 3.5z',c||'#e0a858'),
 bird:(c,k)=>P('M2.5 12c3-1 6-1 8 1l2.5-6 3.5 5.5c2 0 3.5 1 4 2.5L18 16c-1 3-4 5-8 5-4 0-6.5-3-7.5-9z',c||'#8a6a4a')+eye(17,13.2,k)+P('M20.5 15l1.5.8-1.6.9z',ORG),
 owl:(c)=>P('M5 6l3 2.5h8L19 6v9c0 4-3 6.5-7 6.5S5 19 5 15z',c||'#8a6a4a')+Cc(9.2,12,2.6,WHT)+Cc(14.8,12,2.6,WHT)+eye(9.2,12)+eye(14.8,12)+P('M11.2 14.5h1.6l-.8 1.6z',ORG),
 penguin:(c)=>P('M12 2.5c4 0 6 4 6 9.5S16 21.5 12 21.5 6 17.5 6 12s2-9.5 6-9.5z',c||'#2a2a3a')+P('M12 7c2.6 0 3.6 3 3.6 6.5S14.4 20 12 20s-3.6-3-3.6-6.5S9.4 7 12 7z',WHT,' stroke="none"')+eye(10.5,9.5)+eye(13.5,9.5)+P('M11 11h2l-1 1.6z',ORG),
 bat:(c)=>P('M12 8.5c1.6 0 2.6 1.2 2.6 2.6L22 7.5c-.5 5-2.5 8-5.5 8.5L12 19.5 7.5 16C4.5 15.5 2.5 12.5 2 7.5l7.4 3.6c0-1.4 1-2.6 2.6-2.6z',c||'#4a3a5a')+P('M10.2 8.8L9.6 6.5l1.6 1.6zM13.8 8.8l.6-2.3-1.6 1.6z',c||'#4a3a5a')+eye(11,11,RED)+eye(13,11,RED),
 spider:(c)=>ln('M8 10L3 6M8 12.5H2.5M8 15l-4.5 3.5M16 10l5-4M16 12.5h5.5M16 15l4.5 3.5',c||'#3a2a3a',1.2)+Cc(12,15,4.5,c||'#3a2a3a')+Cc(12,9,3,c||'#3a2a3a')+eye(11,8.6,RED)+eye(13,8.6,RED),
 web:(c)=>th('M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1',c||'#e8e8f0',1)+th('M12 6l4.2 1.8L18 12l-1.8 4.2L12 18l-4.2-1.8L6 12l1.8-4.2zM12 9.5l1.8.7.7 1.8-.7 1.8-1.8.7-1.8-.7-.7-1.8.7-1.8z',c||'#e8e8f0',.9),
 fish:(c)=>P('M2.5 12c3-5 9.5-6 14-2l5-3.5-1.5 5.5 1.5 5.5-5-3.5c-4.5 4-11 3-14-2z',c||'#5a9ad8')+eye(7.5,11)+th('M11 8.5c1 2 1 5 0 7','#0004',1),
 shark:(c)=>P('M1.5 13.5c4-3 9-4 13-3l2-5.5 2 6c1.5.5 3 1.2 4 2.2-6 3.5-14 4-21 .3z',c||'#7a8aa8')+eye(5.5,12.6)+th('M8 14l1 1.5M10 14l1 1.5','#fff',.9),
 crab:(c)=>P('M5 13c0-3 3-5 7-5s7 2 7 5-3 5.5-7 5.5S5 16 5 13z',c||'#e0503c')+ln('M5 12C3 10 2.5 7.5 4 5.5M19 12c2-2 2.5-4.5 1-6.5M6.5 17l-2.5 3M17.5 17l2.5 3',c||'#e0503c',1.6)+eye(10,10.5)+eye(14,10.5),
 jelly:(c)=>P('M4 12a8 8 0 0 1 16 0c0 1-1 1.5-2 1.5H6c-1 0-2-.5-2-1.5z',c||'#d88aff')+ln('M7.5 14v5M10.5 14v7M13.5 14v6M16.5 14v4.5',c||'#d88aff',1.2),
 octopus:(c)=>P('M12 2.5c4 0 6.5 3 6.5 7 0 2-.8 3.6-2 4.8l1.5 6-2.6-1.5-1.4 2.6-1.3-3-.7 3-.7-3-1.3 3-1.4-2.6-2.6 1.5 1.5-6c-1.2-1.2-2-2.8-2-4.8 0-4 2.5-7 6.5-7z',c||'#c8508a')+eye(9.6,9.5)+eye(14.4,9.5),
 turtle:(c)=>P('M4 15a8 6 0 0 1 16 0z',c||'#4a8a4a')+th('M8 15l2-4.5h4l2 4.5M10 10.5L12 9l2 1.5','#0005',1)+P('M20 13.5c1.5 0 2.5 1 2.5 2s-1 1.5-2.5 1.5z',LGR)+P('M5 15.5l-1 3h3l.5-3zM15 15.5l1 3h3l-1-3z',LGR),
 scorpion:(c)=>P('M5 15c0-2 2-3.5 5-3.5h4c2 0 3 1 3 2.5S16 17 14 17h-4c-3 0-5-.5-5-2z',c||'#b8783a')+ln('M16 13c3 0 5-2 5-5s-2-4-3.5-3',c||'#b8783a',1.8)+ln('M6 13l-3-3M6 16l-3 2.5',c||'#b8783a',1.4),
 bone:(c)=>P('M7 9.5l7.5 7.5a2.2 2.2 0 1 1 2.6 2.8 2.2 2.2 0 1 1 2.6-2.6 2.2 2.2 0 0 1-2.8-2.6L9.5 7a2.2 2.2 0 0 1-2.6-2.8 2.2 2.2 0 1 1-2.6 2.6A2.2 2.2 0 0 1 7 9.5z',c||'#f2ead8'),
 coffin:(c)=>P('M8.5 2l7 0 3 6-3 14h-7l-3-14z',c||'#6a4a3a')+th('M12 7v8M9.5 9.5h5',GOLD,1.4),
 mushroom:(c)=>P('M3 12a9 8 0 0 1 18 0z',c||RED)+'<rect x="9" y="12" width="6" height="9" rx="2" fill="'+WHT+'"/>'+Cc(8,8.5,1.5,WHT,' stroke="none"')+Cc(14,6.5,1.3,WHT,' stroke="none"')+Cc(17,10,1,WHT,' stroke="none"'),
 leaf:(c)=>P('M4 20C4 9 10 4 21 3c-1 11-6 17-17 17z',c||'#5ab84a')+th('M4 20L15 9','#0005',1.1),
 clover:(c)=>Cc(9,8.5,3.6,c||'#4ab04a')+Cc(15,8.5,3.6,c||'#4ab04a')+Cc(9,14.5,3.6,c||'#4ab04a')+Cc(15,14.5,3.6,c||'#4ab04a')+ln('M12 13.5c0 3 1 5.5 3 8',c||'#4ab04a',1.2),
 coral:(c)=>ln('M12 22V12M12 15c-3 0-5-2-5-5V6M7 9H5M12 13c3 0 5-2 5-5V4M17 7h2M12 12V8',c||'#ff7a8a',2),
 shell:(c)=>P('M12 3c5 0 9 4 9 9.5L12 21 3 12.5C3 7 7 3 12 3z',c||'#f5c8b0')+th('M12 21V4M12 21L6.5 5.5M12 21l5.5-15.5M12 21L3.6 9.5M12 21l8.4-11.5','#0004',1),
 planet:(c)=>Cc(12,12,6.5,c||'#d89a5a')+'<ellipse cx="12" cy="12" rx="10.5" ry="3.4" fill="none" stroke="'+OL+'" stroke-width="2.6" transform="rotate(-20 12 12)"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" fill="none" stroke="'+GOLD+'" stroke-width="1.2" transform="rotate(-20 12 12)"/>',
 galaxy:(c)=>Cc(12,12,10,'#1e1440')+ln('M12 12c3-3 7-1 6 2.5M12 12c-3 3-7 1-6-2.5',c||ESS,1.6)+Cc(12,12,1.6,WHT,' stroke="none"')+Cc(6,6,.7,WHT,' stroke="none"')+Cc(18,17,.7,WHT,' stroke="none"'),
 rainbow:(c)=>ln('M3 19a9 9 0 0 1 18 0',RED,1.6)+th('M5.6 19a6.4 6.4 0 0 1 12.8 0',YEL,1.8)+th('M8.2 19a3.8 3.8 0 0 1 7.6 0',BLU,1.8),
 wave:(c)=>P('M2 15c3-6 7-9 12-8-3 1-4 4-2 6 2 1.5 5 .5 7.5-1.5 0 4-3 8.5-9 8.5S2 19 2 15z',c||BLU),
 shirt:(c)=>P('M8 3L3 6l2 4.5 2.5-1V21h9V9.5l2.5 1L21 6l-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z',c||BLU),
 medal:(c)=>P('M7 2.5h4l2 6h-4zM13 2.5h4l-2 6h-4z',BLU)+Cc(12,15,6.5,c||GOLD)+P('M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z','#fff8',' stroke="none"'),
 box:(c)=>P('M3 7.5L12 3l9 4.5v10L12 22l-9-4.5z',c||'#c89058')+th('M3 7.5l9 4.5 9-4.5M12 12v10M7.5 5.3l9 4.5','#0005',1),
 rocket:(c)=>P('M14 3c4 0 7 0 7 0s0 3-1 7l-7 7-6-6z',c||WHT)+Cc(15.5,8.5,1.8,BLU)+P('M7 11l-4 1 3-5h4zM13 17l-1 4 5-3v-4z',RED)+P('M7.5 16.5c-2 0-3 2-3.5 4 2-.5 4-1.5 4-3.5z',ORG),
 toolbox:(c)=>'<rect x="2.5" y="8" width="19" height="12.5" rx="1.5" fill="'+(c||RED)+'"/>'+P('M8.5 8V5.5h7V8','none',' stroke="'+OL+'" stroke-width="1.8"')+'<rect x="10" y="11" width="4" height="3" fill="'+GOLD+'"/>'+th('M2.5 12.5h7.5M14 12.5h7.5','#0005',1),
 pin:(c)=>P('M12 22s-7-7.5-7-12.5a7 7 0 0 1 14 0C19 14.5 12 22 12 22z',c||RED)+Cc(12,9.5,2.6,WHT),
 globe:(c)=>Cc(12,12,9.5,c||BLU)+th('M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19M4.5 7h15M4.5 17h15','#fff9',1),
 people:(c)=>Cc(16,7.5,3,c||'#7a8ab8')+P('M10.5 20c0-4 2.5-6.5 5.5-6.5s5.5 2.5 5.5 6.5z',c||'#7a8ab8')+Cc(8.5,8.5,3.4,c||'#9aa8d8')+P('M2 21c0-4.5 3-7.2 6.5-7.2S15 16.5 15 21z',c||'#9aa8d8'),
 person:(c)=>Cc(12,6,3.6,c||'#9aa8d8')+P('M6 21.5c0-5.5 2.6-9 6-9s6 3.5 6 9z',c||'#9aa8d8'),
 bug:(c)=>P('M6 9a6 6 0 0 1 12 0v4a6 6 0 0 1-12 0z',c||LGR)+th('M6 11h12M6 15h12',OL,1)+ln('M8 4.5l1.5 2M16 4.5l-1.5 2',c||LGR,1),
 bomb:(c)=>Cc(11,14,7.5,c||'#3a3550')+'<rect x="13" y="4.8" width="4" height="3.4" rx=".8" transform="rotate(40 15 6.5)" fill="'+GRY+'"/>'+ln('M17 4c1-1.5 2.5-1.5 3.5-.5',BRN,1)+Cc(21,3,1.4,ORG,' stroke="none"')+Cc(8.5,11,1.8,'#ffffff30',' stroke="none"'),
 square:(c)=>'<rect x="7" y="7" width="10" height="10" rx="1.5" fill="'+(c||WHT)+'"/>',
 horn:(c)=>P('M3 15.5L15 9.5c2.5-1.3 4.6-3.6 6-6.5 1 6-1 11-5.5 13-3 1.3-6.5 1.2-9 .3L3 18z',c||GOLD)+th('M10 12.3l1.5 3.4M13 10.8l1.5 3.4','#0005',1),
 eye:(c)=>P('M2 12c3-5 6.5-7.5 10-7.5S19 7 22 12c-3 5-6.5 7.5-10 7.5S5 17 2 12z',WHT)+Cc(12,12,4.5,c||'#7a4ad8')+Cc(12,12,2,OL)+Cc(13.2,10.8,.9,WHT,' stroke="none"'),
 amulet:(c)=>ln('M5 3c1 6 4 9 7 9s6-3 7-9',GOLD,1.2)+P('M12 11l4.5 4.5L12 21l-4.5-5.5z',c||GEM),
 robot:(c)=>'<rect x="4.5" y="7" width="15" height="12" rx="3" fill="'+(c||'#b8c4d8')+'"/>'+Cc(9,12.5,1.8,CYN)+Cc(15,12.5,1.8,CYN)+th('M9.5 16.3h5',OL,1.2)+ln('M12 7V4',GRY,1)+Cc(12,3.2,1.2,RED),
 flag:(c)=>ln('M5 21.5V3',GRY,1.4)+P('M5.5 4c4-2 7 2 13 0v9c-6 2-9-2-13 0z',c||WHT),
 jump:(c)=>ln('M4 18c2-8 7-12 13-12M13.5 3l3.5 3-3.5 3.5',c||GRN,2),
 ticket:(c)=>P('M2.5 7h19v3a2 2 0 0 0 0 4v3h-19v-3a2 2 0 0 0 0-4z',c||GOLD)+th('M15 7v10','#0006',1),
 folder:(c)=>P('M2.5 5.5h7l2 2h10v12.5h-19z',c||'#e8b850'),
 folderopen:(c)=>P('M2.5 5.5h7l2 2h8v3h-15l-2 9.5z',c||'#c8983a')+P('M4.5 10.5H22l-2.5 9.5h-17z',c||'#e8b850'),
 page:(c)=>P('M5 2.5h10l4 4v15H5z',c||WHT)+P('M15 2.5v4h4','none',' stroke="'+OL+'"')+th('M8 10h8M8 13h8M8 16h6','#0006',1.1),
 chart:(c)=>'<rect x="3" y="12" width="4" height="9" fill="'+BLU+'"/><rect x="10" y="7" width="4" height="14" fill="'+GRN+'"/><rect x="17" y="3" width="4" height="18" fill="'+(c||GOLD)+'"/>',
 meat:(c)=>P('M14.5 3c4 0 7 3 6.5 7-.5 4.5-5 6-8 5l-4.5 4.5a2 2 0 1 1-2.8 2.8 2 2 0 1 1-2.8-2.8L7.5 15c-1-3 .5-7.5 5-8z',c||'#c8603a')+P('M7.5 16.5L4.6 19.4a1.6 1.6 0 1 1-1.1 1.1','none',' stroke="#f2ead8" stroke-width="1.6"'),
 candleflame:(c)=>G.candle(c),
 dot:(c)=>Cc(12,12,4.5,c||GOLD),
 // yüzler / kafalar
 face:(c,o)=>{o=o||{};let h='';if(o.horn)h+=P('M5 8L3 2.5 8.5 6zM19 8l2-5.5L15.5 6z',o.horn);if(o.halo)h+='<ellipse cx="12" cy="3" rx="6" ry="1.8" fill="none" stroke="'+OL+'" stroke-width="2.6"/><ellipse cx="12" cy="3" rx="6" ry="1.8" fill="none" stroke="'+YEL+'" stroke-width="1.3"/>';if(o.ear)h+=P('M3.5 9l-2-4 5 2.5zM20.5 9l2-4-5 2.5z',c);
   h+=Cc(12,13,8.6,c||SKN);if(o.hood)h+=P('M3.4 14C3 7 7 3.5 12 3.5S21 7 20.6 14L18 11c-1.5-2-3.5-3-6-3s-4.5 1-6 3z',o.hood);if(o.mask)h+=P('M3.6 12.5h16.8v3.2H3.6z',o.mask);
   const ec=o.eye||OL;h+=Cc(8.8,12.6,1.4,ec,' stroke="none"')+Cc(15.2,12.6,1.4,ec,' stroke="none"');if(o.brow)h+=th('M6.5 9.6l3.6 1.4M17.5 9.6l-3.6 1.4',OL,1.3);
   h+=o.fang?P('M8.5 16.8h7l-1 1.5-1-1.5-1.5 2-1.5-2-1 1.5z','#fff'):o.grin?th('M8.5 16.5q3.5 2.5 7 0',OL,1.2):o.frown?th('M9 18q3-2.2 6 0',OL,1.2):th('M9.5 17h5',OL,1.1);
   if(o.beard)h+=P('M5.5 16c1 5 4 6.5 6.5 6.5s5.5-1.5 6.5-6.5c-2 1.5-4 2-6.5 2s-4.5-.5-6.5-2z',o.beard);return h},
 beast:(c,o)=>{o=o||{};let h='';if(o.ant)h+=ln('M7 8L4 2.5M5.5 5L3 5.5M17 8l3-5.5M18.5 5l2.5.5',BRN,1.3);if(o.mane)h+=Cc(12,12.5,10.5,o.mane);
   if(o.ears==='pt')h+=P('M4 11L4.5 2.5 10 7zM20 11l-.5-8.5L14 7z',c);else if(o.ears==='rd')h+=Cc(5.5,6,3,c)+Cc(18.5,6,3,c);
   h+=P('M12 4.5c5 0 8 3.6 8 8 0 2-.7 3.5-1.8 4.6L15 21.5H9l-3.2-4.4C4.7 16 4 14.5 4 12.5c0-4.4 3-8 8-8z',c);
   h+=P('M8.5 16c0-2 1.6-3 3.5-3s3.5 1 3.5 3-1.6 3.5-3.5 3.5-3.5-1.5-3.5-3.5z',o.snout||'#ffffff40',' stroke="none"')+P('M10.8 14.6h2.4l-1.2 1.4z',OL);
   h+=Cc(8.8,10.8,1.4,o.eye||OL,' stroke="none"')+Cc(15.2,10.8,1.4,o.eye||OL,' stroke="none"');if(o.tusk)h+=P('M8.8 18l-1.5 3.5 2.6-2.4zM15.2 18l1.5 3.5-2.6-2.4z',WHT);if(o.horn)h+=P('M12 5l-1.4-4.2 2.8 0z',o.horn);return h},
 ghost:(c)=>P('M4.5 21V11a7.5 7.5 0 0 1 15 0v10l-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2z',c||'#e8eaf6')+Cc(9.3,11,1.6,OL)+Cc(14.7,11,1.6,OL)+P('M10.5 15a1.5 2 0 0 0 3 0z',OL),
 snowman:(c)=>Cc(12,16.5,5.5,c||WHT)+Cc(12,7.5,4,c||WHT)+eye(10.6,7)+eye(13.4,7)+P('M12 8.3l3 .7-3 .6z',ORG)+P('M8 3.6h8l-1-2.5h-6z','#3a3550'),
 moai:(c)=>P('M7 3.5h10l1 6-2 12H8L6 9.5z',c||'#8a8a96')+th('M8.5 9.5h3M12.5 9.5h3',OL,1.6)+P('M11 10.5h2l.5 4.5h-3z','#0003',' stroke="none"')+th('M9.5 17.5h5',OL,1.2),
 genie:(c)=>Cc(12,8,5,c||'#5a8aff')+P('M7 13c2 2 8 2 10 0l-1 4c-1 3-5 4-8 5 2-2 1.5-4 0-5z',c||'#5a8aff')+eye(10.3,7.8)+eye(13.7,7.8)+P('M8 4.5Q12 1 16 4.5z',RED),
 mermaid:(c)=>Cc(12,5.5,3.4,SKN)+P('M8.5 3.5c-1 3 0 5 .5 6M15.5 3.5c1 3 0 5-.5 6','none',' stroke="#e8503c" stroke-width="2"')+P('M9 9.5h6l-1 6c1 2 3 3.5 5 4-3 1-5.5 0-7-2-1.5 2-4 3-7 2 2-.5 4-2 5-4z',c||'#3ac8a0'),
 eaglehead:(c)=>G.bird(c),
 ninja:(c)=>G.face('#2a2c3e',{hood:'#2a2c3e',mask:'#2a2c3e',eye:RED}),
 fencer:(c)=>G.face(SKN,{hood:'#9aa8c8',eye:OL}),
 crystal:(c)=>P('M12 2l4 6-1.5 13h-5L8 8z',c||ESS)+P('M5 9l2.5 3-1 8H4l-1-6zM19 9l-2.5 3 1 8H20l1-6z',c||ESS)+th('M12 2v19','#fff8',.7),
 sword2:(c)=>G.sword(c)
};
/* emoji → [çizim, renk, ek] */
const IT=k=>['_it',k];
const E={
 '💰':['bag2'],'🪙':['coin'],'💎':['gem'],'💠':['ess'],'🔮':['crys'],'⚔':['swords'],'🗡':['dagger'],'🔪':['dagger'],'🛡':['shield'],'⚡':['bolt'],'🌫':['fog'],'🫧':['bubble'],'🌠':['shooting'],'💥':['burst'],'✨':['sparkle'],'🌟':['sparkle','#fff2a0'],'⭐':['star'],'💫':['sparkle',CYN],
 '🔒':['lock'],'🔓':['unlock'],'🎁':['gift'],'🎒':['bag'],'⚒':['forge'],'🔨':IT('hammer'),'🛠':['tools'],'🔧':['wrench'],'🧰':['toolbox'],
 '🔥':['fire'],'💀':['skull'],'☠':['skull','#e8e8f8'],'👑':['crown'],'💾':['disk'],'🌀':['spiral'],'🧪':['potion'],'🧊':['cube'],'❄':['flake'],'✅':['check'],'❌':['cross'],'✓':null,
 '📜':['scroll'],'🎯':['target'],'🗼':['tower'],'⚠':['warn'],'🌳':['tree'],'🌲':['pine'],'🌿':['leaf','#5ab84a'],'🍃':['leaf','#8fdc6a'],'🍀':['clover'],'🍄':['mushroom'],
 '▶':['play'],'◀':['back'],'⏩':['ffwd'],'⏸':['pause'],'🐾':['paw'],'🎵':['note'],'🎶':['note'],'❤':['heart'],'💚':['heart',GRN],'💙':['heart',BLU],'💜':['heart',PUR],'🖤':['heart','#3a3550'],
 '🏰':['castle'],'💡':['bulb'],'📖':['book'],'🧙':['wizard'],'🏆':['trophy'],'🪨':['rock'],'🐲':['dragon'],'🐉':['dragon','#c8402a'],'⏱':['watch'],'⏳':['hourglass'],'⌛':['hourglass'],
 '🧹':['broom'],'🎲':['dice'],'🔊':['speaker'],'🔉':['speaker'],'🔈':['speaker'],'🔇':['mute'],'🗺':['map'],'👆':['point'],'👉':['point'],'💢':['anger'],'🩸':['drop'],'💧':['drop',BLU],'💨':['wind'],
 '🕯':['candle'],'🎨':['palette'],'🏹':['bow'],'🏷':['tag'],'🐺':['beast','#8a8a9a',{ears:'pt',snout:'#c8c8d8'}],'🔁':['repeat'],'🔄':['repeat',BLU],'🌙':['moon'],'🌑':['newmoon'],'🌕':['fullmoon'],
 '🎪':['tent'],'🗑':['trash'],'🔱':['trident'],'🏔':['mountain'],'⛰':['mountain','#9a8a78'],'🏛':['columns'],'🥷':['ninja'],'😡':['face','#e8503c',{brow:1,frown:1}],'⛲':['fountain'],
 '📅':['calendar'],'🗝':['key'],'🔑':['key'],'📋':['clip'],'🎉':['party'],'🎊':['party'],'🤺':['fencer'],'📳':['phone'],'📴':['phoneoff'],'🖼':['image'],'ℹ':['info'],'❔':['question'],'❓':['question',RED],'❗':['excl'],'❕':['excl',GRY],
 '🌵':['cactus'],'🌋':['volcano'],'☁':['cloud'],'🌪':['tornado'],'🧩':['puzzle'],'🏪':['shop'],'💪':['muscle'],'🧱':['brick'],'🐍':['snake'],'🏜':['desert'],'🦅':['bird','#8a6a4a'],'🦉':['owl'],'🐧':['penguin'],
 '⬆':['up'],'📊':['chart'],'📈':['chart'],'🍖':['meat'],'📄':['page'],'🌧':['rain'],'🦇':['bat'],'👹':['face','#d84a3a',{horn:'#f2ead8',fang:1,brow:1}],'👺':['face','#e8503c',{horn:'#f2ead8',brow:1,grin:1}],
 '👿':['face','#9a4ad8',{horn:'#3a2a4a',brow:1,frown:1}],'😈':['face','#9a4ad8',{horn:'#3a2a4a',brow:1,grin:1}],'🐚':['shell'],'👁':['eye'],'🤖':['robot'],'🏳':['flag'],'🦘':['jump'],'➕':['plus'],'🎟':['ticket'],'🎫':['ticket'],
 '📁':['folder'],'📂':['folderopen'],'👥':['people'],'🧍':['person'],'👤':['person'],'🐛':['bug'],'🦺':IT('plate'),'🪖':IT('helm'),'🧤':IT('glove'),'🥾':IT('boot'),'💍':IT('ring'),'🧿':IT('charm'),'📿':IT('amulet'),
 '🪓':IT('axe'),'🪄':IT('staff'),'🥋':IT('tunic'),'👘':IT('robe'),'⛑':IT('helm2'),'🎩':IT('what'),'🥊':IT('gaunt'),'👢':IT('tboot'),
 '🕷':['spider'],'🕸':['web'],'👻':['ghost'],'🧛':['face','#e8e0f0',{hood:'#3a1a3a',fang:1,eye:RED}],'🧟':['face','#8ab878',{eye:'#ff4040',frown:1}],'🦹':['face',SKN,{mask:'#3a2a4a',hood:'#3a2a4a'}],
 '😇':['face',SKN,{halo:1,grin:1}],'🧌':['face','#7a9a6a',{ear:1,fang:1,brow:1}],'🧝':['face',SKN,{ear:1,hood:'#2f6a3a'}],'🧜':['mermaid'],'🧞':['genie'],'🗿':['moai'],'☃':['snowman'],'⛄':['snowman'],
 '🐗':['beast','#7a5a3a',{ears:'pt',tusk:1,snout:'#c89a7a'}],'🐻':['beast','#8a5a2a',{ears:'rd',snout:'#c8a070'}],'🐻‍❄':['beast','#f2f2f8',{ears:'rd',snout:'#ffffff'}],'🦌':['beast','#b07a4a',{ant:1,snout:'#e8c8a0'}],
 '🦍':['face','#4a4a5a',{brow:1,frown:1}],'🐀':['beast','#8a8078',{ears:'rd',eye:RED,snout:'#c8b0b0'}],'🦊':['beast','#ff8a3a',{ears:'pt',snout:'#fff'}],'🦁':['beast','#e8b050',{mane:'#b0702a',snout:'#f8e0b0'}],
 '🦄':['beast','#f2f2ff',{ears:'pt',horn:GOLD,snout:'#ffe0f0'}],'🦣':['beast','#8a6a5a',{ears:'rd',tusk:1}],'🦭':['beast','#9aa0b0',{snout:'#c8ccd8'}],'🐪':['beast','#d0a060',{ears:'pt'}],'🐢':['turtle'],
 '🦎':['snake','#7ab04a'],'🦂':['scorpion'],'🦴':['bone'],'⚰':['coffin'],'⛅':['suncloud'],'🌩':['storm'],'🐟':['fish'],'🐠':['fish',ORG],'🦀':['crab'],'🪼':['jelly'],'🦈':['shark'],'🐙':['octopus'],'🪸':['coral'],
 '🪐':['planet'],'🌌':['galaxy'],'🌈':['rainbow'],'🌊':['wave'],'🎽':['shirt'],'🥇':['medal',GOLD],'🥈':['medal','#d0d8e8'],'🥉':['medal','#c8803a'],'🏅':['medal',GOLD],'📦':['box'],'🚀':['rocket'],'📍':['pin'],'🌐':['globe'],
 '💣':['bomb'],'▫':['square'],'◽':['square'],'📯':['horn'],
 '🍖x':null,'☄':['fire',ORG],'🧭':['globe',GOLD],'🗓':['calendar'],'📌':['pin'],'🔔':['bulb',GOLD],'🏃':['jump'],'⚙':['gear'],'🎮':['dice'],'🪦':['coffin','#8a8a96']
};
G.bag2=(c)=>G.bag('#b07a3a')+Cc(12,14,3.4,GOLD)+P('M10.8 13.2h2.4M12 12v4','none',' stroke="#9a5a08" stroke-width="1"');
G.burst=(c)=>P('M12 2l2.4 6.2 6.6-2.6-3.6 6 5.6 3.4-6.6.6 1 6.6L12 17.6 6.6 22.2l1-6.6-6.6-.6L6.6 11.6 3 5.6l6.6 2.6z',c||ORG)+P('M12 7.5l1.3 3.4 3.4-.6-2.3 2.6 2.3 2.6-3.4-.6L12 18.3l-1.3-3.4-3.4.6 2.3-2.6-2.3-2.6 3.4.6z',YEL,' stroke="none"');
G.fog=(c)=>ln('M3 7h12M7 11h14M3 15h12M7 19h10',c||'#c8d0e0',1.8);
G.bubble=(c)=>Cc(9,14,6,c||'#9fe8ff',' fill-opacity=".6"')+Cc(17,7,3.5,c||'#9fe8ff',' fill-opacity=".6"')+th('M6 11a3 3 0 0 1 3-2.5','#fff',1.2);
G.shooting=(c)=>ln('M3 21L13 11',c||'#ffe9a0',1.4)+P('M17 3.5l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z',c||YEL);
G.crys=(c)=>Cc(12,10.5,7.8,c||ESS)+Cc(9.5,8,2.2,'#ffffff70',' stroke="none"')+P('M6 18.5h12l1.5 3h-15z',BRN);
G.gear=(c)=>P('M10.5 2h3l.5 2.6 1.9.8 2.2-1.5 2.1 2.1-1.5 2.2.8 1.9 2.6.5v3l-2.6.5-.8 1.9 1.5 2.2-2.1 2.1-2.2-1.5-1.9.8-.5 2.6h-3l-.5-2.6-1.9-.8-2.2 1.5-2.1-2.1 1.5-2.2-.8-1.9L2 13.5v-3l2.6-.5.8-1.9-1.5-2.2 2.1-2.1 2.2 1.5 1.9-.8z',c||GRY)+Cc(12,12,3.4,'#3a3550');
const norm=e=>e.replace(/️/g,'').replace(/[\u{1F3FB}-\u{1F3FF}]/gu,'').replace(/‍[♀♂]/g,'');
const NM={};for(const k in E)if(E[k])NM[norm(k)]=E[k];
function inner(e){const n=norm(e);let d=NM[n];if(!d&&n.length>2)d=NM[[...n][0]];if(!d)return G.dot();
  if(d[0]==='_it')return '<g transform="scale(.5)">'+window.ICO._sh(d[1],1)+'</g>';const f=G[d[0]];return f?f(d[1],d[2]):G.dot()}
const cache=new Map();
function emo(e){let s=cache.get(e);if(s)return s;s='<svg class="emi" viewBox="0 0 24 24" stroke="'+OL+'" stroke-width="1.1" stroke-linejoin="round" aria-hidden="true">'+inner(e)+'</svg>';cache.set(e,s);return s}
function emoUrl(e){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(emo(e).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" '))}
/* emoji tanıyıcı: resim karakterleri (+ değiştiriciler, ZWJ dizileri). ©®™ ve düz oklar dışarıda */
const RE=/(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(?:️|[\u{1F3FB}-\u{1F3FF}]|‍(?:\p{Extended_Pictographic}|[♀♂])️?)*/gu;
const SKIP=new Set(['©','®','™','↔','↕','↩','↪','‼','⁉','〰','〽']);
const NOTAG={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,TITLE:1,svg:1,SVG:1,OPTION:1};
function fixText(t){const s=t.data;if(!s||s.length>4000)return;RE.lastIndex=0;if(!RE.test(s))return;const p=t.parentNode;if(!p||NOTAG[p.nodeName]||p.closest&&p.closest('svg,.emi,textarea,[data-noemo]'))return;
  RE.lastIndex=0;const f=document.createDocumentFragment();let i=0,m,any=false;
  while((m=RE.exec(s))){if(SKIP.has(m[0]))continue;any=true;if(m.index>i)f.appendChild(document.createTextNode(s.slice(i,m.index)));const el=document.createElement('i');el.className='em';el.innerHTML=emo(m[0]);f.appendChild(el);i=m.index+m[0].length}
  if(!any)return;if(i<s.length)f.appendChild(document.createTextNode(s.slice(i)));p.replaceChild(f,t)}
function scan(root){if(!root)return;if(root.nodeType===3){fixText(root);return}if(root.nodeType!==1||NOTAG[root.nodeName])return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];let n;while((n=w.nextNode()))a.push(n);for(const t of a)fixText(t)}
let mo=null;
function start(){document.querySelectorAll('[data-t]').forEach(e=>{if(e.dataset.tr==null)e.dataset.tr=e.textContent});scan(document.body);if(mo)return;mo=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')fixText(m.target);else for(const n of m.addedNodes)scan(n)}});
  mo.observe(document.body,{childList:true,subtree:true,characterData:true});
  /* CSS içindeki kilit simgesi */
  const st=document.createElement('style');st.textContent='#tabs button.lk::after{content:"";width:12px;height:12px;background:url("'+emoUrl('🔒')+'") center/contain no-repeat}';document.head.appendChild(st)}
/* düz metin isteyen yerler için (ör. sayfa başlığı) emojileri sil */
function strip(s){return String(s).replace(RE,m=>SKIP.has(m)?m:'').replace(/\s{2,}/g,' ').trim()}
Object.assign(window.ICO,{emo,emoUrl,emoStart:start,emoScan:scan,strip});
})();
