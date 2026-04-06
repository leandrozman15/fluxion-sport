/**
 * FLUXION SPORT — Sync Engine Hook
 *
 * Handles bidirectional sync between IndexedDB and Firestore.
 * - Monitors online/offline status
 * - Processes sync queue when online
 * - Uploads pending match data and events
 * - Conflict resolution: Last-Write-Wins (LWW) with server timestamps
 * - Non-blocking background sync with visual indicators
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getMatch,
  saveMatch,
  getMatchEvents,
  markEventSynced,
  addToSyncQueue,
  generateLocalId,
  type SyncQueueItem,
  type OfflineMatchState,
  type OfflineMatchEvent,
} from "@/lib/offline-db";

export type SyncStatus = "idle" | "syncing" | "pending" | "error" | "offline";

interface SyncEngineState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

const MAX_RETRY_ATTEMPTS = 5;
const SYNC_INTERVAL_MS = 15_000; // try sync every 15 seconds when online

export function useSyncEngine() {
  const db = useFirestore();
  const [state, setState] = useState<SyncEngineState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    syncStatus: "idle",
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Online/Offline Detection ──────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setState(s => ({ ...s, isOnline: true }));
      // Trigger sync attempt when coming back online
      processSyncQueue();
    };
    const handleOffline = () => {
      setState(s => ({ ...s, isOnline: false, syncStatus: "offline" }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ─── Periodic Sync ────────────────────────────────────

  useEffect(() => {
    if (state.isOnline) {
      // Initial sync on mount/online
      processSyncQueue();

      intervalRef.current = setInterval(() => {
        processSyncQueue();
      }, SYNC_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isOnline]);

  // ─── Process Sync Queue ───────────────────────────────

  const processSyncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (!db) return;

    syncingRef.current = true;
    setState(s => ({ ...s, syncStatus: "syncing" }));

    try {
      const queue = await getSyncQueue();

      if (queue.length === 0) {
        setState(s => ({ ...s, syncStatus: "idle", pendingCount: 0 }));
        syncingRef.current = false;
        return;
      }

      setState(s => ({ ...s, pendingCount: queue.length }));

      let processed = 0;
      let errors = 0;

      for (const item of queue) {
        try {
          await executeSyncOperation(item);
          await removeSyncQueueItem(item.id);
          processed++;
        } catch (err: any) {
          errors++;
          const updated: SyncQueueItem = {
            ...item,
            attempts: item.attempts + 1,
            lastError: err.message || "Unknown error",
          };

          if (updated.attempts >= MAX_RETRY_ATTEMPTS) {
            // Move to dead letter (just mark as failed, keep in queue for manual retry)
            console.error(`[SyncEngine] Max retries reached for ${item.id}:`, err);
            await updateSyncQueueItem(updated);
          } else {
            await updateSyncQueueItem(updated);
          }
        }
      }

      const remaining = await getSyncQueue();
      setState(s => ({
        ...s,
        syncStatus: remaining.length > 0 ? "pending" : "idle",
        pendingCount: remaining.length,
        lastSyncAt: new Date().toISOString(),
        lastError: errors > 0 ? `${errors} operación(es) fallida(s)` : null,
      }));
    } catch (e: any) {
      console.error("[SyncEngine] Queue processing error:", e);
      setState(s => ({ ...s, syncStatus: "error", lastError: e.message }));
    } finally {
      syncingRef.current = false;
    }
  }, [db]);

  // ─── Execute Single Sync Operation ────────────────────

  const executeSyncOperation = useCallback(async (item: SyncQueueItem) => {
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, item.collection, item.docId);

    switch (item.operation) {
      case "set":
        await setDoc(docRef, {
          ...item.payload,
          _syncedAt: serverTimestamp(),
          _syncSource: "offline",
        }, { merge: true });
        break;

      case "update":
        // LWW conflict check: only update if our data is newer
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          const serverUpdatedAt = existing.data()?._syncedAt?.toDate?.()?.getTime?.() || 0;
          const localUpdatedAt = new Date(item.payload.updatedAt || item.createdAt).getTime();

          if (serverUpdatedAt > localUpdatedAt) {
            console.warn(`[SyncEngine] Conflict detected for ${item.docId}: server is newer. Skipping local update.`);
            // Still remove from queue — server version wins
            return;
          }
        }
        await setDoc(docRef, {
          ...item.payload,
          _syncedAt: serverTimestamp(),
          _syncSource: "offline",
        }, { merge: true });
        break;

      case "delete":
        await deleteDoc(docRef);
        break;
    }
  }, [db]);

  // ─── Enqueue a Match for Sync ─────────────────────────

  const enqueueMatchSync = useCallback(async (match: OfflineMatchState) => {
    const liveDocId = `${match.clubId}_${match.teamId}_live`;

    // 1. Enqueue the live index update
    await addToSyncQueue({
      id: generateLocalId("sync"),
      matchId: match.id,
      operation: "set",
      collection: "live_matches_index",
      docId: liveDocId,
      payload: {
        id: liveDocId,
        clubId: match.clubId,
        clubName: match.clubName,
        teamId: match.teamId,
        teamName: match.teamName,
        divisionId: match.divisionId,
        divisionName: match.divisionName,
        sport: match.sport,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        opponentName: match.opponentName,
        timeDisplay: formatSeconds(match.seconds),
        matchPhase: match.matchPhase,
        status: match.matchPhase === "finalizado" ? "finished" : "live",
        updatedAt: match.updatedAt,
      },
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    setState(s => ({ ...s, pendingCount: s.pendingCount + 1, syncStatus: "pending" }));

    // Try immediate sync if online
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, [processSyncQueue]);

  // ─── Enqueue Match Finalization ───────────────────────

  const enqueueMatchFinalization = useCallback(async (match: OfflineMatchState) => {
    const events = await getMatchEvents(match.id);
    const matchFirestoreId = `live_${Date.now()}`;
    const basePath = `clubs/${match.clubId}/divisions/${match.divisionId}/teams/${match.teamId}/events`;

    // 1. Save match result
    await addToSyncQueue({
      id: generateLocalId("sync"),
      matchId: match.id,
      operation: "set",
      collection: basePath,
      docId: matchFirestoreId,
      payload: {
        id: matchFirestoreId,
        title: `Resultado vs ${match.opponentName}`,
        type: "match",
        status: "played",
        date: new Date().toISOString(),
        location: "Cancha Local",
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        opponent: match.opponentName,
        matchFinished: true,
        duration: Math.floor(match.seconds / 60),
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      },
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    // 2. Save player stats
    for (const pId in match.playerStats) {
      const p = match.playerStats[pId];
      if (p.timePlayed > 0 || p.goals > 0 || p.trys > 0 || p.yellowCards > 0 || p.redCards > 0) {
        const statId = `${matchFirestoreId}_${pId}`;
        await addToSyncQueue({
          id: generateLocalId("sync"),
          matchId: match.id,
          operation: "set",
          collection: `${basePath}/${matchFirestoreId}/stats`,
          docId: statId,
          payload: {
            id: statId,
            matchId: matchFirestoreId,
            playerId: pId,
            playerName: p.playerName,
            goals: p.goals,
            trys: p.trys,
            conversions: p.conversions,
            penalties: p.penalties,
            assists: 0,
            yellowCards: p.yellowCards,
            redCards: p.redCards,
            minutesPlayed: Math.floor(p.timePlayed / 60),
            createdAt: new Date().toISOString(),
          },
          attempts: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Delete live index
    const liveDocId = `${match.clubId}_${match.teamId}_live`;
    await addToSyncQueue({
      id: generateLocalId("sync"),
      matchId: match.id,
      operation: "delete",
      collection: "live_matches_index",
      docId: liveDocId,
      payload: {},
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    // 4. Mark match as synced locally
    await saveMatch({ ...match, synced: true, firestoreId: matchFirestoreId });

    // Try immediate sync
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, [processSyncQueue]);

  // ─── Force Sync ───────────────────────────────────────

  const forceSync = useCallback(() => {
    return processSyncQueue();
  }, [processSyncQueue]);

  return {
    ...state,
    forceSync,
    enqueueMatchSync,
    enqueueMatchFinalization,
  };
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
