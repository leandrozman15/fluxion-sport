
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Trophy, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Users,
  Flag,
  Trash2,
  Clock,
  MapPin,
  ShieldCheck,
  LayoutGrid,
  History
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function TournamentDetailPage() {
  const { federationId, tournamentId } = useParams() as any;
  const db = useFirestore();
  
  const [activeTab, setActiveTab] = useState("categories");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  
  const [newCatName, setNewCatName] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  
  const [newMatch, setNewMatch] = useState({
    homeTeamId: "",
    awayTeamId: "",
    date: "",
    location: "",
    refereeId: ""
  });

  const tourRef = useMemoFirebase(() => doc(db, "tournaments", tournamentId), [db, tournamentId]);
  const { data: tournament, isLoading: tourLoading } = useDoc(tourRef);

  const categoriesQuery = useMemoFirebase(() => collection(db, "tournaments", tournamentId, "categories"), [db, tournamentId]);
  const { data: categories, isLoading: catsLoading } = useCollection(categoriesQuery);

  const matchesQuery = useMemoFirebase(() => query(collection(db, "tournament_matches"), where("tournamentId", "==", tournamentId)), [db, tournamentId]);
  const { data: matches, isLoading: matchesLoading } = useCollection(matchesQuery);

  // Para inscribir equipos
  const clubsQuery = useMemoFirebase(() => collection(db, "clubs"), [db]);
  const { data: clubs } = useCollection(clubsQuery);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTeams() {
      if (!selectedClubId || !db) return;
      // Esto es simplificado para el MVP, buscando equipos en todas las divisiones del club
      const divsSnap = await getDocs(collection(db, "clubs", selectedClubId, "divisions"));
      let teams: any[] = [];
      for (const d of divsSnap.docs) {
        const ts = await getDocs(collection(db, "clubs", selectedClubId, "divisions", d.id, "teams"));
        ts.forEach(t => teams.push({ ...t.data(), id: t.id }));
      }
      setAvailableTeams(teams);
    }
    fetchTeams();
  }, [selectedClubId, db]);

  const handleCreateCategory = () => {
    const id = doc(collection(db, "tournaments", tournamentId, "categories")).id;
    setDoc(doc(db, "tournaments", tournamentId, "categories", id), {
      id, tournamentId, name: newCatName, createdAt: new Date().toISOString()
    });
    setNewCatName("");
    setIsCategoryOpen(false);
  };

  const handleRegisterTeam = () => {
    const team = availableTeams.find(t => t.id === selectedTeamId);
    const club = clubs?.find(c => c.id === selectedClubId);
    if (!team || !club || !selectedCatId) return;

    const regId = doc(collection(db, "tournaments", tournamentId, "categories", selectedCatId, "teams")).id;
    setDoc(doc(db, "tournaments", tournamentId, "categories", selectedCatId, "teams", regId), {
      id: regId,
      tournamentCategoryId: selectedCatId,
      teamId: selectedTeamId,
      clubId: selectedClubId,
      teamName: team.name,
      clubName: club.name,
      createdAt: new Date().toISOString()
    });
    setIsTeamOpen(false);
  };

  const handleCreateMatch = () => {
    const matchId = doc(collection(db, "tournament_matches")).id;
    const home = clubs?.find(c => c.id === newMatch.homeTeamId); // Simplificado: usando clubId como proxy en este MVP
    const away = clubs?.find(c => c.id === newMatch.awayTeamId);

    setDoc(doc(db, "tournament_matches", matchId), {
      ...newMatch,
      id: matchId,
      tournamentId,
      categoryId: selectedCatId,
      status: "scheduled",
      createdAt: new Date().toISOString()
    });
    setIsMatchOpen(false);
  };

  if (tourLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/federations/${federationId}/tournaments`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a torneos
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-headline">{tournament?.name}</h1>
              <p className="text-muted-foreground">{tournament?.season} • {tournament?.sport}</p>
            </div>
          </div>
          <div className="flex gap-2">
             <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nueva Categoría</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Categoría del Torneo</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre (Ej. Sub 15, Primera)</Label>
                      <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleCreateCategory}>Crear</Button></DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        </div>
      </header>

      <Tabs defaultValue="categories" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="categories" className="gap-2"><LayoutGrid className="h-4 w-4" /> Categorías y Equipos</TabsTrigger>
          <TabsTrigger value="fixture" className="gap-2"><Calendar className="h-4 w-4" /> Fixture / Partidos</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories?.map((cat: any) => (
              <CategoryCard 
                key={cat.id} 
                category={cat} 
                onAddTeam={() => { setSelectedCatId(cat.id); setIsTeamOpen(true); }}
              />
            ))}
            {categories?.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">Define las categorías para empezar a inscribir equipos.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fixture" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Calendario de Partidos</h2>
            <Dialog open={isMatchOpen} onOpenChange={setIsMatchOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Flag className="h-4 w-4" /> Programar Partido</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nuevo Encuentro</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={selectedCatId} onValueChange={setSelectedCatId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Equipo Local</Label>
                      <Select value={newMatch.homeTeamId} onValueChange={v => setNewMatch({...newMatch, homeTeamId: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Equipo Visitante</Label>
                      <Select value={newMatch.awayTeamId} onValueChange={v => setNewMatch({...newMatch, awayTeamId: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y Hora</Label>
                    <Input type="datetime-local" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lugar/Cancha</Label>
                    <Input value={newMatch.location} onChange={e => setNewMatch({...newMatch, location: e.target.value})} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateMatch}>Programar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {matches?.map((m: any) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row items-center p-4 gap-6">
                  <div className="flex-1 text-right font-bold text-lg">{m.homeTeamName || 'Local'}</div>
                  <div className="flex flex-col items-center px-6 py-2 bg-muted rounded-lg border">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                    <span className="text-xl font-black">VS</span>
                    <span className="text-xs font-bold">{new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex-1 font-bold text-lg">{m.awayTeamName || 'Visita'}</div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={m.status === 'played' ? 'secondary' : 'default'}>{m.status.toUpperCase()}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.location}</span>
                  </div>
                </div>
              </Card>
            ))}
            {matches?.length === 0 && (
              <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-xl">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">Aún no se han programado partidos en este torneo.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogo para inscribir equipo */}
      <Dialog open={isTeamOpen} onOpenChange={setIsTeamOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inscribir Equipo en Competencia</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Club..." /></SelectTrigger>
                <SelectContent>
                  {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipo Específico</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Equipo..." /></SelectTrigger>
                <SelectContent>
                  {availableTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.season})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRegisterTeam} disabled={!selectedTeamId}>Confirmar Inscripción</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryCard({ category, onAddTeam }: { category: any, onAddTeam: () => void }) {
  const db = useFirestore();
  const teamsQuery = useMemoFirebase(() => collection(db, "tournaments", category.tournamentId, "categories", category.id, "teams"), [db, category]);
  const { data: teams } = useCollection(teamsQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{category.name}</CardTitle>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteDocumentNonBlocking(doc(db, "tournaments", category.tournamentId, "categories", category.id))}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase mb-2">
            <span>Equipos Inscritos</span>
            <span>{teams?.length || 0}</span>
          </div>
          <div className="divide-y border rounded-lg bg-muted/10">
            {teams?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 text-sm">
                <span className="font-medium">{t.teamName} <span className="text-[10px] text-muted-foreground">({t.clubName})</span></span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteDocumentNonBlocking(doc(db, "tournaments", category.tournamentId, "categories", category.id, "teams", t.id))}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            {(!teams || teams.length === 0) && <div className="p-4 text-center text-xs text-muted-foreground italic">Sin equipos aún.</div>}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onAddTeam}>
          <Plus className="h-3 w-3" /> Inscribir Equipo
        </Button>
      </CardFooter>
    </Card>
  );
}
