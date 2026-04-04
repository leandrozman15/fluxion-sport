
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
  ShieldCheck,
  ShoppingBag,
  Trophy,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Crown,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { HockeyTacticalBoard } from "@/components/dashboard/hockey-tactical-board";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";
import { SpecialEventsFeed } from "@/components/dashboard/special-events-feed";
import { RecentResultsStrip } from "@/components/dashboard/recent-results-strip";
import { useToast } from "@/hooks/use-toast";
import { useRoleGuard } from "@/hooks/use-role-guard";

export default function CoachDashboard() {
  const { authorized, loading: guardLoading } = useRoleGuard(['coach', 'coach_lvl1', 'coach_lvl2']);
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayEvent, setTodayEvent] = useState<any>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [playerAggStats, setPlayerAggStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [injuryDialog, setInjuryDialog] = useState<{ open: boolean; member: any | null; description: string; inactivityDays: string }>({ open: false, member: null, description: "", inactivityDays: "" });

  useEffect(() => {
    async function fetchAllMyTeams() {
      if (!user || !firestore) return;
      try {
        const userEmail = user.email?.toLowerCase().trim();
        let profile = null;
        
        const uidDoc = await getDoc(doc(firestore, "users", user.uid));
        if (uidDoc.exists()) profile = uidDoc.data();

        if (!profile && userEmail) {
          const staffQuery = query(collection(firestore, "users"), where("email", "==", userEmail));
          const staffSnap = await getDocs(staffQuery);
          if (!staffSnap.empty) profile = staffSnap.docs[0].data();
        }

        if (!profile) {
          setLoading(false);
          return;
        }

        setStaffProfile(profile);
        const clubId = profile.clubId;

        if (!clubId) {
          setLoading(false);
          return;
        }

        // VALIDACIÓN DE CLUB EXISTENTE
        const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
        if (!clubDoc.exists()) {
          toast({ variant: "destructive", title: "Club Inactivo", description: "Tu institución ya no está disponible." });
          router.replace('/login');
          return;
        }
        setClub({ ...clubDoc.data(), id: clubDoc.id });

        // Todos los identificadores posibles del coach (UID actual + email + cualquier id legado)
        const staffUid = user.uid;
        const staffEmail = profile.email || userEmail;
        const staffLegacyId = profile.id !== user.uid ? profile.id : null; // id viejo (puede ser email)
        const staffName = profile.name || `${profile.firstName} ${profile.lastName}`;

        const divsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions"));
        const teamsPromises = divsSnap.docs.map(async (divDoc) => {
          const teamsRef = collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams");
          const tSnap = await getDocs(teamsRef);
          return tSnap.docs
            .map(td => ({
              ...td.data() as any,
              id: td.id,
              clubId,
              divisionId: divDoc.id,
              divisionName: divDoc.data().name,
              sport: divDoc.data().sport || 'hockey'
            }))
            .filter((t: any) =>
              t.coachId === staffUid ||
              t.coachId === staffEmail ||
              (staffLegacyId && t.coachId === staffLegacyId) ||
              t.coachEmail === staffEmail ||
              t.coachName === staffName
            );
        });

        const teamsResults = await Promise.all(teamsPromises);
        const allTeams = teamsResults.flat();

        setMyTeams(allTeams);
        if (allTeams.length > 0) {
          setSelectedTeam(allTeams[0]);
        }
      } catch (e) { 
        console.error("Error cargando equipos del coach:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchAllMyTeams();
  }, [user, firestore, router, toast]);

  useEffect(() => {
    async function fetchTeamContext() {
      if (!selectedTeam || !firestore) return;
      setTodayEvent(null);
      setRank(null);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const eventsSnap = await getDocs(query(
          collection(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events"),
          where("type", "==", "training")
        ));
        const found = eventsSnap.docs.find(d => d.data().date?.startsWith(todayStr));
        if (found) setTodayEvent({ ...found.data(), id: found.id });

        const standingsSnap = await getDocs(collection(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "standings"));
        const standings = standingsSnap.docs.map(doc => doc.data());
        const sorted = standings.sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
        const teamRank = sorted.findIndex((s: any) => s.teamName.toLowerCase().includes(selectedTeam.name.toLowerCase())) + 1;
        if (teamRank > 0) setRank(teamRank);
      } catch (e) {
        console.error(e);
      }
    }
    fetchTeamContext();
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
    await setDoc(attDoc, { playerId, playerName, status: nextStatus, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const handleToggleCaptain = (member: any) => {
    if (!selectedTeam || !firestore) return;
    const assignmentRef = doc(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "assignments", member.id);
    updateDocumentNonBlocking(assignmentRef, { isCaptain: !member.isCaptain });
    toast({ title: member.isCaptain ? "Capitanía removida" : "Capitana asignada", description: member.playerName });
  };

  const handleSaveInjury = () => {
    if (!injuryDialog.member || !selectedTeam || !firestore) return;
    const assignmentRef = doc(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "assignments", injuryDialog.member.id);
    const injuryData = injuryDialog.description.trim()
      ? { injury: { description: injuryDialog.description.trim(), inactivityDays: injuryDialog.inactivityDays.trim(), reportedAt: new Date().toISOString() } }
      : { injury: null };
    updateDocumentNonBlocking(assignmentRef, injuryData);
    toast({ title: injuryDialog.description.trim() ? "Lesión registrada" : "Lesión eliminada", description: injuryDialog.member.playerName });
    setInjuryDialog({ open: false, member: null, description: "", inactivityDays: "" });
  };

  const coachNav = [
    { title: "Gestión Técnica", href: "/dashboard/coach", icon: ClipboardCheck },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Tienda Club", href: selectedTeam ? `/dashboard/clubs/${selectedTeam.clubId}/shop` : "/dashboard/coach", icon: ShoppingBag },
    { title: "Calendario", href: selectedTeam ? `/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/events` : "/dashboard/coach", icon: Calendar },
  ];

  if (guardLoading || !authorized) return (
    <div className="flex justify-center items-center h-[70vh]"><Loader2 className="animate-spin text-white h-8 w-8" /></div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Identificando Planteles...</p>
    </div>
  );

  const isLvl1 = staffProfile?.role === 'coach_lvl1' || staffProfile?.role === 'coordinator' || staffProfile?.role === 'club_admin' || staffProfile?.role === 'admin';

  if (myTeams.length === 0) return (
    <div className="flex flex-col md:flex-row gap-8 min-h-screen">
      <SectionNav items={coachNav} basePath="/dashboard/coach" />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
        <div className="bg-white/10 p-8 rounded-full border border-white/20 backdrop-blur-md">
          <AlertCircle className="h-16 w-16 text-white opacity-40" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-white font-headline">Categorías Pendientes</h2>
          <p className="text-white/80 max-w-sm font-bold">
            {staffProfile?.name || staffProfile?.firstName}, tu perfil está activo pero aún no tienes equipos asignados en {club?.name || 'tu club'}.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coachNav} basePath="/dashboard/coach" />
      
      <div className="flex-1 space-y-6 md:space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight text-white drop-shadow-2xl">{selectedTeam.name}</h1>
                <Badge className="font-black bg-white text-primary border-none shadow-lg px-3 h-7 uppercase tracking-widest text-[10px]">{selectedTeam.season}</Badge>
                {rank && (
                  <Badge variant="outline" className="bg-white/10 backdrop-blur-md text-white border-yellow-500 font-black text-[10px] px-3 h-7 uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 text-yellow-500" /> Puesto #{rank}
                  </Badge>
                )}
              </div>
              <p className="text-white font-black uppercase tracking-[0.3em] text-[9px] drop-shadow-md opacity-90">
                {selectedTeam.divisionName} • Consola Técnica 
                {staffProfile?.role === 'coach_lvl1' && " (Admin Nivel 1)"}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {myTeams.length > 1 && (
                <ScrollArea className="w-full whitespace-nowrap bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white/60 uppercase pl-3 shrink-0">Mis Categorías:</span>
                    {myTeams.map(t => (
                      <Button 
                        key={t.id} 
                        size="sm" 
                        variant={selectedTeam.id === t.id ? "default" : "ghost"}
                        className={cn(
                          "h-8 px-4 font-black uppercase text-[10px] rounded-xl transition-all shrink-0",
                          selectedTeam.id === t.id ? "bg-white text-primary shadow-xl" : "text-white hover:bg-white/10"
                        )}
                        onClick={() => setSelectedTeam(t)}
                      >
                        {t.name}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="h-1" />
                </ScrollArea>
              )}
              <div className="flex flex-wrap gap-2 w-full">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl font-black uppercase text-[10px] tracking-widest h-12 gap-2 flex-1 min-w-[140px]">
                  <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/match-live`}>
                    <PlayCircle className="h-5 w-5" /> Iniciar Live
                  </Link>
                </Button>
                <Button variant="outline" asChild className="font-black border-white/40 text-white bg-black/20 hover:bg-black/40 backdrop-blur-md h-12 gap-2 uppercase text-[10px] tracking-widest flex-1 min-w-[140px]">
                  <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/events`}>
                    <Calendar className="h-5 w-5" /> Agenda
                  </Link>
                </Button>
                {isLvl1 && (
                  <Button asChild variant="secondary" className="h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-white text-primary hover:bg-slate-50 shadow-xl">
                    <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}`}>
                      <Settings2 className="h-5 w-5" /> Administrar Rama
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <LiveMatchesCard clubId={selectedTeam.clubId} />
        <RecentResultsStrip 
          clubId={selectedTeam.clubId} 
          divisionId={selectedTeam.divisionId} 
          teamId={selectedTeam.id}
          clubLogo={club?.logoUrl}
          teamName={selectedTeam.name}
        />
        {selectedTeam && <SpecialEventsFeed clubId={selectedTeam.clubId} />}

        {todayEvent && (
          <Card className="border-none bg-primary shadow-2xl overflow-hidden rounded-[2rem]">
            <CardHeader className="py-4 md:py-6 flex flex-row items-center justify-between text-white relative">
              <div className="flex items-center gap-3 md:gap-5 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-md">
                  <Timer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Sesión Activa</CardTitle>
                  <CardDescription className="text-sm md:text-lg font-black text-white truncate max-w-[180px] md:max-w-none">{todayEvent.title}</CardDescription>
                </div>
              </div>
              <div className="text-right relative z-10">
                <p className="text-[9px] font-black uppercase opacity-70">Presentes</p>
                <p className="text-2xl md:text-4xl font-black tracking-tighter">
                  {attendanceList?.filter(a => a.status === 'going').length || 0}/{roster?.length || 0}
                </p>
              </div>
            </CardHeader>
          </Card>
        )}

        <Tabs defaultValue="roster" className="w-full">
          <TabsList className="bg-white/15 backdrop-blur-xl p-1 mb-6 border border-white/20 shadow-2xl flex w-full rounded-2xl h-14">
            <TabsTrigger value="roster" className="flex-1 gap-2 h-12 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
              <Users className="h-4 w-4" /> Plantilla
            </TabsTrigger>
            <TabsTrigger value="tactical" className="flex-1 gap-2 h-12 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
              <Settings2 className="h-4 w-4" /> Pizarra Táctica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tighter">
                    <Users className="h-6 w-6 text-primary" /> Fichas de Jugadoras
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {rosterLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : (
                    <div className="divide-y divide-slate-100">
                      {roster?.map((member: any) => {
                        const status = attendanceList?.find(a => a.playerId === member.playerId)?.status || 'unknown';
                        return (
                          <div key={member.id} className="flex items-center justify-between p-4 md:p-6 group hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-14 w-12 md:h-20 md:w-16 border-2 rounded-xl md:rounded-2xl border-slate-100">
                                  <AvatarImage src={member.playerPhoto} className="object-cover" />
                                  <AvatarFallback className="font-black text-slate-300 bg-slate-50">{member.playerName[0]}</AvatarFallback>
                                </Avatar>
                                {member.isCaptain && (
                                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white">
                                    <span className="text-[9px] font-black text-yellow-900 leading-none">C</span>
                                  </div>
                                )}
                                {member.injury?.description && (
                                  <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white">
                                    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="white" xmlns="http://www.w3.org/2000/svg">
                                      <rect x="6" y="1" width="4" height="14" rx="1"/>
                                      <rect x="1" y="6" width="14" height="4" rx="1"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-base md:text-xl text-slate-900 leading-none">{member.playerName}</span>
                                  {member.isCaptain && <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-[8px] font-black uppercase tracking-widest px-1.5 h-4 hidden md:inline-flex">Capitana</Badge>}
                                  {member.injury?.description && <Badge className="bg-red-100 text-red-600 border border-red-200 text-[8px] font-black uppercase tracking-widest px-1.5 h-4 hidden md:inline-flex">Lesión</Badge>}
                                </div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-1">
                                  {member.injury?.description
                                    ? <span className="text-red-400">{member.injury.inactivityDays ? `Baja: ${member.injury.inactivityDays}` : "Con Lesión"}</span>
                                    : <span className="text-slate-400">Federado Activo</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 md:gap-2">
                              {/* Captain toggle */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleCaptain(member)}
                                title={member.isCaptain ? "Quitar capitana" : "Asignar capitana"}
                                className={cn(
                                  "h-10 w-10 md:h-12 md:w-12 p-0 rounded-xl border-2 transition-all font-black text-lg",
                                  member.isCaptain
                                    ? "bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md shadow-yellow-200"
                                    : "bg-white text-slate-300 border-slate-100 hover:border-yellow-400 hover:text-yellow-500"
                                )}
                              >
                                <span className="text-base md:text-lg font-black leading-none">C</span>
                              </Button>

                              {/* Injury toggle */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInjuryDialog({ open: true, member, description: member.injury?.description || "", inactivityDays: member.injury?.inactivityDays || "" })}
                                title={member.injury?.description ? "Ver/editar lesión" : "Registrar lesión"}
                                className={cn(
                                  "h-10 w-10 md:h-12 md:w-12 p-0 rounded-xl border-2 transition-all",
                                  member.injury?.description
                                    ? "bg-red-500 text-white border-red-600 shadow-md shadow-red-200"
                                    : "bg-white text-slate-200 border-slate-100 hover:border-red-400 hover:text-red-400"
                                )}
                              >
                                <svg viewBox="0 0 16 16" className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="6" y="1" width="4" height="14" rx="1"/>
                                  <rect x="1" y="6" width="14" height="4" rx="1"/>
                                </svg>
                              </Button>

                              {todayEvent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleAttendance(member.playerId, member.playerName, status)}
                                  className={cn(
                                    "h-10 w-10 md:h-12 md:w-12 p-0 rounded-xl border-2 transition-all shadow-md",
                                    status === 'going' ? "bg-green-500 text-white border-green-600 scale-110 shadow-green-500/20" :
                                    status === 'not_going' ? "bg-red-500 text-white border-red-600 shadow-red-500/20" :
                                    "bg-white text-slate-300 border-slate-100 hover:border-primary hover:text-primary"
                                  )}
                                >
                                  {status === 'going' ? <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" /> :
                                   status === 'not_going' ? <XCircle className="h-5 w-5 md:h-6 md:w-6" /> :
                                   <HelpCircle className="h-5 w-5 md:h-6 md:w-6" />}
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

              <div className="space-y-6">
                <Card className="bg-white border-none shadow-2xl p-8 rounded-[2rem] border-l-8 border-l-primary flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Plantel</p>
                  <p className="text-6xl font-black text-primary mt-2 tracking-tighter">{roster?.length || 0}</p>
                  <Button asChild variant="outline" className="w-full h-12 font-black uppercase text-[10px] tracking-widest border-primary text-primary hover:bg-primary hover:text-white mt-8 rounded-xl transition-all">
                    <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/stats`}>Rankings Goleadores</Link>
                  </Button>
                </Card>

                <Card className="bg-white border-none shadow-2xl p-8 rounded-[2rem] border-l-8 border-l-accent text-center">
                  <Activity className="h-10 w-10 text-accent mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Registro de Asistencia</p>
                  <Button variant="link" asChild className="mt-2 h-auto p-0 font-black text-[10px] text-primary uppercase tracking-widest hover:no-underline">
                    <Link href={`/dashboard/clubs/${selectedTeam.clubId}/divisions/${selectedTeam.divisionId}/teams/${selectedTeam.id}/attendance-ranking`}>Ver Estadísticas</Link>
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tactical" className="animate-in fade-in zoom-in-95 duration-500">
            <HockeyTacticalBoard 
              roster={roster || []} 
              clubLogo={club?.logoUrl || ""}
              initialPlayerCount={selectedTeam.tacticalPlayerCount || 11}
              initialSport={selectedTeam.tacticalSport || selectedTeam.sport}
              teamId={selectedTeam.id}
              clubId={selectedTeam.clubId}
              divisionId={selectedTeam.divisionId}
              onSettingsChange={(s) => updateDocumentNonBlocking(doc(firestore, "clubs", selectedTeam.clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id), { tacticalPlayerCount: s.playerCount, tacticalSport: s.sport })}
            />
          </TabsContent>
        </Tabs>

        {/* Injury Dialog */}
        <Dialog open={injuryDialog.open} onOpenChange={open => { if (!open) setInjuryDialog(s => ({ ...s, open: false })); }}>
          <DialogContent className="max-w-sm bg-white border-none shadow-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="h-5 w-5 text-red-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="1" width="4" height="14" rx="1"/>
                  <rect x="1" y="6" width="14" height="4" rx="1"/>
                </svg>
                {injuryDialog.member?.playerName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Tipo / Descripción de la Lesión</Label>
                <Textarea
                  value={injuryDialog.description}
                  onChange={e => setInjuryDialog(s => ({ ...s, description: e.target.value }))}
                  placeholder="Ej: Esguince tobillo derecho, desgarro, luxación..."
                  className="border-2 font-bold resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Tiempo de Inactividad</Label>
                <Input
                  value={injuryDialog.inactivityDays}
                  onChange={e => setInjuryDialog(s => ({ ...s, inactivityDays: e.target.value }))}
                  placeholder="Ej: 2 semanas, 10 días, hasta el 15/05..."
                  className="h-12 border-2 font-bold"
                />
              </div>
              {injuryDialog.member?.injury?.description && (
                <p className="text-[10px] text-slate-400 font-bold">Dejar la descripción vacía para quitar la lesión registrada.</p>
              )}
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="ghost" onClick={() => setInjuryDialog(s => ({ ...s, open: false }))} className="font-bold text-slate-500">
                Cancelar
              </Button>
              {injuryDialog.member?.injury?.description && (
                <Button
                  variant="outline"
                  onClick={() => setInjuryDialog(s => ({ ...s, description: "", inactivityDays: "" }))}
                  className="font-black text-[10px] uppercase tracking-widest border-red-200 text-red-500 hover:bg-red-50"
                >
                  Quitar Lesión
                </Button>
              )}
              <Button onClick={handleSaveInjury} className="font-black uppercase text-[10px] tracking-widest h-12 px-8 flex-1">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
