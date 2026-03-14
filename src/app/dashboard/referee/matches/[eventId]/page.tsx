
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Save, 
  Trophy, 
  Users, 
  Clock, 
  Plus, 
  Trash2,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function RefereeMatchManagement() {
  const { eventId } = useParams() as { eventId: string };
  const searchParams = useSearchParams();
  const matchPath = searchParams.get('path');
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [roster, setRoster] = useState<any[]>([]);
  
  const [newGoal, setNewGoal] = useState({ playerId: "", minute: 1, team: "home" });

  useEffect(() => {
    async function fetchData() {
      if (!db || !matchPath) return;
      try {
        const matchDoc = await getDoc(doc(db, matchPath));
        if (matchDoc.exists()) {
          const data = matchDoc.data();
          setMatch({ ...data, id: matchDoc.id });
          setHomeScore(data.homeScore || 0);
          setAwayScore(data.awayScore || 0);

          // Obtener plantilla del equipo local
          // Path del match: clubs/[clubId]/divisions/[divId]/teams/[teamId]/events/[eventId]
          const pathParts = matchPath.split('/');
          const assignmentsPath = `clubs/${pathParts[1]}/divisions/${pathParts[3]}/teams/${pathParts[5]}/assignments`;
          const rosterSnap = await getDocs(collection(db, assignmentsPath));
          setRoster(rosterSnap.docs.map(d => d.data()));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [db, matchPath]);

  const matchEventsQuery = useMemoFirebase(() => {
    if (!db || !eventId) return null;
    return query(collection(db, "match_events"), where("matchId", "==", eventId));
  }, [db, eventId]);
  
  const { data: matchEvents, isLoading: eventsLoading } = useCollection(matchEventsQuery);

  const handleSaveResult = async () => {
    if (!db || !matchPath) return;
    try {
      await updateDoc(doc(db, matchPath), {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        status: "played",
        matchFinished: true,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Resultado Guardado", description: "El acta del partido ha sido actualizada." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el resultado." });
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.playerId || !db) return;
    const player = roster.find(p => p.playerId === newGoal.playerId);
    
    try {
      await addDoc(collection(db, "match_events"), {
        matchId: eventId,
        playerId: newGoal.playerId,
        playerName: player?.playerName || "Jugador",
        teamId: newGoal.team === 'home' ? match.teamId : 'opponent',
        eventType: "goal",
        minute: Number(newGoal.minute),
        createdAt: new Date().toISOString()
      });

      // Actualizar marcador visualmente si es gol del equipo local
      if (newGoal.team === 'home') setHomeScore(prev => prev + 1);
      else setAwayScore(prev => prev + 1);

      setNewGoal({ ...newGoal, playerId: "", minute: 1 });
      toast({ title: "Gol Registrado", description: "Se ha añadido el evento al acta." });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/referee" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a mis partidos
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{match?.title}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" /> vs {match?.opponent} • {new Date(match?.date).toLocaleString()}
            </p>
          </div>
          <Badge variant={match?.status === 'played' ? 'secondary' : 'default'} className="h-fit">
            {match?.status === 'played' ? 'FINALIZADO' : 'EN PROGRESO'}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CARGA DE RESULTADO */}
        <Card className="shadow-lg border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center">Resultado Final</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <Label className="block mb-2 font-bold uppercase text-[10px]">Local</Label>
                <Input 
                  type="number" 
                  value={homeScore} 
                  onChange={e => setHomeScore(parseInt(e.target.value))} 
                  className="w-20 h-20 text-center text-4xl font-black"
                />
              </div>
              <span className="text-4xl font-bold mt-6">-</span>
              <div className="text-center">
                <Label className="block mb-2 font-bold uppercase text-[10px]">Visita</Label>
                <Input 
                  type="number" 
                  value={awayScore} 
                  onChange={e => setAwayScore(parseInt(e.target.value))} 
                  className="w-20 h-20 text-center text-4xl font-black"
                />
              </div>
            </div>
            <Button onClick={handleSaveResult} className="w-full h-12 gap-2 text-lg font-bold">
              <Save className="h-5 w-5" /> Finalizar Partido
            </Button>
          </CardContent>
        </Card>

        {/* REGISTRO DE GOLEADORES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" /> Registrar Gol
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={newGoal.team} onValueChange={v => setNewGoal({...newGoal, team: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Local (Mi Equipo)</SelectItem>
                  <SelectItem value="away">Visitante (Rival)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newGoal.team === 'home' && (
              <div className="space-y-2">
                <Label>Jugador</Label>
                <Select value={newGoal.playerId} onValueChange={v => setNewGoal({...newGoal, playerId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {roster.map(p => <SelectItem key={p.playerId} value={p.playerId}>{p.playerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Minuto</Label>
              <div className="flex gap-2">
                <Input type="number" value={newGoal.minute} onChange={e => setNewGoal({...newGoal, minute: parseInt(e.target.value)})} className="font-bold" />
                <Button onClick={handleAddGoal} disabled={newGoal.team === 'home' && !newGoal.playerId}>Registrar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTA DE EVENTOS */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Acta de Incidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <div className="space-y-2">
                {matchEvents?.sort((a,b) => a.minute - b.minute).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-primary">{ev.minute}'</span>
                      <div className="flex flex-col">
                        <span className="font-bold">{ev.eventType === 'goal' ? '⚽ GOL' : ev.eventType}</span>
                        <span className="text-xs text-muted-foreground">{ev.playerName}</span>
                      </div>
                    </div>
                    <Badge variant="outline">{ev.teamId === 'opponent' ? 'RIVAL' : 'LOCAL'}</Badge>
                  </div>
                ))}
                {matchEvents?.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground italic">No se han registrado incidencias todavía.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
