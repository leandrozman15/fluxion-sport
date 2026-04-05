"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, Trash2, ChevronLeft, ChevronRight,
  Trophy, Shield, Pencil,
  Table as TableIcon, CalendarDays, Users, Calendar,
  Ban, Clock, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STANDING_INITIAL = {
  teamName: "", opponentId: "", teamId: "", isInternal: false,
  played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
};

function generateRoundRobin(
  participants: { id: string; name: string; logoUrl?: string }[],
  vueltas: 1 | 2
) {
  let teams: { id: string; name: string; logoUrl?: string }[] = [...participants];
  if (teams.length % 2 !== 0) teams.push({ id: "__bye__", name: "Libre" });
  const n = teams.length;
  const roundsPerVuelta = n - 1;
  const result: { round: number; home: typeof teams[0]; away: typeof teams[0] }[] = [];
  const rotation = [...teams.slice(1)];
  for (let r = 0; r < roundsPerVuelta; r++) {
    const current = [teams[0], ...rotation];
    for (let i = 0; i < n / 2; i++) {
      const home = current[i];
      const away = current[n - 1 - i];
      if (home.id !== "__bye__" && away.id !== "__bye__") {
        result.push({ round: r + 1, home, away });
      }
    }
    rotation.unshift(rotation.pop()!);
  }
  if (vueltas === 2) {
    const vuelta1 = result.slice();
    for (const m of vuelta1) {
      result.push({ round: m.round + roundsPerVuelta, home: m.away, away: m.home });
    }
  }
  return result;
}

