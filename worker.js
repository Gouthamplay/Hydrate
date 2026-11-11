const CORS = {
  "Access-Control-Allow-Origin": "https://gouthamplay.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
const TZ = "Asia/Kolkata";
const hydration = [
  "A little sip can make a nice difference.", "Your water break is waiting. 💧",
  "Pause what you're doing. Time to hydrate.", "Give yourself a quick refresh.",
  "Your bottle called. It misses you.", "A quick sip before the next big thing.",
  "Take a moment. Refill yourself.", "Water break? Sounds like a good idea.",
  "A little water, then back to it.", "Keep your day flowing. 💧"
];
const motivation = [
  "Small habits. Big changes.", "Progress is built one little action at a time.",
  "Make time for yourself, too.", "Keep showing up for yourself.",
  "You deserve the same care you give everything else.",
  "Great things start with small habits.", "Consistency beats perfection.",
  "Be proud of the little things you do for yourself."
];
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:CORS});
const enc = new TextEncoder();
const bytes = s => enc.encode(s);
function b64u(data) {
  let s=""; for(const b of new Uint8Array(data)) s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function un64(s) {
  s=s.replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(s+"=".repeat((4-s.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function join(...a) {
  const out=new Uint8Array(a.reduce((n,x)=>n+x.length,0)); let p=0;
  for(const x of a){out.set(x,p);p+=x.length;} return out;
}
async function hkdf(ikm,salt,info,len) {
  const k=await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info},k,len*8));
}
function randomInt(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n;}
function localNow(){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {dateKey:p.year+"-"+p.month+"-"+p.day, minute:+p.hour*60 + +p.minute};
}
function parseTime(s){
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s||"")) throw new Error("Time must use HH:MM.");
  const [h,m]=s.split(":").map(Number); return h*60+m;
}
function planTimes(start,end){
  // Surprise reminders occupy half-hour points between hourly reminders.
  const candidates=[]; for(let m=start+30;m<end;m+=60)candidates.push(m);
  const count=Math.min(candidates.length,2+randomInt(2));
  for(let i=candidates.length-1;i>0;i--){const j=randomInt(i+1);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  return candidates.slice(0,count).sort((a,b)=>a-b);
}
async function dailyPlan(DB,id,dateKey,start,end){
  const q=await DB.prepare("SELECT planned_times FROM daily_plans WHERE subscription_id=? AND date_key=?").bind(id,dateKey).first();
  if(q)return JSON.parse(q.planned_times);
  const plan=planTimes(start,end);
  await DB.prepare("INSERT OR IGNORE INTO daily_plans(subscription_id,date_key,planned_times) VALUES(?,?,?)").bind(id,dateKey,JSON.stringify(plan)).run();
  const saved=await DB.prepare("SELECT planned_times FROM daily_plans WHERE subscription_id=? AND date_key=?").bind(id,dateKey).first();
  return JSON.parse(saved.planned_times);
}
async function vapid(endpoint,env){
  const u=new URL(endpoint), now=Math.floor(Date.now()/1000);
  const pub=un64(env.VAPID_PUBLIC_KEY);
  const jwk={kty:"EC",crv:"P-256",x:b64u(pub.slice(1,33)),y:b64u(pub.slice(33,65)),d:env.VAPID_PRIVATE_KEY,ext:true};
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const h=b64u(bytes(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const p=b64u(bytes(JSON.stringify({aud:u.origin,exp:now+43200,sub:"https://gouthamplay.github.io/Hydrate/"})));
  const input=h+"."+p;
  const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,bytes(input));
  return input+"."+b64u(sig);
}
async function encryptedBody(sub,payload){
  const clientPub=un64(sub.p256dh), auth=un64(sub.auth);
  const clientKey=await crypto.subtle.importKey("raw",clientPub,{name:"ECDH",namedCurve:"P-256"},false,[]);
  const server=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const serverPub=new Uint8Array(await crypto.subtle.exportKey("raw",server.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:clientKey},server.privateKey,256));
  const ikm=await hkdf(shared,auth,join(bytes("WebPush: info\0"),clientPub,serverPub),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,bytes("Content-Encoding: aes128gcm\0"),16);
  const nonce=await hkdf(ikm,salt,bytes("Content-Encoding: nonce\0"),12);
  const aes=await crypto.subtle.importKey("raw",cek,"AES-GCM",false,["encrypt"]);
  const plain=join(bytes(JSON.stringify(payload)),new Uint8Array([2]));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,tagLength:128},aes,plain));
  return join(salt,new Uint8Array([0,0,16,0]),new Uint8Array([serverPub.length]),serverPub,cipher);
}
async function push(sub,payload,env){
  const token=await vapid(sub.endpoint,env), body=await encryptedBody(sub,payload);
  return fetch(sub.endpoint,{method:"POST",headers:{
    Authorization:"vapid t="+token+", k="+env.VAPID_PUBLIC_KEY,
    "Content-Type":"application/octet-stream","Content-Encoding":"aes128gcm",
    TTL:"86400",Urgency:"normal"
  },body});
}
async function testPush(request,env){
  const b=await request.json();
  if(!b.endpoint)return json({error:"Missing registered device endpoint"},400);
  const s=await env.DB.prepare("SELECT id,endpoint,p256dh,auth FROM subscriptions WHERE endpoint=?").bind(b.endpoint).first();
  if(!s)return json({error:"This iPhone is not registered. Use the app's notification setup first."},404);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS test_push_rate_limit (id INTEGER PRIMARY KEY CHECK(id=1), last_sent INTEGER NOT NULL DEFAULT 0)").run();
  await env.DB.prepare("INSERT OR IGNORE INTO test_push_rate_limit(id,last_sent) VALUES(1,0)").run();
  const now=Math.floor(Date.now()/1000);
  const lock=await env.DB.prepare("UPDATE test_push_rate_limit SET last_sent=? WHERE id=1 AND last_sent<?").bind(now,now-30).run();
  if(!lock.meta?.changes)return json({error:"A test push was sent recently. Wait 30 seconds and try again."},429);
  try{
    const result=await push(s,{title:"Hydrate",body:"This is a remote test notification from Cloudflare. 💧",url:"https://gouthamplay.github.io/Hydrate/",tag:"hydrate-remote-test-"+now},env);
    if(result.status===404||result.status===410){
      await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(s.id).run();
      return json({error:"Apple Push Service says this subscription has expired. Re-register notifications in the app."},410);
    }
    if(!result.ok){
      const detail=(await result.text()).slice(0,300);
      console.error("Hydrate test push rejected",JSON.stringify({status:result.status,detail}));
      return json({error:"Push service rejected the request.",pushStatus:result.status,detail},502);
    }
    console.log("Hydrate remote test accepted",JSON.stringify({status:result.status}));
    return json({ok:true,message:"Remote push accepted by Apple Push Service.",pushStatus:result.status});
  }catch(e){
    console.error("Hydrate test push failed",e);
    return json({error:e?.message||"Push delivery request failed"},500);
  }
}
async function subscribe(request,env){
  const b=await request.json(),s=b.subscription;
  if(!s?.endpoint||!s.keys?.p256dh||!s.keys?.auth)return json({error:"Invalid subscription"},400);
  const start=parseTime(b.start||"07:00"),end=parseTime(b.end||"21:00");
  if(end<=start)return json({error:"End time must be after start time"},400);
  const old=await env.DB.prepare("SELECT id FROM subscriptions WHERE endpoint=?").bind(s.endpoint).first();
  const id=old?.id||crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO subscriptions(id,endpoint,p256dh,auth,expiration_time,updated_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(endpoint) DO UPDATE SET
    p256dh=excluded.p256dh,auth=excluded.auth,expiration_time=excluded.expiration_time,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,s.endpoint,s.keys.p256dh,s.keys.auth,s.expirationTime||null).run();
  await env.DB.prepare(`INSERT INTO preferences(subscription_id,timezone,start_minute,end_minute,enabled)
    VALUES(?,?,?,?,1) ON CONFLICT(subscription_id) DO UPDATE SET timezone=excluded.timezone,
    start_minute=excluded.start_minute,end_minute=excluded.end_minute,enabled=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,TZ,start,end).run();
  return json({ok:true});
}
async function preferences(request,env){
  const b=await request.json(); if(!b.endpoint)return json({error:"Missing endpoint"},400);
  const start=parseTime(b.start),end=parseTime(b.end); if(end<=start)return json({error:"Invalid time window"},400);
  const s=await env.DB.prepare("SELECT id FROM subscriptions WHERE endpoint=?").bind(b.endpoint).first();
  if(!s)return json({error:"Subscription not found"},404);
  await env.DB.prepare("UPDATE preferences SET start_minute=?,end_minute=?,updated_at=CURRENT_TIMESTAMP WHERE subscription_id=?").bind(start,end,s.id).run();
  return json({ok:true});
}
async function ensureDiagnostics(DB){
  await DB.prepare("CREATE TABLE IF NOT EXISTS scheduler_debug (id INTEGER PRIMARY KEY CHECK (id=1), details TEXT, updated_at TEXT)").run();
  await DB.prepare("INSERT OR IGNORE INTO scheduler_debug(id,details) VALUES(1,'{}')").run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS scheduler_heartbeat (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_run TEXT,
    last_cron TEXT,
    runs INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  )`).run();
  await DB.prepare("INSERT OR IGNORE INTO scheduler_heartbeat(id,runs) VALUES(1,0)").run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS delivery_locks (
    subscription_id TEXT NOT NULL,
    bucket_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(subscription_id,bucket_key)
  )`).run();
}
async function scheduler(env, controller){
  await ensureDiagnostics(env.DB);
  const {dateKey,minute}=localNow();
  const nowIso=new Date().toISOString();
  await env.DB.prepare("UPDATE scheduler_heartbeat SET last_run=?,last_cron=?,runs=runs+1,last_error=NULL WHERE id=1")
    .bind(nowIso,controller?.cron||"unknown").run();

  const {results=[]}=await env.DB.prepare(`SELECT s.id,s.endpoint,s.p256dh,s.auth,p.start_minute,p.end_minute
    FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id WHERE p.enabled=1`).all();

  const debug={dateKey,minute,subscriptionCount:results.length,intervalMinutes:5,subscriptions:[]};
  for(const s of results){
    const active=minute>=s.start_minute && minute<=s.end_minute;
    const bucketMinute=Math.floor(minute/5)*5;
    const bucketKey=dateKey+"T"+String(Math.floor(bucketMinute/60)).padStart(2,"0")+":"+String(bucketMinute%60).padStart(2,"0");
    const entry={start:s.start_minute,end:s.end_minute,active,bucketKey,status:active?"waiting":"outside-window"};
    if(active){
      // A dedicated primary-key lock guarantees one delivery per device per
      // five-minute bucket, regardless of overlapping Cron invocations.
      const lock=await env.DB.prepare("INSERT OR IGNORE INTO delivery_locks(subscription_id,bucket_key) VALUES(?,?)")
        .bind(s.id,bucketKey).run();
      if(lock.meta?.changes){
        entry.status="sending";
        try{
          const pool=Math.random()<0.8?hydration:motivation;
          const result=await push(s,{
            title:"Hydrate",
            body:pool[randomInt(pool.length)],
            url:"https://gouthamplay.github.io/Hydrate/",
            tag:"hydrate-"+dateKey+"-"+bucketMinute,
            dateKey,
            slotMinutes:s.start_minute+Math.floor((bucketMinute-s.start_minute)/60)*60,
            reminderType:"test-5-minute"
          },env);
          if(result.status===404||result.status===410){
            await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(s.id).run();
            entry.status="expired-subscription";
          }else if(!result.ok){
            const detail=(await result.text()).slice(0,400);
            await env.DB.prepare("DELETE FROM delivery_locks WHERE subscription_id=? AND bucket_key=?").bind(s.id,bucketKey).run();
            entry.status="push-rejected";
            entry.pushStatus=result.status;
            entry.detail=detail;
            console.error("Hydrate scheduled push rejected",JSON.stringify({status:result.status,detail,bucketKey}));
          }else{
            entry.status="accepted";
            entry.pushStatus=result.status;
            console.log("Hydrate scheduled push accepted",JSON.stringify({status:result.status,bucketKey}));
          }
        }catch(error){
          await env.DB.prepare("DELETE FROM delivery_locks WHERE subscription_id=? AND bucket_key=?").bind(s.id,bucketKey).run();
          entry.status="exception";
          entry.error=error?.message||String(error);
          console.error("Hydrate scheduled push exception",JSON.stringify({error:entry.error,bucketKey}));
        }
      }else{
        entry.status="already-processed";
      }
    }
    debug.subscriptions.push(entry);
  }
  await env.DB.prepare("UPDATE scheduler_debug SET details=?,updated_at=? WHERE id=1")
    .bind(JSON.stringify(debug),new Date().toISOString()).run();
}
export default {
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
    const path=new URL(request.url).pathname;
    try{
      if(request.method==="GET"&&path==="/status"){
        await ensureDiagnostics(env.DB);
        const now=localNow();
        const {results=[]}=await env.DB.prepare(`SELECT p.start_minute,p.end_minute,p.enabled,
          (SELECT COUNT(*) FROM sent_notifications n WHERE n.subscription_id=s.id) AS sent_count,
          (SELECT MAX(sent_at) FROM sent_notifications n WHERE n.subscription_id=s.id) AS last_attempt
          FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id`).all();
        const heartbeat=await env.DB.prepare("SELECT last_run,last_cron,runs,last_error FROM scheduler_heartbeat WHERE id=1").first();
        const schedulerDebug=await env.DB.prepare("SELECT details,updated_at FROM scheduler_debug WHERE id=1").first();
        return json({ok:true,timezone:TZ,localDate:now.dateKey,localMinute:now.minute,heartbeat,schedulerDebug,subscriptions:results});
      }
      if(request.method==="GET"&&path==="/health"){
        const r=await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions").first();
        return json({ok:true,service:"Hydrate API",database:"connected",subscriptions:r.count});
      }
      if(request.method==="POST"&&path==="/test-push")return await testPush(request,env);
      if(request.method==="POST"&&path==="/subscribe")return await subscribe(request,env);
      if(request.method==="POST"&&path==="/preferences")return await preferences(request,env);
      return json({error:"Not found"},404);
    }catch(e){console.error(e);return json({error:e.message||"Server error"},500);}
  },
  async scheduled(controller,env,ctx){
    ctx.waitUntil(scheduler(env,controller).catch(async error=>{
      console.error("Hydrate scheduler crashed",error);
      try{
        await ensureDiagnostics(env.DB);
        await env.DB.prepare("UPDATE scheduler_heartbeat SET last_error=?,last_run=?,last_cron=?,runs=runs+1 WHERE id=1")
          .bind(error?.message||String(error),new Date().toISOString(),controller?.cron||"unknown").run();
      }catch(logError){console.error("Could not record scheduler failure",logError);}
    }));
  }
};