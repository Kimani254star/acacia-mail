/* ===== home page ===== */

  function hpMore(btn){
    var card=btn.closest('.hp-tier');
    var open=card.classList.toggle('hp-open');
    btn.innerHTML=open?'Show less &#9652;':'Show '+btn.getAttribute('data-n')+' more features &#9662;';
  }
  function hpBillingToggle(){
    var yearly=document.getElementById('hpBilling').checked;
    document.querySelectorAll('#homePage .hp-amt').forEach(function(el){
      var p=yearly?+el.getAttribute('data-year'):+el.getAttribute('data-month');
      el.textContent='KES '+p.toLocaleString('en-US');
      var per=el.parentElement.querySelector('.hp-per');
      if(per) per.textContent=yearly?'/yr':'/mo';
    });
  }
(function(){
  var root=document.getElementById('homePage');
  var slides=root.querySelectorAll('.hp-slide'),si=0;
  setInterval(function(){
    if(root.style.display!=='block'||slides.length<2) return;
    slides[si].classList.remove('active'); si=(si+1)%slides.length; slides[si].classList.add('active');
  },5000);
  var nav=document.getElementById('hpNav'),burger=document.getElementById('hpBurger');
  burger.addEventListener('click',function(){
    var open=nav.classList.toggle('open');
    burger.setAttribute('aria-expanded',open?'true':'false');
  });
  var pages=root.querySelectorAll('.hp-page');
  var valid={top:1,about:1,features:1,process:1,pricing:1,faq:1,contact:1};
  function show(id){
    if(!valid[id]) id='top';
    pages.forEach(function(p){p.classList.toggle('hp-active',p.getAttribute('data-page')===id);});
    root.querySelectorAll('.hp-nav a').forEach(function(a){a.classList.toggle('hp-current',a.getAttribute('href')==='#'+id);});
    nav.classList.remove('open'); burger.setAttribute('aria-expanded','false');
    root.scrollTop=0;
  }
  root.querySelectorAll('a[data-scroll]').forEach(function(a){
    a.addEventListener('click',function(e){ e.preventDefault(); show(a.getAttribute('href').slice(1)); });
  });
  var y=document.getElementById('footerYear'); if(y) y.textContent=new Date().getFullYear();
  show('top');
  window.hpShowPage=show;
})();
function hpShowHome(){
  document.getElementById('authScreen').style.display='none';
  document.getElementById('homePage').style.display='block';
  window.hpShowPage&&window.hpShowPage('top');
}
function hpHideHome(){ document.getElementById('homePage').style.display='none'; }
function hpShowLogin(tab){
  hpHideHome();
  document.getElementById('authScreen').style.display='flex';
  switchAuthTab(tab||'login');
}
function hpTheme(){
  document.body.classList.toggle('dark');
  try{ var _a=JSON.parse(localStorage.getItem('acacia_mail_settings')||'{}'); _a.theme=document.body.classList.contains('dark')?'Dark':'Light'; localStorage.setItem('acacia_mail_settings',JSON.stringify(_a)); }catch(e){}
  var b=document.getElementById('darkToggle');
  if(b) b.textContent=document.body.classList.contains('dark')?'\u2600':'\uD83C\uDF19';
}
function hpContact(e){
  e.preventDefault();
  var n=document.getElementById('hpName').value.trim(), m=document.getElementById('hpEmail').value.trim(), t=document.getElementById('hpMsg').value.trim();
  var body='From: '+n+' <'+m+'>\n\n'+t;
  window.location.href='mailto:hello@example.com?subject='+encodeURIComponent('Acacia Mail enquiry')+'&body='+encodeURIComponent(body);
  document.getElementById('contactConfirm').classList.remove('hidden');
  return false;
}

/* ===== main app ===== */

const USERS_KEY="acacia_mail_users", SESSION_KEY="acacia_mail_session", MBOX_KEY="acacia_mailbox_";




const SUPA_URL="https://xglsampckermarjpczdf.supabase.co", SUPA_KEY="sb_publishable_x-dPR7pzhvJgag9soW0I8w_yfKTmi6A";
const sb=(window.supabase&&window.supabase.createClient)
  ? window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{storageKey:"acacia-mail-auth",persistSession:true,autoRefreshToken:true}})
  : null;
const toUser=u=>({accountId:u.id,email:u.email,
  name:(u.user_metadata&&u.user_metadata.name)||u.email.split("@")[0],
  company:(u.user_metadata&&u.user_metadata.company)||"",code:(u.user_metadata&&u.user_metadata.join_code)||"",
  booksCompanyId:(u.user_metadata&&u.user_metadata.books_company_id)||""});
const $=s=>document.querySelector(s);
const uid=p=>p+"_"+Math.random().toString(36).slice(2,10);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));


function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||"[]")}catch(e){return[]}}
function saveUsers(l){localStorage.setItem(USERS_KEY,JSON.stringify(l))}
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch(e){return null}}
function setSession(u){localStorage.setItem(SESSION_KEY,JSON.stringify({accountId:u.accountId,email:u.email,name:u.name,company:u.company}))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}

function switchAuthTab(w){
  $("#tabLoginBtn").classList.toggle("active",w==="login");
  $("#tabRegisterBtn").classList.toggle("active",w==="register");
  $("#loginPane").style.display=w==="login"?"block":"none";
  $("#registerPane").style.display=w==="register"?"block":"none";
  $("#loginError").classList.remove("show"); $("#registerError").classList.remove("show");
}
function showAuthError(id,msg){const e=$("#"+id); e.textContent=msg; e.classList.add("show");}

/* ===== Acacia Support link: approval gate + company registration (same tables Books uses) ===== */
const GATE_MSG={
  pending:"Your company is waiting for approval by Acacia Support. You will be able to sign in as soon as it is approved.",
  expired:"This company's subscription has expired. Renew it to get access again.",
  suspended:"This company has been deactivated. Please contact Acacia Support.",
  rejected:"This registration was not approved. Please contact Acacia Support."
};
const restH=()=>({apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY,"Content-Type":"application/json"});
async function fetchCompanyStatus(by,val){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/acacia_company_status?select=company_id,company_name,status,paid_until&"+by+"="+val,{headers:restH()});
    if(!r.ok) return null; const a=await r.json(); return a;
  }catch(e){ return null; }
}
/* "" = allowed, otherwise the reason (pending / expired / suspended / rejected). Companies Support has never heard of are allowed. */
async function companyGate(cid){
  if(!cid) return "";
  const a=await fetchCompanyStatus("company_id","eq."+encodeURIComponent(cid)); const row=a&&a[0];
  if(!row) return "";
  let st=row.status; if(st==="active"&&row.paid_until&&new Date(row.paid_until)<new Date()) st="expired";
  return st==="active"?"":(st||"pending");
}
async function findCompanyByName(name){
  const a=await fetchCompanyStatus("company_name","ilike."+encodeURIComponent(name.replace(/[*%_,()]/g,"")));
  return (a||[]).find(r=>coSlug(r.company_name)===coSlug(name))||null;
}
async function createPendingCompany(id,company,owner,email){
  const row={company_id:id,company_name:company,owner_name:owner,email:email,plan:"Free",price:0,status:"pending"};
  const ext={billing:"Monthly",all_apps:false,apps:"Mail",amount_due:0};
  const H=Object.assign({Prefer:"resolution=ignore-duplicates,return=minimal"},restH());
  let r=await fetch(SUPA_URL+"/rest/v1/acacia_company_status",{method:"POST",headers:H,body:JSON.stringify(Object.assign({},row,ext))});
  if(!r.ok) r=await fetch(SUPA_URL+"/rest/v1/acacia_company_status",{method:"POST",headers:H,body:JSON.stringify(row)});
  return r.ok;
}
async function blockedBy(st){
  try{ await sb.auth.signOut(); }catch(e){}
  switchAuthTab("login"); showAuthError("loginError",GATE_MSG[st]||GATE_MSG.suspended);
}

async function handleRegister(){
  const company=$("#regCompany").value.trim(), name=$("#regName").value.trim(), code=$("#regCode").value.trim();
  const email=$("#regEmail").value.trim().toLowerCase(), password=$("#regPassword").value;
  if(!company||!name||!email||!password) return showAuthError("registerError","Please fill in every field.");
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError("registerError","Enter a valid email address.");
  if(password.length<6) return showAuthError("registerError","Password must be at least 6 characters.");
  if(!sb) return showAuthError("registerError","Could not load Supabase. Check your internet connection.");

  // Is this company already known to Acacia Support (registered in Books or Mail)?
  const known=await findCompanyByName(company);
  let cid="", isNew=false;
  if(known){
    if(!code) return showAuthError("registerError","\""+known.company_name+"\" is already registered. Log in with your company name, email and password, or ask your administrator to add you (or to give you the company code).");
    cid=known.company_id;
  }else if(!code){
    cid="mail_"+coSlug(company).slice(0,24)+"_"+Math.random().toString(36).slice(2,8); isNew=true;
  }
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{name,company,join_code:code,source:"mail",books_company_id:cid}}});
  if(error) return showAuthError("registerError",/already/i.test(error.message)?"An account with that email already exists. Use Log In with your company name, email and password.":error.message);
  if(isNew){ const ok=await createPendingCompany(cid,company,name,email); if(!ok) console.warn("[acacia-mail] could not register company with Support"); }
  if(!data.session) return showAuthError("registerError","Account created. Email confirmation is still switched on in Supabase (Authentication > Providers > Email > Confirm email) - turn it off, then log in.");
  const st=isNew?"pending":await companyGate(cid);
  if(st) return blockedBy(st==="pending"&&isNew?"pending":st);
  enterApp(toUser(data.user));
}

/* Server-side check of the Books/Mail company + email + password; creates or repairs the Mail login so a normal sign-in works afterwards. */
async function booksLogin(company,email,password){
  try{
    const r=await sb.functions.invoke("books-login",{body:{company,email,password}});
    if(r.error){
      const status=(r.error.context&&r.error.context.status)||0; let msg="";
      try{ const j=await r.error.context.json(); msg=(j&&j.error)||""; }catch(e){}
      if(!msg) msg=status===404?"Company sign-in is not set up yet (deploy the books-login function, see SETUP_SEND_MAIL.md).":(r.error.message||"Sign-in failed.");
      return {ok:false,error:msg,status};
    }
    if(r.data&&r.data.error) return {ok:false,error:r.data.error};
    return {ok:true};
  }catch(e){ return {ok:false,error:String((e&&e.message)||e)}; }
}
const sameCompany=(u,typed)=>{ const t=coSlug(typed); return !!t&&(coSlug(u.company)===t||coSlug(u.booksCompanyId)===t); };

