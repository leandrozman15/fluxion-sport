
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
  Clock,
  MapPin,
  Building2,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BellRing
} from "lucide-react";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";
import { SpecialEventsFeed } from "@/components/dashboard/special-events-feed";
import { RecentResultsStrip } from "@/components/dashboard/recent-results-strip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function PlayerDashboardHub() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [myCallups, setMyCallups] = useState<any[]>([]);
  const [rsvpPending, setRsvpPending] = useState<{ callupId: string; status: 'confirmed' | 'unavailable' } | null>(null);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let pData = null;

        // BUSCAR POR UID (Vínculo soldado)
        const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
        if (playerByUid.exists()) {
          pData = playerByUid.data();
        } else {
          // BUSCAR POR EMAIL (Vínculo pendiente)
          const qEmail = query(collection(firestore, "all_players_index"), where("email", "==", email));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) pData = snapEmail.docs[0].data();
        }

        if (pData) {
          setPlayerInfo(pData);

          // CONVOCATORIAS PUBLICADAS PARA ESTE JUGADOR
          const playerId = user.uid;
          const callupsSnap = await getDocs(query(
            collection(firestore, "match_callups"),
            where("playerId", "==", playerId),
            where("published", "==", true)
          ));
          if (!callupsSnap.empty) {
            setMyCallups(callupsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
          }

          // CARGAR CONTEXTO DE EQUIPO Y CLUB
          if (pData.clubId) {
            // Próximo evento
            if (pData.teamId && pData.divisionId) {
              const eventsSnap = await getDocs(query(
                collection(firestore, "clubs", pData.clubId, "divisions", pData.divisionId, "teams", pData.teamId, "events"),
                where("date", ">=", new Date().toISOString()),
                orderBy("date", "asc"),
                limit(1)
              ));
              if (!eventsSnap.empty) setNextEvent(eventsSnap.docs[0].data());

              // Posición en tabla
              const standingsSnap = await getDocs(collection(firestore, "clubs", pData.clubId, "divisions", pData.divisionId, "standings"));
              const standings = standingsSnap.docs.map(doc => doc.data());
              const sorted = standings.sort((a: any, b: any) => b.points - a.points);
              const teamRank = sorted.findIndex((s: any) => s.teamName?.toLowerCase().includes(pData.teamName?.toLowerCase())) + 1;
              if (teamRank > 0) setRank(teamRank);
            }
          }
        }
      } catch (e) {
        console.error("Player Hub Sync Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const handleRSVP = async () => {
    if (!firestore || !rsvpPending) return;
    const { callupId, status: newStatus } = rsvpPending;
    await updateDoc(doc(firestore, "match_callups", callupId), { status: newStatus });
    setMyCallups(prev => prev.map(c => c.id === callupId ? { ...c, status: newStatus } : c));
    setRsvpPending(null);
  };

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Tablas/Fixture", href: "/dashboard/standings-fixture", icon: Trophy },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: playerInfo ? `/dashboard/clubs/${playerInfo.clubId}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  if (loading) return (
    <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12 opacity-20" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Identificando Legajo...</p>
    </div>
  );

  if (!playerInfo) return (
    <div className="flex flex-col md:flex-row gap-8 min-h-screen">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
        <div className="bg-white/10 p-8 rounded-full border border-white/20 backdrop-blur-md">
          <AlertCircle className="h-16 w-16 text-white opacity-40" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter font-headline">Ficha no Encontrada</h2>
          <p className="text-white/60 max-w-sm font-bold">Tu cuenta {user?.email} no tiene un legajo federativo vinculado. Contacta a la secretaría de tu club.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 max-w-3xl mx-auto space-y-8 pb-24 w-full px-4 md:px-0">
        <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-xl border border-white/50">
          <div className="relative">
            <Avatar className="h-16 w-16 md:h-24 md:w-24 border-4 border-primary/10 shadow-inner rounded-2xl">
              <AvatarImage src={playerInfo.photoUrl} className="object-cover" />
              <AvatarFallback className="text-2xl font-black bg-slate-50 text-slate-300">{playerInfo.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-card shadow-lg">#{playerInfo.jerseyNumber || "•"}</div>
          </div>
          <div className="flex-1 space-y-0.5">
            <h1 className="text-xl md:text-3xl font-black font-headline tracking-tight text-slate-900">{playerInfo.firstName} {playerInfo.lastName}</h1>
            <p className="text-slate-500 text-sm font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> {playerInfo.clubName}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2">{playerInfo.divisionName || 'Federada'}</Badge>
              {playerInfo.teamName && (
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2">{playerInfo.teamName}</Badge>
              )}
              {rank && (
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 border-yellow-500 text-yellow-600">Puesto #{rank}</Badge>
              )}
            </div>
          </div>
        </header>

        <LiveMatchesCard clubId={playerInfo.clubId} />
        <RecentResultsStrip 
          clubId={playerInfo.clubId}
          divisionId={playerInfo.divisionId}
          teamId={playerInfo.teamId}
          clubLogo={playerInfo.clubLogo}
          teamName={playerInfo.teamName}
        />
        <SpecialEventsFeed clubId={playerInfo.clubId} />

        {myCallups.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 px-1 drop-shadow-md flex items-center gap-2">
              <BellRing className="h-3.5 w-3.5" /> Mis Convocatorias
            </h2>
            <div className="space-y-3">
              {myCallups.map(callup => (
                <div key={callup.id} className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-xl overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-accent/10 p-3 rounded-2xl shrink-0">
                        <Trophy className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Convocatoria</p>
                        <p className="font-black text-base text-slate-900 leading-tight">{callup.playerName || 'Partido'}</p>
                        {callup.status === 'confirmed' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Confirmada
                          </span>
                        )}
                        {callup.status === 'unavailable' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 mt-0.5">
                            <XCircle className="h-3 w-3" /> No disponible
                          </span>
                        )}
                        {callup.status === 'pending' && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Pendiente de respuesta</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setRsvpPending({ callupId: callup.id, status: 'confirmed' })}
                        className={`h-11 px-5 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all ${
                          callup.status === 'confirmed'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-105'
                            : 'bg-green-50 text-green-700 hover:bg-green-500 hover:text-white border border-green-200'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Asistiré
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setRsvpPending({ callupId: callup.id, status: 'unavailable' })}
                        className={`h-11 px-5 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all ${
                          callup.status === 'unavailable'
                            ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-105'
                            : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200'
                        }`}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" /> No Asistiré
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <AlertDialog open={!!rsvpPending} onOpenChange={open => { if (!open) setRsvpPending(null); }}>
          <AlertDialogContent className="max-w-sm bg-white border-none shadow-2xl rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {rsvpPending?.status === 'confirmed' ? '¿Confirmás tu asistencia?' : '¿No podrás asistir?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-500">
                {rsvpPending?.status === 'confirmed'
                  ? 'Tu respuesta quedará registrada como Asistiré. Podés cambiarla si es necesario.'
                  : 'Tu respuesta quedará registrada como No Asistiré. El cuerpo técnico será notificado.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="font-bold text-slate-500 rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRSVP}
                className={`font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl ${
                  rsvpPending?.status === 'confirmed'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {rsvpPending?.status === 'confirmed' ? 'Sí, Asistiré' : 'Sí, No Asistiré'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sin eventos próximos en agenda</p>
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
