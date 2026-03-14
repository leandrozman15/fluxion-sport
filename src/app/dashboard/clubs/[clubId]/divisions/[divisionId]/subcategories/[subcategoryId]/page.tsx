
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
  UserRound,
  ArrowRight,
  Pencil,
  Table as TableIcon
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function TeamsPage() {
  const { clubId, divisionId, subcategoryId } = useParams() as { clubId: string, divisionId: string, subcategoryId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [newTeam, setNewTeam] = useState({ name: "", coachName: "", season: "2024-2025" });

  const subRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId), [db, clubId, divisionId, subcategoryId]);
  const { data: subcategory, isLoading: subLoading } = useDoc(subRef);

  const teamsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams"), [db, clubId, divisionId, subcategoryId]);
  const { data: teams, isLoading: teamsLoading } = useCollection(teamsQuery);

  const handleCreateTeam = () => {
    const teamId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams")).id;
    const teamDoc = doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId);
    
    setDoc(teamDoc, {
      ...newTeam,
      id: teamId,
      subcategoryId,
      divisionId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewTeam({ name: "", coachName: "", season: "2024-2025" });
    setIsCreateOpen(false);
  };

  const handleUpdateTeam = () => {
    if (!editingTeam) return;
    const teamDoc = doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", editingTeam.id);
    updateDocumentNonBlocking(teamDoc, {
      name: editingTeam.name,
      coachName: editingTeam.coachName,
      season: editingTeam.season
    });
    setIsEditOpen(false);
  };

  const handleDeleteTeam = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", id));
  };

  if (subLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a subcategorías
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Equipos: {subcategory?.name}</h1>
            <p className="text-muted-foreground">Plantillas que compiten en esta categoría.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/standings`}>
                <TableIcon className="h-4 w-4 mr-2" /> Tabla Posiciones
              </Link>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Nuevo Equipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Equipo</DialogTitle>
                  <DialogDescription>Añade un equipo específico (ej. 9na A, Blanca, Azul).</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre del Equipo</Label>
                    <Input value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} placeholder="Ej. 9na A" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del Entrenador</Label>
                    <Input value={newTeam.coachName} onChange={e => setNewTeam({...newTeam, coachName: e.target.value})} placeholder="Ej. Camila" />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporada</Label>
                    <Input value={newTeam.season} onChange={e => setNewTeam({...newTeam, season: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateTeam} disabled={!newTeam.name}>Crear Equipo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          teams?.map((team: any) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {team.name}
                  <Badge variant="secondary">{team.season}</Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <UserRound className="h-3 w-3" /> Coach: {team.coachName}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingTeam(team); setIsEditOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" variant="outline" className="flex items-center gap-2">
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}/teams/${team.id}`}>
                    Gestionar <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {teams?.length === 0 && !teamsLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">Aún no hay equipos en esta subcategoría.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Equipo</Label>
              <Input value={editingTeam?.name || ""} onChange={e => setEditingTeam({...editingTeam, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Nombre del Entrenador</Label>
              <Input value={editingTeam?.coachName || ""} onChange={e => setEditingTeam({...editingTeam, coachName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Temporada</Label>
              <Input value={editingTeam?.season || ""} onChange={e => setEditingTeam({...editingTeam, season: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateTeam}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
