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
async function scheduler(env){
  const {dateKey,minute}=localNow();
  const {results=[]}=await env.DB.prepare(`SELECT s.id,s.endpoint,s.p256dh,s.auth,p.start_minute,p.end_minute
    FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id WHERE p.enabled=1`).all();
  for(const s of results){
    // Process the current minute and up to four preceding minutes so a delayed
    // Cron invocation does not silently miss a scheduled reminder.
    const due=[];
    for(let m=Math.max(0,minute-4);m<=minute;m++){
      if(m<s.start_minute||m>s.end_minute)continue;
      const hourly=(m-s.start_minute)%60===0;
      const plan=await dailyPlan(env.DB,s.id,dateKey,s.start_minute,s.end_minute);
      const surprise=plan.includes(m);
      if(hourly||surprise)due.push({minute:m,type:hourly?"hourly":"surprise"});
    }
    for(const item of due){
      const m=item.minute;
      const scheduledAt=dateKey+"T"+String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
      const ins=await env.DB.prepare("INSERT OR IGNORE INTO sent_notifications(id,subscription_id,scheduled_at,reminder_type) VALUES(?,?,?,?)")
        .bind(crypto.randomUUID(),s.id,scheduledAt,item.type).run();
      if(!ins.meta?.changes)continue;
      const pool=Math.random()<0.8?hydration:motivation;
      try{
        const result=await push(s,{title:"Hydrate",body:pool[randomInt(pool.length)],url:"https://gouthamplay.github.io/Hydrate/",tag:"hydrate-"+dateKey+"-"+m,dateKey,slotMinutes:s.start_minute+Math.floor((m-s.start_minute)/60)*60,reminderType:item.type},env);
        if(result.status===404||result.status===410){
          await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(s.id).run();
        }else if(!result.ok){
          await env.DB.prepare("DELETE FROM sent_notifications WHERE subscription_id=? AND scheduled_at=?").bind(s.id,scheduledAt).run();
          console.error("Hydrate push rejected",JSON.stringify({status:result.status,body:(await result.text()).slice(0,500),type:item.type,scheduledAt}));
        }else{
          console.log("Hydrate push accepted",JSON.stringify({status:result.status,type:item.type,scheduledAt}));
        }
      }catch(e){
        await env.DB.prepare("DELETE FROM sent_notifications WHERE subscription_id=? AND scheduled_at=?").bind(s.id,scheduledAt).run();
        console.error("Hydrate push exception",JSON.stringify({message:e?.message||String(e),type:item.type,scheduledAt}));
      }
    }
  }
}
export default {
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
    const path=new URL(request.url).pathname;
    try{
      if(request.method==="GET"&&path==="/status"){
        const now=localNow();
        const {results=[]}=await env.DB.prepare(`SELECT p.start_minute,p.end_minute,p.enabled,
          (SELECT COUNT(*) FROM sent_notifications n WHERE n.subscription_id=s.id) AS sent_count,
          (SELECT MAX(sent_at) FROM sent_notifications n WHERE n.subscription_id=s.id) AS last_attempt
          FROM subscriptions s JOIN preferences p ON p.subscription_id=s.id`).all();
        return json({ok:true,timezone:TZ,localDate:now.dateKey,localMinute:now.minute,subscriptions:results});
      }
      if(request.method==="GET"&&path==="/health"){
        const r=await env.DB.prepare("SELECT COUNT(*) AS count FROM subscriptions").first();
        return json({ok:true,service:"Hydrate API",database:"connected",subscriptions:r.count});
      }
      if(request.method==="POST"&&path==="/subscribe")return await subscribe(request,env);
      if(request.method==="POST"&&path==="/preferences")return await preferences(request,env);
      return json({error:"Not found"},404);
    }catch(e){console.error(e);return json({error:e.message||"Server error"},500);}
  },
  async scheduled(controller,env,ctx){ctx.waitUntil(scheduler(env));}
};