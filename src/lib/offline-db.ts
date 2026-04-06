/**
 * FLUXION SPORT — IndexedDB Offline Database
 * 
 * Schema for offline-first Live Match Tracker.
 * Uses the `idb` library for typed IndexedDB access.
 * 
 * Stores:
 * - matches: Full match state snapshots (current + history)
 * - events: Individual match events (goals, cards, etc.)
 * - syncQueue: Pending operations to sync with Firestore
 * - drawings: Tactical board vector data (strokes, not images)
 * - checkpoints: Periodic full-state snapshots for crash recovery
 */
import { openDB, DBSchema, IDBPDatabase } from "idb";

// ─── Types ───────────────────────────────────────────────

export interface OfflineMatchState {
  /** Unique local match ID (e.g. `match_<clubId>_<teamId>_<ts>`) */
  id: string;
  clubId: string;
  divisionId: string;
  teamId: string;
  clubName: string;
  teamName: string;
  divisionName: string;
  sport: "hockey" | "rugby";
  opponentName: string;
  homeScore: number;
  awayScore: number;
  seconds: number;
  isActive: boolean;
  matchPhase: "en_curso" | "entretiempo" | "finalizado";
  playerCount: number;
  positions: PositionSlot[];
  playerStats: Record<string, MatchPlayerStats>;
  sinBin: SinBinEntry[];
  hiaList: HIAEntry[];
  /** ISO string */
  createdAt: string;
  /** ISO string — last local update */
  updatedAt: string;
  /** Whether this match has been fully synced to Firestore */
  synced: boolean;
  /** Firestore doc ID once synced */
  firestoreId?: string;
}

export interface PositionSlot {
  id: string;
  x: number;
  y: number;
  label: string;
  assignedPlayerId: string | null;
}

export interface MatchPlayerStats {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  timePlayed: number;
  goals: number;
  trys: number;
  conversions: number;
  penalties: number;
  yellowCards: number;
  redCards: number;
}

export interface SinBinEntry {
  playerId: string;
  playerName: string;
  returnTime: number;
}

export interface HIAEntry {
  playerId: string;
  playerName: string;
  replacedByPlayerId: string;
  positionId: string;
  startTime: number;
  type: "blood" | "hia";
}

export interface OfflineMatchEvent {
  /** Locally generated unique ID (`temp_<timestamp>_<random>`) */
  id: string;
  matchId: string;
  type: "goal" | "try" | "conversion" | "penalty" | "yellow" | "red" | "substitution" | "medical" | "phase_change";
  playerId?: string;
  playerName?: string;
  minute: number;
  /** Local timestamp of the event */
  timestamp: string;
  /** Extra data depending on type */
  data?: Record<string, any>;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  matchId: string;
  /** Firestore operation type */
  operation: "set" | "update" | "delete";
  /** Firestore collection path */
  collection: string;
  /** Firestore document ID */
  docId: string;
  /** Data payload */
  payload: any;
  /** Number of sync attempts */
  attempts: number;
  /** ISO string */
  createdAt: string;
  /** Last error message if failed */
  lastError?: string;
}

export interface OfflineDrawing {
  id: string;
  matchId: string;
  /** Vector data: array of strokes, NOT base64 images */
  strokes: DrawingStroke[];
  /** ISO string */
  createdAt: string;
  updatedAt: string;
}

export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface MatchCheckpoint {
  id: string;
  matchId: string;
  /** Full serialized match state */
  state: OfflineMatchState;
  events: OfflineMatchEvent[];
  /** ISO string */
  createdAt: string;
}

// ─── DB Schema ───────────────────────────────────────────

interface FluxionOfflineDB extends DBSchema {
  matches: {
    key: string;
    value: OfflineMatchState;
    indexes: {
      "by-team": string;
      "by-synced": string;
    };
  };
  events: {
    key: string;
    value: OfflineMatchEvent;
    indexes: {
      "by-match": string;
      "by-synced": string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      "by-match": string;
    };
  };
  drawings: {
    key: string;
    value: OfflineDrawing;
    indexes: {
      "by-match": string;
    };
  };
  checkpoints: {
    key: string;
    value: MatchCheckpoint;
    indexes: {
      "by-match": string;
    };
  };
}

// ─── Database Singleton ──────────────────────────────────

