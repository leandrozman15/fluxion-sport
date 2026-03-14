
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
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TeamDetailPage() {
  const { clubId, divisionId, subcategoryId, teamId } = useParams() as any;
  const db = useFirestore();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const teamRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId), [db, clubId, divisionId, subcategoryId, teamId]);
  const { data: team, isLoading: teamLoading } = useDoc(teamRef);

  const allPlayersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: allPlayers } = useCollection(allPlayersQuery);

  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId, "assignments"), [db, clubId, divisionId, subcategoryId, teamId]);
  const { data: roster, isLoading: rosterLoading } = useCollection(rosterQuery);

  const handleAssignPlayer = () => {
    if (!selectedPlayerId) return;
    const assignmentId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId, "assignments")).id;
    const assignmentDoc = doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId, "assignments", assignmentId);
    
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
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subcategoryId, "teams", teamId, "assignments", id));
  };

  if (teamLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}/teams/${teamId}/attendance-ranking`}>
                <Activity className="h-4 w-4 mr-2" /> Asistencia
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}/teams/${teamId}/events`}>
                <Calendar className="h-4 w-4 mr-2" /> Calendario
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}/teams/${teamId}/stats`}>
                <TrendingUp className="h-4 w-4 mr-2" /> Goleadores
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
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger><SelectValue placeholder="Jugador..." /></SelectTrigger>
                    <SelectContent>
                      {allPlayers?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleAssignPlayer} disabled={!selectedPlayerId}>Asignar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Plantilla Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {rosterLoading ? <Loader2 className="animate-spin" /> : (
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
                {(!roster || roster.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground">
                    No hay jugadores asignados. Usa el botón "Asignar Jugador".
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Jugadores</span>
                <span className="font-bold">{roster?.length || 0}</span>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${subcategoryId}/teams/${teamId}/stats`}>Ver Rankings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
