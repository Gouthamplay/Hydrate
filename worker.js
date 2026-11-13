function corsHeaders(request){
  const origin = request?.headers?.get("Origin") || "https://gouthamplay.github.io";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };
}
const json = (data, status=200, request=null) => new Response(JSON.stringify(data), {
  status,
  headers: corsHeaders(request)
});
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
const DEFAULT_VAPID_PUBLIC_KEY = "BHGpfDlb42JYGsZb553YAlkxETVnKsFfgTvd8ZVpXhSMP-_VfE-8qc7QIPE1gtSPlJfwE_gr3OqMs8PW2ZmTYHg";

function getVapidPublicKey(env){
  return (typeof env?.VAPID_PUBLIC_KEY === "string" && env.VAPID_PUBLIC_KEY.trim()) || DEFAULT_VAPID_PUBLIC_KEY;
}

async function vapid(endpoint,env){
  const pubKey = getVapidPublicKey(env);
  if(!pubKey){
    throw new Error("Missing Cloudflare Worker variable: VAPID_PUBLIC_KEY (Production environment).");
  }
  if(typeof env.VAPID_PRIVATE_KEY!=="string" || !env.VAPID_PRIVATE_KEY.trim()){
    throw new Error("Missing Cloudflare Worker secret: VAPID_PRIVATE_KEY (Production environment).");
  }
  const u=new URL(endpoint), now=Math.floor(Date.now()/1000);
  const pub=un64(pubKey);
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
  const pubKey=getVapidPublicKey(env);
  const token=await vapid(sub.endpoint,env), body=await encryptedBody(sub,payload);
  return fetch(sub.endpoint,{method:"POST",headers:{
    Authorization:"vapid t="+token+", k="+pubKey,
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
  if(!s?.endpoint||!s.keys?.p256dh||!s.keys?.auth)return json({error:"Invalid subscription"},400,request);
  const start=parseTime(b.start||"07:00"),end=parseTime(b.end||"21:00");
  if(end<=start)return json({error:"End time must be after start time"},400,request);
  const auth=await getAuthUser(request,env).catch(()=>null);
  const userId=auth?.user_id||b.userId||null;
  const old=await env.DB.prepare("SELECT id FROM subscriptions WHERE endpoint=?").bind(s.endpoint).first();
  const id=old?.id||crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO subscriptions(id,endpoint,p256dh,auth,expiration_time,user_id,updated_at)
    VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(endpoint) DO UPDATE SET
    p256dh=excluded.p256dh,auth=excluded.auth,expiration_time=excluded.expiration_time,
    user_id=COALESCE(excluded.user_id,subscriptions.user_id),updated_at=CURRENT_TIMESTAMP`)
    .bind(id,s.endpoint,s.keys.p256dh,s.keys.auth,s.expirationTime||null,userId).run();
  await env.DB.prepare(`INSERT INTO preferences(subscription_id,timezone,start_minute,end_minute,enabled)
    VALUES(?,?,?,?,1) ON CONFLICT(subscription_id) DO UPDATE SET timezone=excluded.timezone,
    start_minute=excluded.start_minute,end_minute=excluded.end_minute,enabled=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,TZ,start,end).run();
  return json({ok:true},200,request);
}
async function preferences(request,env){
  const b=await request.json(); if(!b.endpoint)return json({error:"Missing endpoint"},400,request);
  const start=parseTime(b.start),end=parseTime(b.end); if(end<=start)return json({error:"Invalid time window"},400,request);
  const s=await env.DB.prepare("SELECT id FROM subscriptions WHERE endpoint=?").bind(b.endpoint).first();
  if(!s)return json({error:"Subscription not found"},404,request);
  await env.DB.prepare("UPDATE preferences SET start_minute=?,end_minute=?,updated_at=CURRENT_TIMESTAMP WHERE subscription_id=?").bind(start,end,s.id).run();
  return json({ok:true},200,request);
}

/* User Authentication & Cloud Sync */
async function hashPassword(password, saltB64){
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    bytes(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const saltBytes = un64(saltB64);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return b64u(bits);
}

function generateSalt(){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return b64u(salt);
}

function generateToken(){
  const token = crypto.getRandomValues(new Uint8Array(32));
  return b64u(token);
}

async function getAuthUser(request, env){
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]+)$/i);
  if(!match) return null;
  const token = match[1];
  const nowIso = new Date().toISOString();
  const row = await env.DB.prepare(`
    SELECT s.token, s.user_id, u.id, u.email, u.name
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).bind(token, nowIso).first();
  return row || null;
}

async function handleSignup(request, env){
  const b = await request.json().catch(()=>({}));
  const email = (b.email || "").trim().toLowerCase();
  const password = b.password || "";
  const name = (b.name || "").trim() || email.split("@")[0] || "User";
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return json({ error: "Please enter a valid email address." }, 400, request);
  }
  if(password.length < 6){
    return json({ error: "Password must be at least 6 characters." }, 400, request);
  }
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if(existing){
    return json({ error: "An account with this email already exists. Please log in." }, 409, request);
  }
  const id = crypto.randomUUID();
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  const nowIso = new Date().toISOString();
  await env.DB.prepare("INSERT INTO users(id, email, password_hash, password_salt, name, created_at, updated_at) VALUES(?,?,?,?,?,?,?)")
    .bind(id, email, hash, salt, name, nowIso, nowIso).run();

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?,?,?,?)")
    .bind(token, id, expiresAt, nowIso).run();

  return json({ ok: true, user: { id, email, name }, token }, 200, request);
}

async function handleLogin(request, env){
  const b = await request.json().catch(()=>({}));
  const email = (b.email || "").trim().toLowerCase();
  const password = b.password || "";
  if(!email || !password){
    return json({ error: "Email and password are required." }, 400, request);
  }
  const user = await env.DB.prepare("SELECT id, email, password_hash, password_salt, name FROM users WHERE email = ?").bind(email).first();
  if(!user){
    return json({ error: "Invalid email or password." }, 401, request);
  }
  const hash = await hashPassword(password, user.password_salt);
  if(hash !== user.password_hash){
    return json({ error: "Invalid email or password." }, 401, request);
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?,?,?,?)")
    .bind(token, user.id, expiresAt, new Date().toISOString()).run();

  return json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, token }, 200, request);
}

async function handleMe(request, env){
  const auth = await getAuthUser(request, env);
  if(!auth) return json({ error: "Not authenticated" }, 401, request);
  return json({ ok: true, user: { id: auth.id, email: auth.email, name: auth.name } }, 200, request);
}

async function handleLogout(request, env){
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]+)$/i);
  if(match){
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  }
  return json({ ok: true }, 200, request);
}

async function handleGetUserData(request, env){
  const auth = await getAuthUser(request, env);
  if(!auth) return json({ error: "Not authenticated" }, 401, request);
  const row = await env.DB.prepare("SELECT logs, quick_checks, start_time, end_time, updated_at FROM user_data WHERE user_id = ?").bind(auth.user_id).first();
  if(!row) return json({ ok: true, data: null }, 200, request);
  return json({
    ok: true,
    data: {
      logs: JSON.parse(row.logs || "{}"),
      quickChecks: JSON.parse(row.quick_checks || "[]"),
      start: row.start_time || "07:00",
      end: row.end_time || "21:00",
      updatedAt: row.updated_at
    }
  }, 200, request);
}

async function handleSyncUserData(request, env){
  const auth = await getAuthUser(request, env);
  if(!auth) return json({ error: "Not authenticated" }, 401, request);
  const b = await request.json().catch(()=>({}));
  const existing = await env.DB.prepare("SELECT logs, quick_checks, start_time, end_time, updated_at FROM user_data WHERE user_id = ?").bind(auth.user_id).first();
  let cloudLogs = {};
  let cloudQuick = [];
  if(existing){
    try { cloudLogs = JSON.parse(existing.logs || "{}"); } catch(e){}
    try { cloudQuick = JSON.parse(existing.quick_checks || "[]"); } catch(e){}
  }

  // Merge logs (union: preserves all day slots)
  const incomingLogs = b.logs && typeof b.logs === "object" ? b.logs : {};
  const mergedLogs = { ...cloudLogs };
  for(const [day, slots] of Object.entries(incomingLogs)){
    if(!mergedLogs[day]){
      mergedLogs[day] = slots;
    } else {
      mergedLogs[day] = { ...mergedLogs[day], ...slots };
    }
  }

  // Merge quick checks by unique timestamp
  const incomingQuick = Array.isArray(b.quickChecks) ? b.quickChecks : [];
  const quickMap = new Map();
  cloudQuick.forEach(q => { if(q && q.timestamp) quickMap.set(q.timestamp, q); });
  incomingQuick.forEach(q => { if(q && q.timestamp) quickMap.set(q.timestamp, q); });
  const mergedQuick = Array.from(quickMap.values()).sort((a,b)=> (a.timestamp||"").localeCompare(b.timestamp||""));

  const start = (b.start && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.start)) ? b.start : (existing?.start_time || "07:00");
  const end = (b.end && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.end)) ? b.end : (existing?.end_time || "21:00");
  const nowIso = new Date().toISOString();

  await env.DB.prepare(`INSERT INTO user_data(user_id, logs, quick_checks, start_time, end_time, updated_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
    logs=excluded.logs, quick_checks=excluded.quick_checks,
    start_time=excluded.start_time, end_time=excluded.end_time,
    updated_at=excluded.updated_at`)
    .bind(auth.user_id, JSON.stringify(mergedLogs), JSON.stringify(mergedQuick), start, end, nowIso).run();

  if(b.endpoint){
    try {
      await env.DB.prepare("UPDATE subscriptions SET user_id=? WHERE endpoint=?").bind(auth.user_id, b.endpoint).run();
    } catch(e) {}
  }

  return json({
    ok: true,
    data: {
      logs: mergedLogs,
      quickChecks: mergedQuick,
      start,
      end,
      updatedAt: nowIso
    }
  }, 200, request);
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
  await DB.prepare(`CREATE TABLE IF NOT EXISTS sent_notifications (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id,scheduled_at)
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    logs TEXT NOT NULL DEFAULT '{}',
    quick_checks TEXT NOT NULL DEFAULT '[]',
    start_time TEXT NOT NULL DEFAULT '07:00',
    end_time TEXT NOT NULL DEFAULT '21:00',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  try{await DB.prepare("ALTER TABLE subscriptions ADD COLUMN user_id TEXT").run();}catch(e){}
}
async function scheduler(env, controller){
  await ensureDiagnostics(env.DB);
  const {dateKey,minute}=localNow();
  const nowIso=new Date().toISOString();
  await env.DB.prepare("UPDATE scheduler_heartbeat SET last_run=?,last_cron=?,runs=runs+1,last_error=NULL WHERE id=1")
    .bind(nowIso,controller?.cron||"unknown").run();

  const {results=[]}=await env.DB.prepare(`SELECT s.id,s.endpoint,s.p256dh,s.auth,p.start_minute,p.end_minute
    FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id WHERE p.enabled=1`).all();

  const debug={dateKey,minute,subscriptionCount:results.length,mode:"hourly",subscriptions:[]};
  for(const s of results){
    if(!s.endpoint || !s.p256dh || !s.auth){
      debug.subscriptions.push({id:s.id,status:"invalid-subscription-data"});
      continue;
    }
    const inWindow = minute>=s.start_minute && minute<=s.end_minute;
    if(!inWindow){
      debug.subscriptions.push({start:s.start_minute,end:s.end_minute,minute,status:"outside-window"});
      continue;
    }

    // Check the current minute and up to four preceding minutes so a delayed
    // Cron invocation does not silently miss a scheduled reminder.
    const plan = await dailyPlan(env.DB, s.id, dateKey, s.start_minute, s.end_minute);
    const due = [];
    for(let m=Math.max(0,minute-4); m<=minute; m++){
      if(m<s.start_minute || m>s.end_minute) continue;
      const hourly = (m - s.start_minute) % 60 === 0;
      const surprise = plan.includes(m);
      if(hourly || surprise){
        due.push({minute:m, type:hourly?"hourly":"surprise"});
      }
    }

    if(!due.length){
      debug.subscriptions.push({start:s.start_minute,end:s.end_minute,minute,status:"waiting-next-slot"});
      continue;
    }

    for(const item of due){
      const m = item.minute;
      const bucketKey = dateKey+"T"+String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
      const entry = {start:s.start_minute,end:s.end_minute,dueMinute:m,type:item.type,bucketKey,status:"waiting"};

      const lock = await env.DB.prepare("INSERT OR IGNORE INTO delivery_locks(subscription_id,bucket_key) VALUES(?,?)")
        .bind(s.id,bucketKey).run();
      if(lock.meta?.changes){
        entry.status="sending";
        try{
          const pool = Math.random()<0.8?hydration:motivation;
          const result = await push(s,{
            title:"Hydrate",
            body:pool[randomInt(pool.length)],
            url:"https://gouthamplay.github.io/Hydrate/",
            tag:"hydrate-"+dateKey+"-"+m,
            dateKey,
            slotMinutes:s.start_minute+Math.floor((m-s.start_minute)/60)*60,
            reminderType:item.type
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
            console.error("Hydrate scheduled push rejected",JSON.stringify({status:result.status,detail,bucketKey,type:item.type}));
          }else{
            entry.status="accepted";
            entry.pushStatus=result.status;
            await env.DB.prepare("INSERT OR IGNORE INTO sent_notifications(id,subscription_id,scheduled_at,reminder_type) VALUES(?,?,?,?)")
              .bind(crypto.randomUUID(),s.id,bucketKey,item.type).run();
            console.log("Hydrate scheduled push accepted",JSON.stringify({status:result.status,bucketKey,type:item.type}));
          }
        }catch(error){
          await env.DB.prepare("DELETE FROM delivery_locks WHERE subscription_id=? AND bucket_key=?").bind(s.id,bucketKey).run();
          entry.status="exception";
          entry.error=error?.message||String(error);
          entry.stack=String(error?.stack||"").slice(0,700);
          console.error("Hydrate scheduled push exception",JSON.stringify({error:entry.error,stack:entry.stack,bucketKey,hasEndpoint:!!s.endpoint,hasP256dh:!!s.p256dh,hasAuth:!!s.auth,hasVapidPublic:!!getVapidPublicKey(env),hasVapidPrivate:!!env.VAPID_PRIVATE_KEY}));
        }
      }else{
        entry.status="already-processed";
      }
      debug.subscriptions.push(entry);
    }
  }
  await env.DB.prepare("UPDATE scheduler_debug SET details=?,updated_at=? WHERE id=1")
    .bind(JSON.stringify(debug),new Date().toISOString()).run();
}
export default {
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(request)});
    const path=new URL(request.url).pathname;
    try{
      await ensureDiagnostics(env.DB);
      if(request.method==="GET"&&path==="/status"){
        const now=localNow();
        const {results=[]}=await env.DB.prepare(`SELECT p.start_minute,p.end_minute,p.enabled,
          (SELECT COUNT(*) FROM sent_notifications n WHERE n.subscription_id=s.id) AS sent_count,
          (SELECT MAX(sent_at) FROM sent_notifications n WHERE n.subscription_id=s.id) AS last_attempt
          FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id`).all();
        const heartbeat=await env.DB.prepare("SELECT last_run,last_cron,runs,last_error FROM scheduler_heartbeat WHERE id=1").first();
        const schedulerDebug=await env.DB.prepare("SELECT details,updated_at FROM scheduler_debug WHERE id=1").first();
        const userCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first().then(r=>r?.count||0).catch(()=>0);
        return json({
          ok:true,
          timezone:TZ,
          localDate:now.dateKey,
          localMinute:now.minute,
          vapidConfigured:{
            hasPublicKey:Boolean(getVapidPublicKey(env)),
            hasPrivateKeySecret:Boolean(typeof env?.VAPID_PRIVATE_KEY==="string"&&env.VAPID_PRIVATE_KEY.trim())
          },
          heartbeat,
          schedulerDebug,
          totalUsers:userCount,
          subscriptions:results
        },200,request);
      }
      if(request.method==="GET"&&path==="/health"){
        const r=await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions").first();
        return json({ok:true,service:"Hydrate API",database:"connected",subscriptions:r.count},200,request);
      }
      if(request.method==="POST"&&path==="/test-push")return await testPush(request,env);
      if(request.method==="POST"&&path==="/subscribe")return await subscribe(request,env);
      if(request.method==="POST"&&path==="/preferences")return await preferences(request,env);
      if(request.method==="POST"&&path==="/auth/signup")return await handleSignup(request,env);
      if(request.method==="POST"&&path==="/auth/login")return await handleLogin(request,env);
      if(request.method==="GET"&&path==="/auth/me")return await handleMe(request,env);
      if(request.method==="POST"&&path==="/auth/logout")return await handleLogout(request,env);
      if(request.method==="GET"&&path==="/user/data")return await handleGetUserData(request,env);
      if(request.method==="POST"&&path==="/user/sync")return await handleSyncUserData(request,env);
      return json({error:"Not found"},404,request);
    }catch(e){console.error(e);return json({error:e.message||"Server error"},500,request);}
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