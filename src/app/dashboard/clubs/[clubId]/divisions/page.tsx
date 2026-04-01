
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
  Activity
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
    trainingSessions: [{ day: "", time: "" }] as TrainingSession[]
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: categories, isLoading: divsLoading } = useCollection(divisionsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const addSession = (isEdit = false) => {
    const newSession = { day: "", time: "" };
    if (isEdit) {
      setEditingDiv((prev: any) => ({ ...prev, trainingSessions: [...(prev.trainingSessions || []), newSession] }));
    } else {
      setNewDiv(prev => ({ ...prev, trainingSessions: [...prev.trainingSessions, newSession] }));
    }
  };

  const updateSession = (index: number, field: keyof TrainingSession, value: string, isEdit = false) => {
    if (isEdit) {
      const updated = [...(editingDiv.trainingSessions || [])];
      updated[index] = { ...updated[index], [field]: value };
      setEditingDiv({ ...editingDiv, trainingSessions: updated });
    } else {
      const updated = [...newDiv.trainingSessions];
      updated[index] = { ...updated[index], [field]: value };
      setNewDiv({ ...newDiv, trainingSessions: updated });
    }
  };

  const removeSession = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditingDiv((prev: any) => ({
        ...prev,
        trainingSessions: prev.trainingSessions.filter((_: any, i: number) => i !== index)
      }));
    } else {
      setNewDiv(prev => ({
        ...prev,
        trainingSessions: prev.trainingSessions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleCreateDiv = () => {
    const divId = doc(collection(db, "clubs", clubId, "divisions")).id;
    const divDoc = doc(db, "clubs", clubId, "divisions", divId);
    
    setDoc(divDoc, {
      ...newDiv,
      id: divId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewDiv({ name: "", description: "", sport: "hockey", gender: "femenino", trainingSessions: [{ day: "", time: "" }] });
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
      trainingSessions: editingDiv.trainingSessions || []
    });
    setIsEditOpen(false);
    toast({ title: "Categoría Actualizada" });
  };

  const handleDeleteDiv = (id: string) => {
    if(confirm("¿Seguro que deseas eliminar esta categoría y todos sus equipos asociados?")) {
      deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
      toast({ variant: "destructive", title: "Categoría Eliminada" });
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col gap-4">
          <Link href={`/dashboard/clubs/${clubId}`} className="ambient-link group">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel del club
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-headline tracking-tight">Gestión de Categorías</h1>
              <p className="ambient-text text-lg font-bold">{club?.name} • Organización de ramas y equipos.</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest">
                  <Plus className="h-5 w-5" /> Nueva Categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-900">Crear Categoría</DialogTitle>
                  <DialogDescription>Define una rama deportiva y su cronograma base.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Disciplina</Label>
                        <Tabs value={newDiv.sport} onValueChange={v => setNewDiv({...newDiv, sport: v})} className="w-full">
                          <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                            <TabsTrigger value="hockey" className="font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">🏑 Hockey</TabsTrigger>
                            <TabsTrigger value="rugby" className="font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">🏉 Rugby</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Género / Rama</Label>
                        <Select value={newDiv.gender} onValueChange={v => setNewDiv({...newDiv, gender: v})}>
                          <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="femenino" className="font-bold">Femenino</SelectItem>
                            <SelectItem value="masculino" className="font-bold">Masculino</SelectItem>
                            <SelectItem value="mixto" className="font-bold">Mixto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Nombre de la Categoría</Label>
                      <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. 1ra División, Sub 15..." className="h-12 border-2 font-bold" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary">Días de Entrenamiento</Label>
                        <Button variant="ghost" size="sm" onClick={() => addSession()} className="h-7 text-[10px] gap-1 bg-primary/5 text-primary">
                          <PlusCircle className="h-3 w-3" /> Agregar Día
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {newDiv.trainingSessions.map((session, idx) => (
                          <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                            <div className="flex-1">
                              <Input value={session.day} onChange={e => updateSession(idx, 'day', e.target.value)} placeholder="Ej. Lunes" className="h-8 text-xs font-bold" />
                            </div>
                            <div className="flex-1">
                              <Input value={session.time} onChange={e => updateSession(idx, 'time', e.target.value)} placeholder="19:00 a 20:30" className="h-8 text-xs font-bold" />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeSession(idx)} className="h-8 w-8 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="font-bold">Cancelar</Button>
                  <Button onClick={handleCreateDiv} disabled={!newDiv.name} className="font-black uppercase text-xs tracking-widest h-12 px-8">Confirmar Categoría</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="space-y-4">
          {divsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {categories?.map((division: any) => (
                <CategoryRow 
                  key={division.id} 
                  division={division} 
                  clubId={clubId}
                  onEdit={() => { setEditingDiv(division); setIsEditOpen(true); }}
                  onDelete={() => handleDeleteDiv(division.id)}
                />
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="text-xl font-black text-slate-900">Editar Categoría</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Disciplina</Label>
                  <Tabs value={editingDiv?.sport || "hockey"} onValueChange={v => setEditingDiv({...editingDiv, sport: v})} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                      <TabsTrigger value="hockey" className="font-bold uppercase text-xs">🏑 Hockey</TabsTrigger>
                      <TabsTrigger value="rugby" className="font-bold uppercase text-xs">🏉 Rugby</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Género / Rama</Label>
                  <Select value={editingDiv?.gender || "femenino"} onValueChange={v => setEditingDiv({...editingDiv, gender: v})}>
                    <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="femenino" className="font-bold">Femenino</SelectItem>
                      <SelectItem value="masculino" className="font-bold">Masculino</SelectItem>
                      <SelectItem value="mixto" className="font-bold">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Nombre</Label>
                <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} className="h-12 border-2 font-bold" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary">Horarios</Label>
                  <Button variant="ghost" size="sm" onClick={() => addSession(true)} className="h-7 text-[10px] gap-1 bg-primary/5">
                    <PlusCircle className="h-3 w-3" /> Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editingDiv?.trainingSessions || []).map((session: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                      <Input value={session.day} onChange={e => updateSession(idx, 'day', e.target.value, true)} className="h-8 text-xs font-bold" />
                      <Input value={session.time} onChange={e => updateSession(idx, 'time', e.target.value, true)} className="h-8 text-xs font-bold" />
                      <Button variant="ghost" size="sm" onClick={() => removeSession(idx, true)} className="h-8 w-8 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDiv} className="font-black uppercase text-xs tracking-widest h-12 px-8">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryRow({ division, clubId, onEdit, onDelete }: { division: any, clubId: string, onEdit: () => void, onDelete: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", coachId: "", coachName: "", coachEmail: "", season: "2026" });

  const teamsQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", division.id, "teams"),
    [db, clubId, division.id]
  );
  const { data: teams, isLoading } = useCollection(teamsQuery);

  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId), 
      where("role", "in", ["coach", "coordinator", "club_admin"])
    ),
    [db, clubId]
  );
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
    
    setNewTeam({ name: "", coachId: "", coachName: "", coachEmail: "", season: "2026" });
    setIsTeamDialogOpen(false);
    toast({ title: "Equipo Creado" });
  };

  const handleDeleteTeam = (teamId: string) => {
    if(confirm("¿Eliminar este equipo?")) {
      deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", division.id, "teams", teamId));
      toast({ variant: "destructive", title: "Equipo Eliminado" });
    }
  };

  const handleSelectCoach = (val: string) => {
    const selected = coaches?.find(c => c.id === val);
    if (selected) {
      setNewTeam({ 
        ...newTeam, 
        coachId: selected.id, 
        coachName: selected.name || (selected.firstName + " " + selected.lastName),
        coachEmail: selected.email || ""
      });
    }
  };

  return (
    <AccordionItem value={division.id} className="border-2 rounded-2xl bg-white shadow-sm overflow-hidden px-0 mb-4">
      <div className="flex items-center px-6 py-5 group">
        <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-4 lg:w-1/3">
            <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
              {division.sport === 'rugby' ? <Activity className="h-7 w-7 text-primary" /> : <Layers className="h-7 w-7 text-primary" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-slate-900 text-white font-black text-[9px] px-2 h-5 tracking-widest uppercase">
                  {division.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                </Badge>
                <Badge variant="outline" className="border-primary text-primary font-black text-[9px] px-2 h-5 tracking-widest uppercase">
                  {division.gender || 'Femenino'}
                </Badge>
              </div>
              <h3 className="font-black text-xl text-slate-900 leading-none">{division.name}</h3>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-1.5">{teams?.length || 0} Equipos Federados</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-2">
            {division.trainingSessions?.map((s: any, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-slate-50 border-slate-100 text-[10px] py-1.5 px-3 gap-2 font-black text-slate-600 rounded-lg">
                <Clock className="h-3.5 w-3.5 opacity-40 text-primary" /> {s.day} • {s.time}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-primary/5 text-slate-300 hover:text-primary transition-colors" onClick={onEdit}><Pencil className="h-5 w-5" /></Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-300 hover:text-destructive hover:bg-red-50 transition-colors" onClick={onDelete}><Trash2 className="h-5 w-5" /></Button>
          <AccordionTrigger className="hover:no-underline py-0 ml-2 h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-900 hover:bg-primary hover:text-white transition-all [&>svg]:h-6 [&>svg]:w-6 shadow-sm border border-slate-100" />
        </div>
      </div>

      <AccordionContent className="border-t bg-slate-50/30 p-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Plantillas de Competición
              </h4>
            </div>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-10 gap-3 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-xl px-6">
                  <Plus className="h-4 w-4" /> Nuevo Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle className="font-black text-2xl text-slate-900">Nuevo Equipo: {division.name}</DialogTitle></DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Nombre del Equipo</Label>
                    <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. Primera A..." className="h-12 border-2 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Entrenador Responsable</Label>
                    <Select value={newTeam.coachId} onValueChange={handleSelectCoach}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar Entrenador..." /></SelectTrigger>
                      <SelectContent>
                        {coaches?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="font-bold">
                            {c.name || `${c.firstName} ${c.lastName}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Temporada</Label>
                    <Input value={newTeam.season} onChange={e => setNewTeam({...newTeam, season: e.target.value})} className="h-12 border-2 font-bold" />
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
                  <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateTeam} disabled={!newTeam.name || !newTeam.coachId} className="font-black uppercase text-xs tracking-widest h-12 px-8">Confirmar Equipo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : (
              teams?.map((team: any) => (
                <Card key={team.id} className="border-none hover:border-primary/30 transition-all shadow-xl group/team bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="p-6 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="bg-primary/5 p-3 rounded-2xl mb-3">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-black border-slate-200 text-slate-400 uppercase tracking-widest">{team.season}</Badge>
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 group-hover/team:text-primary transition-colors">{team.name}</CardTitle>
                    <CardDescription className="text-[10px] flex items-center gap-2 font-black uppercase text-slate-400 mt-3 bg-slate-50 w-fit px-3 py-1.5 rounded-full border">
                      <UserRound className="h-3.5 w-3.5 text-primary" /> Coach: {team.coachName}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-6 pt-4 border-t bg-slate-50/50 flex justify-between gap-3">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-300 hover:text-destructive opacity-0 group-hover/team:opacity-100 transition-opacity" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button asChild size="sm" variant="default" className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/10">
                      <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/teams/${team.id}`}>
                        Gestionar Plantilla <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
