
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
  Table as TableIcon,
  Trophy,
  Shield,
  ArrowUpCircle,
  Building2
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function AdminStandingsPage() {
  const { clubId, divisionId } = useParams() as { clubId: string, divisionId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [newTeam, setNewTeam] = useState({ 
    teamName: "", 
    opponentId: "",
    played: 0, 
    won: 0, 
    drawn: 0, 
    lost: 0, 
    goalsFor: 0, 
    goalsAgainst: 0, 
    points: 0 
  });

  const divRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId), [db, clubId, divisionId]);
  const { data: division, isLoading: divLoading } = useDoc(divRef);

  const standingsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "standings"), [db, clubId, divisionId]);
  const { data: standings, isLoading: standingsLoading } = useCollection(standingsQuery);

  const teamsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams"), [db, clubId, divisionId]);
  const { data: teams } = useCollection(teamsQuery);

  const opponentsQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "opponents"), orderBy("name", "asc")), 
    [db, clubId]
  );
  const { data: opponents } = useCollection(opponentsQuery);

  const handleAddStanding = async () => {
    if (!newTeam.teamName && !newTeam.opponentId) return;
    
    let finalName = newTeam.teamName;
    let finalLogo = "";

    if (newTeam.opponentId) {
      const opp = opponents?.find(o => o.id === newTeam.opponentId);
      if (opp) {
        finalName = opp.name;
        finalLogo = opp.logoUrl || "";
      }
    }

    try {
      const standingId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "standings")).id;
      const standingDoc = doc(db, "clubs", clubId, "divisions", divisionId, "standings", standingId);
      
      await setDoc(standingDoc, {
        ...newTeam,
        teamName: finalName,
        teamLogo: finalLogo,
        subcategoryId: selectedSubcategory !== 'all' ? selectedSubcategory : '',
        id: standingId,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Tabla Actualizada", description: `${finalName} añadido.` });
      setNewTeam({ teamName: "", opponentId: "", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      setIsCreateOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    }
  };

  const filteredStandings = standings?.filter((s: any) => {
    if (selectedSubcategory === 'all') return true;
    return s.subcategoryId === selectedSubcategory;
  });

  const sortedStandings = filteredStandings?.sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    return diffB - diffA;
  });

  if (divLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions`} className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a categorías
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Tabla de Posiciones: {division?.name}</h1>
              <Badge className="bg-primary text-white border-none uppercase font-black px-3 py-1">OFICIAL</Badge>
            </div>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Carga de puntos y clasificación competitiva.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                <Plus className="h-5 w-5 mr-2" /> Agregar Club a Tabla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Registro de Clasificación</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Selecciona un club de la base para vincular su escudo oficial.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {teams && teams.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Subcategoría / Torneo</Label>
                    <Select value={selectedSubcategory !== 'all' ? selectedSubcategory : ''} onValueChange={v => setSelectedSubcategory(v)}>
                      <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue placeholder="Seleccionar subcategoría..." /></SelectTrigger>
                      <SelectContent>
                        {teams.map((t: any) => (
                          <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Club Rival (Vinculado)</Label>
                  <Select value={newTeam.opponentId} onValueChange={v => setNewTeam({...newTeam, opponentId: v})}>
                    <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue placeholder="Elegir club..." /></SelectTrigger>
                    <SelectContent>
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
                </div>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400 font-black">O escribe manualmente</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Alternativo</Label>
                  <Input value={newTeam.teamName} onChange={e => setNewTeam({...newTeam, teamName: e.target.value})} placeholder="Ej. Lomas Athletic..." className="h-12 border-2 font-bold bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">PJ</Label>
                    <Input type="number" value={newTeam.played} onChange={e => setNewTeam({...newTeam, played: parseInt(e.target.value) || 0})} className="h-12 border-2 font-bold bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">PTS</Label>
                    <Input type="number" value={newTeam.points} onChange={e => setNewTeam({...newTeam, points: parseInt(e.target.value) || 0})} className="h-12 border-2 font-black bg-primary/5 border-primary/30" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 text-center">
                    <Label className="text-[10px] font-black uppercase text-green-600">G</Label>
                    <Input type="number" value={newTeam.won} onChange={e => setNewTeam({...newTeam, won: parseInt(e.target.value) || 0})} className="h-10 text-center bg-white" />
                  </div>
                  <div className="space-y-1 text-center">
                    <Label className="text-[10px] font-black uppercase text-orange-600">E</Label>
                    <Input type="number" value={newTeam.drawn} onChange={e => setNewTeam({...newTeam, drawn: parseInt(e.target.value) || 0})} className="h-10 text-center bg-white" />
                  </div>
                  <div className="space-y-1 text-center">
                    <Label className="text-[10px] font-black uppercase text-red-600">P</Label>
                    <Input type="number" value={newTeam.lost} onChange={e => setNewTeam({...newTeam, lost: parseInt(e.target.value) || 0})} className="h-10 text-center bg-white" />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                <Button onClick={handleAddStanding} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Guardar en Tabla</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
        <CardHeader className="bg-slate-50 border-b pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                <Trophy className="h-6 w-6 text-yellow-500" /> Posiciones de Liga
              </CardTitle>
              <CardDescription className="text-slate-500 font-bold italic">Tabla oficial actualizada para los socios.</CardDescription>
            </div>
            {teams && teams.length > 0 && (
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger className="w-full md:w-64 h-11 border-2 font-black text-xs uppercase tracking-widest bg-white">
                  <SelectValue placeholder="Filtrar por subcategoría..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-black">Todas las subcategorías</SelectItem>
                  {teams.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {standingsLoading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-none bg-slate-50/50">
                  <TableHead className="w-16 text-center font-black uppercase text-[10px] tracking-widest text-slate-400">Pos</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Club</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">PJ</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">G</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">E</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400">P</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-primary">PTS</TableHead>
                  <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Gestión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStandings?.map((s: any, i: number) => (
                  <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center mx-auto font-black text-xs shadow-sm",
                        i === 0 ? "bg-yellow-500 text-white shadow-yellow-500/20" : 
                        i < 4 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                      )}>
                        {i + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-lg border bg-white">
                          <AvatarImage src={s.teamLogo} className="object-contain p-1" />
                          <AvatarFallback className="bg-slate-50 text-[10px] text-slate-300 font-black">{s.teamName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-black text-slate-900 text-base">{s.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-500">{s.played}</TableCell>
                    <TableCell className="text-center font-bold text-green-600">{s.won}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600">{s.drawn}</TableCell>
                    <TableCell className="text-center font-bold text-red-600">{s.lost}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary text-white font-black text-lg px-4 border-none shadow-lg shadow-primary/20">
                        {s.points}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" size="sm" className="text-slate-300 hover:text-destructive hover:bg-red-50 rounded-xl" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "standings", s.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!sortedStandings || sortedStandings.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-32 text-slate-300 font-black uppercase tracking-widest text-xs italic">
                      No hay equipos registrados en la tabla oficial.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