async function handleLogin(){
  const company=$("#loginCompany").value.trim();
  const email=$("#loginEmail").value.trim().toLowerCase(), password=$("#loginPassword").value;
  if(!company||!email||!password) return showAuthError("loginError","Please enter your company name, email and password.");
  if(!sb) return showAuthError("loginError","Could not load Supabase. Check your internet connection.");
  const btn=$("#loginBtn"); if(btn){ btn.disabled=true; btn.textContent="Signing in..."; }
  try{
    let session=null, errMsg="", legacy=null;
    let {data,error}=await sb.auth.signInWithPassword({email,password});
    if(!error&&data&&data.session){
      if(sameCompany(toUser(data.user),company)) session=data;
      else{                                   // signed in, but typed another company: confirm it against Books before switching
        const f=await booksLogin(company,email,password);
        if(f.ok){ const r2=await sb.auth.signInWithPassword({email,password}); if(!r2.error&&r2.data&&r2.data.session) session=r2.data; }
        else{ await sb.auth.signOut(); errMsg=/couldn.t find|not found/i.test(f.error)?"That company name does not match this email.":f.error; }
      }
    }else{
      legacy=getUsers().find(u=>u.email===email&&u.password===password)||null;
      if(legacy){
        const r=await sb.auth.signUp({email,password,options:{data:{name:legacy.name,company:legacy.company}}});
        if(r.data&&r.data.session){ session=r.data; } else legacy=null;
      }
      if(!session){
        const f=await booksLogin(company,email,password);
        if(f.ok){ const r2=await sb.auth.signInWithPassword({email,password}); if(!r2.error&&r2.data&&r2.data.session) session=r2.data; else errMsg=r2.error&&/confirm/i.test(r2.error.message)?"Please confirm your email first.":"Could not sign in. Try again."; }
        else errMsg=f.error;
      }
    }
    if(!session) return showAuthError("loginError",errMsg||"That company, email and password combination was not found.");
    const user=toUser(session.user);
    const st=await companyGate(user.booksCompanyId);
    if(st) return blockedBy(st);
    if(legacy){ const old=localStorage.getItem(MBOX_KEY+legacy.accountId); if(old) localStorage.setItem(MBOX_KEY+user.accountId,old); }
    try{ localStorage.setItem("acacia_mail_last_company",company); }catch(e){}
    enterApp(user);
  }finally{ if(btn){ btn.disabled=false; btn.textContent="Log In"; } }
}
async function handleLogout(){
  await stopSync();
  clearSession(); CURRENT=null; messages=[]; contacts=[]; tasks=[]; notes=[];
  $("#app").classList.remove("ready"); $("#authScreen").style.display="flex";
  $("#loginEmail").value=""; $("#loginPassword").value=""; try{ $("#loginCompany").value=localStorage.getItem("acacia_mail_last_company")||""; }catch(e){} $("#userMenuPanel").classList.remove("open");
  switchAuthTab("login");
}
function toggleUserMenu(e){e.stopPropagation(); $("#userMenuPanel").classList.toggle("open");}
document.addEventListener("click",()=>$("#userMenuPanel").classList.remove("open"));



const FOLDERS=[
  {id:"inbox",name:"Inbox",icon:"📥"},{id:"starred",name:"Starred",icon:"★"},
  {id:"sent",name:"Sent",icon:"📤"},{id:"drafts",name:"Drafts",icon:"✎"},
  {id:"scheduled",name:"Scheduled",icon:"🕒"},{id:"outbox",name:"Outbox",icon:"📡"},
  {id:"spam",name:"Spam",icon:"⊘"},{id:"trash",name:"Trash",icon:"🗑"},
  {id:"archive",name:"Archive",icon:"🗄"},{id:"all",name:"All Mail",icon:"📚"}
];
const LABELS=[
  {id:"finance",name:"Finance",color:"#2F6B45"},{id:"clients",name:"Clients",color:"#B98A2E"},
  {id:"urgent",name:"Urgent",color:"#93412C"},{id:"internal",name:"Internal",color:"#3E6B79"}
];

let CURRENT=null, messages=[], contacts=[], tasks=[], notes=[], events=[], seq=1;
let rev=0, lastStr="", dirty=false, pushing=false, pushTimer=null, rtChannel=null;
let state={folder:"inbox",label:null,open:null,selected:new Set(),query:"",rail:"calendar"};
let undoStack=null, toastTimer=null, attachments=[];

function mboxKey(){return MBOX_KEY+CURRENT.accountId}
const snapStr=()=>JSON.stringify({seq,messages,contacts,tasks,notes,events});
function setSync(t){ const b=$("#refresh"); if(b) b.title="Refresh — "+t; if(/error|offline/i.test(t)) console.warn("[acacia-mail sync]",t); }


function saveMailbox(){
  if(!CURRENT) return;
  const str=snapStr(), unsynced=str!==lastStr;
  localStorage.setItem(mboxKey(),JSON.stringify({seq,messages,contacts,tasks,notes,events,rev,unsynced}));
  if(unsynced){ dirty=true; clearTimeout(pushTimer); pushTimer=setTimeout(pushMailbox,800); }
}
function loadMailbox(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(mboxKey())||"null"); }catch(e){}
  const c=d||{seq:1,messages:[],contacts:[],tasks:[],notes:[]};
  seq=c.seq||1; messages=c.messages||[]; contacts=c.contacts||[]; tasks=c.tasks||[]; notes=c.notes||[]; events=(c.events||[]).filter(e=>!(e.del&&Date.now()-(e.upd||0)>60*864e5));
  rev=c.rev||0; dirty=false;
  lastStr=(d&&d.unsynced!==false)?"":snapStr();   
}
function applyRemote(d){ seq=d.seq||1; messages=d.messages||[]; contacts=d.contacts||[]; tasks=d.tasks||[]; notes=d.notes||[]; events=d.events||[]; }

function mergeRemote(rm){
  const key=m=>m.id+"|"+m.date+"|"+m.subject;
  const have=new Set(messages.map(key)), ids=new Set(messages.map(m=>m.id));
  let mx=Math.max(seq,rm.seq||1);
  (rm.messages||[]).forEach(m=>{
    if(have.has(key(m))) return;
    if(ids.has(m.id)) m.id=mx++;          
    ids.add(m.id); messages.push(m);
  });
  (rm.contacts||[]).forEach(c=>{ if(!contacts.some(x=>x.e===c.e)) contacts.push(c); });
  (rm.tasks||[]).forEach(t=>{ if(!tasks.some(x=>x.t===t.t)) tasks.push(t); });
  (rm.notes||[]).forEach(n=>{ if(!notes.some(x=>x.t===n.t&&x.b===n.b)) notes.push(n); });
  (rm.events||[]).forEach(ev=>{ const i=events.findIndex(x=>x.id===ev.id); if(i<0) events.push(ev); else if((ev.upd||0)>(events[i].upd||0)) events[i]=ev; });
  seq=Math.max(mx,...messages.map(m=>(+m.id||0)+1));
}
async function pushMailbox(){
  if(!sb||!CURRENT||pushing||!dirty) return;
  pushing=true; dirty=false;
  const id=CURRENT.accountId, str=snapStr(), snap={seq,messages,contacts,tasks,notes,events};
  let retry=0;
  try{
    let r;
    if(rev===0) r=await sb.from("mail_mailboxes").insert({user_id:id,data:snap,rev:1}).select("rev");
    else r=await sb.from("mail_mailboxes").update({data:snap,rev:rev+1,updated_at:new Date().toISOString()})
                    .eq("user_id",id).eq("rev",rev).select("rev");
    if(CURRENT&&CURRENT.accountId!==id){ pushing=false; return; }
    if(!r.error&&r.data&&r.data.length){ rev=r.data[0].rev; lastStr=str; setSync("synced"); }
    else if(r.error&&r.error.code!=="23505"){ throw r.error; }
    else{                                   
      const g=await sb.from("mail_mailboxes").select("data,rev").eq("user_id",id).maybeSingle();
      if(g.data){ mergeRemote(g.data.data||{}); rev=g.data.rev; renderRail(); render(); }
      dirty=true; retry=300;
    }
  }catch(e){ dirty=true; retry=10000; setSync("sync error: "+(e.message||e)); }
  pushing=false;
  if(dirty) pushTimer=setTimeout(pushMailbox,retry||800);
}
async function syncFromServer(){
  if(!sb||!CURRENT||pushing) return;
  const id=CURRENT.accountId;
  try{
    const r=await sb.from("mail_mailboxes").select("data,rev").eq("user_id",id).maybeSingle();
    if(r.error) throw r.error;
    if(!CURRENT||CURRENT.accountId!==id||!r.data||r.data.rev===rev) return;
    if(snapStr()!==lastStr) mergeRemote(r.data.data||{});      
    else{ applyRemote(r.data.data||{}); lastStr=snapStr(); }   
    rev=r.data.rev; renderRail(); render(); setSync("synced");
  }catch(e){ setSync("offline / sync error: "+(e.message||e)); }
}
async function startSync(){
  if(!sb||!CURRENT) return;
  setSync("syncing…");
  await syncFromServer();
  await ensureCompany(); await pullInbox(); pullBooksDrafts();
  render();                                   
  if(rtChannel){ sb.removeChannel(rtChannel); rtChannel=null; }
  const id=CURRENT.accountId;
  rtChannel=sb.channel("mbox-"+id)
    .on("postgres_changes",{event:"*",schema:"public",table:"mail_mailboxes",filter:"user_id=eq."+id},
        p=>{ if(!p.new||p.new.rev>rev) syncFromServer(); })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"mail_inbox",filter:"to_user=eq."+id},()=>pullInbox())
    .subscribe();
}
async function stopSync(){
  clearTimeout(pushTimer);
  if(sb){
    try{ if(dirty) await pushMailbox(); }catch(e){}
    if(rtChannel){ sb.removeChannel(rtChannel); rtChannel=null; }
    try{ await sb.auth.signOut(); }catch(e){}
  }
  rev=0; lastStr=""; dirty=false;
}
window.addEventListener("focus",()=>{syncFromServer(); pullInbox();});

