
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  QrCode, 
  Download,
  Share2,
  UserCircle,
  Trophy,
  Star,
  Target
} from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function PlayerIdCardPage() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [stats, setStats] = useState({ goals: 0, assists: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !firestore) return;
      try {
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        let foundPlayer = null;
        let foundClub = null;
        let foundTeam = null;

        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(
            collection(firestore, "clubs", clubDoc.id, "players"), 
            where("email", "==", user.email || "")
          ));
          
          if (!pSnap.empty) {
            const pData = pSnap.docs[0].data();
            foundPlayer = { ...pData, clubId: clubDoc.id };
            foundClub = clubDoc.data();

            // Buscar equipo
            const divSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
            for (const divDoc of divSnap.docs) {
              const teamsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"));
              for (const tDoc of teamsSnap.docs) {
                const rosterSnap = await getDocs(query(
                  collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "assignments"),
                  where("playerId", "==", pData.id)
                ));
                if (!rosterSnap.empty) {
                  foundTeam = { 
                    ...tDoc.data(), 
                    id: tDoc.id,
                    divisionId: divDoc.id,
                    divName: divDoc.data().name 
                  };
                  break;
                }
              }
              if (foundTeam) break;
            }
            break;
          }
        }

        if (foundPlayer && foundTeam) {
          setPlayerInfo(foundPlayer);
          setClubInfo(foundClub);
          setTeamInfo(foundTeam);

          // Calcular estadísticas
          const eventsSnap = await getDocs(collection(firestore, "clubs", foundPlayer.clubId, "divisions", foundTeam.divisionId, "teams", foundTeam.id, "events"));
          let totalGoals = 0;
          let totalAssists = 0;

          for (const eventDoc of eventsSnap.docs) {
            const statsSnap = await getDocs(query(
              collection(firestore, "clubs", foundPlayer.clubId, "divisions", foundTeam.divisionId, "teams", foundTeam.id, "events", eventDoc.id, "stats"),
              where("playerId", "==", foundPlayer.id)
            ));
            statsSnap.forEach(sDoc => {
              const sData = sDoc.data();
              totalGoals += (sData.goals || 0);
              totalAssists += (sData.assists || 0);
            });
          }
          setStats({ goals: totalGoals, assists: totalAssists });
        }
      } catch (e) {
        console.error("Error cargando carnet:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, firestore]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <UserCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2 max-w-xs">No hemos encontrado un carnet asociado a {user?.email}. Contacta con tu club.</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 max-w-md mx-auto">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-foreground">Mi Carnet Digital</h1>
        <p className="text-muted-foreground">Identificación oficial y estadísticas.</p>
      </header>

      <Card className="w-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden shadow-2xl rounded-2xl border-none">
        <CardContent className="p-0">
          <div className="p-6 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Socio Oficial</p>
                <p className="text-lg font-bold font-headline truncate max-w-[180px]">{clubInfo?.name || "SportsManager"}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm">
              {teamInfo?.season || "2024-2025"}
            </Badge>
          </div>

          <div className="bg-white text-foreground mx-4 mb-4 rounded-xl p-6 flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-lg">
                <AvatarImage src={playerInfo.photoUrl} />
                <AvatarFallback className="text-4xl font-bold">{playerInfo.firstName[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary text-white text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full border-4 border-white">
                #{playerInfo.jerseyNumber}
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold font-headline uppercase leading-tight">{playerInfo.firstName} {playerInfo.lastName}</h2>
              <p className="text-primary font-bold text-sm mt-1 uppercase tracking-wider">{playerInfo.position}</p>
              {teamInfo && (
                <p className="text-[10px] text-muted-foreground mt-2 font-medium bg-muted/50 px-3 py-1 rounded-full">
                  {teamInfo.name} • {teamInfo.divName}
                </p>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-2">
              <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xl font-black">{stats.goals}</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Goles</p>
              </div>
              <div className="bg-accent/5 rounded-lg p-3 text-center border border-accent/10">
                <div className="flex items-center justify-center gap-1 text-accent mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-xl font-black">{stats.assists}</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Asistencias</p>
              </div>
            </div>

            <div className="w-full h-px bg-border my-2" />

            <div className="bg-muted/30 p-2 rounded-lg flex items-center justify-center w-32 h-32 border-2 border-dashed border-muted/50">
              <QrCode className="h-28 w-28 text-muted-foreground opacity-50" />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {playerInfo.id.substring(0, 12)}</p>
          </div>
          
          <div className="px-6 py-4 bg-black/10 flex justify-between items-center">
             <p className="text-xs font-bold tracking-widest">ESTADO: ACTIVO</p>
             <ShieldCheck className="h-5 w-5 text-white/50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 w-full pb-10">
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Descargar
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" /> Compartir
        </Button>
      </div>
    </div>
  );
}
