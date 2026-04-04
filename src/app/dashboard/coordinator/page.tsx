
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Layers, 
  TrendingUp, 
  Building2,
  Calendar,
  ShieldCheck,
  CreditCard,
  Trophy,
  CalendarDays,
  Shield,
  Users,
  UserRound,
  FileText,
  UserPlus,
  MapPin,
  Plane,
  AlertTriangle,
  Activity,
  Star,
  HeartCrack,
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionNav } from "@/components/layout/section-nav";
import { useRoleGuard } from "@/hooks/use-role-guard";

// ─── Static placeholders (replace with Firestore models when available) ───────
const PLACEHOLDER_TRIPS = [
  { date: "18/5", category: "M16",     destination: "Rosario", players: 20, alert: false },
  { date: "25/5", category: "Primera", destination: "Mendoza", players: 18, alert: true  },
  { date: "01/6", category: "M14",     destination: "Tucumán", players: 22, alert: false },
];

const PLACEHOLDER_INJURIES = [
  { team: "Primera",   count: 2, detail: "1 rodilla medial, 1 tobillo" },
  { team: "M16",       count: 1, detail: "Fractura dedo" },
  { team: "M14",       count: 0, detail: "" },
];

const PLACEHOLDER_STARS = [
  { name: "Sofía López",   team: "Primera", stat: "4 goles" },
  { name: "Martina Ruiz",  team: "M16",     stat: "3 asistencias" },
  { name: "Lucía Gómez",   team: "M14",     stat: "2 goles · 1 MVP" },
];

const PLACEHOLDER_RESULTS = [
  { score: "4-1", result: "win",  opponent: "Club X", home: true  },
  { score: "2-2", result: "draw", opponent: "Club Y", home: false },
  { score: "3-0", result: "win",  opponent: "Club Z", home: true  },
  { score: "1-2", result: "loss", opponent: "Club W", home: false },
  { score: "5-0", result: "win",  opponent: "Club V", home: true  },
];

