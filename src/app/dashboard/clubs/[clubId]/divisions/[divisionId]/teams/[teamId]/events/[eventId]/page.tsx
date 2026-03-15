
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
  Lock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, deleteDoc, getDocs } from "firebase/firestore";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedRole, setSelectedRole] = useState("starter");
  const [isCallupOpen, setIsCallupOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [newStat, setNewStat] = useState({ playerId: "", goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90 });
  const [matchScore, setMatchScore] = useState({ home: 0, away: 0, finished: false });
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const eventRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId), [db, clubId, divisionId, teamId, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);

  const callupsQuery = useMemoFirebase(() => query(collection(db, "match_callups"), where("matchId", "==", eventId)), [db, eventId]);
  const { data: callups } = useCollection(callupsQuery);

  const statsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "stats"), [db, clubId, divisionId, teamId, eventId]);
  const { data: stats } = useCollection(statsQuery);

  const rosterQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "assignments"), [db, clubId, divisionId, teamId]);
  const { data: roster } = useCollection(rosterQuery);

  const attendanceQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "attendance"), [db, clubId, divisionId, teamId, eventId]);
  const { data: attendanceList } = useCollection(attendanceQuery);

  const handleUpdateScore = () => {
    updateDocumentNonBlocking(eventRef, {
      homeScore: Number(matchScore.home),
      awayScore: Number(matchScore.away),
      matchFinished: matchScore.finished
    });
  };

  const handleToggleAttendance = async (playerId: string, playerName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'going' ? 'not_going' : currentStatus === 'not_going' ? 'unknown' : 'going';
    const attDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "attendance", playerId);
    
    setDoc(attDoc, {
      playerId,
      playerName,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
      status: "confirmed",
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
    toast({ title: "Planilla Presentada", description: "El equipo ha sido enviado al árbitro." });
  };

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const isMatch = event?.type === 'match';
  const isTraining = event?.type === 'training';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al calendario
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold font-headline text-foreground">{event?.title}</h1>
              <Badge variant={isTraining ? "secondary" : "default"}>{event?.type?.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm"><CalendarIcon className="h-4 w-4" /> {new Date(event?.date).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> {event?.location}</span>
            </div>
          </div>
          {isMatch && (
            <div className="flex gap-2">
              {!event.lineupSubmitted ? (
                <Button onClick={handlePresentLineup} variant="accent" className="gap-2 font-bold">
                  <Send className="h-4 w-4" /> Presentar Planilla
                </Button>
              ) : (
                <Badge className="bg-green-100 text-green-700 h-10 px-4 gap-2 border-green-200">
                  <Lock className="h-4 w-4" /> Planilla Oficial Enviada
                </Badge>
              )}
            </div>
          )}
        </div>
      </header>

      <Tabs defaultValue={isTraining ? "attendance" : "callups"} className="w-full">
        <TabsList className="mb-4">
          {isTraining && (
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Control de Asistencia
            </TabsTrigger>
          )}
          {isMatch && (
            <>
              <TabsTrigger value="callups" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> Alineación
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
              <CardTitle>Pasar Lista</CardTitle>
              <CardDescription>Haz clic en el icono para cambiar el estado de asistencia de cada jugadora.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster?.map((p: any) => {
                  const status = attendanceList?.find(a => a.playerId === p.playerId)?.status || 'unknown';
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={p.playerPhoto} />
                          <AvatarFallback>{p.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{p.playerName}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleAttendance(p.playerId, p.playerName, status)}
                        className={cn(
                          "h-10 w-10 p-0 rounded-full",
                          status === 'going' ? "bg-green-100 text-green-600 hover:bg-green-200" :
                          status === 'not_going' ? "bg-red-100 text-red-600 hover:bg-red-200" :
                          "bg-muted text-muted-foreground"
                        )}
                      >
                        {status === 'going' ? <CheckCircle2 className="h-5 w-5" /> : 
                         status === 'not_going' ? <XCircle className="h-5 w-5" /> : 
                         <HelpCircle className="h-5 w-5" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 py-4 flex justify-between items-center">
              <div className="flex gap-4 text-xs font-bold uppercase tracking-tighter">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Presentes: {attendanceList?.filter(a => a.status === 'going').length || 0}</span>
                <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> Ausentes: {attendanceList?.filter(a => a.status === 'not_going').length || 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Los cambios se guardan automáticamente.</p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="callups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Citación y Alineación</CardTitle>
                <CardDescription>
                  {event?.lineupSubmitted 
                    ? "La planilla ya fue entregada. No se permiten cambios." 
                    : "Define titulares y suplentes."}
                </CardDescription>
              </div>
              {!event?.lineupSubmitted && (
                <Dialog open={isCallupOpen} onOpenChange={setIsCallupOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Añadir Jugadora</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Convocar Jugadora</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Jugadora</Label>
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
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4">Titulares</h3>
                  <div className="border rounded-xl divide-y">
                    {callups?.filter(c => c.role === 'starter').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-4 text-sm font-bold">
                        <span>{c.playerName}</span>
                        {!event?.lineupSubmitted && (
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db, "match_callups", c.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Suplentes</h3>
                  <div className="border rounded-xl divide-y">
                    {callups?.filter(c => c.role === 'substitute').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-4 text-sm font-bold">
                        <span>{c.playerName}</span>
                        {!event?.lineupSubmitted && (
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db, "match_callups", c.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-lg">Desempeño Individual</CardTitle></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugadora</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.playerName}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{s.goals}</TableCell>
                      <TableCell className="text-center font-bold text-accent">{s.assists}</TableCell>
                    </TableRow>
                  ))}
                  {(!stats || stats.length === 0) && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Sin estadísticas registradas aún.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
