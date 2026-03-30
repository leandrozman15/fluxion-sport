
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HockeyTacticalBoard } from "@/components/dashboard/hockey-tactical-board";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function TeamDetailPage() {
  const { clubId, divisionId, teamId } = useParams() as { clubId: string, divisionId: string, teamId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [todayEvent, setTodayEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(true);

  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: team, isLoading: teamLoading } = useDoc(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId));

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
      season: team?.season || "2025",
      createdAt: new Date().toISOString()
    });
    setSelectedPlayerId("");
    setIsAssignOpen(false);
    toast({ title: "Jugadora Asignada", description: `${player?.firstName} ya es parte de la plantilla.` });
  };

  const handleUnassignPlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", id));
  };

  if (teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-6">
        <Link href={`/dashboard/clubs/${clubId}/divisions`} className="ambient-link group w-fit">
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> Volver a la categoría
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black font-headline tracking-tight text-white drop-shadow-2xl">{team?.name}</h1>
              <Badge className="font-black bg-white text-primary border-none shadow-lg px-4 h-8 uppercase tracking-widest">{team?.season}</Badge>
            </div>
            <p className="ambient-text text-lg font-bold opacity-90 drop-shadow-md">Coach Responsable: {team?.coachName}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="default" asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl font-black uppercase text-[11px] tracking-widest h-12 px-6 gap-3">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/match-live`}>
                <PlayCircle className="h-5 w-5" /> Modo Partido Live
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm" className="font-black border-white/40 text-white bg-black/20 hover:bg-black/40 backdrop-blur-md h-12 px-6 uppercase text-[11px] tracking-widest">
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/attendance-ranking`}>
                <Activity className="h-5 w-5 mr-2" /> Asistencia
              </Link>
            </Button>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-3 h-12 px-8 font-black uppercase text-[11px] tracking-widest shadow-2xl" size="sm">
                  <UserPlus className="h-5 w-5" /> Asignar Jugadora
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Asignar a la Plantilla</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Selecciona una jugadora del padrón del club para incorporarla al equipo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Buscar Jugadora</Label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger className="bg-white border-2 h-14 text-lg font-bold"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {allPlayers?.map((p: any) => <SelectItem key={p.id} value={p.id} className="font-bold">{p.firstName} {p.lastName} (DNI: {p.dni})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setIsAssignOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                  <Button onClick={handleAssignPlayer} disabled={!selectedPlayerId} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Confirmar Asignación</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {todayEvent && (
        <Card className="border-none bg-primary shadow-2xl shadow-primary/30 animate-in slide-in-from-top duration-500 overflow-hidden">
          <CardHeader className="py-6 flex flex-row items-center justify-between text-white relative">
            <div className="flex items-center gap-5 relative z-10">
              <div className="bg-white/25 p-4 rounded-2xl backdrop-blur-md shadow-inner">
                <Timer className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Entrenamiento Activo</CardTitle>
                <CardDescription className="text-xl font-black text-white">{todayEvent.title} • {todayEvent.location}</CardDescription>
              </div>
            </div>
            <div className="text-right relative z-10 pr-4">
              <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Presentes Hoy</p>
              <p className="text-4xl font-black tracking-tighter">
                {attendanceList?.filter(a => a.status === 'going').length || 0} / {roster?.length || 0}
              </p>
            </div>
            <Activity className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 rotate-12" />
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="bg-white/15 backdrop-blur-xl p-1.5 mb-8 border border-white/20 shadow-2xl inline-flex rounded-2xl">
          <TabsTrigger value="roster" className="gap-3 px-10 h-12 font-black uppercase text-[11px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all rounded-xl"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
          <TabsTrigger value="tactical" className="gap-3 px-10 h-12 font-black uppercase text-[11px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all rounded-xl"><Settings2 className="h-4 w-4" /> Pizarra Táctica</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                    <Users className="h-7 w-7 text-primary" /> Plantilla Oficial
                  </CardTitle>
                  <CardDescription className="font-bold text-slate-500 mt-1">
                    {todayEvent ? "Control de asistencia activa para la sesión." : "Gestión de jugadoras asignadas al equipo."}
                  </CardDescription>
                </div>
                {todayEvent && (
                  <Badge className="bg-green-100 text-green-700 border-2 border-green-200 font-black text-[10px] px-4 py-1.5 tracking-widest uppercase">MODO ASISTENCIA</Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {rosterLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : (
                  <div className="divide-y divide-slate-100">
                    {roster?.map((member: any) => {
                      const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                      return (
                        <div key={member.id} className="flex items-center justify-between p-5 group hover:bg-slate-50/80 transition-all">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <Avatar className="h-16 w-14 border-2 border-slate-100 shadow-sm rounded-xl">
                                <AvatarImage src={member.playerPhoto} className="object-cover" />
                                <AvatarFallback className="font-black text-slate-300 bg-slate-50">{member.playerName[0]}</AvatarFallback>
                              </Avatar>
                              {member.jerseyNumber && (
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black h-6 w-6 flex items-center justify-center rounded-lg border-2 border-white shadow-md">
                                  #{member.jerseyNumber}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-lg leading-none">{member.playerName}</span>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Estado: Federado Activo</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {todayEvent ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleAttendance(member.playerId, member.playerName, status)}
                                className={cn(
                                  "h-14 w-14 p-0 rounded-2xl border-2 transition-all shadow-md",
                                  status === 'going' ? "bg-green-500 text-white border-green-600 scale-110 shadow-green-500/20" :
                                  status === 'not_going' ? "bg-red-500 text-white border-red-600 shadow-red-500/20" :
                                  "bg-white text-slate-300 border-slate-100 hover:border-primary hover:text-primary"
                                )}
                              >
                                {status === 'going' ? <CheckCircle2 className="h-7 w-7" /> : 
                                 status === 'not_going' ? <XCircle className="h-7 w-7" /> : 
                                 <HelpCircle className="h-7 w-7" />}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-destructive opacity-0 group-hover:opacity-100 transition-all h-12 w-12 p-0 hover:bg-red-50 rounded-xl" onClick={() => handleUnassignPlayer(member.id)}>
                                <Trash2 className="h-6 w-6" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!roster || roster.length === 0) && (
                      <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest text-xs border-2 border-dashed m-8 rounded-3xl opacity-40 bg-slate-50/50">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>No hay jugadoras asignadas</p>
                        <p className="text-[10px] font-bold mt-2 opacity-60">Usa el botón "Asignar Jugadora" para empezar.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
                <CardHeader className="relative z-10 pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Resumen del Plantel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-4 relative z-10">
                  <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <span className="text-xs font-black opacity-50 uppercase tracking-widest text-slate-400">Total Jugadoras</span>
                    <span className="text-5xl font-black text-primary tracking-tighter">{roster?.length || 0}</span>
                  </div>
                  {!todayEvent && (
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                      <AlertCircle className="h-6 w-6 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-relaxed font-bold text-white/80 uppercase tracking-tight">
                        Sin actividad para hoy. Crea eventos en el calendario para activar el control de asistencia.
                      </p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full h-14 font-black uppercase text-[11px] tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-xl rounded-xl">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/stats`}>Ver Rankings de Goleadoras</Link>
                  </Button>
                </CardContent>
                <PlayCircle className="absolute right-[-30px] bottom-[-30px] h-40 w-40 opacity-10 rotate-12" />
              </Card>

              <Card className="bg-white border-none shadow-2xl overflow-hidden border-l-8 border-l-accent">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compromiso y Presentismo</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center px-6">
                  <div className="bg-accent/10 p-5 rounded-full mb-4">
                    <Activity className="h-10 w-10 text-accent" />
                  </div>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tight">Ranking de Asistencia</p>
                  <Button variant="link" asChild className="mt-2 h-auto p-0 font-black text-xs text-primary uppercase tracking-widest hover:no-underline">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/attendance-ranking`}>Ver estadísticas detalladas</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tactical" className="animate-in fade-in zoom-in-95 duration-500">
          <HockeyTacticalBoard roster={roster || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