async function ensureCompany(){
  if(!sb||!CURRENT) return;
  try{
    const r=await sb.rpc("mail_join",{p_name:CURRENT.company,p_code:CURRENT.code||""});
    if(r.error) throw r.error;
    CURRENT.companyId=r.data.company_id; CURRENT.company=r.data.name; CURRENT.joinCode=r.data.join_code;
    if(!CURRENT.code&&CURRENT.joinCode){ CURRENT.code=CURRENT.joinCode; try{ sb.auth.updateUser({data:{join_code:CURRENT.joinCode}}); }catch(e){} }
    $("#menuCompany").textContent=CURRENT.company+" · code "+CURRENT.joinCode;
    const m=await sb.from("mail_members").select("user_id,email,name");
    (m.data||[]).forEach(x=>{ if(x.user_id!==CURRENT.accountId&&!contacts.some(c=>c.e===x.email)) contacts.push({n:x.name,e:x.email}); });
  }catch(e){ setSync("company error: "+(e.message||e)); toast("Company: "+(e.message||e)); }
}
async function deliverInternal(m){
  const done=new Set();
  if(!sb||!CURRENT||!CURRENT.companyId) return done;
  try{
    const mem=(await sb.from("mail_members").select("user_id,email")).data||[];
    const rc=new Set(((m.to||"")+","+(m.cc||"")+","+(m.bcc||"")).split(/[,;\s]+/).map(x=>x.trim().toLowerCase()).filter(Boolean));
    for(const e of rc){
      const t=mem.find(x=>x.email===e&&x.user_id!==CURRENT.accountId); if(!t) continue;
      const copy=Object.assign({},m,{folder:"inbox",read:false,starred:false,labels:[],bcc:"",attachments:(m.attachments||[]).map(a=>({name:a.name,size:a.size}))}); delete copy.id; delete copy.err;
      await sb.from("mail_inbox").insert({company_id:CURRENT.companyId,to_user:t.user_id,from_user:CURRENT.accountId,message:copy});
      done.add(e);
    }
  }catch(e){ setSync("delivery error: "+(e.message||e)); }
  return done;
}
const MAIL_RE=/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/;
const addrList=v=>String(v||"").split(/[,;\s]+/).map(x=>x.trim().toLowerCase()).filter(x=>MAIL_RE.test(x));
/* Everyone who is not an Acacia Mail teammate gets a real email through the send-mail Edge Function. Returns "" on success or a reason. */
async function deliverExternal(m,internal){
  const ext=[...new Set([...addrList(m.to),...addrList(m.cc),...addrList(m.bcc)])].filter(e=>!internal.has(e)&&e!==String(CURRENT.email||"").toLowerCase());
  if(!ext.length) return "";
  if(!sb) return "Could not load Supabase. Check your internet connection.";
  try{
    const ss=await sb.auth.getSession();
    if(!ss.data||!ss.data.session) return "Sign in to Acacia Mail directly (email and password) to send to outside addresses.";
    const pick=v=>addrList(v).filter(e=>ext.includes(e)).join(",");
    const withData=(m.attachments||[]).filter(a=>a.data);
    const r=await sb.functions.invoke("send-mail",{body:{message_id:String(CURRENT.accountId)+"_"+m.id+"_"+new Date(m.date).getTime(),
      to:pick(m.to),cc:pick(m.cc),bcc:pick(m.bcc),subject:m.subject,html:m.body,
      attachments:withData.map(a=>({name:a.name,type:a.type||"",data:String(a.data).split(",").pop()}))}});
    if(r.error){ let msg=r.error.message||"Send failed";
      try{ const j=await r.error.context.json(); if(j&&j.error) msg=j.error; }catch(e){}
      if(/not found|404/i.test(msg)&&!/Email provider/i.test(msg)) msg="Outgoing mail is not set up yet (deploy the send-mail function, see SETUP_SEND_MAIL.md).";
      return msg; }
    if(r.data&&r.data.error) return r.data.error;
    return "";
  }catch(e){ return String((e&&e.message)||e); }
}
async function sendOut(m){
  m.folder="outbox"; m.err=""; saveMailbox();
  const internal=await deliverInternal(m);
  const err=await deliverExternal(m,internal);
  if(err){ m.err=err; m.folder="outbox"; saveMailbox(); render(); toast("Not sent to outside addresses: "+err); return false; }
  m.err=""; m.folder="sent"; m.attachments=(m.attachments||[]).map(a=>({name:a.name,size:a.size}));
  saveMailbox(); render(); logCompanySent(m); return true;
}
async function pullInbox(){
  if(!sb||!CURRENT) return; const id=CURRENT.accountId;
  const r=await sb.from("mail_inbox").select("id,message").eq("to_user",id).order("id");
  if(r.error||!r.data||!r.data.length||!CURRENT||CURRENT.accountId!==id) return;
  r.data.forEach(x=>{ if(!messages.some(m=>m.qid===x.id)) messages.push(M(Object.assign({},x.message,{qid:x.id}))); });
  saveMailbox(); clearTimeout(pushTimer); await pushMailbox();
  if(!dirty) await sb.from("mail_inbox").delete().in("id",r.data.map(x=>x.id));   
  renderRail(); render();
}

function fmtBody(t){
  t=String(t||"").replace(/\r\n?/g,"\n").trim();
  const link=x=>x.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)"'])/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  const html=t?t.split(/\n{2,}/).map(par=>'<p style="margin:0 0 12px">'+link(esc(par)).replace(/\n/g,"<br>")+'</p>').join(""):"<p><br></p>";
  return html+(typeof signature==="function"?signature():"");
}

const BOOKS_QUEUE_KEY="acacia_books_to_mail";
const coSlug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function pullBooksDrafts(){
  if(!CURRENT) return;
  let q=[]; try{ q=JSON.parse(localStorage.getItem(BOOKS_QUEUE_KEY)||"[]")||[]; }catch(e){ return; }
  if(!q.length) return;
  const mine=coSlug(CURRENT.company), keep=[]; let added=0;
  q.forEach(x=>{
    if(!x||coSlug(x.company||x.slug)!==mine){ keep.push(x); return; }   
    if(messages.some(m=>m.bid===x.bid)) return;                         
    messages.push(M({from:x.fromName||x.fromEmail||"Acacia Books",addr:x.fromEmail||"",to:x.to||"",cc:x.cc||"",bcc:x.bcc||"",
      subject:x.subject||"(no subject)",preview:String(x.body||"").replace(/\s+/g," ").slice(0,90),
      body:fmtBody(x.body),date:new Date(x.time||Date.now()).toISOString(),folder:"drafts",read:true,bid:x.bid}));
    added++;
  });
  localStorage.setItem(BOOKS_QUEUE_KEY,JSON.stringify(keep));
  if(added){ saveMailbox(); renderRail(); render(); toast(added+" draft"+(added>1?"s":"")+" from Acacia Books"); }
}
window.addEventListener("storage",e=>{ if(e.key===BOOKS_QUEUE_KEY) pullBooksDrafts(); });
try{ new BroadcastChannel("acacia_books_mail").onmessage=()=>pullBooksDrafts(); }catch(e){}
window.addEventListener("focus",pullBooksDrafts);
window.addEventListener("online",()=>{ dirty=true; pushMailbox(); syncFromServer(); });
const M=o=>Object.assign({id:seq++,read:false,starred:false,labels:[],attachments:[],cc:"",folder:"inbox"},o);

function enterApp(user,opts){
  opts=opts||{};
  CURRENT=user; loadMailbox();
  $("#authScreen").style.display="none"; hpHideHome(); $("#app").classList.add("ready");
  $("#userName").textContent=user.name;
  $("#userMail").textContent=user.email;
  $("#menuCompany").textContent=user.company;
  $("#userAvatar").textContent=user.name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
  state={folder:"inbox",label:null,open:null,selected:new Set(),query:"",rail:"calendar"};
  $("#q").value=""; renderRail(); render();
  if(!opts.noSync) startSync();
  mailHeartbeat();
  startQueuePolling();
  setTimeout(runDeepLink,150);
}

function mailHeartbeat(){
  try{
    const u=CURRENT; if(!u||!u.booksCompanyId) return;
    const k="acx_hb_"+u.booksCompanyId+"_Mail_"+u.email;
    if(Date.now()-Number(localStorage.getItem(k)||0)<300000) return;
    localStorage.setItem(k,String(Date.now()));
    fetch(SUPA_URL+"/rest/v1/rpc/acx_heartbeat",{method:"POST",keepalive:true,
      headers:{"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY},
      body:JSON.stringify({p_company:u.booksCompanyId,p_app:"Mail",p_user:u.email,p_role:""})});
  }catch(e){}
}


const fmt=d=>{const t=new Date(d),n=new Date();
  return t.toDateString()===n.toDateString()
    ? t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    : t.toLocaleDateString([],{month:"short",day:"numeric"});};
const labelOf=id=>LABELS.find(l=>l.id===id);
function inFolder(m){
  if(state.label) return m.labels.includes(state.label)&&m.folder!=="trash";
  if(state.folder==="starred") return m.starred&&m.folder!=="trash";
  if(state.folder==="all") return m.folder!=="trash"&&m.folder!=="spam";
  return m.folder===state.folder;
}
function matchesQuery(m){
  const q=state.query.trim(); if(!q) return true;
  let rest=[],ok=true;
  q.split(/\s+/).forEach(tok=>{
    const [k,...v]=tok.split(":"); const val=v.join(":").toLowerCase();
    if(!v.length){rest.push(tok.toLowerCase());return;}
    const has=s=>String(s??"").toLowerCase().includes(val);
    switch(k.toLowerCase()){
      case "from": ok=ok&&(has(m.from)||has(m.addr)); break;
      case "to": ok=ok&&has(m.to); break;
      case "subject": ok=ok&&has(m.subject); break;
      case "label": ok=ok&&m.labels.some(l=>l.includes(val)); break;
      case "has": ok=ok&&(val==="attachment"?m.attachments.length>0:true); break;
      case "is": ok=ok&&(val==="unread"?!m.read:val==="starred"?m.starred:val==="read"?m.read:true); break;
      case "before": ok=ok&&new Date(m.date)<new Date(val); break;
      case "after": ok=ok&&new Date(m.date)>new Date(val); break;
      default: rest.push(tok.toLowerCase());
    }
  });
  if(rest.length){
    const hay=(m.from+" "+m.addr+" "+m.subject+" "+(m.preview||"")+" "+m.body).toLowerCase();
    ok=ok&&rest.every(r=>hay.includes(r));
  }
  return ok;
}
const visible=()=>messages.filter(m=>inFolder(m)&&matchesQuery(m)).sort((a,b)=>new Date(b.date)-new Date(a.date));

function toast(msg,undo){
  if(!undo&&getMailSettings().toasts===false) return;
  $("#toastMsg").textContent=msg; undoStack=undo||null;
  $("#undoBtn").style.display=undo?"inline":"none";
  $("#toast").classList.add("show"); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$("#toast").classList.remove("show"),5000);
}
const snap=()=>JSON.parse(JSON.stringify(messages));
function withUndo(msg,fn){const before=snap(); fn(); render(); toast(msg,()=>{messages=before; render();});}


