window.EventDroneProspection=(()=>{

const DATA_URL='./plugin/prospection/prospection.json';
const STORAGE='prospection-drone-user-v1';
const LAST_UPDATE='12:48';

let data={agencies:[],diagnosticians:[],cardsInitial:500};
let type='agencies';
let container=null;
let quickFilter='all';

const $=(s,c=document)=>c.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate=v=>{
  if(!v)return'Jamais';
  const d=new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
};
const loadUser=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return{}}};
const saveUser=u=>localStorage.setItem(STORAGE,JSON.stringify(u));
function key(){return type==='agencies'?'agencies':'diagnosticians'}
function current(){return data[key()]||[]}
function ensureProspectState(p){
  const u=loadUser();
  u[p.id] ||= {favorite:false,visits:[],quotes:[]};
  u[p.id].favorite=!!u[p.id].favorite;
  u[p.id].visits=Array.isArray(u[p.id].visits)?u[p.id].visits:[];
  u[p.id].quotes=Array.isArray(u[p.id].quotes)?u[p.id].quotes:[];
  saveUser(u);
  return u[p.id];
}
function cardsGiven(p){return ensureProspectState(p).visits.reduce((n,v)=>n+Number(v.cardsGiven||0),0)}
function visitCount(p){return ensureProspectState(p).visits.length}
function quoteCount(p){return ensureProspectState(p).quotes.length}
function lastVisit(p){
  const vs=ensureProspectState(p).visits;
  return vs.length?vs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]:null;
}
function status(p){
  const v=lastVisit(p);
  if(!v)return ['todo','Jamais visité'];
  if(v.status==='accepted')return ['accepted','Accord'];
  if(v.status==='attention')return ['attention','En attente'];
  return ['refused','Refus'];
}
function totalCardsGiven(){
  return [...data.agencies,...data.diagnosticians].reduce((n,p)=>n+cardsGiven(p),0);
}
function stock(){
  const u=loadUser();
  return Number(u.__stock??data.cardsInitial??500);
}
function setStock(n){
  const u=loadUser();u.__stock=Math.max(0,Math.floor(Number(n)||0));saveUser(u);
}
function ensureSeedStock(){
  const u=loadUser();
  if(typeof u.__stock!=='number')u.__stock=Number(data.cardsInitial||500);
  saveUser(u);
}

