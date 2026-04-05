"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Trophy, CalendarDays, Table as TableIcon,
  ChevronLeft, Clock, Ban, RotateCcw,
} from "lucide-react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionNav } from "@/components/layout/section-nav";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function StandingsFixturePage() {
  const { firestore, user } = useFirebase();

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  const [standings, setStandings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolve clubId from user profile
  useEffect(() => {
    async function resolveClub() {
      if (!user || !firestore) return;
      try {
        const uidDoc = await getDoc(doc(firestore, "users", user.uid));
        if (uidDoc.exists() && uidDoc.data().clubId) {
          setClubId(uidDoc.data().clubId);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    resolveClub();
  }, [user, firestore]);

  // Load all tournaments once we have a clubId
  useEffect(() => {
    if (!clubId || !firestore) return;
    async function loadTournaments() {
      try {
        const snap = await getDocs(collection(firestore, "clubs", clubId!, "tournaments"));
        const list = snap.docs
          .map(d => ({ ...d.data(), id: d.id }))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTournaments(list);
        if (list.length > 0) setSelectedTournamentId(list[0].id);
      } catch (e) { console.error(e); }
    }
    loadTournaments();
  }, [clubId, firestore]);

  // Load standings + matches when selection changes
  useEffect(() => {
    if (!selectedTournamentId || !clubId || !firestore) return;
    const t = tournaments.find(t => t.id === selectedTournamentId) || null;
    setSelectedTournament(t);
    setDetailLoading(true);
    async function loadDetail() {
      try {
        const [stSnap, matchSnap] = await Promise.all([
          getDocs(collection(firestore!, "clubs", clubId!, "tournaments", selectedTournamentId, "standings")),
          getDocs(collection(firestore!, "clubs", clubId!, "tournaments", selectedTournamentId, "matches")),
        ]);
        setStandings(
          stSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
        );
        setMatches(
          matchSnap.docs.map(d => ({ ...d.data(), id: d.id }))
            .sort((a: any, b: any) => (a.round - b.round) || (a.date || "").localeCompare(b.date || ""))
        );
      } catch (e) { console.error(e); }
      finally { setDetailLoading(false); }
    }
    loadDetail();
  }, [selectedTournamentId, clubId, firestore, tournaments]);

  const navItems = [
    { title: "Volver", href: "/dashboard", icon: ChevronLeft },
    { title: "Tablas/Fixture", href: "/dashboard/standings-fixture", icon: Trophy },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando...</p>
    </div>
  );

  const matchesByRound: Record<number, any[]> = {};
  matches.forEach(m => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });
  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  const barColor = (status: string) =>
    status === "free" ? "bg-slate-300" :
    status === "suspended" ? "bg-red-500" :
    status === "rescheduled" ? "bg-amber-500" :
    "bg-primary";

  const statusLabel = (status: string) =>
    status === "free" ? "Fecha Libre" :
    status === "suspended" ? "Suspendido" :
    status === "rescheduled" ? "Reprogramado" :
    status === "played" ? "Jugado" :
    "Programado";

  const statusBadge = (status: string) =>
    status === "free" ? "bg-slate-100 text-slate-500" :
    status === "suspended" ? "bg-red-100 text-red-600" :
    status === "rescheduled" ? "bg-amber-100 text-amber-700" :
    status === "played" ? "bg-slate-100 text-slate-500" :
    "bg-emerald-100 text-emerald-700";

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-screen animate-in fade-in duration-500">
      <SectionNav items={navItems} basePath="/dashboard/standings-fixture" />

      <main className="flex-1 space-y-6 pb-24 px-4 md:px-0 pt-4 md:pt-8">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="h-5 w-5 text-white/60" />
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Tablas / Fixture</h1>
          </div>
          <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">
            Consultá posiciones y resultados de cualquier torneo del club
          </p>
        </header>

        {/* Tournament selector */}
        {tournaments.length === 0 ? (
          <div className="text-center py-40 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
            <Trophy className="h-16 w-16 mx-auto text-white mb-6 opacity-20" />
            <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin torneos</p>
            <p className="text-white/60 text-xs mt-2 font-bold">El club aún no ha creado torneos.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Torneo:</span>
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="h-12 border-2 bg-white/10 border-white/20 text-white font-bold w-80 max-w-full focus:ring-0 focus:border-white/40">
                  <SelectValue placeholder="Seleccionar torneo..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">
                      <div className="flex flex-col">
                        <span>{t.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {t.divisionName} · {t.teamIds?.length || 0} equipos
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTournament && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white border-white/30 font-black uppercase text-[9px] tracking-widest">
                  {selectedTournament.divisionName}
                </Badge>
                <Badge className={cn(
                  "border-none font-black text-[9px] uppercase tracking-widest",
                  selectedTournament.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                )}>
                  {selectedTournament.status === "active" ? "Activo" : "Finalizado"}
                </Badge>
                <span className="text-white/40 text-[9px] font-bold">
                  {selectedTournament.totalRounds} fechas · {selectedTournament.vueltas === 2 ? "Ida y vuelta" : "Solo ida"}
                </span>
              </div>
            )}

            {detailLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-white h-10 w-10" />
              </div>
            ) : (
              <Tabs defaultValue="standings" className="w-full">
                <TabsList className="bg-white/15 backdrop-blur-xl p-1 mb-6 border border-white/20 shadow-2xl inline-flex rounded-2xl h-14">
                  <TabsTrigger value="standings" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                    <TableIcon className="h-4 w-4" /> Posiciones
                  </TabsTrigger>
                  <TabsTrigger value="fixture" className="gap-2 h-12 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                    <CalendarDays className="h-4 w-4" /> Fixture
                  </TabsTrigger>
                </TabsList>

                {/* STANDINGS TAB */}
                <TabsContent value="standings" className="animate-in fade-in duration-300">
                  {standings.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
                      <TableIcon className="h-12 w-12 mx-auto text-white mb-4 opacity-20" />
                      <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin tabla de posiciones</p>
                    </div>
                  ) : (
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {standings.map((s: any, i: number) => {
                              const diff = (s.goalsFor || 0) - (s.goalsAgainst || 0);
                              return (
                                <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-16">
                                  <TableCell className="text-center pl-4">
                                    <div className={cn(
                                      "h-7 w-7 rounded-full flex items-center justify-center mx-auto font-black text-xs",
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
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-primary text-white font-black text-base px-3 border-none shadow-sm min-w-[2.5rem] justify-center">
                                      {s.points || 0}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* FIXTURE TAB */}
                <TabsContent value="fixture" className="animate-in fade-in duration-300">
                  {matches.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md">
                      <CalendarDays className="h-12 w-12 mx-auto text-white mb-4 opacity-20" />
                      <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Sin fixture generado</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {rounds.map((round) => (
                        <div key={round}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 shrink-0">Fecha {round}</span>
                            <div className="flex-1 h-px bg-white/20" />
                          </div>
                          <div className="space-y-3">
                            {matchesByRound[round].map((match: any) => {
                              const matchDate = match.date ? new Date(match.date) : null;
                              const isFree = match.status === "free";
                              return (
                                <div key={match.id} className="bg-white/95 backdrop-blur-md rounded-[1.5rem] shadow-xl overflow-hidden">
                                  <div className={cn("h-1.5 w-full", barColor(match.status))} />
                                  {isFree ? (
                                    <div className="p-4 flex items-center gap-2">
                                      <Badge className="bg-slate-100 text-slate-500 border-none font-black text-xs uppercase tracking-widest px-3">Fecha Libre</Badge>
                                    </div>
                                  ) : (
                                    <div className="p-4 space-y-3">
                                      {/* Teams row */}
                                      {match.homeParticipantName || match.awayParticipantName ? (
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <Avatar className="h-10 w-10 rounded-xl border bg-white shrink-0 shadow-sm">
                                              <AvatarImage src={match.homeParticipantLogo} className="object-contain p-0.5" />
                                              <AvatarFallback className="text-[10px] font-black text-slate-300">{match.homeParticipantName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-black text-sm text-slate-900 truncate leading-tight">{match.homeParticipantName || "—"}</p>
                                              <p className="text-[9px] font-black uppercase text-primary tracking-wide">Local</p>
                                            </div>
                                          </div>
                                          {/* Score if played */}
                                          {match.status === "played" && match.homeScore !== undefined ? (
                                            <div className="flex items-center gap-2 shrink-0 px-2">
                                              <span className="text-2xl font-black text-slate-900 tabular-nums">{match.homeScore}</span>
                                              <span className="text-slate-300 font-black">-</span>
                                              <span className="text-2xl font-black text-slate-900 tabular-nums">{match.awayScore}</span>
                                            </div>
                                          ) : (
                                            <span className="font-black text-slate-300 text-sm px-2 shrink-0">vs</span>
                                          )}
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                                            <div className="flex-1 min-w-0 text-right">
                                              <p className="font-black text-sm text-slate-900 truncate leading-tight">{match.awayParticipantName || "—"}</p>
                                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Visitante</p>
                                            </div>
                                            <Avatar className="h-10 w-10 rounded-xl border bg-white shrink-0 shadow-sm">
                                              <AvatarImage src={match.awayParticipantLogo} className="object-contain p-0.5" />
                                              <AvatarFallback className="text-[10px] font-black text-slate-300">{match.awayParticipantName?.[0]}</AvatarFallback>
                                            </Avatar>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm font-bold text-slate-300 italic">Cruce sin definir</p>
                                      )}
                                      {/* Date + status */}
                                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                                        <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                        {matchDate ? (
                                          <span className="text-xs font-bold text-slate-600">
                                            {matchDate.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                                            {" · "}{matchDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}h
                                          </span>
                                        ) : (
                                          <span className="text-xs font-bold text-slate-300">Sin fecha confirmada</span>
                                        )}
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ml-1", statusBadge(match.status))}>
                                          {statusLabel(match.status)}
                                        </span>
                                        {match.notes && (
                                          <span className="text-[10px] text-slate-400 font-bold italic">· {match.notes}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>
    </div>
  );
}
