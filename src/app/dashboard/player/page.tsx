
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
  Bell
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlayerDashboard() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Buscar el perfil del jugador asociado al userId
  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      
      try {
        const playersRef = collection(firestore, "clubs"); // Búsqueda profunda simplificada para MVP
        // En un caso real, buscaríamos en todos los clubes o tendríamos una colección raíz de usuarios-jugadores
        // Para este MVP, buscaremos en una colección hipotética global de mapeo o similar si existiera.
        // Como no existe, asumimos que el usuario está en el primer club que encuentre donde coincida su email/id
        
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(collection(firestore, "clubs", clubDoc.id, "players"), where("email", "==", user.email || "")));
          if (!pSnap.empty) {
            const pData = pSnap.docs[0].data();
            setPlayerInfo({ ...pData, clubId: clubDoc.id });
            
            // Buscar su equipo (primera asignación que encuentre)
            const assignSnap = await getDocs(query(collection(firestore, "clubs", clubDoc.id, "divisions", "default", "teams", "default", "assignments"), where("playerId", "==", pData.id)));
            // Esto es complejo por la estructura anidada. Para el MVP, simplificamos la búsqueda de equipo.
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

  // Query para eventos (asumimos un equipo por defecto para el demo si no se encuentra)
  // En producción, esto vendría de la asignación real del jugador
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    // Hardcoded path for demo purposes if real team path is dynamic and nested
    return collection(firestore, "clubs", playerInfo.clubId, "divisions", "div-1", "teams", "team-1", "events");
  }, [firestore, playerInfo]);

  const { data: events, isLoading: eventsLoading } = useCollection(eventsQuery);

  const handleAttendance = (eventId: string, status: 'going' | 'not_going') => {
    if (!firestore || !playerInfo) return;
    const attendanceId = `${eventId}_${playerInfo.id}`;
    // Path: /clubs/{clubId}/divisions/{divisionId}/teams/{teamId}/events/{eventId}/attendance/{attendanceId}
    const attRef = doc(firestore, "clubs", playerInfo.clubId, "divisions", "div-1", "teams", "team-1", "events", eventId, "attendance", attendanceId);
    
    setDoc(attRef, {
      id: attendanceId,
      eventId,
      playerId: playerInfo.id,
      playerName: `${playerInfo.firstName} ${playerInfo.lastName}`,
      status,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) {
    return (
      <div className="text-center py-20">
        <UserCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Perfil no vinculado</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mt-2">Pide a tu administrador que vincule tu correo {user?.email} a tu ficha de jugador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={playerInfo.photoUrl} />
            <AvatarFallback>{playerInfo.firstName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Hola, {playerInfo.firstName}</h1>
            <p className="text-muted-foreground">#{playerInfo.jerseyNumber} • {playerInfo.position}</p>
          </div>
        </div>
        <Badge variant="outline" className="h-fit py-1 px-3">
          Temporada 2024-2025
        </Badge>
      </header>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="events">Próximos Eventos</TabsTrigger>
          <TabsTrigger value="team">Mi Equipo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eventsLoading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : events?.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-10">No hay eventos programados.</p>
            ) : (
              events?.map((ev: any) => (
                <Card key={ev.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant={ev.type === 'match' ? 'default' : 'secondary'}>
                        {ev.type.toUpperCase()}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" /> {new Date(ev.date).toLocaleDateString()}
                      </div>
                    </div>
                    <CardTitle className="mt-2 text-xl">{ev.title}</CardTitle>
                    {ev.opponent && <CardDescription>vs {ev.opponent}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {ev.location}
                    </div>
                    <p className="text-xs italic">{ev.description}</p>
                  </CardContent>
                  <CardFooter className="flex gap-2 border-t pt-4">
                    <Button 
                      className="flex-1 gap-2" 
                      variant="outline"
                      onClick={() => handleAttendance(ev.id, 'going')}
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Voy
                    </Button>
                    <Button 
                      className="flex-1 gap-2" 
                      variant="outline"
                      onClick={() => handleAttendance(ev.id, 'not_going')}
                    >
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
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Plantilla del Equipo
              </CardTitle>
              <CardDescription>Tus compañeros de esta temporada.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground italic">Cargando lista de compañeros...</p>
                {/* Aquí iría la lista de compañeros (assignments) */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
