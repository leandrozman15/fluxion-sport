
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Layers, 
  Calendar, 
  Users, 
  ArrowRight,
  Loader2,
  Trash2,
  ChevronLeft,
  UserPlus
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
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function ClubDetailPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDivision, setNewDivision] = useState({ name: "", ageMin: 5, ageMax: 18 });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions, isLoading: divisionsLoading } = useCollection(divisionsQuery);

  const handleCreateDivision = () => {
    const divId = doc(collection(db, "clubs", clubId, "divisions")).id;
    const divDoc = doc(db, "clubs", clubId, "divisions", divId);
    
    setDoc(divDoc, {
      ...newDivision,
      id: divId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewDivision({ name: "", ageMin: 5, ageMax: 18 });
    setIsDialogOpen(false);
  };

  const handleDeleteDivision = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/clubs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a clubes
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{club?.name}</h1>
            <p className="text-muted-foreground">Gestión de categorías y divisiones deportivas.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/players`} className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Jugadores
              </Link>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Nueva División
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Categoría</DialogTitle>
                  <DialogDescription>Define una nueva división por rango de edad (ej. Sub 9).</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre de la División</Label>
                    <Input value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} placeholder="Ej. Sub 11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Edad Mínima</Label>
                      <Input type="number" value={newDivision.ageMin} onChange={e => setNewDivision({...newDivision, ageMin: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Edad Máxima</Label>
                      <Input type="number" value={newDivision.ageMax} onChange={e => setNewDivision({...newDivision, ageMax: parseInt(e.target.value)})} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateDivision} disabled={!newDivision.name}>Guardar Categoría</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {divisionsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          divisions?.map((div: any) => (
            <Card key={div.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {div.name}
                  <Badge variant="outline">{div.ageMin} - {div.ageMax} años</Badge>
                </CardTitle>
                <CardDescription>Categoría formativa</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDivision(div.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${div.id}`} className="flex items-center gap-2">
                    Equipos <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {divisions?.length === 0 && !divisionsLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No hay divisiones creadas para este club.</p>
          </div>
        )}
      </div>
    </div>
  );
}