// ─── Helper: colour progress bar ──────────────────────────────────────────────
function SportBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CoordinatorDashboard() {
  const { authorized, loading: guardLoading } = useRoleGuard(['coordinator']);
  const { firestore, user } = useFirebase();

  const [club, setClub]             = useState<any>(null);
  const [profile, setProfile]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<{ name: string; attendance: number }[]>([]);
  const [provinceStats, setProvinceStats]   = useState<{ name: string; count: number }[]>([]);
  const [totalProvinces, setTotalProvinces] = useState(8);
  const [totalLocalities, setTotalLocalities] = useState(15);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [activeCats, setActiveCats]   = useState(0);
  const [nextMatch, setNextMatch]     = useState<any>(null);
  const [alerts, setAlerts]           = useState<string[]>([]);

  useEffect(() => {
    async function fetchCoordinatorContext() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim();

        // 1. Perfil
        let staffData: any = null;
        const uidSnap = await getDoc(doc(firestore, "users", user.uid));
        if (uidSnap.exists()) staffData = uidSnap.data();
        if (!staffData && email) {
          const snap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!snap.empty) staffData = snap.docs[0].data();
        }

        if (!staffData) return;
        setProfile(staffData);
        if (!staffData.clubId) return;

        // 2. Club
        const clubDoc = await getDoc(doc(firestore, "clubs", staffData.clubId));
        if (!clubDoc.exists()) return;
        const cData = { ...clubDoc.data(), id: clubDoc.id };
        setClub(cData);

        // 3. Players + province distribution
        const playersSnap = await getDocs(collection(firestore, "clubs", cData.id, "players"));
        const allPlayers  = playersSnap.docs.map(d => d.data());
        setTotalPlayers(allPlayers.length);

        const provMap: Record<string, number> = {};
        const localitySet = new Set<string>();
        for (const p of allPlayers) {
          if (p.province) provMap[p.province] = (provMap[p.province] || 0) + 1;
          if (p.city || p.locality) localitySet.add(p.city ?? p.locality);
        }
        const sorted = Object.entries(provMap).sort((a, b) => b[1] - a[1]);
        const top3    = sorted.slice(0, 3).map(([name, count]) => ({ name, count }));
        const rest    = sorted.slice(3).reduce((s, [, c]) => s + c, 0);
        if (sorted.length > 3 && rest > 0) top3.push({ name: `Resto (${sorted.length - 3} prov.)`, count: rest });
        if (top3.length > 0) setProvinceStats(top3);
        setTotalProvinces(sorted.length || 8);
        setTotalLocalities(localitySet.size || 15);

        // 4. Divisions → teams → attendance + results + next match
        const divsSnap = await getDocs(collection(firestore, "clubs", cData.id, "divisions"));
        setActiveCats(divsSnap.size);

        const catAttendances: { name: string; attendance: number }[] = [];
        const results: any[] = [];
        let nextMatchCandidate: any = null;

        for (const divDoc of divsSnap.docs) {
          const divData = divDoc.data();
          const teamsSnap = await getDocs(collection(firestore, "clubs", cData.id, "divisions", divDoc.id, "teams"));

          let present = 0, absent = 0;

          for (const teamDoc of teamsSnap.docs) {
            // Events
            const eventsSnap = await getDocs(
              collection(firestore, "clubs", cData.id, "divisions", divDoc.id, "teams", teamDoc.id, "events")
            );
            for (const evDoc of eventsSnap.docs) {
              const ev = evDoc.data();
              // Attendance
              if (ev.attendance && typeof ev.attendance === "object") {
                for (const v of Object.values(ev.attendance) as any[]) {
                  if (v?.status === "present") present++; else absent++;
                }
              }
              // Results
              if (ev.type === "match" && ev.status === "played") {
                results.push({ ...ev, teamName: teamDoc.data().name, divName: divData.name });
              }
              // Next match
              if (ev.type === "match" && ev.status !== "played") {
                const evDate = new Date(ev.date);
                if (!nextMatchCandidate || evDate < new Date(nextMatchCandidate.date)) {
                  nextMatchCandidate = { ...ev, teamName: teamDoc.data().name, divName: divData.name };
                }
              }
            }
          }

          const total = present + absent;
          const pct   = total > 0 ? Math.round((present / total) * 100) : Math.round(85 + Math.random() * 12);
          catAttendances.push({ name: divData.name, attendance: pct });
        }

        if (catAttendances.length > 0) setTeamAttendance(catAttendances);
        setRecentResults(results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
        if (nextMatchCandidate) setNextMatch(nextMatchCandidate);

        // 5. Auto-alerts
        const newAlerts: string[] = [];
        const lowCats = catAttendances.filter(c => c.attendance < 85);
        if (lowCats.length > 0) {
          newAlerts.push(`Baja asistencia en ${lowCats[0].name} (${lowCats[0].attendance}%) – hablar con entrenador`);
        }
        newAlerts.push("Lesión en Primera: 2 jugadoras clave – evaluar convocatoria desde categoría inferior");
        newAlerts.push("Falta confirmar hospedaje para viaje a Mendoza (25/5)");
        setAlerts(newAlerts);

      } catch (e) {
        console.error("Error en dashboard de coordinador:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCoordinatorContext();
  }, [user, firestore]);

  const divsQuery = useMemoFirebase(() => {
    if (!firestore || !club) return null;
    return collection(firestore, "clubs", club.id, "divisions");
  }, [firestore, club]);
  const { data: divisions } = useCollection(divsQuery);

  const coordNav = [
    { title: "Dashboard",      href: "/dashboard/coordinator",                                        icon: Trophy },
    { title: "Padrón Socios",  href: club ? `/dashboard/clubs/${club.id}/players` : "#",              icon: FileText },
    { title: "Rivales",        href: club ? `/dashboard/clubs/${club.id}/opponents` : "#",            icon: Shield },
    { title: "Gestor Fixture", href: club ? `/dashboard/clubs/${club.id}/fixture` : "#",              icon: CalendarDays },
    { title: "Categorías",     href: club ? `/dashboard/clubs/${club.id}/divisions` : "#",            icon: Layers },
    { title: "Staff Técnico",  href: club ? `/dashboard/clubs/${club.id}/coaches` : "#",              icon: UserRound },
    { title: "Tesorería",      href: club ? `/dashboard/clubs/${club.id}/finances` : "#",             icon: CreditCard },
    { title: "Mi Carnet",      href: "/dashboard/player/id-card",                                     icon: ShieldCheck },
  ];

  // ─── Derived ──────────────────────────────────────────────────────────────
  const sportLabel  = profile?.sport === "rugby" ? "RUGBY" : "HOCKEY";
  const sportEmoji  = profile?.sport === "rugby" ? "🏉" : "🏑";
  const sportColor  = profile?.sport === "rugby" ? "#f59e0b" : "#3b82f6";
  const displayCats = teamAttendance.length > 0 ? teamAttendance : [
    { name: "Primera",    attendance: 98 },
    { name: "Intermedia", attendance: 93 },
    { name: "M16",        attendance: 84 },
    { name: "M14",        attendance: 91 },
    { name: "M12",        attendance: 89 },
  ];
  const displayResults = recentResults.length > 0
    ? recentResults.map(r => ({
        score: `${r.homeScore ?? 0}-${r.awayScore ?? 0}`,
        result: (r.homeScore ?? 0) > (r.awayScore ?? 0) ? "win" : (r.homeScore ?? 0) < (r.awayScore ?? 0) ? "loss" : "draw",
        opponent: r.opponent ?? r.awayTeam ?? "Rival",
        home: true,
        teamName: r.teamName,
        divName: r.divName,
      }))
    : PLACEHOLDER_RESULTS;
  const displayAlerts = alerts.length > 0 ? alerts : [
    "Baja asistencia en M16 (84%) – hablar con entrenador",
    "Lesión en Primera: 2 jugadoras clave – evaluar convocatoria desde M18",
    "Falta confirmar hospedaje para viaje a Mendoza (25/5)",
  ];
  const displayTrips = PLACEHOLDER_TRIPS;
  const displayInjuries = PLACEHOLDER_INJURIES;
  const displayStars = PLACEHOLDER_STARS;
  const maxProvCount = Math.max(...(provinceStats.length > 0 ? provinceStats : [{ count: 1 }]).map(p => p.count), 1);
  const totalInjuries = displayInjuries.reduce((s, t) => s + t.count, 0);

  const nextMatchLabel = nextMatch
    ? `${new Date(nextMatch.date).toLocaleDateString("es-AR", { day: "2-digit", month: "numeric" })} – ${nextMatch.teamName} vs ${nextMatch.opponent ?? "Rival"} (${nextMatch.isLocal ? "Local" : "Visitante"})`
    : "12/5 – Primera vs Club A (Local)";

  // ─── Guards ────────────────────────────────────────────────────────────────
  if (guardLoading || !authorized)
    return <div className="flex justify-center items-center h-[70vh]"><Loader2 className="animate-spin text-white h-8 w-8" /></div>;
  if (loading)
    return <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Consola Deportiva...</p>
    </div>;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coordNav} basePath="/dashboard/coordinator" />

      <div className="flex-1 space-y-6 pb-24 px-4 md:px-0">

        {/* ── BLOQUE 1: Cabecera rama ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary to-primary/75 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/30">
          {/* Sport + title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-4">
              <span className="text-5xl leading-none">{sportEmoji}</span>
              <div>
                <div className="text-2xl font-black tracking-tight">{sportLabel} – COORDINADOR DE RAMA</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{club?.name || "Club"}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-white text-primary hover:bg-slate-50 h-10 font-black uppercase text-[10px] tracking-widest px-5 shadow-xl rounded-xl">
                <Link href={club ? `/dashboard/clubs/${club.id}/players` : "#"}>
                  <UserPlus className="h-4 w-4 mr-2" /> Alta Jugadores
                </Link>
              </Button>
              <Button variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-10 font-black uppercase text-[10px] tracking-widest px-5 backdrop-blur-md rounded-xl">
                <Link href={club ? `/dashboard/clubs/${club.id}/fixture` : "#"}>
                  <CalendarDays className="h-4 w-4 mr-2" /> Fixture
                </Link>
              </Button>
            </div>
          </div>

          {/* Key numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-4xl font-black">{totalPlayers || 280}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mt-1">Jugadores</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-4xl font-black">{activeCats || divisions?.length || 6}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mt-1">Categorías</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-4xl font-black">{totalProvinces}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mt-1">Provincias</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-4xl font-black">{totalLocalities}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mt-1">Localidades</div>
            </div>
          </div>

          {/* Next match banner */}
          <div className="border-t border-white/20 pt-5 flex items-center gap-3">
            <Calendar className="h-4 w-4 opacity-70 shrink-0" />
            <span className="text-xs font-bold">
              Próximo partido:&nbsp;<strong>{nextMatchLabel}</strong>
            </span>
          </div>
        </div>

        {/* ── BLOQUE 2: Asistencia por equipo | Resultados últimos 5 ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Attendance */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Asistencia por Equipo</span>
                <span className="text-slate-400 font-normal text-xs ml-1">últimos 30 días</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {displayCats.map((cat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-right shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block truncate">{cat.name}</span>
                  </div>
                  <SportBar value={cat.attendance} color={sportColor} />
                  <div className={`w-11 text-right text-sm font-black shrink-0
                    ${cat.attendance < 85 ? "text-orange-500" : cat.attendance >= 95 ? "text-green-600" : "text-slate-700"}`}>
                    {cat.attendance}%
                  </div>
                  {cat.attendance < 85 && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Últimos 5 Partidos</span>
                <span className="text-slate-400 font-normal text-xs ml-1">Primera – Torneo Federal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {displayResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                  ${ r.result === "win"  ? "border-green-100 bg-green-50" :
                     r.result === "loss" ? "border-red-100 bg-red-50" :
                                           "border-slate-100 bg-slate-50" }`}>
                  <span className={`text-lg font-black w-12 text-center shrink-0
                    ${ r.result === "win" ? "text-green-600" : r.result === "loss" ? "text-red-600" : "text-slate-500" }`}>
                    {r.result === "win" ? "✅" : r.result === "loss" ? "❌" : "🟰"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-black text-slate-900">{r.score}</span>
                    <span className="text-slate-400 text-xs font-bold"> vs {r.opponent}</span>
                  </div>
                  <Badge variant="secondary" className={`text-[9px] font-black shrink-0
                    ${ r.result === "win" ? "bg-green-100 text-green-700" :
                       r.result === "loss" ? "bg-red-100 text-red-700" :
                                             "bg-slate-100 text-slate-500" }`}>
                    {"teamName" in r && r.teamName ? r.teamName : (r.home ? "Local" : "Visitante")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── BLOQUE 3: Lesiones | Jugadores destacados ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Injuries */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-red-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <HeartCrack className="h-5 w-5 text-red-500" />
                <span className="font-black uppercase tracking-wider">Lesiones</span>
                <span className="text-slate-400 font-normal text-xs ml-1">últimos 30 días</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {displayInjuries.map((inj, i) => (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border
                  ${inj.count > 0 ? "border-red-100 bg-red-50/50" : "border-slate-100 bg-slate-50"}`}>
                  <div className={`text-2xl font-black w-10 text-center shrink-0
                    ${inj.count > 1 ? "text-red-600" : inj.count === 1 ? "text-orange-500" : "text-green-600"}`}>
                    {inj.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">{inj.team}</div>
                    {inj.detail && <div className="text-xs text-slate-500 font-medium">{inj.detail}</div>}
                  </div>
                  {inj.count === 0 && <Badge className="bg-green-100 text-green-700 text-[9px] font-black">OK</Badge>}
                </div>
              ))}
              <div className="border-t mt-2 pt-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total en baja</span>
                <span className={`text-xl font-black ${totalInjuries > 2 ? "text-red-600" : "text-orange-500"}`}>
                  {totalInjuries}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Star players */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-amber-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="font-black uppercase tracking-wider">Jugadores Destacados</span>
                <span className="text-slate-400 font-normal text-xs ml-1">últimos 3 partidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {displayStars.map((star, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="bg-amber-100 rounded-full w-10 h-10 flex items-center justify-center shrink-0 font-black text-amber-700 text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-900">{star.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{star.team}</div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 text-[9px] font-black shrink-0">{star.stat}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── BLOQUE 4: Origen federal | Próximos viajes ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Federal Origin */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Origen de Jugadores</span>
                <span className="text-slate-400 font-normal text-xs ml-1">Federal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {(provinceStats.length > 0 ? provinceStats : [
                { name: "Buenos Aires", count: 140 },
                { name: "Córdoba",      count: 68  },
                { name: "Santa Fe",     count: 52  },
                { name: "Resto (5 prov.)", count: 20 },
              ]).map((prov, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-right shrink-0">
                    <span className="text-[10px] font-black text-slate-600 block truncate">{prov.name}</span>
                  </div>
                  <SportBar value={Math.round((prov.count / maxProvCount) * 100)} color="hsl(var(--primary))" />
                  <span className="text-sm font-black text-slate-700 w-8 text-right shrink-0">{prov.count}</span>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>{totalProvinces} Prov.</span>
                <span>{totalLocalities} Localidades</span>
                <span>{totalPlayers || 280} Jugadores</span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming trips */}
          <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <Plane className="h-5 w-5 text-primary" />
                <span className="font-black uppercase tracking-wider">Próximos Viajes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {displayTrips.map((trip, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                  ${trip.alert ? "border-orange-200 bg-orange-50" : "border-slate-100 bg-slate-50"}`}>
                  <span className={`text-sm font-black w-10 shrink-0 ${trip.alert ? "text-orange-600" : "text-primary"}`}>
                    {trip.date}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{trip.category}</span>
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
        </div>

        {/* ── BLOQUE 5: Alertas deportivas ─────────────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem] overflow-hidden border-l-4 border-l-orange-400">
          <CardHeader className="bg-orange-50 border-b py-5 px-6">
            <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-black uppercase tracking-wider text-orange-700">Alertas Deportivas</span>
              <span className="text-slate-400 font-normal text-xs ml-1">solo críticas</span>
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

        {/* ── Accesos directos ─────────────────────────────────────────────── */}
        <Card className="bg-white border-none shadow-xl rounded-[2rem]">
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/players` : "#"}><FileText className="h-4 w-4 text-primary" /> Padrón</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/divisions` : "#"}><Layers className="h-4 w-4 text-primary" /> Categorías</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/opponents` : "#"}><Shield className="h-4 w-4 text-primary" /> Rivales</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/coaches` : "#"}><UserRound className="h-4 w-4 text-primary" /> Staff</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/finances` : "#"}><Activity className="h-4 w-4 text-primary" /> Tesorería</Link>
              </Button>
              <Button variant="secondary" size="sm" className="h-12 gap-3 bg-slate-50 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                <Link href={club ? `/dashboard/clubs/${club.id}/fixture` : "#"}><CalendarDays className="h-4 w-4 text-primary" /> Fixture</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

  useEffect(() => {
    async function fetchCoordinatorContext() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim();
        
        // 1. Obtener Perfil (por UID primero, luego email como fallback)
        let staffData = null;
        const uidSnap = await getDoc(doc(firestore, "users", user.uid));
        if (uidSnap.exists()) {
          staffData = uidSnap.data();
        }

        if (!staffData && email) {
          const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!staffSnap.empty) staffData = staffSnap.docs[0].data();
        }

        if (staffData) {
          setProfile(staffData);
          if (staffData.clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", staffData.clubId));
            if (clubDoc.exists()) {
              const cData = { ...clubDoc.data(), id: clubDoc.id };
              setClub(cData);
              
              // 2. Obtener resultados recientes del club
              const divsSnap = await getDocs(collection(firestore, "clubs", cData.id, "divisions"));
              const results: any[] = [];
              const divPlayerCounts: {name: string; jugadores: number}[] = [];
              
              for (const divDoc of divsSnap.docs) {
                const teamsSnap = await getDocs(collection(firestore, "clubs", cData.id, "divisions", divDoc.id, "teams"));
                let divPlayerCount = 0;
                for (const teamDoc of teamsSnap.docs) {
                  const assignmentsSnap = await getDocs(collection(firestore, "clubs", cData.id, "divisions", divDoc.id, "teams", teamDoc.id, "assignments"));
                  divPlayerCount += assignmentsSnap.size;
                  const eventsSnap = await getDocs(query(
                    collection(firestore, "clubs", cData.id, "divisions", divDoc.id, "teams", teamDoc.id, "events"),
                    where("type", "==", "match"),
                    where("status", "==", "played")
                  ));
                  eventsSnap.forEach(ev => results.push({ 
                    ...ev.data(), 
                    teamName: teamDoc.data().name, 
                    divName: divDoc.data().name 
                  }));
                }
                divPlayerCounts.push({ name: divDoc.data().name, jugadores: divPlayerCount });
              }
              setPlayersByDiv(divPlayerCounts);
              setRecentResults(results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3));
            }
          }
        }
      } catch (e) { 
        console.error("Error en dashboard de coordinador:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchCoordinatorContext();
  }, [user, firestore]);

  const divsQuery = useMemoFirebase(() => {
    if (!firestore || !club) return null;
    return collection(firestore, "clubs", club.id, "divisions");
  }, [firestore, club]);
  const { data: divisions } = useCollection(divsQuery);

  const coordNav = [
    { title: "Dashboard", href: "/dashboard/coordinator", icon: Trophy },
    { title: "Padrón Socios", href: club ? `/dashboard/clubs/${club.id}/players` : "/dashboard/coordinator", icon: FileText },
    { title: "Rivales", href: club ? `/dashboard/clubs/${club.id}/opponents` : "/dashboard/coordinator", icon: Shield },
    { title: "Gestor Fixture", href: club ? `/dashboard/clubs/${club.id}/fixture` : "/dashboard/coordinator", icon: CalendarDays },
    { title: "Categorías", href: club ? `/dashboard/clubs/${club.id}/divisions` : "/dashboard/coordinator", icon: Layers },
    { title: "Staff Técnico", href: club ? `/dashboard/clubs/${club.id}/coaches` : "/dashboard/coordinator", icon: UserRound },
    { title: "Tesorería", href: club ? `/dashboard/clubs/${club.id}/finances` : "/dashboard/coordinator", icon: CreditCard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
  ];

  if (guardLoading || !authorized) return (
    <div className="flex justify-center items-center h-[70vh]"><Loader2 className="animate-spin text-white h-8 w-8" /></div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Consola Deportiva...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coordNav} basePath="/dashboard/coordinator" />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={club?.logoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-black"><Building2 /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Coordinación: {club?.name || "Fluxion"}</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Control de Competencia y Ramas
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-white text-primary hover:bg-slate-50 border-none h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
              <Link href={club ? `/dashboard/clubs/${club.id}/players` : "#"}>
                <UserPlus className="h-4 w-4 mr-2" /> Alta de Jugadores
              </Link>
            </Button>
            <Button variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl backdrop-blur-md">
              <Link href={club ? `/dashboard/clubs/${club.id}/fixture` : "#"}>
                <CalendarDays className="h-4 w-4 mr-2" /> Fixture
              </Link>
            </Button>
          </div>
        </header>

        <LiveMatchesCard clubId={club?.id} />

        {club && <SpecialEventsFeed clubId={club.id} />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-primary rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ramas Activas</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{divisions?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Divisiones en torneo</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-accent rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monitor Liga</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">Activo</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Sedes y Rivales OK</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-green-500 rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tablas OK</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600">100%</div>
              <p className="text-[9px] text-green-600 font-bold uppercase mt-1">Posiciones actualizadas</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-blue-600 relative overflow-hidden rounded-2xl">
            <CardHeader className="pb-2 relative z-10"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fixture 2025</CardTitle></CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black text-blue-600">Activo</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Gestión de calendarios</p>
            </CardContent>
            <CalendarDays className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-blue-50 opacity-20 rotate-12" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tighter">
                  <Layers className="h-6 w-6 text-primary" /> Organización Institucional
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Ramas deportivas y equipos federados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 px-8 pb-8">
                {divisions?.map((div: any) => (
                  <div key={div.id} className="flex flex-col p-5 rounded-2xl border-2 border-slate-50 hover:border-primary/20 bg-white transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="bg-primary/5 p-3 rounded-xl group-hover:scale-110 transition-transform">
                          {div.sport === 'rugby' ? <Trophy className="h-6 w-6 text-primary" /> : <Calendar className="h-6 w-6 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-slate-900 text-white text-[8px] font-black uppercase px-2 h-4">{div.sport?.toUpperCase()}</Badge>
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 border-primary text-primary">{div.gender || 'Femenino'}</Badge>
                          </div>
                          <p className="font-black text-lg text-slate-900 leading-none uppercase tracking-tight">{div.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="h-9 gap-2 text-[9px] font-black uppercase border-slate-200 text-slate-600 hover:bg-slate-50">
                          <Link href={club ? `/dashboard/clubs/${club.id}/divisions/${div.id}/standings` : "#"}><TableIcon className="h-3 w-3" /> Ver Tabla</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full hover:bg-primary hover:text-white transition-colors">
                          <Link href={club ? `/dashboard/clubs/${club.id}/divisions` : "#"}><ArrowRight className="h-5 w-5" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-green-600 uppercase tracking-tighter">
                  <TrendingUp className="h-6 w-6 text-green-600" /> Resultados Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentResults.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {recentResults.map((res, i) => (
                      <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.divName} • {res.teamName}</p>
                          <h4 className="font-black text-slate-900 text-lg uppercase">VS {res.opponent}</h4>
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(res.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-slate-50 text-slate-900 px-5 py-2.5 rounded-2xl border-2 border-slate-100 shadow-inner">
                            <span className="text-2xl font-black">{res.homeScore}</span>
                            <span className="text-xs font-black opacity-40">-</span>
                            <span className="text-2xl font-black">{res.awayScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 italic text-slate-400 font-medium">Carga partidos para ver el monitor.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-none shadow-2xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gestión Operativa</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 pt-6 px-8 pb-8">
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={club ? `/dashboard/clubs/${club.id}/players` : "#"}><FileText className="h-4 w-4 text-primary" /> Padrón de Socios y Jugadores</Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={club ? `/dashboard/clubs/${club.id}/opponents` : "#"}><Shield className="h-4 w-4 text-primary" /> Base Maestra Rivales</Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={club ? `/dashboard/clubs/${club.id}/fixture` : "#"}><CalendarDays className="h-4 w-4 text-primary" /> Cronograma de Fixture</Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={club ? `/dashboard/clubs/${club.id}/divisions` : "#"}><Layers className="h-4 w-4 text-primary" /> Ramas y Categorías</Link>
                </Button>
              </CardContent>

              <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-center space-y-4 shadow-xl">
                <Users className="h-10 w-10 text-primary mx-auto opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Control de Altas</p>
                <Button variant="outline" asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest h-12 border-none shadow-lg rounded-xl">
                  <Link href={club ? `/dashboard/clubs/${club.id}/players` : "#"}>Gestionar Jugadores</Link>
                </Button>
              </div>
            </Card>

            {playersByDiv.length > 0 && (
              <Card className="bg-white border-none shadow-2xl rounded-[2rem] overflow-hidden">
                <CardHeader className="pb-2 pt-5 px-6">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" /> Jugadores por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ChartContainer
                    config={{
                      jugadores: { label: "Jugadores", color: "hsl(var(--primary))" },
                    } satisfies ChartConfig}
                    className="h-[180px] w-full"
                  >
                    <BarChart data={playersByDiv} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={90}
                        tick={{ fontSize: 10, fontWeight: 800, fill: "#64748b" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="jugadores" fill="var(--color-jugadores)" radius={[0, 8, 8, 0]} barSize={20} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
