const heroHydration=["A little water can reset your moment.","Give your body the refresh it deserves.","One small sip is a good place to start.","Make room for a little water break.","Your next good habit can start with a sip.","Pause for water. Your future self says thanks.","A calmer moment starts with a little hydration.","Keep your water close and your day flowing."];
const heroMotivation=["Small habits make a lasting difference.","Keep showing up for yourself.","Progress is built one small step at a time.","You deserve the care you give everything else.","Consistency matters more than perfection.","Make today count in your own way.","A little progress is still progress.","Take your time. Keep moving forward."];
const notificationHydration=["A little sip can make a nice difference.","Your water break is waiting. 💧","Pause what you're doing. Time to hydrate.","Give yourself a quick refresh.","Your bottle called. It misses you.","A quick sip before the next big thing.","Take a moment. Refill yourself.","Water break? Sounds like a good idea.","A little water, then back to it.","Keep your day flowing. 💧"];
const notificationMotivation=["Small habits. Big changes.","Progress is built one little action at a time.","Make time for yourself, too.","Keep showing up for yourself.","You deserve the same care you give everything else.","Great things start with small habits.","Consistency beats perfection.","Be proud of the little things you do for yourself."];
function notificationBody(){const pool=Math.random()<0.8?notificationHydration:notificationMotivation;return pool[Math.floor(Math.random()*pool.length)]}

const HYDRATE_API="https://hydrate-api.gouthamplay.workers.dev";
const VAPID_PUBLIC_KEY="BHGpfDlb42JYGsZb553YAlkxETVnKsFfgTvd8ZVpXhSMP-_VfE-8qc7QIPE1gtSPlJfwE_gr3OqMs8PW2ZmTYHg";
const PUSH_SUB_KEY="hydrate-push-subscription-v1";
function decodeApplicationKey(value){const s=value.replace(/-/g,"+").replace(/_/g,"/");const raw=atob(s+"=".repeat((4-s.length%4)%4));return Uint8Array.from(raw,ch=>ch.charCodeAt(0))}
async function syncPushPreferences(){const raw=localStorage.getItem(PUSH_SUB_KEY);if(!raw)return;const sub=JSON.parse(raw);const res=await fetch(HYDRATE_API+"/preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,start:state.start,end:state.end})});if(!res.ok)throw new Error("Could not sync reminder settings")}
async function connectPush(reg){let sub=await reg.pushManager.getSubscription();if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeApplicationKey(VAPID_PUBLIC_KEY)})}
const payload={subscription:sub.toJSON(),start:state.start,end:state.end};
const res=await fetch(HYDRATE_API+"/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||"Could not register this device")}
localStorage.setItem(PUSH_SUB_KEY,JSON.stringify(sub.toJSON()));return sub}

function heroPhrase(now=new Date()){const hour=now.getHours(),day=key(now);let seed=0;for(const ch of day+"-"+hour)seed=(seed*31+ch.charCodeAt(0))>>>0;const pool=seed%5===0?heroMotivation:heroHydration;return pool[seed%pool.length]}
function renderHero(){const el=$("heroQuote");if(!el)return;const words=heroPhrase().split(" "),cut=Math.max(2,Math.ceil(words.length*.48));el.innerHTML=words.slice(0,cut).join(" ")+"<br><i>"+words.slice(cut).join(" ")+"</i>"}

const KEY="hydrate-data-v1",PROFILE_KEY="hydrate-profile-v1",defaults={start:"07:00",end:"21:00",logs:{},quickChecks:[]};
let state=read();
const $=id=>document.getElementById(id);
function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {...defaults}}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function key(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function log(){return state.logs[key()]||{}}
function statusOf(v){return typeof v==="string"?v:v?.status||""}
function timeOf(v){return typeof v==="object"&&v?.timestamp?new Date(v.timestamp):null}
function exactTime(d){return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
function minutes(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function label(n){let h=Math.floor(n/60),m=n%60;return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:"numeric",minute:m?"2-digit":undefined})}
function times(){let a=minutes(state.start),b=minutes(state.end),r=[];if(b<a)return r;for(let n=a;n<=b;n+=60)r.push(n);return r}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}

/* Theme Management */
const THEME_KEY="hydrate-theme";
const THEMES=["system","light","dark","emerald"];
const THEME_META_COLORS={light:"#eaf6ff",dark:"#09131d",emerald:"#e8f7ee"};

