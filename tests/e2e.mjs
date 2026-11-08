import { chromium } from 'playwright';
const [html, zip1, zip2, out] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, colorScheme:'dark', hasTouch:true});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(()=>{ window.__calls=[]; window.AndroidBridge={saveFile:(n,c)=>{__calls.push(['save',n]);return "İndirilenler/"+n}, takeSharedFiles:()=>"[]", setBars:(c,l)=>__calls.push(['bars',c,l]), setReminder:(...a)=>__calls.push(['rem',...a]), ensureNotifications:()=>true, shareText:(t,x)=>__calls.push(['share',t,x.length])}; });
const T = s=>p.locator(s).first().innerText();
const shot = n=>p.screenshot({path:out+'/'+n+'.png'});
await p.goto('file://'+html); await p.waitForTimeout(600);
await shot('a1-onboarding');
console.log('onb visible', await p.locator('#onb').isVisible());
await p.click('#onbNext'); await p.click('#onbNext'); await p.waitForTimeout(450); await shot('a2-onboarding3');
await p.setInputFiles('#fileIg', zip1); await p.waitForTimeout(1300);
console.log('onb gone', await p.locator('#onb').count(), '|', await T('#snackText'));
await p.waitForTimeout(3500); await shot('a3-home');
// kaydırma: sağa
const name1 = await T('#topcard .pname');
const box = await p.locator('#topcard').boundingBox();
await p.mouse.move(box.x+box.width/2, box.y+60); await p.mouse.down(); 
for (let i=1;i<=10;i++) await p.mouse.move(box.x+box.width/2+i*20, box.y+60);
await p.mouse.up(); await p.waitForTimeout(500);
console.log('swiped', name1, '->', await T('#topcard .pname'), 'chip', await T('#todayChip'));
// buton ile atla / koru
await p.click('#aSkip'); await p.waitForTimeout(400);
await p.click('#aKeep'); await p.waitForTimeout(400);
await p.click('#aOpen').catch(()=>{}); await p.waitForTimeout(200);
await shot('a4-home-after');
// liste
await p.click('[data-tab=list]'); await p.waitForTimeout(400);
console.log('chips', (await p.locator('.chip').allInnerTexts()).join(' | '));
await shot('a5-list');
// uzun bas -> toplu seçim
const li = p.locator('#lul li').nth(1); const lb = await li.boundingBox();
await p.mouse.move(lb.x+100, lb.y+20); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(200);
await p.locator('#lul li').nth(2).click(); await p.locator('#lul li').nth(3).click();
await shot('a6-bulk');
console.log('bulk', await T('#bulkbar .cnt'));
await p.click('[data-b=keep]'); await p.waitForTimeout(300);
console.log('after bulk', await T('#snackText'));
// kişi menüsü
await p.locator('#lul li').first().click(); await p.waitForTimeout(400); await shot('a7-sheet');
await p.click('[data-o=closed]'); await p.waitForTimeout(400);
await p.click('#lshare'); 
// sıralama sheet
await p.click('#lsort'); await p.waitForTimeout(300); await p.click('[data-s=az]'); await p.waitForTimeout(300);
// geçmiş
await p.click('[data-f=hist]'); await p.waitForTimeout(300); console.log('hist', await T('#lcount'));
// ikinci yükleme -> takipten çıkanlar
await p.setInputFiles('#fileIg', zip2); await p.waitForTimeout(1300);
console.log('reimport:', await T('#snackText'));
await p.waitForTimeout(500); await shot('a8-home-lost');
await p.click('[data-tab=stats]'); await p.waitForTimeout(600);
await p.screenshot({path:out+'/a9-stats.png', fullPage:true});
await p.click('[data-tab=settings]'); await p.waitForTimeout(400);
await p.screenshot({path:out+'/a10-settings.png', fullPage:true});
await p.click('[data-sw=reminder]'); await p.waitForTimeout(200);
await p.click('#sExport'); await p.waitForTimeout(200);
await p.click('#sTheme'); await p.waitForTimeout(300); await p.click('[data-t=light]'); await p.waitForTimeout(400);
await p.click('[data-tab=home]'); await p.waitForTimeout(500); await shot('a11-light-home');
await p.click('[data-tab=stats]'); await p.waitForTimeout(500); await shot('a12-light-stats');
// back handling
console.log('back', await p.evaluate(()=>window.__onBack()), await p.evaluate(()=>window.__onBack()));
console.log('calls', JSON.stringify(await p.evaluate(()=>__calls.map(c=>c.slice(0,3)))).slice(0,400));
// reload persistence
await p.reload(); await p.waitForTimeout(600);
console.log('reload theme', await p.evaluate(()=>document.documentElement.dataset.theme), await T('.kv .v'));
console.log('errors', errs);
await b.close();
