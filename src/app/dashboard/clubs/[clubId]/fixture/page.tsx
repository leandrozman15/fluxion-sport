
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
  CalendarDays,
  Shield,
  Building2,
  ExternalLink,
  MapPinned
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, getDocs, query, orderBy, getDoc } from "firebase/firestore";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GlobalFixtureManagerPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [clubData, setClubData] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newMatch, setNewMatch] = useState({ 
    teamId: "", 
    opponentId: "", 
    date: "", 
    location: "", 
    type: "match",
    title: "",
    departureTime: "",
    isHome: true,
  });

  const opponentsQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "opponents"), orderBy("name", "asc")), 
    [db, clubId]
  );
  const { data: opponents } = useCollection(opponentsQuery);

  useEffect(() => {
    async function fetchAllTeams() {
      if (!db) return;
      try {
        const clubDoc = await getDoc(doc(db, "clubs", clubId));
        if (clubDoc.exists()) setClubData({ ...clubDoc.data(), id: clubDoc.id });

        const divsSnap = await getDocs(collection(db, "clubs", clubId, "divisions"));
        const teams: any[] = [];
        for (const divDoc of divsSnap.docs) {
          const tSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divDoc.id, "teams"));
          tSnap.forEach(td => teams.push({ 
            ...td.data(), 
            id: td.id, 
            divisionId: divDoc.id, 
            divisionName: divDoc.data().name 
          }));
        }
        setAllTeams(teams);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchAllTeams();
  }, [db, clubId]);

  const handleCreateMatch = async () => {
    if (!newMatch.teamId || !newMatch.opponentId || !newMatch.date) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Completa equipo, rival y fecha." });
      return;
    }

    const selectedTeam = allTeams.find(t => t.id === newMatch.teamId);
    // opponentId "__own_club__" means the own club is the rival (used for isHome logic)
    const isOwnClubAsRival = newMatch.opponentId === "__own_club__";
    const selectedOpp = isOwnClubAsRival ? clubData : opponents?.find(o => o.id === newMatch.opponentId);
    if (!selectedTeam || !selectedOpp) return;

    try {
      const matchId = doc(collection(db, "clubs", clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events")).id;
      const matchDoc = doc(db, "clubs", clubId, "divisions", selectedTeam.divisionId, "teams", selectedTeam.id, "events", matchId);
      
      await setDoc(matchDoc, {
        ...newMatch,
        id: matchId,
        opponent: selectedOpp.name,
        opponentId: isOwnClubAsRival ? clubId : selectedOpp.id,
        opponentLogo: selectedOpp.logoUrl || "",
        isHome: newMatch.isHome,
        location: newMatch.isHome ? (clubData?.address || "Sede Propia") : (selectedOpp.city || selectedOpp.address || "Sede Rival"),
        address: newMatch.isHome ? (clubData?.address || "") : (selectedOpp.address || ""),
        title: newMatch.title || `vs ${selectedOpp.name}`,
        departureTime: newMatch.departureTime || "",
        status: "scheduled",
        createdAt: new Date().toISOString()
      });

      toast({ title: "Partido Programado", description: `Se agendó el encuentro para ${selectedTeam.name} vs ${selectedOpp.name}.` });
      setIsDialogOpen(false);
      setNewMatch({ teamId: "", opponentId: "", date: "", location: "", type: "match", title: "", departureTime: "", isHome: true });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/coordinator" className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Gestor de Fixture Anual</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Planificación masiva vinculada a base de rivales.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
              <Link href={`/dashboard/clubs/${clubId}/opponents`}><Shield className="h-4 w-4 mr-2" /> Gestionar Rivales</Link>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                  <Plus className="h-5 w-5 mr-2" /> Programar Partido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Programar Encuentro</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Selecciona un rival de la base para cargar sus datos automáticamente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  {/* Local / Visitante */}
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Condición</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewMatch({...newMatch, isHome: true})}
                        className={`h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newMatch.isHome ? 'bg-primary text-white border-primary shadow-lg' : 'border-slate-200 text-slate-400 hover:border-primary/40'}`}
                      >
                        🏠 Local
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMatch({...newMatch, isHome: false})}
                        className={`h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!newMatch.isHome ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'border-slate-200 text-slate-400 hover:border-slate-400'}`}
                      >
                        ✈️ Visitante
                      </button>
                    </div>
                  </div>

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
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Club Rival</Label>
                    <Select value={newMatch.opponentId} onValueChange={v => setNewMatch({...newMatch, opponentId: v})}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Elegir rival..." /></SelectTrigger>
                      <SelectContent>
                        {/* Propio club como opción (útil para torneos internos) */}
                        {clubData && (
                          <SelectItem value="__own_club__" className="font-bold">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 rounded-none"><AvatarImage src={clubData.logoUrl} className="object-contain" /><AvatarFallback className="text-[8px]">🏠</AvatarFallback></Avatar>
                              {clubData.name} <span className="text-[9px] text-slate-400 ml-1">(nuestro club)</span>
                            </div>
                          </SelectItem>
                        )}
                        {opponents?.map(o => (
                          <SelectItem key={o.id} value={o.id} className="font-bold">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 rounded-none"><AvatarImage src={o.logoUrl} className="object-contain" /></Avatar>
                              {o.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!opponents || opponents.length === 0) && (
                      <p className="text-[10px] text-destructive font-black uppercase mt-1">Debes cargar rivales primero para armar el fixture.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Fecha y Hora</Label>
                      <Input type="datetime-local" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="h-12 border-2 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" /> Salida del Micro desde el Club
                        <span className="text-[9px] text-slate-300 font-bold normal-case tracking-normal">(opcional – editable luego)</span>
                      </Label>
                      <Input
                        type="time"
                        value={newMatch.departureTime}
                        onChange={e => setNewMatch({...newMatch, departureTime: e.target.value})}
                        className="h-12 border-2 font-bold"
                        placeholder="--:--"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                  <Button onClick={handleCreateMatch} disabled={!newMatch.teamId || !newMatch.opponentId || !newMatch.date} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Confirmar en Fixture</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-slate-50 border-b pb-6">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
              <CalendarDays className="h-6 w-6 text-primary" /> Calendario Unificado de Competencia
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold italic">Monitor de partidos programados en todas las categorías.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-16 text-center space-y-4">
              <div className="bg-primary/5 p-8 rounded-full inline-block mb-4">
                <Trophy className="h-20 w-20 text-primary opacity-40" />
              </div>
              <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Gestor de Partidos Activo</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                Al seleccionar un rival desde la base maestra, Fluxion Sport cargará automáticamente su **escudo oficial** y **dirección de sede** para que las jugadoras puedan utilizar el GPS desde sus perfiles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
