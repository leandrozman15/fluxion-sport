
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Users, 
  Loader2,
  Trash2,
  ChevronLeft,
  Calendar,
  UserPlus,
  Trophy,
  MapPin,
  Clock
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TeamDetailPage() {
  const { clubId, divisionId, teamId } = useParams() as { clubId: string, divisionId: string, teamId: string };
  const db = useFirestore();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId), [db, clubId, divisionId, teamId]);
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  // All club players for the selection dropdown
  const allPlayersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: allPlayers } = useCollection(allPlayersQuery);

  // Players assigned to THIS team
  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  // To show player details in the roster, we'd normally need to fetch them. 
  // For MVP, we'll just show the IDs or assume they are pre-fetched if we were using a different structure.
  // Optimization: In a real app, we might store name/photo in the assignment too (denormalization).

  const handleAssignPlayer = () => {
    if (!selectedPlayerId) return;
    const assignmentId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments")).id;
    const assignmentDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", assignmentId);
    
    // Denormalizamos un poco para mostrar en la lista rápido
    const player = allPlayers?.find(p => p.id === selectedPlayerId);

    setDoc(assignmentDoc, {
      id: assignmentId,
      playerId: selectedPlayerId,
      playerName: `${player?.firstName} ${player?.lastName}`,
      playerPhoto: player?.photoUrl || "",
      teamId,
      season: team?.season || "2024-2025",
      createdAt: new Date().toISOString()
    });
    
    setSelectedPlayerId("");
    setIsAssignOpen(false);
  };

  const handleUnassignPlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments", id));
  };

  if (teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a equipos
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-headline text-foreground">{team?.name}</h1>
              <Badge>{team?.season}</Badge>
            </div>
            <p className="text-muted-foreground">Entrenador: {team?.coachName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`}>
                <Calendar className="h-4 w-4 mr-2" /> Calendario
              </Link>
            </Button>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Asignar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar a la Plantilla</DialogTitle>
                  <DialogDescription>Selecciona un jugador del club para este equipo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Jugador</Label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar jugador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allPlayers?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAssignPlayer} disabled={!selectedPlayerId}>Confirmar Asignación</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Plantilla Actual
            </CardTitle>
            <CardDescription>Lista de jugadores asignados para la temporada {team?.season}.</CardDescription>
          </CardHeader>
          <CardContent>
            {rosterLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="divide-y">
                {roster?.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.playerPhoto} />
                        <AvatarFallback>J</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.playerName}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleUnassignPlayer(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {roster?.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">No hay jugadores asignados.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Próximo Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/20 p-4 rounded-lg border border-dashed text-center">
                <p className="text-sm text-muted-foreground">No hay eventos programados para hoy.</p>
                <Button variant="link" size="sm" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`}>Ir al calendario</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm">Resumen Estadístico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Jugadores Totales</span>
                <span className="font-bold">{roster?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Categoría</span>
                <span className="font-bold">{divisionId.replace('div-', '')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
