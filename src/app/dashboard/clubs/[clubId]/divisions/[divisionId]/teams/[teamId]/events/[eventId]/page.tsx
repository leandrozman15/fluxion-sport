
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
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [isCallupOpen, setIsCallupOpen] = useState(false);

  const eventRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId), [db, clubId, divisionId, teamId, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);

  const attendanceQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "attendance"), [db, clubId, divisionId, teamId, eventId]);
  const { data: attendance, isLoading: attLoading } = useCollection(attendanceQuery);

  const callupsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups"), [db, clubId, divisionId, teamId, eventId]);
  const { data: callups, isLoading: callupsLoading } = useCollection(callupsQuery);

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

  const handleRemoveCallup = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "callups", id));
  };

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const goingCount = attendance?.filter(a => a.status === 'going').length || 0;
  const notGoingCount = attendance?.filter(a => a.status === 'not_going').length || 0;

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
            <Badge variant="default" className="bg-primary hover:bg-primary h-fit py-1 px-3">
              <Trophy className="h-4 w-4 mr-2" /> Partido Oficial
            </Badge>
          )}
        </div>
      </header>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Asistencia General
          </TabsTrigger>
          {event?.type === 'match' && (
            <TabsTrigger value="callups" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Convocatoria
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Lista de Confirmación</CardTitle>
                  <CardDescription>Seguimiento de quiénes han confirmado su presencia.</CardDescription>
                </div>
                <div className="flex gap-2">
                   <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">{goingCount} Voy</Badge>
                   <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">{notGoingCount} No voy</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Actualización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance?.map((att: any) => (
                      <TableRow key={att.id}>
                        <TableCell className="font-medium">{att.playerName}</TableCell>
                        <TableCell>
                          {att.status === 'going' ? (
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              <CheckCircle2 className="h-4 w-4" /> Confirmado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-semibold">
                              <XCircle className="h-4 w-4" /> No asiste
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(att.updatedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {attendance?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Sin respuestas todavía.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {event?.type === 'match' && (
          <TabsContent value="callups">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Plantel Convocado</CardTitle>
                  <CardDescription>Selección de jugadores citados para el encuentro.</CardDescription>
                </div>
                <Dialog open={isCallupOpen} onOpenChange={setIsCallupOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Convocar Jugador
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Citación</DialogTitle>
                      <DialogDescription>Elige un jugador de la plantilla para convocarlo.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar jugador..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roster?.filter(r => !callups?.some(c => c.playerId === r.playerId)).map((r: any) => (
                            <SelectItem key={r.playerId} value={r.playerId}>{r.playerName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCallupOpen(false)}>Cancelar</Button>
                      <Button onClick={handleAddCallup} disabled={!selectedPlayerId}>Confirmar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {callupsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {callups?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.playerName}</TableCell>
                          <TableCell>
                            {c.status === 'called' && <Badge variant="secondary">Citado</Badge>}
                            {c.status === 'confirmed' && <Badge className="bg-green-100 text-green-700">Confirmado</Badge>}
                            {c.status === 'declined' && <Badge variant="destructive">Baja</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveCallup(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
