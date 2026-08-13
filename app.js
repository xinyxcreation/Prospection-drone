const KEY = "prospection-drone-v1";
const DEFAULT_CARDS = 100;

let state = loadState();
let currentTab = "agencies";
let currentId = null;

const $ = id => document.getElementById(id);

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random(); }
function today(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){
  if(!d) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR",{dateStyle:"short"}).format(new Date(d+"T12:00:00"));
}
function esc(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function initials(name){ return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }

function blankState(){
  return {version:1, settings:{cardsStock:DEFAULT_CARDS}, agencies:[], diagnosticians:[]};
}
function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw) return blankState();
    const s=JSON.parse(raw);
    s.settings ||= {cardsStock:DEFAULT_CARDS};
    s.agencies ||= []; s.diagnosticians ||= [];
    return s;
  }catch(e){ return blankState(); }
}
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }

function list(){ return state[currentTab]; }
function statusInfo(p){
  const last=p.visits?.[p.visits.length-1];
  if(!last) return ["never","Jamais visité"];
  return last.status==="accepted"?["accepted","Accord"]:last.status==="attention"?["attention","En attention"]:["refused","Refus"];
}
function totals(){
  const all=[...state.agencies,...state.diagnosticians];
  const visits=all.reduce((n,p)=>n+(p.visits?.length||0),0);
  const accepted=all.reduce((n,p)=>n+(p.visits||[]).filter(v=>v.status==="accepted").length,0);
  const attention=all.reduce((n,p)=>n+(p.visits||[]).filter(v=>v.status==="attention").length,0);
  const refused=all.reduce((n,p)=>n+(p.visits||[]).filter(v=>v.status==="refused").length,0);
  const quotes=all.reduce((n,p)=>n+(p.quotes?.length||0),0);
  const cards=all.reduce((n,p)=>n+(p.visits||[]).reduce((x,v)=>x+(Number(v.cardsGiven)||0),0),0);
  return {all,visits,accepted,attention,refused,quotes,cards};
}
function renderDashboard(){
  const t=totals();
  const tab=list();
  $("dashboard").innerHTML=[
    ["🏢",tab.length,currentTab==="agencies"?"Agences":"Diagnostiqueurs"],
    ["📅",tab.reduce((n,p)=>n+(p.visits?.length||0),0),"Visites"],
    ["🟢",tab.reduce((n,p)=>n+(p.visits||[]).filter(v=>v.status==="accepted").length,0),"Accords"],
    ["🧾",tab.reduce((n,p)=>n+(p.quotes?.length||0),0),"Demandes de devis"],
    ["🪪",state.settings.cardsStock,"Cartes restantes"]
  ].map(x=>`<div class="stat"><div class="value">${x[0]} ${x[1]}</div><div class="label">${x[2]}</div></div>`).join("");
}
function renderCards(){
  const q=$("search").value.trim().toLowerCase();
  const filter=$("statusFilter").value;
  let arr=list().filter(p=>{
    const hay=[p.name,p.city,p.contact,p.phone,p.email].join(" ").toLowerCase();
    if(q && !hay.includes(q)) return false;
    const [st]=statusInfo(p);
    if(filter==="never") return st==="never";
    return filter==="all" || st===filter;
  }).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  if(!arr.length){
    $("prospects").innerHTML=`<div class="empty">Aucun prospect dans cette vue.<br><br><button class="primary" onclick="openCreate()">＋ Ajouter un prospect</button></div>`;
    return;
  }
  $("prospects").innerHTML=arr.map(p=>{
    const [st,label]=statusInfo(p);
    const visits=p.visits?.length||0;
    const cards=(p.visits||[]).reduce((n,v)=>n+(Number(v.cardsGiven)||0),0);
    const quotes=p.quotes?.length||0;
    const last=p.visits?.length ? p.visits[p.visits.length-1].date : null;
    return `<article class="prospect-card" onclick="openDetails('${p.id}')">
      <div class="card-head">
        <div class="avatar">${esc(initials(p.name))}</div>
        <div class="card-title"><h2>${esc(p.name)}</h2><p class="city">${esc(p.city||"Autour de Châteaubriant")}</p></div>
        <span class="status-pill status-${st}">${label}</span>
      </div>
      <div class="card-metrics">
        <span>📅 <b>${visits}</b> visite${visits>1?"s":""}</span>
        <span>🪪 <b>${cards}</b> carte${cards>1?"s":""}</span>
        <span>🧾 <b>${quotes}</b> devis</span>
      </div>
      <div class="card-footer"><span class="last-visit">${last?"Dernière visite : "+fmtDate(last):"Pas encore visité"}</span><button class="details-btn">Détails →</button></div>
    </article>`;
  }).join("");
}
function render(){ renderDashboard(); renderCards(); }

