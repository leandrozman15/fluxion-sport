
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Target, 
  Star, 
  Clock, 
  Flag, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PlayerStatsOverview() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [statsSummary, setStatsSummary] = useState({
    matches: 0,
    goals: 0,
    assists: 0,
    minutes: 0,
    yellow: 0,
    red: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user || !firestore) return;
      try {
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        let foundPlayer = null;
        let clubId = "";

        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(
            collection(firestore, "clubs", clubDoc.id, "players"), 
            where("email", "==", user.email || "")
          ));
          if (!pSnap.empty) {
            foundPlayer = pSnap.docs[0].data();
            clubId = clubDoc.id;
            break;
          }
        }

        if (foundPlayer) {
          setPlayerInfo(foundPlayer);
          
          // Buscar en todas las subcolecciones de estadísticas
          // En un MVP, iteramos por divisiones y equipos donde el jugador esté asignado
          const divsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions"));
          let totalMatches = 0, totalGoals = 0, totalAssists = 0, totalMinutes = 0, totalYellow = 0, totalRed = 0;

          for (const divDoc of divsSnap.docs) {
            const teamsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams"));
            for (const teamDoc of teamsSnap.docs) {
              const eventsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams", teamDoc.id, "events"));
              for (const eventDoc of eventsSnap.docs) {
                const sSnap = await getDocs(query(
                  collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams", teamDoc.id, "events", eventDoc.id, "stats"),
                  where("playerId", "==", foundPlayer.id)
                ));
                sSnap.forEach(sDoc => {
                  const sData = sDoc.data();
                  totalMatches++;
                  totalGoals += (sData.goals || 0);
                  totalAssists += (sData.assists || 0);
                  totalMinutes += (sData.minutesPlayed || 0);
                  totalYellow += (sData.yellowCards || 0);
                  totalRed += (sData.redCards || 0);
                });
              }
            }
          }

          setStatsSummary({
            matches: totalMatches,
            goals: totalGoals,
            assists: totalAssists,
            minutes: totalMinutes,
            yellow: totalYellow,
            red: totalRed
          });
        }
      } catch (e) {
        console.error("Error cargando stats:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user, firestore]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="text-center py-20 px-4">
      <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2">No hemos encontrado estadísticas para tu usuario.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-6 bg-card p-6 rounded-xl border shadow-sm">
        <Avatar className="h-20 w-20 border-4 border-primary/10">
          <AvatarImage src={playerInfo.photoUrl} />
          <AvatarFallback className="text-2xl">{playerInfo.firstName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Mi Historial Deportivo</h1>
          <p className="text-muted-foreground">Desempeño acumulado en la temporada actual.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "PJ", value: statsSummary.matches, icon: Activity, color: "text-blue-500" },
          { label: "Goles", value: statsSummary.goals, icon: Target, color: "text-primary" },
          { label: "Asist", value: statsSummary.assists, icon: Star, color: "text-accent" },
          { label: "Minutos", value: statsSummary.minutes, icon: Clock, color: "text-slate-600" },
          { label: "Amarillas", value: statsSummary.yellow, icon: Flag, color: "text-yellow-500" },
          { label: "Rojas", value: statsSummary.red, icon: Flag, color: "text-red-600" }
        ].map((stat, i) => (
          <Card key={i} className="text-center hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-black">{stat.value}</div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Eficiencia
            </CardTitle>
            <CardDescription>Promedios por partido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Goles por partido</span>
              <span className="font-bold text-primary">{(statsSummary.goals / (statsSummary.matches || 1)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Minutos por gol</span>
              <span className="font-bold text-primary">{statsSummary.goals > 0 ? (statsSummary.minutes / statsSummary.goals).toFixed(0) : 0}'</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Participación en goles (G+A)</span>
              <span className="font-bold text-accent">{statsSummary.goals + statsSummary.assists}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Logros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center opacity-40">
             <Trophy className="h-16 w-16 mb-4 text-primary/30" />
             <p className="text-sm font-medium">Insignias y trofeos disponibles próximamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