async function load(){
  const r=await fetch(`${DATA_URL}?ts=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`Prospection HTTP ${r.status}`);
  data=await r.json();
  ensureSeedStock();
  return data;
}

function star(p){
  const s=ensureProspectState(p);
  return s.favorite?'★':'☆';
}

function renderStats(){
  const list=current();
  const v=list.reduce((n,p)=>n+visitCount(p),0);
  const a=list.reduce((n,p)=>n+(status(p)[0]==='accepted'?1:0),0);
  const att=list.reduce((n,p)=>n+(status(p)[0]==='attention'?1:0),0);
  const r=list.reduce((n,p)=>n+(status(p)[0]==='refused'?1:0),0);
  const q=list.reduce((n,p)=>n+quoteCount(p),0);
  const quick=[
    ['all','🏢',list.length,'Tous'],
    ['todo','📞',list.filter(p=>status(p)[0]==='todo').length,'À visiter'],
    ['attention','🟠',att,'En attente'],
    ['accepted','🟢',a,'Accord'],
    ['refused','🔴',r,'Refus'],
    ['fav','⭐',list.filter(p=>ensureProspectState(p).favorite).length,'Favoris'],
    ['quotes','🧾',q,'Devis']
  ];
  const html=quick.map(([f,i,n,label])=>`<button type="button" class="stat ${quickFilter===f?'active':''}" data-prospection-filter="${f}"><span class="stat-icon">${i}</span><span>${n}</span><small>${label}</small></button>`).join('');
  const s=$('#prospectionStats',container);
  if(s){
    s.innerHTML=html;
    s.querySelectorAll('[data-prospection-filter]').forEach(btn=>{
      btn.onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        quickFilter=btn.dataset.prospectionFilter||'all';
        const select=$('#prospectionDisplayFilter',container);
        if(select) select.value='all';
        render();
      };
    });
  }
}

function renderList(){
  const list=current();
  const q=(($('#prospectionSearch',container)?.value)||'').trim().toLowerCase();
  const distance=Number($('#prospectionDistance',container)?.value||10);
  const displayFilter=$('#prospectionDisplayFilter',container)?.value||'all';
  const filter=quickFilter;
  const filtered=list.filter(p=>{
    const hay=`${p.name} ${p.city} ${p.address}`.toLowerCase();
    if(q&&!hay.includes(q))return false;
    if(Number(p.distance)>distance)return false;
    const [st]=status(p);
    const isFav=ensureProspectState(p).favorite;
    const isQuote=quoteCount(p)>0;
    // "Afficher" is the main select filter.
    if(displayFilter==='fav'&&!isFav)return false;
    if(displayFilter==='quotes'&&!isQuote)return false;
    if(displayFilter!=='all'&&displayFilter!=='fav'&&displayFilter!=='quotes'&&displayFilter!==st)return false;
    // Quick filters are also active; selecting a quick filter narrows the result.
    if(filter==='fav'&&!isFav)return false;
    if(filter==='quotes'&&!isQuote)return false;
    if(filter!=='all'&&filter!=='fav'&&filter!=='quotes'&&filter!==st)return false;
    return true;
  }).sort((a,b)=>Number(a.distance)-Number(b.distance)||a.name.localeCompare(b.name,'fr'));

  const box=$('#prospectionList',container);
  if(!box)return;
  if(!filtered.length){box.innerHTML='<div class="empty">Aucun prospect avec ces filtres.</div>';return;}
  box.innerHTML=filtered.map(p=>{
    const [st,label]=status(p);
    return `<article class="event prospect-card" data-id="${esc(p.id)}">
      <div class="event-top">
        <div>
          <span class="date">${esc(label)}</span>
          <h2 class="title">${esc(p.name)}</h2>
          <p class="place">📍 ${esc(p.city||'')} ${p.address?`— ${esc(p.address)}`:''}</p>
        </div>
        <button class="fav prospection-fav">${star(p)}</button>
      </div>
      <div class="badges">
        <span>${Number(p.distance).toFixed(1)} km</span>
        <span>${'★'.repeat(Number(p.potential||1))}${'☆'.repeat(Math.max(0,3-Number(p.potential||1)))}</span>
        <span>📅 ${visitCount(p)} visite${visitCount(p)>1?'s':''}</span>
        <span>🪪 ${cardsGiven(p)} carte${cardsGiven(p)>1?'s':''}</span>
        <span>🧾 ${quoteCount(p)} devis</span>
      </div>
      <div class="actions">
        <button class="contact prospection-visit">📅 Visite</button>
        <button class="flight prospection-details">Détails</button>
        <button class="details prospection-stock">🪪 Stock</button>
      </div>
    </article>`;
  }).join('');

  box.querySelectorAll('.prospect-card').forEach(card=>{
    const p=list.find(x=>x.id===card.dataset.id);
    $('.prospection-fav',card).onclick=e=>{e.stopPropagation();const u=loadUser();u[p.id] ||= {favorite:false,visits:[],quotes:[]};u[p.id].favorite=!u[p.id].favorite;saveUser(u);renderStats();renderList()};
    $('.prospection-visit',card).onclick=e=>{e.stopPropagation();openVisit(p)};
    $('.prospection-details',card).onclick=e=>{e.stopPropagation();openDetails(p)};
    $('.prospection-stock',card).onclick=e=>{e.stopPropagation();editStock()};
  });
}

function render(){
  renderStats();
  renderList();
}

function shell(){
  container.innerHTML=`<section class="prospection-page">
    <div class="prospection-intro">
      <div class="prospection-title"><span>${type==='agencies'?'🏠':'🔎'}</span><div><strong>${type==='agencies'?'Agences immobilières':'Diagnostiqueurs immobiliers'}</strong></div></div>
      <div class="prospection-location">📍 Rayon de prospection · Châteaubriant</div>
    </div>
    <div class="prospection-toolbar">
      <label>Distance
        <select id="prospectionDistance">
          <option value="10" selected>10 km</option>
          <option value="20">20 km</option>
          <option value="30">30 km</option>
          <option value="50">50 km</option>
          <option value="100">100 km</option>
        </select>
      </label>
      <label>Afficher
        <select id="prospectionDisplayFilter">
          <option value="all" selected>🏢 Tous</option>
          <option value="todo">📞 À visiter</option>
          <option value="attention">🟠 En attente</option>
          <option value="accepted">🟢 Accord</option>
          <option value="refused">🔴 Refus</option>
          <option value="fav">⭐ Favoris</option>
          <option value="quotes">🧾 Devis</option>
        </select>
      </label>
    </div>
    <input id="prospectionSearch" class="prospection-search" type="search" placeholder="Rechercher une entreprise…">
    <div id="prospectionStats" class="stats"></div>
    <div class="prospection-stockbar"><span>🪪 Stock cartes : <strong id="prospectionStockValue">${stock()}</strong></span><button id="prospectionStockEdit">Modifier le stock</button></div>
    <div id="prospectionList"></div>
  </section>`;
  $('#prospectionSearch').oninput=renderList;
  $('#prospectionDistance').onchange=renderList;
  $('#prospectionDisplayFilter').onchange=()=>{quickFilter='all';render()};
  quickFilter='all';
  $('#prospectionStockEdit').onclick=editStock;
}

function editStock(){
  const v=prompt('Nombre de cartes restantes',String(stock()));
  if(v===null)return;
  const n=Number(v);
  if(!Number.isFinite(n)||n<0){alert('Valeur invalide');return}
  setStock(n);render();
}

function openVisit(p){
  const currentStatus=status(p)[0];
  const cards=Math.min(stock(),Math.max(0,Number(prompt('Nombre de cartes laissées lors de cette visite', '5')||0)));
  const s=prompt('Résultat : accord / attention / refus',currentStatus==='todo'?'attention':currentStatus);
  if(s===null)return;
  const statusValue=/^acc/i.test(s)?'accepted':/^ref/i.test(s)?'refused':'attention';
  const note=prompt('Compte rendu / note (facultatif)','')||'';
  const u=loadUser();const ps=ensureProspectState(p);
  ps.visits.push({date:new Date().toISOString().slice(0,10),status:statusValue,cardsGiven:cards,note});
  u[p.id]=ps;u.__stock=stock()-cards;saveUser(u);render();
}

function openDetails(p){
  const ps=ensureProspectState(p);
  const visits=ps.visits.slice().reverse().map(v=>`${fmtDate(v.date)} — ${v.status==='accepted'?'Accord':v.status==='attention'?'En attente':'Refus'} — ${v.cardsGiven||0} carte(s)${v.note?` — ${v.note}`:''}`).join('\n')||'Aucune visite';
  const quotes=ps.quotes.slice().reverse().map(v=>`${fmtDate(v.date)}${v.amount?` — ${v.amount} €`:''}${v.note?` — ${v.note}`:''}`).join('\n')||'Aucune demande de devis';
  const action=prompt(
`${p.name}
${p.city} · ${Number(p.distance).toFixed(1)} km

Statut : ${status(p)[1]}
Visites : ${visitCount(p)}
Cartes données : ${cardsGiven(p)}
Demandes de devis : ${quoteCount(p)}
Stock global : ${stock()}

Historique visites :
${visits}

Demandes de devis :
${quotes}

Tape "devis" pour enregistrer une demande de devis, ou annule.`,
'');
  if((action||'').trim().toLowerCase()==='devis'){
    const u=loadUser(),ps=ensureProspectState(p);
    const note=prompt('Objet de la demande de devis','')||'';
    const amount=Number(prompt('Montant estimé (€), facultatif','0')||0);
    ps.quotes.push({date:new Date().toISOString().slice(0,10),amount:amount>0?amount:0,note});
    u[p.id]=ps;saveUser(u);render();
  }
}

function home(c){
  container=c;
  shell();
  render();
}

async function init(c,newType='agencies'){
  type=newType;
  container=c;
  try{await load();home(c)}catch(e){console.error(e);c.innerHTML='<div class="empty">Impossible de charger la prospection.</div>'}
}

return {init,home,setType:newType=>{type=newType;if(container)home(container)},get data(){return data},LAST_UPDATE};
})();