
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
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SectionNav } from "@/components/layout/section-nav";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";
import { SpecialEventsFeed } from "@/components/dashboard/special-events-feed";

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
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscar en índice global (prioritario para jugadores con login)
        let pData = null;
        const indexSnap = await getDoc(doc(firestore, "all_players_index", user.uid));
        if (indexSnap.exists()) pData = indexSnap.data();

        if (!pData && email) {
          const emailSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
          if (!emailSnap.empty) pData = emailSnap.docs[0].data();
        }

        if (pData) {
          setPlayerInfo(pData);

          // 2. Cargar contexto de equipo (directo desde el perfil sincronizado)
          if (pData.teamId && pData.divisionId && pData.clubId) {
            const teamDoc = await getDoc(doc(firestore, "clubs", pData.clubId, "divisions", pData.divisionId, "teams", pData.teamId));
            const divDoc = await getDoc(doc(firestore, "clubs", pData.clubId, "divisions", pData.divisionId));
            
            if (teamDoc.exists()) {
              const teamData = { 
                ...teamDoc.data(), 
                id: teamDoc.id, 
                clubId: pData.clubId, 
                divisionId: pData.divisionId,
                divisionName: divDoc.exists() ? divDoc.data().name : "Rama"
              };
              setTeamInfo(teamData);

              // Cargar posición en tabla
              const standingsSnap = await getDocs(collection(firestore, "clubs", pData.clubId, "divisions", pData.divisionId, "standings"));
              const standings = standingsSnap.docs.map(doc => doc.data());
              const sorted = standings.sort((a: any, b: any) => b.points - a.points);
              const teamRank = sorted.findIndex((s: any) => s.teamName.toLowerCase().includes(teamData.name.toLowerCase())) + 1;
              if (teamRank > 0) setRank(teamRank);

              // Cargar próximo evento
              const eventsSnap = await getDocs(query(
                collection(firestore, "clubs", pData.clubId, "divisions", pData.divisionId, "teams", pData.teamId, "events"),
                where("date", ">=", new Date().toISOString()),
                orderBy("date", "asc"),
                limit(1)
              ));
              if (!eventsSnap.empty) setNextEvent(eventsSnap.docs[0].data());
            }
          }
        }
      } catch (e) {
        console.error("Player Dashboard Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Posiciones", href: "/dashboard/player/standings", icon: TableIcon },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: playerInfo ? `/dashboard/clubs/${playerInfo.clubId}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  if (!playerInfo) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4">
      <UserCircle className="h-20 w-20 text-muted-foreground/20" />
      <h2 className="text-2xl font-black text-foreground">Sin Perfil Vinculado</h2>
      <p className="text-muted-foreground max-w-sm">Contacta con tu club para que vinculen tu acceso a la App.</p>
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
        <SpecialEventsFeed clubId={playerInfo.clubId} />

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 px-1 drop-shadow-md">Próximo Compromiso</h2>
          {nextEvent ? (
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/5 p-4 rounded-2xl text-primary">
                    {nextEvent.type === 'match' ? <Trophy className="h-7 w-7" /> : <CalendarIcon className="h-7 w-7" />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{nextEvent.type === 'match' ? 'PARTIDO' : 'ENTRENAMIENTO'}</p>
                    <h3 className="font-black text-xl text-slate-900">{nextEvent.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-black uppercase">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(nextEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {nextEvent.location}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-200" />
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-white/20 rounded-[2.5rem] bg-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sin eventos próximos</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          {playerNav.slice(1, 5).map((item, idx) => (
            <Link key={idx} href={item.href}>
              <Card className="h-full border-none shadow-xl bg-white hover:bg-slate-50 transition-all group rounded-[2rem]">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">{item.title}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