function renderSidebar(){
  $("#folders").innerHTML=FOLDERS.map(f=>{
    const set=messages.filter(m=>f.id==="starred"?(m.starred&&m.folder!=="trash")
              :f.id==="all"?(m.folder!=="trash"&&m.folder!=="spam"):m.folder===f.id);
    const unread=set.filter(m=>!m.read).length;
    const active=!state.label&&state.folder===f.id;
    return `<button class="navitem ${active?"active":""}" data-folder="${f.id}"><span>${f.icon}</span><span>${f.name}</span>
      <span class="count">${unread?`<b style="color:#F7EFD8">${unread}</b>`:(set.length||"")}</span></button>`;
  }).join("");
  $("#labels").innerHTML=LABELS.map(l=>`<button class="navitem ${state.label===l.id?"active":""}" data-label="${l.id}">
      <span class="dot" style="background:${l.color}"></span><span>${l.name}</span>
      <span class="count">${messages.filter(m=>m.labels.includes(l.id)).length||""}</span></button>`).join("");
  $("#moveTo").innerHTML=`<option value="">Move to…</option>`+FOLDERS.filter(f=>!["starred","all"].includes(f.id))
    .map(f=>`<option value="${f.id}">${f.name}</option>`).join("");
  const used=Math.min(100,messages.length*2);
  $("#storageBar").style.width=used+"%";
  $("#storageTxt").textContent=`${messages.length} message${messages.length===1?"":"s"} stored`;
  $("#folders").querySelectorAll("[data-folder]").forEach(b=>b.onclick=()=>{
    state.folder=b.dataset.folder; state.label=null; state.open=null; state.selected.clear(); render();});
  if(isAdmin()){ const cb=document.createElement("button"); cb.className="navitem"; cb.innerHTML="<span>👥</span><span>Company Sent</span><span class=\"count\"></span>"; cb.onclick=openCoSent; $("#folders").appendChild(cb); }
  $("#labels").querySelectorAll("[data-label]").forEach(b=>b.onclick=()=>{
    state.label=b.dataset.label; state.open=null; state.selected.clear(); render();});
}


function renderList(){
  const items=visible();
  const viewName=state.label?"Label: "+labelOf(state.label).name:FOLDERS.find(f=>f.id===state.folder).name;
  $("#viewTitle").textContent=viewName;
  $("#selInfo").textContent=state.selected.size?`${state.selected.size} selected`:`${items.length} conversation${items.length===1?"":"s"}`;
  $("#rows").innerHTML=items.length?items.map(m=>`
    <div class="row ${m.read?"":"unread"} ${state.selected.has(m.id)?"sel":""}" data-id="${m.id}">
      <input type="checkbox" data-check="${m.id}" ${state.selected.has(m.id)?"checked":""}>
      <button class="star ${m.starred?"on":""}" data-star="${m.id}">${m.starred?"★":"☆"}</button>
      <span class="from">${esc(["sent","drafts","scheduled","outbox"].includes(m.folder)?"To: "+m.to:m.from)}</span>
      <span class="mid">${m.labels.map(l=>{const L=labelOf(l);return `<span class="lbl" style="background:${L.color}1a;color:${L.color}">${L.name}</span>`}).join("")}
        <span class="subj">${esc(m.subject)}</span> <span class="prev">— ${esc(m.preview||"")}</span></span>
      ${m.attachments.length?'<span title="Attachment">📎</span>':''}
      <span class="when">${fmt(m.date)}</span></div>`).join("")
    : `<div class="empty"><h3>${state.query?"No matching messages":viewName+" is empty"}</h3>
        <div>${state.query?"Try a different search — operators like <b>from:</b>, <b>has:attachment</b> and <b>is:unread</b> are supported."
        :"Messages you write, schedule or receive will appear here. Start by composing one."}</div>
        ${state.query?"":'<div style="margin-top:16px"><button class="btn btn-gold" onclick="openComposer()">✎ Compose a message</button></div>'}</div>`;
  $("#rows").querySelectorAll(".row").forEach(r=>r.onclick=e=>{
    if(e.target.dataset.check!==undefined||e.target.dataset.star!==undefined) return;
    openMail(+r.dataset.id);});
  $("#rows").querySelectorAll("[data-check]").forEach(c=>c.onclick=e=>{
    e.stopPropagation(); const id=+c.dataset.check;
    c.checked?state.selected.add(id):state.selected.delete(id); render();});
  $("#rows").querySelectorAll("[data-star]").forEach(s=>s.onclick=e=>{
    e.stopPropagation(); const m=messages.find(x=>x.id===+s.dataset.star); m.starred=!m.starred; render();});
}


function openMail(id){const m=messages.find(x=>x.id===id); if(!m) return;
  if(m.folder==="drafts"){ openComposer({to:m.to,cc:m.cc,bcc:m.bcc,subject:m.subject,body:m.body,draftId:m.id}); return; }
  m.read=true; state.open=id; render();}
function renderReader(){
  const m=messages.find(x=>x.id===state.open);
  if(!m){$("#reader").style.display="none"; $("#listPane").style.display="flex"; return;}
  $("#reader").style.display="block"; $("#listPane").style.display="none";
  const back=state.label?labelOf(state.label).name:FOLDERS.find(f=>f.id===state.folder).name;
  $("#reader").innerHTML=`
    <button class="btn btn-ghost" id="backBtn">← Back to ${back}</button>
    <div class="rhead">
      <div class="rsubj">${esc(m.subject)}</div>
      <div class="who">
        <div class="avatar" style="background:var(--forest)">${esc((m.from||"?").slice(0,2).toUpperCase())}</div>
        <div><b>${esc(m.from)}</b> <span class="muted">&lt;${esc(m.addr)}&gt;</span>
          <div class="muted">to ${esc(m.to)}${m.cc?", cc "+esc(m.cc):""} · ${new Date(m.date).toLocaleString()}</div></div>
        <div class="spacer"></div>
        <button class="star ${m.starred?"on":""}" id="rStar" style="font-size:20px">${m.starred?"★":"☆"}</button>
      </div>
      <div style="margin-top:8px">${m.labels.map(l=>{const L=labelOf(l);return `<span class="lbl" style="background:${L.color}1a;color:${L.color}">${L.name}</span>`}).join("")}</div>
    </div>
    ${m.folder==="outbox"&&m.err?`<div style="margin:10px 0;padding:10px 12px;border:1px solid var(--bad);border-radius:8px;color:var(--bad);background:color-mix(in srgb,var(--bad) 8%,transparent)">⚠ Not sent: ${esc(m.err)} <button class="btn btn-sm" id="rRetry" style="margin-left:8px">Retry send</button></div>`:""}
    <div class="mail-body">${m.body}</div>
    ${m.attachments.length?`<div style="margin-top:18px"><b>📎 ${m.attachments.length} attachment(s)</b><div>${
      m.attachments.map(a=>`<span class="attach">📄 ${esc(a.name)} <small class="muted">${a.size}</small></span>`).join("")}</div></div>`:""}
    <div class="actions">
      <button class="btn btn-primary" data-r="reply">↩ Reply</button>
      <button class="btn" data-r="all">↩↩ Reply All</button>
      <button class="btn" data-r="fwd">➦ Forward</button>
      <button class="btn" data-act="unread">Mark unread</button>
      <button class="btn" id="rCal" title="Add to calendar with this email attached">📅 Add to calendar</button>
      <button class="btn" data-act="archive">Archive</button>
      <button class="btn" data-act="spam">Spam</button>
      <button class="btn" data-act="trash">${m.folder==="trash"?"Restore":"Delete"}</button>
      <select class="btn" id="rLabel"><option value="">Add label…</option>${LABELS.map(l=>`<option value="${l.id}">${l.name}</option>`).join("")}</select>
    </div>`;
  $("#backBtn").onclick=()=>{state.open=null; render();};
  $("#rStar").onclick=()=>{m.starred=!m.starred; render();};
  $("#reader").querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.r;
    openComposer({to:k==="fwd"?"":m.addr, cc:k==="all"?m.cc||"":"",
      subject:(k==="fwd"?"Fwd: ":"Re: ")+m.subject.replace(/^(Re|Fwd):\s*/i,""),
      body:`<p><br></p><blockquote style="border-left:3px solid #DCD7C6;padding-left:10px;color:#5B5A4E">On ${new Date(m.date).toLocaleString()}, ${esc(m.from)} wrote:<br>${m.body}</blockquote>`});
  });
  $("#reader").querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    withUndo(a==="trash"&&m.folder==="trash"?"Message restored":"Message "+a+"d",()=>{
      if(a==="unread"){m.read=false; state.open=null;}
      else if(a==="trash"){m.folder=m.folder==="trash"?"inbox":"trash"; state.open=null;}
      else {m.folder=a==="archive"?"archive":"spam"; state.open=null;}
    });
  });
  if($("#rRetry")) $("#rRetry").onclick=()=>retrySend(m.id);
  $("#rCal").onclick=()=>openEventModal({title:m.subject&&m.subject!=="(no subject)"?m.subject:"Follow up",mails:[mailRef(m)]});
  $("#rLabel").onchange=e=>{if(e.target.value&&!m.labels.includes(e.target.value)) m.labels.push(e.target.value); render();};
}


document.querySelectorAll("[data-bulk]").forEach(b=>b.onclick=()=>{
  if(!state.selected.size) return toast("Select messages first");
  const a=b.dataset.bulk, ids=[...state.selected];
  withUndo(`${ids.length} message(s) ${a==="read"?"marked read":a==="unread"?"marked unread":a==="star"?"starred":a+"d"}`,()=>{
    ids.forEach(id=>{const m=messages.find(x=>x.id===id);
      if(a==="read") m.read=true; else if(a==="unread") m.read=false;
      else if(a==="star") m.starred=true;
      else m.folder=a==="archive"?"archive":a==="spam"?"spam":"trash";});
    state.selected.clear();});
});
$("#moveTo").onchange=e=>{
  const f=e.target.value; if(!f) return;
  if(!state.selected.size){e.target.value=""; return toast("Select messages first");}
  const ids=[...state.selected];
  withUndo(`Moved ${ids.length} to ${FOLDERS.find(x=>x.id===f).name}`,()=>{
    ids.forEach(id=>messages.find(x=>x.id===id).folder=f); state.selected.clear();});
  e.target.value="";
};
$("#selAll").onchange=e=>{state.selected=e.target.checked?new Set(visible().map(m=>m.id)):new Set(); render();};
$("#undoBtn").onclick=()=>{if(undoStack){undoStack(); undoStack=null;} $("#toast").classList.remove("show");};


