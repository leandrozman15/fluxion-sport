
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
  X
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrainingSession {
  day: string;
  time: string;
}

export default function ClubCategoriesListPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
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
  };

  const handleUpdateDiv = () => {
    if (!editingDiv) return;
    const divDoc = doc(db, "clubs", clubId, "divisions", editingDiv.id);
    updateDocumentNonBlocking(divDoc, {
      name: editingDiv.name,
      description: editingDiv.description,
      trainingSessions: editingDiv.trainingSessions
    });
    setIsEditOpen(false);
  };

  const handleDeleteDiv = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Categorías: {club?.name}</h1>
            <p className="text-muted-foreground">Ramas deportivas y niveles competitivos del club.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" suppressHydrationWarning>
                <Plus className="h-4 w-4" /> Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Categoría</DialogTitle>
                <DialogDescription>Añade una rama y define sus horarios de entrenamiento.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Categoría</Label>
                    <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. Damas" suppressHydrationWarning />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción Corta</Label>
                    <Input value={newDiv.description} onChange={e => setNewDiv({...newDiv, description: e.target.value})} placeholder="Ej. Rama femenina competitiva" suppressHydrationWarning />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary">Cronograma Semanal</Label>
                      <Button variant="ghost" size="sm" onClick={() => addSession()} className="h-7 text-[10px] gap-1" suppressHydrationWarning>
                        <PlusCircle className="h-3 w-3" /> Agregar Día
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {newDiv.trainingSessions.map((session, idx) => (
                        <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-bold">Día</Label>
                            <Input 
                              value={session.day} 
                              onChange={e => updateSession(idx, 'day', e.target.value)} 
                              placeholder="Ej. Martes"
                              className="h-8 text-xs"
                              suppressHydrationWarning
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-bold">Horario</Label>
                            <Input 
                              value={session.time} 
                              onChange={e => updateSession(idx, 'time', e.target.value)} 
                              placeholder="18:00 a 19:30"
                              className="h-8 text-xs"
                              suppressHydrationWarning
                            />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeSession(idx)} className="h-8 w-8 p-0 text-destructive" suppressHydrationWarning>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} suppressHydrationWarning>Cancelar</Button>
                <Button onClick={handleCreateDiv} disabled={!newDiv.name} suppressHydrationWarning>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {divsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          categories?.map((division: any) => (
            <Card key={division.id} className="hover:border-primary transition-all border-l-4 border-l-primary flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {division.name}
                  <Layers className="h-4 w-4 text-primary" />
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {division.description || "Gestión de equipos y planteles."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="space-y-1">
                  {division.trainingSessions?.map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/5 w-fit px-2 py-1 rounded-md border border-primary/10">
                      <Clock className="h-3 w-3" /> {s.day} • {s.time}
                    </div>
                  ))}
                  {(!division.trainingSessions || division.trainingSessions.length === 0) && division.trainingDays && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/5 w-fit px-2 py-1 rounded-md border border-primary/10">
                      <Clock className="h-3 w-3" /> {division.trainingDays} • {division.trainingTime}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDiv(division.id)} suppressHydrationWarning>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingDiv(division); setIsEditOpen(true); }} suppressHydrationWarning>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" variant="outline" suppressHydrationWarning>
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}`}>
                    Gestionar Equipos <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {categories?.length === 0 && !divsLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">Aún no hay categorías registradas en {club?.name}.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} suppressHydrationWarning />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={editingDiv?.description || ""} onChange={e => setEditingDiv({...editingDiv, description: e.target.value})} suppressHydrationWarning />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary">Cronograma Semanal</Label>
                  <Button variant="ghost" size="sm" onClick={() => addSession(true)} className="h-7 text-[10px] gap-1" suppressHydrationWarning>
                    <PlusCircle className="h-3 w-3" /> Agregar Día
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(editingDiv?.trainingSessions || []).map((session: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] font-bold">Día</Label>
                        <Input 
                          value={session.day} 
                          onChange={e => updateSession(idx, 'day', e.target.value, true)} 
                          className="h-8 text-xs"
                          suppressHydrationWarning
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] font-bold">Horario</Label>
                        <Input 
                          value={session.time} 
                          onChange={e => updateSession(idx, 'time', e.target.value, true)} 
                          className="h-8 text-xs"
                          suppressHydrationWarning
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSession(idx, true)} className="h-8 w-8 p-0 text-destructive" suppressHydrationWarning>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} suppressHydrationWarning>Cancelar</Button>
            <Button onClick={handleUpdateDiv} suppressHydrationWarning>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
