/**
 * Offline submission queue backed by IndexedDB.
 *
 * Scope: in-app only — no service worker, no Background Sync API (not
 * supported in Safari). Sync is triggered manually on reconnect and on
 * app load. See syncQueuedLogs.js for the sync driver.
 */

const DB_NAME    = 'wastemanagement-offline';
const DB_VERSION = 1;
const STORE      = 'pending_logs';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'clientId' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function dispatch() {
  window.dispatchEvent(new Event('offlinequeue:change'));
}

export async function queueLog(payload) {
  const db = await openQueueDB();
  await new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(payload);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
  dispatch();
}

export async function getQueuedLogs() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function removeQueuedLog(clientId) {
  const db = await openQueueDB();
  await new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(clientId);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
  dispatch();
}
