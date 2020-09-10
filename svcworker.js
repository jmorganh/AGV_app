const staticWidget = "WaterWidgetV1";
const assets = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./waterwidget1.png",
];

self.addEventListener("install", installEvent => {
  console.log('service worker installing....');
  installEvent.waitUntil(
    caches.open(staticWidget).then(cache => {
      return cache.addAll(assets);
      console.log(cache);
    })
  );
});

self.addEventListener('activate', event => {
    console.log('service worker activating...');
});

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request)
    })
  );
});
