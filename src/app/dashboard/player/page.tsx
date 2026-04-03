
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Calendar as CalendarIcon, 
  Loader2, 
  UserCircle, 
  ShieldCheck, 
  CreditCard, 
  ShoppingBag, 
  Table as TableIcon, 
  ChevronRight, 
  Star, 
  BellRing,
  Clock,
  MapPin,
  Building2,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SectionNav } from "@/components/layout/section-nav";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";

export default function PlayerDashboardHub() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      try {
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", user.email)));
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          setPlayerInfo(pData);
          const divSnap = await getDocs(collection(firestore, "clubs", pData.clubId, "divisions"));
          for (const dDoc of divSnap.docs) {
            const teamsSnap = await getDocs(collection(firestore, "clubs", pData.clubId, "divisions", dDoc.id, "teams"));
            for (const tDoc of teamsSnap.docs) {
              const rosterSnap = await getDocs(query(
                collection(firestore, "clubs", pData.clubId, "divisions", dDoc.id, "teams", tDoc.id, "assignments"),
                where("playerId", "==", pData.id)
              ));
              if (!rosterSnap.empty) {
                const teamData = { ...tDoc.data(), divisionName: dDoc.data().name, id: tDoc.id, clubId: pData.clubId, divisionId: dDoc.id };
                setTeamInfo(teamData);
                
                const standingsSnap = await getDocs(collection(firestore, "clubs", pData.clubId, "divisions", dDoc.id, "standings"));
                const standings = standingsSnap.docs.map(doc => doc.data());
                const sorted = standings.sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
                const teamRank = sorted.findIndex((s: any) => s.teamName.toLowerCase().includes(teamData.name.toLowerCase())) + 1;
                if (teamRank > 0) setRank(teamRank);

                const eventsSnap = await getDocs(query(
                  collection(firestore, "clubs", pData.clubId, "divisions", dDoc.id, "teams", tDoc.id, "events"),
                  where("date", ">=", new Date().toISOString()),
                  orderBy("date", "asc"),
                  limit(1)
                ));
                if (!eventsSnap.empty) setNextEvent(eventsSnap.docs[0].data());
                break;
              }
            }
            if (teamInfo) break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [user, firestore, teamInfo]);

  const callupsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(
      collection(firestore, "match_callups"), 
      where("playerId", "==", playerInfo.id),
      where("status", "==", "pending"),
      where("published", "==", true)
    );
  }, [firestore, playerInfo]);

  const { data: pendingCallups } = useCollection(callupsQuery);
  const pendingCount = pendingCallups?.length || 0;

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Posiciones", href: "/dashboard/player/standings", icon: TableIcon },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: teamInfo ? `/dashboard/clubs/${teamInfo.clubId}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  if (!playerInfo) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4">
      <UserCircle className="h-20 w-20 text-muted-foreground/20" />
      <h2 className="text-2xl font-black text-foreground tracking-tight">Sin Perfil Vinculado</h2>
      <p className="text-muted-foreground max-w-sm">Contacta con tu club para vincular tu email institucional.</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 max-w-3xl mx-auto space-y-8 pb-24 w-full px-4 md:px-0">
        <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-xl border border-white/50">
          <div className="relative">
            <Avatar className="h-16 w-16 md:h-24 md:w-24 border-4 border-primary/10 shadow-inner">
              <AvatarImage src={playerInfo.photoUrl} className="object-cover" />
              <AvatarFallback className="text-2xl font-black bg-slate-50 text-slate-300">{playerInfo.firstName[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-card shadow-lg">#{playerInfo.jerseyNumber || "•"}</div>
          </div>
          <div className="flex-1 space-y-0.5">
            <h1 className="text-xl md:text-3xl font-black font-headline tracking-tight text-slate-900">{playerInfo.firstName} {playerInfo.lastName}</h1>
            <p className="text-slate-500 text-sm font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> {playerInfo.clubName}</p>
            {teamInfo && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2">{teamInfo.divisionName}</Badge>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2">{teamInfo.name}</Badge>
                {rank && (
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 border-yellow-500 text-yellow-600">Puesto #{rank}</Badge>
                )}
              </div>
            )}
          </div>
        </header>

        <LiveMatchesCard clubId={playerInfo.clubId} />

        {pendingCount > 0 && (
          <Link href="/dashboard/player" className="block active:scale-95 transition-transform">
            <div className="bg-red-500 text-white p-5 rounded-[1.5rem] shadow-2xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-xl animate-pulse"><BellRing className="h-6 w-6" /></div>
                <div>
                  <p className="font-black text-sm uppercase tracking-wider">¡Convocatoria Oficial!</p>
                  <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest text-white">Tienes {pendingCount} citaciones pendientes de confirmación.</p>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 opacity-50 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 px-1 drop-shadow-md">Próximo Compromiso</h2>
          {nextEvent ? (
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/5 p-4 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                    {nextEvent.type === 'match' ? <Trophy className="h-7 w-7" /> : <CalendarIcon className="h-7 w-7" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{nextEvent.type === 'match' ? 'ENCUENTRO OFICIAL' : 'ENTRENAMIENTO'}</p>
                    <h3 className="font-black text-xl text-slate-900 leading-none">{nextEvent.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <span className="flex items-center gap-1.5 text-slate-600"><Clock className="h-3.5 w-3.5 text-primary" /> {new Date(nextEvent.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} HS</span>
                      <span className="flex items-center gap-1.5 truncate max-w-[150px]"><MapPin className="h-3.5 w-3.5 text-primary" /> {nextEvent.location}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-200" />
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-white/20 rounded-[2.5rem] bg-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sin eventos programados</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          {playerNav.slice(1).map((item, idx) => (
            <Link key={idx} href={item.href}>
              <Card className="h-full border-none shadow-xl bg-white hover:bg-slate-50 active:scale-95 transition-all group rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900 leading-tight">{item.title}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
