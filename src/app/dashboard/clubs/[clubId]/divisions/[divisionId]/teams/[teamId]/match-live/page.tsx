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
  UserCheck,
  Zap,
  Users
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MatchPlayer {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  isOnField: boolean;
  timePlayed: number; // in seconds
  goals: number;
  yellowCards: number;
  redCards: number;
}

export default function MatchLiveTrackerPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [matchStarted, setMatchFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [opponentName, setOpponentName] = useState("Rival");
  
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  // Cargar datos del equipo
  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  // Cargar roster del equipo
  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
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
        setSeconds(seconds => seconds + 1);
        
        // Actualizar tiempo de juego de las jugadoras en campo
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

    toast({ title: "Evento Registrado", description: `${type.toUpperCase()} para ${player.playerName} al min ${eventMinute}` });
  };

  const handleFinalizeMatch = async () => {
    setIsActive(false);
    const matchId = `live_${Date.now()}`;
    
    try {
      // 1. Guardar el evento del partido en el calendario del equipo
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

      // 2. Guardar estadísticas individuales para cada jugadora
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

      toast({ title: "Partido Finalizado", description: "Las estadísticas han sido guardadas correctamente." });
      router.push(`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron salvar los datos del partido." });
    }
  };

  if (rosterLoading || teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Match Live Tracker</h1>
            <p className="text-muted-foreground">Control de tiempo y estadísticas en tiempo real.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSeconds(0)} disabled={isActive}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Reloj
          </Button>
          <Button onClick={handleFinalizeMatch} className="bg-primary hover:bg-primary/90 font-bold gap-2">
            <Save className="h-4 w-4" /> Finalizar y Guardar
          </Button>
        </div>
      </header>

      {/* Panel Superior: Marcador y Reloj */}
      <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-none shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Trophy className="h-40 w-40 rotate-12" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="text-center space-y-4">
              <Badge className="bg-white/20 text-white border-none uppercase tracking-widest px-4">Local</Badge>
              <h2 className="text-2xl font-black truncate">{team?.name || "Mi Equipo"}</h2>
              <div className="text-7xl font-black tabular-nums">{homeScore}</div>
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => Math.max(0, s - 1))} className="h-8 w-8 p-0">-</Button>
                <Button variant="secondary" size="sm" onClick={() => setHomeScore(s => s + 1)} className="h-8 w-8 p-0">+</Button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-6 bg-black/20 rounded-3xl p-8 backdrop-blur-sm border border-white/10 shadow-inner">
              <div className="text-6xl font-black font-mono tracking-tighter tabular-nums drop-shadow-lg">
                {formatTime(seconds)}
              </div>
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  className={cn("rounded-full h-16 w-16 shadow-xl", isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600")}
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
                </Button>
              </div>
              <Badge variant="outline" className="text-white border-white/30 px-6 py-1 font-bold">
                {isActive ? "TIEMPO CORRIENDO" : "PAUSADO"}
              </Badge>
            </div>

            <div className="text-center space-y-4">
              <Badge className="bg-white/20 text-white border-none uppercase tracking-widest px-4">Rival</Badge>
              <Input 
                value={opponentName} 
                onChange={(e) => setOpponentName(e.target.value)} 
                className="bg-transparent border-none text-center text-2xl font-black text-white focus-visible:ring-0 p-0 h-auto"
                placeholder="Nombre Rival..."
              />
              <div className="text-7xl font-black tabular-nums">{awayScore}</div>
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => Math.max(0, s - 1))} className="h-8 w-8 p-0">-</Button>
                <Button variant="secondary" size="sm" onClick={() => setAwayScore(s => s + 1)} className="h-8 w-8 p-0">+</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gestión de Plantilla */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Gestión de Jugadoras
                </CardTitle>
                <CardDescription>Controla quién está en cancha y carga incidencias.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-black text-primary">
                  {matchPlayers.filter(p => p.isOnField).length} EN CANCHA
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchPlayers.map((p) => (
                  <div key={p.playerId} className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300",
                    p.isOnField ? "border-primary bg-primary/5 shadow-md scale-[1.02]" : "border-muted bg-card opacity-70 grayscale"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={p.playerPhoto} />
                          <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                        </Avatar>
                        {p.isOnField && (
                          <div className="absolute -top-1 -right-1 bg-green-500 h-4 w-4 rounded-full border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm truncate max-w-[120px]">{p.playerName}</span>
                        <span className="text-[10px] font-black text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2 w-2" /> {formatTime(p.timePlayed)}'
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {p.isOnField ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleEvent(p.playerId, 'goal')}>
                            ⚽
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:bg-yellow-100" onClick={() => handleEvent(p.playerId, 'yellow')}>
                            🟨
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={() => handleEvent(p.playerId, 'red')}>
                            🟥
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 ml-2" onClick={() => handleTogglePlayer(p.playerId)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" className="h-8 gap-1 font-bold text-[10px] uppercase" onClick={() => handleTogglePlayer(p.playerId)}>
                          <UserPlus className="h-3 w-3" /> Entrar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Incidencias */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" /> Acta del Partido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {matchEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-primary w-6">{ev.minute}'</span>
                      <span className="font-bold">{ev.type === 'goal' ? '⚽ GOL' : ev.type === 'yellow' ? '🟨 T. Amon' : '🟥 T. Roja'}</span>
                    </div>
                    <span className="text-muted-foreground truncate max-w-[100px]">{ev.playerName}</span>
                  </div>
                ))}
                {matchEvents.length === 0 && (
                  <div className="text-center py-12 opacity-30">
                    <Zap className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase">Sin incidencias</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Resumen de Tiempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Jugadoras utilizadas:</span>
                <span className="font-bold">{matchPlayers.filter(p => p.timePlayed > 0).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Promedio en cancha:</span>
                <span className="font-bold">
                  {matchPlayers.length > 0 
                    ? Math.round(matchPlayers.reduce((acc, p) => acc + p.timePlayed, 0) / (matchPlayers.filter(p => p.timePlayed > 0).length || 1) / 60) 
                    : 0} min
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
