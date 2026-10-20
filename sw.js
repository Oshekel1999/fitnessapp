// Offline support: app shell + hashed assets cached on install; navigation is network-first so updates arrive.
const CACHE = 'training-journey-v1'

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE)
    const res = await fetch('./', { cache: 'reload' })
    const html = await res.clone().text()
    await c.put('./', res)
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http'))
    await c.addAll([...new Set([...assets, 'manifest.webmanifest'])])
    self.skipWaiting()
  })())
})
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put('./', r.clone())); return r }).catch(() => caches.match('./')))
    return
  }
  // assets, program images: cache-first, fill on miss
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return r
  })))
})
