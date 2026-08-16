const CACHE='prospection-drone-v11';
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg','./plugin/agriculture/agriculture.js','./plugin/agriculture/agriculture.css','./plugin/agriculture/agriculture.json','./plugin/prospection/prospection.js','./plugin/prospection/prospection.css','./plugin/prospection/prospection.json','./events.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return x}).catch(()=>caches.match('./index.html')))));

\nfunction updateSyncTimes(){
 const t=localStorage.getItem("lastSyncTime");
 const v=t?new Date(t).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"--:--";
 document.querySelectorAll(".sync-time").forEach(e=>e.textContent=v);
}
function markSyncTime(){
 localStorage.setItem("lastSyncTime",new Date().toISOString());
 updateSyncTimes();
}
window.addEventListener("load",updateSyncTimes);
