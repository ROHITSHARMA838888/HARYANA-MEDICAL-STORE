/**
 * Haryana Medical Store — Service Worker Registration & PWA Lifecycle Manager
 */

export interface SWRegistrationInfo {
  isRegistered: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

let registrationInstance: ServiceWorkerRegistration | null = null;
let updateCallback: ((reg: ServiceWorkerRegistration) => void) | null = null;

export function registerServiceWorker(onUpdateFound?: (reg: ServiceWorkerRegistration) => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers are not supported in this browser.');
    return;
  }

  if (onUpdateFound) {
    updateCallback = onUpdateFound;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registrationInstance = reg;
        console.log('[PWA] Service Worker successfully registered with scope:', reg.scope);

        // Check if an updated worker is waiting to activate
        if (reg.waiting) {
          notifyUpdateAvailable(reg);
        }

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] New content is available; please refresh.');
              notifyUpdateAvailable(reg);
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });

    // Detect when controlling service worker changes
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Service worker controller changed. Refreshing page for latest assets.');
        window.location.reload();
      }
    });
  });
}

function notifyUpdateAvailable(reg: ServiceWorkerRegistration) {
  if (updateCallback) {
    updateCallback(reg);
  }
  window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration: reg } }));
}

/**
 * Triggers skipWaiting on any waiting service worker
 */
export function skipWaitingAndReload() {
  if (!registrationInstance?.waiting) {
    window.location.reload();
    return;
  }
  registrationInstance.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Manually checks for Service Worker updates
 */
export async function checkForServiceWorkerUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !registrationInstance) {
    return false;
  }
  try {
    await registrationInstance.update();
    return !!registrationInstance.waiting;
  } catch (err) {
    console.warn('[PWA] Update check failed:', err);
    return false;
  }
}
