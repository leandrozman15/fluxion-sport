
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Loader2, 
  Trash2, 
  ChevronLeft, 
  MapPin, 
  Clock, 
  Trophy, 
  Activity, 
  ExternalLink, 
  Users,
  Target,
  Timer,
  ChevronRight,
  CalendarDays,
  MapPinned,
  MoreVertical
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TeamEventsPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    type: "training", 
    date: "", 
    location: "", 
    address: "", 
    opponent: "", 
    description: "",
    duration: 90,
    objectives: "",
    status: "scheduled"
  });

  const eventsQuery = useMemoFirebase(() => 
    collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"), 
    [db, clubId, divisionId, teamId]
  );
  const { data: events, isLoading } = useCollection(eventsQuery);

  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId), where("role", "in", ["coach", "admin", "coordinator"])),
    [db, clubId]
  );
  const { data: coaches } = useCollection(coachesQuery);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    
    const eventId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events")).id;
    const eventDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId);
    
    await setDoc(eventDoc, {
      ...newEvent,
      id: eventId,
      teamId,
      createdAt: new Date().toISOString()
    });
    
    setNewEvent({ title: "", type: "training", date: "", location: "", address: "", opponent: "", description: "", duration: 90, objectives: "", status: "scheduled" });
    setIsDialogOpen(false);
    toast({ title: "Actividad Programada", description: "La actividad se ha añadido al calendario del equipo." });
  };

  const handleDeleteEvent = (id: string) => {
    if(confirm("¿Seguro que deseas eliminar esta actividad?")) {
      deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", id));
      toast({ variant: "destructive", title: "Actividad Eliminada" });
    }
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'training': return { icon: Activity, color: "bg-primary", label: "ENTRENAMIENTO", border: "border-primary/20", light: "bg-primary/5" };
      case 'match': return { icon: Trophy, color: "bg-accent", label: "PARTIDO", border: "border-accent/20", light: "bg-accent/5" };
      default: return { icon: CalendarIcon, color: "bg-slate-500", label: "EVENTO", border: "border-slate-200", light: "bg-slate-50" };
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-6">
        <Link href={`/dashboard/coach`} className="ambient-link group w-fit">
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> Volver al equipo
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline tracking-tight text-white drop-shadow-2xl">Agenda Deportiva</h1>
            <p className="ambient-text text-lg opacity-90 font-bold">Planificación de sesiones y encuentros oficiales.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-3 h-12 px-8 font-black uppercase text-[11px] tracking-widest shadow-2xl bg-white text-primary hover:bg-slate-50">
                <Plus className="h-5 w-5" /> Nueva Actividad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Programar Sesión o Partido</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Define los detalles técnicos y logísticos de la actividad.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Tipo de Actividad</Label>
                    <Select value={newEvent.type} onValueChange={v => setNewEvent({...newEvent, type: v})}>
                      <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Entrenamiento</SelectItem>
                        <SelectItem value="match">Partido Oficial / Amistoso</SelectItem>
                        <SelectItem value="social">Social / Evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Fecha y Hora</Label>
                    <Input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Título / Nombre de la Sesión</Label>
                  <Input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Ej. Entrenamiento Físico-Técnico" className="h-12 border-2 font-bold" />
                </div>

                {newEvent.type === 'training' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-900 flex items-center gap-2"><Timer className="h-3.5 w-3.5" /> Duración (min)</Label>
                      <Input type="number" value={newEvent.duration} onChange={e => setNewEvent({...newEvent, duration: parseInt(e.target.value)})} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-900 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Objetivos</Label>
                      <Input value={newEvent.objectives} onChange={e => setNewEvent({...newEvent, objectives: e.target.value})} placeholder="Ej. Salida de fondo" className="h-10" />
                    </div>
                  </div>
                )}

                {newEvent.type === 'match' && (
                  <div className="space-y-4 bg-accent/5 p-6 rounded-2xl border-2 border-accent/20">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-accent flex items-center gap-2"><Trophy className="h-3.5 w-3.5" /> Rival (VS)</Label>
                      <Input value={newEvent.opponent} onChange={e => setNewEvent({...newEvent, opponent: e.target.value})} placeholder="Ej. C.D. Los Leones" className="h-12 border-2 border-accent/30 font-bold" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Sede / Cancha</Label>
                    <Input value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="Ej. Cancha Principal N°1" className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Responsable</Label>
                    <Select onValueChange={v => {}}>
                      <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {coaches?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPinned className="h-3.5 w-3.5" /> Dirección (Google Maps)</Label>
                  <Input value={newEvent.address} onChange={e => setNewEvent({...newEvent, address: e.target.value})} placeholder="Ej. Calle Falsa 123, CABA" className="h-12 border-2" />
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Notas Adicionales</Label>
                  <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Instrucciones para el plantel..." className="h-24 border-2" />
                </div>
              </div>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                <Button onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.date} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg">Confirmar y Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-white h-12 w-12" /></div>
        ) : events?.length === 0 ? (
          <div className="col-span-full text-center py-32 border-2 border-dashed rounded-[2.5rem] bg-white/5 backdrop-blur-md opacity-50">
            <CalendarDays className="h-20 w-20 mx-auto text-white mb-6 opacity-20" />
            <p className="text-white font-black uppercase tracking-[0.3em] text-sm">No hay actividades programadas</p>
            <p className="text-white/60 text-xs mt-2 font-bold uppercase tracking-widest">Usa el botón "Nueva Actividad" para empezar.</p>
          </div>
        ) : (
          events?.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((ev: any) => {
            const style = getTypeStyle(ev.type);
            const date = new Date(ev.date);
            return (
              <Card key={ev.id} className="group relative overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] bg-white transition-all hover:-translate-y-1">
                <div className={cn("absolute top-0 left-0 w-3 h-full", style.color)} />
                
                <CardHeader className="pb-4 pt-8 px-8">
                  <div className="flex justify-between items-start">
                    <Badge className={cn("font-black text-[9px] tracking-[0.2em] px-3 py-1.5 border-none", style.color, "text-white")}>
                      <style.icon className="h-3 w-3 mr-1.5" />
                      {style.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-300 hover:text-destructive hover:bg-red-50 rounded-xl" onClick={() => handleDeleteEvent(ev.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-3xl font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{ev.title}</h3>
                    {ev.type === 'match' && ev.opponent && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Rival:</span>
                        <Badge className="bg-accent/10 text-accent hover:bg-accent/15 border-none font-black text-xs px-3">{ev.opponent}</Badge>
                      </div>
                    )}
                    {ev.type === 'training' && ev.objectives && (
                      <div className="flex items-center gap-2 mt-3">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-slate-500">{ev.objectives}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-8 pb-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Fecha y Horario
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {date.toLocaleDateString([], { day: '2-digit', month: 'short' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                        {ev.duration && ev.duration > 0 && (
                          <span className="ml-2 text-primary font-bold">({ev.duration} min)</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPinned className="h-3 w-3" /> Ubicación
                      </p>
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-slate-900 truncate">{ev.location || "Sede Club"}</p>
                        {ev.address && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> Ver en Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className={cn("p-0 border-t", style.light)}>
                  <Link 
                    href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events/${ev.id}`}
                    className="flex items-center justify-between w-full px-8 py-5 group/link"
                  >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                      {ev.type === 'training' ? 'Ver Plan y Asistencia' : 'Gestionar Citación y Planilla'}
                    </span>
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover/link:translate-x-1", style.color)}>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </Link>
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