function renderRail(){
  const b=$("#railBody"); const now=new Date();
  if(state.rail==="calendar"){ renderCalendar(b); return; }
  if(state.rail==="contacts"){
    b.innerHTML=(contacts.length?contacts.map(c=>`<div class="card" style="display:flex;gap:9px;align-items:center">
        <div class="avatar" style="background:var(--forest)">${esc(c.n.slice(0,2).toUpperCase())}</div>
        <div><b>${esc(c.n)}</b><div class="muted">${esc(c.e)}</div></div></div>`).join("")
      :`<div class="muted" style="padding:6px 2px 12px">No contacts yet. They are added automatically when you send mail.</div>`)
      +`<button class="btn btn-sm" id="addContact">+ Add contact</button>`;
    $("#addContact").onclick=()=>{const n=prompt("Contact name"); if(!n)return; const e=prompt("Email address")||"";
      contacts.push({n,e}); saveMailbox(); renderRail();};
  } else if(state.rail==="tasks"){
    b.innerHTML=(tasks.length?tasks.map((t,i)=>`<div class="card task ${t.d?"done":""}">
        <input type="checkbox" data-task="${i}" ${t.d?"checked":""}><span>${esc(t.t)}</span></div>`).join("")
      :`<div class="muted" style="padding:6px 2px 12px">No tasks yet.</div>`)
      +`<button class="btn btn-sm" id="addTask">+ Add task</button>`;
    b.querySelectorAll("[data-task]").forEach(c=>c.onchange=()=>{tasks[+c.dataset.task].d=c.checked; saveMailbox(); renderRail();});
    $("#addTask").onclick=()=>{const t=prompt("New task"); if(t){tasks.push({t,d:false}); saveMailbox(); renderRail();}};
  } else {
    b.innerHTML=(notes.length?notes.map(n=>`<div class="card"><b>${esc(n.t)}</b><div class="muted">${esc(n.b)}</div></div>`).join("")
      :`<div class="muted" style="padding:6px 2px 12px">No notes yet.</div>`)
      +`<button class="btn btn-sm" id="addNote">+ Add note</button>`;
    $("#addNote").onclick=()=>{const t=prompt("Note title"); if(!t)return; const bo=prompt("Note")||"";
      notes.push({t,b:bo}); saveMailbox(); renderRail();};
  }
}
document.querySelectorAll("[data-rail]").forEach(t=>t.onclick=()=>{
  state.rail=t.dataset.rail;
  document.querySelectorAll("[data-rail]").forEach(x=>x.classList.toggle("active",x===t));
  renderRail();});


let editingDraft=null;
const signature=()=>{
  if(!CURRENT) return "";
  const a=getMailSettings(); if(a.sigOn===false) return "";
  if(a.sigText&&a.sigText.trim()) return `<p style="color:#5B5A4E;font-size:13px">${esc(a.sigText).replace(/\n/g,"<br>")}</p>`;
  return `<p style="color:#5B5A4E;font-size:13px">—<br><b>${esc(CURRENT.name)}</b><br>${esc(CURRENT.company)}<br>${esc(CURRENT.email)}</p>`;
};
function openComposer(pre={}){
  $("#composer").classList.add("open"); $("#overlay").classList.add("open");
  editingDraft=pre.draftId||null;
  const _dcc=(!pre.draftId&&!pre.cc&&getMailSettings().defCc)||"";
  $("#cTo").value=pre.to||""; $("#cCc").value=pre.cc||_dcc; $("#cBcc").value=pre.bcc||"";
  $("#cSubj").value=pre.subject||"";
  $("#cBody").innerHTML=pre.body||("<p><br></p>"+signature());
  $("#ccWrap").style.display=(pre.cc||pre.bcc||_dcc)?"block":"none";
  attachments=[]; renderAttach(); $("#cBody").focus();
}
function closeComposer(){$("#composer").classList.remove("open"); $("#overlay").classList.remove("open"); editingDraft=null;}
function renderAttach(){
  $("#attachList").innerHTML=attachments.map((a,i)=>`<span class="attach">📄 ${esc(a.name)} <small class="muted">${a.size}</small> <button data-rm="${i}">✕</button></span>`).join("");
  $("#attachList").querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{attachments.splice(+b.dataset.rm,1); renderAttach();});
}
function buildMessage(folder){
  const to=$("#cTo").value.trim();
  if(to){ const nm=to.split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    if(!contacts.some(c=>c.e===to)) contacts.push({n:nm,e:to}); }
  return M({from:CURRENT.name,addr:CURRENT.email,to:to||"(no recipient)",cc:$("#cCc").value.trim(),bcc:$("#cBcc").value.trim(),
    subject:$("#cSubj").value.trim()||"(no subject)",preview:$("#cBody").innerText.trim().replace(/\s+/g," ").slice(0,90),
    body:$("#cBody").innerHTML,date:new Date().toISOString(),folder,read:true,attachments:[...attachments]});
}
function commit(folder){
  if(editingDraft) messages=messages.filter(m=>m.id!==editingDraft);
  const m=buildMessage(folder); messages.push(m); return m;
}
$("#composeBtn").onclick=()=>openComposer();
$("#cClose").onclick=$("#cMin").onclick=closeComposer;
$("#overlay").onclick=closeComposer;
$("#toggleCc").onclick=()=>{const w=$("#ccWrap"); w.style.display=w.style.display==="none"?"block":"none";};
document.querySelectorAll(".toolbar [data-cmd]").forEach(b=>b.onmousedown=e=>{e.preventDefault(); document.execCommand(b.dataset.cmd,false,null);});
$("#linkBtn").onmousedown=e=>{e.preventDefault(); const u=prompt("Link URL","https://"); if(u) document.execCommand("createLink",false,u);};
$("#imgBtn").onmousedown=e=>{e.preventDefault(); const u=prompt("Inline image URL","https://"); if(u) document.execCommand("insertImage",false,u);};
$("#sigBtn").onmousedown=e=>{e.preventDefault(); $("#cBody").innerHTML+=signature();};
$("#attachBtn").onclick=()=>$("#fileInput").click();
const ATT_MAX_EACH=3*1024*1024, ATT_MAX_ALL=5*1024*1024;
$("#fileInput").onchange=e=>{
  [...e.target.files].forEach(f=>{
    const used=attachments.reduce((n,a)=>n+(a.bytes||0),0);
    if(f.size>ATT_MAX_EACH) return toast(f.name+" is over 3 MB");
    if(used+f.size>ATT_MAX_ALL) return toast("Attachments are limited to 5 MB per message");
    const r=new FileReader(); r.onload=()=>{ attachments.push({name:f.name,size:(f.size/1024).toFixed(0)+" KB",type:f.type,bytes:f.size,data:r.result}); renderAttach(); }; r.readAsDataURL(f);
  }); e.target.value="";
};
$("#sendBtn").onclick=()=>{
  const m=commit("outbox"); closeComposer(); render();
  toast("Sending…",()=>{messages=messages.filter(x=>x.id!==m.id); render();});
  setTimeout(()=>{ if(!messages.some(x=>x.id===m.id)) return;   
    sendOut(m); },2000);
};
$("#scheduleBtn").onclick=()=>{
  const when=prompt("Send at (YYYY-MM-DD HH:MM)"); if(!when) return;
  const m=commit("scheduled"); m.date=when.replace(" ","T"); closeComposer(); render(); toast("Scheduled for "+when);
};
$("#draftBtn").onclick=()=>{commit("drafts"); closeComposer(); render(); toast("Draft saved");};
$("#discardBtn").onclick=()=>{if(editingDraft) messages=messages.filter(m=>m.id!==editingDraft); closeComposer(); render(); toast("Draft discarded");};


$("#toggleSidebar").onclick=()=>$("#sidebar").classList.toggle("collapsed");
$("#railToggle").onclick=()=>$("#rail").classList.toggle("hidden");
$("#refresh").onclick=()=>{render(); toast("Mailbox refreshed");};
$("#darkToggle").onclick=()=>{ setMailSetting("theme",document.body.classList.contains("dark")?"Light":"Dark"); };
$("#notifBtn").onclick=()=>{state.folder="inbox"; state.label=null; state.query="is:unread"; $("#q").value="is:unread"; state.open=null; render();};
$("#q").oninput=e=>{state.query=e.target.value; state.open=null; render();};
document.addEventListener("keydown",e=>{
  const typing=/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)||document.activeElement.isContentEditable;
  if($("#authScreen").style.display!=="none"&&$("#homePage").style.display!=="block"&&e.key==="Enter"&&typing){
    $("#registerPane").style.display==="block"?handleRegister():handleLogin(); return;}
  if(typing) return;
  if(e.key==="/"){e.preventDefault(); $("#q").focus();}
  if(e.key==="c"){e.preventDefault(); openComposer();}
  if(e.key==="Escape") closeComposer();
});

function render(){
  renderSidebar(); renderList(); renderReader();
  const unread=messages.filter(m=>m.folder==="inbox"&&!m.read).length;
  const badge=$("#notifCount"); badge.textContent=unread; badge.style.display=unread?"flex":"none";
  saveMailbox();
}





const isAdmin=()=>!!CURRENT && /^(admin|administrator|owner|super ?admin)$/i.test(String(CURRENT.role||"").trim());
const SENT_PENDING="acacia_mail_sent_pending";
const sbHeaders=()=>({apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY,"Content-Type":"application/json"});
async function postSentRow(row){
  const r=await fetch(SUPA_URL+"/rest/v1/acacia_mail_sent",{method:"POST",keepalive:true,
    headers:Object.assign({Prefer:"resolution=ignore-duplicates,return=minimal"},sbHeaders()),body:JSON.stringify(row)});
  if(!r.ok) throw new Error("status "+r.status);
}
function logCompanySent(m){
  try{
    const ck=coSlug(CURRENT&&CURRENT.company); if(!ck) return;
    const row={mid:CURRENT.accountId+"_"+m.id+"_"+new Date(m.date).getTime(),company_key:ck,company_name:CURRENT.company||"",
      sender_email:CURRENT.email||"",sender_name:CURRENT.name||"",sender_role:String(CURRENT.role||""),
      "to":m.to||"",cc:m.cc||"",bcc:m.bcc||"",subject:m.subject||"",body:m.body||"",preview:m.preview||"",
      attachments:(m.attachments||[]).map(a=>a.name),sent_at:new Date().toISOString()};
    postSentRow(row).catch(()=>{ try{ const q=JSON.parse(localStorage.getItem(SENT_PENDING)||"[]"); q.push(row); localStorage.setItem(SENT_PENDING,JSON.stringify(q.slice(-100))); }catch(e){} });
  }catch(e){}
}
async function flushSentPending(){
  try{
    const q=JSON.parse(localStorage.getItem(SENT_PENDING)||"[]"); if(!q.length) return;
    const left=[]; for(const row of q){ try{ await postSentRow(row); }catch(e){ left.push(row); } }
    localStorage.setItem(SENT_PENDING,JSON.stringify(left));
  }catch(e){}
}
window.addEventListener("focus",flushSentPending); window.addEventListener("online",flushSentPending);

