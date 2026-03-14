
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
  User
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
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

export default function TeamEventsPage() {
  const { clubId, divisionId, teamId } = useParams() as { clubId: string, divisionId: string, teamId: string };
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    type: "training", 
    date: "", 
    location: "", 
    address: "", 
    opponent: "", 
    description: "" 
  });

  const eventsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"), [db, clubId, divisionId, teamId]);
  const { data: events, isLoading } = useCollection(eventsQuery);

  const handleCreateEvent = () => {
    const eventId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events")).id;
    const eventDoc = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId);
    
    setDoc(eventDoc, {
      ...newEvent,
      id: eventId,
      teamId,
      createdAt: new Date().toISOString()
    });
    
    setNewEvent({ title: "", type: "training", date: "", location: "", address: "", opponent: "", description: "" });
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
            <h1 className="text-3xl font-bold font-headline text-foreground">Calendario del Equipo</h1>
            <p className="text-muted-foreground">Programación de entrenamientos y partidos.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Programar Evento</DialogTitle>
                <DialogDescription>Añade una actividad para el equipo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Ej. Entrenamiento Táctico" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newEvent.type} onValueChange={v => setNewEvent({...newEvent, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Entrenamiento</SelectItem>
                        <SelectItem value="match">Partido</SelectItem>
                        <SelectItem value="event">Evento/Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y Hora</Label>
                    <Input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                  </div>
                </div>
                {newEvent.type === 'match' && (
                  <div className="space-y-2">
                    <Label>Rival</Label>
                    <Input value={newEvent.opponent} onChange={e => setNewEvent({...newEvent, opponent: e.target.value})} placeholder="Ej. C.D. Los Leones" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Lugar (Sede/Estadio)</Label>
                  <Input value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
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
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          events?.map((ev: any) => (
            <Card key={ev.id} className="relative overflow-hidden">
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                ev.type === 'training' ? 'bg-primary' : ev.type === 'match' ? 'bg-accent' : 'bg-secondary'
              )} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getTypeIcon(ev.type)}
                    {ev.type.toUpperCase()}
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteEvent(ev.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="mt-2">{ev.title}</CardTitle>
                {ev.opponent && <CardDescription>vs {ev.opponent}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {new Date(ev.date).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {ev.location}
                </div>
                {ev.description && <p className="italic text-xs pt-2 border-t">{ev.description}</p>}
              </CardContent>
            </Card>
          ))
        )}
        {events?.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">No hay eventos programados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