function getSystemPrefersDark(){
  return Boolean(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function currentTheme(){
  try{
    return localStorage.getItem(THEME_KEY)||"system";
  }catch(e){
    return "system";
  }
}

function applyTheme(theme){
  const root=document.documentElement;
  const metaColorScheme=document.querySelector('meta[name="color-scheme"]');
  const metaThemeColor=document.getElementById("metaThemeColor");

  root.dataset.theme=theme;

  if(theme==="dark"){
    if(metaColorScheme)metaColorScheme.content="dark";
    if(metaThemeColor)metaThemeColor.content=THEME_META_COLORS.dark;
  }else if(theme==="emerald"){
    if(metaColorScheme)metaColorScheme.content="light";
    if(metaThemeColor)metaThemeColor.content=THEME_META_COLORS.emerald;
  }else if(theme==="light"){
    if(metaColorScheme)metaColorScheme.content="light";
    if(metaThemeColor)metaThemeColor.content=THEME_META_COLORS.light;
  }else{
    if(metaColorScheme)metaColorScheme.content="light dark";
    const darkNow=getSystemPrefersDark();
    if(metaThemeColor)metaThemeColor.content=darkNow?THEME_META_COLORS.dark:THEME_META_COLORS.light;
  }
  updateThemeUI(theme);
}

function setTheme(theme){
  try{
    if(theme==="system"){
      localStorage.removeItem(THEME_KEY);
    }else{
      localStorage.setItem(THEME_KEY,theme);
    }
  }catch(e){}
  applyTheme(theme);
  const titles={system:"System (Auto)",light:"Ocean (Light)",dark:"Midnight (Dark)",emerald:"Forest (Emerald)"};
  toast("Theme set to "+(titles[theme]||theme));
}

function cycleTheme(){
  const cur=currentTheme();
  const idx=THEMES.indexOf(cur);
  const next=THEMES[(idx+1)%THEMES.length];
  setTheme(next);
}

function updateThemeUI(theme){
  const isDark=theme==="dark"||(theme==="system"&&getSystemPrefersDark());
  const quickIcon=$("quickThemeIcon");
  if(quickIcon){
    if(theme==="dark")quickIcon.textContent="🌙";
    else if(theme==="emerald")quickIcon.textContent="🌿";
    else if(theme==="light")quickIcon.textContent="☀️";
    else quickIcon.textContent=isDark?"🌙":"☀️";
  }

  const menuThemeLabel=$("menuThemeLabel");
  if(menuThemeLabel){
    const titles={system:"Theme: System (Auto)",light:"Theme: Ocean (Light)",dark:"Theme: Midnight (Dark)",emerald:"Theme: Forest (Emerald)"};
    menuThemeLabel.textContent=titles[theme]||"Theme: System";
  }

  const sysDesc=$("themeSystemDesc");
  if(sysDesc){
    sysDesc.textContent=`Auto (${getSystemPrefersDark()?"Dark":"Light"})`;
  }

  document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
    const active=btn.dataset.themeChoice===theme;
    btn.setAttribute("aria-checked",active?"true":"false");
    btn.classList.toggle("active",active);
  });
}