let coRows=[], coFilter="", coQuery="", coOpen=null;
function ensureCoPanel(){
  if($("#coSent")) return $("#coSent");
  const d=document.createElement("div"); d.id="coSent";
  d.style.cssText="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:16px";
  d.innerHTML=`<div style="background:var(--paper,#fff);color:inherit;border-radius:12px;width:min(980px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(128,128,128,.25);flex-wrap:wrap">
      <b style="font-size:16px">👥 Company Sent Mail</b><span id="coCount" class="muted"></span><span style="flex:1"></span>
      <select id="coWho" class="btn" style="max-width:220px"></select>
      <input id="coQ" placeholder="Search subject, recipient, text…" style="padding:7px 10px;border:1px solid rgba(128,128,128,.4);border-radius:8px;min-width:200px;background:transparent;color:inherit">
      <button class="btn" id="coRefresh">↻ Refresh</button><button class="btn btn-ghost" id="coClose">✕</button></div>
    <div id="coList" style="overflow:auto;padding:6px 10px 14px"></div></div>`;
  document.body.appendChild(d);
  d.onclick=e=>{ if(e.target===d) d.style.display="none"; };
  $("#coClose").onclick=()=>d.style.display="none";
  $("#coRefresh").onclick=loadCoSent;
  $("#coWho").onchange=e=>{ coFilter=e.target.value; coOpen=null; renderCoSent(); };
  $("#coQ").oninput=e=>{ coQuery=e.target.value.toLowerCase(); renderCoSent(); };
  return d;
}
async function loadCoSent(){
  const ck=coSlug(CURRENT&&CURRENT.company); if(!ck) return;
  $("#coList").innerHTML='<p class="muted" style="padding:20px">Loading…</p>';
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/acacia_mail_sent?select=*&company_key=eq."+encodeURIComponent(ck)+"&order=sent_at.desc&limit=500",{headers:sbHeaders()});
    if(!r.ok) throw new Error("status "+r.status);
    coRows=await r.json();
  }catch(e){ coRows=[]; $("#coList").innerHTML='<p style="padding:20px;color:#93412C">Could not load company sent mail ('+esc(e.message||e)+'). Run fix_mail_sent_log.sql in Supabase.</p>'; return; }
  renderCoSent();
}
function renderCoSent(){
  const who={}; coRows.forEach(r=>{ const k=(r.sender_email||r.sender_name||"?").toLowerCase(); who[k]=who[k]||{n:r.sender_name||r.sender_email,c:0}; who[k].c++; });
  $("#coWho").innerHTML='<option value="">All users ('+coRows.length+')</option>'+Object.keys(who).sort().map(k=>`<option value="${esc(k)}"${coFilter===k?" selected":""}>${esc(who[k].n)} (${who[k].c})</option>`).join("");
  const rows=coRows.filter(r=>(!coFilter||(r.sender_email||r.sender_name||"?").toLowerCase()===coFilter)&&
    (!coQuery||[r.subject,r.to,r.cc,r.bcc,r.sender_name,r.sender_email,r.preview].join(" ").toLowerCase().includes(coQuery)));
  $("#coCount").textContent=rows.length+" message"+(rows.length===1?"":"s");
  if(!rows.length){ $("#coList").innerHTML='<p class="muted" style="padding:20px">No sent mail recorded yet for this company.</p>'; return; }
  $("#coList").innerHTML=rows.map(r=>{
    const open=coOpen===r.mid, att=(r.attachments||[]).length;
    return `<div data-mid="${esc(r.mid)}" style="border-bottom:1px solid rgba(128,128,128,.2);padding:10px 8px;cursor:pointer">
      <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="min-width:150px">${esc(r.sender_name||r.sender_email)}</b>
        <span style="flex:1;min-width:200px"><b>${esc(r.subject||"(no subject)")}</b> <span class="muted">— ${esc(r.preview||"")}</span></span>
        <span class="muted" style="white-space:nowrap">${att?"📎 ":""}${new Date(r.sent_at).toLocaleString()}</span></div>
      <div class="muted" style="font-size:12px">from ${esc(r.sender_email||"")} · to ${esc(r.to||"-")}${r.cc?" · cc "+esc(r.cc):""}${r.bcc?" · bcc "+esc(r.bcc):""}</div>
      ${open?`<iframe sandbox="allow-popups allow-popups-to-escape-sandbox" style="width:100%;height:340px;border:1px solid rgba(128,128,128,.3);border-radius:8px;margin-top:8px;background:#fff" srcdoc="${esc('<base target="_blank"><body style="font:14px/1.5 sans-serif;color:#222;margin:12px">'+(r.body||"")+'</body>')}"></iframe>`:""}</div>`;
  }).join("");
  $("#coList").querySelectorAll("[data-mid]").forEach(el=>el.onclick=()=>{ coOpen=(coOpen===el.dataset.mid)?null:el.dataset.mid; renderCoSent(); });
}
function openCoSent(){ ensureCoPanel().style.display="flex"; coFilter=""; coQuery=""; coOpen=null; $("#coQ").value=""; loadCoSent(); }


const DEEP=(function(){ try{ const q=new URLSearchParams(location.search); if(!(q.get("bid")||q.get("to")||q.get("subject")||q.get("body"))) return null;
  return {bid:q.get("bid"),uid:q.get("uid")||("u"+Date.now()),to:q.get("to")||"",cc:q.get("cc")||"",bcc:q.get("bcc")||"",subject:q.get("subject")||"",body:q.get("body")||""}; }catch(e){ return null; } })();
function runDeepLink(){
  if(!DEEP||DEEP.done||!CURRENT) return;
  let m=null;
  if(DEEP.bid){ m=messages.find(x=>x.bid===DEEP.bid); if(!m){ DEEP.tries=(DEEP.tries||0)+1; if(DEEP.tries<24) setTimeout(runDeepLink,500); return; } }
  else{ m=messages.find(x=>x.bid===DEEP.uid);
    if(!m){ m=M({from:CURRENT.name,addr:CURRENT.email,to:DEEP.to,cc:DEEP.cc,bcc:DEEP.bcc,subject:DEEP.subject||"(no subject)",
      preview:DEEP.body.replace(/\s+/g," ").slice(0,90),body:fmtBody(DEEP.body),date:new Date().toISOString(),folder:"drafts",read:true,bid:DEEP.uid}); messages.push(m); saveMailbox(); } }
  DEEP.done=true;
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  state.folder="drafts"; render();
  openComposer({to:m.to==="(no recipient)"?"":m.to,cc:m.cc,bcc:m.bcc,subject:m.subject,body:m.body,draftId:m.id});
}

function fromBooksSession(){
  try{
    var u=JSON.parse(localStorage.getItem("loggedInUser")||"null");
    if(!u||!u.companyId) return null;
    return { accountId:String(u.email||u.username||u.companyId).toLowerCase(), email:u.email||"", name:u.fullName||u.username||u.email||"Team member", company:u.companyName||"", companyId:String(u.companyId), booksCompanyId:String(u.companyId), role:String(u.role||"") };
  }catch(e){ return null; }
}
const mailCoKey=()=>String((CURRENT&&(CURRENT.booksCompanyId||CURRENT.companyId))||"");
const seenKey=()=>"acx_seen_bids_"+(CURRENT?CURRENT.accountId:"");
function seenBids(){ try{ return new Set(JSON.parse(localStorage.getItem(seenKey())||"[]")); }catch(e){ return new Set(); } }
async function pullMailQueueFromCloud(){
  const co=mailCoKey(); if(!CURRENT||!co) return;
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/acacia_mail_queue?select=*&order=created_at.asc&company_id=eq."+encodeURIComponent(co),
      { headers:{ apikey:SUPA_KEY, Authorization:"Bearer "+SUPA_KEY } });
    if(!r.ok) return;
    const rows=await r.json(); if(!rows.length) return;
    // Drafts are shared by the whole company: rows stay in the cloud, each mailbox remembers what it already took.
    const seen=seenBids(); let added=0;
    rows.forEach(x=>{
      if(seen.has(x.bid)) return; seen.add(x.bid);
      if(messages.some(m=>m.bid===x.bid)) return;
      messages.push(M({from:x.from_name||x.from_email||"Acacia Books",addr:x.from_email||"",to:x.to||"",cc:x.cc||"",bcc:x.bcc||"",
        subject:x.subject||"(no subject)",preview:String(x.body||"").replace(/\s+/g," ").slice(0,90),
        body:fmtBody(x.body),date:new Date(x.created_at||Date.now()).toISOString(),folder:"drafts",read:true,bid:x.bid}));
      added++;
    });
    try{ localStorage.setItem(seenKey(),JSON.stringify([...seen].slice(-500))); }catch(e){}
    if(added){ saveMailbox(); renderRail(); render(); toast(added+" draft"+(added>1?"s":"")+" for "+(CURRENT.company||"your company")); }
  }catch(e){ console.warn("[mail cloud]", e); }
}
let queueTimer=null;
function startQueuePolling(){
  pullMailQueueFromCloud();
  if(queueTimer) return;
  queueTimer=setInterval(pullMailQueueFromCloud,30000);
  window.addEventListener("focus",pullMailQueueFromCloud);
}
try{ const lc=$("#loginCompany"); if(lc) lc.value=localStorage.getItem("acacia_mail_last_company")||""; }catch(e){}
(async function boot(){
  const bk=fromBooksSession();
  if(bk){
    setSession(bk); enterApp(bk,{noSync:true});
    pullBooksDrafts();
    return;
  }
  if(sb){
    try{ const {data}=await sb.auth.getSession();
      if(data&&data.session){
        const u=toUser(data.session.user), st=await companyGate(u.booksCompanyId);
        if(st){ hpHideHome(); $("#authScreen").style.display="flex"; await blockedBy(st); return; }
        enterApp(u); return; } }catch(e){}
  }
  hpShowHome();
})();

