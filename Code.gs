/* Restaurant Inventory — no external services. All private helpers end in _. */
const HEADERS = ['ID','Timestamp','Actor','Type','JSON'];
function doGet() { return HtmlService.createHtmlOutputFromFile('Index').setTitle('Restaurant Inventory'); }
function setup_() {
  const p=PropertiesService.getScriptProperties();
  if(p.getProperty('DB')) throw Error('Already set up. Use the existing database.');
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw Error('Create this script from Extensions > Apps Script in a Google Sheet.');
  const sh=ss.insertSheet('InventoryEvents'); sh.appendRow(HEADERS); sh.setFrozenRows(1);
  const folder=DriveApp.createFolder('Inventory receipts - private');
  p.setProperties({DB:ss.getId(),FOLDER:folder.getId(),SECRET:Utilities.getUuid()+Utilities.getUuid()});
  resetPasswords_();
}
function resetPasswords_() {
  // Run only from the script editor. Existing sessions are revoked.
  const p=PropertiesService.getScriptProperties();
  if(!p.getProperty('DB')) throw Error('Run setup first');
  const passwords={};
  ['owner','manager','staff'].forEach(u=>{const pw=Utilities.getUuid()+Utilities.getUuid().slice(0,8); passwords[u]=pw;
    const salt=Utilities.getUuid(); p.setProperty('USER_'+u,JSON.stringify({salt,hash:sign_(salt+pw),version:Utilities.getUuid()}));});
  console.log('Save these passwords privately; all previous passwords are replaced: '+JSON.stringify(passwords));
}
function sign_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s,PropertiesService.getScriptProperties().getProperty('SECRET'))); }
function eq_(a,b) { if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false; let n=0; for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i); return n===0; }
function login(username,password) {
  return locked_(()=>{
    const u=String(username).toLowerCase().trim(); if(!['owner','manager','staff'].includes(u))throw Error('Invalid login');
    const p=PropertiesService.getScriptProperties(), key='FAIL_'+u, f=JSON.parse(p.getProperty(key)||'{"count":0,"until":0}');
    if(f.until>Date.now())throw Error('Too many attempts. Try again in 15 minutes.');
    const user=JSON.parse(p.getProperty('USER_'+u)||'null');
    if(!user||!eq_(user.hash,sign_(user.salt+String(password)))) { p.setProperty(key,JSON.stringify({count:f.count+1,until:f.count>=9?Date.now()+900000:0})); throw Error('Invalid login'); }
    p.deleteProperty(key);
    const body=Utilities.base64EncodeWebSafe(JSON.stringify({u,v:user.version,exp:Date.now()+8*3600000}));
    return {token:body+'.'+sign_(body),role:u};
  });
}
function auth_(token) {
  try { const parts=String(token).split('.'); if(parts.length!==2||!eq_(sign_(parts[0]),parts[1]))throw 0;
    const a=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    const user=JSON.parse(PropertiesService.getScriptProperties().getProperty('USER_'+a.u)||'null');
    if(!user||a.v!==user.version||a.exp<Date.now())throw 0; return a.u;
  } catch(e){throw Error('Session expired. Log in again.');}
}
function locked_(fn) { const lock=LockService.getScriptLock(); lock.waitLock(30000); try{return fn();}finally{lock.releaseLock();} }
function sheet_(){return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB')).getSheetByName('InventoryEvents');}
function events_(){const s=sheet_();return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,5).getValues().map(r=>({id:r[0],at:r[1],actor:r[2],type:r[3],data:JSON.parse(r[4])}));}
function append_(id,u,type,data){const json=JSON.stringify(data);if(json.length>45000)throw Error('Batch too large. Split into smaller batches.');sheet_().appendRow([id,new Date().toISOString(),u,type,json]);SpreadsheetApp.flush();}
function state_(events){
  const items=Object.create(null),receipts=Object.create(null),transfers=Object.create(null),prices=[];
  events.forEach(e=>{const d=e.data;
    if(e.type==='catalog')d.items.forEach(x=>{const old=items[x.sku];items[x.sku]=Object.assign({},x,{restaurant:old?old.restaurant:0,garage:old?old.garage:0});});
    if(e.type==='stock')items[d.sku][d.location]+=d.delta;
    if(e.type==='receipt')receipts[e.id]=Object.assign({id:e.id,by:e.actor,status:'pending'},d);
    if(e.type==='receiptDecision'){const r=receipts[d.id];r.status=d.approve?'approved':'rejected';r.note=d.note;r.reviewedBy=e.actor;
      if(d.approve){Object.assign(r,d.receipt);r.lines.forEach(l=>{items[l.sku][r.location]+=l.qty;prices.push({date:r.date,sku:l.sku,supplier:r.supplier,qty:l.qty,price:l.price,receipt:r.id});});}}
    if(e.type==='transfer')transfers[e.id]=Object.assign({id:e.id,status:'pending',by:e.actor},d);
    if(e.type==='transferDecision'){const t=transfers[d.id];t.status=d.approve?'approved':'rejected';if(d.approve){items[t.sku].garage-=t.qty;items[t.sku].restaurant+=t.qty;}}
  });
  return {items:Object.values(items),receipts:Object.values(receipts),transfers:Object.values(transfers),prices};
}
function getData(token){const u=auth_(token),s=state_(events_());
  if(u==='staff')return {role:u,items:s.items.map(i=>({sku:i.sku,name:i.name,unit:i.unit,category:i.category,restaurant:i.restaurant,garage:i.garage})),transfers:s.transfers};
  return Object.assign({role:u},s);
}
function str_(v,max){const s=String(v==null?'':v).trim();if(s.length>(max||200))throw Error('Text too long');return s;}
function num_(v,min){if(v===''||v==null||typeof v==='boolean')throw Error('A number is required');const n=Number(v);if(!Number.isFinite(n)||n<min||n>1e9)throw Error('Invalid number');return n;}
function location_(v){if(!['restaurant','garage'].includes(v))throw Error('Invalid location');return v;}
function receipt_(d,s,required){
  const date=str_(d.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Invalid delivery date');
  const supplier=str_(d.supplier);if(!supplier)throw Error('Supplier required');
  if(!Array.isArray(d.lines)||d.lines.length>100||(required&&!d.lines.length))throw Error('Enter 1–100 receipt lines');
  return {date,supplier,location:location_(d.location),reference:str_(d.reference),extra:num_(d.extra==null?0:d.extra,0),lines:d.lines.map(l=>{if(!s.items.some(i=>i.sku===l.sku))throw Error('Unknown SKU: '+l.sku);const qty=num_(l.qty,0);if(!qty)throw Error('Quantity must be positive');return {sku:l.sku,qty,price:num_(l.price,0)};})};
}
function mutate(token,id,action,d){
  const u=auth_(token);if(!/^[a-zA-Z0-9-]{16,80}$/.test(id))throw Error('Invalid request ID');
  return locked_(()=>{const ev=events_();const previous=ev.find(e=>e.id===id);if(previous){if(previous.actor!==u||previous.type!==action)throw Error('Request ID conflict');return {ok:true,id};}
    const s=state_(ev),admin=u!=='staff';let data;
    if(!admin&&!['stock','transfer','receipt'].includes(action))throw Error('Admin access required');
    if(action==='catalog'){
      if(!Array.isArray(d.items)||!d.items.length||d.items.length>25)throw Error('Use batches of 1–25 items');
      const seen=Object.create(null);data={items:d.items.map(i=>{const sku=str_(i.sku,80);if(!/^[A-Za-z0-9][A-Za-z0-9_. -]*$/.test(sku)||seen[sku])throw Error('Invalid or duplicate SKU');seen[sku]=true;
        const suppliers=[...new Set(String(i.suppliers||'').split('|').map(x=>str_(x)).filter(Boolean))],primary=str_(i.primary);if(primary&&!suppliers.includes(primary))suppliers.push(primary);
        const name=str_(i.name);if(!name)throw Error('Name required');const old=s.items.find(x=>x.sku===sku),unit=str_(i.unit)||'each';if(old&&old.unit!==unit)throw Error('Unit cannot change for an existing SKU; create a new SKU');
        return {sku,name,unit,category:str_(i.category),target:num_(i.target,0),suppliers,primary};})};
    }else if(action==='stock'){
      const item=s.items.find(i=>i.sku===d.sku);if(!item)throw Error('Unknown SKU');const loc=location_(d.location);
      if(!admin&&loc!=='restaurant')throw Error('Staff may mark restaurant stock finished only');
      if(Number(d.expected)!==item[loc])throw Error('Stock changed. Refresh before retrying.');
      const value=admin?num_(d.value,0):0;data={sku:item.sku,location:loc,delta:value-item[loc],reason:admin?str_(d.reason):'Staff marked finished'};
      if(!data.reason)throw Error('Reason required');
    }else if(action==='transfer'){
      if(!s.items.some(i=>i.sku===d.sku))throw Error('Unknown SKU');const qty=num_(d.qty,0);if(!qty)throw Error('Positive quantity required');data={sku:d.sku,qty};
    }else if(action==='transferDecision'){
      const t=s.transfers.find(x=>x.id===d.id);if(!t||t.status!=='pending')throw Error('Transfer already handled or missing');
      if(d.approve===true&&s.items.find(i=>i.sku===t.sku).garage<t.qty)throw Error('Insufficient garage stock');data={id:t.id,approve:d.approve===true};
    }else if(action==='receipt'){
      data=receipt_(d,s,false);data.note=str_(d.note,2000);data.fileId='';
      if(!data.lines.length&&!d.file)throw Error('Add receipt lines or a photo/PDF');
      if(d.file){const f=d.file;if(!['image/jpeg','image/png','application/pdf'].includes(f.mime)||typeof f.base64!=='string'||f.base64.length>7e6)throw Error('Use JPG, PNG or PDF under 5 MB');
        const bytes=Utilities.base64Decode(f.base64);if(bytes.length>5*1024*1024)throw Error('File too large');
        const blob=Utilities.newBlob(bytes,f.mime,id+(f.mime==='application/pdf'?'.pdf':f.mime==='image/png'?'.png':'.jpg'));
        const folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER'));
        const existing=folder.getFilesByName(blob.getName());data.fileId=existing.hasNext()?existing.next().getId():folder.createFile(blob).getId();}
    }else if(action==='receiptDecision'){
      const r=s.receipts.find(x=>x.id===d.id);if(!r||r.status!=='pending')throw Error('Receipt already handled or missing');
      data={id:r.id,approve:d.approve===true,note:str_(d.note,2000)};if(data.approve)data.receipt=receipt_(d.receipt,s,true);
    }else throw Error('Unknown action');
    append_(id,u,action,data);return {ok:true,id};
  });
}
function getReceiptFile(token,id){if(auth_(token)==='staff')throw Error('Admin access required');const s=state_(events_()),r=s.receipts.find(x=>x.id===id);if(!r||!r.fileId)throw Error('No attachment');const b=DriveApp.getFileById(r.fileId).getBlob();return {mime:b.getContentType(),base64:Utilities.base64Encode(b.getBytes())};}