export default function TournamentsPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [clubData, setClubData] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);

  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", divisionId: "", participants: [] as { id: string; divLabel: string }[], vueltas: 1 as 1 | 2 });
  const [createLoading, setCreateLoading] = useState(false);

  const [divisionTeams, setDivisionTeams] = useState<any[]>([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);

  const [matchEditDialog, setMatchEditDialog] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [matchEditForm, setMatchEditForm] = useState({ date: "", status: "scheduled", notes: "" });

  const [standingDialog, setStandingDialog] = useState(false);
  const [editingStanding, setEditingStanding] = useState<any>(null);
  const [standingForm, setStandingForm] = useState({ ...STANDING_INITIAL });

  useEffect(() => {
    async function init() {
      if (!db) return;
      try {
        const [clubDoc, divsSnap, oppsSnap, tournsSnap] = await Promise.all([
          getDoc(doc(db, "clubs", clubId)),
          getDocs(collection(db, "clubs", clubId, "divisions")),
          getDocs(collection(db, "clubs", clubId, "opponents")),
          getDocs(collection(db, "clubs", clubId, "tournaments")),
        ]);
        if (clubDoc.exists()) setClubData({ ...clubDoc.data(), id: clubDoc.id });
        setDivisions(
          divsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
        );
        setOpponents(
          oppsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
        );
        setTournaments(
          tournsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    init();
  }, [db, clubId]);



  useEffect(() => {
    if (!selectedTournament || !db || view !== "detail") return;
    setDetailLoading(true);
    async function loadDetail() {
      try {
        const divTeamsSnap = await getDocs(
          collection(db, "clubs", clubId, "divisions", selectedTournament.divisionId, "teams")
        );
        const divTeams = divTeamsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        setDivisionTeams(divTeams.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));

        const matchesSnap = await getDocs(
          collection(db, "clubs", clubId, "tournaments", selectedTournament.id, "matches")
        );
        setAllMatches(
          matchesSnap.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => (a.round - b.round) || (a.date || "").localeCompare(b.date || ""))
        );
        const stSnap = await getDocs(
          collection(db, "clubs", clubId, "tournaments", selectedTournament.id, "standings")
        );
        setStandings(
          stSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
      } catch (e) { console.error(e); }
      finally { setDetailLoading(false); }
    }
    loadDetail();
  }, [db, clubId, selectedTournament?.id, view]);

  const handleCreateTournament = async () => {
    if (!createForm.name.trim() || !createForm.divisionId || createForm.participants.length < 2) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Completá nombre, categoría y seleccioná al menos 2 equipos." });
      return;
    }
    setCreateLoading(true);
    try {
      const tid = doc(collection(db, "clubs", clubId, "tournaments")).id;
      const div = divisions.find(d => d.id === createForm.divisionId);
      const resolvedParticipants = createForm.participants.map(p => {
        const opp = opponents.find(o => o.id === p.id);
        return { id: p.id, divLabel: p.divLabel, name: opp?.name || p.id, logoUrl: opp?.logoUrl || "" };
      });
      const teamNames: Record<string, string> = {};
      resolvedParticipants.forEach(p => {
        teamNames[p.id] = p.name + (p.divLabel ? ` · Div. ${p.divLabel}` : "");
      });
      const n = resolvedParticipants.length;
      const roundsPerVuelta = n % 2 === 0 ? n - 1 : n;
      const matchesPerVuelta = Math.floor(n * (n - 1) / 2);
      const tournament = {
        id: tid,
        name: createForm.name.trim(),
        divisionId: createForm.divisionId,
        divisionName: div?.name || "",
        participants: resolvedParticipants,
        teamIds: resolvedParticipants.map(p => p.id),
        teamNames,
        vueltas: createForm.vueltas,
        totalRounds: roundsPerVuelta * createForm.vueltas,
        totalMatches: matchesPerVuelta * createForm.vueltas,
        createdAt: new Date().toISOString(),
        status: "active",
      };
      await setDoc(doc(db, "clubs", clubId, "tournaments", tid), tournament);
      await Promise.all(resolvedParticipants.map(async (p) => {
        const stId = doc(collection(db, "clubs", clubId, "tournaments", tid, "standings")).id;
        await setDoc(doc(db, "clubs", clubId, "tournaments", tid, "standings", stId), {
          id: stId,
          teamId: p.id,
          teamName: teamNames[p.id],
          teamLogo: p.logoUrl,
          divLabel: p.divLabel,
          isInternal: false,
          played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
          createdAt: new Date().toISOString(),
        });
      }));
      // Generate round-robin fixture
      const pairings = generateRoundRobin(resolvedParticipants, createForm.vueltas);
      await Promise.all(pairings.map(async (pairing) => {
        const matchId = doc(collection(db, "clubs", clubId, "tournaments", tid, "matches")).id;
        await setDoc(doc(db, "clubs", clubId, "tournaments", tid, "matches", matchId), {
          id: matchId,
          round: pairing.round,
          homeParticipantId: pairing.home.id,
          awayParticipantId: pairing.away.id,
          homeParticipantName: teamNames[pairing.home.id] || pairing.home.name,
          awayParticipantName: teamNames[pairing.away.id] || pairing.away.name,
          homeParticipantLogo: (pairing.home as any).logoUrl || "",
          awayParticipantLogo: (pairing.away as any).logoUrl || "",
          date: "",
          status: "scheduled",
          createdAt: new Date().toISOString(),
        });
      }));
      setTournaments(prev => [tournament, ...prev]);
      setCreateDialog(false);
      setCreateForm({ name: "", divisionId: "", participants: [], vueltas: 1 });
      toast({ title: "Torneo creado", description: `${tournament.name} · ${resolvedParticipants.length} equipos` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al crear el torneo" });
    } finally {
      setCreateLoading(false);
    }
  };

  const openTournament = (t: any) => {
    setSelectedTournament(t);
    setAllMatches([]);
    setStandings([]);
    setView("detail");
  };

  const handleDeleteTournament = async (tid: string, tname: string) => {
    if (!confirm(`¿Eliminar el torneo "${tname}"? Se borrarán sus datos de posiciones.`)) return;
    await deleteDoc(doc(db, "clubs", clubId, "tournaments", tid));
    setTournaments(prev => prev.filter(t => t.id !== tid));
    toast({ variant: "destructive", title: "Torneo eliminado", description: tname });
  };

  const handleOpenMatchEdit = (match: any) => {
    setEditingMatch(match);
    setMatchEditForm({ date: match.date || "", status: match.status || "scheduled", notes: match.notes || "" });
    setMatchEditDialog(true);
  };

  const handleSaveMatchEdit = async () => {
    if (!editingMatch || !db) return;
    const updates: any = { date: matchEditForm.date, status: matchEditForm.status, notes: matchEditForm.notes };
    try {
      await updateDoc(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "matches", editingMatch.id), updates);
      setAllMatches(prev => prev.map(m => m.id === editingMatch.id ? { ...m, ...updates } : m));
      setMatchEditDialog(false);
      setEditingMatch(null);
      toast({ title: "Partido actualizado" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al actualizar" });
    }
  };

  const handleDeleteTournamentMatch = async (matchId: string) => {
    if (!confirm("¿Eliminar este partido del fixture?")) return;
    await deleteDoc(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "matches", matchId));
    setAllMatches(prev => prev.filter(m => m.id !== matchId));
    toast({ variant: "destructive", title: "Partido eliminado" });
  };

  const handleToggleSuspend = async (match: any) => {
    const newStatus = match.status === "suspended" ? "scheduled" : "suspended";
    try {
      await updateDoc(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "matches", match.id), { status: newStatus });
      setAllMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: newStatus } : m));
      toast({ title: newStatus === "suspended" ? "Partido suspendido" : "Partido reactivado" });
    } catch (e) { console.error(e); }
  };

  const handleOpenStandingEdit = (s: any) => {
    setEditingStanding(s);
    setStandingForm({
      teamName: s.teamName || "", opponentId: s.opponentId || "", teamId: s.teamId || "", isInternal: s.isInternal || false,
      played: s.played || 0, won: s.won || 0, drawn: s.drawn || 0, lost: s.lost || 0,
      goalsFor: s.goalsFor || 0, goalsAgainst: s.goalsAgainst || 0, points: s.points || 0,
    });
    setStandingDialog(true);
  };

  const handleSaveStanding = async () => {
    let finalName = standingForm.teamName;
    let finalLogo = "";
    if (editingStanding?.isInternal) {
      finalName = editingStanding.teamName;
      finalLogo = editingStanding.teamLogo || "";
    } else if (standingForm.opponentId) {
      const opp = opponents.find(o => o.id === standingForm.opponentId);
      if (opp) { finalName = opp.name; finalLogo = opp.logoUrl || ""; }
    }
    if (!finalName) return;
    try {
      if (editingStanding) {
        const updated = { ...standingForm, teamName: finalName, teamLogo: finalLogo || editingStanding.teamLogo || "" };
        await updateDoc(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "standings", editingStanding.id), updated);
        setStandings(prev =>
          prev.map(s => s.id === editingStanding.id ? { ...s, ...updated } : s)
            .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        toast({ title: "Tabla actualizada", description: finalName });
      } else {
        const stId = doc(collection(db, "clubs", clubId, "tournaments", selectedTournament.id, "standings")).id;
        const newSt = { ...standingForm, teamName: finalName, teamLogo: finalLogo, id: stId, isInternal: false, createdAt: new Date().toISOString() };
        await setDoc(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "standings", stId), newSt);
        setStandings(prev =>
          [...prev, newSt].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        toast({ title: "Club añadido", description: finalName });
      }
      setStandingDialog(false);
      setEditingStanding(null);
      setStandingForm({ ...STANDING_INITIAL });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const handleDeleteStanding = (id: string, isInternal: boolean) => {
    if (isInternal && !confirm("Este equipo fue creado automáticamente. ¿Eliminar de la tabla?")) return;
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "tournaments", selectedTournament.id, "standings", id));
    setStandings(prev => prev.filter(s => s.id !== id));
    toast({ variant: "destructive", title: "Equipo eliminado de la tabla" });
  };

  const matchTypeColor = (type: string) =>
    type === "match_league" ? "bg-amber-500" : type === "match_friendly" ? "bg-sky-500" : "bg-primary";
  const matchTypeLabel = (type: string) =>
    type === "match_league" ? "Liga" : type === "match_friendly" ? "Amistoso" : "Oficial";

  const tournamentParticipants = selectedTournament?.participants || [];
  const tournamentTeams = divisionTeams;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Torneos...</p>
    </div>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === "detail" && selectedTournament) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
        <header className="flex flex-col gap-4">
          <button
            onClick={() => { setView("list"); setSelectedTournament(null); }}
            className="ambient-link group w-fit flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a Torneos
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">{selectedTournament.name}</h1>
                <Badge className="bg-white/20 text-white border-white/30 font-black uppercase text-[9px] tracking-widest">
                  {selectedTournament.divisionName}
                </Badge>
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">
                {selectedTournament.teamIds?.length || 0} equipos · Fixture y tabla de posiciones
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
                <Link href={"/dashboard/clubs/" + clubId + "/opponents"}><Shield className="h-4 w-4 mr-2" /> Rivales</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Equipos:</span>
          {tournamentParticipants.map((p: any) => (
            <Badge key={p.id} className="bg-white/15 text-white border-white/20 font-bold text-[10px]">
              {p.name}{p.divLabel ? ` · Div. ${p.divLabel}` : ""}
            </Badge>
          ))}
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white h-10 w-10" /></div>
        ) : (
          <Tabs defaultValue="fixture" className="w-full">
            <TabsList className="bg-white/15 backdrop-blur-xl p-1 mb-6 border border-white/20 shadow-2xl inline-flex rounded-2xl h-14">
              <TabsTrigger value="fixture" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <CalendarDays className="h-4 w-4" /> Fixture
              </TabsTrigger>
              <TabsTrigger value="standings" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <TableIcon className="h-4 w-4" /> Posiciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fixture" className="animate-in fade-in duration-300">
              {allMatches.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
                  <CalendarDays className="h-16 w-16 mx-auto text-white mb-6 opacity-20" />
                  <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin fixture generado</p>
                  <p className="text-white/60 text-xs mt-2 font-bold">Creá un nuevo torneo para generar el fixture automáticamente.</p>
                </div>
              ) : (() => {
                const matchesByRound: Record<number, any[]> = {};
                allMatches.forEach((m: any) => {
                  if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
                  matchesByRound[m.round].push(m);
                });
                const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
                const statusConfig: Record<string, { label: string; barColor: string; badgeClass: string }> = {
                  scheduled: { label: "Programado", barColor: "bg-primary", badgeClass: "bg-emerald-100 text-emerald-700" },
                  suspended: { label: "Suspendido", barColor: "bg-red-500", badgeClass: "bg-red-100 text-red-600" },
                  rescheduled: { label: "Reprogramado", barColor: "bg-amber-500", badgeClass: "bg-amber-100 text-amber-700" },
                  played: { label: "Jugado", barColor: "bg-slate-400", badgeClass: "bg-slate-100 text-slate-500" },
                };
                return (
                  <div className="space-y-10">
                    {rounds.map((round) => (
                      <div key={round}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 shrink-0">Fecha {round}</span>
                          <div className="flex-1 h-px bg-white/20" />
                        </div>
                        <div className="space-y-3">
                          {matchesByRound[round].map((match: any) => {
                            const sc = statusConfig[match.status || "scheduled"] || statusConfig.scheduled;
                            const matchDate = match.date ? new Date(match.date) : null;
                            return (
                              <div key={match.id} className="bg-white/95 backdrop-blur-md rounded-[1.5rem] shadow-xl overflow-hidden">
                                <div className={cn("h-1.5 w-full", sc.barColor)} />
                                <div className="p-4 md:p-5 space-y-3">
                                  {/* Teams row */}
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <Avatar className="h-10 w-10 rounded-xl border bg-white shrink-0 shadow-sm">
                                        <AvatarImage src={match.homeParticipantLogo} className="object-contain p-0.5" />
                                        <AvatarFallback className="text-[10px] font-black text-slate-300">{match.homeParticipantName?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm text-slate-900 truncate leading-tight">{match.homeParticipantName}</p>
                                        <p className="text-[9px] font-black uppercase text-primary tracking-wide">Local</p>
                                      </div>
                                    </div>
                                    <span className="font-black text-slate-300 text-base px-2 shrink-0">vs</span>
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                                      <div className="flex-1 min-w-0 text-right">
                                        <p className="font-black text-sm text-slate-900 truncate leading-tight">{match.awayParticipantName}</p>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Visitante</p>
                                      </div>
                                      <Avatar className="h-10 w-10 rounded-xl border bg-white shrink-0 shadow-sm">
                                        <AvatarImage src={match.awayParticipantLogo} className="object-contain p-0.5" />
                                        <AvatarFallback className="text-[10px] font-black text-slate-300">{match.awayParticipantName?.[0]}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  </div>
                                  {/* Date / status / actions row */}
                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                      {matchDate ? (
                                        <span className="text-xs font-bold text-slate-600">
                                          {matchDate.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })}
                                          {" · "}{matchDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}h
                                        </span>
                                      ) : (
                                        <span className="text-xs font-bold text-slate-300">Sin fecha</span>
                                      )}
                                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", sc.badgeClass)}>
                                        {sc.label}
                                      </span>
                                      {match.notes && (
                                        <span className="text-[10px] text-slate-400 font-bold italic">· {match.notes}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost" size="sm"
                                        className="h-8 w-8 p-0 rounded-xl text-slate-300 hover:text-primary hover:bg-primary/5"
                                        title="Editar fecha y estado"
                                        onClick={() => handleOpenMatchEdit(match)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="sm"
                                        title={match.status === "suspended" ? "Reactivar partido" : "Suspender partido"}
                                        className={cn("h-8 w-8 p-0 rounded-xl",
                                          match.status === "suspended"
                                            ? "text-amber-500 hover:bg-amber-50"
                                            : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                                        )}
                                        onClick={() => handleToggleSuspend(match)}
                                      >
                                        {match.status === "suspended"
                                          ? <RotateCcw className="h-3.5 w-3.5" />
                                          : <Ban className="h-3.5 w-3.5" />}
                                      </Button>
                                      <Button
                                        variant="ghost" size="sm"
                                        className="h-8 w-8 p-0 rounded-xl text-slate-200 hover:text-destructive hover:bg-red-50"
                                        onClick={() => handleDeleteTournamentMatch(match.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="standings" className="animate-in fade-in duration-300">
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => { setEditingStanding(null); setStandingForm({ ...STANDING_INITIAL }); setStandingDialog(true); }}
                  className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl"
                >
                  <Plus className="h-5 w-5 mr-2" /> Agregar Club
                </Button>
              </div>
              <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-none bg-slate-50 h-12">
                        <TableHead className="w-12 text-center font-black uppercase text-[9px] tracking-widest text-slate-400 pl-4">#</TableHead>
                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400">Club</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-slate-400">PJ</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-green-600">G</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-orange-500">E</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-red-500">P</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-slate-400">GF</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-slate-400">GC</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-slate-400">DIF</TableHead>
                        <TableHead className="text-center font-black uppercase text-[9px] tracking-widest text-primary">PTS</TableHead>
                        <TableHead className="w-20 text-right pr-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((s: any, i: number) => {
                        const diff = (s.goalsFor || 0) - (s.goalsAgainst || 0);
                        return (
                          <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-16">
                            <TableCell className="text-center pl-4">
                              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center mx-auto font-black text-xs",
                                i === 0 ? "bg-yellow-500 text-white" : i < 4 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                              )}>{i + 1}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-lg border bg-white shrink-0">
                                  <AvatarImage src={s.teamLogo} className="object-contain p-0.5" />
                                  <AvatarFallback className="bg-slate-50 text-[10px] text-slate-300 font-black">{s.teamName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-900 text-sm">{s.teamName}</span>
                                  {s.isInternal && <span className="text-[8px] font-bold text-primary uppercase tracking-wide">Nuestro equipo</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-500 text-sm">{s.played || 0}</TableCell>
                            <TableCell className="text-center font-bold text-green-600 text-sm">{s.won || 0}</TableCell>
                            <TableCell className="text-center font-bold text-orange-500 text-sm">{s.drawn || 0}</TableCell>
                            <TableCell className="text-center font-bold text-red-500 text-sm">{s.lost || 0}</TableCell>
                            <TableCell className="text-center font-bold text-slate-500 text-sm">{s.goalsFor || 0}</TableCell>
                            <TableCell className="text-center font-bold text-slate-500 text-sm">{s.goalsAgainst || 0}</TableCell>
                            <TableCell className="text-center text-sm">
                              <span className={cn("font-black", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-slate-400")}>
                                {diff > 0 ? ("+" + diff) : diff}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-primary text-white font-black text-base px-3 border-none shadow-sm min-w-[2.5rem] justify-center">{s.points || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5" onClick={() => handleOpenStandingEdit(s)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-destructive hover:bg-red-50" onClick={() => handleDeleteStanding(s.id, s.isInternal)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {standings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-28 text-slate-300 font-black uppercase tracking-widest text-xs">
                            Sin equipos en la tabla
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* MATCH EDIT DIALOG */}
        <Dialog open={matchEditDialog} onOpenChange={open => { if (!open) { setMatchEditDialog(false); setEditingMatch(null); } }}>
          <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 leading-snug">
                {editingMatch?.homeParticipantName} vs {editingMatch?.awayParticipantName}
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-500">
                Fecha {editingMatch?.round} · {selectedTournament.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">
                  Fecha y Hora <span className="text-slate-300 normal-case font-normal">(opcional)</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={matchEditForm.date}
                  onChange={e => setMatchEditForm({ ...matchEditForm, date: e.target.value })}
                  className="h-12 border-2 font-bold"
                />
                {matchEditForm.date && (
                  <button
                    type="button"
                    onClick={() => setMatchEditForm({ ...matchEditForm, date: "" })}
                    className="text-[10px] text-slate-400 hover:text-destructive font-black uppercase underline"
                  >
                    Quitar fecha
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Estado del Partido</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "scheduled", label: "Programado", active: "bg-emerald-500 text-white border-emerald-500 shadow-lg" },
                    { value: "suspended", label: "Suspendido", active: "bg-red-500 text-white border-red-500 shadow-lg" },
                    { value: "rescheduled", label: "Reprogramado", active: "bg-amber-500 text-white border-amber-500 shadow-lg" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMatchEditForm({ ...matchEditForm, status: opt.value })}
                      className={cn(
                        "h-12 rounded-xl border-2 font-black text-[9px] uppercase tracking-wider transition-all",
                        matchEditForm.status === opt.value ? opt.active : "border-slate-200 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {(matchEditForm.status === "rescheduled" || matchEditForm.status === "suspended") && (
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">
                    Observaciones <span className="text-slate-300 normal-case font-normal">(opcional)</span>
                  </Label>
                  <Input
                    value={matchEditForm.notes}
                    onChange={e => setMatchEditForm({ ...matchEditForm, notes: e.target.value })}
                    placeholder="Ej. Lluvia, campo en mal estado..."
                    className="h-12 border-2 font-bold"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t gap-2">
              <Button variant="ghost" onClick={() => setMatchEditDialog(false)} className="font-bold text-slate-500">Cancelar</Button>
              <Button onClick={handleSaveMatchEdit} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* STANDING DIALOG */}
        <Dialog open={standingDialog} onOpenChange={open => { if (!open) { setStandingDialog(false); setEditingStanding(null); } }}>
          <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">
                {editingStanding ? ("Editar: " + editingStanding.teamName) : "Agregar Club a Tabla"}
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-500">
                {editingStanding?.isInternal ? "Editá las estadísticas del equipo." : "Seleccioná un club rival para vincular su escudo."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-1">
              {editingStanding?.isInternal ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <p className="font-black text-sm text-primary">{editingStanding.teamName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Equipo interno del torneo. Solo editás estadísticas.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Club (Base de Rivales)</Label>
                    <Select value={standingForm.opponentId} onValueChange={v => setStandingForm({ ...standingForm, opponentId: v })}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Elegir club..." /></SelectTrigger>
                      <SelectContent>
                        {opponents.map(o => (
                          <SelectItem key={o.id} value={o.id} className="font-bold">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 rounded-none"><AvatarImage src={o.logoUrl} className="object-contain" /></Avatar>
                              {o.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400 font-black">O nombre manual</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Club</Label>
                    <Input value={standingForm.teamName} onChange={e => setStandingForm({ ...standingForm, teamName: e.target.value })} placeholder="Ej. Lomas Athletic..." className="h-12 border-2 font-bold" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">PJ</Label>
                  <Input type="number" min={0} value={standingForm.played} onChange={e => setStandingForm({ ...standingForm, played: +e.target.value || 0 })} className="h-11 border-2 text-center font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="font-black text-xs uppercase tracking-widest text-primary">PTS</Label>
                  <Input type="number" min={0} value={standingForm.points} onChange={e => setStandingForm({ ...standingForm, points: +e.target.value || 0 })} className="h-11 border-2 text-center font-black bg-primary/5 border-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ key: "won", label: "G", color: "text-green-600" }, { key: "drawn", label: "E", color: "text-orange-500" }, { key: "lost", label: "P", color: "text-red-500" }].map(({ key, label, color }) => (
                  <div key={key} className="space-y-1">
                    <Label className={cn("font-black text-xs uppercase tracking-widest", color)}>{label}</Label>
                    <Input type="number" min={0} value={(standingForm as any)[key]} onChange={e => setStandingForm({ ...standingForm, [key]: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">GF</Label>
                  <Input type="number" min={0} value={standingForm.goalsFor} onChange={e => setStandingForm({ ...standingForm, goalsFor: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">GC</Label>
                  <Input type="number" min={0} value={standingForm.goalsAgainst} onChange={e => setStandingForm({ ...standingForm, goalsAgainst: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
                </div>
              </div>
            </div>
            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t gap-2">
              <Button variant="ghost" onClick={() => setStandingDialog(false)} className="font-bold text-slate-500">Cancelar</Button>
              <Button
                onClick={handleSaveStanding}
                disabled={!editingStanding?.isInternal && !standingForm.teamName && !standingForm.opponentId}
                className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20"
              >
                {editingStanding ? "Guardar Cambios" : "Agregar a Tabla"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/coordinator" className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Torneos</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">
              Creá torneos, armá el fixture y gestioná las posiciones.
            </p>
          </div>
          <Button
            className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-5 w-5 mr-2" /> Crear Torneo
          </Button>
        </div>
      </header>

      {tournaments.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
          <Trophy className="h-20 w-20 mx-auto text-white mb-6 opacity-20" />
          <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin torneos creados</p>
          <p className="text-white/60 text-xs mt-2 font-bold max-w-xs mx-auto">
            Creá tu primer torneo para organizar el fixture y la tabla de posiciones.
          </p>
          <Button
            className="mt-8 bg-white text-primary hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-2xl"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Crear Primer Torneo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tournaments.map(t => (
            <div
              key={t.id}
              onClick={() => openTournament(t)}
              className="group relative bg-white/95 backdrop-blur-md rounded-[2rem] shadow-xl p-6 cursor-pointer hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary to-primary/50 rounded-t-[2rem]" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest">{t.divisionName}</Badge>
                    <Badge className={cn("border-none font-black text-[9px] uppercase tracking-widest",
                      t.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                      {t.status === "active" ? "Activo" : "Finalizado"}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight truncate">{t.name}</h2>
                  <div className="flex items-center gap-3 mt-3 text-slate-400">
                    <span className="flex items-center gap-1 text-[10px] font-bold">
                      <Users className="h-3 w-3" /> {t.teamIds?.length || 0} equipos
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold">
                      <Calendar className="h-3 w-3" /> {new Date(t.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Object.values(t.teamNames || {}).slice(0, 4).map((name: any) => (
                      <Badge key={name} variant="outline" className="font-bold text-[9px] border-slate-200 text-slate-400">{name}</Badge>
                    ))}
                    {Object.keys(t.teamNames || {}).length > 4 && (
                      <Badge variant="outline" className="font-bold text-[9px] border-slate-200 text-slate-400">
                        +{Object.keys(t.teamNames || {}).length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 w-8 p-0 rounded-xl text-slate-200 hover:text-destructive hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); handleDeleteTournament(t.id, t.name); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors mt-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TOURNAMENT DIALOG */}
      <Dialog open={createDialog} onOpenChange={open => {
        if (!open) { setCreateDialog(false); setCreateForm({ name: "", divisionId: "", participants: [], vueltas: 1 }); }
      }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Crear Torneo</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Definí nombre, categoría y equipos participantes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Torneo</Label>
              <Input
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Torneo Apertura 2026..."
                className="h-12 border-2 font-bold text-slate-900 placeholder:font-normal"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Categoría</Label>
              <Select
                value={createForm.divisionId}
                onValueChange={v => setCreateForm(prev => ({ ...prev, divisionId: v, selectedTeamIds: [] }))}
              >
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  {divisions.map(d => (
                    <SelectItem key={d.id} value={d.id} className="font-bold">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Modalidad: vueltas */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Modalidad</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, vueltas: 1 }))}
                  className={cn(
                    "h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 font-black text-xs uppercase tracking-widest transition-all",
                    createForm.vueltas === 1
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "border-slate-200 text-slate-400 hover:border-primary/40"
                  )}
                >
                  <span>1 Vuelta</span>
                  <span className={cn("text-[9px] font-bold normal-case tracking-normal", createForm.vueltas === 1 ? "text-white/70" : "text-slate-300")}>ida solamente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, vueltas: 2 }))}
                  className={cn(
                    "h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 font-black text-xs uppercase tracking-widest transition-all",
                    createForm.vueltas === 2
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "border-slate-200 text-slate-400 hover:border-primary/40"
                  )}
                >
                  <span>2 Vueltas</span>
                  <span className={cn("text-[9px] font-bold normal-case tracking-normal", createForm.vueltas === 2 ? "text-white/70" : "text-slate-300")}>ida y vuelta</span>
                </button>
              </div>
            </div>
            {/* Clubs participantes (rivals) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Clubes Participantes</Label>
                {opponents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreateForm(prev => ({
                      ...prev,
                      participants: prev.participants.length === opponents.length
                        ? []
                        : opponents.map(o => ({ id: o.id, divLabel: prev.participants.find(p => p.id === o.id)?.divLabel || "" })),
                    }))}
                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    {createForm.participants.length === opponents.length ? "Desmarcar todo" : "Marcar todo"}
                  </button>
                )}
              </div>
              {opponents.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 text-center py-6 border-2 border-dashed rounded-xl">
                  No hay rivales cargados.{" "}
                  <Link href={`/dashboard/clubs/${clubId}/opponents`} className="text-primary underline">Cargar rivales →</Link>
                </p>
              ) : (
                <div className="space-y-1.5 border-2 border-slate-100 rounded-2xl p-3 max-h-56 overflow-y-auto">
                  {opponents.map((opp: any) => {
                    const participant = createForm.participants.find(p => p.id === opp.id);
                    const checked = !!participant;
                    return (
                      <div key={opp.id} className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl transition-all",
                        checked ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-slate-50"
                      )}>
                        {/* Checkbox + logo + name */}
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                          onClick={() => setCreateForm(prev => {
                            const already = prev.participants.find(p => p.id === opp.id);
                            return {
                              ...prev,
                              participants: already
                                ? prev.participants.filter(p => p.id !== opp.id)
                                : [...prev.participants, { id: opp.id, divLabel: "" }],
                            };
                          })}
                        >
                          <Checkbox checked={checked} className="pointer-events-none shrink-0" />
                          <Avatar className="h-7 w-7 rounded-lg border bg-white shrink-0">
                            <AvatarImage src={opp.logoUrl} className="object-contain p-0.5" />
                            <AvatarFallback className="text-[9px] font-black text-slate-300">{opp.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-sm text-slate-700 truncate">{opp.name}</span>
                        </div>
                        {/* Div label input (only when checked) */}
                        {checked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-400">División</span>
                            <Input
                              value={participant?.divLabel || ""}
                              onChange={e => {
                                const val = e.target.value.toUpperCase().slice(0, 3);
                                setCreateForm(prev => ({
                                  ...prev,
                                  participants: prev.participants.map(p =>
                                    p.id === opp.id ? { ...p, divLabel: val } : p
                                  ),
                                }));
                              }}
                              placeholder="A"
                              className="h-8 w-14 border-2 text-center font-black text-sm p-0"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {createForm.participants.length >= 2 && (() => {
                const n = createForm.participants.length;
                const rounds = (n % 2 === 0 ? n - 1 : n) * createForm.vueltas;
                const matches = Math.floor(n * (n - 1) / 2) * createForm.vueltas;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-around gap-2 mt-1">
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{n}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Equipos</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{rounds}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fechas</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{matches}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Partidos</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{createForm.vueltas}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{createForm.vueltas === 1 ? "Vuelta" : "Vueltas"}</p>
                    </div>
                  </div>
                );
              })()}
              {createForm.participants.length === 1 && (
                <p className="text-[10px] font-bold text-slate-400 text-center">Seleccioná al menos 2 equipos para calcular el fixture.</p>
              )}
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t gap-2">
            <Button variant="ghost" onClick={() => setCreateDialog(false)} className="font-bold text-slate-500">Cancelar</Button>
            <Button
              onClick={handleCreateTournament}
              disabled={createLoading || !createForm.name.trim() || !createForm.divisionId || createForm.participants.length < 2}
              className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20"
            >
              {createLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Trophy className="h-4 w-4 mr-2" /> Crear Torneo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