/* ===== Mail settings (mirrors Support: sidebar colours, font, size, theme, plus mail options) ===== */
const MAIL_SET_KEY="acacia_mail_settings";
const MAIL_SB_PRESETS=["#16302A","#0A1615","#22615D","#1e3a8a","#4c1d95","#7f1d1d","#374151","#ffffff"];
function getMailSettings(){ try{ return JSON.parse(localStorage.getItem(MAIL_SET_KEY)||"{}")||{}; }catch(e){ return {}; } }
function saveMailSettings(a){ try{ localStorage.setItem(MAIL_SET_KEY,JSON.stringify(a)); }catch(e){} }
function applyMailTheme(mode){
  let r=mode||"Light"; if(r==="System") r=(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"Dark":"Light";
  document.body.classList.toggle("dark",r==="Dark");
  const b=document.getElementById("darkToggle"); if(b) b.textContent=r==="Dark"?"☀":"🌙";
}
function applyMailSettings(){
  const a=getMailSettings(), st=document.documentElement.style;
  const map={sbBg:"--sb-bg",sbText:"--sb-text",font:"--app-font",zoom:"--app-zoom"};
  if(a.fs&&!a.zoom){ a.zoom={"11.5px":"1","13px":"1.15","14.5px":"1.3","16px":"1.45"}[a.fs]||"1.15"; }
  Object.keys(map).forEach(k=>{ if(a[k]) st.setProperty(map[k],a[k]); else st.removeProperty(map[k]); });
  if(a.accent){ st.setProperty("--gold",a.accent); st.setProperty("--gold-deep",a.accent); } else { st.removeProperty("--gold"); st.removeProperty("--gold-deep"); }
  applyMailTheme(a.theme||(document.body.classList.contains("dark")?"Dark":"Light"));
  document.body.classList.remove("density-compact","density-comfy");
  if(a.density==="compact") document.body.classList.add("density-compact");
  if(a.density==="comfy") document.body.classList.add("density-comfy");
  const sb=document.getElementById("sidebar"); if(sb&&a.sidebarHidden!==undefined) sb.classList.toggle("collapsed",!!a.sidebarHidden);
  const rl=document.getElementById("rail"); if(rl&&a.rail!==undefined) rl.classList.toggle("hidden",!a.rail);
  const set=(id,v)=>{ const el=document.getElementById(id); if(el&&v!==undefined&&v!=="") el.value=v; };
  set("stSbBg",a.sbBg||"#16302a"); set("stSbText",a.sbText||"#e7e4d6"); set("stAccent",a.accent||"#b98a2e");
  set("stFont",a.font||"'Cambria', Georgia, serif"); set("stFs",a.zoom||"1.15");
  set("stTheme",a.theme||"Light"); set("stDensity",a.density||"normal"); set("stSig",a.sigText||""); set("stCc",a.defCc||"");
  const chk=(id,v)=>{ const el=document.getElementById(id); if(el) el.checked=!!v; };
  chk("stRail",a.rail!==undefined?a.rail:!(document.getElementById("rail")||{classList:{contains:()=>false}}).classList.contains("hidden"));
  set("stDefRem",a.defReminder===undefined?15:a.defReminder); chk("stRemNotify",a.remNotify!==false); chk("stRemSound",a.remSound!==false);
  chk("stSidebar",!a.sidebarHidden); chk("stToast",a.toasts!==false); chk("stSigOn",a.sigOn!==false);
  const v1=document.getElementById("stSbBgVal"); if(v1) v1.textContent=a.sbBg||"default";
  const v2=document.getElementById("stSbTextVal"); if(v2) v2.textContent=a.sbText||"default";
  const v3=document.getElementById("stAccentVal"); if(v3) v3.textContent=a.accent||"default";
}
function setMailSetting(k,v){ const a=getMailSettings(); a[k]=v; saveMailSettings(a); applyMailSettings(); }
function resetMailAppearance(){ const a=getMailSettings(); ["sbBg","sbText","accent","font","fs","zoom"].forEach(k=>delete a[k]); saveMailSettings(a); applyMailSettings(); }
function resetMailSettings(){ if(!confirm("Reset all Mail settings to their defaults?")) return; localStorage.removeItem(MAIL_SET_KEY); applyMailSettings(); }
function exportMailSettings(){
  const blob=new Blob([JSON.stringify(getMailSettings(),null,2)],{type:"application/json"});
  const l=document.createElement("a"); l.href=URL.createObjectURL(blob); l.download="acacia-mail-settings.json"; l.click();
}
function openMailSettings(){ applyMailSettings(); document.getElementById("settingsModal").classList.add("open"); }
function closeMailSettings(){ document.getElementById("settingsModal").classList.remove("open"); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeMailSettings(); });
(function(){
  const p=document.getElementById("stPresets");
  if(p) MAIL_SB_PRESETS.forEach(c=>{ const b=document.createElement("button"); b.type="button"; b.style.background=c; b.title=c;
    b.onclick=()=>{ const a=getMailSettings(); a.sbBg=c; a.sbText=(c.toLowerCase()==="#ffffff")?"#16302a":"#e7e4d6"; saveMailSettings(a); applyMailSettings(); }; p.appendChild(b); });
  applyMailSettings();
  const mq=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)");
  if(mq&&mq.addEventListener) mq.addEventListener("change",()=>{ if(getMailSettings().theme==="System") applyMailSettings(); });
})();

/* ===== Calendar: events, attachments (files + emails), reminders, synced through the mailbox ===== */
const CAL_MAX_FILE=500*1024, CAL_MAX_FILES=5;
let calView=(()=>{const n=new Date(); return {y:n.getFullYear(),m:n.getMonth(),sel:ymd(n)};})();
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
const liveEvents=()=>events.filter(e=>!e.del);
const evStart=e=>{ const t=e.allDay||!e.s?"08:00":e.s; return new Date(e.d+"T"+t+":00"); };
const evsOn=day=>liveEvents().filter(e=>e.d===day).sort((a,b)=>(a.allDay?"":a.s||"").localeCompare(b.allDay?"":b.s||""));
const REM_OPTS=[[0,"At time of event"],[5,"5 minutes before"],[10,"10 minutes before"],[15,"15 minutes before"],[30,"30 minutes before"],[60,"1 hour before"],[120,"2 hours before"],[1440,"1 day before"],[2880,"2 days before"],[10080,"1 week before"]];
const remLabel=m=>(REM_OPTS.find(o=>o[0]===m)||[m,m+" min before"])[1];
const mailRef=m=>({id:m.id,subject:m.subject||"(no subject)",from:m.from||m.addr||"",date:m.date,folder:m.folder});
const fmtTime=t=>{ if(!t) return ""; const [h,mi]=t.split(":").map(Number); return ((h%12)||12)+":"+String(mi).padStart(2,"0")+(h<12?" AM":" PM"); };

