self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
// Basic offline support (optional for now)
});

// ====================== GrowthBase Service Worker ======================
// Handles Web Push notifications — received even when the app is closed / user logged out.
// Version bump forces re-install when deployed.
const SW_VERSION = 'growthbase-sw-v3';
const CACHE_NAME = SW_VERSION;

// ========================== INSTALL ==========================
self.addEventListener('install', (event) => {
    console.log('[SW] Installed:', SW_VERSION);
    self.skipWaiting(); // Activate immediately
});

// ========================== ACTIVATE ==========================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activated:', SW_VERSION);
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    return self.clients.claim();
});

// ========================== PUSH NOTIFICATIONS ==========================
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'GrowthBase', body: event.data ? event.data.text() : 'New notification' };
    }

    const title   = data.title  || '🔔 GrowthBase';
    const options = {
        body:    data.body   || 'You have a new notification.',
        icon:    data.icon   || '/icons/icon-192.png',
        badge:   data.badge  || '/badge-72.png',
        tag:     data.tag    || 'growthbase-notif',
        data:    data.data   || {},
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: [
            { action: 'open',    title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss'  }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ========================== NOTIFICATION CLICK ==========================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const urlToOpen = self.location.origin + '/'; // open the app

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Focus existing tab if open
            for (const client of windowClients) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NOTIF_CLICK', data: event.notification.data });
                    return client.focus();
                }
            }
            // Otherwise open new tab
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});

// ========================== BACKGROUND SYNC (optional) ==========================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notifications') {
        // Could be used for offline queuing later
        console.log('[SW] Background sync: sync-notifications');
    }
});

// ========================== MESSAGE HANDLER ==========================
// Accept messages from the main page
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


