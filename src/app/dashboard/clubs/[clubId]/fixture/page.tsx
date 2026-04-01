
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Loader2, 
  Trash2, 
  ChevronLeft, 
  MapPin, 
  Clock, 
  Trophy, 
  ArrowRight,
  Filter,
  Save,
  CheckCircle2,
  CalendarDays,
  X
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, getDocs } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GlobalFixtureManagerPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newMatch, setNewMatch] = useState({ 
    teamId: "", 
    opponent: "", 
    date: "", 
    location: "", 
    type: "match",
    title: ""
  });

  useEffect(() => {
    async function fetchAllTeams() {
      if (!db) return;
      try {
        const divsSnap = await getDocs(collection(db, "clubs", clubId, "divisions"));
        const teams: any[] = [];
        for (const divDoc of divsSnap.docs) {
          const tSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divDoc.id, "teams"));
          tSnap.forEach(td => teams.push({ ...td.data(), id: td.id, divisionId: divDoc.id, divisionName: divDoc.data().name }));
        }
        setAllTeams(teams);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchAllTeams();
  }, [db, clubId]);

  const handleCreateMatch = async () => {
    if (!newMatch.teamId || !newMatch.opponent || !newMatch.date) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Completa equipo, rival y fecha." });
      return;
    }

    const selectedTeam = allTeams.find(t => t.id === newMatch.teamId);
    if (!selectedTeam) return;

    try {
      const matchId = doc(collection(db, "clubs", clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events")).id;
      const matchDoc = doc(db, "clubs", clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events", matchId);
      
      await setDoc(matchDoc, {
        ...newMatch,
        id: matchId,
        title: newMatch.title || `Fecha vs ${newMatch.opponent}`,
        status: "scheduled",
        createdAt: new Date().toISOString()
      });

      toast({ title: "Partido Programado", description: `Se agendó el encuentro para ${selectedTeam.name}.` });
      setIsDialogOpen(false);
      setNewMatch({ teamId: "", opponent: "", date: "", location: "", type: "match", title: "" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/coordinator" className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Gestor de Fixture Anual</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Planificación masiva de encuentros competitivos.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                <Plus className="h-5 w-5 mr-2" /> Programar Partido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Nuevo Encuentro</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Agrega una fecha al calendario competitivo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Equipo del Club</Label>
                  <Select value={newMatch.teamId} onValueChange={v => setNewMatch({...newMatch, teamId: v})}>
                    <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                    <SelectContent>
                      {allTeams.map(t => (
                        <SelectItem key={t.id} value={t.id} className="font-bold">{t.divisionName} - {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Club Rival (VS)</Label>
                  <Input value={newMatch.opponent} onChange={e => setNewMatch({...newMatch, opponent: e.target.value})} placeholder="Nombre del rival" className="h-12 border-2 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Fecha y Hora</Label>
                    <Input type="datetime-local" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Sede / Cancha</Label>
                    <Input value={newMatch.location} onChange={e => setNewMatch({...newMatch, location: e.target.value})} placeholder="Ej. Cancha Local" className="h-12 border-2" />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">Cancelar</Button>
                <Button onClick={handleCreateMatch} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Programar Fecha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <CardHeader className="bg-slate-900 text-white rounded-t-[2rem]">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-primary" /> Calendario de Competencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-8 text-center space-y-4 opacity-60">
              <Trophy className="h-16 w-16 mx-auto text-primary" />
              <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">Vista de fixture global activada</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Como coordinador, puedes ver todos los partidos del club aquí. Utiliza el botón superior para cargar la agenda del año.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
