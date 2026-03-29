
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Loader2,
  Bell,
  UserCircle,
  ShieldCheck,
  CreditCard,
  Target,
  ShoppingBag,
  Table as TableIcon,
  ChevronRight,
  Star,
  BellRing
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, getDocs, limit, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
        // 1. Buscar al jugador en el índice global
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", user.email)));
        
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          setPlayerInfo(pData);
          
          // 2. Buscar su equipo actual
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

                // 3. Buscar próximo evento del equipo
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
        console.error("Error cargando dashboard de jugador:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [user, firestore, teamInfo]);

  // Consultar convocatorias pendientes para el badge
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  if (!playerInfo) return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <UserCircle className="h-20 w-20 text-muted-foreground opacity-20 mb-6" />
      <h2 className="text-2xl font-bold font-headline">Perfil no vinculado</h2>
      <p className="text-muted-foreground max-w-sm mx-auto mt-2">
        Tu correo <span className="font-semibold text-foreground">{user?.email}</span> no está asociado a ninguna ficha activa. Contacta con tu club para el alta.
      </p>
    </div>
  );

  const menuItems = [
    { 
      title: "Mi Carnet", 
      desc: "Identificación oficial", 
      icon: ShieldCheck, 
      href: "/dashboard/player/id-card",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    { 
      title: "Convocatorias", 
      desc: "Partidos confirmados", 
      icon: Bell, 
      href: "/dashboard/player", // El dashboard viejo tenía la lógica de tabs, ahora movemos convocatorias a una subvista si es necesario, por ahora dejamos el hub
      badge: pendingCount,
      color: "text-orange-600",
      bg: "bg-orange-50"
    },
    { 
      title: "Estadísticas", 
      desc: "Mi historial deportivo", 
      icon: Star, 
      href: "/dashboard/player/stats",
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    },
    { 
      title: "Posiciones", 
      desc: "Ranking del torneo", 
      icon: TableIcon, 
      href: "/dashboard/player/standings",
      color: "text-primary",
      bg: "bg-primary/10"
    },
    { 
      title: "Mis Pagos", 
      desc: "Cuotas y mensualidades", 
      icon: CreditCard, 
      href: "/dashboard/player/payments",
      color: "text-green-600",
      bg: "bg-green-50"
    },
    { 
      title: "Tienda Club", 
      desc: "Indumentaria oficial", 
      icon: ShoppingBag, 
      href: teamInfo ? `/dashboard/clubs/${teamInfo.clubId}/shop` : "#",
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header del Jugador */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="relative">
          <Avatar className="h-20 w-20 border-4 border-primary/10">
            <AvatarImage src={playerInfo.photoUrl} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold">{playerInfo.firstName[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            #{playerInfo.jerseyNumber || "•"}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black font-headline leading-tight">{playerInfo.firstName} {playerInfo.lastName}</h1>
          <p className="text-muted-foreground text-sm font-medium">{playerInfo.clubName || "Club Federado"}</p>
          {teamInfo && (
            <Badge variant="secondary" className="mt-2 text-[10px] font-black uppercase tracking-tighter">
              {teamInfo.name} • {teamInfo.divisionName}
            </Badge>
          )}
        </div>
      </header>

      {/* Alerta de Convocatorias Pendientes */}
      {pendingCount > 0 && (
        <Link href="/dashboard/player" className="block">
          <div className="bg-orange-500 text-white p-4 rounded-xl shadow-lg shadow-orange-200 flex items-center justify-between group animate-pulse">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-widest">Tienes {pendingCount} Convocatorias</p>
                <p className="text-xs opacity-90">Confirma tu asistencia ahora</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Próximo Evento / Agenda */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Próximo Compromiso</h2>
        {nextEvent ? (
          <Card className="border-l-4 border-l-primary overflow-hidden shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl text-primary">
                  {nextEvent.type === 'match' ? <Trophy className="h-6 w-6" /> : <CalendarIcon className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">
                    {nextEvent.type === 'match' ? 'PARTIDO OFICIAL' : 'ENTRENAMIENTO'}
                  </p>
                  <h3 className="font-black text-lg leading-tight">{nextEvent.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                    <span className="text-xs flex items-center gap-1 font-bold"><Clock className="h-3 w-3" /> {new Date(nextEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</span>
                    <span className="text-xs flex items-center gap-1 font-bold"><MapPin className="h-3 w-3" /> {nextEvent.location}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-30" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed py-6 flex flex-col items-center justify-center opacity-50">
            <p className="text-xs font-bold text-muted-foreground italic">Sin eventos programados esta semana</p>
          </Card>
        )}
      </section>

      {/* Menú de Funciones */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Menú del Deportista</h2>
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item, idx) => (
            <Link key={idx} href={item.href}>
              <Card className="h-full hover:border-primary/50 transition-all active:scale-95 cursor-pointer shadow-sm group">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", item.bg, item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="relative">
                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{item.desc}</p>
                    {item.badge !== undefined && item.badge > 0 && (
                      <div className="absolute -top-12 -right-1 bg-destructive text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        {item.badge}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Frase Motivacional o Info Extra */}
      <footer className="text-center pt-4 opacity-40">
        <Trophy className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">SportsManager Platform v2.0</p>
      </footer>
    </div>
  );
}
