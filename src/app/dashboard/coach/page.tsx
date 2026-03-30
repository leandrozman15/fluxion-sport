"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Loader2, 
  ChevronLeft, 
  Trophy,
  Calendar,
  Activity,
  ClipboardCheck,
  Star,
  TrendingUp,
  Settings2,
  LayoutDashboard,
  Flag,
  BarChart3,
  PlayCircle,
  Timer,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ClipboardList
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
import { useToast } from "@/hooks/use-toast";

export default function CoachDashboard() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayEvent, setTodayEvent] = useState<any>(null);

  useEffect(() => {
    async function fetchMyTeam() {
      if (!user || !firestore) return;
      try {
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        let foundTeam = null;

        for (const clubDoc of clubsSnap.docs) {
          const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
          for (const divDoc of divsSnap.docs) {
            const teamsSnap = await getDocs(query(
              collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"),
              where("coachName", "==", user.displayName || user.email)
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
        
        // Si no encuentra por nombre, buscamos el primer equipo disponible para la demo
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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
    
    setDoc(attDoc, {
      playerId,
      playerName,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const coachNav = [
    { title: "Gestión Técnica", href: "/dashboard/coach", icon: ClipboardCheck },
    { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
    { title: "Búsqueda Jugadores", href: "/dashboard/player/search", icon: Users },
    { title: "Arbitraje", href: "/dashboard/referee", icon: Flag },
  ];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  if (!team) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <div className="bg-muted p-6 rounded-full mb-4">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground opacity-20" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-white">Sin Equipo Asignado</h2>
      <p className="text-white/70 max-w-sm mt-2 font-medium">No hemos encontrado un plantel bajo tu dirección técnica. Contacta al administrador del club.</p>
    </div>
  );

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={coachNav} basePath="/dashboard/coach" />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black font-headline text-white drop-shadow-sm">{team.name}</h1>
              <Badge variant="outline" className="font-bold border-white/30 text-white bg-white/10">{team.season}</Badge>
            </div>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{team.clubName} • {team.divisionName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg font-black uppercase text-[10px] tracking-widest h-11 gap-2">
              <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/match-live`}>
                <PlayCircle className="h-4 w-4" /> Iniciar Partido Live
              </Link>
            </Button>
            <Button variant="outline" asChild className="font-bold border-white/30 text-white bg-white/5 hover:bg-white/10 h-11">
              <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/attendance-ranking`}>
                <Activity className="h-4 w-4 mr-2" /> Asistencia
              </Link>
            </Button>
            <Button variant="outline" asChild className="font-bold border-white/30 text-white bg-white/5 hover:bg-white/10 h-11">
              <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/events`}>
                <Calendar className="h-4 w-4 mr-2" /> Calendario
              </Link>
            </Button>
          </div>
        </header>

        {todayEvent && (
          <Card className="border-primary bg-primary/5 animate-in slide-in-from-top duration-500">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-sm">
                  <Timer className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Entrenamiento en Curso</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-500">{todayEvent.title} • {todayEvent.location}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">Presentes</p>
                <p className="text-2xl font-black text-primary">
                  {attendanceList?.filter(a => a.status === 'going').length || 0} / {roster?.length || 0}
                </p>
              </div>
            </CardHeader>
          </Card>
        )}

        <Tabs defaultValue="tactical" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-md p-1 mb-6 border border-white/20">
            <TabsTrigger value="tactical" className="gap-2 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-primary data-[state=active]:text-white"><Settings2 className="h-4 w-4" /> Pizarra Táctica</TabsTrigger>
            <TabsTrigger value="roster" className="gap-2 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-primary data-[state=active]:text-white"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
          </TabsList>

          <TabsContent value="tactical">
            <HockeyTacticalBoard roster={roster || []} />
          </TabsContent>

          <TabsContent value="roster">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-card">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Users className="h-5 w-5 text-primary" /> Plantilla Oficial
                    </CardTitle>
                    <CardDescription>
                      {todayEvent ? "Toma asistencia rápida para la sesión de hoy." : "Gestión de jugadoras y estado del plantel."}
                    </CardDescription>
                  </div>
                  {todayEvent && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 font-bold">MODO ASISTENCIA ACTIVO</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {rosterLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : (
                    <div className="divide-y border-t bg-card">
                      {roster?.map((member: any) => {
                        const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                        return (
                          <div key={member.id} className="flex items-center justify-between p-4 group hover:bg-muted/5 transition-colors">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-muted shadow-sm">
                                <AvatarImage src={member.playerPhoto} className="object-cover" />
                                <AvatarFallback className="font-bold text-slate-400">{member.playerName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm text-slate-900">{member.playerName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">#{member.jerseyNumber || 'S/N'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {todayEvent ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleToggleAttendance(member.playerId, member.playerName, status)}
                                  className={cn(
                                    "h-10 w-10 p-0 rounded-full border transition-all shadow-sm",
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
                                <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-tight border-primary text-primary hover:bg-primary/5">
                                  <Link href={`/dashboard/player/search`}>Ver Ficha</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(!roster || roster.length === 0) && (
                        <div className="py-20 text-center text-slate-400 font-medium italic bg-muted/5">
                          No hay jugadoras asignadas a esta plantilla.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20">
                  <CardHeader><CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Resumen Técnico</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-xs font-bold opacity-80 uppercase tracking-widest">Total Jugadoras</span>
                      <span className="text-4xl font-black">{roster?.length || 0}</span>
                    </div>
                    {!todayEvent && (
                      <div className="p-4 bg-white/10 rounded-xl border border-white/10 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-white mt-0.5 shrink-0" />
                        <p className="text-[11px] leading-relaxed font-bold">
                          No tienes entrenamientos hoy. El modo asistencia se activa al crear eventos en el calendario.
                        </p>
                      </div>
                    )}
                    <Button asChild variant="secondary" className="w-full font-black uppercase text-[10px] tracking-widest h-12 shadow-lg">
                      <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/stats`}>Ver Rankings de Goleadoras</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white/95">
                  <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Próximo Partido</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                    <Trophy className="h-10 w-10 text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin fixture cargado</p>
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