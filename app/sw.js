// MyTab offline start. Network first (so updates always arrive), falling back to the saved copy
// when the network is missing or too slow. Only same-site files are saved; API calls never are.
const CACHE = "mytab-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./favicon-32.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const fromNetwork = fetch(r).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
    return res;
  });
  const timeout = r.mode === "navigate" ? new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000)) : null;
  e.respondWith(
    (timeout ? Promise.race([fromNetwork, timeout]) : fromNetwork).catch(() =>
      caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("./index.html") : Response.error()))
    )
  );
});
