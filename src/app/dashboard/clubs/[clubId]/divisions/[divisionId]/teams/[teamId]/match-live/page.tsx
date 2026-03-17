
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  UserPlus, 
  Trophy, 
  ChevronLeft,
  Loader2,
  Save,
  Clock,
  Activity,
  Users,
  ShieldCheck,
  RefreshCw,
  GripVertical,
  X
} from "lucide-react";
import { doc, setDoc, collection } from "firebase/firestore";
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
  timePlayed: number; // en segundos
  goals: number;
  yellowCards: number;
  redCards: number;
}

export default function MatchLiveTrackerPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const fieldRef = useRef<HTMLDivElement>(null);

  // Estados de Partido
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [opponentName, setOpponentName] = useState("Rival");
  
  // Estados de Pizarra
  const [playerCount, setPlayerCount] = useState(11);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  
  // Estadísticas acumuladas
  const [playerStats, setPlayerStats] = useState<Record<string, MatchPlayerStats>>({});
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  // Cargar datos del equipo
  const teamRef = useMemoFirebase(() => 
    doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), 
    [db, clubId, divisionId, teamId]
  );
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  // Cargar roster
  const rosterQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), 
    [db, clubId, divisionId, teamId]
  );
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  // Inicializar estadísticas cuando carga el roster
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
          yellowCards: 0,
          redCards: 0
        };
      });
      setPlayerStats(initialStats);
    }
  }, [roster]);

  // Inicializar posiciones de la pizarra
  useEffect(() => {
    const newPositions: PositionSlot[] = [];
    newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK', assignedPlayerId: null });

    const remaining = playerCount - 1;
    const defCount = Math.ceil(remaining * 0.35);
    const midCount = Math.ceil(remaining * 0.35);
    const fwdCount = remaining - defCount - midCount;

    for (let i = 0; i < defCount; i++) {
      newPositions.push({ id: `pos-df-${i}`, x: (100 / (defCount + 1)) * (i + 1), y: 70, label: 'DF', assignedPlayerId: null });
    }
    for (let i = 0; i < midCount; i++) {
      newPositions.push({ id: `pos-md-${i}`, x: (100 / (midCount + 1)) * (i + 1), y: 45, label: 'MF', assignedPlayerId: null });
    }
    for (let i = 0; i < fwdCount; i++) {
      newPositions.push({ id: `pos-fw-${i}`, x: (100 / (fwdCount + 1)) * (i + 1), y: 20, label: 'FW', assignedPlayerId: null });
    }
    setPositions(newPositions);
  }, [playerCount]);

  // Lógica del Cronómetro y Tiempo de Juego
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
        
        // Identificar quiénes están en cancha (asignados a un slot)
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

  // Manejo de movimiento de fichas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPosId || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPositions(prev => prev.map(p => 
      p.id === draggingPosId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    ));
  };

  // Drag & Drop para asignar jugadores
  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDropOnSlot = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;

    setPositions(prev => {
      // Quitar de cualquier otro slot (cambio)
      const cleaned = prev.map(p => p.assignedPlayerId === playerId ? { ...p, assignedPlayerId: null } : p);
      // Asignar al nuevo slot
      return cleaned.map(p => p.id === slotId ? { ...p, assignedPlayerId: playerId } : p);
    });
  };

  const handleUnassign = (slotId: string) => {
    setPositions(prev => prev.map(p => p.id === slotId ? { ...p, assignedPlayerId: null } : p));
  };

  const handleEvent = (playerId: string, type: 'goal' | 'yellow' | 'red') => {
    const player = playerStats[playerId];
    if (!player) return;

    const eventMinute = Math.floor(seconds / 60);
    const newEvent = {
      type,
      playerId,
      playerName: player.playerName,
      minute: eventMinute,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // 1. Registrar evento en la lista de incidencias
    setMatchEvents(prev => [newEvent, ...prev]);

    // 2. Actualizar marcador si es gol (Separado para evitar doble incremento)
    if (type === 'goal') {
      setHomeScore(s => s + 1);
    }

    // 3. Actualizar estadísticas individuales de la jugadora
    setPlayerStats(prev => {
      const p = prev[playerId];
      if (!p) return prev;
      
      const updated = { ...p };
      if (type === 'goal') updated.goals += 1;
      if (type === 'yellow') updated.yellowCards += 1;
      if (type === 'red') updated.redCards += 1;
      
      return { ...prev, [playerId]: updated };
    });

    // 4. Si es roja, remover del campo automáticamente
    if (type === 'red') {
      setPositions(pos => pos.map(slot => slot.assignedPlayerId === playerId ? { ...slot, assignedPlayerId: null } : slot));
    }

    toast({ title: "Evento Registrado", description: `${type.toUpperCase()} - ${player.playerName} (min ${eventMinute})` });
  };

  const handleFinalizeMatch = async () => {
    setIsActive(false);
    const matchId = `live_${Date.now()}`;
    
    try {
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
        if (p.timePlayed > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0) {
          const statId = `${matchId}_${pId}`;
          const statDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", matchId, "stats", statId);
          await setDoc(statDoc, {
            id: statId,
            matchId,
            playerId: pId,
            playerName: p.playerName,
            goals: p.goals,
            assists: 0,
            yellowCards: p.yellowCards,
            redCards: p.redCards,
            minutesPlayed: Math.floor(p.timePlayed / 60),
            createdAt: new Date().toISOString()
          });
        }
      }

      toast({ title: "Partido Guardado", description: "Estadísticas procesadas correctamente." });
      router.push(`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron salvar los datos." });
    }
  };

  if (rosterLoading || teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 select-none" 
         onMouseMove={handleMouseMove} 
         onMouseUp={() => setDragPosId(null)}>
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Match Live Console</h1>
            <p className="text-muted-foreground">Pizarra interactiva y control de incidencias.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { if(confirm("¿Reiniciar reloj?")) setSeconds(0) }} disabled={isActive}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleFinalizeMatch} className="bg-primary hover:bg-primary/90 font-bold gap-2">
            <Save className="h-4 w-4" /> Finalizar Partido
          </Button>
        </div>
      </header>

      {/* Marcador y Reloj Principal */}
      <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Local */}
            <div className="text-center space-y-2">
              <Badge className="bg-primary text-white border-none uppercase text-[10px] tracking-widest px-3">Local</Badge>
              <h2 className="text-xl font-black truncate">{team?.name || "Mi Equipo"}</h2>
              <div className="flex items-center justify-center gap-4">
                <div className="text-6xl font-black tabular-nums">{homeScore}</div>
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => s + 1)} className="h-6 w-6 p-0 text-xs">+</Button>
                  <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => Math.max(0, s - 1))} className="h-6 w-6 p-0 text-xs">-</Button>
                </div>
              </div>
            </div>

            {/* Cronómetro */}
            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-5xl font-black font-mono tracking-tighter tabular-nums text-primary">
                {formatTime(seconds)}
              </div>
              <div className="mt-4 flex gap-4">
                <Button 
                  size="lg" 
                  className={cn("rounded-full h-12 w-12 shadow-lg", isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600")}
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                </Button>
              </div>
              <p className="mt-2 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                {isActive ? "Tiempo de Juego" : "Pausado"}
              </p>
            </div>

            {/* Visitante */}
            <div className="text-center space-y-2">
              <Badge className="bg-slate-700 text-white border-none uppercase text-[10px] tracking-widest px-3">Visitante</Badge>
              <Input 
                value={opponentName} 
                onChange={(e) => setOpponentName(e.target.value)} 
                className="bg-transparent border-none text-center text-xl font-black text-white focus-visible:ring-0 p-0 h-auto"
                placeholder="Rival..."
              />
              <div className="flex items-center justify-center gap-4">
                <div className="text-6xl font-black tabular-nums">{awayScore}</div>
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 1)} className="h-6 w-6 p-0 text-xs">+</Button>
                  <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => Math.max(0, s - 1))} className="h-6 w-6 p-0 text-xs">-</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pizarra del Campo */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Campo de Juego
            </h3>
            <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
              <Label className="text-[10px] font-bold uppercase">Sistema:</Label>
              <Badge variant="secondary" className="font-black">{playerCount} vs {playerCount}</Badge>
              <Slider 
                className="w-32"
                value={[playerCount]} 
                min={5} max={11} step={1} 
                onValueChange={(v) => setPlayerCount(v[0])}
              />
            </div>
          </div>
          
          <div 
            ref={fieldRef}
            className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#244d1f] rounded-2xl border-[6px] border-white shadow-2xl overflow-hidden cursor-crosshair"
          >
            {/* Marcado de Cancha (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50" viewBox="0 0 100 150">
              <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.8" />
              <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.8" />
              <path d="M 15 0 Q 15 30 50 30 Q 85 30 85 0" fill="none" stroke="white" strokeWidth="0.8" />
              <path d="M 15 150 Q 15 120 50 120 Q 85 120 85 150" fill="none" stroke="white" strokeWidth="0.8" />
            </svg>
            
            {/* Fichas de Jugadoras */}
            {positions.map((p) => {
              const stats = p.assignedPlayerId ? playerStats[p.assignedPlayerId] : null;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75",
                    draggingPosId === p.id ? "scale-110 z-50" : "z-10"
                  )}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onMouseDown={() => setDragPosId(p.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropOnSlot(e, p.id)}
                >
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <Avatar className={cn(
                        "h-14 w-14 border-2 shadow-xl bg-background transition-all",
                        stats ? "border-primary" : "border-dashed border-white/40 bg-white/5"
                      )}>
                        <AvatarImage src={stats?.playerPhoto} />
                        <AvatarFallback className="text-[10px] font-black opacity-50">{p.label}</AvatarFallback>
                      </Avatar>
                      
                      {stats && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUnassign(p.id); }}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {/* Botones de acción rápidos al hover */}
                      {stats && (
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-50">
                          <Button size="icon" className="h-7 w-7 rounded-full bg-primary" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'goal'); }}>⚽</Button>
                          <Button size="icon" className="h-7 w-7 rounded-full bg-yellow-500" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'yellow'); }}>🟨</Button>
                          <Button size="icon" className="h-7 w-7 rounded-full bg-red-600" onClick={(e) => { e.stopPropagation(); handleEvent(stats.playerId, 'red'); }}>🟥</Button>
                        </div>
                      )}
                    </div>
                    
                    {stats && (
                      <div className="mt-1 flex flex-col items-center">
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-full text-[9px] font-bold text-white whitespace-nowrap shadow-sm">
                          {stats.playerName.split(' ')[0]}
                        </span>
                        <span className="text-[8px] font-black text-primary bg-white/90 px-1 rounded mt-0.5">
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

        {/* Banco de Suplentes */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col border-none shadow-xl bg-slate-50">
            <CardHeader className="bg-slate-200/50 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" /> Banco de Suplentes
              </CardTitle>
              <CardDescription className="text-[10px] font-bold">Arrastra al campo para realizar el cambio</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[450px]">
                <div className="p-4 space-y-2">
                  {roster?.map((p: any) => {
                    const stats = playerStats[p.playerId];
                    const isAssigned = positions.some(pos => pos.assignedPlayerId === p.playerId);
                    return (
                      <div 
                        key={p.id} 
                        draggable={!isAssigned}
                        onDragStart={(e) => onDragStartPlayer(e, p.playerId)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border-2 transition-all group",
                          isAssigned 
                            ? "bg-muted/50 opacity-40 border-transparent grayscale" 
                            : "bg-white border-transparent hover:border-primary/30 shadow-sm cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-slate-100">
                            <AvatarImage src={p.playerPhoto} />
                            <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">{p.playerName}</span>
                            <span className="text-[9px] font-medium text-muted-foreground mt-1">
                              {isAssigned ? "EN CAMPO" : `Jugado: ${Math.floor((stats?.timePlayed || 0) / 60)} min`}
                            </span>
                          </div>
                        </div>
                        {!isAssigned && <GripVertical className="h-4 w-4 text-muted-foreground opacity-30" />}
                        {isAssigned && <RefreshCw className="h-3 w-3 text-primary animate-spin-slow" />}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Registro de Incidencias */}
          <Card className="h-fit shadow-md border-none bg-slate-900 text-white">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-3 w-3 text-primary" /> Acta del Partido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[150px]">
                <div className="p-2 space-y-1">
                  {matchEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-2 rounded bg-white/5 text-[10px] border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-primary">{ev.minute}'</span>
                        <span className="font-bold">{ev.type === 'goal' ? '⚽ GOL' : ev.type === 'yellow' ? '🟨 AMARILLA' : '🟥 ROJA'}</span>
                      </div>
                      <span className="opacity-60 truncate max-w-[80px]">{ev.playerName.split(' ')[0]}</span>
                    </div>
                  ))}
                  {matchEvents.length === 0 && (
                    <p className="text-center py-8 text-[10px] opacity-30 font-bold uppercase">Sin incidencias</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
