
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
  Search
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");

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
        role: "convoked", // Simplificado sin titular/suplente
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

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const isMatch = event?.type === 'match';
  const isTraining = event?.type === 'training';

  const filteredRoster = roster?.filter(p => 
    p.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`} className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al calendario
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold font-headline text-foreground">{event?.title}</h1>
              <Badge variant={isTraining ? "secondary" : "default"}>{event?.type?.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm font-bold">
                <CalendarIcon className="h-4 w-4" /> 
                {event?.date ? (
                  <>
                    {new Date(event.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(event.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs
                  </>
                ) : '-'}
              </span>
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
              <Button onClick={handlePublishCallups} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5 h-12 font-black uppercase text-[10px] tracking-widest px-6">
                <BellRing className="h-4 w-4" /> Notificar a Jugadoras
              </Button>
            )}
            {isMatch && !event.lineupSubmitted ? (
              <Button onClick={handlePresentLineup} variant="default" className="gap-2 font-black bg-primary hover:bg-primary/90 h-12 uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-primary/20">
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
        <TabsList className="bg-white/10 backdrop-blur-md p-1 border mb-6 inline-flex rounded-xl">
          {isTraining && (
            <>
              <TabsTrigger value="attendance" className="flex items-center gap-2 h-10 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg transition-all">
                <CheckCircle2 className="h-4 w-4" /> Asistencia
              </TabsTrigger>
              <TabsTrigger value="planning" className="flex items-center gap-2 h-10 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg transition-all">
                <ClipboardList className="h-4 w-4" /> Plan de Trabajo
              </TabsTrigger>
            </>
          )}
          {isMatch && (
            <>
              <TabsTrigger value="callups" className="flex items-center gap-2 h-10 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg transition-all">
                <Users className="h-4 w-4" /> Citación Check-list
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2 h-10 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-lg transition-all">
                <Star className="h-4 w-4" /> Estadísticas
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="attendance">
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                <Users className="h-6 w-6 text-primary" /> Control de Presencia
              </CardTitle>
              <CardDescription className="font-medium">Marca quiénes asistieron hoy a la sesión.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster?.map((p: any) => {
                  const status = attendanceList?.find(a => a.playerId === p.playerId)?.status || 'unknown';
                  return (
                    <div key={p.id} className="flex items-center justify-between p-4 border-2 rounded-2xl bg-white hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm">
                          <AvatarImage src={p.playerPhoto} />
                          <AvatarFallback className="font-black text-slate-300 bg-slate-50">{p.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-black text-slate-900 text-sm">{p.playerName}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleAttendance(p.playerId, p.playerName, status)}
                        className={cn(
                          "h-12 w-12 p-0 rounded-2xl border-2 transition-all shadow-md",
                          status === 'going' ? "bg-green-500 text-white border-green-600 scale-110" :
                          status === 'not_going' ? "bg-red-500 text-white border-red-600 shadow-red-500/20" :
                          "bg-white text-slate-200 border-slate-100 hover:border-primary hover:text-primary"
                        )}
                      >
                        {status === 'going' ? <CheckCircle2 className="h-6 w-6" /> : 
                         status === 'not_going' ? <XCircle className="h-6 w-6" /> : 
                         <HelpCircle className="h-6 w-6" />}
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
            <Card className="lg:col-span-2 border-none shadow-2xl bg-white/95 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <ClipboardList className="h-6 w-6 text-primary" /> Detalle de la Sesión
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Planificación técnica y ejercicios previstos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event?.objectives && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Target className="h-3 w-3" /> Objetivos Principales
                    </h4>
                    <p className="p-5 bg-primary/5 rounded-2xl border border-primary/10 font-bold text-slate-800">{event.objectives}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Desarrollo de la Clase / Ejercicios</h4>
                  <div className="p-8 border-2 border-dashed rounded-[2rem] bg-slate-50/50">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium text-slate-600">
                      {event?.description || "No se han cargado ejercicios detallados para esta sesión."}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-6">
                <Button variant="outline" size="sm" className="w-full gap-2 h-12 font-black uppercase text-[10px] tracking-widest border-2">Editar Planificación</Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] overflow-hidden relative">
                <CardHeader className="relative z-10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Cronograma de Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10 pt-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-xs font-bold opacity-60">Duración Total</span>
                    <span className="text-2xl font-black text-primary">{event?.duration || 90} min</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Entrada en Calor", time: "15 min" },
                      { label: "Bloque Principal", time: "60 min" },
                      { label: "Cierre / Elongación", time: "15 min" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] font-black uppercase tracking-tight">
                        <span className="opacity-40">{item.label}</span>
                        <span className="opacity-90">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <Timer className="absolute right-[-20px] bottom-[-20px] h-40 w-40 opacity-5 rotate-12" />
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="callups">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-8 border-none shadow-2xl bg-white/95 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900">Lista de Convocatoria</CardTitle>
                    <CardDescription className="font-bold text-slate-500">Tilda las jugadoras citadas para este partido.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar jugadora..." 
                      className="pl-10 h-10 text-xs font-bold border-2 rounded-xl"
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
                        "flex items-center justify-between p-5 transition-all group",
                        isConvoked ? "bg-primary/5" : "hover:bg-slate-50"
                      )}>
                        <div className="flex items-center gap-5">
                          <Avatar className={cn(
                            "h-14 w-14 border-2 transition-all shadow-sm rounded-xl",
                            isConvoked ? "border-primary scale-105" : "border-slate-100"
                          )}>
                            <AvatarImage src={p.playerPhoto} />
                            <AvatarFallback className="font-black text-slate-300">{p.playerName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-black text-lg leading-none transition-colors",
                              isConvoked ? "text-primary" : "text-slate-900"
                            )}>
                              {p.playerName}
                            </span>
                            {isConvoked && callupData?.status !== 'pending' && (
                              <span className="text-[10px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                {callupData.status === 'confirmed' ? (
                                  <><CheckCircle2 className="h-3 w-3 text-green-500" /> Confirmada</>
                                ) : (
                                  <><XCircle className="h-3 w-3 text-red-500" /> No disponible</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!event?.lineupSubmitted && (
                          <Button 
                            onClick={() => handleToggleCallup(p)}
                            className={cn(
                              "h-12 w-12 p-0 rounded-2xl border-2 transition-all shadow-md",
                              isConvoked 
                                ? "bg-primary text-white border-primary shadow-primary/20 scale-110" 
                                : "bg-white text-slate-200 border-slate-100 hover:border-primary hover:text-primary"
                            )}
                          >
                            <CheckCircle2 className={cn("h-7 w-7", isConvoked ? "opacity-100" : "opacity-30")} />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-6">
              <Card className={cn(
                "border-none shadow-2xl overflow-hidden rounded-[2rem]",
                event?.callupsPublished ? "bg-green-500 text-white" : "bg-slate-900 text-white"
              )}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                    {event?.callupsPublished ? <CheckCircle2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                    Resumen Convocatoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs font-bold opacity-60">Total Citadas</span>
                    <span className="text-4xl font-black">{callups?.length || 0}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className="opacity-40">Confirmadas</span>
                      <span className="text-green-300">{callups?.filter(c => c.status === 'confirmed').length || 0}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className="opacity-40">Bajas</span>
                      <span className="text-red-300">{callups?.filter(c => c.status === 'unavailable').length || 0}</span>
                    </div>
                  </div>
                  {!event?.callupsPublished && callups && callups.length > 0 && (
                    <Button 
                      onClick={handlePublishCallups}
                      className="w-full bg-white text-primary hover:bg-slate-50 font-black uppercase text-[10px] tracking-[0.2em] h-12 mt-4 shadow-xl"
                    >
                      Enviar Citación
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="p-6 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-3 flex items-center gap-2">
                  <Star className="h-3 w-3 text-accent" /> Sugerencia Técnica
                </p>
                <p className="text-xs text-white/80 font-bold leading-relaxed">
                  Utiliza el check-list para una citación rápida. Una vez finalizada, pulsa "Enviar Citación" para que las jugadoras reciban la notificación oficial.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md">
            <CardHeader className="border-b border-slate-100 pb-6">
              <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" /> Goleadoras y Desempeño
              </CardTitle>
              <CardDescription className="font-medium">Registro estadístico del partido.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none bg-slate-50/50">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">Jugadora</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Goles</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Asistencias</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Puntaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.map((s: any) => (
                    <TableRow key={s.id} className="border-slate-50 group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-black text-slate-900 pl-8">{s.playerName}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-black text-sm px-3">{s.goals}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-none font-black text-sm px-3">{s.assists}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-400 pr-8">
                        {((s.goals * 3) + s.assists).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats || stats.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24 text-slate-300 font-black uppercase tracking-widest text-xs italic">
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
