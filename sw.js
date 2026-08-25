const CACHE='prospection-drone-datura-v23';
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg','./plugin/agriculture/agriculture.js','./plugin/agriculture/agriculture.css','./plugin/agriculture/agriculture.json','./plugin/prospection/prospection.js','./plugin/prospection/prospection.css','./plugin/prospection/prospection.json','./events.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return x}).catch(()=>caches.match('./index.html')))));

function restoreSyncTime(){
 const el=document.getElementById("syncTime");
 if(!el)return;
 const t=localStorage.getItem("lastSyncTime");
 el.textContent=t ? new Date(t).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : "en cours";
}
window.addEventListener("load",restoreSyncTime);
