
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Users, 
  Loader2,
  Trash2,
  ChevronLeft,
  Calendar,
  UserPlus,
  TrendingUp,
  Activity,
  Settings2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Timer,
  AlertCircle,
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HockeyTacticalBoard } from "@/components/dashboard/hockey-tactical-board";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TeamDetailPage() {
  const { clubId, divisionId, teamId } = useParams() as { clubId: string, divisionId: string, teamId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [todayEvent, setTodayEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(true);

  // Datos básicos del equipo
  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), [db, clubId, divisionId, teamId]);
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  // Todos los jugadores del club (para asignar)
  const allPlayersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: allPlayers } = useCollection(allPlayersQuery);

  // Plantilla actual del equipo
  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  // Buscar si hay un entrenamiento hoy para habilitar modo asistencia
  useEffect(() => {
    async function fetchTodayEvent() {
      if (!db) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const eventsRef = collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events");
        const q = query(
          eventsRef, 
          where("type", "==", "training")
        );
        
        const snap = await getDocs(q);
        if (!snap.empty) {
          const found = snap.docs.find(doc => {
            const data = doc.data();
            return data.date && data.date.startsWith(todayStr);
          });
          
          if (found) {
            setTodayEvent({ ...found.data(), id: found.id });
          }
        }
      } catch (e) {
        console.error("Error buscando evento de hoy:", e);
      } finally {
        setEventLoading(false);
      }
    }
    fetchTodayEvent();
  }, [db, clubId, divisionId, teamId]);

  // Obtener la lista de asistencia del evento de hoy si existe
  const attendanceQuery = useMemoFirebase(() => {
    if (!db || !todayEvent) return null;
    return collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", todayEvent.id, "attendance");
  }, [db, clubId, divisionId, teamId, todayEvent]);
  
  const { data: attendanceList } = useCollection(attendanceQuery);

  const handleToggleAttendance = async (playerId: string, playerName: string, currentStatus: string) => {
    if (!todayEvent) return;
    
    const nextStatus = currentStatus === 'going' ? 'not_going' : currentStatus === 'not_going' ? 'unknown' : 'going';
    const attDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", todayEvent.id, "attendance", playerId);
    
    setDoc(attDoc, {
      playerId,
      playerName,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const handleAssignPlayer = () => {
    if (!selectedPlayerId) return;
    const assignmentId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments")).id;
    const assignmentDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", assignmentId);
    
    const player = allPlayers?.find(p => p.id === selectedPlayerId);

    setDoc(assignmentDoc, {
      id: assignmentId,
      playerId: selectedPlayerId,
      playerName: `${player?.firstName} ${player?.lastName}`,
      playerPhoto: player?.photoUrl || "",
      teamId,
      season: team?.season || "2024-2025",
      createdAt: new Date().toISOString()
    });
    
    setSelectedPlayerId("");
    setIsAssignOpen(false);
    toast({ title: "Jugadora Asignada", description: `${player?.firstName} ya es parte de la plantilla.` });
  };

  const handleUnassignPlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", id));
  };

  if (teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a la categoría
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-headline text-foreground">{team?.name}</h1>
              <Badge variant="outline">{team?.season}</Badge>
            </div>
            <p className="text-muted-foreground">Entrenador: {team?.coachName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg gap-2">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/match-live`}>
                <PlayCircle className="h-4 w-4" /> Modo Partido Live
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/attendance-ranking`}>
                <Activity className="h-4 w-4 mr-2" /> Asistencia
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`}>
                <Calendar className="h-4 w-4 mr-2" /> Calendario
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/stats`}>
                <TrendingUp className="h-4 w-4 mr-2" /> Goleadores
              </Link>
            </Button>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" size="sm">
                  <UserPlus className="h-4 w-4" /> Asignar Jugadora
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar a la Plantilla</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger><SelectValue placeholder="Jugadora..." /></SelectTrigger>
                    <SelectContent>
                      {allPlayers?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleAssignPlayer} disabled={!selectedPlayerId}>Asignar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {todayEvent && (
        <Card className="border-primary bg-primary/5 animate-in slide-in-from-top duration-500">
          <CardHeader className="py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg text-primary-foreground">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Entrenamiento en Curso</CardTitle>
                <CardDescription className="text-xs font-medium">{todayEvent.title} • {todayEvent.location}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Presentes</p>
              <p className="text-lg font-black text-primary">
                {attendanceList?.filter(a => a.status === 'going').length || 0} / {roster?.length || 0}
              </p>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-6">
          <TabsTrigger value="roster" className="gap-2 px-6"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
          <TabsTrigger value="tactical" className="gap-2 px-6"><Settings2 className="h-4 w-4" /> Pizarra Táctica</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Plantilla Oficial
                  </CardTitle>
                  <CardDescription>
                    {todayEvent ? "Toma asistencia haciendo clic en los iconos." : "Gestiona las jugadoras asignadas a este equipo."}
                  </CardDescription>
                </div>
                {todayEvent && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">MODO ASISTENCIA ACTIVO</Badge>
                )}
              </CardHeader>
              <CardContent>
                {rosterLoading ? <Loader2 className="animate-spin" /> : (
                  <div className="divide-y">
                    {roster?.map((member: any) => {
                      const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                      return (
                        <div key={member.id} className="flex items-center justify-between py-3 group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-muted">
                              <AvatarImage src={member.playerPhoto} />
                              <AvatarFallback>{member.playerName[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.playerName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {todayEvent ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleAttendance(member.playerId, member.playerName, status)}
                                className={cn(
                                  "h-10 w-10 p-0 rounded-full border transition-all",
                                  status === 'going' ? "bg-green-100 text-green-600 border-green-200" :
                                  status === 'not_going' ? "bg-red-100 text-red-600 border-red-200" :
                                  "bg-muted text-muted-foreground border-transparent"
                                )}
                              >
                                {status === 'going' ? <CheckCircle2 className="h-5 w-5" /> : 
                                 status === 'not_going' ? <XCircle className="h-5 w-5" /> : 
                                 <HelpCircle className="h-5 w-5" />}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleUnassignPlayer(member.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!roster || roster.length === 0) && (
                      <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                        No hay jugadoras asignadas. Usa el botón "Asignar Jugadora".
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader><CardTitle className="text-sm">Resumen del Plantel</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Jugadoras</span>
                    <span className="font-bold text-lg">{roster?.length || 0}</span>
                  </div>
                  {!todayEvent && (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-orange-700 leading-tight">
                        No hay entrenamientos programados para hoy. Para tomar asistencia, programa una sesión en la pestaña <strong>Calendario</strong>.
                      </p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full text-xs">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/stats`}>Ver Rankings de Goleadoras</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tactical">
          <HockeyTacticalBoard roster={roster || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