function render(){
  let t=times(),l=log(),yes=t.filter(x=>statusOf(l[x])==="yes").length,answered=t.filter(x=>statusOf(l[x])==="yes"||statusOf(l[x])==="no").length,p=t.length?Math.round(yes/t.length*100):0;
  const todayQuick=(state.quickChecks||[]).filter(x=>x.date===key()).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  $("today").textContent=new Date().toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  $("score").innerHTML=yes+' <small>/ '+t.length+'</small>';
  $("percent").textContent=p+"%";
  $("ring").style.background='conic-gradient(var(--brand) '+p*3.6+'deg, var(--line) 0deg)';
  $("bar").style.width=p+"%";
  $("scoreNote").textContent=answered===t.length&&t.length?"All check-ins answered for today.":yes?yes+" positive check-in"+(yes===1?"":"s")+" so far.":"A fresh start. Your next check-in is waiting.";
  $("answered").textContent=(answered+todayQuick.length)+" logged";
  const quickBySlot=new Map();
  todayQuick.forEach(q=>{
    const d=new Date(q.timestamp),m=d.getHours()*60+d.getMinutes(),start=minutes(state.start),slot=start+Math.floor((m-start)/60)*60;
    if(m>=start&&slot<=minutes(state.end)){
      if(!quickBySlot.has(slot))quickBySlot.set(slot,[]);
      quickBySlot.get(slot).push(d);
    }
  });
  $("slots").innerHTML=t.map(x=>{
    const v=l[x],st=statusOf(v),at=timeOf(v),quick=quickBySlot.get(x)||[],quickTimes=quick.map(exactTime);
    return '<div class="slot '+(st||'')+(quick.length?' has-quick':'')+'"><span>'+label(x)+'</span><b>'+(st==="yes"?"YES":st==="no"?"NO":"—")+'</b>'+(at?'<small>'+exactTime(at)+'</small>':'')+(quick.length?'<small class="quick-count">'+quick.length+' quick log'+(quick.length===1?'':'s')+'</small><small class="quick-times">'+quickTimes.join(" · ")+'</small>':'')+'</div>';
  }).join("");
  let now=new Date(),m=now.getHours()*60+now.getMinutes(),n=t.find(x=>x>=m&&!statusOf(l[x]));
  $("next").textContent=n===undefined?"Done for today":label(n);
  $("windowText").textContent=t.length?"Your reminder window: "+label(t[0])+" – "+label(t[t.length-1]):"Choose a valid start and end time.";
  $("start").value=state.start;
  $("end").value=state.end;
  renderMonth();
  renderHero();
  updateThemeUI(currentTheme());
  if("Notification"in window)$("pushState").textContent=Notification.permission==="granted"?"Browser permission granted; use Test notification to connect":Notification.permission==="denied"?"Blocked in browser settings":"Not enabled";
}

function showCheckinPrompt(){const el=$("checkinOverlay");el.classList.add("visible");el.setAttribute("aria-hidden","false")}
function hideCheckinPrompt(){const el=$("checkinOverlay");el.classList.remove("visible");el.setAttribute("aria-hidden","true")}
function currentSlot(now=new Date()){const t=times();if(!t.length)return null;const m=now.getHours()*60+now.getMinutes();let target=t[0];for(const x of t){if(x<=m)target=x;else break}return target}
function answer(v){const now=new Date(),target=currentSlot(now),day=key(now);hideCheckinPrompt();if(target===null){toast("No check-in times are configured.");return}const l=state.logs[day]||{};state.logs[day]={...l,[target]:{status:v,timestamp:now.toISOString()}};persist();render();$("feedback").textContent="Reminder recorded at "+exactTime(now)+".";toast((v==="yes"?"Reminder marked Yes at ":"Reminder marked No at ")+exactTime(now))}
function quickCheckin(){const now=new Date();state.quickChecks=Array.isArray(state.quickChecks)?state.quickChecks:[];state.quickChecks.push({date:key(now),timestamp:now.toISOString(),status:"yes"});persist();render();$("feedback").textContent="Quick check-in saved at "+exactTime(now)+".";toast("Check-in logged at "+exactTime(now))}
function renderMonth(){let d=new Date(),y=d.getFullYear(),mo=d.getMonth(),count=new Date(y,mo+1,0).getDate(),offset=new Date(y,mo,1).getDay(),total=0,yes=0,h="";for(let i=0;i<offset;i++)h+="<div></div>";for(let n=1;n<=count;n++){let k=key(new Date(y,mo,n)),vals=Object.values(state.logs[k]||{});total+=vals.length;yes+=vals.filter(x=>statusOf(x)==="yes").length;const extra=(state.quickChecks||[]).filter(x=>x.date===k);total+=extra.length;yes+=extra.filter(x=>x.status==="yes").length;h+='<div class="'+(vals.length&&vals.every(x=>x==="yes")?"good ":"")+(n===d.getDate()?"today":"")+'">'+n+"</div>"}$("month").textContent=d.toLocaleDateString([],{month:"short",year:"numeric"});$("rate").textContent=total?Math.round(yes/total*100)+"%":"—";$("calendar").innerHTML=h}

$("yes").onclick=quickCheckin;
$("save").onclick=()=>{
  let a=$("start").value,b=$("end").value;
  if(!a||!b||b<=a){toast("End time must be after start time.");return}
  state.start=a;state.end=b;persist();render();
  if(localStorage.getItem(PUSH_SUB_KEY)){
    syncPushPreferences().then(()=>toast("Reminder window saved and synced.")).catch(e=>toast("Saved locally; cloud sync failed."));
  }else toast("Reminder window saved.");
};

