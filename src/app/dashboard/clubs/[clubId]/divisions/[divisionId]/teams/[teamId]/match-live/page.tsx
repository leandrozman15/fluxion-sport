
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  ChevronLeft,
  Loader2,
  Save,
  Activity,
  Users,
  ShieldCheck,
  GripVertical,
  X,
  Target,
  AlertCircle,
  History,
  Stethoscope,
  HeartPulse,
  UserPlus,
  ArrowLeft,
  Shield,
  Maximize2,
} from "lucide-react";
import { HockeyTacticalBoard } from "@/components/dashboard/hockey-tactical-board";
import { doc, setDoc, collection, deleteDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PositionSlot {
  id: string;
  x: number;
  y: number;
  label: string;
  assignedPlayerId: string | null;
}

interface MatchPlayerStats {
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

interface SinBinPlayer {
  playerId: string;
  playerName: string;
  returnTime: number; 
}

interface HIAPlayer {
  playerId: string;
  playerName: string;
  replacedByPlayerId: string;
  positionId: string;
  startTime: number;
  type: 'blood' | 'hia';
}

export default function MatchLiveTrackerPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const fieldRef = useRef<HTMLDivElement>(null);

  // Match States
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [opponentName, setOpponentName] = useState("Rival");
  const [sport, setSport] = useState<'hockey' | 'rugby'>('hockey');
  const [matchPhase, setMatchPhase] = useState<'en_curso' | 'entretiempo' | 'finalizado'>('en_curso');
  
  // Tactical States
  const [playerCount, setPlayerCount] = useState(11);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  
  // Stats
  const [playerStats, setPlayerStats] = useState<Record<string, MatchPlayerStats>>({});
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [sinBin, setSinBin] = useState<SinBinPlayer[]>([]);
  const [hiaList, setHiaList] = useState<HIAPlayer[]>([]);
  
  // HIA Dialog State
  const [medicalModal, setMedicalModal] = useState<{ isOpen: boolean, playerId: string, positionId: string } | null>(null);

  // Pizarra state
  const [showTacticalBoard, setShowTacticalBoard] = useState(false);

  const teamRef = useMemoFirebase(() => 
    doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), 
    [db, clubId, divisionId, teamId]
  );
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const divisionRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId), [db, clubId, divisionId]);
  const { data: division } = useDoc(divisionRef);

  const rosterQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), 
    [db, clubId, divisionId, teamId]
  );
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  // Roster sorted for tactical board: currently assigned players come first
  const boardRoster = useMemo(() => {
    if (!roster) return [];
    const assignedInOrder = positions
      .filter(p => p.assignedPlayerId)
      .map(p => roster.find((r: any) => r.playerId === p.assignedPlayerId))
      .filter(Boolean);
    const unassigned = roster.filter((r: any) => !positions.some(p => p.assignedPlayerId === r.playerId));
    return [...assignedInOrder, ...unassigned];
  }, [roster, positions]);

  // Sync Live Status to Index
  useEffect(() => {
    if (!db || !team) return;
    
    const liveDocId = `${clubId}_${teamId}_live`;
    const liveRef = doc(db, "live_matches_index", liveDocId);

    const updateLiveIndex = () => {
      const goalEvents = matchEvents
        .filter(e => e.type === 'goal' || e.type === 'try')
        .map(e => ({ playerName: e.playerName, minute: e.minute, type: e.type }))
        .slice(0, 20);
      setDoc(liveRef, {
        id: liveDocId,
        clubId,
        clubName: club?.name || "",
        clubLogo: club?.logoUrl || "",
        teamId,
        teamName: team.name,
        divisionId,
        divisionName: division?.name || "",
        sport: team.tacticalSport || team.sport || "hockey",
        homeScore,
        awayScore,
        opponentName,
        goalEvents,
        timeDisplay: formatTime(seconds),
        matchPhase,
        status: "live",
        updatedAt: new Date().toISOString()
      }, { merge: true });
    };

    if (isActive || seconds > 0) {
      updateLiveIndex();
    }
  }, [isActive, seconds, homeScore, awayScore, opponentName, matchEvents, matchPhase, team, club, division, db, clubId, divisionId, teamId]);

  useEffect(() => {
    if (roster && Object.keys(playerStats).length === 0) {
      const initialStats: Record<string, MatchPlayerStats> = {};
      roster.forEach(p => {
        initialStats[p.playerId] = {
          playerId: p.playerId,
          playerName: p.playerName,
          playerPhoto: p.playerPhoto,
          timePlayed: 0,
          goals: 0,
          trys: 0,
          conversions: 0,
          penalties: 0,
          yellowCards: 0,
          redCards: 0
        };
      });
      setPlayerStats(initialStats);
    }
  }, [roster, playerStats]);

  useEffect(() => {
    const newPositions: PositionSlot[] = [];
    
    if (sport === 'hockey') {
      newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK', assignedPlayerId: null });
      const remaining = playerCount - 1;
      const defCount = Math.ceil(remaining * 0.35);
      const midCount = Math.ceil(remaining * 0.35);
      const fwdCount = Math.max(0, remaining - defCount - midCount);

      for (let i = 0; i < defCount; i++) {
        newPositions.push({ id: `pos-df-${i}`, x: (100 / (defCount + 1)) * (i + 1), y: 70, label: 'DF', assignedPlayerId: null });
      }
      for (let i = 0; i < midCount; i++) {
        newPositions.push({ id: `pos-md-${i}`, x: (100 / (midCount + 1)) * (i + 1), y: 45, label: 'MF', assignedPlayerId: null });
      }
      for (let i = 0; i < fwdCount; i++) {
        newPositions.push({ id: `pos-fw-${i}`, x: (100 / (fwdCount + 1)) * (i + 1), y: 20, label: 'FW', assignedPlayerId: null });
      }
    } else {
      const fwds = Math.ceil(playerCount * 0.5);
      const backs = playerCount - fwds;
      for (let i = 0; i < fwds; i++) {
        newPositions.push({ id: `pos-rug-f-${i}`, x: (100 / (fwds + 1)) * (i + 1), y: 60, label: 'F', assignedPlayerId: null });
      }
      for (let i = 0; i < backs; i++) {
        newPositions.push({ id: `pos-rug-b-${i}`, x: (100 / (backs + 1)) * (i + 1), y: 35, label: 'B', assignedPlayerId: null });
      }
    }
    setPositions(newPositions);
  }, [playerCount, sport]);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
        const activeIds = positions.map(p => p.assignedPlayerId).filter(id => id !== null);
        setPlayerStats(prev => {
          const updated = { ...prev };
          activeIds.forEach(id => {
            if (updated[id!]) {
              updated[id!].timePlayed += 1;
            }
          });
          return updated;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, positions]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPosId || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPositions(prev => prev.map(p =>
      p.id === draggingPosId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    ));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingPosId || !fieldRef.current) return;
    const touch = e.touches[0];
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setPositions(prev => prev.map(p =>
      p.id === draggingPosId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    ));
  };

  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    if (sinBin.some(s => s.playerId === playerId)) {
      e.preventDefault();
      toast({ variant: "destructive", title: "Jugadora suspendida", description: "Debe cumplir el tiempo de Sin-Bin." });
      return;
    }
    if (hiaList.some(h => h.playerId === playerId)) {
      e.preventDefault();
      toast({ variant: "destructive", title: "Evaluación Médica", description: "La jugadora está bajo revisión HIA/Sangre." });
      return;
    }
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDropOnSlot = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;
    setPositions(prev => {
      const cleaned = prev.map(p => p.assignedPlayerId === playerId ? { ...p, assignedPlayerId: null } : p);
      return cleaned.map(p => p.id === slotId ? { ...p, assignedPlayerId: playerId } : p);
    });
  };

  const handleUnassign = (slotId: string) => {
    setPositions(prev => prev.map(p => p.id === slotId ? { ...p, assignedPlayerId: null } : p));
  };

  const handleEvent = (playerId: string, type: 'goal' | 'try' | 'conversion' | 'penalty' | 'yellow' | 'red') => {
    const player = playerStats[playerId];
    if (!player) return;

    const eventMinute = Math.floor(seconds / 60);
    const newEventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEvent = {
      type,
      playerId,
      playerName: player.playerName,
      minute: eventMinute,
      id: newEventId
    };

    setMatchEvents(prev => [newEvent, ...prev]);

    // Update Score
    if (type === 'goal') setHomeScore(s => s + 1);
    if (type === 'try') setHomeScore(s => s + 5);
    if (type === 'conversion') setHomeScore(s => s + 2);
    if (type === 'penalty') setHomeScore(s => s + 3);

    setPlayerStats(prev => {
      const p = prev[playerId];
      if (!p) return prev;
      const updated = { ...p };
      if (type === 'goal') updated.goals += 1;
      if (type === 'try') updated.trys += 1;
      if (type === 'conversion') updated.conversions += 1;
      if (type === 'penalty') updated.penalties += 1;
      if (type === 'yellow') updated.yellowCards += 1;
      if (type === 'red') updated.redCards += 1;
      return { ...prev, [playerId]: updated };
    });

    if (type === 'red') {
      setPositions(pos => pos.map(slot => slot.assignedPlayerId === playerId ? { ...slot, assignedPlayerId: null } : slot));
    }

    if (type === 'yellow' && sport === 'rugby') {
      const suspensionSeconds = 10 * 60;
      setSinBin(prev => [...prev, {
        playerId,
        playerName: player.playerName,
        returnTime: seconds + suspensionSeconds
      }]);
      setPositions(pos => pos.map(slot => slot.assignedPlayerId === playerId ? { ...slot, assignedPlayerId: null } : slot));
      toast({ title: "Sin-Bin Activo", description: `${player.playerName} suspendida por 10 minutos.` });
    }

    toast({ title: "Evento Registrado", description: `${type.toUpperCase()} - ${player.playerName} (min ${eventMinute})` });
  };

  const handleMedicalSustitution = (subPlayerId: string, type: 'blood' | 'hia') => {
    if (!medicalModal) return;
    
    const originalPlayerId = medicalModal.playerId;
    const posId = medicalModal.positionId;
    const player = playerStats[originalPlayerId];

    // 1. Añadir a la lista HIA
    setHiaList(prev => [...prev, {
      playerId: originalPlayerId,
      playerName: player.playerName,
      replacedByPlayerId: subPlayerId,
      positionId: posId,
      startTime: seconds,
      type
    }]);

    // 2. Realizar el cambio en el campo
    setPositions(prev => prev.map(p => p.id === posId ? { ...p, assignedPlayerId: subPlayerId } : p));

    setMedicalModal(null);
    toast({ title: `Cambio por ${type.toUpperCase()}`, description: `${player.playerName} sale para evaluación.` });
  };

  const handleMedicalReturn = (hia: HIAPlayer) => {
    // La jugadora original vuelve al campo, el suplente vuelve al banco
    setPositions(prev => {
      // Primero sacamos al suplente de donde esté
      const cleaned = prev.map(p => p.assignedPlayerId === hia.replacedByPlayerId ? { ...p, assignedPlayerId: null } : p);
      // Ponemos a la original en su posición guardada
      return cleaned.map(p => p.id === hia.positionId ? { ...p, assignedPlayerId: hia.playerId } : p);
    });

    setHiaList(prev => prev.filter(h => h.playerId !== hia.playerId));
    toast({ title: "Jugadora Recuperada", description: `${hia.playerName} reingresa al campo.` });
  };

  const handleFinalizeMatch = async () => {
    if(!confirm("¿Deseas finalizar el partido y guardar las estadísticas?")) return;
    
    setIsActive(false);
    const matchId = `live_${Date.now()}`;
    try {
      // 1. Limpiar el índice live
      const liveDocId = `${clubId}_${teamId}_live`;
      await deleteDoc(doc(db, "live_matches_index", liveDocId));

      const eventDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", matchId);
      await setDoc(eventDoc, {
        id: matchId,
        title: `Resultado vs ${opponentName}`,
        type: "match",
        status: "played",
        date: new Date().toISOString(),
        location: "Cancha Local",
        homeScore,
        awayScore,
        opponent: opponentName,
        matchFinished: true,
        duration: Math.floor(seconds / 60),
        createdAt: new Date().toISOString()
      });

      for (const pId in playerStats) {
        const p = playerStats[pId];
        if (p.timePlayed > 0 || p.goals > 0 || p.trys > 0 || p.yellowCards > 0 || p.redCards > 0) {
          const statId = `${matchId}_${pId}`;
          const statDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", matchId, "stats", statId);
          await setDoc(statDoc, {
            id: statId,
            matchId,
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
            createdAt: new Date().toISOString()
          });
        }
      }
      toast({ title: "Partido Guardado", description: "Estadísticas procesadas correctamente." });
      router.push(`/dashboard/coach`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron salvar los datos." });
    }
  };

  if (rosterLoading || teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
<div className="space-y-4 animate-in fade-in duration-500 pb-24 select-none"
           onMouseMove={handleMouseMove}
           onMouseUp={() => setDragPosId(null)}>
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="bg-white/10 text-white border-white/20">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black font-headline text-white drop-shadow-xl tracking-tight">Match Live Console</h1>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Control técnico en tiempo real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { if(confirm("¿Reiniciar reloj?")) setSeconds(0) }} disabled={isActive} className="bg-white/10 text-white border-white/20">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleFinalizeMatch} className="bg-white text-primary hover:bg-slate-50 font-black uppercase text-xs tracking-widest px-6 shadow-2xl">
            <Save className="h-4 w-4 mr-2" /> Finalizar
          </Button>
        </div>
      </header>

      <Card className="bg-white border-none shadow-xl overflow-hidden rounded-[2rem]">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-3 gap-3 items-center">
            {/* Home */}
            <div className="text-center space-y-1">
              <Badge className="bg-primary text-white border-none uppercase text-[9px] tracking-widest px-3 py-1 rounded-full">Local</Badge>
              <h2 className="text-sm font-black truncate text-slate-900 leading-none">{team?.name || "Mi Equipo"}</h2>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl md:text-5xl font-black tabular-nums text-slate-900 tracking-tighter">{homeScore}</div>
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => s + 1)} className="h-7 w-7 p-0 text-sm bg-slate-100 hover:bg-primary hover:text-white rounded-lg">+</Button>
                  <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => Math.max(0, s - 1))} className="h-7 w-7 p-0 text-sm bg-slate-100 rounded-lg">-</Button>
                </div>
              </div>
            </div>

            {/* Center: timer */}
            <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100">
              <div className="text-2xl md:text-3xl font-black font-mono tracking-tighter tabular-nums text-primary">
                {formatTime(seconds)}
              </div>
              <div className="mt-1.5 flex gap-1 flex-wrap justify-center">
                <Button size="sm" variant={matchPhase === 'en_curso' ? 'default' : 'outline'} className={cn("text-[7px] font-black uppercase rounded-full px-1.5 h-5", matchPhase === 'en_curso' && "bg-green-500 hover:bg-green-600")} onClick={() => setMatchPhase('en_curso')}>Curso</Button>
                <Button size="sm" variant={matchPhase === 'entretiempo' ? 'default' : 'outline'} className={cn("text-[7px] font-black uppercase rounded-full px-1.5 h-5", matchPhase === 'entretiempo' && "bg-yellow-500 hover:bg-yellow-600")} onClick={() => { setMatchPhase('entretiempo'); setIsActive(false); }}>ET</Button>
                <Button size="sm" variant={matchPhase === 'finalizado' ? 'default' : 'outline'} className={cn("text-[7px] font-black uppercase rounded-full px-1.5 h-5", matchPhase === 'finalizado' && "bg-red-500 hover:bg-red-600")} onClick={() => { setMatchPhase('finalizado'); setIsActive(false); }}>Fin</Button>
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  className={cn("rounded-full h-11 w-11 shadow-xl border-4 border-white transition-all", isActive ? "bg-orange-500 hover:bg-orange-600 scale-110" : "bg-green-500 hover:bg-green-600")}
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current translate-x-0.5" />}
                </Button>
              </div>
            </div>

            {/* Away */}
            <div className="text-center space-y-1">
              <Badge className="bg-slate-200 text-slate-600 border-none uppercase text-[9px] tracking-widest px-3 py-1 rounded-full">Visitante</Badge>
              <Input
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="bg-white border-2 text-center text-sm font-black text-slate-900 focus-visible:ring-primary h-8"
                placeholder="Rival..."
              />
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl md:text-5xl font-black tabular-nums text-slate-900 tracking-tighter">{awayScore}</div>
                <div className="flex flex-col gap-1">
                  {sport === 'rugby' ? (
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 5)} className="px-1 text-[9px] font-black bg-slate-100 h-6">+5</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 3)} className="px-1 text-[9px] font-black bg-slate-100 h-6">+3</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 2)} className="px-1 text-[9px] font-black bg-slate-100 h-6">+2</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => Math.max(0, s - 1))} className="px-1 text-[9px] font-black bg-slate-100 h-6">-1</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 1)} className="h-7 w-7 p-0 text-sm bg-slate-100 hover:bg-primary hover:text-white rounded-lg">+</Button>
                      <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => Math.max(0, s - 1))} className="h-7 w-7 p-0 text-sm bg-slate-100 rounded-lg">-</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">

        {/* ── Campo / Pizarra ──────────────────────────────── */}
        <div className="md:col-span-3 space-y-3">
          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
            <div className="flex items-center gap-3">
              <Tabs value={sport} onValueChange={(v: any) => {
                setSport(v);
                if (v === 'hockey' && playerCount > 11) setPlayerCount(11);
              }}>
                <TabsList className="h-8 bg-white/5 p-1">
                  <TabsTrigger value="hockey" className="text-[9px] uppercase font-bold text-white data-[state=active]:bg-white data-[state=active]:text-primary px-2">🏑 Hockey</TabsTrigger>
                  <TabsTrigger value="rugby" className="text-[9px] uppercase font-bold text-white data-[state=active]:bg-white data-[state=active]:text-primary px-2">🏉 Rugby</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Badge className="bg-white text-primary font-black h-6 text-[10px]">{playerCount}</Badge>
                <Slider className="w-20" value={[playerCount]} min={5} max={sport === 'rugby' ? 15 : 11} step={1} onValueChange={(v) => setPlayerCount(v[0])} />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowTacticalBoard(true)}
              className="h-8 px-4 font-black text-[9px] uppercase tracking-widest gap-1.5 bg-white text-primary hover:bg-slate-50 shadow rounded-xl"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Pizarra Táctica
            </Button>
          </div>

          {/* Field */}
          <div
            ref={fieldRef}
            className="relative w-full aspect-[2/3] max-w-sm md:max-w-none mx-auto bg-[#244d1f] rounded-[2rem] border-[8px] border-white shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden touch-none"
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setDragPosId(null)}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 150">
              {sport === 'hockey' ? (
                <>
                  <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1" />
                  <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M 15 0 Q 15 30 50 30 Q 85 30 85 0" fill="none" stroke="white" strokeWidth="1" />
                  <path d="M 15 150 Q 15 120 50 120 Q 85 120 85 150" fill="none" stroke="white" strokeWidth="1" />
                </>
              ) : (
                <>
                  <line x1="0" y1="15" x2="100" y2="15" stroke="white" strokeWidth="1.2" />
                  <line x1="0" y1="135" x2="100" y2="135" stroke="white" strokeWidth="1.2" />
                  <line x1="0" y1="40" x2="100" y2="40" stroke="white" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="0" y1="110" x2="100" y2="110" stroke="white" strokeWidth="0.8" strokeDasharray="3,3" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1.5" />
                </>
              )}
            </svg>

            {/* Player positions */}
            {positions.map((p) => {
              const stats = p.assignedPlayerId ? playerStats[p.assignedPlayerId] : null;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75",
                    draggingPosId === p.id ? "scale-125 z-50" : "z-10"
                  )}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onMouseDown={() => setDragPosId(p.id)}
                  onTouchStart={(e) => { e.stopPropagation(); setDragPosId(p.id); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropOnSlot(e, p.id)}
                >
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <Avatar className={cn(
                        "h-10 w-10 md:h-12 md:w-12 border-4 shadow-2xl bg-white transition-all",
                        stats ? "border-primary" : "border-dashed border-white/30 bg-black/10"
                      )}>
                        <AvatarImage src={club?.logoUrl} className="object-contain p-1" />
                        <AvatarFallback className="text-[9px] font-black opacity-50 bg-slate-100 text-slate-900">{p.label}</AvatarFallback>
                      </Avatar>
                      {stats && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnassign(p.id); }}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {stats && (
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-50 bg-white p-1.5 rounded-2xl shadow-2xl border border-slate-100">
                          {sport === 'hockey' ? (
                            <Button size="icon" className="h-8 w-8 rounded-xl bg-primary text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'goal'); }}>⚽</Button>
                          ) : (
                            <>
                              <Button size="icon" className="h-8 w-8 rounded-xl bg-orange-600 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'try'); }}>🏉</Button>
                              <Button size="icon" className="h-8 w-8 rounded-xl bg-blue-600 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'conversion'); }}>🎯</Button>
                              <Button size="icon" className="h-8 w-8 rounded-xl bg-green-600 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'penalty'); }}>👟</Button>
                              <Button size="icon" className="h-8 w-8 rounded-xl bg-red-500 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); setMedicalModal({ isOpen: true, playerId: stats.playerId, positionId: p.id }); }}>
                                <Stethoscope className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-yellow-500 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'yellow'); }}>🟨</Button>
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-red-600 text-white shadow-lg" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'red'); }}>🟥</Button>
                        </div>
                      )}
                    </div>
                    {stats && (
                      <div className="mt-1 flex flex-col items-center">
                        <span className="px-2 py-0.5 bg-slate-900 rounded-full text-[9px] font-black text-white shadow-xl border border-white/10">
                          {stats.playerName.split(' ')[0]}
                        </span>
                        <span className="text-[8px] font-black text-primary bg-white px-1.5 rounded-lg mt-0.5 shadow-md">
                          {formatTime(stats.timePlayed)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Banco + Acta ─────────────────────────────────── */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 px-5 border-b border-slate-100">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4 text-primary" /> Banco de Suplentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[320px] md:h-[400px]">
                <div className="p-3 space-y-2">
                  {roster?.map((p: any) => {
                    const stats = playerStats[p.playerId];
                    const isAssigned = positions.some(pos => pos.assignedPlayerId === p.playerId);
                    const isSuspended = sinBin.some(s => s.playerId === p.playerId);
                    const isMedical = hiaList.some(h => h.playerId === p.playerId);
                    return (
                      <div
                        key={p.id}
                        draggable={!isAssigned && !isSuspended && !isMedical}
                        onDragStart={(e) => onDragStartPlayer(e, p.playerId)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border-2 transition-all group",
                          isAssigned
                            ? "bg-slate-50/50 opacity-40 border-transparent grayscale"
                            : isSuspended || isMedical
                            ? "bg-red-50 border-red-100"
                            : "bg-white border-slate-100 shadow-md hover:border-primary hover:-translate-y-0.5 cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                              <AvatarImage src={club?.logoUrl} className="object-contain p-1" />
                              <AvatarFallback className="font-black text-slate-300">{p.playerName[0]}</AvatarFallback>
                            </Avatar>
                            {isSuspended && (
                              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] font-black rounded px-1 border border-white shadow">BIN</div>
                            )}
                            {isMedical && (
                              <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] font-black rounded px-1 border border-white shadow">MED</div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 leading-none">{p.playerName}</span>
                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                              {isAssigned ? "EN CAMPO" : isSuspended ? "SUSPENDIDA" : isMedical ? "EN REVISIÓN" : `${Math.floor((stats?.timePlayed || 0) / 60)} min`}
                            </span>
                          </div>
                        </div>
                        {!isAssigned && !isSuspended && !isMedical && <GripVertical className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />}
                        {isMedical && <HeartPulse className="h-4 w-4 text-red-500 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-none bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 py-3 px-5 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-slate-400">
                <History className="h-4 w-4 text-primary" /> Acta del Encuentro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[180px]">
                <div className="p-3 space-y-1.5">
                  {matchEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-primary tabular-nums">{ev.minute}'</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                          {ev.type === 'goal' ? '⚽ Gol' :
                           ev.type === 'try' ? '🏉 Try' :
                           ev.type === 'conversion' ? '🎯 Conv' :
                           ev.type === 'penalty' ? '👟 Pen' :
                           ev.type === 'yellow' ? '🟨' : '🟥'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 truncate max-w-[80px]">{ev.playerName.split(' ')[0]}</span>
                    </div>
                  ))}
                  {matchEvents.length === 0 && (
                    <div className="text-center py-8 opacity-30 text-[9px] font-black uppercase tracking-widest text-slate-400">Sin incidencias</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Tactical Board Overlay ─────────────────────────────────── */}
      {showTacticalBoard && (
        <div className="fixed inset-0 z-[60] bg-slate-950 overflow-y-auto animate-in fade-in duration-200">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-white font-black uppercase tracking-widest text-sm">Pizarra Táctica</span>
              <Badge className="bg-white/10 text-white/50 border-none text-[9px] font-bold uppercase tracking-widest">Independiente del partido en vivo</Badge>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowTacticalBoard(false)}
              className="text-white hover:bg-white/10 font-black uppercase text-[9px] tracking-widest gap-2 h-9 rounded-xl"
            >
              <X className="h-4 w-4" /> Volver al Partido
            </Button>
          </div>
          <div className="p-4">
            <HockeyTacticalBoard
              roster={boardRoster}
              clubLogo={club?.logoUrl || ""}
              initialPlayerCount={playerCount}
              initialSport={sport}
              teamId={teamId}
              clubId={clubId}
              divisionId={divisionId}
            />
          </div>
        </div>
      )}

      <Dialog open={!!medicalModal} onOpenChange={(open) => !open && setMedicalModal(null)}>
        <DialogContent className="bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-red-600">
              <HeartPulse className="h-7 w-7 animate-pulse" /> Sustitución Médica
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500">Protocolo de emergencia para retiro temporal del campo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Jugadora a Evaluar</Label>
              <div className="p-4 bg-red-50 rounded-2xl font-black text-red-900 border-2 border-red-100 flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src={club?.logoUrl} className="object-contain p-1" />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                {playerStats[medicalModal?.playerId || ""]?.playerName}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Suplente que Ingresa</Label>
              <ScrollArea className="h-48 border-2 border-slate-100 rounded-[1.5rem] bg-slate-50/50">
                <div className="p-3 space-y-2">
                  {roster?.filter(p => !positions.some(pos => pos.assignedPlayerId === p.playerId) && !sinBin.some(s => s.playerId === p.playerId) && !hiaList.some(h => h.playerId === p.playerId)).map(p => (
                    <Button 
                      key={p.playerId} 
                      variant="ghost" 
                      className="w-full justify-start gap-4 h-14 bg-white border-2 border-transparent hover:border-primary rounded-xl"
                      onClick={() => handleMedicalSustitution(p.playerId, 'hia')}
                    >
                      <Avatar className="h-9 w-9 border-2 border-slate-100">
                        <AvatarImage src={club?.logoUrl} className="object-contain p-1" />
                        <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-black text-slate-900">{p.playerName}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-14 border-2 border-red-100 text-red-700 font-black uppercase text-[10px] tracking-widest gap-3 rounded-xl" onClick={() => handleMedicalSustitution(roster?.find(p => !positions.some(pos => pos.assignedPlayerId === p.playerId))?.playerId, 'blood')}>
                <Activity className="h-5 w-5" /> Sangre
              </Button>
              <Button variant="destructive" className="h-14 gap-3 bg-red-600 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-red-500/20" onClick={() => handleMedicalSustitution(roster?.find(p => !positions.some(pos => pos.assignedPlayerId === p.playerId))?.playerId, 'hia')}>
                <ShieldCheck className="h-5 w-5" /> Protocolo HIA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
