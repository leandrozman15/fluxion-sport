
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
  Pencil,
  Table as TableIcon,
  Save
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function AdminStandingsPage() {
  const { clubId, divisionId } = useParams() as { clubId: string, divisionId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ teamName: "", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

  const divRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId), [db, clubId, divisionId]);
  const { data: division, isLoading: divLoading } = useDoc(divRef);

  const standingsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "standings"), [db, clubId, divisionId]);
  const { data: standings, isLoading: standingsLoading } = useCollection(standingsQuery);

  const handleAddStanding = () => {
    const standingId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "standings")).id;
    const standingDoc = doc(db, "clubs", clubId, "divisions", divisionId, "standings", standingId);
    
    setDoc(standingDoc, {
      ...newTeam,
      id: standingId,
      createdAt: new Date().toISOString()
    });
    
    setNewTeam({ teamName: "", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    setIsCreateOpen(false);
  };

  const handleDeleteStanding = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "standings", id));
  };

  const sortedStandings = standings?.sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  if (divLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a equipos
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Tabla de Posiciones: {division?.name}</h1>
            <p className="text-muted-foreground">Gestiona la clasificación del torneo.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Agregar Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar a la Tabla</DialogTitle>
                <DialogDescription>Ingresa los datos del equipo para la clasificación.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nombre del Equipo</Label>
                  <Input value={newTeam.teamName} onChange={e => setNewTeam({...newTeam, teamName: e.target.value})} placeholder="Ej. Club Atletico..." />
                </div>
                <div className="space-y-2">
                  <Label>PJ</Label>
                  <Input type="number" value={newTeam.played} onChange={e => setNewTeam({...newTeam, played: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Puntos</Label>
                  <Input type="number" value={newTeam.points} onChange={e => setNewTeam({...newTeam, points: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase">G</Label>
                  <Input type="number" value={newTeam.won} onChange={e => setNewTeam({...newTeam, won: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase">E</Label>
                  <Input type="number" value={newTeam.drawn} onChange={e => setNewTeam({...newTeam, drawn: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase">P</Label>
                  <Input type="number" value={newTeam.lost} onChange={e => setNewTeam({...newTeam, lost: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase">DG</Label>
                  <Input type="number" value={newTeam.goalsFor - newTeam.goalsAgainst} disabled className="bg-muted/30" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddStanding} disabled={!newTeam.teamName}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-primary" /> Clasificación Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {standingsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Pos</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-center">PJ</TableHead>
                  <TableHead className="text-center">G</TableHead>
                  <TableHead className="text-center">E</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center font-bold">PTS</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStandings?.map((s: any, i: number) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-center font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.teamName}</TableCell>
                    <TableCell className="text-center">{s.played}</TableCell>
                    <TableCell className="text-center">{s.won}</TableCell>
                    <TableCell className="text-center">{s.drawn}</TableCell>
                    <TableCell className="text-center">{s.lost}</TableCell>
                    <TableCell className="text-center font-black text-primary">{s.points}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteStanding(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!sortedStandings || sortedStandings.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                      No hay equipos registrados en la tabla.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
