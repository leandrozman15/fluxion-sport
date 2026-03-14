
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Trophy,
  Plus,
  Trash2,
  Tally3,
  Star,
  Flag,
  Save,
  UserCheck,
  Send,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedRole, setSelectedRole] = useState("starter");
  const [isCallupOpen, setIsCallupOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [newStat, setNewStat] = useState({ 
    playerId: "", 
    goals: 0, 
    assists: 0, 
    yellowCards: 0, 
    redCards: 0, 
    minutesPlayed: 90 
  });
  const [matchScore, setMatchScore] = useState({ home: 0, away: 0, finished: false });

  const eventRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId), [db, clubId, divisionId, teamId, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);

  const callupsQuery = useMemoFirebase(() => query(collection(db, "match_callups"), where("matchId", "==", eventId)), [db, eventId]);
  const { data: callups, isLoading: callupsLoading } = useCollection(callupsQuery);

  const statsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats"), [db, clubId, divisionId, teamId, eventId]);
  const { data: stats } = useCollection(statsQuery);

  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster } = useCollection(rosterQuery);

  const handleUpdateScore = () => {
    updateDocumentNonBlocking(eventRef, {
      homeScore: Number(matchScore.home),
      awayScore: Number(matchScore.away),
      matchFinished: matchScore.finished
    });
  };

  const handleAddCallup = () => {
    if (!selectedPlayerId || event?.lineupSubmitted) return;
    const player = roster?.find(p => p.playerId === selectedPlayerId);
    if (!player) return;

    const callupId = doc(collection(db, "match_callups")).id;
    const callupDoc = doc(db, "match_callups", callupId);

    setDoc(callupDoc, {
      id: callupId,
      matchId: eventId,
      teamId,
      playerId: selectedPlayerId,
      playerName: player.playerName,
      role: selectedRole,
      status: "confirmed", // El entrenador confirma directamente
      createdAt: new Date().toISOString()
    });

    setSelectedPlayerId("");
    setIsCallupOpen(false);
  };

  const handlePresentLineup = () => {
    if (!event) return;
    updateDocumentNonBlocking(eventRef, {
      lineupSubmitted: true,
      lineupSubmittedAt: new Date().toISOString()
    });
    toast({
      title: "Planilla Presentada",
      description: "El equipo ha sido enviado al árbitro para el acta oficial.",
    });
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
      yellowCards: Number(newStat.yellowCards),
      redCards: Number(newStat.redCards),
      minutesPlayed: Number(newStat.minutesPlayed),
      createdAt: new Date().toISOString()
    });

    setNewStat({ playerId: "", goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90 });
    setIsStatsOpen(false);
  };

  const handleRemoveStat = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats", id));
  };

  const handleRemoveCallup = (id: string) => {
    if (event?.lineupSubmitted) return;
    deleteDoc(doc(db, "match_callups", id));
  };

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const isMatch = event?.type === 'match';

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
          {isMatch && (
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">LOCAL</p>
                  <Input 
                    type="number" 
                    className="w-12 h-12 text-center text-xl font-black p-0" 
                    defaultValue={event.homeScore || 0} 
                    onChange={e => setMatchScore({...matchScore, home: parseInt(e.target.value)})}
                  />
                </div>
                <span className="text-2xl font-bold mt-4">-</span>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">VISITA</p>
                  <Input 
                    type="number" 
                    className="w-12 h-12 text-center text-xl font-black p-0" 
                    defaultValue={event.awayScore || 0}
                    onChange={e => setMatchScore({...matchScore, away: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="finished" 
                      defaultChecked={event.matchFinished} 
                      onCheckedChange={(checked) => setMatchScore({...matchScore, finished: !!checked})} 
                    />
                    <Label htmlFor="finished" className="text-xs">Finalizado</Label>
                  </div>
                  <Button size="sm" onClick={handleUpdateScore} className="h-8 gap-1">
                    <Save className="h-3 w-3" /> Guardar
                  </Button>
                </div>
              </div>
              
              {!event.lineupSubmitted ? (
                <Button onClick={handlePresentLineup} variant="accent" className="gap-2 font-bold shadow-lg shadow-accent/20">
                  <Send className="h-4 w-4" /> Presentar Planilla Oficial
                </Button>
              ) : (
                <div className="bg-green-100 text-green-700 px-4 py-3 rounded-xl border border-green-200 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-wider">Planilla Presentada</span>
                    <span className="text-[10px] opacity-70">Enviada {new Date(event.lineupSubmittedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <Tabs defaultValue="callups" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="callups" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Alineación
          </TabsTrigger>
          {isMatch && (
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Star className="h-4 w-4" /> Estadísticas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="callups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Citación y Alineación</CardTitle>
                <CardDescription>
                  {event?.lineupSubmitted 
                    ? "La planilla ya fue entregada al árbitro. No se permiten cambios." 
                    : "Define quiénes son titulares y suplentes para este encuentro."}
                </CardDescription>
              </div>
              {!event?.lineupSubmitted && (
                <Dialog open={isCallupOpen} onOpenChange={setIsCallupOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Añadir Jugador</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Convocar Jugador</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Jugador</Label>
                        <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            {roster?.map((r: any) => <SelectItem key={r.playerId} value={r.playerId}>{r.playerName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rol en el Partido</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Titular</SelectItem>
                            <SelectItem value="substitute">Suplente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={handleAddCallup}>Confirmar Citación</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Titulares
                  </h3>
                  <div className="border rounded-xl divide-y bg-primary/5">
                    {callups?.filter(c => c.role === 'starter').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-4 text-sm group">
                        <span className="font-bold">{c.playerName}</span>
                        {!event?.lineupSubmitted && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveCallup(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {callups?.filter(c => c.role === 'starter').length === 0 && (
                      <div className="p-8 text-center text-xs text-muted-foreground italic">Sin titulares asignados.</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Suplentes
                  </h3>
                  <div className="border rounded-xl divide-y bg-muted/30">
                    {callups?.filter(c => c.role === 'substitute').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-4 text-sm group">
                        <span className="font-bold">{c.playerName}</span>
                        {!event?.lineupSubmitted && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveCallup(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {callups?.filter(c => c.role === 'substitute').length === 0 && (
                      <div className="p-8 text-center text-xs text-muted-foreground italic">Sin suplentes asignados.</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Desempeño Individual</CardTitle>
                <CardDescription>Registro detallado del partido para estadísticas.</CardDescription>
              </div>
              <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2"><Tally3 className="h-4 w-4" /> Registrar Stats</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Registrar Estadísticas</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Jugador</Label>
                      <Select value={newStat.playerId} onValueChange={v => setNewStat({...newStat, playerId: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {callups?.map((r: any) => <SelectItem key={r.playerId} value={r.playerId}>{r.playerName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Tally3 className="h-3 w-3" /> Goles</Label>
                        <Input type="number" value={newStat.goals} onChange={e => setNewStat({...newStat, goals: parseInt(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Star className="h-3 w-3" /> Asistencias</Label>
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
                    <TableHead className="text-center text-primary">G</TableHead>
                    <TableHead className="text-center text-accent">A</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.playerName}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{s.goals}</TableCell>
                      <TableCell className="text-center font-bold text-accent">{s.assists}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStat(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats || stats.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin estadísticas registradas.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
