
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Calendar as CalendarIcon,
  MapPin,
  Plus,
  Trash2,
  Star,
  Send,
  Lock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  BellRing,
  ClipboardList,
  Target,
  Timer,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedRole, setSelectedRole] = useState("starter");
  const [isCallupOpen, setIsCallupOpen] = useState(false);

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

    const callupId = `${eventId}_${selectedPlayerId}`;
    const callupDoc = doc(db, "match_callups", callupId);

    setDoc(callupDoc, {
      id: callupId,
      matchId: eventId,
      teamId,
      playerId: selectedPlayerId,
      playerName: player.playerName,
      role: selectedRole,
      status: "pending",
      published: event?.callupsPublished || false,
      createdAt: new Date().toISOString()
    });

    setSelectedPlayerId("");
    setIsCallupOpen(false);
  };

  const handlePublishCallups = () => {
    if (!event || !callups) return;
    
    updateDocumentNonBlocking(eventRef, {
      callupsPublished: true,
      callupsPublishedAt: new Date().toISOString()
    });

    callups.forEach(c => {
      updateDocumentNonBlocking(doc(db, "match_callups", c.id), { published: true });
    });

    toast({ 
      title: "Convocatoria Enviada", 
      description: "Las jugadoras ya pueden ver la citación en su aplicación." 
    });
  };

  const handlePresentLineup = () => {
    if (!event) return;
    updateDocumentNonBlocking(eventRef, {
      lineupSubmitted: true,
      lineupSubmittedAt: new Date().toISOString()
    });
    toast({ title: "Planilla Presentada", description: "El equipo ha sido enviado al árbitro oficial." });
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
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm font-bold"><CalendarIcon className="h-4 w-4" /> {new Date(event?.date).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-sm font-bold">
                <MapPin className="h-4 w-4" /> 
                {event?.location}
                {event?.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:underline flex items-center gap-0.5 text-[10px] font-black uppercase"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir Mapa
                  </a>
                )}
              </span>
              {isTraining && event?.duration && <span className="flex items-center gap-1 text-sm font-bold"><Timer className="h-4 w-4" /> {event.duration} min</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {isMatch && !event.callupsPublished && (
              <Button onClick={handlePublishCallups} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                <BellRing className="h-4 w-4" /> Enviar a Jugadoras
              </Button>
            )}
            {isMatch && !event.lineupSubmitted ? (
              <Button onClick={handlePresentLineup} variant="default" className="gap-2 font-bold bg-primary hover:bg-primary/90">
                <Send className="h-4 w-4" /> Presentar Planilla Oficial
              </Button>
            ) : isMatch && (
              <Badge className="bg-green-100 text-green-700 h-10 px-4 gap-2 border-green-200">
                <Lock className="h-4 w-4" /> Planilla Enviada
              </Badge>
            )}
          </div>
        </div>
      </header>

      <Tabs defaultValue={isTraining ? "attendance" : "callups"} className="w-full">
        <TabsList className="mb-4">
          {isTraining && (
            <>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Control de Asistencia
              </TabsTrigger>
              <TabsTrigger value="planning" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Plan de Trabajo
              </TabsTrigger>
            </>
          )}
          {isMatch && (
            <>
              <TabsTrigger value="callups" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Convocatoria & Alineación
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
              <CardDescription>Control diario de asistencia para entrenamientos.</CardDescription>
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
                          status === 'going' ? "bg-green-500 text-white hover:bg-green-600" :
                          status === 'not_going' ? "bg-red-500 text-white hover:bg-red-600" :
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
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Detalle de la Sesión
                </CardTitle>
                <CardDescription>Planificación técnica y ejercicios previstos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event?.objectives && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Target className="h-3 w-3 text-primary" /> Objetivos Principales
                    </h4>
                    <p className="p-4 bg-primary/5 rounded-lg border border-primary/10 font-medium">{event.objectives}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Desarrollo de la Clase / Ejercicios</h4>
                  <div className="p-6 border-2 border-dashed rounded-xl bg-card">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {event?.description || "No se han cargado ejercicios detallados para esta sesión."}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/5">
                <Button variant="outline" size="sm" className="w-full gap-2">Editar Planificación</Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Cronograma
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                    <span className="opacity-80">Duración Total</span>
                    <span className="font-black">{event?.duration || 90} min</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                    <span className="opacity-80">Entrada en Calor</span>
                    <span className="font-bold">15 min</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                    <span className="opacity-80">Bloque Principal</span>
                    <span className="font-bold">60 min</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-80">Cierre / Elongación</span>
                    <span className="font-bold">15 min</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="callups">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lista de Seleccionados</CardTitle>
                  <CardDescription>Titulares y suplentes convocados para el partido.</CardDescription>
                </div>
                {!event?.lineupSubmitted && (
                  <Dialog open={isCallupOpen} onOpenChange={setIsCallupOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Convocar Jugadora</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nueva Citación</DialogTitle></DialogHeader>
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
                          <Label>Rol</Label>
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
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest">Titulares</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {callups?.filter(c => c.role === 'starter').map((c: any) => (
                      <CallupRow key={c.id} callup={c} db={db} readOnly={!!event?.lineupSubmitted} />
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Suplentes</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {callups?.filter(c => c.role === 'substitute').map((c: any) => (
                      <CallupRow key={c.id} callup={c} db={db} readOnly={!!event?.lineupSubmitted} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className={cn("border-l-4", event?.callupsPublished ? "border-l-green-500" : "border-l-orange-500")}>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {event?.callupsPublished ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <HelpCircle className="h-4 w-4 text-orange-500" />}
                    Estado de Citación
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Publicada:</span>
                    <span className="font-bold">{event?.callupsPublished ? 'SÍ' : 'NO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmadas:</span>
                    <span className="font-bold text-green-600">{callups?.filter(c => c.status === 'confirmed').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bajas:</span>
                    <span className="font-bold text-red-600">{callups?.filter(c => c.status === 'unavailable').length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader><CardTitle>Goleadoras y Desempeño</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugadora</TableHead>
                    <TableHead className="text-center">Goles</TableHead>
                    <TableHead className="text-center">Asistencias</TableHead>
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
                  {(!stats || stats.length === 0) && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">Sin estadísticas cargadas.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallupRow({ callup, db, readOnly }: { callup: any, db: any, readOnly: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/5 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{callup.playerName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-bold">{callup.playerName}</span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {callup.status === 'confirmed' ? '✅ Confirmada' : 
             callup.status === 'unavailable' ? '❌ No puede ir' : 
             '⏳ Pendiente de respuesta'}
          </span>
        </div>
      </div>
      {!readOnly && (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteDoc(doc(db, "match_callups", callup.id))}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
