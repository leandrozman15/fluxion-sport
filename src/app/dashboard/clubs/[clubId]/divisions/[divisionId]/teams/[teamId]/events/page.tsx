
"use client";

import { useState, useEffect } from "react";
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
  User, 
  ExternalLink, 
  Flag,
  Users
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

export default function TeamEventsPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    type: "training", 
    date: "", 
    location: "", 
    address: "", 
    opponent: "", 
    description: "",
    refereeId: "",
    coachId: "",
    tournamentId: "",
    status: "scheduled"
  });

  const eventsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"), [db, clubId, divisionId, teamId]);
  const { data: events, isLoading } = useCollection(eventsQuery);

  // Consultamos torneos para vincular
  const tournamentsQuery = useMemoFirebase(() => collection(db, "tournaments"), [db]);
  const { data: tournaments } = useCollection(tournamentsQuery);

  // Consultamos staff del club para el entrenador a cargo
  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId), where("role", "in", ["coach", "admin"])),
    [db, clubId]
  );
  const { data: coaches } = useCollection(coachesQuery);

  const handleCreateEvent = () => {
    const eventId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events")).id;
    const eventDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId);
    
    // Obtenemos nombres para guardar denormalizado (mejor rendimiento en lista)
    const selectedCoach = coaches?.find(c => c.id === newEvent.coachId);
    const selectedTour = tournaments?.find(t => t.id === newEvent.tournamentId);

    setDoc(eventDoc, {
      ...newEvent,
      id: eventId,
      teamId,
      coachName: selectedCoach?.name || "",
      tournamentName: selectedTour?.name || "Amistoso / Otros",
      createdAt: new Date().toISOString()
    });
    
    setNewEvent({ title: "", type: "training", date: "", location: "", address: "", opponent: "", description: "", refereeId: "", coachId: "", tournamentId: "", status: "scheduled" });
    setIsDialogOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", id));
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'training': return <Activity className="h-4 w-4" />;
      case 'match': return <Trophy className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al equipo
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Calendario y Partidos</h1>
            <p className="text-muted-foreground">Gestión de entrenamientos, torneos y encuentros oficiales.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 shadow-lg">
                <Plus className="h-4 w-4" /> Nuevo Encuentro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Programar Actividad</DialogTitle>
                <DialogDescription>Define si es un partido de torneo, amistoso o entrenamiento.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Evento</Label>
                    <Select value={newEvent.type} onValueChange={v => setNewEvent({...newEvent, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Entrenamiento</SelectItem>
                        <SelectItem value="match">Partido Oficial / Amistoso</SelectItem>
                        <SelectItem value="social">Social / Evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y Hora</Label>
                    <Input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título / Descripción Corta</Label>
                  <Input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Ej. Fecha 5: Lomas vs Mitre" />
                </div>

                {newEvent.type === 'match' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label className="text-primary font-bold">Rival (VS)</Label>
                        <Input value={newEvent.opponent} onChange={e => setNewEvent({...newEvent, opponent: e.target.value})} placeholder="Ej. C.D. Los Leones" />
                      </div>
                      <div className="space-y-2">
                        <Label>Torneo / Liga</Label>
                        <Select value={newEvent.tournamentId} onValueChange={v => setNewEvent({...newEvent, tournamentId: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar Torneo..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">Partido Amistoso</SelectItem>
                            {tournaments?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Users className="h-3 w-3" /> Entrenador a Cargo</Label>
                      <Select value={newEvent.coachId} onValueChange={v => setNewEvent({...newEvent, coachId: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar Profesor..." /></SelectTrigger>
                        <SelectContent>
                          {coaches?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Lugar (Sede / Cancha)</Label>
                  <Input value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="Ej. Cancha Principal N°1" />
                </div>

                <div className="space-y-2">
                  <Label>Notas Adicionales</Label>
                  <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Vestimenta, citación previa, etc." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.date}>Programar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          events?.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((ev: any) => (
            <Card key={ev.id} className="relative overflow-hidden group hover:shadow-md transition-all">
              <div className={cn(
                "absolute top-0 left-0 w-1.5 h-full",
                ev.type === 'training' ? 'bg-primary' : ev.type === 'match' ? 'bg-accent' : 'bg-secondary'
              )} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="flex items-center gap-1 font-bold">
                    {getTypeIcon(ev.type)}
                    {ev.type.toUpperCase()}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                      <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events/${ev.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteEvent(ev.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-2 text-xl">{ev.title}</CardTitle>
                {ev.opponent && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[10px] font-black uppercase">VS {ev.opponent}</Badge>
                    {ev.tournamentName && <span className="text-[10px] font-bold text-muted-foreground">• {ev.tournamentName}</span>}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> 
                    <span className="font-medium text-foreground">
                      {new Date(ev.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> {ev.location}
                  </div>
                  {ev.coachName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-accent" /> DT: {ev.coachName}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 py-3 border-t">
                <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs font-bold">
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events/${ev.id}`} className="flex items-center gap-1">
                    Gestionar Citación y Planilla <ChevronLeft className="h-3 w-3 rotate-180 ml-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {events?.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl opacity-50">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay actividades programadas para este equipo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
