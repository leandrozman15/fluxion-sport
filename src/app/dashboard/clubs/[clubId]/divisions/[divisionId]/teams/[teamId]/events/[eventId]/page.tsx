
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
  ExternalLink,
  UserPlus,
  Search,
  Bus,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, deleteDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editDepartureOpen, setEditDepartureOpen] = useState(false);
  const [departureInput, setDepartureInput] = useState("");

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

  const handleToggleCallup = async (player: any) => {
    if (event?.lineupSubmitted) return;
    
    const existingCallup = callups?.find(c => c.playerId === player.playerId);
    const callupId = `${eventId}_${player.playerId}`;
    const callupDoc = doc(db, "match_callups", callupId);

    if (existingCallup) {
      await deleteDoc(callupDoc);
      toast({ title: "Citación removida", description: `${player.playerName} ya no está en la lista.` });
    } else {
      await setDoc(callupDoc, {
        id: callupId,
        matchId: eventId,
        teamId,
        playerId: player.playerId,
        playerName: player.playerName,
        playerPhoto: player.playerPhoto || "",
        role: "convoked", 
        status: "pending",
        published: event?.callupsPublished || false,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Jugadora Citada", description: `${player.playerName} añadida a la convocatoria.` });
    }
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

  const handleSaveDeparture = async () => {
    if (!eventRef) return;
    await updateDoc(eventRef, { departureTime: departureInput });
    toast({ title: "Horario de salida guardado", description: departureInput ? `Salida del micro: ${departureInput} hs` : "Horario de salida eliminado." });
    setEditDepartureOpen(false);
  };

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  const isMatch = event?.type === 'match';
  const isTraining = event?.type === 'training';

  const filteredRoster = roster?.filter(p => 
    p.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`} className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al calendario
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold font-headline text-white drop-shadow-md">{event?.title}</h1>
              <Badge variant={isTraining ? "secondary" : "default"} className="bg-white text-primary border-none shadow-sm">{event?.type?.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-2 text-white/80">
              <span className="flex items-center gap-1.5 text-sm font-bold drop-shadow-md">
                <CalendarIcon className="h-4 w-4 text-accent" /> 
                {event?.date ? (
                  <>
                    {new Date(event.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(event.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs
                  </>
                ) : '-'}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold drop-shadow-md">
                <MapPin className="h-4 w-4 text-accent" /> 
                {event?.location}
                {event?.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-accent hover:underline flex items-center gap-0.5 text-[10px] font-black uppercase"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir Mapa
                  </a>
                )}
              </span>
              {/* Departure time */}
              <Dialog open={editDepartureOpen} onOpenChange={open => { setEditDepartureOpen(open); if (open) setDepartureInput(event?.departureTime || ""); }}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 text-sm font-bold drop-shadow-md hover:text-accent transition-colors">
                    <Bus className="h-4 w-4 text-accent" />
                    {event?.departureTime
                      ? <span>Salida micro: <strong>{event.departureTime} hs</strong></span>
                      : <span className="text-white/50">Agregar salida del micro</span>}
                    <Pencil className="h-3 w-3 opacity-50" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-xs bg-white border-none shadow-2xl rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                      <Bus className="h-5 w-5 text-primary" /> Salida del Micro
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Horario de salida desde el club</Label>
                    <Input
                      type="time"
                      value={departureInput}
                      onChange={e => setDepartureInput(e.target.value)}
                      className="h-12 border-2 font-bold text-lg"
                    />
                    <p className="text-[10px] text-slate-400 font-bold">Dejar en blanco para quitar el horario.</p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setEditDepartureOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                    <Button onClick={handleSaveDeparture} className="font-black uppercase text-[10px] tracking-widest h-12 px-8">Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex gap-2">
            {isMatch && !event.callupsPublished && (
              <Button onClick={handlePublishCallups} variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl backdrop-blur-md">
                <BellRing className="h-4 w-4" /> Notificar
              </Button>
            )}
            {isMatch && !event.lineupSubmitted ? (
              <Button onClick={handlePresentLineup} variant="default" className="gap-2 font-black bg-white text-primary hover:bg-slate-50 h-12 uppercase text-[10px] tracking-widest px-6 shadow-xl">
                <Send className="h-4 w-4" /> Presentar Planilla
              </Button>
            ) : isMatch && (
              <Badge className="bg-green-100 text-green-700 h-12 px-6 gap-2 border-green-200 font-black uppercase text-[10px] tracking-widest">
                <Lock className="h-4 w-4" /> Planilla Cerrada
              </Badge>
            )}
          </div>
        </div>
      </header>

      <Tabs defaultValue={isTraining ? "attendance" : "callups"} className="w-full">
        <TabsList className="bg-white/15 backdrop-blur-md p-1.5 border border-white/20 mb-8 inline-flex rounded-2xl h-14">
          {isTraining && (
            <>
              <TabsTrigger value="attendance" className="flex items-center gap-2 h-11 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <CheckCircle2 className="h-4 w-4" /> Asistencia
              </TabsTrigger>
              <TabsTrigger value="planning" className="flex items-center gap-2 h-11 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <ClipboardList className="h-4 w-4" /> Trabajo
              </TabsTrigger>
            </>
          )}
          {isMatch && (
            <>
              <TabsTrigger value="callups" className="flex items-center gap-2 h-11 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <Users className="h-4 w-4" /> Citación
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2 h-11 px-8 font-black uppercase text-[10px] tracking-widest text-white data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">
                <Star className="h-4 w-4" /> Stats
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="attendance">
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-10">
              <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900">
                <Users className="h-8 w-8 text-primary" /> Control de Presencia
              </CardTitle>
              <CardDescription className="font-bold text-slate-500">Marca quiénes asistieron hoy a la sesión.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roster?.map((p: any) => {
                  const status = attendanceList?.find(a => a.playerId === p.playerId)?.status || 'unknown';
                  return (
                    <div key={p.id} className="flex items-center justify-between p-5 border-2 rounded-3xl bg-white hover:bg-slate-50/50 transition-all group">
                      <div className="flex items-center gap-5">
                        <Avatar className="h-14 w-14 border-2 border-slate-50 shadow-sm rounded-2xl">
                          <AvatarImage src={p.playerPhoto} />
                          <AvatarFallback className="font-black text-slate-300 bg-slate-50">{p.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-black text-slate-900 text-base">{p.playerName}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleAttendance(p.playerId, p.playerName, status)}
                        className={cn(
                          "h-14 w-14 p-0 rounded-2xl border-2 transition-all shadow-md",
                          status === 'going' ? "bg-green-500 text-white border-green-600 scale-110 shadow-green-500/20" :
                          status === 'not_going' ? "bg-red-500 text-white border-red-600 shadow-red-500/20" :
                          "bg-white text-slate-200 border-slate-100 hover:border-primary hover:text-primary"
                        )}
                      >
                        {status === 'going' ? <CheckCircle2 className="h-7 w-7" /> : 
                         status === 'not_going' ? <XCircle className="h-7 w-7" /> : 
                         <HelpCircle className="h-7 w-7" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callups">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <Card className="lg:col-span-8 border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900">Lista de Convocatoria</CardTitle>
                    <CardDescription className="font-bold text-slate-500 mt-1">Tilda las jugadoras citadas para este partido.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      placeholder="Buscar jugadora..." 
                      className="pl-12 h-12 text-sm font-bold border-2 rounded-2xl bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {filteredRoster?.map((p: any) => {
                    const isConvoked = callups?.some(c => c.playerId === p.playerId);
                    const callupData = callups?.find(c => c.playerId === p.playerId);
                    
                    return (
                      <div key={p.id} className={cn(
                        "flex items-center justify-between p-6 transition-all group",
                        isConvoked ? "bg-primary/5" : "hover:bg-slate-50/50"
                      )}>
                        <div className="flex items-center gap-6">
                          <Avatar className={cn(
                            "h-16 w-16 border-2 transition-all shadow-md rounded-2xl",
                            isConvoked ? "border-primary scale-105" : "border-slate-50"
                          )}>
                            <AvatarImage src={p.playerPhoto} />
                            <AvatarFallback className="font-black text-slate-300">{p.playerName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-black text-xl leading-none transition-colors",
                              isConvoked ? "text-primary" : "text-slate-900"
                            )}>
                              {p.playerName}
                            </span>
                            {isConvoked && callupData?.status !== 'pending' && (
                              <span className="text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                {callupData.status === 'confirmed' ? (
                                  <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Confirmada</>
                                ) : (
                                  <><XCircle className="h-3.5 w-3.5 text-red-500" /> No disponible</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!event?.lineupSubmitted && (
                          <Button 
                            onClick={() => handleToggleCallup(p)}
                            className={cn(
                              "h-14 w-14 p-0 rounded-2xl border-2 transition-all shadow-lg",
                              isConvoked 
                                ? "bg-primary text-white border-primary shadow-primary/20 scale-110" 
                                : "bg-white text-slate-200 border-slate-100 hover:border-primary hover:text-primary"
                            )}
                          >
                            <CheckCircle2 className={cn("h-8 w-8", isConvoked ? "opacity-100" : "opacity-30")} />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-8">
              <Card className={cn(
                "border-none shadow-2xl overflow-hidden rounded-[2.5rem] transition-all",
                event?.callupsPublished ? "bg-green-500 text-white shadow-green-500/20" : "bg-white text-slate-900"
              )}>
                <CardHeader className={cn("pb-4 pt-8 px-8", event?.callupsPublished ? "" : "bg-slate-50 border-b")}>
                  <CardTitle className={cn("text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2", event?.callupsPublished ? "opacity-80" : "text-slate-400")}>
                    {event?.callupsPublished ? <CheckCircle2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                    Resumen Citación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-8 px-8 pb-10">
                  <div className={cn("flex justify-between items-center border-b pb-6", event?.callupsPublished ? "border-white/10" : "border-slate-100")}>
                    <span className={cn("text-xs font-black uppercase tracking-widest", event?.callupsPublished ? "opacity-70" : "text-slate-400")}>Total Citadas</span>
                    <span className="text-5xl font-black tracking-tighter">{callups?.length || 0}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className={event?.callupsPublished ? "opacity-60" : "text-slate-400"}>Confirmadas</span>
                      <span className={event?.callupsPublished ? "text-green-200" : "text-green-600"}>{callups?.filter(c => c.status === 'confirmed').length || 0}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className={event?.callupsPublished ? "opacity-60" : "text-slate-400"}>Bajas</span>
                      <span className={event?.callupsPublished ? "text-red-200" : "text-red-600"}>{callups?.filter(c => c.status === 'unavailable').length || 0}</span>
                    </div>
                  </div>
                  {!event?.callupsPublished && callups && callups.length > 0 && (
                    <Button 
                      onClick={handlePublishCallups}
                      className="w-full bg-primary text-white hover:bg-primary/90 font-black uppercase text-[11px] tracking-[0.2em] h-14 mt-6 shadow-xl shadow-primary/20 rounded-2xl"
                    >
                      Enviar Citación Oficial
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="p-8 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-4">
                  <Star className="h-4 w-4 text-accent" /> Sugerencia Técnica
                </p>
                <p className="text-xs text-white/90 font-bold leading-relaxed">
                  Utiliza el check-list para una citación rápida. Una vez finalizada, pulsa "Enviar Citación" para que las jugadoras reciban la notificación oficial.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-10">
              <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" /> Goleadoras y Desempeño
              </CardTitle>
              <CardDescription className="font-bold text-slate-500 mt-1">Registro estadístico del partido.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none bg-slate-50/50 h-16">
                    <TableHead className="font-black uppercase text-[11px] tracking-widest text-slate-400 pl-10">Jugadora</TableHead>
                    <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-slate-400">Goles</TableHead>
                    <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-slate-400">Asistencias</TableHead>
                    <TableHead className="text-right font-black uppercase text-[11px] tracking-widest text-slate-400 pr-10">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s: any) => (
                    <TableRow key={s.id} className="border-slate-50 group hover:bg-slate-50/50 transition-colors h-20">
                      <TableCell className="font-black text-slate-900 text-base pl-10">{s.playerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/10 text-primary border-none font-black text-base px-4 py-1 rounded-lg">{s.goals}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-accent/10 text-accent border-none font-black text-base px-4 py-1 rounded-lg">{s.assists}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-400 text-lg pr-10">
                        {((s.goals * 3) + s.assists).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats || stats.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-32 text-slate-300 font-black uppercase tracking-widest text-sm italic">
                        Sin estadísticas cargadas todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