$("notify").onclick=async()=>{
  if(!("Notification"in window)){toast("Notifications are not available in this browser.");return}
  const standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
  if(!standalone){toast("Install Hydrate from Safari Home Screen first.");return}
  try{
    let p=Notification.permission;
    if(p!=="granted")p=await Notification.requestPermission();
    render();
    if(p!=="granted"){toast("Notification permission was not granted.");return}
    const reg=await navigator.serviceWorker.ready;
    await connectPush(reg);
    await reg.showNotification("Hydrate",{body:notificationBody(),icon:"./apple-touch-icon.png",badge:"./apple-touch-icon.png",tag:"hydrate-test",data:{url:"./",openCheckin:true}});
    toast("Notifications enabled and test sent.");
  }catch(e){toast("Could not show notification. Check iPhone notification settings.");console.error(e)}
};

$("export").onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hydrate-backup-"+key()+".json";a.click();URL.revokeObjectURL(url);toast("Backup exported.")};
$("import").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(!x.logs||typeof x.logs!=="object")throw 0;state={...defaults,...x};persist();render();toast("Backup restored.")}catch{toast("Invalid backup file.")}e.target.value=""};
$("promptYes").onclick=()=>answer("yes");
$("promptNo").onclick=()=>answer("no");

function closeMenu(){$("appMenu").classList.remove("visible");$("menuBackdrop").classList.remove("visible");$("appMenu").setAttribute("aria-hidden","true");$("menuTrigger").setAttribute("aria-expanded","false")}
function openMenu(){$("appMenu").classList.add("visible");$("menuBackdrop").classList.add("visible");$("appMenu").setAttribute("aria-hidden","false");$("menuTrigger").setAttribute("aria-expanded","true")}
$("menuTrigger").onclick=openMenu;
$("menuClose").onclick=closeMenu;
$("menuBackdrop").onclick=closeMenu;

function showPage(name){$("homePage").hidden=name!=="home";$("settingsPage").hidden=name!=="settings";window.scrollTo({top:0,behavior:"instant"})}
$("menuSettings").onclick=()=>{closeMenu();showPage("settings")};
$("settingsBack").onclick=()=>showPage("home");

$("clearLogs").onclick=()=>{
  if(!window.confirm("Delete all Hydrate check-in logs on this device? This cannot be undone. Export a backup first if you want to keep them."))return;
  state.logs={};state.quickChecks=[];persist();render();toast("All check-in logs cleared.");
};

function readProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}")}catch{return {}}}
$("menuProfile").onclick=()=>{closeMenu();$("profileName").value=readProfile().name||"";$("profileOverlay").classList.add("visible");$("profileOverlay").setAttribute("aria-hidden","false")};
function closeProfile(){$("profileOverlay").classList.remove("visible");$("profileOverlay").setAttribute("aria-hidden","true")}
$("profileClose").onclick=closeProfile;
$("profileSave").onclick=()=>{localStorage.setItem(PROFILE_KEY,JSON.stringify({name:$("profileName").value.trim()}));closeProfile();toast("Profile saved on this device.")};

/* Wire Theme Controls */
$("quickThemeBtn").onclick=cycleTheme;
$("menuTheme").onclick=cycleTheme;
document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
  btn.onclick=()=>setTheme(btn.dataset.themeChoice);
});

window.addEventListener("storage",e=>{
  if(e.key===THEME_KEY)applyTheme(currentTheme());
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{
    if(currentTheme()==="system")applyTheme("system");
  });
}

applyTheme(currentTheme());

if("serviceWorker"in navigator){
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderHero()});
  window.addEventListener("focus",renderHero);
  setInterval(renderHero,60000);
  navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="HYDRATE_OPEN_CHECKIN")showCheckinPrompt()});
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

render();
renderHero();

const launchParams=new URLSearchParams(location.search);
if(launchParams.get("checkin")==="1"){showCheckinPrompt();history.replaceState(null,"",location.pathname)}

$("remoteTest").onclick=async()=>{
  const raw=localStorage.getItem(PUSH_SUB_KEY);
  if(!raw){toast("Connect notifications first using Test notification.");return}
  try{
    const sub=JSON.parse(raw);
    const res=await fetch(HYDRATE_API+"/test-push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Remote test failed");
    toast("Remote push accepted. Check your iPhone notifications.");
  }catch(e){toast(e.message||"Could not send remote test.");console.error(e)}
};