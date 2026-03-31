
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
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Trophy,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayEvent, setTodayEvent] = useState<any>(null);

  useEffect(() => {
    async function fetchAllMyTeams() {
      if (!user || !firestore) return;
      try {
        const userId = user.uid;
        const userDoc = await getDoc(doc(firestore, "users", userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        const clubId = userData?.clubId;
        if (!clubId) {
          setLoading(false);
          return;
        }

        const teamsFound: any[] = [];
        const divsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions"));
        
        for (const divDoc of divsSnap.docs) {
          // Buscamos equipos por coachId (ID Real)
          const teamsSnap = await getDocs(query(
            collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams"),
            where("coachId", "==", userId)
          ));

          teamsSnap.forEach(tDoc => {
            teamsFound.push({
              ...tDoc.data(),
              id: tDoc.id,
              clubId: clubId,
              divisionId: divDoc.id,
              divisionName: divDoc.data().name,
              sport: divDoc.data().sport || 'hockey'
            });
          });

          // Fallback por nombre si no hay por ID (para datos antiguos o transiciones)
          if (teamsSnap.empty && userData?.name) {
            const fallbackSnap = await getDocs(query(
              collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams"),
              where("coachName", "==", userData.name)
            ));
            fallbackSnap.forEach(tDoc => {
              teamsFound.push({
                ...tDoc.data(),
                id: tDoc.id,
                clubId: clubId,
                divisionId: divDoc.id,
                divisionName: divDoc.data().name,
                sport: divDoc.data().sport || 'hockey'
              });
              // Auto-actualizamos el ID para la próxima vez
              updateDocumentNonBlocking(doc(firestore, "clubs", clubId, "divisions", divDoc.id, "teams", tDoc.id), { coachId: userId });
            });
          }
        }

        setMyTeams(teamsFound);
        if (teamsFound.length > 0) {
          setSelectedTeam(teamsFound[0]);
        }
      } catch (e) { 
        console.error("Error cargando equipos del coach:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchAllMyTeams();
  }, [user, firestore]);

  // Efecto para buscar eventos del equipo seleccionado
  useEffect(() => {
    async function fetchTodayEvent() {
      if (!selectedTeam || !firestore) return;
      setTodayEvent(null);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const eventsSnap = await getDocs(query(
          collection(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events"),
          where("type", "==", "training")
        ));
        const found = eventsSnap.docs.find(d => d.data().date?.startsWith(todayStr));
        if (found) setTodayEvent({ ...found.data(), id: found.id });
      } catch (e) {
        console.error(e);
      }
    }
    fetchTodayEvent();
  }, [selectedTeam, firestore]);

  const rosterQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTeam) return null;
    return collection(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "assignments");
  }, [firestore, selectedTeam]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTeam || !todayEvent) return null;
    return collection(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events", todayEvent.id, "attendance");
  }, [firestore, selectedTeam, todayEvent]);
  const { data: attendanceList } = useCollection(attendanceQuery);

  const handleToggleAttendance = async (playerId: string, playerName: string, currentStatus: string) => {
    if (!todayEvent || !selectedTeam) return;
    const nextStatus = currentStatus === 'going' ? 'not_going' : currentStatus === 'not_going' ? 'unknown' : 'going';
    const attDoc = doc(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events", todayEvent.id, "attendance", playerId);
    
    setDoc(attDoc, { playerId, playerName, status: nextStatus, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const coachNav = [
    { title: "Gestión Técnica", href: "/dashboard/coach", icon: ClipboardCheck },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Tienda Club", href: selectedTeam ? `/dashboard/clubs/${selectedTeam.clubId}/shop` : "/dashboard/coach", icon: ShoppingBag },
    { title: "Calendario", href: selectedTeam ? `/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/events` : "/dashboard/coach", icon: Calendar },
  ];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  if (myTeams.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
      <div className="bg-white/10 p-8 rounded-full mb-6 border border-white/20 backdrop-blur-md">
        <ClipboardCheck className="h-16 w-16 text-white opacity-40" />
      </div>
      <h2 className="text-3xl font-black tracking-tight text-white font-headline">Sin Equipos Asignados</h2>
      <p className="text-white/80 max-w-sm mt-2 font-bold ambient-text">No hemos encontrado planteles bajo tu dirección. El administrador debe asignarte como profesor en una categoría.</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coachNav} basePath="/dashboard/coach" />
      
      <div className="flex-1 space-y-10 pb-20">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black font-headline tracking-tight text-white drop-shadow-2xl">{selectedTeam.name}</h1>
                <Badge className="font-black bg-white text-primary border-none shadow-lg px-4 h-8 uppercase tracking-widest">{selectedTeam.season}</Badge>
              </div>
              <p className="text-white font-black uppercase tracking-[0.3em] text-[11px] drop-shadow-md opacity-90">{selectedTeam.divisionName} • Responsable Técnico</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {myTeams.length > 1 && (
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                  <span className="text-[9px] font-black text-white/60 uppercase pl-3">Cambiar Equipo:</span>
                  {myTeams.map(t => (
                    <Button 
                      key={t.id} 
                      size="sm" 
                      variant={selectedTeam.id === t.id ? "default" : "ghost"}
                      className={cn(
                        "h-9 px-4 font-black uppercase text-[10px] rounded-xl transition-all",
                        selectedTeam.id === t.id ? "bg-white text-primary shadow-xl" : "text-white hover:bg-white/10"
                      )}
                      onClick={() => setSelectedTeam(t)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              )}
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_10px_30px_rgba(0,0,0,0.3)] font-black uppercase text-[11px] tracking-widest h-12 px-6 gap-3">
                <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/match-live`}>
                  <PlayCircle className="h-5 w-5" /> Partido Live
                </Link>
              </Button>
              <Button variant="outline" asChild className="font-black border-white/40 text-white bg-black/20 hover:bg-black/40 backdrop-blur-md h-12 px-6 uppercase text-[11px] tracking-widest">
                <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/events`}>
                  <Calendar className="h-5 w-5 mr-2" /> Agenda
                </Link>
              </Button>
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
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Sesión de Hoy</CardTitle>
                  <CardDescription className="text-xl font-black text-white">{todayEvent.title} • {todayEvent.location}</CardDescription>
                </div>
              </div>
              <div className="text-right relative z-10 pr-4">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Presentismo</p>
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
              initialPlayerCount={selectedTeam.tacticalPlayerCount || 11}
              initialSport={selectedTeam.tacticalSport || selectedTeam.sport}
              onSettingsChange={(s) => updateDocumentNonBlocking(doc(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id), { tacticalPlayerCount: s.playerCount, tacticalSport: s.sport })}
            />
          </TabsContent>

          <TabsContent value="roster" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                      <Users className="h-7 w-7 text-primary" /> Jugadoras del Equipo
                    </CardTitle>
                    <CardDescription className="font-bold text-slate-500 mt-1">
                      {todayEvent ? "Marca el presente para la sesión de hoy." : "Padrón activo asignado a tu categoría."}
                    </CardDescription>
                  </div>
                  {todayEvent && (
                    <Badge className="bg-green-100 text-green-700 border-2 border-green-200 font-black text-[10px] px-4 py-1.5 tracking-widest uppercase">ASISTENCIA</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {rosterLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : (
                    <div className="divide-y divide-slate-100">
                      {roster?.map((member: any) => {
                        const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                        return (
                          <div key={member.id} className="flex items-center justify-between p-5 group hover:bg-slate-50 transition-all">
                            <div className="flex items-center gap-5">
                              <Avatar className="h-16 w-14 border-2 border-slate-100 shadow-sm rounded-xl">
                                <AvatarImage src={member.playerPhoto} className="object-cover" />
                                <AvatarFallback className="font-black text-slate-300 bg-slate-50">{member.playerName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-black text-slate-900 text-lg">{member.playerName}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">DNI: {member.dni || '---'}</p>
                              </div>
                            </div>
                            
                            {todayEvent && (
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
                  <CardHeader className="relative z-10 pb-4">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Resumen Técnico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 relative z-10">
                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                      <span className="text-xs font-black opacity-50 uppercase tracking-widest">Total Plantel</span>
                      <span className="text-5xl font-black text-primary tracking-tighter">{roster?.length || 0}</span>
                    </div>
                    <Button asChild variant="secondary" className="w-full font-black uppercase text-[11px] tracking-widest h-14 shadow-xl">
                      <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/stats`}>Estadísticas Temporada</Link>
                    </Button>
                  </CardContent>
                  <Flag className="absolute right-[-30px] bottom-[-30px] opacity-10 h-40 w-40" />
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
