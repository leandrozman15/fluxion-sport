
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ArrowRight,
  Pencil,
  Layers,
  LayoutDashboard,
  UserRound,
  Users,
  CreditCard,
  Clock,
  PlusCircle,
  X,
  ShoppingBag,
  ChevronLeft,
  Activity,
  ChevronRight,
  Table as TableIcon,
  UserCheck,
  ShieldCheck,
  Search,
  Target,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrainingSession {
  day: string;
  time: string;
}

export default function ClubCategoriesListPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<any>(null);
  
  const [newDiv, setNewDiv] = useState({ 
    name: "", 
    description: "", 
    sport: "hockey",
    gender: "femenino",
    coachId: "",
    coachName: "",
    trainingSessions: [{ day: "", time: "" }] as TrainingSession[]
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: categories, isLoading: divsLoading } = useCollection(divisionsQuery);

  const staffQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId), 
      where("role", "in", ["coach", "coach_lvl1", "coach_lvl2", "coordinator", "club_admin", "admin"])
    )
  , [db, clubId]);
  const { data: staff } = useCollection(staffQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateDiv = () => {
    if (!newDiv.name) return;
    const divId = doc(collection(db, "clubs", clubId, "divisions")).id;
    const divDoc = doc(db, "clubs", clubId, "divisions", divId);
    
    setDoc(divDoc, {
      ...newDiv,
      id: divId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewDiv({ name: "", description: "", sport: "hockey", gender: "femenino", coachId: "", coachName: "", trainingSessions: [{ day: "", time: "" }] });
    setIsCreateOpen(false);
    toast({ title: "Categoría Creada" });
  };

  const handleUpdateDiv = () => {
    if (!editingDiv) return;
    const divDoc = doc(db, "clubs", clubId, "divisions", editingDiv.id);
    updateDocumentNonBlocking(divDoc, {
      name: editingDiv.name || "",
      description: editingDiv.description || "",
      sport: editingDiv.sport || "hockey",
      gender: editingDiv.gender || "femenino",
      coachId: editingDiv.coachId || "",
      coachName: editingDiv.coachName || "",
      trainingSessions: editingDiv.trainingSessions || []
    });
    setIsEditOpen(false);
    toast({ title: "Categoría Actualizada" });
  };

  const handleDeleteDiv = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
    toast({ variant: "destructive", title: "Rama Eliminada", description: "La categoría y sus datos han sido removidos." });
  };

  const handleSelectCoach = (val: string, isEdit = false) => {
    const selected = staff?.find(s => s.id === val);
    if (selected) {
      const name = selected.name || `${selected.firstName} ${selected.lastName}`;
      if (isEdit) {
        setEditingDiv({ ...editingDiv, coachId: val, coachName: name });
      } else {
        setNewDiv({ ...newDiv, coachId: val, coachName: name });
      }
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20 px-4 md:px-0">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Ramas y Categorías</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Organización jerárquica deportiva.</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest bg-white text-primary hover:bg-slate-50">
                  <Plus className="h-5 w-5" /> Nueva Rama
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-900">Crear Rama Deportiva</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Define una nueva área de competencia y asigna un responsable.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Disciplina</Label>
                    <Tabs value={newDiv.sport} onValueChange={v => setNewDiv({...newDiv, sport: v})} className="w-full">
                      <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="hockey" className="font-bold uppercase text-[10px]">🏑 Hockey</TabsTrigger>
                        <TabsTrigger value="rugby" className="font-bold uppercase text-[10px]">🏉 Rugby</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Nombre de la Rama</Label>
                    <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. Rama Femenina, Juveniles..." className="h-12 border-2 font-bold" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Entrenador Responsable (Nivel 1 o 2)</Label>
                    <Select value={newDiv.coachId} onValueChange={(v) => handleSelectCoach(v, false)}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar Entrenador..." /></SelectTrigger>
                      <SelectContent>
                        {staff?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id} className="font-bold">
                            {s.name || `${s.firstName} ${s.lastName}`}
                            <span className="ml-2 opacity-50 text-[10px]">({s.role === 'coach_lvl1' ? 'Nivel 1' : s.role === 'coach_lvl2' ? 'Nivel 2' : 'Staff'})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t rounded-b-[2.5rem]">
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                  <Button onClick={handleCreateDiv} disabled={!newDiv.name} className="font-black uppercase text-xs tracking-widest h-12 px-8 shadow-lg">Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="space-y-4">
          {divsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {categories?.map((division: any) => (
                <CategoryRow 
                  key={division.id} 
                  division={division} 
                  clubId={clubId}
                  onEdit={(e) => { e.stopPropagation(); setEditingDiv(division); setIsEditOpen(true); }}
                  onDelete={() => handleDeleteDiv(division.id)}
                />
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-xl font-black text-slate-900">Editar Rama</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Nombre</Label>
              <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} className="h-12 border-2 font-bold" />
            </div>
            
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Entrenador Responsable</Label>
              <Select value={editingDiv?.coachId || ""} onValueChange={(v) => handleSelectCoach(v, true)}>
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar Entrenador..." /></SelectTrigger>
                <SelectContent>
                  {staff?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="font-bold">
                      {s.name || `${s.firstName} ${s.lastName}`}
                      <span className="ml-2 opacity-50 text-[10px]">({s.role === 'coach_lvl1' ? 'Nivel 1' : s.role === 'coach_lvl2' ? 'Nivel 2' : 'Staff'})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t rounded-b-[2.5rem]">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleUpdateDiv} className="font-black uppercase text-xs tracking-widest h-12 px-8 shadow-lg">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryRow({ division, clubId, onEdit, onDelete }: { division: any, clubId: string, onEdit: (e: any) => void, onDelete: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", coachId: "", coachName: "", season: "2025" });

  const teamsQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", division.id, "teams"),
    [db, clubId, division.id]
  );
  const { data: teams } = useCollection(teamsQuery);

  const playersQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "players"), where("divisionId", "==", division.id)),
    [db, clubId, division.id]
  );
  const { data: players, isLoading: playersLoading } = useCollection(playersQuery);

  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId), 
      where("role", "in", ["coach", "coach_lvl1", "coach_lvl2", "coordinator", "club_admin", "admin"])
    )
  , [db, clubId]);
  const { data: coaches } = useCollection(coachesQuery);

  const handleCreateTeam = () => {
    if (!newTeam.name || !newTeam.coachId) return;
    const teamId = doc(collection(db, "clubs", clubId, "divisions", division.id, "teams")).id;
    const teamDoc = doc(db, "clubs", clubId, "divisions", division.id, "teams", teamId);
    
    setDoc(teamDoc, {
      ...newTeam,
      id: teamId,
      divisionId: division.id,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewTeam({ name: "", coachId: "", coachName: "", season: "2025" });
    setIsTeamDialogOpen(false);
    toast({ title: "Equipo Creado" });
  };

  const handleSelectCoach = (val: string) => {
    const selected = coaches?.find(c => c.id === val);
    if (selected) {
      setNewTeam({ 
        ...newTeam, 
        coachId: selected.id, 
        coachName: selected.name || `${selected.firstName} ${selected.lastName}` 
      });
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "--";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <AccordionItem value={division.id} className="border-none rounded-2xl bg-white shadow-xl overflow-hidden px-0 mb-4 transition-all group">
      <div className="flex items-center px-6 py-5">
        <div className="flex-1 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl">
            {division.sport === 'rugby' ? <Activity className="h-7 w-7 text-primary" /> : <Layers className="h-7 w-7 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-slate-800 text-white font-black text-[8px] px-2 h-4 uppercase">{division.sport?.toUpperCase()}</Badge>
              <Badge variant="outline" className="border-primary text-primary font-black text-[8px] px-2 h-4 uppercase">{division.gender || 'Femenino'}</Badge>
              <Badge className="bg-primary/5 text-primary border-none font-black text-[8px] px-2 h-4 uppercase flex items-center gap-1">
                <Users className="h-2.5 w-2.5" /> {players?.length || 0} Jugadoras
              </Badge>
            </div>
            <h3 className="font-black text-xl text-slate-900 leading-none">{division.name}</h3>
            {division.coachName && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <UserRound className="h-3 w-3 text-primary" /> Dirige: {division.coachName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="h-10 gap-2 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[9px] tracking-widest"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/standings`}><TableIcon className="h-4 w-4" /> Tabla</Link>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onEdit} 
            className="h-10 w-10 p-0 text-slate-400 hover:text-primary rounded-xl"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 text-slate-300 hover:text-destructive rounded-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white border-none shadow-2xl rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Confirmas la baja?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-slate-500">
                  Estás a punto de eliminar la rama <strong>{division.name}</strong>. Esta acción removerá todas sus subcategorías, equipos y registros de forma permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-4">
                <AlertDialogCancel className="font-bold border-2 rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase text-xs tracking-widest rounded-xl px-8 h-11"
                >
                  Eliminar Rama
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AccordionTrigger className="hover:no-underline py-0 ml-2" />
        </div>
      </div>

      <AccordionContent className="border-t bg-slate-50/50 p-6">
        <div className="space-y-8">
          {/* SECCIÓN DE EQUIPOS */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Subcategorías / Equipos</h4>
              <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 gap-2 text-[9px] font-black uppercase tracking-widest bg-primary text-white shadow-lg">
                    <Plus className="h-3.5 w-3.5" /> Agregar Equipo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900">Nuevo Equipo: {division.name}</DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">Crea un equipo específico dentro de esta rama.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Equipo</Label>
                      <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. Primera A, Sub 12 Blanca..." className="h-12 border-2 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Profesor Responsable (Nivel 1/2)</Label>
                      <Select value={newTeam.coachId} onValueChange={handleSelectCoach}>
                        <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar Entrenador..." /></SelectTrigger>
                        <SelectContent>
                          {coaches?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id} className="font-bold">
                              {c.name || `${c.firstName} ${c.lastName}`} 
                              <span className="ml-2 opacity-50 text-[10px]">({c.role === 'coach_lvl1' ? 'Nivel 1' : c.role === 'coach_lvl2' ? 'Nivel 2' : 'Staff'})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t rounded-b-[2.5rem]">
                    <Button variant="ghost" onClick={() => setIsTeamDialogOpen(false)} className="font-bold">Cancelar</Button>
                    <Button onClick={handleCreateTeam} disabled={!newTeam.name || !newTeam.coachId} className="font-black uppercase text-xs tracking-widest h-12 px-8 shadow-lg">Confirmar Equipo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams?.map((team: any) => (
                <Card key={team.id} className="border-none shadow-xl hover:scale-105 transition-all bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">{team.season}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-slate-300 hover:text-destructive" 
                        onClick={(e) => { e.stopPropagation(); deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", division.id, "teams", team.id)); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <CardTitle className="text-base font-black text-slate-900">{team.name}</CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase text-primary flex items-center gap-1.5 mt-1">
                      <UserRound className="h-3 w-3" /> Coach: {team.coachName}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <Button asChild size="sm" className="w-full h-10 font-black uppercase text-[9px] tracking-widest gap-2 rounded-xl">
                      <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/teams/${team.id}`}>Gestionar <ChevronRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {(!teams || teams.length === 0) && (
                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-2xl opacity-30 bg-slate-100/50">
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin equipos registrados</p>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN DE JUGADORAS (Padrón Detallado) */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Padrón de la Categoría</h4>
            
            <div className="bg-white rounded-3xl border-2 border-slate-50 shadow-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-4">Jugadora</div>
                <div className="col-span-2 text-center">Edad</div>
                <div className="col-span-3 text-center">Posición</div>
                <div className="col-span-1 text-center">PJ</div>
                <div className="col-span-1 text-center">G</div>
                <div className="col-span-1 text-right">Ficha</div>
              </div>
              
              <div className="divide-y divide-slate-50">
                {playersLoading ? (
                  <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-primary h-6 w-6" /></div>
                ) : players && players.length > 0 ? (
                  players.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors group">
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-8 border-2 border-slate-100 shadow-sm rounded-lg">
                          <AvatarImage src={p.photoUrl} className="object-cover" />
                          <AvatarFallback className="font-black text-slate-300 text-[10px]">{p.firstName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate leading-none">{p.firstName} {p.lastName}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">DNI: {p.dni}</p>
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-center">
                        <Badge variant="outline" className="font-black text-[10px] rounded-lg border-slate-200">
                          {calculateAge(p.birthDate)} años
                        </Badge>
                      </div>
                      
                      <div className="col-span-3 text-center">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">
                          {p.position || "Sin definir"}
                        </span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-black text-primary">0</span>
                      </div>
                      
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-black text-accent">0</span>
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                          <Link href={`/dashboard/clubs/${clubId}/players`}><ChevronRight className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center opacity-30 italic">
                    <p className="text-[10px] font-black uppercase tracking-widest">Aún no hay jugadoras federadas en esta rama.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
