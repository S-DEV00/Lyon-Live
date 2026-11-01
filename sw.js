// Lyon Live : cache pour ouvrir vite et marcher sans réseau.
// Page et config : réseau d'abord (toujours la dernière version), cache si le réseau rame (> 4 s) ou est coupé.
// Fichiers lourds (Leaflet, lycées, sons, icônes) : servis depuis le cache, mis à jour en arrière-plan.
var V = 'll-efa2930709';
var LOURDS = /\/(leaflet\.js|leaflet\.css|ecoles\.json|batiments\.txt|concert\.mp3|blocus\.mp3|icone-\d+\.png|manifest\.json)(\?.*)?$/;
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== V; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
function reseauDabord(req){
  return caches.open(V).then(function(c){
    var net = fetch(req).then(function(r){ if (r && r.ok) c.put(req, r.clone()); return r; });
    var lent = new Promise(function(ok){ setTimeout(ok, 4000); }).then(function(){ return c.match(req, { ignoreSearch:true }); });
    return Promise.race([net.catch(function(){ return c.match(req, { ignoreSearch:true }); }), lent.then(function(r){ return r || net; })])
      .then(function(r){ return r || net; });
  });
}
function cacheDabord(req){
  return caches.open(V).then(function(c){
    return c.match(req).then(function(hit){
      var net = fetch(req).then(function(r){ if (r && r.ok && r.status === 200) c.put(req, r.clone()); return r; });
      if (hit) { net.catch(function(){}); return hit; }
      return net;
    });
  });
}
self.addEventListener('fetch', function(e){
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url); if (u.origin !== location.origin) return;
  if (req.headers.get('range')) return; // audio : laisser le navigateur gérer
  if (req.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(u.pathname)) e.respondWith(reseauDabord(req));
  else if (LOURDS.test(u.pathname)) e.respondWith(cacheDabord(req));
});
