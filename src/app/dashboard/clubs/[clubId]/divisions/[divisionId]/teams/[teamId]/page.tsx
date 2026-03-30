
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

  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), [db, clubId, divisionId, teamId]);
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  const allPlayersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: allPlayers } = useCollection(allPlayersQuery);

  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  useEffect(() => {
    async function fetchTodayEvent() {
      if (!db) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const eventsRef = collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events");
        const q = query(eventsRef, where("type", "==", "training"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const found = snap.docs.find(doc => {
            const data = doc.data();
            return data.date && data.date.startsWith(todayStr);
          });
          if (found) setTodayEvent({ ...found.data(), id: found.id });
        }
      } catch (e) { console.error(e); }
      finally { setEventLoading(false); }
    }
    fetchTodayEvent();
  }, [db, clubId, divisionId, teamId]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!db || !todayEvent) return null;
    return collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", todayEvent.id, "attendance");
  }, [db, clubId, divisionId, teamId, todayEvent]);
  const { data: attendanceList } = useCollection(attendanceQuery);

  const handleToggleAttendance = async (playerId: string, playerName: string, currentStatus: string) => {
    if (!todayEvent) return;
    const nextStatus = currentStatus === 'going' ? 'not_going' : currentStatus === 'not_going' ? 'unknown' : 'going';
    const attDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", todayEvent.id, "attendance", playerId);
    setDoc(attDoc, { playerId, playerName, status: nextStatus, updatedAt: new Date().toISOString() }, { merge: true });
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

  if (teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions`} className="ambient-link group">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a la categoría
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black font-headline tracking-tight">{team?.name}</h1>
              <Badge variant="outline" className="font-bold border-white/30 text-white bg-white/10">{team?.season}</Badge>
            </div>
            <p className="ambient-text text-lg font-bold">Coach Responsable: {team?.coachName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl font-black uppercase text-[10px] tracking-widest h-11 gap-2">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/match-live`}>
                <PlayCircle className="h-5 w-5" /> Modo Partido Live
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm" className="font-bold border-white/30 text-white bg-white/5 hover:bg-white/10 h-11">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/attendance-ranking`}>
                <Activity className="h-4 w-4 mr-2" /> Asistencia
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm" className="font-bold border-white/30 text-white bg-white/5 hover:bg-white/10 h-11">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`}>
                <Calendar className="h-4 w-4 mr-2" /> Calendario
              </Link>
            </Button>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 h-11 px-6 font-black uppercase text-xs tracking-widest shadow-lg" size="sm">
                  <UserPlus className="h-5 w-5" /> Asignar Jugadora
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Asignar a la Plantilla</DialogTitle>
                  <DialogDescription>Selecciona una jugadora del padrón del club para incorporarla al equipo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Label className="font-bold text-slate-700">Jugadora</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger className="bg-white border-2"><SelectValue placeholder="Buscar jugadora..." /></SelectTrigger>
                    <SelectContent>
                      {allPlayers?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6">
                  <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAssignPlayer} disabled={!selectedPlayerId} className="font-bold">Confirmar Asignación</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {todayEvent && (
        <Card className="border-none bg-primary shadow-xl shadow-primary/20 animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="py-5 flex flex-row items-center justify-between text-white relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Timer className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] opacity-90">Entrenamiento en Curso</CardTitle>
                <CardDescription className="text-white font-bold text-lg">{todayEvent.title} • {todayEvent.location}</CardDescription>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Presentes Hoy</p>
              <p className="text-3xl font-black">
                {attendanceList?.filter(a => a.status === 'going').length || 0} / {roster?.length || 0}
              </p>
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <Activity className="h-32 w-32 rotate-12" />
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="bg-white/10 backdrop-blur-md p-1 mb-6 border border-white/20">
          <TabsTrigger value="roster" className="gap-2 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary shadow-sm"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
          <TabsTrigger value="tactical" className="gap-2 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary shadow-sm"><Settings2 className="h-4 w-4" /> Pizarra Táctica</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-900">
                    <Users className="h-6 w-6 text-primary" /> Plantilla Oficial
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500">
                    {todayEvent ? "Toma asistencia haciendo clic en los iconos circulares." : "Gestión de jugadoras asignadas al equipo."}
                  </CardDescription>
                </div>
                {todayEvent && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 font-black text-[10px] uppercase tracking-widest px-3 py-1">ASISTENCIA ACTIVA</Badge>
                )}
              </CardHeader>
              <CardContent className="p-0 bg-white">
                {rosterLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
                  <div className="divide-y">
                    {roster?.map((member: any) => {
                      const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                      return (
                        <div key={member.id} className="flex items-center justify-between p-4 group hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-14 w-14 border-2 border-slate-100 shadow-sm">
                                <AvatarImage src={member.playerPhoto} className="object-cover" />
                                <AvatarFallback className="font-black text-slate-300 text-xl">{member.playerName[0]}</AvatarFallback>
                              </Avatar>
                              {member.jerseyNumber && (
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                  #{member.jerseyNumber}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-base">{member.playerName}</span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado: Activo</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {todayEvent ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleAttendance(member.playerId, member.playerName, status)}
                                className={cn(
                                  "h-12 w-12 p-0 rounded-full border-2 transition-all shadow-sm",
                                  status === 'going' ? "bg-green-500 text-white border-green-600 scale-110" :
                                  status === 'not_going' ? "bg-red-500 text-white border-red-600" :
                                  "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                                )}
                              >
                                {status === 'going' ? <CheckCircle2 className="h-6 w-6" /> : 
                                 status === 'not_going' ? <XCircle className="h-6 w-6" /> : 
                                 <HelpCircle className="h-6 w-6" />}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 p-0 hover:bg-red-50" onClick={() => handleUnassignPlayer(member.id)}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!roster || roster.length === 0) && (
                      <div className="py-20 text-center text-slate-400 border-2 border-dashed m-6 rounded-2xl bg-slate-50">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-xs">No hay jugadoras asignadas</p>
                        <p className="text-[10px] font-medium mt-1">Usa el botón "Asignar Jugadora" para comenzar.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-white border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-900 text-white py-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Resumen del Plantel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex justify-between items-center border-b pb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Jugadoras</span>
                    <span className="text-4xl font-black text-slate-900">{roster?.length || 0}</span>
                  </div>
                  {!todayEvent && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-orange-800 leading-relaxed font-bold">
                        No hay entrenamientos programados para hoy en el club. El modo asistencia se activa automáticamente al crear eventos en la pestaña <strong>Calendario</strong>.
                      </p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full h-12 font-black uppercase text-[10px] tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-md">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/stats`}>Ver Rankings de Goleadoras</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm overflow-hidden border-l-4 border-l-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compromiso</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                  <Activity className="h-10 w-10 text-accent mb-2" />
                  <p className="text-sm font-black text-slate-900 uppercase">Ranking de Asistencia</p>
                  <Button variant="link" asChild className="mt-2 h-auto p-0 font-bold text-xs">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/attendance-ranking`}>Ver estadísticas de presentismo</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tactical" className="animate-in fade-in duration-300">
          <HockeyTacticalBoard roster={roster || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
