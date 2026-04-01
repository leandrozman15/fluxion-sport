
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

export default function PlayerDashboardHub() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
                setTeamInfo({ ...tDoc.data(), divisionName: dDoc.data().name, id: tDoc.id, clubId: pData.clubId, divisionId: dDoc.id });
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 max-w-3xl mx-auto space-y-8 pb-20 w-full">
        <header className="flex items-center gap-4 bg-card p-6 rounded-2xl shadow-sm border border-white/50">
          <div className="relative">
            <Avatar className="h-16 w-16 md:h-24 md:w-24 border-4 border-primary/10 shadow-inner">
              <AvatarImage src={playerInfo.photoUrl} className="object-cover" />
              <AvatarFallback className="text-2xl font-black">{playerInfo.firstName[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-card shadow-lg">#{playerInfo.jerseyNumber || "•"}</div>
          </div>
          <div className="flex-1 space-y-0.5">
            <h1 className="text-xl md:text-3xl font-black font-headline tracking-tight">{playerInfo.firstName} {playerInfo.lastName}</h1>
            <p className="text-muted-foreground text-sm font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> {playerInfo.clubName}</p>
            {teamInfo && (
              <div className="flex gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2">{teamInfo.divisionName}</Badge>
                <Badge className="bg-accent/20 text-accent-foreground border-none text-[8px] font-black uppercase tracking-widest px-2">{teamInfo.name}</Badge>
              </div>
            )}
          </div>
        </header>

        {pendingCount > 0 && (
          <Link href="/dashboard/player" className="block active:scale-95 transition-transform">
            <div className="bg-orange-500 text-white p-4 rounded-xl shadow-xl flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg animate-pulse"><BellRing className="h-5 w-5" /></div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Tienes {pendingCount} Convocatorias</p>
                  <p className="text-[10px] opacity-90">Confirma tu asistencia ahora.</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        )}

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Próximo Compromiso</h2>
          {nextEvent ? (
            <Card className="border-none shadow-sm group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">{nextEvent.type === 'match' ? <Trophy className="h-6 w-6" /> : <CalendarIcon className="h-6 w-6" />}</div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{nextEvent.type === 'match' ? 'PARTIDO' : 'ENTRENAMIENTO'}</p>
                    <h3 className="font-black text-base leading-tight">{nextEvent.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-bold">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(nextEvent.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs</span>
                      <span className="flex items-center gap-1 truncate max-w-[100px]"><MapPin className="h-3 w-3" /> {nextEvent.location}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-30" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed py-8 flex flex-col items-center justify-center opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">Sin eventos programados</p></Card>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          {playerNav.slice(1).map((item, idx) => (
            <Link key={idx} href={item.href}>
              <Card className="h-full border-none shadow-sm active:scale-95 transition-all group">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><item.icon className="h-5 w-5" /></div>
                  <h3 className="font-black text-sm leading-none">{item.title}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
