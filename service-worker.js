const CACHE='auto-assistent-v15-1b-20260806-1854';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.hostname.includes('opendata.rdw.nl')) return;
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
   const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
 }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
