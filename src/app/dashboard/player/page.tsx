
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin,
  Loader2,
  Bell,
  UserCircle,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PlayerDashboard() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      
      try {
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(
            collection(firestore, "clubs", clubDoc.id, "players"), 
            where("email", "==", user.email || "")
          ));
          
          if (!pSnap.empty) {
            const pData = pSnap.docs[0].data();
            setPlayerInfo({ ...pData, clubId: clubDoc.id });
            
            // Buscar asignación de equipo para obtener el teamId real
            const divSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
            for (const dDoc of divSnap.docs) {
              const subSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", dDoc.id, "subcategories"));
              for (const sDoc of subSnap.docs) {
                const teamsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", dDoc.id, "subcategories", sDoc.id, "teams"));
                for (const tDoc of teamsSnap.docs) {
                  const rosterSnap = await getDocs(query(
                    collection(firestore, "clubs", clubDoc.id, "divisions", dDoc.id, "subcategories", sDoc.id, "teams", tDoc.id, "assignments"),
                    where("playerId", "==", pData.id)
                  ));
                  if (!rosterSnap.empty) {
                    setTeamInfo({ 
                      ...tDoc.data(), 
                      divisionId: dDoc.id, 
                      subcategoryId: sDoc.id,
                      divisionName: dDoc.data().name,
                      subcategoryName: sDoc.data().name,
                      id: tDoc.id 
                    });
                    break;
                  }
                }
                if (teamInfo) break;
              }
              if (teamInfo) break;
            }
            break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const callupsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(collection(firestore, "match_callups"), where("playerId", "==", playerInfo.id));
  }, [firestore, playerInfo]);

  const { data: callups, isLoading: callupsLoading } = useCollection(callupsQuery);

  const handleUpdateCallup = (callupId: string, status: 'confirmed' | 'unavailable') => {
    if (!firestore) return;
    setDoc(doc(firestore, "match_callups", callupId), { status }, { merge: true });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <UserCircle className="h-20 w-20 text-muted-foreground opacity-20 mb-6" />
        <h2 className="text-2xl font-bold font-headline">Perfil no vinculado</h2>
        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
          Tu correo <span className="font-semibold text-foreground">{user?.email}</span> no está asociado a ninguna ficha activa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 border-4 border-primary/10">
            <AvatarImage src={playerInfo.photoUrl} />
            <AvatarFallback className="text-2xl">{playerInfo.firstName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{playerInfo.firstName} {playerInfo.lastName}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="secondary">#{playerInfo.jerseyNumber}</Badge>
              <Badge variant="outline">{playerInfo.position}</Badge>
              {teamInfo && <Badge className="bg-primary">{teamInfo.name} ({teamInfo.subcategoryName})</Badge>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Temporada</p>
          <p className="text-lg font-bold text-primary">{teamInfo?.season || '2024-2025'}</p>
        </div>
      </header>

      {teamInfo && (
        <Alert className="border-accent bg-accent/5">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <AlertTitle className="font-bold">Mi Equipo Actual</AlertTitle>
          <AlertDescription>
            {teamInfo.subcategoryName} • {teamInfo.name} • Coach: {teamInfo.coachName}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="callups" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="callups" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Convocatorias
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Plantilla
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="callups" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {callupsLoading ? (
              <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : !callups || callups.length === 0 ? (
              <Card className="col-span-full border-dashed py-20 flex flex-col items-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">No tienes convocatorias activas.</p>
              </Card>
            ) : (
              callups.map((c: any) => (
                <CallupItem key={c.id} callup={c} onUpdate={handleUpdateCallup} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Compañeros de Equipo</CardTitle>
              <CardDescription>Plantilla oficial del {teamInfo?.name || 'equipo'}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <Users className="h-12 w-12 mb-4" />
                <p>Lista de compañeros disponible una vez asignados al equipo.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallupItem({ callup, onUpdate }: { callup: any, onUpdate: (id: string, s: any) => void }) {
  const db = useFirestore();
  const matchRef = useMemoFirebase(() => doc(db, "tournament_matches", callup.matchId), [db, callup.matchId]);
  const { data: match } = useDoc(matchRef);

  if (!match) return null;

  return (
    <Card className="overflow-hidden border-l-4 border-l-accent shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="capitalize">
            {callup.role === 'starter' ? 'Titular' : 'Suplente'}
          </Badge>
          <Badge variant={callup.status === 'confirmed' ? 'default' : callup.status === 'unavailable' ? 'destructive' : 'outline'}>
            {callup.status === 'pending' ? 'Pendiente' : callup.status === 'confirmed' ? 'Confirmado' : 'Ausente'}
          </Badge>
        </div>
        <CardTitle className="mt-2 text-lg">{match.homeTeamName} vs {match.awayTeamName}</CardTitle>
        <CardDescription className="font-bold text-primary flex items-center gap-1">
          <Trophy className="h-3 w-3" /> Partido de Torneo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> {new Date(match.date).toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> {match.location}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 border-t pt-4">
        <Button 
          variant={callup.status === 'confirmed' ? 'default' : 'outline'} 
          className="flex-1 gap-2"
          onClick={() => onUpdate(callup.id, 'confirmed')}
        >
          <CheckCircle2 className="h-4 w-4" /> Confirmar
        </Button>
        <Button 
          variant={callup.status === 'unavailable' ? 'destructive' : 'outline'} 
          className="flex-1 gap-2"
          onClick={() => onUpdate(callup.id, 'unavailable')}
        >
          <XCircle className="h-4 w-4" /> No voy
        </Button>
      </CardFooter>
    </Card>
  );
}
