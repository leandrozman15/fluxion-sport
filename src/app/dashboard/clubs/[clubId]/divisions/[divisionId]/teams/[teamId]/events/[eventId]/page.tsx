
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Trophy,
  Plus,
  Trash2,
  Tally3,
  Star
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [isCallupOpen, setIsCallupOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [newStat, setNewStat] = useState({ playerId: "", goals: 0, assists: 0 });

  const eventRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId), [db, clubId, divisionId, teamId, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);

  const attendanceQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "attendance"), [db, clubId, divisionId, teamId, eventId]);
  const { data: attendance, isLoading: attLoading } = useCollection(attendanceQuery);

  const callupsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups"), [db, clubId, divisionId, teamId, eventId]);
  const { data: callups, isLoading: callupsLoading } = useCollection(callupsQuery);

  const statsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats"), [db, clubId, divisionId, teamId, eventId]);
  const { data: stats, isLoading: statsLoading } = useCollection(statsQuery);

  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster } = useCollection(rosterQuery);

  const handleAddCallup = () => {
    if (!selectedPlayerId) return;
    const player = roster?.find(p => p.playerId === selectedPlayerId);
    if (!player) return;

    const callupId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups")).id;
    const callupDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups", callupId);

    setDoc(callupDoc, {
      id: callupId,
      eventId,
      playerId: selectedPlayerId,
      playerName: player.playerName,
      status: "called",
      createdAt: new Date().toISOString()
    });

    setSelectedPlayerId("");
    setIsCallupOpen(false);
  };

  const handleSaveStat = () => {
    if (!newStat.playerId) return;
    const player = roster?.find(p => p.playerId === newStat.playerId);
    const statId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats")).id;
    const statDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats", statId);

    setDoc(statDoc, {
      id: statId,
      eventId,
      playerId: newStat.playerId,
      playerName: player?.playerName || "Jugador",
      goals: Number(newStat.goals),
      assists: Number(newStat.assists),
      createdAt: new Date().toISOString()
    });

    setNewStat({ playerId: "", goals: 0, assists: 0 });
    setIsStatsOpen(false);
  };

  const handleRemoveStat = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats", id));
  };

  const handleRemoveCallup = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups", id));
  };

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al calendario
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{event?.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm"><CalendarIcon className="h-4 w-4" /> {new Date(event?.date).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> {event?.location}</span>
            </div>
          </div>
          {event?.type === 'match' && (
            <Badge variant="default" className="bg-primary h-fit py-1 px-3">
              <Trophy className="h-4 w-4 mr-2" /> Partido Oficial
            </Badge>
          )}
        </div>
      </header>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Asistencia
          </TabsTrigger>
          {event?.type === 'match' && (
            <>
              <TabsTrigger value="callups" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Convocatoria
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Star className="h-4 w-4" /> Estadísticas
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Confirmación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance?.map((att: any) => (
                    <TableRow key={att.id}>
                      <TableCell className="font-medium">{att.playerName}</TableCell>
                      <TableCell>
                        <Badge variant={att.status === 'going' ? 'default' : 'secondary'} className={att.status === 'going' ? 'bg-green-100 text-green-700' : ''}>
                          {att.status === 'going' ? 'Voy' : 'No voy'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendance?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Sin respuestas.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Convocados</CardTitle>
              </div>
              <Dialog open={isCallupOpen} onOpenChange={setIsCallupOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Convocar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuevo Convocado</DialogTitle></DialogHeader>
                  <div className="py-4">
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger><SelectValue placeholder="Jugador..." /></SelectTrigger>
                      <SelectContent>
                        {roster?.map((r: any) => <SelectItem key={r.playerId} value={r.playerId}>{r.playerName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter><Button onClick={handleAddCallup}>Confirmar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callups?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.playerName}</TableCell>
                      <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveCallup(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Desempeño Individual</CardTitle>
                <CardDescription>Goles y asistencias registrados en este partido.</CardDescription>
              </div>
              <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Tally3 className="h-4 w-4" /> Registrar Goles</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Estadísticas</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Jugador</Label>
                      <Select value={newStat.playerId} onValueChange={v => setNewStat({...newStat, playerId: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {roster?.map((r: any) => <SelectItem key={r.playerId} value={r.playerId}>{r.playerName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Goles</Label>
                        <Input type="number" value={newStat.goals} onChange={e => setNewStat({...newStat, goals: parseInt(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Asistencias</Label>
                        <Input type="number" value={newStat.assists} onChange={e => setNewStat({...newStat, assists: parseInt(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleSaveStat}>Guardar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asistencias</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.playerName}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{s.goals}</TableCell>
                      <TableCell className="text-center">{s.assists}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStat(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats || stats.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No se han registrado estadísticas todavía.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
