
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Loader2, 
  Calendar,
  Activity,
  ClipboardCheck,
  Settings2,
  PlayCircle,
  Timer,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flag,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { HockeyTacticalBoard } from "@/components/dashboard/hockey-tactical-board";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function CoachDashboard() {
  const { firestore, user } = useFirebase();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayEvent, setTodayEvent] = useState<any>(null);

  useEffect(() => {
    async function fetchMyTeam() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim() || "";
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        let foundTeam = null;

        for (const clubDoc of clubsSnap.docs) {
          const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
          for (const divDoc of divsSnap.docs) {
            const teamsSnap = await getDocs(query(
              collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"),
              where("coachName", "==", user.displayName || email)
            ));

            if (!teamsSnap.empty) {
              const tDoc = teamsSnap.docs[0];
              foundTeam = {
                ...tDoc.data(),
                id: tDoc.id,
                clubId: clubDoc.id,
                divisionId: divDoc.id,
                clubName: clubDoc.data().name,
                divisionName: divDoc.data().name
              };
              break;
            }
          }
          if (foundTeam) break;
        }
        
        if (!foundTeam && clubsSnap.docs.length > 0) {
          const firstClubId = clubsSnap.docs[0].id;
          const divsSnap = await getDocs(collection(firestore, "clubs", firstClubId, "divisions"));
          if (!divsSnap.empty) {
            const firstDivId = divsSnap.docs[0].id;
            const teamsSnap = await getDocs(collection(firestore, "clubs", firstClubId, "divisions", firstDivId, "teams"));
            if (!teamsSnap.empty) {
              const tDoc = teamsSnap.docs[0];
              foundTeam = {
                ...tDoc.data(),
                id: tDoc.id,
                clubId: firstClubId,
                divisionId: firstDivId,
                clubName: clubsSnap.docs[0].data().name,
                divisionName: divsSnap.docs[0].data().name
              };
            }
          }
        }

        setTeam(foundTeam);

        if (foundTeam) {
          const todayStr = new Date().toISOString().split('T')[0];
          const eventsSnap = await getDocs(query(
            collection(firestore, "clubs", foundTeam.clubId, "divisions", foundTeam.divisionId, "teams", foundTeam.id, "events"),
            where("type", "==", "training")
          ));
          const found = eventsSnap.docs.find(d => d.data().date?.startsWith(todayStr));
          if (found) setTodayEvent({ ...found.data(), id: found.id });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchMyTeam();
  }, [user, firestore]);

  const rosterQuery = useMemoFirebase(() => {
    if (!firestore || !team) return null;
    return collection(firestore, "clubs", team.clubId, "divisions", team.divisionId, "teams", team.id, "assignments");
  }, [firestore, team]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !team || !todayEvent) return null;
    return collection(firestore, "clubs", team.clubId, "divisions", team.divisionId, "teams", team.id, "events", todayEvent.id, "attendance");
  }, [firestore, team, todayEvent]);
  const { data: attendanceList } = useCollection(attendanceQuery);

  const handleToggleAttendance = async (playerId: string, playerName: string, currentStatus: string) => {
    if (!todayEvent || !team) return;
    const nextStatus = currentStatus === 'going' ? 'not_going' : currentStatus === 'not_going' ? 'unknown' : 'going';
    const attDoc = doc(firestore, "clubs", team.clubId, "divisions", team.divisionId, "teams", team.id, "events", todayEvent.id, "attendance", playerId);
    
    setDoc(attDoc, { playerId, playerName, status: nextStatus, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const handleTacticalSettingsSave = (settings: { playerCount: number; sport: 'hockey' | 'rugby' }) => {
    if (!team || !firestore) return;
    const teamDoc = doc(firestore, "clubs", team.clubId, "divisions", team.divisionId, "teams", team.id);
    updateDocumentNonBlocking(teamDoc, {
      tacticalPlayerCount: settings.playerCount,
      tacticalSport: settings.sport
    });
  };

  const coachNav = [
    { title: "Gestión Técnica", href: "/dashboard/coach", icon: ClipboardCheck },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
    { title: "Búsqueda Jugadores", href: "/dashboard/player/search", icon: Users },
  ];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  if (!team) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <div className="bg-white/10 p-8 rounded-full mb-6 border border-white/20 backdrop-blur-md">
        <ClipboardCheck className="h-16 w-16 text-white opacity-40" />
      </div>
      <h2 className="text-3xl font-black tracking-tight text-white font-headline">Sin Equipo Asignado</h2>
      <p className="text-white/80 max-w-sm mt-2 font-bold ambient-text">No hemos encontrado un plantel bajo tu dirección técnica. Contacta al administrador.</p>
    </div>
  );

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={coachNav} basePath="/dashboard/coach" />
      
      <div className="flex-1 space-y-10 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-2xl">{team.name}</h1>
              <Badge className="font-black bg-white text-primary border-none shadow-lg px-4 h-8 uppercase tracking-widest">{team.season}</Badge>
            </div>
            <p className="text-white font-black uppercase tracking-[0.3em] text-[11px] drop-shadow-md opacity-90">{team.clubName} • {team.divisionName}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_10px_30px_rgba(0,0,0,0.3)] font-black uppercase text-[11px] tracking-widest h-12 px-6 gap-3">
              <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/match-live`}>
                <PlayCircle className="h-5 w-5" /> Iniciar Partido Live
              </Link>
            </Button>
            <Button variant="outline" asChild className="font-black border-white/40 text-white bg-black/20 hover:bg-black/40 backdrop-blur-md h-12 px-6 uppercase text-[11px] tracking-widest">
              <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/events`}>
                <Calendar className="h-5 w-5 mr-2" /> Agenda
              </Link>
            </Button>
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
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Presentes</p>
                <p className="text-4xl font-black tracking-tighter">
                  {attendanceList?.filter(a => a.status === 'going').length || 0} / {roster?.length || 0}
                </p>
              </div>
              <Activity className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 rotate-12" />
            </CardHeader>
          </Card>
        )}

        <Tabs defaultValue="tactical" className="w-full">
          <TabsList className="bg-white/15 backdrop-blur-xl p-1.5 mb-8 border border-white/20 shadow-2xl inline-flex rounded-2xl">
            <TabsTrigger value="tactical" className="gap-3 px-10 h-12 font-black uppercase text-[11px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all rounded-xl"><Settings2 className="h-4 w-4" /> Pizarra Táctica</TabsTrigger>
            <TabsTrigger value="roster" className="gap-3 px-10 h-12 font-black uppercase text-[11px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all rounded-xl"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
          </TabsList>

          <TabsContent value="tactical" className="animate-in fade-in zoom-in-95 duration-500">
            <HockeyTacticalBoard 
              roster={roster || []} 
              initialPlayerCount={team.tacticalPlayerCount || 11}
              initialSport={team.tacticalSport || 'hockey'}
              onSettingsChange={handleTacticalSettingsSave}
            />
          </TabsContent>

          <TabsContent value="roster" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                      <Users className="h-7 w-7 text-primary" /> Plantilla Oficial
                    </CardTitle>
                    <CardDescription className="font-bold text-slate-500 mt-1">
                      {todayEvent ? "Control rápido de asistencia para hoy." : "Gestión de jugadores y estado del equipo."}
                    </CardDescription>
                  </div>
                  {todayEvent && (
                    <Badge className="bg-green-100 text-green-700 border-2 border-green-200 font-black text-[10px] px-4 py-1.5 tracking-widest uppercase shadow-sm">ASISTENCIA ACTIVA</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {rosterLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
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
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black h-6 w-6 flex items-center justify-center rounded-lg border-2 border-white shadow-md">
                                  #{member.jerseyNumber || '•'}
                                </div>
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg">{member.playerName}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Estado: Federado Activo</p>
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
                                    status === 'going' ? "bg-green-500 text-white border-green-600 scale-110" :
                                    status === 'not_going' ? "bg-red-500 text-white border-red-600" :
                                    "bg-white text-slate-300 border-slate-100 hover:border-primary hover:text-primary"
                                  )}
                                >
                                  {status === 'going' ? <CheckCircle2 className="h-7 w-7" /> : 
                                   status === 'not_going' ? <XCircle className="h-7 w-7" /> : 
                                   <HelpCircle className="h-7 w-7" />}
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" asChild className="h-10 text-[10px] font-black uppercase tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all px-5 rounded-xl shadow-sm">
                                  <Link href={`/dashboard/player/search`}>Ver Ficha</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(!roster || roster.length === 0) && (
                        <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest text-xs border-2 border-dashed m-8 rounded-3xl opacity-40">
                          Sin jugadores asignados.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
                  <CardHeader className="relative z-10 pb-4">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Control Técnico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 relative z-10">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                      <span className="text-xs font-black opacity-50 uppercase tracking-widest">Total Plantel</span>
                      <span className="text-5xl font-black text-primary tracking-tighter">{roster?.length || 0}</span>
                    </div>
                    {!todayEvent && (
                      <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed font-bold text-white/80 uppercase tracking-tight">
                          No hay sesiones hoy. El modo asistencia se activa en la pestaña <strong>Agenda</strong>.
                        </p>
                      </div>
                    )}
                    <Button asChild variant="secondary" className="w-full font-black uppercase text-[11px] tracking-widest h-14 shadow-xl border-none hover:bg-white transition-all">
                      <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/stats`}>Rankings de Goleadoras</Link>
                    </Button>
                  </CardContent>
                  <div className="absolute right-[-30px] bottom-[-30px] opacity-10">
                    <Flag className="h-40 w-40 rotate-12" />
                  </div>
                </Card>

                <Card className="bg-white border-none shadow-xl border-l-8 border-l-accent overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próxima Actividad</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center px-6">
                    <div className="bg-accent/10 p-4 rounded-full mb-4">
                      <Timer className="h-10 w-10 text-accent" />
                    </div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Consultar Agenda</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Revisa las próximas fechas y convocatorias en tu calendario.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
