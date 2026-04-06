/**
 * FLUXION SPORT — Offline Match Hook
 *
 * Manages the full lifecycle of a live match in offline-first mode:
 * - Creates/restores match state from IndexedDB
 * - Persists every action locally in real-time
 * - Generates events with temp IDs and local timestamps
 * - Saves periodic checkpoints for crash recovery
 * - Coordinates with useSyncEngine for cloud sync
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  saveMatch,
  getMatch,
  getActiveMatch,
  addEvent,
  getMatchEvents,
  saveCheckpoint,
  getLatestCheckpoint,
  cleanupCheckpoints,
  checkStorageQuota,
  generateLocalId,
  generateMatchId,
  type OfflineMatchState,
  type OfflineMatchEvent,
  type PositionSlot,
  type MatchPlayerStats,
  type SinBinEntry,
  type HIAEntry,
  type MatchCheckpoint,
} from "@/lib/offline-db";

const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_SAVE_DEBOUNCE_MS = 500;

interface UseOfflineMatchParams {
  clubId: string;
  divisionId: string;
  teamId: string;
  clubName: string;
  teamName: string;
  divisionName: string;
  sport: "hockey" | "rugby";
  roster: any[];
}

interface UseOfflineMatchReturn {
  matchId: string | null;
  homeScore: number;
  awayScore: number;
  seconds: number;
  isActive: boolean;
  matchPhase: "en_curso" | "entretiempo" | "finalizado";
  opponentName: string;
  playerCount: number;
  positions: PositionSlot[];
  playerStats: Record<string, MatchPlayerStats>;
  matchEvents: OfflineMatchEvent[];
  sinBin: SinBinEntry[];
  hiaList: HIAEntry[];
  sport: "hockey" | "rugby";
  storageWarning: boolean;

  // Actions
  setHomeScore: (v: number | ((prev: number) => number)) => void;
  setAwayScore: (v: number | ((prev: number) => number)) => void;
  setIsActive: (v: boolean) => void;
  setMatchPhase: (v: "en_curso" | "entretiempo" | "finalizado") => void;
  setOpponentName: (v: string) => void;
  setPlayerCount: (v: number) => void;
  setSport: (v: "hockey" | "rugby") => void;
  setPositions: (v: PositionSlot[] | ((prev: PositionSlot[]) => PositionSlot[])) => void;
  recordEvent: (type: OfflineMatchEvent["type"], playerId?: string, playerName?: string, data?: Record<string, any>) => void;
  addSinBin: (entry: SinBinEntry) => void;
  removeSinBin: (playerId: string) => void;
  addHIA: (entry: HIAEntry) => void;
  removeHIA: (playerId: string) => void;
  updatePlayerStats: (playerId: string, updates: Partial<MatchPlayerStats>) => void;
  getMatchState: () => OfflineMatchState | null;
  ready: boolean;
}

export function useOfflineMatch(params: UseOfflineMatchParams): UseOfflineMatchReturn {
  const { clubId, divisionId, teamId, clubName, teamName, divisionName, sport: initialSport, roster } = params;

  const [matchId, setMatchId] = useState<string | null>(null);
  const [homeScore, _setHomeScore] = useState(0);
  const [awayScore, _setAwayScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, _setIsActive] = useState(false);
  const [matchPhase, _setMatchPhase] = useState<"en_curso" | "entretiempo" | "finalizado">("en_curso");
  const [opponentName, _setOpponentName] = useState("Rival");
  const [playerCount, _setPlayerCount] = useState(initialSport === "rugby" ? 15 : 11);
  const [positions, _setPositions] = useState<PositionSlot[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, MatchPlayerStats>>({});
  const [matchEvents, setMatchEvents] = useState<OfflineMatchEvent[]>([]);
  const [sinBin, setSinBin] = useState<SinBinEntry[]>([]);
  const [hiaList, setHiaList] = useState<HIAEntry[]>([]);
  const [sport, _setSport] = useState<"hockey" | "rugby">(initialSport);
  const [storageWarning, setStorageWarning] = useState(false);
  const [ready, setReady] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<OfflineMatchState | null>(null);

  // ─── Initialize: Restore or Create Match ──────────────

  useEffect(() => {
    async function init() {
      try {
        // Check for existing active match
        const existing = await getActiveMatch(teamId);

        if (existing) {
          // Restore from IndexedDB
          restoreState(existing);
          setMatchId(existing.id);

          // Also restore events
          const savedEvents = await getMatchEvents(existing.id);
          setMatchEvents(savedEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
        } else {
          // Create new match
          const newId = generateMatchId(clubId, teamId);
          setMatchId(newId);

          // Initialize player stats from roster
          if (roster.length > 0) {
            const initialStats: Record<string, MatchPlayerStats> = {};
            roster.forEach((p: any) => {
              initialStats[p.playerId] = {
                playerId: p.playerId,
                playerName: p.playerName,
                playerPhoto: p.playerPhoto || "",
                timePlayed: 0,
                goals: 0,
                trys: 0,
                conversions: 0,
                penalties: 0,
                yellowCards: 0,
                redCards: 0,
              };
            });
            setPlayerStats(initialStats);
          }
        }

        // Check storage
        const quota = await checkStorageQuota();
        setStorageWarning(quota.warning);

        setReady(true);
      } catch (e) {
        console.error("[OfflineMatch] Init error:", e);
        // Still allow usage even if restore fails
        const newId = generateMatchId(clubId, teamId);
        setMatchId(newId);
        setReady(true);
      }
    }

    if (roster.length > 0) {
      init();
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
    };
  }, [clubId, teamId, roster.length]);

  // ─── Auto-persist to IndexedDB on state change ────────

  useEffect(() => {
    if (!matchId || !ready) return;

    const state = buildMatchState();
    stateRef.current = state;

    // Debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMatch(state).catch(e => console.error("[OfflineMatch] Save error:", e));
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [matchId, homeScore, awayScore, seconds, isActive, matchPhase, opponentName, playerCount, positions, playerStats, sinBin, hiaList, sport, ready]);

  // ─── Timer ────────────────────────────────────────────

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
        // Update time played for assigned players
        const activeIds = positions.map(p => p.assignedPlayerId).filter(Boolean);
        setPlayerStats(prev => {
          const updated = { ...prev };
          activeIds.forEach(id => {
            if (id && updated[id]) {
              updated[id] = { ...updated[id], timePlayed: updated[id].timePlayed + 1 };
            }
          });
          return updated;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, positions]);

  // ─── Periodic Checkpoints ─────────────────────────────

  useEffect(() => {
    if (!matchId || !ready) return;

    checkpointTimerRef.current = setInterval(async () => {
      if (!stateRef.current) return;
      const events = await getMatchEvents(matchId);
      const checkpoint: MatchCheckpoint = {
        id: generateLocalId("ckpt"),
        matchId,
        state: stateRef.current,
        events,
        createdAt: new Date().toISOString(),
      };
      await saveCheckpoint(checkpoint);
      await cleanupCheckpoints(matchId, 3);
    }, CHECKPOINT_INTERVAL_MS);

    return () => {
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
    };
  }, [matchId, ready]);

  // ─── State Builder ────────────────────────────────────

  const buildMatchState = useCallback((): OfflineMatchState => {
    return {
      id: matchId!,
      clubId,
      divisionId,
      teamId,
      clubName,
      teamName,
      divisionName,
      sport,
      opponentName,
      homeScore,
      awayScore,
      seconds,
      isActive,
      matchPhase,
      playerCount,
      positions,
      playerStats,
      sinBin,
      hiaList,
      createdAt: stateRef.current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };
  }, [matchId, clubId, divisionId, teamId, clubName, teamName, divisionName, sport, opponentName, homeScore, awayScore, seconds, isActive, matchPhase, playerCount, positions, playerStats, sinBin, hiaList]);

  // ─── Restore State ────────────────────────────────────

  const restoreState = (m: OfflineMatchState) => {
    _setHomeScore(m.homeScore);
    _setAwayScore(m.awayScore);
    setSeconds(m.seconds);
    // Don't auto-resume timer — let user press play
    _setIsActive(false);
    _setMatchPhase(m.matchPhase);
    _setOpponentName(m.opponentName);
    _setPlayerCount(m.playerCount);
    _setPositions(m.positions);
    setPlayerStats(m.playerStats);
    setSinBin(m.sinBin);
    setHiaList(m.hiaList);
    _setSport(m.sport);
  };

  // ─── Wrapped Setters (trigger auto-save) ──────────────

  const setHomeScore = useCallback((v: number | ((prev: number) => number)) => {
    _setHomeScore(v);
  }, []);

  const setAwayScore = useCallback((v: number | ((prev: number) => number)) => {
    _setAwayScore(v);
  }, []);

  const setIsActive = useCallback((v: boolean) => {
    _setIsActive(v);
  }, []);

  const setMatchPhase = useCallback((v: "en_curso" | "entretiempo" | "finalizado") => {
    _setMatchPhase(v);
  }, []);

  const setOpponentName = useCallback((v: string) => {
    _setOpponentName(v);
  }, []);

  const setPlayerCount = useCallback((v: number) => {
    _setPlayerCount(v);
  }, []);

  const setSportWrapped = useCallback((v: "hockey" | "rugby") => {
    _setSport(v);
  }, []);

  const setPositions = useCallback((v: PositionSlot[] | ((prev: PositionSlot[]) => PositionSlot[])) => {
    _setPositions(v);
  }, []);

  // ─── Record Event ─────────────────────────────────────

  const recordEvent = useCallback((
    type: OfflineMatchEvent["type"],
    playerId?: string,
    playerName?: string,
    data?: Record<string, any>,
  ) => {
    if (!matchId) return;

    const event: OfflineMatchEvent = {
      id: generateLocalId("evt"),
      matchId,
      type,
      playerId,
      playerName,
      minute: Math.floor(seconds / 60),
      timestamp: new Date().toISOString(),
      data,
      synced: false,
    };

    addEvent(event).catch(e => console.error("[OfflineMatch] Event save error:", e));
    setMatchEvents(prev => [event, ...prev]);
  }, [matchId, seconds]);

  // ─── Sin-Bin ──────────────────────────────────────────

  const addSinBin = useCallback((entry: SinBinEntry) => {
    setSinBin(prev => [...prev, entry]);
  }, []);

  const removeSinBin = useCallback((playerId: string) => {
    setSinBin(prev => prev.filter(s => s.playerId !== playerId));
  }, []);

  // ─── HIA ──────────────────────────────────────────────

  const addHIA = useCallback((entry: HIAEntry) => {
    setHiaList(prev => [...prev, entry]);
  }, []);

  const removeHIA = useCallback((playerId: string) => {
    setHiaList(prev => prev.filter(h => h.playerId !== playerId));
  }, []);

  // ─── Update Player Stats ─────────────────────────────

  const updatePlayerStats = useCallback((playerId: string, updates: Partial<MatchPlayerStats>) => {
    setPlayerStats(prev => {
      const existing = prev[playerId];
      if (!existing) return prev;
      return { ...prev, [playerId]: { ...existing, ...updates } };
    });
  }, []);

  // ─── Get Current State ────────────────────────────────

  const getMatchState = useCallback((): OfflineMatchState | null => {
    return stateRef.current;
  }, []);

  return {
    matchId,
    homeScore,
    awayScore,
    seconds,
    isActive,
    matchPhase,
    opponentName,
    playerCount,
    positions,
    playerStats,
    matchEvents,
    sinBin,
    hiaList,
    sport,
    storageWarning,
    setHomeScore,
    setAwayScore,
    setIsActive,
    setMatchPhase,
    setOpponentName,
    setPlayerCount,
    setSport: setSportWrapped,
    setPositions,
    recordEvent,
    addSinBin,
    removeSinBin,
    addHIA,
    removeHIA,
    updatePlayerStats,
    getMatchState,
    ready,
  };
}
