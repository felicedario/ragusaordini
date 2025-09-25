const REPO_NAME = '/ragusaordini/';
const STATIC_CACHE_NAME = 'ragusa-static-v2'; // Versione incrementata
const DYNAMIC_CACHE_NAME = 'ragusa-dynamic-v2'; // Versione incrementata

// L'App Shell: i file fondamentali per far partire l'interfaccia
const APP_SHELL_ASSETS = [
    REPO_NAME,
    `${REPO_NAME}index.html`,
    `${REPO_NAME}app.js`,
    `${REPO_NAME}style.css`,
    `${REPO_NAME}manifest.json`,
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js',
    'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Precaching App Shell con i percorsi corretti');
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('script.google.com')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(res => {
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                    cache.put(event.request.url, res.clone());
                    return res;
                });
            });
        })
    );
});
