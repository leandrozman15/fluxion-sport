
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
  ShieldCheck
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
            const assignSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
            for (const divDoc of assignSnap.docs) {
              const teamsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"));
              for (const tDoc of teamsSnap.docs) {
                const rosterSnap = await getDocs(query(
                  collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "assignments"),
                  where("playerId", "==", pData.id)
                ));
                if (!rosterSnap.empty) {
                  setTeamInfo({ 
                    ...tDoc.data(), 
                    divisionId: divDoc.id, 
                    divisionName: divDoc.data().name,
                    id: tDoc.id 
                  });
                  break;
                }
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

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo || !teamInfo) return null;
    return collection(firestore, "clubs", playerInfo.clubId, "divisions", teamInfo.divisionId, "teams", teamInfo.id, "events");
  }, [firestore, playerInfo, teamInfo]);

  const { data: events, isLoading: eventsLoading } = useCollection(eventsQuery);

  const handleAttendance = (eventId: string, status: 'going' | 'not_going') => {
    if (!firestore || !playerInfo || !teamInfo) return;
    const attendanceId = `${eventId}_${playerInfo.id}`;
    const attRef = doc(firestore, "clubs", playerInfo.clubId, "divisions", teamInfo.divisionId, "teams", teamInfo.id, "events", eventId, "attendance", attendanceId);
    
    setDoc(attRef, {
      id: attendanceId,
      eventId,
      playerId: playerInfo.id,
      playerName: `${playerInfo.firstName} ${playerInfo.lastName}`,
      status,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const handleCallupConfirm = async (eventId: string, callupId: string, status: 'confirmed' | 'declined') => {
    if (!firestore || !playerInfo || !teamInfo) return;
    const callupRef = doc(firestore, "clubs", playerInfo.clubId, "divisions", teamInfo.divisionId, "teams", teamInfo.id, "events", eventId, "callups", callupId);
    setDoc(callupRef, { status }, { merge: true });
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
              {teamInfo && <Badge className="bg-primary">{teamInfo.name} ({teamInfo.divisionName})</Badge>}
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
          <AlertTitle className="font-bold">Información del Equipo</AlertTitle>
          <AlertDescription>
            Entrenador: <span className="font-semibold">{teamInfo.coachName}</span> • División: <span className="font-semibold">{teamInfo.divisionName}</span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" /> Mis Eventos
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Mi Equipo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventsLoading ? (
              <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : !events || events.length === 0 ? (
              <Card className="col-span-full border-dashed py-20 flex flex-col items-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">No hay eventos programados.</p>
              </Card>
            ) : (
              events.map((ev: any) => (
                <Card key={ev.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                  <div className={`h-1.5 w-full ${ev.type === 'match' ? 'bg-primary' : 'bg-accent'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant={ev.type === 'match' ? 'default' : 'secondary'} className="capitalize">
                        {ev.type === 'match' ? 'Partido' : 'Entrenamiento'}
                      </Badge>
                      <div className="flex items-center text-xs font-medium text-muted-foreground bg-secondary/30 px-2 py-1 rounded">
                        <Clock className="h-3.5 w-3.5 mr-1" /> 
                        {new Date(ev.date).toLocaleDateString()} • {new Date(ev.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <CardTitle className="mt-3 text-xl font-bold">{ev.title}</CardTitle>
                    {ev.opponent && <p className="text-sm font-bold text-primary flex items-center gap-1 mt-1"><Trophy className="h-4 w-4" /> vs {ev.opponent}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{ev.location}</p>
                        {ev.address && <p className="text-xs">{ev.address}</p>}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3 border-t bg-muted/5 py-4">
                    <Button variant="outline" className="flex-1 gap-2 hover:bg-green-50" onClick={() => handleAttendance(ev.id, 'going')}>
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Confirmar
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2 hover:bg-red-50" onClick={() => handleAttendance(ev.id, 'not_going')}>
                      <XCircle className="h-4 w-4 text-destructive" /> No voy
                    </Button>
                  </CardFooter>
                </Card>
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
                <p>Lista de compañeros disponible próximamente.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
