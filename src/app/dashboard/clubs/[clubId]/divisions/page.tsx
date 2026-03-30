
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
  ShieldCheck,
  UserRound,
  Users,
  CreditCard,
  Calendar,
  Clock,
  PlusCircle,
  X,
  ShoppingBag,
  ChevronDown,
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
    trainingSessions: [{ day: "", time: "" }] as TrainingSession[]
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: categories, isLoading: divsLoading } = useCollection(divisionsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
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
    
    setNewDiv({ name: "", description: "", trainingSessions: [{ day: "", time: "" }] });
    setIsCreateOpen(false);
    toast({ title: "Categoría Creada" });
  };

  const handleUpdateDiv = () => {
    if (!editingDiv) return;
    const divDoc = doc(db, "clubs", clubId, "divisions", editingDiv.id);
    updateDocumentNonBlocking(divDoc, {
      name: editingDiv.name || "",
      description: editingDiv.description || "",
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Gestión de Categorías</h1>
              <p className="text-muted-foreground">{club?.name} • Organización de ramas y equipos.</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6">
                  <Plus className="h-5 w-5" /> Nueva Categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Categoría</DialogTitle>
                  <DialogDescription>Define una rama deportiva y su cronograma base.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Categoría</Label>
                      <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. Damas o Sub 15" />
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
                              <Input value={session.day} onChange={e => updateSession(idx, 'day', e.target.value)} placeholder="Ej. Lunes" className="h-8 text-xs" />
                            </div>
                            <div className="flex-1">
                              <Input value={session.time} onChange={e => updateSession(idx, 'time', e.target.value)} placeholder="19:00 a 20:30" className="h-8 text-xs" />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeSession(idx)} className="h-8 w-8 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateDiv} disabled={!newDiv.name}>Crear Categoría</Button>
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
          {categories?.length === 0 && !divsLoading && (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/10 opacity-50">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">Aún no hay categorías registradas.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Categoría</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} />
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
                      <Input value={session.day} onChange={e => updateSession(idx, 'day', e.target.value, true)} className="h-8 text-xs" />
                      <Input value={session.time} onChange={e => updateSession(idx, 'time', e.target.value, true)} className="h-8 text-xs" />
                      <Button variant="ghost" size="sm" onClick={() => removeSession(idx, true)} className="h-8 w-8 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDiv}>Guardar Cambios</Button>
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
  const [newTeam, setNewTeam] = useState({ name: "", coachName: "", season: "2025" });

  const teamsQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", division.id, "teams"),
    [db, clubId, division.id]
  );
  const { data: teams, isLoading } = useCollection(teamsQuery);

  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId), where("role", "==", "coach")),
    [db, clubId]
  );
  const { data: coaches } = useCollection(coachesQuery);

  const handleCreateTeam = () => {
    const teamId = doc(collection(db, "clubs", clubId, "divisions", division.id, "teams")).id;
    const teamDoc = doc(db, "clubs", clubId, "divisions", division.id, "teams", teamId);
    
    setDoc(teamDoc, {
      ...newTeam,
      id: teamId,
      divisionId: division.id,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewTeam({ name: "", coachName: "", season: "2025" });
    setIsTeamDialogOpen(false);
    toast({ title: "Equipo Creado" });
  };

  const handleDeleteTeam = (teamId: string) => {
    if(confirm("¿Eliminar este equipo?")) {
      deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", division.id, "teams", teamId));
      toast({ variant: "destructive", title: "Equipo Eliminado" });
    }
  };

  return (
    <AccordionItem value={division.id} className="border-2 rounded-2xl bg-card shadow-sm overflow-hidden px-0">
      <div className="flex items-center px-6 py-4 group">
        <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:w-1/4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-lg">{division.name}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{teams?.length || 0} Equipos</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-2">
            {division.trainingSessions?.map((s: any, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-muted/50 border-none text-[10px] py-1 gap-1.5 font-bold">
                <Clock className="h-3 w-3 opacity-50" /> {s.day} • {s.time}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/5" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-red-50" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          <AccordionTrigger className="hover:no-underline py-0 ml-2" />
        </div>
      </div>

      <AccordionContent className="border-t bg-muted/5 p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Plantillas de Competición
            </h4>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Plus className="h-3 w-3" /> Nuevo Equipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Equipo: {division.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre del Equipo</Label>
                    <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. Primera A" />
                  </div>
                  <div className="space-y-2">
                    <Label>Entrenador</Label>
                    <Select value={newTeam.coachName} onValueChange={v => setNewTeam({...newTeam, coachName: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {coaches?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Temporada</Label>
                    <Input value={newTeam.season} onChange={e => setNewTeam({...newTeam, season: e.target.value})} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateTeam} disabled={!newTeam.name || !newTeam.coachName}>Crear Equipo</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              teams?.map((team: any) => (
                <Card key={team.id} className="border-2 hover:border-primary/30 transition-all shadow-sm group/team">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-bold">{team.name}</CardTitle>
                      <Badge variant="outline" className="text-[9px]">{team.season}</Badge>
                    </div>
                    <CardDescription className="text-[10px] flex items-center gap-1.5 font-medium mt-1">
                      <UserRound className="h-3 w-3" /> Coach: {team.coachName}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-4 border-t bg-muted/10 flex justify-between gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive opacity-0 group-hover/team:opacity-100 transition-opacity" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1 h-8 text-[10px] font-black uppercase tracking-tight gap-2">
                      <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/teams/${team.id}`}>
                        Gestionar Plantilla <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
            {teams?.length === 0 && !isLoading && (
              <div className="col-span-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center opacity-40">
                <Trophy className="h-8 w-8 mb-2" />
                <p className="text-xs font-bold uppercase">Sin equipos registrados</p>
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
