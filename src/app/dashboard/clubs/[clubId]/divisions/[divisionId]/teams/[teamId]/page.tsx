
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
  PlayCircle,
  Star,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

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
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
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

  const handleAssignPlayer = async () => {
    if (!selectedPlayerId || !team) return;
    
    try {
      const assignmentId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments")).id;
      const assignmentDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", assignmentId);
      const player = allPlayers?.find(p => p.id === selectedPlayerId);

      // 1. Crear registro de asignación en el equipo
      await setDoc(assignmentDoc, {
        id: assignmentId,
        playerId: selectedPlayerId,
        playerName: `${player?.firstName} ${player?.lastName}`,
        playerPhoto: player?.photoUrl || "",
        teamId,
        season: team?.season || "2025",
        createdAt: new Date().toISOString()
      });

      // 2. ACTUALIZAR JUGADORA (Sincronismo Crítico)
      const playerDoc = doc(db, "clubs", clubId, "players", selectedPlayerId);
      updateDocumentNonBlocking(playerDoc, {
        teamId: teamId,
        teamName: team.name
      });

      // 3. Sincronizar en el índice global
      const indexDoc = doc(db, "all_players_index", selectedPlayerId);
      setDocumentNonBlocking(indexDoc, {
        teamId: teamId,
        teamName: team.name
      }, { merge: true });

      setSelectedPlayerId("");
      setIsAssignOpen(false);
      toast({ title: "Jugador Asignado", description: `${player?.firstName} ya es parte de ${team.name}.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al asignar" });
    }
  };

  const handleUnassignPlayer = (assignmentId: string, playerId: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", assignmentId));
    
    const playerDoc = doc(db, "clubs", clubId, "players", playerId);
    updateDocumentNonBlocking(playerDoc, { teamId: null, teamName: null });

    const indexDoc = doc(db, "all_players_index", playerId);
    updateDocumentNonBlocking(indexDoc, { teamId: null, teamName: null });

    toast({ title: "Jugadora removida del plantel" });
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
                  <UserPlus className="h-5 w-5" /> Asignar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Asignar a la Plantilla</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Incorporar jugadoras del padrón oficial al equipo.</DialogDescription>
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

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="bg-white/15 backdrop-blur-xl p-1.5 mb-8 border border-white/20 shadow-2xl inline-flex rounded-2xl h-14">
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
                  <CardDescription className="font-bold text-slate-500 mt-1">Gestión técnica del plantel.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rosterLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : (
                  <div className="divide-y divide-slate-100">
                    {roster?.map((member: any) => {
                      const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                      return (
                        <div key={member.id} className="flex flex-col sm:flex-row items-center justify-between p-6 group hover:bg-slate-50/80 transition-all gap-4">
                          <div className="flex items-center gap-5 w-full sm:w-auto">
                            <Avatar className="h-20 w-16 border-2 transition-all shadow-md rounded-2xl border-slate-100">
                              <AvatarImage src={member.playerPhoto} className="object-cover" />
                              <AvatarFallback className="font-black text-slate-300 bg-slate-50 text-xl">{member.playerName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-black text-xl text-slate-900">{member.playerName}</span>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3 text-green-500" /> Federado Activo 
                              </p>
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
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive h-11 w-11 p-0 hover:bg-red-50 rounded-xl" 
                                onClick={() => handleUnassignPlayer(member.id, member.playerId)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="bg-white border-none shadow-2xl overflow-hidden border-l-8 border-l-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Plantel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                    <span className="text-5xl font-black text-primary tracking-tighter">{roster?.length || 0}</span>
                  </div>
                  <Button asChild variant="outline" className="w-full h-14 font-black uppercase text-[11px] tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-xl rounded-xl">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/stats`}>Ver Rankings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tactical" className="animate-in fade-in zoom-in-95 duration-500">
          <HockeyTacticalBoard 
            roster={roster || []} 
            clubLogo={club?.logoUrl || ""}
            initialPlayerCount={team?.tacticalPlayerCount || 11}
            initialSport={team?.tacticalSport || 'hockey'}
            teamId={teamId}
            clubId={clubId}
            divisionId={divisionId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
