
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, Trash2, ChevronLeft, ChevronRight,
  Trophy, Shield, ExternalLink, Bus, Pencil,
  Table as TableIcon, CalendarDays, MapPinned,
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MATCH_INITIAL = {
  teamId: "", opponentId: "", date: "", type: "match_league",
  title: "", departureTime: "", isHome: true, homeTeam: "", awayTeam: "",
};

const STANDING_INITIAL = {
  teamName: "", opponentId: "",
  played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0, points: 0,
};

export default function UnifiedFixturePage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [standingsLoading, setStandingsLoading] = useState(false);

  const [clubData, setClubData] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivId, setSelectedDivId] = useState<string>("");
  const [teamsInDiv, setTeamsInDiv] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);

  const [matchDialog, setMatchDialog] = useState(false);
  const [newMatch, setNewMatch] = useState({ ...MATCH_INITIAL });

  const [standingDialog, setStandingDialog] = useState(false);
  const [editingStanding, setEditingStanding] = useState<any>(null);
  const [standingForm, setStandingForm] = useState({ ...STANDING_INITIAL });

  // ── Initial load: club, divisions, opponents ──────────────────────────────
  useEffect(() => {
    async function init() {
      if (!db) return;
      try {
        const clubDoc = await getDoc(doc(db, "clubs", clubId));
        if (clubDoc.exists()) setClubData({ ...clubDoc.data(), id: clubDoc.id });

        const divsSnap = await getDocs(collection(db, "clubs", clubId, "divisions"));
        const divs = divsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
          .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setDivisions(divs);
        if (divs.length > 0) setSelectedDivId(divs[0].id);

        const oppsSnap = await getDocs(collection(db, "clubs", clubId, "opponents"));
        setOpponents(oppsSnap.docs.map(d => ({ ...d.data(), id: d.id }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    init();
  }, [db, clubId]);

  // ── Per-division load: teams, matches, standings ──────────────────────────
  useEffect(() => {
    if (!selectedDivId || !db) return;
    async function loadDivisionData() {
      setMatchesLoading(true);
      setStandingsLoading(true);
      try {
        const tSnap = await getDocs(collection(db, "clubs", clubId, "divisions", selectedDivId, "teams"));
        const teams = tSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        setTeamsInDiv(teams);

        const matchTypes = ['match', 'match_league', 'match_friendly'];
        const matchArrays = await Promise.all(
          teams.map(async (team: any) => {
            const evSnap = await getDocs(collection(db, "clubs", clubId, "divisions", selectedDivId, "teams", team.id, "events"));
            return evSnap.docs
              .map(d => ({ ...d.data(), id: d.id, teamId: team.id, teamName: team.name }))
              .filter((e: any) => matchTypes.includes(e.type));
          })
        );
        setAllMatches(
          matchArrays.flat().sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        );
        setMatchesLoading(false);

        const stSnap = await getDocs(collection(db, "clubs", clubId, "divisions", selectedDivId, "standings"));
        setStandings(
          stSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        setStandingsLoading(false);
      } catch (e) { console.error(e); setMatchesLoading(false); setStandingsLoading(false); }
    }
    loadDivisionData();
  }, [db, clubId, selectedDivId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateMatch = async () => {
    if (!newMatch.teamId || !newMatch.opponentId || !newMatch.date) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Completá equipo, rival y fecha." });
      return;
    }
    const selectedTeam = teamsInDiv.find(t => t.id === newMatch.teamId);
    const isOwnClub = newMatch.opponentId === "__own_club__";
    const selectedOpp = isOwnClub ? clubData : opponents.find(o => o.id === newMatch.opponentId);
    if (!selectedTeam || !selectedOpp) return;

    try {
      const matchId = doc(collection(db, "clubs", clubId, "divisions", selectedDivId, "teams", selectedTeam.id, "events")).id;
      const data: any = {
        ...newMatch,
        id: matchId,
        opponent: selectedOpp.name,
        opponentId: isOwnClub ? clubId : selectedOpp.id,
        opponentLogo: selectedOpp.logoUrl || "",
        location: newMatch.isHome ? (clubData?.address || "Sede Propia") : (selectedOpp.city || selectedOpp.address || "Sede Rival"),
        address: newMatch.isHome ? (clubData?.address || "") : (selectedOpp.address || ""),
        title: newMatch.title || `vs ${selectedOpp.name}`,
        homeTeam: newMatch.isHome ? (clubData?.name || selectedTeam.name) : selectedOpp.name,
        awayTeam: newMatch.isHome ? selectedOpp.name : (clubData?.name || selectedTeam.name),
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "clubs", clubId, "divisions", selectedDivId, "teams", selectedTeam.id, "events", matchId), data);
      setAllMatches(prev =>
        [...prev, { ...data, teamName: selectedTeam.name }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
      toast({ title: "Partido Programado", description: `${data.homeTeam} vs ${data.awayTeam}` });
      setMatchDialog(false);
      setNewMatch({ ...MATCH_INITIAL });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const handleDeleteMatch = async (match: any) => {
    if (!confirm("¿Eliminar este partido del fixture?")) return;
    await deleteDoc(doc(db, "clubs", clubId, "divisions", selectedDivId, "teams", match.teamId, "events", match.id));
    setAllMatches(prev => prev.filter(m => m.id !== match.id));
    toast({ variant: "destructive", title: "Partido eliminado" });
  };

  const handleOpenStandingEdit = (s: any) => {
    setEditingStanding(s);
    setStandingForm({
      teamName: s.teamName || "", opponentId: s.opponentId || "",
      played: s.played || 0, won: s.won || 0, drawn: s.drawn || 0, lost: s.lost || 0,
      goalsFor: s.goalsFor || 0, goalsAgainst: s.goalsAgainst || 0, points: s.points || 0,
    });
    setStandingDialog(true);
  };

  const handleSaveStanding = async () => {
    let finalName = standingForm.teamName;
    let finalLogo = "";
    if (standingForm.opponentId) {
      const opp = opponents.find(o => o.id === standingForm.opponentId);
      if (opp) { finalName = opp.name; finalLogo = opp.logoUrl || ""; }
    }
    if (!finalName) return;

    try {
      if (editingStanding) {
        const updated = { ...standingForm, teamName: finalName, teamLogo: finalLogo || editingStanding.teamLogo || "" };
        await updateDoc(doc(db, "clubs", clubId, "divisions", selectedDivId, "standings", editingStanding.id), updated);
        setStandings(prev =>
          prev.map(s => s.id === editingStanding.id ? { ...s, ...updated } : s)
            .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        toast({ title: "Tabla actualizada", description: finalName });
      } else {
        const stId = doc(collection(db, "clubs", clubId, "divisions", selectedDivId, "standings")).id;
        const newSt = { ...standingForm, teamName: finalName, teamLogo: finalLogo, id: stId, createdAt: new Date().toISOString() };
        await setDoc(doc(db, "clubs", clubId, "divisions", selectedDivId, "standings", stId), newSt);
        setStandings(prev =>
          [...prev, newSt].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        toast({ title: "Equipo añadido", description: finalName });
      }
      setStandingDialog(false);
      setEditingStanding(null);
      setStandingForm({ ...STANDING_INITIAL });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const handleDeleteStanding = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", selectedDivId, "standings", id));
    setStandings(prev => prev.filter(s => s.id !== id));
    toast({ variant: "destructive", title: "Equipo eliminado de la tabla" });
  };

  const matchTypeColor = (type: string) =>
    type === 'match_league' ? 'bg-amber-500' : type === 'match_friendly' ? 'bg-sky-500' : 'bg-primary';
  const matchTypeLabel = (type: string) =>
    type === 'match_league' ? 'Liga' : type === 'match_friendly' ? 'Amistoso' : 'Oficial';

  const selectedDiv = divisions.find(d => d.id === selectedDivId);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Torneo...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/coordinator" className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Torneo & Fixture</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">
              {selectedDiv?.name ? `${selectedDiv.name} · ` : ""}Fixture, posiciones y programación de partidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
              <Link href={`/dashboard/clubs/${clubId}/opponents`}><Shield className="h-4 w-4 mr-2" /> Rivales</Link>
            </Button>
            <Button
              className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl"
              onClick={() => { setNewMatch({ ...MATCH_INITIAL }); setMatchDialog(true); }}
              disabled={!selectedDivId || teamsInDiv.length === 0}
            >
              <Plus className="h-5 w-5 mr-2" /> Nuevo Partido
            </Button>
          </div>
        </div>
      </header>

      {/* ── Division Selector ── */}
      {divisions.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-white/50 uppercase pl-3 shrink-0">Categoría:</span>
            {divisions.map((div: any) => (
              <button
                key={div.id}
                onClick={() => setSelectedDivId(div.id)}
                className={cn(
                  "h-9 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shrink-0",
                  selectedDivId === div.id ? "bg-white text-primary shadow-xl" : "text-white hover:bg-white/10"
                )}
              >
                {div.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>
      )}

      {/* ── Main Tabs ── */}
      <Tabs defaultValue="fixture" className="w-full">
        <TabsList className="bg-white/15 backdrop-blur-xl p-1 mb-6 border border-white/20 shadow-2xl inline-flex rounded-2xl h-14">
          <TabsTrigger value="fixture" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
            <CalendarDays className="h-4 w-4" /> Fixture
          </TabsTrigger>
          <TabsTrigger value="standings" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
            <TableIcon className="h-4 w-4" /> Posiciones
          </TabsTrigger>
        </TabsList>

        {/* ══════════════ FIXTURE TAB ══════════════ */}
        <TabsContent value="fixture" className="animate-in fade-in duration-300">
          {matchesLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white h-10 w-10" /></div>
          ) : allMatches.length === 0 ? (
            <div className="text-center py-32 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
              <CalendarDays className="h-16 w-16 mx-auto text-white mb-6 opacity-20" />
              <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin partidos programados</p>
              <p className="text-white/60 text-xs mt-2 font-bold">Usá "Nuevo Partido" para armar el fixture de {selectedDiv?.name}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allMatches.map((match: any, idx: number) => {
                const date = new Date(match.date);
                const prev = allMatches[idx - 1];
                const newMonth = !prev || new Date(prev.date).getMonth() !== date.getMonth() || new Date(prev.date).getFullYear() !== date.getFullYear();
                return (
                  <div key={match.id}>
                    {newMonth && (
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 px-1 pt-5 pb-2">
                        {date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <div className="bg-white/95 backdrop-blur-md rounded-[1.5rem] shadow-xl overflow-hidden">
                      <div className={cn("h-1.5 w-full", matchTypeColor(match.type))} />
                      <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Date block */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="text-center bg-slate-50 rounded-2xl p-3 w-16 shrink-0 border border-slate-100">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{date.toLocaleDateString('es-AR', { month: 'short' })}</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">{date.getDate()}</p>
                            <p className="text-[9px] font-black text-primary">{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}h</p>
                          </div>
                          {/* Match info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge className={cn("font-black text-[8px] tracking-widest px-2 py-0.5 border-none text-white", matchTypeColor(match.type))}>
                                {matchTypeLabel(match.type)}
                              </Badge>
                              <Badge variant="outline" className="font-black text-[8px] px-2 py-0.5 border-slate-200 text-slate-400">{match.teamName}</Badge>
                              {match.isHome
                                ? <Badge variant="outline" className="font-black text-[8px] px-2 py-0.5 border-green-200 text-green-600">🏠 Local</Badge>
                                : <Badge variant="outline" className="font-black text-[8px] px-2 py-0.5 border-slate-200 text-slate-500">✈️ Visitante</Badge>}
                            </div>
                            <h3 className="font-black text-base md:text-lg text-slate-900 leading-tight truncate">{match.title || `vs ${match.opponent}`}</h3>
                            {match.location && (
                              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                                <MapPinned className="h-3 w-3 shrink-0" /> {match.location}
                                {match.address && (
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.address)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 ml-1">
                                    <ExternalLink className="h-2.5 w-2.5" /> Mapa
                                  </a>
                                )}
                              </p>
                            )}
                          </div>
                          {/* Score if recorded */}
                          {match.scoreHome !== undefined && match.scoreAway !== undefined && (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-3xl font-black text-slate-900 tabular-nums">{match.scoreHome}</span>
                              <span className="text-slate-300 font-black text-xl">-</span>
                              <span className="text-3xl font-black text-slate-900 tabular-nums">{match.scoreAway}</span>
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-destructive hover:bg-red-50" onClick={() => handleDeleteMatch(match)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-primary hover:bg-primary/5">
                            <Link href={`/dashboard/clubs/${clubId}/divisions/${selectedDivId}/teams/${match.teamId}/events/${match.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════════ STANDINGS TAB ══════════════ */}
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
            {standingsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
            ) : (
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
                              <span className="font-black text-slate-900 text-sm">{s.teamName}</span>
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
                              {diff > 0 ? `+${diff}` : diff}
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
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-destructive hover:bg-red-50" onClick={() => handleDeleteStanding(s.id)}>
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
                          Sin equipos en la tabla de {selectedDiv?.name || "esta categoría"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════════════ NEW MATCH DIALOG ══════════════ */}
      <Dialog open={matchDialog} onOpenChange={setMatchDialog}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Programar Encuentro</DialogTitle>
            <DialogDescription className="font-bold text-slate-500">
              Seleccioná un rival para cargar escudo y sede automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Match type */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Tipo de Partido</Label>
              <Select value={newMatch.type} onValueChange={v => setNewMatch({ ...newMatch, type: v })}>
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_league" className="font-bold">Partido de Liga</SelectItem>
                  <SelectItem value="match_friendly" className="font-bold">Amistoso</SelectItem>
                  <SelectItem value="match" className="font-bold">Partido Oficial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Home / Away */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Condición</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewMatch({ ...newMatch, isHome: true })}
                  className={cn("h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    newMatch.isHome ? "bg-primary text-white border-primary shadow-lg" : "border-slate-200 text-slate-400 hover:border-primary/40")}>
                  🏠 Local
                </button>
                <button type="button" onClick={() => setNewMatch({ ...newMatch, isHome: false })}
                  className={cn("h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    !newMatch.isHome ? "bg-slate-800 text-white border-slate-800 shadow-lg" : "border-slate-200 text-slate-400 hover:border-slate-400")}>
                  ✈️ Visitante
                </button>
              </div>
            </div>
            {/* Team */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Equipo</Label>
              <Select value={newMatch.teamId} onValueChange={v => setNewMatch({ ...newMatch, teamId: v })}>
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                <SelectContent>
                  {teamsInDiv.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Opponent */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Club Rival</Label>
              <Select value={newMatch.opponentId} onValueChange={v => setNewMatch({ ...newMatch, opponentId: v })}>
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Elegir rival..." /></SelectTrigger>
                <SelectContent>
                  {clubData && (
                    <SelectItem value="__own_club__" className="font-bold">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 rounded-none"><AvatarImage src={clubData.logoUrl} className="object-contain" /><AvatarFallback className="text-[8px]">🏠</AvatarFallback></Avatar>
                        {clubData.name} <span className="text-[9px] text-slate-400 ml-1">(nuestro club)</span>
                      </div>
                    </SelectItem>
                  )}
                  {opponents.map(o => (
                    <SelectItem key={o.id} value={o.id} className="font-bold">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 rounded-none"><AvatarImage src={o.logoUrl} className="object-contain" /></Avatar>
                        {o.name}{o.city ? ` · ${o.city}` : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {opponents.length === 0 && (
                <p className="text-[10px] text-destructive font-black uppercase">
                  Debés cargar rivales primero.{" "}
                  <Link href={`/dashboard/clubs/${clubId}/opponents`} className="underline">Ir a Rivales →</Link>
                </p>
              )}
            </div>
            {/* Date */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Fecha y Hora</Label>
              <Input type="datetime-local" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} className="h-12 border-2 font-bold" />
            </div>
            {/* Departure */}
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Bus className="h-3.5 w-3.5" /> Salida del Micro <span className="text-slate-300 normal-case font-medium">(opcional)</span>
              </Label>
              <Input type="time" value={newMatch.departureTime} onChange={e => setNewMatch({ ...newMatch, departureTime: e.target.value })} className="h-12 border-2 font-bold" />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t gap-2">
            <Button variant="ghost" onClick={() => setMatchDialog(false)} className="font-bold text-slate-500">Cancelar</Button>
            <Button onClick={handleCreateMatch} disabled={!newMatch.teamId || !newMatch.opponentId || !newMatch.date} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
              Confirmar en Fixture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ STANDING DIALOG ══════════════ */}
      <Dialog open={standingDialog} onOpenChange={open => { if (!open) { setStandingDialog(false); setEditingStanding(null); } }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {editingStanding ? `Editar: ${editingStanding.teamName}` : "Agregar Club a Tabla"}
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500">Seleccioná un club rival para vincular su escudo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">PJ</Label>
                <Input type="number" value={standingForm.played} onChange={e => setStandingForm({ ...standingForm, played: +e.target.value || 0 })} className="h-11 border-2 text-center font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-xs uppercase tracking-widest text-primary">PTS</Label>
                <Input type="number" value={standingForm.points} onChange={e => setStandingForm({ ...standingForm, points: +e.target.value || 0 })} className="h-11 border-2 text-center font-black bg-primary/5 border-primary/30" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'won', label: 'G', color: 'text-green-600' }, { key: 'drawn', label: 'E', color: 'text-orange-500' }, { key: 'lost', label: 'P', color: 'text-red-500' }].map(({ key, label, color }) => (
                <div key={key} className="space-y-1">
                  <Label className={cn("font-black text-xs uppercase tracking-widest", color)}>{label}</Label>
                  <Input type="number" value={(standingForm as any)[key]} onChange={e => setStandingForm({ ...standingForm, [key]: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">GF</Label>
                <Input type="number" value={standingForm.goalsFor} onChange={e => setStandingForm({ ...standingForm, goalsFor: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">GC</Label>
                <Input type="number" value={standingForm.goalsAgainst} onChange={e => setStandingForm({ ...standingForm, goalsAgainst: +e.target.value || 0 })} className="h-10 border-2 text-center font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t gap-2">
            <Button variant="ghost" onClick={() => setStandingDialog(false)} className="font-bold text-slate-500">Cancelar</Button>
            <Button onClick={handleSaveStanding} disabled={!standingForm.teamName && !standingForm.opponentId} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
              {editingStanding ? "Guardar Cambios" : "Agregar a Tabla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
