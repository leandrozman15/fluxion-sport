
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Calendar as CalendarIcon, 
  Loader2, 
  Bell, 
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
  Sparkles,
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
                setTeamInfo({ 
                  ...tDoc.data(), 
                  divisionName: dDoc.data().name,
                  id: tDoc.id,
                  clubId: pData.clubId,
                  divisionId: dDoc.id
                });

                const eventsSnap = await getDocs(query(
                  collection(firestore, "clubs", pData.clubId, "divisions", dDoc.id, "teams", tDoc.id, "events"),
                  where("date", ">=", new Date().toISOString()),
                  orderBy("date", "asc"),
                  limit(1)
                ));
                if (!eventsSnap.empty) {
                  setNextEvent(eventsSnap.docs[0].data());
                }
                break;
              }
            }
            if (teamInfo) break;
          }
        }
      } catch (e) {
        console.error("Error cargando dashboard:", e);
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
      <p className="text-muted-foreground max-w-sm">Contacta con tu club para que vinculen tu email con tu ficha oficial de deportista.</p>
    </div>
  );

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 max-w-3xl mx-auto space-y-10 pb-20">
        <header className="flex items-center gap-6 bg-card p-8 rounded-3xl shadow-sm border border-white/50">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/10 shadow-inner">
              <AvatarImage src={playerInfo.photoUrl} className="object-cover" />
              <AvatarFallback className="text-3xl font-black">{playerInfo.firstName[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs font-black h-8 w-8 rounded-full flex items-center justify-center border-4 border-card shadow-lg">
              #{playerInfo.jerseyNumber || "•"}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-black font-headline tracking-tight">{playerInfo.firstName} {playerInfo.lastName}</h1>
            <p className="text-muted-foreground font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> {playerInfo.clubName}
            </p>
            {teamInfo && (
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">{teamInfo.divisionName}</Badge>
                <Badge className="bg-accent/20 text-accent-foreground border-none text-[10px] font-black uppercase tracking-widest">{teamInfo.name}</Badge>
              </div>
            )}
          </div>
        </header>

        {pendingCount > 0 && (
          <Link href="/dashboard/player" className="block hover:scale-[1.02] transition-transform">
            <div className="bg-orange-500 text-white p-5 rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl animate-pulse">
                  <BellRing className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-lg uppercase tracking-tight">Tienes {pendingCount} Convocatorias</p>
                  <p className="text-sm opacity-90 font-medium">Confirma tu asistencia antes de que cierre la planilla.</p>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Próximo Compromiso</h2>
            <Badge variant="outline" className="text-[9px] font-black uppercase opacity-50">Calendario Oficial</Badge>
          </div>
          {nextEvent ? (
            <Card className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/10 p-4 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                    {nextEvent.type === 'match' ? <Trophy className="h-8 w-8" /> : <CalendarIcon className="h-8 w-8" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-primary uppercase tracking-widest leading-none">
                      {nextEvent.type === 'match' ? 'PARTIDO OFICIAL' : 'ENTRENAMIENTO'}
                    </p>
                    <h3 className="font-black text-xl leading-tight">{nextEvent.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                      <span className="text-xs flex items-center gap-1.5 font-bold"><Clock className="h-3.5 w-3.5" /> {new Date(nextEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</span>
                      <span className="text-xs flex items-center gap-1.5 font-bold"><MapPin className="h-3.5 w-3.5" /> {nextEvent.location}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 bg-transparent py-10 flex flex-col items-center justify-center opacity-40">
              <CalendarIcon className="h-8 w-8 mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Sin eventos programados</p>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Menú del Deportista</h2>
          <div className="grid grid-cols-2 gap-4">
            {playerNav.slice(1).map((item, idx) => (
              <Link key={idx} href={item.href}>
                <Card className="h-full border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-95 group">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground")}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="relative">
                      <h3 className="font-black text-base group-hover:text-primary transition-colors leading-none mb-1">{item.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Acceder ahora</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <footer className="text-center pt-10 opacity-30 flex flex-col items-center gap-2">
          <div className="h-px w-20 bg-muted-foreground mb-4" />
          <Trophy className="h-8 w-8 text-muted-foreground" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Fluxion Sport Platform • 2026</p>
        </footer>
      </div>
    </div>
  );
}
