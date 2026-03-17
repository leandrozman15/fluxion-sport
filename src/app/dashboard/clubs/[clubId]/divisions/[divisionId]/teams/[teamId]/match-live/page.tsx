
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  UserPlus, 
  UserMinus, 
  Trophy, 
  Flag, 
  ChevronLeft,
  Loader2,
  Save,
  Clock,
  Activity,
  Zap,
  Users,
  ShieldCheck,
  ArrowRightLeft
} from "lucide-react";
import { doc, setDoc, collection } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MatchPlayer {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  isOnField: boolean;
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

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [opponentName, setOpponentName] = useState("Rival");
  
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  // Cargar datos del equipo específico
  const teamRef = useMemoFirebase(() => 
    doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), 
    [db, clubId, divisionId, teamId]
  );
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  // Cargar roster del equipo
  const rosterQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), 
    [db, clubId, divisionId, teamId]
  );
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  useEffect(() => {
    if (roster && matchPlayers.length === 0) {
      setMatchPlayers(roster.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        playerPhoto: p.playerPhoto,
        isOnField: false,
        timePlayed: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0
      })));
    }
  }, [roster, matchPlayers.length]);

  // Lógica del Cronómetro
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
        setMatchPlayers(prev => prev.map(p => 
          p.isOnField ? { ...p, timePlayed: p.timePlayed + 1 } : p
        ));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTogglePlayer = (playerId: string) => {
    setMatchPlayers(prev => prev.map(p => 
      p.playerId === playerId ? { ...p, isOnField: !p.isOnField } : p
    ));
  };

  const handleEvent = (playerId: string, type: 'goal' | 'yellow' | 'red') => {
    const player = matchPlayers.find(p => p.playerId === playerId);
    if (!player) return;

    const eventMinute = Math.floor(seconds / 60);
    const newEvent = {
      type,
      playerId,
      playerName: player.playerName,
      minute: eventMinute,
      id: Date.now().toString()
    };

    setMatchEvents(prev => [newEvent, ...prev]);

    setMatchPlayers(prev => prev.map(p => {
      if (p.playerId === playerId) {
        if (type === 'goal') {
          setHomeScore(s => s + 1);
          return { ...p, goals: p.goals + 1 };
        }
        if (type === 'yellow') return { ...p, yellowCards: p.yellowCards + 1 };
        if (type === 'red') return { ...p, redCards: p.redCards + 1, isOnField: false };
      }
      return p;
    }));

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

      for (const p of matchPlayers) {
        if (p.timePlayed > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0) {
          const statId = `${matchId}_${p.playerId}`;
          const statDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", matchId, "stats", statId);
          await setDoc(statDoc, {
            id: statId,
            matchId,
            playerId: p.playerId,
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

  const playersOnField = matchPlayers.filter(p => p.isOnField);
  const playersOnBench = matchPlayers.filter(p => !p.isOnField);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Match Live Console</h1>
            <p className="text-muted-foreground">Panel táctico y control de incidencias.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pizarra del Campo (Cancha) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Campo de Juego ({playersOnField.length})
            </h3>
          </div>
          
          <div className="relative w-full aspect-[4/3] bg-[#244d1f] rounded-2xl border-[6px] border-white shadow-2xl overflow-hidden p-4">
            {/* Marcado de Cancha */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.1) 20%)' }} />
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/50 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
            
            {/* Jugadoras en Cancha */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full content-start overflow-y-auto pr-2 custom-scrollbar">
              {playersOnField.map((p) => (
                <Card key={p.playerId} className="bg-white/95 backdrop-blur shadow-lg border-none overflow-hidden h-fit animate-in zoom-in-95 duration-200">
                  <div className="p-2 border-b flex items-center gap-2 bg-muted/30">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarImage src={p.playerPhoto} />
                      <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black truncate">{p.playerName.split(' ')[0]}</p>
                      <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground">
                        <Clock className="h-2 w-2" /> {formatTime(p.timePlayed)}'
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-orange-600 hover:bg-orange-50"
                      onClick={() => handleTogglePlayer(p.playerId)}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 divide-x text-center bg-white">
                    <button 
                      className="py-2 hover:bg-primary/5 transition-colors text-xs font-black text-primary"
                      onClick={() => handleEvent(p.playerId, 'goal')}
                    >
                      ⚽ {p.goals > 0 && <span className="ml-1 text-[8px] bg-primary text-white rounded-full px-1">{p.goals}</span>}
                    </button>
                    <button 
                      className="py-2 hover:bg-yellow-50 transition-colors text-xs"
                      onClick={() => handleEvent(p.playerId, 'yellow')}
                    >
                      🟨 {p.yellowCards > 0 && <span className="ml-1 text-[8px] bg-yellow-500 text-white rounded-full px-1">{p.yellowCards}</span>}
                    </button>
                    <button 
                      className="py-2 hover:bg-red-50 transition-colors text-xs"
                      onClick={() => handleEvent(p.playerId, 'red')}
                    >
                      🟥
                    </button>
                  </div>
                </Card>
              ))}
              {playersOnField.length === 0 && (
                <div className="col-span-full h-full flex flex-col items-center justify-center text-white/30 text-center py-20">
                  <ArrowRightLeft className="h-12 w-12 mb-2 opacity-20" />
                  <p className="font-bold uppercase tracking-widest">Cancha Vacía</p>
                  <p className="text-xs">Ingresa jugadoras desde el banco de suplentes.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pizarra del Banco (Suplentes) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col border-none shadow-xl bg-slate-50">
            <CardHeader className="bg-slate-200/50 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" /> Banco de Suplentes
              </CardTitle>
              <CardDescription className="text-[10px] font-bold">Listas para entrar ({playersOnBench.length})</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[450px]">
                <div className="p-4 space-y-3">
                  {playersOnBench.map((p) => (
                    <div 
                      key={p.playerId} 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-transparent hover:border-primary/30 shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-slate-100">
                          <AvatarImage src={p.playerPhoto} />
                          <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-none">{p.playerName}</span>
                          <span className="text-[9px] font-medium text-muted-foreground mt-1">Jugado: {Math.floor(p.timePlayed / 60)} min</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1 font-bold text-[10px] uppercase border-slate-200 hover:bg-primary hover:text-white hover:border-primary transition-all"
                        onClick={() => handleTogglePlayer(p.playerId)}
                      >
                        <UserPlus className="h-3 w-3" /> Entrar
                      </Button>
                    </div>
                  ))}
                  {playersOnBench.length === 0 && (
                    <div className="text-center py-12 opacity-30">
                      <p className="text-[10px] font-black uppercase">Sin jugadoras en banco</p>
                    </div>
                  )}
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
