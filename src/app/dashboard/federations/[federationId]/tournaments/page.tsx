
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Trophy, 
  Loader2, 
  ChevronLeft,
  Calendar,
  ArrowRight,
  Trash2,
  Pencil
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

export default function FederationTournamentsPage() {
  const { federationId } = useParams() as { federationId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({ 
    name: "", 
    season: "2025", 
    sport: "Fútbol",
    startDate: "",
    endDate: "",
    logoUrl: ""
  });

  const fedRef = useMemoFirebase(() => doc(db, "federations", federationId), [db, federationId]);
  const { data: federation, isLoading: fedLoading } = useDoc(fedRef);

  const tournamentsQuery = useMemoFirebase(() => collection(db, "tournaments"), [db]);
  const { data: tournaments, isLoading: toursLoading } = useCollection(tournamentsQuery);

  // Filtrar torneos organizados por esta federación
  const fedTournaments = tournaments?.filter(t => t.organizerId === federationId) || [];

  const handleCreateTournament = () => {
    const tourId = doc(collection(db, "tournaments")).id;
    const tourDoc = doc(db, "tournaments", tourId);
    
    setDoc(tourDoc, {
      ...newTournament,
      id: tourId,
      organizerId: federationId,
      organizerType: "federation",
      createdAt: new Date().toISOString()
    });
    
    setNewTournament({ name: "", season: "2025", sport: federation?.sport || "Fútbol", startDate: "", endDate: "", logoUrl: "" });
    setIsCreateOpen(false);
  };

  const handleDeleteTournament = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "tournaments", id));
  };

  if (fedLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/federations/${federationId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a Federación
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Torneos y Ligas</h1>
            <p className="text-muted-foreground">Competencias oficiales de {federation?.name}.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Crear Torneo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Competencia</DialogTitle>
                <DialogDescription>Configura los datos básicos del campeonato.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Torneo</Label>
                  <Input value={newTournament.name} onChange={e => setNewTournament({...newTournament, name: e.target.value})} placeholder="Ej. Torneo Apertura 2025" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temporada</Label>
                    <Input value={newTournament.season} onChange={e => setNewTournament({...newTournament, season: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deporte</Label>
                    <Input value={newTournament.sport} onChange={e => setNewTournament({...newTournament, sport: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input type="date" value={newTournament.startDate} onChange={e => setNewTournament({...newTournament, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input type="date" value={newTournament.endDate} onChange={e => setNewTournament({...newTournament, endDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTournament} disabled={!newTournament.name}>Guardar Torneo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {toursLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          fedTournaments.map((tour: any) => (
            <Card key={tour.id} className="hover:shadow-md transition-all border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="outline">{tour.season}</Badge>
                  <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteTournament(tour.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl mt-2">{tour.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 font-bold text-primary">
                  <Trophy className="h-4 w-4" /> {tour.sport}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {tour.startDate || 'Próximamente'}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button asChild className="w-full gap-2">
                  <Link href={`/dashboard/federations/${federationId}/tournaments/${tour.id}`}>
                    Gestionar Fixture <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {fedTournaments.length === 0 && !toursLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No hay torneos creados para esta federación.</p>
          </div>
        )}
      </div>
    </div>
  );
}
