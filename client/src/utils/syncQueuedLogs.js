import api from '../api/axiosClient';
import { getQueuedLogs, removeQueuedLog } from './offlineQueue';

// In-flight guard: prevents two concurrent sync passes from racing on the
// same queue entries. Both App.jsx (mount effect) and LogNew.jsx (online
// event) can call syncQueuedLogs at nearly the same time; without this,
// both passes read the same entry before either removes it, both POST to
// the server, and the one that loses the INSERT race gets a 409 from the
// database's UNIQUE constraint on client_id — with no code path to clear
// the stale queue entry.
let syncing = false;

/**
 * Attempts to POST all queued offline logs to the server.
 *
 * In-app offline sync only — no service worker or Background Sync API
 * (Background Sync is not supported in Safari). Triggered on app load
 * and on the browser 'online' event.
 *
 * Processes logs one at a time. Leaves a log in the queue only if the
 * network is still down (no err.response). A 401 aborts the whole batch.
 * A 409 means the log already exists on the server (duplicate clientId
 * from a prior race-condition sync attempt) — treat it as success and
 * remove it from the queue so it is never retried again.
 */
export async function syncQueuedLogs() {
  if (syncing) return;
  syncing = true;
  try {
    let logs;
    try {
      logs = await getQueuedLogs();
    } catch (err) {
      console.error('[syncQueuedLogs] failed to read IndexedDB queue:', err);
      return;
    }
    if (logs.length === 0) return;

    for (const log of logs) {
      try {
        await api.post('/waste-logs', {
          category:  log.category,
          weight_kg: log.weight_kg,
          latitude:  log.latitude,
          longitude: log.longitude,
          notes:     log.notes ?? undefined,
          client_id: log.clientId,
        });
        await removeQueuedLog(log.clientId);
      } catch (err) {
        if (err.response?.status === 401) {
          return; // not authenticated — abort, leave queue intact
        }
        if (err.response?.status === 409) {
          // The log already exists on the server (a previous sync pass won
          // the INSERT race). Remove from queue — it was synced successfully
          // by the other pass.
          await removeQueuedLog(log.clientId).catch(() => {});
          return;
        }
        // Network failure (no err.response) — leave in queue, try next log
        console.error(
          `[syncQueuedLogs] log ${log.clientId} failed:`,
          err.response?.data ?? err.message,
        );
      }
    }
  } finally {
    syncing = false;
  }
}
