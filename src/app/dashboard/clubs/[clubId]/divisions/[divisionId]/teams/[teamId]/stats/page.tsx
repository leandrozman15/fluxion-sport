"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Trophy, 
  Loader2, 
  ChevronLeft, 
  Star,
  Zap,
  Medal,
  Award
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeamStatsPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAllStats() {
      if (!db) return;
      try {
        // En una app real usaríamos una cloud function para agregar esto, 
        // pero para el MVP buscamos todas las subcolecciones 'stats' bajo el equipo.
        // Como Firestore no soporta collectionGroup con filtros de path exactos sin índices pesados,
        // vamos a buscar todos los eventos del equipo primero.
        
        const eventsSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"));
        const playerStatsMap: Record<string, any> = {};

        for (const eventDoc of eventsSnap.docs) {
          const statsSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventDoc.id, "stats"));
          statsSnap.forEach(doc => {
            const data = doc.data();
            if (!playerStatsMap[data.playerId]) {
              playerStatsMap[data.playerId] = {
                playerId: data.playerId,
                playerName: data.playerName,
                goals: 0,
                assists: 0,
                matches: 0
              };
            }
            playerStatsMap[data.playerId].goals += data.goals;
            playerStatsMap[data.playerId].assists += data.assists;
            playerStatsMap[data.playerId].matches += 1;
          });
        }

        const sortedRank = Object.values(playerStatsMap).sort((a: any, b: any) => b.goals - a.goals || b.assists - a.assists);
        setRankings(sortedRank);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAllStats();
  }, [db, clubId, divisionId, teamId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al equipo
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Ranking de Goleadores</h1>
          <p className="text-muted-foreground">Estadísticas acumuladas de la temporada.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rankings.slice(0, 3).map((player, index) => (
          <Card key={player.playerId} className={index === 0 ? "border-primary bg-primary/5 shadow-lg" : ""}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2">
                {index === 0 && <Trophy className="h-10 w-10 text-yellow-500 mx-auto" />}
                {index === 1 && <Medal className="h-10 w-10 text-slate-400 mx-auto" />}
                {index === 2 && <Award className="h-10 w-10 text-amber-600 mx-auto" />}
              </div>
              <CardTitle className="text-xl">{player.playerName}</CardTitle>
              <CardDescription>Puesto #{index + 1}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-black text-primary">{player.goals}</div>
              <p className="text-xs uppercase font-bold text-muted-foreground">Goles Marcados</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Tabla General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-center">PJ</TableHead>
                <TableHead className="text-center">Asist</TableHead>
                <TableHead className="text-right">Goles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((p, i) => (
                <TableRow key={p.playerId}>
                  <TableCell className="font-bold">#{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.playerName}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.matches}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.assists}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-primary text-lg px-3 py-1">{p.goals}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rankings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                    Aún no hay goles registrados en los partidos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
