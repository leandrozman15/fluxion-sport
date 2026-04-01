
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
  Table as TableIcon
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
    if(confirm("¿Seguro que deseas eliminar esta categoría? Se perderán todos los datos asociados.")) {
      deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
      toast({ variant: "destructive", title: "Categoría Eliminada" });
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

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
              <DialogContent className="max-w-md bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-900">Crear Rama Deportiva</DialogTitle>
                  <DialogDescription>Define una nueva área de competencia para el club.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Disciplina</Label>
                    <Tabs value={newDiv.sport} onValueChange={v => setNewDiv({...newDiv, sport: v})} className="w-full">
                      <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                        <TabsTrigger value="hockey" className="font-bold uppercase text-[10px]">🏑 Hockey</TabsTrigger>
                        <TabsTrigger value="rugby" className="font-bold uppercase text-[10px]">🏉 Rugby</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Nombre de la Rama</Label>
                    <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. Rama Femenina, Juveniles..." className="h-12 border-2 font-bold" />
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateDiv} disabled={!newDiv.name} className="font-black uppercase text-xs tracking-widest h-12 px-8">Confirmar</Button>
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
                  onEdit={() => { setEditingDiv(division); setIsEditOpen(true); }}
                  onDelete={() => handleDeleteDiv(division.id)}
                />
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black text-slate-900">Editar Rama</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Nombre</Label>
              <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} className="h-12 border-2 font-bold" />
            </div>
          </div>
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
  const [newTeam, setNewTeam] = useState({ name: "", coachId: "", coachName: "", season: "2025" });

  const teamsQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", division.id, "teams"),
    [db, clubId, division.id]
  );
  const { data: teams, isLoading } = useCollection(teamsQuery);

  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId), where("role", "in", ["coach", "coordinator"]))
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
      setNewTeam({ ...newTeam, coachId: selected.id, coachName: selected.name || `${selected.firstName} ${selected.lastName}` });
    }
  };

  return (
    <AccordionItem value={division.id} className="border-none rounded-2xl bg-white shadow-xl overflow-hidden px-0 mb-4 transition-all">
      <div className="flex items-center px-6 py-5">
        <div className="flex-1 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl">
            {division.sport === 'rugby' ? <Activity className="h-7 w-7 text-primary" /> : <Layers className="h-7 w-7 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-slate-900 text-white font-black text-[8px] px-2 h-4 uppercase">{division.sport?.toUpperCase()}</Badge>
              <Badge variant="outline" className="border-primary text-primary font-black text-[8px] px-2 h-4 uppercase">{division.gender || 'Femenino'}</Badge>
            </div>
            <h3 className="font-black text-xl text-slate-900 leading-none">{division.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="h-10 gap-2 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[9px] tracking-widest">
            <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/standings`}><TableIcon className="h-4 w-4" /> Tabla</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-4 w-4 text-slate-400" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          <AccordionTrigger className="hover:no-underline py-0 ml-2" />
        </div>
      </div>

      <AccordionContent className="border-t bg-slate-50/50 p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Subcategorías / Equipos</h4>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-2 text-[9px] font-black uppercase tracking-widest bg-slate-900">
                  <Plus className="h-3.5 w-3.5" /> Agregar Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle className="font-black">Nuevo Equipo: {division.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nombre</Label>
                    <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. Primera A, Sub 12 Blanca..." className="h-12 border-2 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Profesor / Coach</Label>
                    <Select value={newTeam.coachId} onValueChange={handleSelectCoach}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {coaches?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="font-bold">{c.name || `${c.firstName} ${c.lastName}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
                  <Button onClick={handleCreateTeam} disabled={!newTeam.name || !newTeam.coachId} className="font-black uppercase text-xs tracking-widest h-12 w-full">Confirmar Equipo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.map((team: any) => (
              <Card key={team.id} className="border-none shadow-xl hover:scale-105 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[8px] font-black uppercase">{team.season}</Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", division.id, "teams", team.id))}><X className="h-3 w-3" /></Button>
                  </div>
                  <CardTitle className="text-base font-black">{team.name}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase text-primary">Coach: {team.coachName}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Button asChild size="sm" className="w-full h-10 font-black uppercase text-[9px] tracking-widest gap-2">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}/teams/${team.id}`}>Gestionar <ChevronRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