function openCreate(){
  currentId=null;
  $("modalType").textContent=currentTab==="agencies"?"Nouvelle agence immobilière":"Nouveau diagnostiqueur";
  $("modalTitle").textContent="Ajouter un prospect";
  $("modalLocation").textContent="Autour de Châteaubriant";
  $("modalBody").innerHTML=`
    <div class="detail-section"><div class="form-grid">
      <div class="field full"><label>Nom *</label><input id="f_name" autofocus></div>
      <div class="field"><label>Ville</label><input id="f_city" value="Châteaubriant"></div>
      <div class="field"><label>Contact</label><input id="f_contact"></div>
      <div class="field"><label>Téléphone</label><input id="f_phone"></div>
      <div class="field"><label>E-mail</label><input id="f_email" type="email"></div>
      <div class="field full"><label>Adresse / notes</label><textarea id="f_notes"></textarea></div>
    </div></div>
    <div class="detail-section"><div class="row"><button class="primary" onclick="saveProspect()">Créer le prospect</button><button class="secondary" onclick="closeModal()">Annuler</button></div></div>`;
  showModal();
}
function saveProspect(){
  const name=$("f_name").value.trim();
  if(!name){ toast("Le nom est obligatoire"); return; }
  list().push({id:uid(),name,city:$("f_city").value.trim(),contact:$("f_contact").value.trim(),phone:$("f_phone").value.trim(),email:$("f_email").value.trim(),notes:$("f_notes").value.trim(),visits:[],quotes:[]});
  save(); closeModal(); render(); toast("Prospect ajouté");
}
function openDetails(id){
  currentId=id;
  const p=list().find(x=>x.id===id); if(!p) return;
  const [st,label]=statusInfo(p);
  $("modalType").textContent=currentTab==="agencies"?"Agence immobilière":"Diagnostiqueur immobilier";
  $("modalTitle").textContent=p.name;
  $("modalLocation").textContent=[p.city,p.contact].filter(Boolean).join(" · ")||"Autour de Châteaubriant";
  const totalGiven=(p.visits||[]).reduce((n,v)=>n+(Number(v.cardsGiven)||0),0);
  const quotes=p.quotes||[];
  $("modalBody").innerHTML=`
    <div class="detail-section"><h3>Vue d'ensemble</h3>
      <div class="detail-stats">
        <div class="detail-stat"><b>${p.visits.length}</b><span>visites</span></div>
        <div class="detail-stat"><b>${totalGiven}</b><span>cartes données</span></div>
        <div class="detail-stat"><b>${quotes.length}</b><span>demandes de devis</span></div>
      </div>
    </div>
    <div class="detail-section"><h3>Coordonnées</h3>
      <div class="muted">${esc(p.contact||"Contact non renseigné")}</div>
      <div class="muted">${esc(p.phone||"Téléphone non renseigné")}</div>
      <div class="muted">${esc(p.email||"E-mail non renseigné")}</div>
      <div class="muted">${esc(p.notes||"Aucune note")}</div>
      <div class="row" style="margin-top:10px"><button class="secondary" onclick="editProspect()">Modifier</button><button class="danger" onclick="deleteProspect()">Supprimer</button></div>
    </div>
    <div class="detail-section"><h3>Nouvelle visite</h3>
      <div class="form-grid">
        <div class="field"><label>Date de visite</label><input id="v_date" type="date" value="${today()}"></div>
        <div class="field"><label>Résultat</label><select id="v_status"><option value="accepted">🟢 Accord</option><option value="attention" selected>🟠 En attention</option><option value="refused">🔴 Refus</option></select></div>
        <div class="field"><label>Cartes de visite laissées</label><input id="v_cards" type="number" min="0" value="0"></div>
        <div class="field full"><label>Compte rendu</label><textarea id="v_note" placeholder="Ce qui a été dit, prochaine relance…"></textarea></div>
      </div>
      <div class="row" style="margin-top:10px"><button class="primary" onclick="addVisit()">Enregistrer la visite</button></div>
    </div>
    <div class="detail-section"><h3>Historique des visites</h3>
      <div class="timeline">${p.visits.length ? p.visits.slice().reverse().map((v,i)=>`<div class="timeline-item ${v.status}">
        <div class="timeline-top"><b>${fmtDate(v.date)} — ${v.status==="accepted"?"Accord":v.status==="attention"?"En attention":"Refus"}</b><span>${Number(v.cardsGiven)||0} carte(s)</span></div>
        <div class="timeline-meta">${esc(v.note||"Aucun compte rendu")}</div>
      </div>`).join("") : '<span class="muted">Aucune visite enregistrée.</span>'}</div>
    </div>
    <div class="detail-section"><h3>Demandes de devis <span class="muted">(${quotes.length})</span></h3>
      <div class="form-grid">
        <div class="field"><label>Date de la demande</label><input id="q_date" type="date" value="${today()}"></div>
        <div class="field"><label>Montant estimé (€) — facultatif</label><input id="q_amount" type="number" min="0" step="0.01"></div>
        <div class="field full"><label>Objet / note</label><input id="q_note" placeholder="Ex. photos immobilières maison 180 m²"></div>
      </div>
      <div class="row" style="margin-top:10px"><button class="primary" onclick="addQuote()">＋ Enregistrer une demande de devis</button></div>
      <div class="timeline" style="margin-top:10px">${quotes.length ? quotes.slice().reverse().map(q=>`<div class="timeline-item accepted"><div class="timeline-top"><b>${fmtDate(q.date)}</b><span>${q.amount?Number(q.amount).toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:2})+" €":"Montant non renseigné"}</span></div><div class="timeline-meta">${esc(q.note||"Demande de devis")}</div></div>`).join("") : '<span class="muted">Aucune demande de devis.</span>'}</div>
    </div>`;
  showModal();
}
function addVisit(){
  const p=list().find(x=>x.id===currentId); if(!p) return;
  const cards=Math.max(0,Number($("v_cards").value)||0);
  if(cards>state.settings.cardsStock){toast("Pas assez de cartes en stock");return;}
  p.visits.push({id:uid(),date:$("v_date").value||today(),status:$("v_status").value,cardsGiven:cards,note:$("v_note").value.trim()});
  state.settings.cardsStock-=cards; save(); render(); openDetails(currentId); toast("Visite enregistrée");
}
function addQuote(){
  const p=list().find(x=>x.id===currentId); if(!p) return;
  p.quotes.push({id:uid(),date:$("q_date").value||today(),amount:Number($("q_amount").value)||0,note:$("q_note").value.trim()});
  save(); render(); openDetails(currentId); toast("Demande de devis enregistrée");
}
function editProspect(){
  const p=list().find(x=>x.id===currentId); if(!p)return;
  $("modalBody").innerHTML=`<div class="detail-section"><div class="form-grid">
    <div class="field full"><label>Nom</label><input id="e_name" value="${esc(p.name)}"></div>
    <div class="field"><label>Ville</label><input id="e_city" value="${esc(p.city||"")}"></div>
    <div class="field"><label>Contact</label><input id="e_contact" value="${esc(p.contact||"")}"></div>
    <div class="field"><label>Téléphone</label><input id="e_phone" value="${esc(p.phone||"")}"></div>
    <div class="field"><label>E-mail</label><input id="e_email" value="${esc(p.email||"")}"></div>
    <div class="field full"><label>Notes</label><textarea id="e_notes">${esc(p.notes||"")}</textarea></div>
  </div></div><div class="detail-section"><div class="row"><button class="primary" onclick="saveEdit()">Enregistrer</button><button class="secondary" onclick="openDetails('${p.id}')">Annuler</button></div></div>`;
}
function saveEdit(){
  const p=list().find(x=>x.id===currentId); if(!p)return;
  p.name=$("e_name").value.trim()||p.name;p.city=$("e_city").value.trim();p.contact=$("e_contact").value.trim();p.phone=$("e_phone").value.trim();p.email=$("e_email").value.trim();p.notes=$("e_notes").value.trim();
  save();render();openDetails(currentId);toast("Prospect modifié");
}
function deleteProspect(){
  const p=list().find(x=>x.id===currentId);if(!p)return;
  if(!confirm(`Supprimer ${p.name} et tout son historique ?`))return;
  state[currentTab]=state[currentTab].filter(x=>x.id!==currentId);save();closeModal();render();toast("Prospect supprimé");
}
function showModal(){ $("modal").classList.remove("hidden"); $("modal").setAttribute("aria-hidden","false"); }
function closeModal(){ $("modal").classList.add("hidden"); $("modal").setAttribute("aria-hidden","true"); currentId=null; }
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  currentTab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  $("search").value="";$("statusFilter").value="all";render();
}));
$("search").addEventListener("input",renderCards);
$("statusFilter").addEventListener("change",renderCards);
$("addBtn").addEventListener("click",openCreate);
$("closeModal").addEventListener("click",closeModal);
document.querySelector(".modal-backdrop").addEventListener("click",closeModal);

$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="prospection-drone-backup.json";a.click();URL.revokeObjectURL(a.href);
  toast("Sauvegarde exportée");
});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{
    try{
      const s=JSON.parse(r.result);
      if(!Array.isArray(s.agencies)||!Array.isArray(s.diagnosticians))throw Error();
      state=s;state.settings ||= {cardsStock:DEFAULT_CARDS};save();render();toast("Sauvegarde importée");
    }catch(_){alert("Fichier de sauvegarde invalide.");}
    e.target.value="";
  };r.readAsText(f);
});

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
render();

window.openDetails=openDetails;window.openCreate=openCreate;window.closeModal=closeModal;window.saveProspect=saveProspect;window.addVisit=addVisit;window.addQuote=addQuote;window.editProspect=editProspect;window.saveEdit=saveEdit;window.deleteProspect=deleteProspect;