function renderCalendar(b){
  const {y,m,sel}=calView, now=new Date(), todayS=ymd(now);
  const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
  const cells=Array.from({length:days},(_,i)=>{ const d=i+1, ds=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"), n=evsOn(ds).length;
    return `<div class="cd ${ds===todayS?"today":""} ${ds===sel?"sel":""}" data-day="${ds}">${d}${n?`<i class="evdot"></i>`:""}</div>`; }).join("");
  const dayEv=evsOn(sel);
  const up=[]; for(let i=1;i<=7;i++){ const dt=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i); evsOn(ymd(dt)).forEach(e=>up.push(e)); }
  const card=e=>`<div class="card evcard" data-ev="${esc(e.id)}"><div style="display:flex;gap:8px;align-items:baseline"><b style="flex:1">${esc(e.t||"(untitled)")}</b><span class="muted" style="font-size:11px">${e.allDay?"All day":fmtTime(e.s)+(e.e?" – "+fmtTime(e.e):"")}</span></div>
    ${e.loc?`<div class="muted" style="font-size:11.5px">📍 ${esc(e.loc)}</div>`:""}
    <div class="evbadges">${(e.rem||[]).length?`<span>🔔 ${e.rem.length}</span>`:""}${(e.att||[]).length?`<span>📎 ${e.att.length}</span>`:""}${(e.mails||[]).length?`<span>✉ ${e.mails.length}</span>`:""}</div></div>`;
  const selDate=new Date(sel+"T00:00:00");
  b.innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-sm" id="calPrev">‹</button>
      <b style="flex:1;text-align:center">${new Date(y,m,1).toLocaleDateString([],{month:"long",year:"numeric"})}</b>
      <button class="btn btn-sm" id="calNext">›</button><button class="btn btn-sm" id="calToday">Today</button></div>
    <div class="cal" style="margin-top:8px">${["S","M","T","W","T","F","S"].map(d=>`<div class="dow">${d}</div>`).join("")}${"<div></div>".repeat(first)}${cells}</div></div>
    <div class="card"><div style="display:flex;align-items:center"><b style="flex:1">${sel===todayS?"Today":selDate.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})}</b><button class="btn btn-sm btn-gold" id="calAdd">+ Add event</button></div>
      <div style="margin-top:8px">${dayEv.length?dayEv.map(card).join(""):`<div class="muted">No events scheduled.</div>`}</div></div>
    ${up.length?`<div class="card"><b>Next 7 days</b><div class="muted" style="font-size:11px;margin:2px 0 6px">Click an event to edit it</div>${up.slice(0,8).map(e=>`<div class="upitem" data-ev="${esc(e.id)}"><span class="muted">${new Date(e.d+"T00:00:00").toLocaleDateString([],{weekday:"short",day:"numeric"})}</span> ${esc(e.t||"(untitled)")} <span class="muted">${e.allDay?"":fmtTime(e.s)}</span></div>`).join("")}</div>`:""}`;
  $("#calPrev").onclick=()=>{ calView.m--; if(calView.m<0){calView.m=11;calView.y--;} renderCalendar(b); };
  $("#calNext").onclick=()=>{ calView.m++; if(calView.m>11){calView.m=0;calView.y++;} renderCalendar(b); };
  $("#calToday").onclick=()=>{ const n=new Date(); calView={y:n.getFullYear(),m:n.getMonth(),sel:ymd(n)}; renderCalendar(b); };
  $("#calAdd").onclick=()=>openEventModal({date:sel});
  b.querySelectorAll("[data-day]").forEach(c=>{ c.onclick=()=>{ calView.sel=c.dataset.day; renderCalendar(b); }; c.ondblclick=()=>openEventModal({date:c.dataset.day}); });
  b.querySelectorAll("[data-ev]").forEach(c=>c.onclick=()=>openEventModal({id:c.dataset.ev}));
}

let EV=null;
function openEventModal(pre){
  pre=pre||{}; const ex=pre.id?events.find(e=>e.id===pre.id&&!e.del):null;
  const cfg=getMailSettings(), defRem=cfg.defReminder===undefined?15:Number(cfg.defReminder);
  EV=ex?JSON.parse(JSON.stringify(ex)):{id:"ev_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:pre.title||"",d:pre.date||ymd(new Date()),s:"09:00",e:"10:00",allDay:false,loc:"",notes:"",
      rem:defRem>=0?[defRem]:[],att:[],mails:pre.mails||[],isNew:true};
  $("#evTitle").value=EV.t; $("#evDate").value=EV.d; $("#evAll").checked=!!EV.allDay; $("#evStart").value=EV.s||"09:00"; $("#evEnd").value=EV.e||"";
  $("#evLoc").value=EV.loc||""; $("#evNotes").value=EV.notes||"";
  $("#evRemSel").innerHTML=REM_OPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("");
  $("#evRemSel").value="15";
  const cand=messages.filter(m=>m.folder!=="trash").sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,150);
  $("#evMailSel").innerHTML='<option value="">Attach an email…</option>'+cand.map(m=>`<option value="${m.id}">${esc((m.subject||"(no subject)").slice(0,60))} — ${esc(String(m.from||m.addr||"").slice(0,28))}</option>`).join("");
  $("#evDel").style.display=ex?"inline-flex":"none"; $("#evHead").textContent=ex?"Edit event":"New event";
  evToggleAll(); evRenderLists(); $("#eventModal").classList.add("open"); $("#evTitle").focus();
}
function closeEventModal(){ $("#eventModal").classList.remove("open"); EV=null; }
function evToggleAll(){ const a=$("#evAll").checked; $("#evTimes").style.display=a?"none":"flex"; }
function evRenderLists(){
  $("#evRemList").innerHTML=(EV.rem||[]).length?EV.rem.slice().sort((a,b)=>a-b).map(r=>`<span class="chip">🔔 ${esc(remLabel(r))} <button data-rr="${r}">✕</button></span>`).join(""):'<span class="muted">No reminders</span>';
  $("#evRemList").querySelectorAll("[data-rr]").forEach(b=>b.onclick=()=>{ EV.rem=EV.rem.filter(x=>x!==+b.dataset.rr); evRenderLists(); });
  $("#evAttList").innerHTML=((EV.att||[]).map((a,i)=>`<span class="chip">📄 <a href="#" data-dl="${i}">${esc(a.n)}</a> <small class="muted">${esc(a.size)}</small> <button data-ra="${i}">✕</button></span>`).join(""))
    +((EV.mails||[]).map((m,i)=>`<span class="chip">✉ <a href="#" data-om="${i}">${esc(String(m.subject).slice(0,40))}</a> <button data-rm2="${i}">✕</button></span>`).join(""))||'<span class="muted">Nothing attached</span>';
  const L=$("#evAttList");
  L.querySelectorAll("[data-ra]").forEach(b=>b.onclick=()=>{ EV.att.splice(+b.dataset.ra,1); evRenderLists(); });
  L.querySelectorAll("[data-rm2]").forEach(b=>b.onclick=()=>{ EV.mails.splice(+b.dataset.rm2,1); evRenderLists(); });
  L.querySelectorAll("[data-dl]").forEach(a=>a.onclick=e=>{ e.preventDefault(); const f=EV.att[+a.dataset.dl]; const l=document.createElement("a"); l.href=f.data; l.download=f.n; l.click(); });
  L.querySelectorAll("[data-om]").forEach(a=>a.onclick=e=>{ e.preventDefault(); const r=EV.mails[+a.dataset.om]; const m=messages.find(x=>x.id===r.id);
    if(!m) return toast("That email is no longer in this mailbox"); collectEv(); saveEvent(true); closeEventModal();
    state.folder=m.folder; state.label=null; state.query=""; $("#q").value=""; state.selected.clear(); m.read=true; state.open=m.id; render(); });
}
function collectEv(){
  EV.t=$("#evTitle").value.trim(); EV.d=$("#evDate").value; EV.allDay=$("#evAll").checked; EV.s=$("#evStart").value; EV.e=$("#evEnd").value;
  EV.loc=$("#evLoc").value.trim(); EV.notes=$("#evNotes").value;
}
function saveEvent(silent){
  collectEv();
  if(!EV.t) { if(silent) return false; toast("Give the event a title"); return false; }
  if(!EV.d) { toast("Pick a date"); return false; }
  const rec=Object.assign({},EV); delete rec.isNew; rec.upd=Date.now(); delete rec.del;
  const i=events.findIndex(x=>x.id===rec.id); if(i<0) events.push(rec); else events[i]=rec;
  saveMailbox(); calView.sel=rec.d; const d=new Date(rec.d+"T00:00:00"); calView.y=d.getFullYear(); calView.m=d.getMonth();
  state.rail="calendar"; document.querySelectorAll("[data-rail]").forEach(x=>x.classList.toggle("active",x.dataset.rail==="calendar"));
  renderRail(); if(!silent) toast("Event saved"+((rec.rem||[]).length?" · reminder set":""));
  return true;
}
function deleteEvent(){
  if(!EV||!confirm("Delete this event?")) return;
  const i=events.findIndex(x=>x.id===EV.id); if(i>=0){ events[i]={id:EV.id,del:true,upd:Date.now()}; saveMailbox(); }
  closeEventModal(); renderRail(); toast("Event deleted");
}
function askNotifyPermission(){ try{ if("Notification" in window&&Notification.permission==="default") Notification.requestPermission(); }catch(e){} }
(function wireEventModal(){
  $("#evAll").onchange=evToggleAll;
  $("#evCancel").onclick=closeEventModal;
  $("#evSave").onclick=()=>{ if(saveEvent()){ if((EV.rem||[]).length) askNotifyPermission(); closeEventModal(); } };
  $("#evDel").onclick=deleteEvent;
  $("#evRemAdd").onclick=()=>{ const v=+$("#evRemSel").value; if(!EV.rem.includes(v)) EV.rem.push(v); evRenderLists(); askNotifyPermission(); };
  $("#evFile").onchange=e=>{
    [...e.target.files].forEach(f=>{
      if((EV.att||[]).length>=CAL_MAX_FILES) return toast("Up to "+CAL_MAX_FILES+" files per event");
      if(f.size>CAL_MAX_FILE) return toast(f.name+" is over "+Math.round(CAL_MAX_FILE/1024)+" KB (calendar files sync with your mailbox, so keep them small)");
      const r=new FileReader(); r.onload=()=>{ EV.att.push({n:f.name,size:(f.size/1024).toFixed(0)+" KB",type:f.type,data:r.result}); evRenderLists(); }; r.readAsDataURL(f);
    }); e.target.value="";
  };
  $("#evMailAdd").onclick=()=>{ const id=$("#evMailSel").value; if(!id) return; const m=messages.find(x=>String(x.id)===id); if(!m) return;
    if(!(EV.mails||[]).some(x=>x.id===m.id)) EV.mails.push(mailRef(m)); evRenderLists(); $("#evMailSel").value=""; };
  $("#eventModal").onclick=e=>{ if(e.target.id==="eventModal") closeEventModal(); };
})();

/* ---- reminders: checked every 20 s while Mail is open; the events themselves sync, so every device you are signed in on reminds you ---- */
const remFiredKey=()=>"acx_rem_fired_"+(CURRENT?CURRENT.accountId:"");
const remSnoozeKey=()=>"acx_rem_snooze_"+(CURRENT?CURRENT.accountId:"");
const lsJ=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||"null")||d; }catch(e){ return d; } };
function remBeep(){ try{ const c=new (window.AudioContext||window.webkitAudioContext)(), o=c.createOscillator(), g=c.createGain(); o.connect(g); g.connect(c.destination);
  o.frequency.value=880; g.gain.value=.08; o.start(); setTimeout(()=>{o.stop();c.close();},350); }catch(e){} }
function showReminder(ev,mins,key){
  let box=document.getElementById("remStack"); if(!box){ box=document.createElement("div"); box.id="remStack"; document.body.appendChild(box); }
  const st=evStart(ev), when=ev.allDay?"All day":fmtTime(ev.s);
  const el=document.createElement("div"); el.className="remcard";
  el.innerHTML=`<div style="font-size:11px;opacity:.75">🔔 ${mins>0?"Starts in "+(mins>=1440?Math.round(mins/1440)+" day(s)":mins>=60?Math.round(mins/60)+" hour(s)":mins+" min"):"Starting now"}</div>
    <b>${esc(ev.t||"Event")}</b><div style="font-size:12px;opacity:.85">${st.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})} · ${when}${ev.loc?" · "+esc(ev.loc):""}</div>
    <div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-sm" data-o="open">Open</button><button class="btn btn-sm" data-o="snooze">Snooze 10 min</button><button class="btn btn-sm" data-o="dismiss">Dismiss</button></div>`;
  el.querySelector('[data-o="dismiss"]').onclick=()=>el.remove();
  el.querySelector('[data-o="open"]').onclick=()=>{ el.remove(); openEventModal({id:ev.id}); };
  el.querySelector('[data-o="snooze"]').onclick=()=>{ const f=lsJ(remFiredKey(),{}); delete f[key]; localStorage.setItem(remFiredKey(),JSON.stringify(f));
    const s=lsJ(remSnoozeKey(),{}); s[key]=Date.now()+10*60000; localStorage.setItem(remSnoozeKey(),JSON.stringify(s)); el.remove(); };
  box.appendChild(el);
  const cfg=getMailSettings();
  if(cfg.remSound!==false) remBeep();
  try{ if(cfg.remNotify!==false&&"Notification" in window&&Notification.permission==="granted") new Notification(ev.t||"Event reminder",{body:st.toLocaleString([],{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+(ev.loc?" · "+ev.loc:"")}); }catch(e){}
}
function checkReminders(){
  if(!CURRENT) return;
  const now=Date.now(), fired=lsJ(remFiredKey(),{}), snooze=lsJ(remSnoozeKey(),{}); let changed=false;
  liveEvents().forEach(ev=>{
    const start=evStart(ev).getTime(); if(isNaN(start)) return;
    (ev.rem||[]).forEach(mins=>{
      const key=ev.id+"|"+mins+"|"+ev.d+(ev.s||""), at=start-mins*60000;
      if(snooze[key]){ if(now>=snooze[key]){ delete snooze[key]; changed=true; showReminder(ev,Math.max(0,Math.round((start-now)/60000)),key); fired[key]=now; } return; }
      if(fired[key]) return;
      if(now>=at&&now<=start+60*60000){ fired[key]=now; changed=true; showReminder(ev,mins,key); }
      else if(now>start+60*60000){ fired[key]=now; changed=true; }   // too old: mark done silently
    });
  });
  if(changed){ try{ localStorage.setItem(remFiredKey(),JSON.stringify(fired)); localStorage.setItem(remSnoozeKey(),JSON.stringify(snooze)); }catch(e){} }
}
setInterval(checkReminders,20000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) checkReminders(); });
setTimeout(checkReminders,2500);

/* ---- scheduled messages are sent automatically at their time while Mail is open ---- */
let schedBusy=false;
async function runScheduled(){
  if(schedBusy||!CURRENT) return; schedBusy=true;
  try{
    const due=messages.filter(m=>m.folder==="scheduled"&&new Date(m.date)<=new Date());
    for(const m of due){ m.date=new Date().toISOString(); const ok=await sendOut(m); if(ok) toast("Scheduled message sent to "+m.to); }
  }catch(e){}
  schedBusy=false;
}
setInterval(runScheduled,30000); setTimeout(runScheduled,4000);
async function retrySend(id){ const m=messages.find(x=>x.id===id); if(!m) return; toast("Sending…"); const ok=await sendOut(m); if(ok) toast("Sent"); }
