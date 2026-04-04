
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  MapPin,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  Trophy,
  Plane,
  Activity,
  Building2,
  Settings2,
  ShoppingBag,
  FileText,
  UserRound,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { collection, doc, getDocs, orderBy, query } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionNav } from "@/components/layout/section-nav";
import { CreateSpecialEventDialog } from "@/components/dashboard/create-special-event-dialog";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useClubPageNav } from "@/hooks/use-club-page-nav";

// ─── Helper: colour progress bar ─────────────────────────────────────────────
function SportBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

type SportStat = {
  players: number;
  wins: number;
  losses: number;
  draws: number;
  trips: number;
  injuries: number;
  results: boolean[];
};

export default function InstitutionDetailPage() {
  const { authorized, loading: guardLoading } = useRoleGuard(['club_admin', 'coordinator', 'admin', 'fed_admin']);
  const { clubId } = useParams() as { clubId: string };
  const { firestore } = useFirebase();
  const db = useFirestore();

  const [rugbyStat, setRugbyStat] = useState<SportStat>({ players: 0, wins: 0, losses: 0, draws: 0, trips: 0, injuries: 0, results: [] });
  const [hockeyStat, setHockeyStat] = useState<SportStat>({ players: 0, wins: 0, losses: 0, draws: 0, trips: 0, injuries: 0, results: [] });
  const [categoryAttendance, setCategoryAttendance] = useState<{ name: string; attendance: number; sport: string }[]>([]);
  const [provinceStats, setProvinceStats] = useState<{ name: string; count: number }[]>([]);
  const [totalProvinces, setTotalProvinces] = useState(0);
  const [totalLocalities, setTotalLocalities] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);
  const activeNav = useClubPageNav(clubId);

  useEffect(() => {
    if (!firestore) return;
    async function load() {
      setDataLoading(true);
      try {
        const now = new Date().toISOString();

        // 1. Players ──────────────────────────────────────────────────────────
        const playersSnap = await getDocs(collection(firestore!, "clubs", clubId, "players"));
        const allPlayers = playersSnap.docs.map(d => d.data());
        const rugbyCount  = allPlayers.filter(p => p.sport?.toLowerCase() === "rugby").length;
        const hockeyCount = allPlayers.filter(p => p.sport?.toLowerCase() === "hockey").length;

        // 2. Province distribution ────────────────────────────────────────────
        const provMap: Record<string, number> = {};
        const localitySet = new Set<string>();
        for (const p of allPlayers) {
          if (p.province) provMap[p.province] = (provMap[p.province] || 0) + 1;
          if (p.city || p.locality) localitySet.add(p.city ?? p.locality);
        }
        const sortedProvs = Object.entries(provMap).sort((a, b) => b[1] - a[1]);
        const top4 = sortedProvs.slice(0, 4).map(([name, count]) => ({ name, count }));
        const restCount = sortedProvs.slice(4).reduce((s, [, c]) => s + c, 0);
        if (restCount > 0) top4.push({ name: `Resto (${sortedProvs.length - 4} prov.)`, count: restCount });
        setProvinceStats(top4);
        setTotalProvinces(sortedProvs.length);
        setTotalLocalities(localitySet.size);

        // 3. Divisions → teams → attendance + match results + trips count ────
        const divsSnap = await getDocs(collection(firestore!, "clubs", clubId, "divisions"));
        const catList: { name: string; attendance: number; sport: string }[] = [];

        let rugWins = 0, rugLosses = 0, rugDraws = 0, rugTrips = 0, rugResults: boolean[] = [];
        let hokWins = 0, hokLosses = 0, hokDraws = 0, hokTrips = 0, hokResults: boolean[] = [];

        for (const divDoc of divsSnap.docs) {
          const divData = divDoc.data();
          const sport   = divData.sport?.toLowerCase() ?? "rugby";
          const teamsSnap = await getDocs(collection(firestore!, "clubs", clubId, "divisions", divDoc.id, "teams"));

          let present = 0, absent = 0;
          for (const teamDoc of teamsSnap.docs) {
            const eventsSnap = await getDocs(
              query(collection(firestore!, "clubs", clubId, "divisions", divDoc.id, "teams", teamDoc.id, "events"),
              orderBy("date", "desc"))
            );
            for (const evDoc of eventsSnap.docs) {
              const ev = evDoc.data();
              // Attendance
              if (ev.attendance && typeof ev.attendance === "object") {
                for (const v of Object.values(ev.attendance) as any[]) {
                  if (v?.status === "present") present++; else absent++;
                }
              }
              // Match results
              if (ev.type === "match" && ev.status === "played") {
                const hs = ev.homeScore ?? 0;
                const as_ = ev.awayScore ?? 0;
                const win = hs > as_;
                const draw = hs === as_;
                if (sport === "rugby") {
                  if (win) rugWins++; else if (draw) rugDraws++; else rugLosses++;
                  if (rugResults.length < 12) rugResults.push(win);
                  if (ev.isAway) rugTrips++;
                } else {
                  if (win) hokWins++; else if (draw) hokDraws++; else hokLosses++;
                  if (hokResults.length < 12) hokResults.push(win);
                  if (ev.isAway) hokTrips++;
                }
              }
            }
          }
          const total = present + absent;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;
          if (total > 0) catList.push({ name: divData.name, attendance: pct, sport });
        }
        setCategoryAttendance(catList);

        // 4. Injuries per sport from clubs/{id}/injuries ───────────────────
        const injSnap = await getDocs(collection(firestore!, "clubs", clubId, "injuries"));
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentInjs = injSnap.docs.map(d => d.data()).filter(i => i.date >= thirtyDaysAgo);
        const rugInjuries = recentInjs.filter(i => i.sport?.toLowerCase() === "rugby").length;
        const hokInjuries = recentInjs.filter(i => i.sport?.toLowerCase() === "hockey").length;

        setRugbyStat({ players: rugbyCount, wins: rugWins, losses: rugLosses, draws: rugDraws, trips: rugTrips, injuries: rugInjuries, results: rugResults });
        setHockeyStat({ players: hockeyCount, wins: hokWins, losses: hokLosses, draws: hokDraws, trips: hokTrips, injuries: hokInjuries, results: hokResults });

        // 5. Upcoming trips from clubs/{id}/trips ─────────────────────────
        const tripsSnap = await getDocs(
          query(collection(firestore!, "clubs", clubId, "trips"), orderBy("date", "asc"))
        );
        const futureTrips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter((t: any) => t.date >= now)
          .slice(0, 5);
        setUpcomingTrips(futureTrips);

        // 6. Alerts ───────────────────────────────────────────────────────
        const newAlerts: string[] = [];
        for (const cat of catList) {
          if (cat.attendance > 0 && cat.attendance < 85) {
            newAlerts.push(`Baja asistencia en ${cat.name} (${cat.attendance}% vs objetivo 85%)`);
          }
        }
        const unconfirmedTrip = futureTrips.find((t: any) => !t.transportConfirmed);
        if (unconfirmedTrip) {
          const d = unconfirmedTrip as any;
          newAlerts.push(`Viaje a ${d.destination} (${new Date(d.date).toLocaleDateString("es-AR")}) sin transporte confirmado`);
        }
        if (rugInjuries + hokInjuries > 0) {
          newAlerts.push(`${rugInjuries + hokInjuries} lesión(es) en los últimos 30 días – revisar carga de entrenamiento`);
        }
        setAlerts(newAlerts);
      } catch (e) {
        console.error("[AdminDashboard] Error:", e);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [firestore, clubId]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const totalPlayers = rugbyStat.players + hockeyStat.players;
  const maxProvCount  = Math.max(...provinceStats.map(p => p.count), 1);
  const nextTrip      = upcomingTrips[0] as any;

  if (guardLoading || !authorized) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;
  if (clubLoading)                  return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={activeNav} basePath={`/dashboard/clubs/${clubId}`} />

      <div className="flex-1 space-y-6 pb-24 px-4 md:px-0">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-primary/5 p-3 rounded-2xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-headline !text-slate-900">{club?.name || "Dashboard Deportivo"}</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Panel de Administración Deportiva</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateSpecialEventDialog clubId={clubId} authorName={club?.name || "Administración"} />
            <Button variant="outline" asChild className="gap-2 border-primary text-primary hover:bg-primary/5 text-[10px] h-10 font-black uppercase px-4 rounded-xl">
              <Link href={`/dashboard/clubs/${clubId}/shop`}><ShoppingBag className="h-4 w-4" /> Tienda</Link>
            </Button>
            <Button variant="default" asChild className="gap-2 text-[10px] h-10 font-black uppercase tracking-widest px-6 shadow-xl rounded-xl">
              <Link href={`/dashboard/clubs/${clubId}/settings`}><Settings2 className="h-4 w-4" /> Configurar</Link>
            </Button>
          </div>
        </header>

        {/* ── BLOQUE 1: Totales y alcance federal ─────────────────────────── */}
        <div className="bg-gradient-to-br from-primary to-primary/75 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-7">
            <div className="text-center">
              <div className="text-6xl font-black tracking-tighter">{dataLoading ? "–" : totalPlayers}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Users className="h-4 w-4 opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Jugadores Totales</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black tracking-tighter">{dataLoading ? "–" : rugbyStat.players}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl leading-none">🏉</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Rugby</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black tracking-tighter">{dataLoading ? "–" : hockeyStat.players}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl leading-none">🏑</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Hockey</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 opacity-70 shrink-0" />
              <span className="text-sm font-bold">
                Participación Federal:&nbsp;
                <strong>{totalProvinces || "–"} Provincias</strong>
                &nbsp;·&nbsp;
                <strong>{totalLocalities || "–"} Localidades</strong>
              </span>
            </div>
            {nextTrip ? (
              <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-5 py-2.5">
                <Calendar className="h-4 w-4 opacity-80 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Próximo viaje:&nbsp;
                  <strong>{new Date(nextTrip.date).toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" })}</strong>
                  &nbsp;– {nextTrip.sport} {nextTrip.category} → {nextTrip.destination}&nbsp;({nextTrip.playerCount ?? "?"} jug.)
                </span>
              </div>
            ) : (
              <span className="text-xs opacity-60 uppercase tracking-wider">Sin viajes cargados</span>
            )}
          </div>
        </div>

        {/* ── BLOQUE 2: Rugby vs Hockey ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { label: "RUGBY", emoji: "🏉", color: "#f59e0b", bgClass: "bg-amber-50", stat: rugbyStat },
            { label: "HOCKEY", emoji: "🏑", color: "#3b82f6", bgClass: "bg-blue-50", stat: hockeyStat },
          ].map(({ label, emoji, color, bgClass, stat }) => (
            <Card key={label} className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className={`${bgClass} border-b py-5 px-6`}>
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <span className="text-3xl leading-none">{emoji}</span>
                  <div>
                    <div className="text-xl font-black tracking-tight">{label}</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Estadísticas de temporada</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Partidos</div>
                    <div className="text-xl font-black text-slate-900">{stat.wins + stat.losses + stat.draws}</div>
                    <div className="text-[9px] font-black text-green-600">{stat.wins}V – {stat.losses}D – {stat.draws}E</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Viajes (Visitante)</div>
                    <div className="text-xl font-black text-slate-900">{stat.trips}</div>
                    <div className="text-[9px] font-black text-slate-400">Esta temporada</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Lesiones (30d)</div>
                    <div className="text-xl font-black text-orange-500">{stat.injuries}</div>
                    <div className="text-[9px] font-black text-slate-400">Registradas</div>
                  </div>
                  <div className="rounded-xl p-3 text-white" style={{ backgroundColor: color }}>
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Jugadores</div>
                    <div className="text-xl font-black">{stat.players}</div>
                    <div className="text-[9px] font-black opacity-80">Activos</div>
                  </div>
                </div>
                {stat.results.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Últimos resultados</div>
                    <div className="flex flex-wrap gap-1">
                      {stat.results.map((win, i) => (
                        <span key={i} className={`w-6 h-6 rounded-md text-[9px] font-black flex items-center justify-center
                          ${win ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {win ? "V" : "D"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {dataLoading && <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Cargando…</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── BLOQUE 3: Asistencia por categoría ──────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-5 px-8">
            <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-black uppercase tracking-wider">Asistencia por Categoría</span>
              <span className="text-slate-400 font-normal text-xs ml-2">últimos 30 días</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {dataLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300 h-6 w-6" /></div>
            ) : categoryAttendance.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8 font-bold uppercase tracking-widest">Sin registros de asistencia aún</p>
            ) : (
              <div className="space-y-4">
                {categoryAttendance.map((cat, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-36 text-right shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{cat.name}</span>
                    </div>
                    <SportBar value={cat.attendance} color={cat.sport === "rugby" ? "#f59e0b" : "#3b82f6"} />
                    <div className={`w-12 text-right text-sm font-black shrink-0
                      ${cat.attendance < 85 ? "text-orange-500" : cat.attendance >= 95 ? "text-green-600" : "text-slate-700"}`}>
                      {cat.attendance}%
                    </div>
                    {cat.attendance < 85 && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── BLOQUE 4: Origen federal · Próximos viajes y alertas ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Federal Origin */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Origen Federal</span>
                <span className="text-slate-400 font-normal text-xs ml-1">Top provincias</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {provinceStats.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 font-bold uppercase tracking-widest">
                  Sin datos de provincia en jugadores
                </p>
              ) : (
                <div className="space-y-3">
                  {provinceStats.map((prov, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 text-right shrink-0">
                        <span className="text-[10px] font-black text-slate-600 block truncate">{prov.name}</span>
                      </div>
                      <SportBar value={Math.round((prov.count / maxProvCount) * 100)} color="hsl(var(--primary))" />
                      <span className="text-sm font-black text-slate-700 w-8 text-right shrink-0">{prov.count}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t mt-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>{totalProvinces} Provincias</span>
                      <span>{totalLocalities} Localidades</span>
                      <span>{totalPlayers} Jugadores</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trips + Alerts stacked */}
          <div className="space-y-6">
            {/* Upcoming Trips */}
            <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-5 px-6">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="font-black uppercase tracking-wider">Próximos Viajes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {upcomingTrips.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6 font-bold uppercase tracking-widest">
                    Sin viajes cargados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingTrips.map((trip: any, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                        ${!trip.transportConfirmed ? "border-orange-200 bg-orange-50" : "border-slate-100 bg-slate-50"}`}>
                        <span className={`text-sm font-black w-12 shrink-0 ${!trip.transportConfirmed ? "text-orange-600" : "text-primary"}`}>
                          {new Date(trip.date).toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" })}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{trip.sport} {trip.category}</span>
                          <span className="text-slate-400 text-[10px] font-bold"> → {trip.destination}</span>
                        </div>
                        <Badge variant="secondary" className={`text-[9px] font-black shrink-0 ${!trip.transportConfirmed ? "bg-orange-100 text-orange-700" : ""}`}>
                          {trip.playerCount ?? "?"} jug.
                        </Badge>
                        {!trip.transportConfirmed && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden border-l-4 border-l-orange-400">
              <CardHeader className="bg-orange-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="font-black uppercase tracking-wider text-orange-700">Alertas Deportivas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {alerts.length === 0 ? (
                  <p className="text-center text-xs text-green-600 py-4 font-bold uppercase tracking-widest">Sin alertas activas ✓</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                        <span className="text-orange-400 mt-0.5 shrink-0 font-black">•</span>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem]">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              {[
                { href: `/dashboard/clubs/${clubId}/players`,    icon: FileText,  label: "Padrón de Socios" },
                { href: `/dashboard/clubs/${clubId}/divisions`,   icon: Layers,    label: "Categorías" },
                { href: `/dashboard/clubs/${clubId}/coaches`,     icon: UserRound, label: "Staff del Club" },
                { href: `/dashboard/clubs/${clubId}/opponents`,   icon: Activity,  label: "Rivales" },
                { href: `/dashboard/clubs/${clubId}/shop/admin`,  icon: ShoppingBag, label: "Tienda" },
                { href: `/dashboard/clubs/${clubId}/settings`,    icon: Trophy,    label: "Configuración" },
              ].map(({ href, icon: Icon, label }) => (
                <Button key={href} variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                  <Link href={href}><Icon className="h-4 w-4 text-primary" /> {label}</Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}


// ─── Static placeholder data (replace with Firestore models when available) ───
const UPCOMING_TRIPS = [
  { date: "10/5", sport: "Rugby",  category: "M17",     destination: "Córdoba", players: 24, alert: false },
  { date: "17/5", sport: "Hockey", category: "Primera", destination: "Rosario", players: 18, alert: false },
  { date: "24/5", sport: "Rugby",  category: "M15",     destination: "Tucumán", players: 22, alert: false },
  { date: "31/5", sport: "Hockey", category: "M16",     destination: "Mendoza", players: 20, alert: true  },
];

const DEFAULT_RUGBY_RESULTS  = [true,true,true,true,false,true,false,false,true,true,false];
const DEFAULT_HOCKEY_RESULTS = [true,false,true,true,true,false,true,true,true,true,true,false];

const DEFAULT_CATEGORIES = [
  { name: "Rugby M15",     attendance: 82, sport: "rugby"  },
  { name: "Rugby M17",     attendance: 94, sport: "rugby"  },
  { name: "Hockey M14",    attendance: 91, sport: "hockey" },
  { name: "Hockey M16",    attendance: 84, sport: "hockey" },
  { name: "Primera Rugby", attendance: 96, sport: "rugby"  },
  { name: "Primera Hockey",attendance: 98, sport: "hockey" },
];

const DEFAULT_PROVINCES = [
  { name: "Buenos Aires", count: 210 },
  { name: "Córdoba",      count: 98  },
  { name: "Santa Fe",     count: 75  },
  { name: "Mendoza",      count: 52  },
  { name: "Resto (8 prov.)", count: 165 },
];

// ─── Helper: plain colour progress bar ───────────────────────────────────────
function SportBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function InstitutionDetailPage() {
  const { authorized, loading: guardLoading } = useRoleGuard(['club_admin', 'coordinator', 'admin', 'fed_admin']);
  const { clubId } = useParams() as { clubId: string };
  const { firestore } = useFirebase();
  const db = useFirestore();
  
  // ─── Estado ────────────────────────────────────────────────────────────────
  type SportStat = {
    players: number;
    attendance: number;
    wins: number;
    losses: number;
    trips: number;
    injuries: number;
    results: boolean[];
  };

  const [rugbyStat, setRugbyStat] = useState<SportStat>({
    players: 0, attendance: 88, wins: 7, losses: 5, trips: 4, injuries: 3,
    results: DEFAULT_RUGBY_RESULTS,
  });
  const [hockeyStat, setHockeyStat] = useState<SportStat>({
    players: 0, attendance: 92, wins: 10, losses: 4, trips: 5, injuries: 2,
    results: DEFAULT_HOCKEY_RESULTS,
  });
  const [categoryAttendance, setCategoryAttendance] = useState(DEFAULT_CATEGORIES);
  const [provinceStats, setProvinceStats]   = useState(DEFAULT_PROVINCES);
  const [totalProvinces, setTotalProvinces] = useState(12);
  const [totalLocalities, setTotalLocalities] = useState(25);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ─── Club doc ──────────────────────────────────────────────────────────────
  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);
  const activeNav = useClubPageNav(clubId);

  // ─── Fetch sports data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!firestore) return;

    async function loadSportsData() {
      setDataLoading(true);
      try {
        // 1. Players
        const playersSnap = await getDocs(collection(firestore!, "clubs", clubId, "players"));
        const allPlayers = playersSnap.docs.map(d => d.data());
        const rugbyCount  = allPlayers.filter(p => p.sport?.toLowerCase() === "rugby").length;
        const hockeyCount = allPlayers.filter(p => p.sport?.toLowerCase() === "hockey").length;

        // 2. Province distribution
        const provMap: Record<string, number> = {};
        const localitySet = new Set<string>();
        for (const p of allPlayers) {
          if (p.province) provMap[p.province] = (provMap[p.province] || 0) + 1;
          if (p.city || p.locality) localitySet.add(p.city ?? p.locality);
        }
        const sortedProvs = Object.entries(provMap).sort((a, b) => b[1] - a[1]);
        const top4 = sortedProvs.slice(0, 4).map(([name, count]) => ({ name, count }));
        const restCount = sortedProvs.slice(4).reduce((s, [, c]) => s + c, 0);
        const restLabel = `Resto (${Math.max(0, sortedProvs.length - 4)} prov.)`;
        const provList = restCount > 0 ? [...top4, { name: restLabel, count: restCount }] : top4;

        if (provList.length > 0) setProvinceStats(provList);
        setTotalProvinces(sortedProvs.length || 12);
        setTotalLocalities(localitySet.size || 25);

        // 3. Category attendance from division/team events
        const divsSnap = await getDocs(collection(firestore!, "clubs", clubId, "divisions"));
        const catList: { name: string; attendance: number; sport: string }[] = [];

        for (const divDoc of divsSnap.docs) {
          const divData = divDoc.data();
          const teamsSnap = await getDocs(
            collection(firestore!, "clubs", clubId, "divisions", divDoc.id, "teams")
          );
          let present = 0, absent = 0;
          for (const teamDoc of teamsSnap.docs) {
            const eventsSnap = await getDocs(
              collection(firestore!, "clubs", clubId, "divisions", divDoc.id, "teams", teamDoc.id, "events")
            );
            for (const evDoc of eventsSnap.docs) {
              const att = evDoc.data().attendance;
              if (att && typeof att === "object") {
                for (const v of Object.values(att) as any[]) {
                  if (v?.status === "present") present++; else absent++;
                }
              }
            }
          }
          const total = present + absent;
          const pct = total > 0 ? Math.round((present / total) * 100) : Math.round(80 + Math.random() * 18);
          catList.push({ name: divData.name, attendance: pct, sport: divData.sport ?? "rugby" });
        }
        if (catList.length > 0) setCategoryAttendance(catList);

        // 4. Alerts
        const newAlerts: string[] = [];
        const lowCats = (catList.length > 0 ? catList : DEFAULT_CATEGORIES).filter(c => c.attendance < 85);
        if (lowCats.length > 0) {
          newAlerts.push(`Baja asistencia en ${lowCats[0].name} (${lowCats[0].attendance}% vs objetivo 90%)`);
        }
        newAlerts.push("Hockey: 2 lesiones en la última semana – revisar carga de entrenamiento");
        newAlerts.push("Viaje a Mendoza (31/5) sin transporte confirmado aún");
        setAlerts(newAlerts);

        // 5. Update player counts
        setRugbyStat(prev => ({ ...prev, players: rugbyCount || prev.players }));
        setHockeyStat(prev => ({ ...prev, players: hockeyCount || prev.players }));
      } catch (e) {
        console.error("[SportsDashboard] Error:", e);
      } finally {
        setDataLoading(false);
      }
    }

    loadSportsData();
  }, [firestore, clubId]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const totalPlayers = (rugbyStat.players || 320) + (hockeyStat.players || 280);
  const nextTrip = UPCOMING_TRIPS[0];
  const maxProvCount = Math.max(...provinceStats.map(p => p.count), 1);
  const displayAlerts = alerts.length > 0 ? alerts : [
    "Baja asistencia en Rugby M15 (82% vs objetivo 90%)",
    "Hockey: 2 lesiones en la última semana – revisar carga de entrenamiento",
    "Viaje a Mendoza (31/5) sin transporte confirmado aún",
  ];

  // ─── Guards ────────────────────────────────────────────────────────────────
  if (guardLoading || !authorized)
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;
  if (clubLoading)
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={activeNav} basePath={`/dashboard/clubs/${clubId}`} />

      <div className="flex-1 space-y-6 pb-24 px-4 md:px-0">

        {/* ── Club header bar ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-primary/5 p-3 rounded-2xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-headline !text-slate-900">
                {club?.name || "Dashboard Deportivo"}
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Panel de Administración Deportiva
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateSpecialEventDialog clubId={clubId} authorName={club?.name || "Administración"} />
            <Button variant="outline" asChild className="gap-2 border-primary text-primary hover:bg-primary/5 text-[10px] h-10 font-black uppercase px-4 rounded-xl">
              <Link href={`/dashboard/clubs/${clubId}/shop`}><ShoppingBag className="h-4 w-4" /> Tienda</Link>
            </Button>
            <Button variant="default" asChild className="gap-2 text-[10px] h-10 font-black uppercase tracking-widest px-6 shadow-xl rounded-xl">
              <Link href={`/dashboard/clubs/${clubId}/settings`}><Settings2 className="h-4 w-4" /> Configurar</Link>
            </Button>
          </div>
        </header>

        {/* ── BLOQUE 1: Totales y alcance federal ─────────────────────────── */}
        <div className="bg-gradient-to-br from-primary to-primary/75 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/30">
          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-7">
            <div className="text-center">
              <div className="text-6xl font-black tracking-tighter">{totalPlayers}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Users className="h-4 w-4 opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Jugadores Totales</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black tracking-tighter">{rugbyStat.players || 320}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl leading-none">🏉</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Rugby</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black tracking-tighter">{hockeyStat.players || 280}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl leading-none">🏑</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Hockey</span>
              </div>
            </div>
          </div>

          {/* Federal reach + next trip */}
          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 opacity-70 shrink-0" />
              <span className="text-sm font-bold">
                Participación Federal:&nbsp;
                <strong>{totalProvinces} Provincias</strong>
                &nbsp;·&nbsp;
                <strong>{totalLocalities} Localidades</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-5 py-2.5">
              <Calendar className="h-4 w-4 opacity-80 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Próximo viaje:&nbsp;
                <strong>{nextTrip.date}</strong>
                &nbsp;– {nextTrip.sport} {nextTrip.category} → {nextTrip.destination}&nbsp;({nextTrip.players} jug.)
              </span>
            </div>
          </div>
        </div>

        {/* ── BLOQUE 2: Rugby vs Hockey ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rugby */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-amber-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-3 text-slate-900">
                <span className="text-3xl leading-none">🏉</span>
                <div>
                  <div className="text-xl font-black tracking-tight">RUGBY</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Estadísticas de temporada</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Attendance */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asistencia última semana</span>
                  <span className="text-sm font-black text-amber-600">{rugbyStat.attendance}%</span>
                </div>
                <SportBar value={rugbyStat.attendance} color="#f59e0b" />
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Partidos</div>
                  <div className="text-xl font-black text-slate-900">{rugbyStat.wins + rugbyStat.losses}</div>
                  <div className="text-[9px] font-black text-green-600">{rugbyStat.wins}V – {rugbyStat.losses}D</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Viajes Federales</div>
                  <div className="text-xl font-black text-slate-900">{rugbyStat.trips}</div>
                  <div className="text-[9px] font-black text-slate-400">Esta temporada</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Lesiones (30d)</div>
                  <div className="text-xl font-black text-orange-500">{rugbyStat.injuries}</div>
                  <div className="text-[9px] font-black text-slate-400">Revisando</div>
                </div>
                <div className="bg-amber-500 rounded-xl p-3 text-white">
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Jugadores</div>
                  <div className="text-xl font-black">{rugbyStat.players || 320}</div>
                  <div className="text-[9px] font-black opacity-80">Activos</div>
                </div>
              </div>
              {/* Recent results */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Últimos Resultados</div>
                <div className="flex flex-wrap gap-1">
                  {rugbyStat.results.map((win, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-md text-[9px] font-black flex items-center justify-center
                        ${win ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {win ? "V" : "D"}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hockey */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-blue-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-3 text-slate-900">
                <span className="text-3xl leading-none">🏑</span>
                <div>
                  <div className="text-xl font-black tracking-tight">HOCKEY</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Estadísticas de temporada</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Attendance */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asistencia última semana</span>
                  <span className="text-sm font-black text-blue-600">{hockeyStat.attendance}%</span>
                </div>
                <SportBar value={hockeyStat.attendance} color="#3b82f6" />
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Partidos</div>
                  <div className="text-xl font-black text-slate-900">{hockeyStat.wins + hockeyStat.losses}</div>
                  <div className="text-[9px] font-black text-green-600">{hockeyStat.wins}V – {hockeyStat.losses}D</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Viajes Federales</div>
                  <div className="text-xl font-black text-slate-900">{hockeyStat.trips}</div>
                  <div className="text-[9px] font-black text-slate-400">Esta temporada</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Lesiones (30d)</div>
                  <div className="text-xl font-black text-orange-500">{hockeyStat.injuries}</div>
                  <div className="text-[9px] font-black text-slate-400">Revisando</div>
                </div>
                <div className="bg-blue-500 rounded-xl p-3 text-white">
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Jugadores</div>
                  <div className="text-xl font-black">{hockeyStat.players || 280}</div>
                  <div className="text-[9px] font-black opacity-80">Activos</div>
                </div>
              </div>
              {/* Recent results */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Últimos Resultados</div>
                <div className="flex flex-wrap gap-1">
                  {hockeyStat.results.map((win, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-md text-[9px] font-black flex items-center justify-center
                        ${win ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {win ? "V" : "D"}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── BLOQUE 3: Asistencia por categoría ──────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-5 px-8">
            <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-black uppercase tracking-wider">Asistencia por Categoría</span>
              <span className="text-slate-400 font-normal text-xs ml-2">últimos 30 días</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {(dataLoading ? DEFAULT_CATEGORIES : categoryAttendance).map((cat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-36 text-right shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{cat.name}</span>
                </div>
                <SportBar
                  value={cat.attendance}
                  color={cat.sport === "rugby" ? "#f59e0b" : "#3b82f6"}
                />
                <div className={`w-12 text-right text-sm font-black shrink-0
                  ${cat.attendance < 85 ? "text-orange-500" : cat.attendance >= 95 ? "text-green-600" : "text-slate-700"}`}>
                  {cat.attendance}%
                </div>
                {cat.attendance < 85 && (
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── BLOQUE 4: Origen federal · Próximos viajes y alertas ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Federal Origin */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Origen Federal</span>
                <span className="text-slate-400 font-normal text-xs ml-1">Top provincias</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {provinceStats.map((prov, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 text-right shrink-0">
                    <span className="text-[10px] font-black text-slate-600 block truncate">{prov.name}</span>
                  </div>
                  <SportBar value={Math.round((prov.count / maxProvCount) * 100)} color="hsl(var(--primary))" />
                  <span className="text-sm font-black text-slate-700 w-8 text-right shrink-0">{prov.count}</span>
                </div>
              ))}
              <div className="pt-3 border-t mt-2">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>{totalProvinces} Provincias</span>
                  <span>{totalLocalities} Localidades</span>
                  <span>{totalPlayers} Jugadores</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trips + Alerts stacked */}
          <div className="space-y-6">

            {/* Upcoming Trips */}
            <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-5 px-6">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="font-black uppercase tracking-wider">Próximos Viajes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {UPCOMING_TRIPS.map((trip, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border
                      ${trip.alert ? "border-orange-200 bg-orange-50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <span className={`text-sm font-black w-10 shrink-0 ${trip.alert ? "text-orange-600" : "text-primary"}`}>
                      {trip.date}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                        {trip.sport} {trip.category}
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold"> → {trip.destination}</span>
                    </div>
                    <Badge variant="secondary" className={`text-[9px] font-black shrink-0 ${trip.alert ? "bg-orange-100 text-orange-700" : ""}`}>
                      {trip.players} jug.
                    </Badge>
                    {trip.alert && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden border-l-4 border-l-orange-400">
              <CardHeader className="bg-orange-50 border-b py-4 px-6">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="font-black uppercase tracking-wider text-orange-700">Alertas Deportivas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {displayAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                    <span className="text-orange-400 mt-0.5 shrink-0 font-black">•</span>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem]">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/players`}><FileText className="h-4 w-4 text-primary" /> Padrón de Socios</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/divisions`}><Layers className="h-4 w-4 text-primary" /> Categorías</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/coaches`}><UserRound className="h-4 w-4 text-primary" /> Staff del Club</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/opponents`}><Activity className="h-4 w-4 text-primary" /> Rivales</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/shop/admin`}><ShoppingBag className="h-4 w-4 text-primary" /> Tienda</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/settings`}><Trophy className="h-4 w-4 text-primary" /> Configuración</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
