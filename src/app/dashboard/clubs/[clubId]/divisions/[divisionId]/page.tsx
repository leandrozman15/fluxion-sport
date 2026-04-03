
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
  ArrowRight,
  Pencil,
  UserRound,
  Users,
  Settings2,
  Layers,
  Search,
  UserPlus,
  ShieldCheck,
  LayoutGrid,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where, getDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function CategoryAdminPage() {
  const { clubId, divisionId } = useParams() as { clubId: string, divisionId: string };
  const { user, firestore } = useFirebase();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [newTeam, setNewTeam] = useState({ 
    name: "", 
    coachId: "", 
    coachName: "", 
    season: new Date().getFullYear().toString() 
  });

  // 0. Seguridad de Roles
  useEffect(() => {
    async function checkAccess() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          // Bloquear si es Coach Nivel 2 (sujeto a lógica de negocio)
          if (role === 'coach_lvl2') {
            toast({ variant: "destructive", title: "Acceso Denegado", description: "Tu nivel de usuario no permite administrar categorías." });
            router.replace('/dashboard/coach');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAccess();
  }, [user, firestore, router, toast]);

  // 1. Datos de la Categoría (División)
  const divRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId), [db, clubId, divisionId]);
  const { data: category, isLoading: divLoading } = useDoc(divRef);

  // 2. Subcategorías (Equipos)
  const teamsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams"), [db, clubId, divisionId]);
  const { data: teams, isLoading: teamsLoading } = useCollection(teamsQuery);

  // 3. Pool de Jugadores (Filtrados por esta categoría específica)
  const playersQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "players"), where("divisionId", "==", divisionId))
  , [db, clubId, divisionId]);
  const { data: allPlayers, isLoading: playersLoading } = useCollection(playersQuery);

  // 4. Staff Técnico (Todos los coaches del club con roles nivel 1 y 2)
  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId), 
      where("role", "in", ["coach", "coach_lvl1", "coach_lvl2", "coordinator"])
    )
  , [db, clubId]);
  const { data: allCoaches } = useCollection(coachesQuery);

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.coachId) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Nombre y Coach son obligatorios." });
      return;
    }

    try {
      const teamId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams")).id;
      const teamDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId);
      
      await setDoc(teamDoc, {
        ...newTeam,
        id: teamId,
        divisionId,
        clubId,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Subcategoría Creada", description: `El equipo ${newTeam.name} ha sido registrado.` });
      setNewTeam({ name: "", coachId: "", coachName: "", season: new Date().getFullYear().toString() });
      setIsCreateTeamOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al crear" });
    }
  };

  const handleSelectCoach = (val: string) => {
    const selected = allCoaches?.find(c => c.id === val);
    if (selected) {
      setNewTeam({ 
        ...newTeam, 
        coachId: selected.id, 
        coachName: selected.name || `${selected.firstName} ${selected.lastName}` 
      });
    }
  };

  if (authLoading || divLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  const filteredPlayers = allPlayers?.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dni?.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions`} className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a categorías
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Admin Categoría: {category?.name}</h1>
              <Badge className="bg-white text-primary border-none uppercase font-black px-3 h-7">{category?.sport}</Badge>
            </div>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión de planteles, profesores y asignaciones.</p>
          </div>
          <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-xs tracking-widest px-8 shadow-2xl">
                <Plus className="h-5 w-5 mr-2" /> Crear Subcategoría
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-none shadow-2xl rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Nueva Subcategoría</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Crea un equipo específico dentro de {category?.name}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Equipo</Label>
                  <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. Novena A, Sub 14 Blanca..." className="h-12 border-2 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Profesor Responsable (Nivel 1/2)</Label>
                  <Select value={newTeam.coachId} onValueChange={handleSelectCoach}>
                    <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {allCoaches?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="font-bold">
                          {c.name || `${c.firstName} ${c.lastName}`}
                          <span className="ml-2 opacity-50 text-[10px]">({c.role === 'coach_lvl1' ? 'Nivel 1' : c.role === 'coach_lvl2' ? 'Nivel 2' : 'Coach'})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Temporada</Label>
                  <Input value={newTeam.season} onChange={e => setNewTeam({...newTeam, season: e.target.value})} className="h-12 border-2 font-bold" />
                </div>
              </div>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t mt-4 rounded-b-[2rem]">
                <Button variant="ghost" onClick={() => setIsCreateTeamOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                <Button onClick={handleCreateTeam} disabled={!newTeam.name || !newTeam.coachId} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Confirmar Creación</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="bg-white/15 backdrop-blur-md p-1 border border-white/20 mb-8 inline-flex rounded-2xl h-14 shadow-2xl">
          <TabsTrigger value="teams" className="gap-2 px-8 h-12 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
            <LayoutGrid className="h-4 w-4" /> Subcategorías
          </TabsTrigger>
          <TabsTrigger value="players" className="gap-2 px-8 h-12 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
            <Users className="h-4 w-4" /> Pool Jugadores
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 px-8 h-12 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
            <UserRound className="h-4 w-4" /> Staff Técnico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamsLoading ? <Loader2 className="animate-spin text-white mx-auto" /> : teams?.map((team: any) => (
              <Card key={team.id} className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase tracking-widest">{team.season}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", team.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-black text-slate-900 mt-2">{team.name}</CardTitle>
                  <CardDescription className="font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                    <UserRound className="h-3.5 w-3.5 text-primary" /> Prof. {team.coachName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                      {[1,2,3].map(i => (
                        <Avatar key={i} className="h-8 w-8 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-[8px] font-black text-slate-400">J</AvatarFallback>
                        </Avatar>
                      ))}
                      <div className="h-8 w-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                        +
                      </div>
                    </div>
                    <Button asChild size="sm" className="font-black uppercase text-[9px] tracking-widest h-9 rounded-xl">
                      <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${team.id}`}>Gestionar Plantel</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="players" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-6 px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 uppercase">Padrón de la Categoría</CardTitle>
                  <CardDescription className="font-bold text-slate-500">Jugadores asignados oficialmente a esta división.</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Nombre o DNI..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-11 border-2 rounded-xl"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {playersLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : filteredPlayers?.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">
                    No hay jugadores asignados a esta categoría todavía.
                  </div>
                ) : filteredPlayers?.map((player: any) => (
                  <div key={player.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-10 border-2 border-slate-100 shadow-sm rounded-xl">
                        <AvatarImage src={player.photoUrl} className="object-cover" />
                        <AvatarFallback className="font-black text-slate-300">{player.firstName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-slate-900 leading-none">{player.firstName} {player.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">DNI: {player.dni}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-full hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                        <Link href={`/dashboard/clubs/${clubId}/players`}><ChevronRight className="h-5 w-5" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCoaches?.map((coach: any) => (
              <Card key={coach.id} className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-slate-50 shadow-md rounded-2xl">
                      <AvatarImage src={coach.photoUrl} className="object-cover" />
                      <AvatarFallback className="bg-primary/5 text-primary font-black"><UserRound /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-lg leading-none truncate">{coach.name || `${coach.firstName} ${coach.lastName}`}</p>
                      <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter mt-1">
                        {coach.role === 'coordinator' ? 'COORDINADOR' : coach.role === 'coach_lvl1' ? 'NIVEL 1' : coach.role === 'coach_lvl2' ? 'NIVEL 2' : 'ENTRENADOR'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad: Vigente</span>
                    <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5">Perfil Staff</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