const DB_NAME = "fluxion-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FluxionOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<FluxionOfflineDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }

  if (!dbPromise) {
    dbPromise = openDB<FluxionOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Matches store
        const matchStore = db.createObjectStore("matches", { keyPath: "id" });
        matchStore.createIndex("by-team", "teamId");
        matchStore.createIndex("by-synced", "synced");

        // Events store
        const eventStore = db.createObjectStore("events", { keyPath: "id" });
        eventStore.createIndex("by-match", "matchId");
        eventStore.createIndex("by-synced", "synced");

        // Sync queue
        const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
        syncStore.createIndex("by-match", "matchId");

        // Drawings store
        const drawStore = db.createObjectStore("drawings", { keyPath: "id" });
        drawStore.createIndex("by-match", "matchId");

        // Checkpoints store
        const checkpointStore = db.createObjectStore("checkpoints", { keyPath: "id" });
        checkpointStore.createIndex("by-match", "matchId");
      },
    });
  }

  return dbPromise;
}

// ─── Match Operations ────────────────────────────────────

export async function saveMatch(match: OfflineMatchState): Promise<void> {
  const db = await getOfflineDB();
  await db.put("matches", { ...match, updatedAt: new Date().toISOString() });
}

export async function getMatch(matchId: string): Promise<OfflineMatchState | undefined> {
  const db = await getOfflineDB();
  return db.get("matches", matchId);
}

export async function getActiveMatch(teamId: string): Promise<OfflineMatchState | undefined> {
  const db = await getOfflineDB();
  const all = await db.getAllFromIndex("matches", "by-team", teamId);
  return all.find(m => m.matchPhase !== "finalizado" || !m.synced);
}

export async function getAllUnsyncedMatches(): Promise<OfflineMatchState[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("matches", "by-synced", "false");
}

// ─── Event Operations ────────────────────────────────────

export async function addEvent(event: OfflineMatchEvent): Promise<void> {
  const db = await getOfflineDB();
  await db.put("events", event);
}

export async function getMatchEvents(matchId: string): Promise<OfflineMatchEvent[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("events", "by-match", matchId);
}

export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getOfflineDB();
  const event = await db.get("events", eventId);
  if (event) {
    await db.put("events", { ...event, synced: true });
  }
}

// ─── Sync Queue Operations ───────────────────────────────

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getOfflineDB();
  await db.put("syncQueue", item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  return db.getAll("syncQueue");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("syncQueue", id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getOfflineDB();
  await db.put("syncQueue", item);
}

// ─── Drawing Operations ──────────────────────────────────

export async function saveDrawing(drawing: OfflineDrawing): Promise<void> {
  const db = await getOfflineDB();
  await db.put("drawings", drawing);
}

export async function getMatchDrawings(matchId: string): Promise<OfflineDrawing[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("drawings", "by-match", matchId);
}

// ─── Checkpoint Operations ───────────────────────────────

export async function saveCheckpoint(checkpoint: MatchCheckpoint): Promise<void> {
  const db = await getOfflineDB();
  await db.put("checkpoints", checkpoint);
}

export async function getLatestCheckpoint(matchId: string): Promise<MatchCheckpoint | undefined> {
  const db = await getOfflineDB();
  const all = await db.getAllFromIndex("checkpoints", "by-match", matchId);
  if (all.length === 0) return undefined;
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function cleanupCheckpoints(matchId: string, keepLast: number = 3): Promise<void> {
  const db = await getOfflineDB();
  const all = await db.getAllFromIndex("checkpoints", "by-match", matchId);
  const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (let i = keepLast; i < sorted.length; i++) {
    await db.delete("checkpoints", sorted[i].id);
  }
}

// ─── Storage Quota Check ─────────────────────────────────

export async function checkStorageQuota(): Promise<{ used: number; available: number; warning: boolean }> {
  if (!navigator.storage?.estimate) {
    return { used: 0, available: 0, warning: false };
  }
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const available = quota - used;
  const MB50 = 50 * 1024 * 1024;
  return { used, available, warning: available < MB50 };
}

// ─── Generate Local IDs ──────────────────────────────────

export function generateLocalId(prefix: string = "temp"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateMatchId(clubId: string, teamId: string): string {
  return `match_${clubId}_${teamId}_${Date.now()}`;
}
