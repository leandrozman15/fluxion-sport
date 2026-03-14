
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Activity, 
  Loader2, 
  ChevronLeft, 
  CheckCircle2,
  Trophy,
  Users,
  Award
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function AttendanceRankingPage() {
  const { clubId, divisionId, teamId } = useParams() as any;
  const db = useFirestore();
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    async function calculateAttendance() {
      if (!db) return;
      try {
        const eventsSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"));
        const trainings = eventsSnap.docs.filter(doc => doc.data().type === 'training');
        const totalTrainings = trainings.length;
        
        const playerAttendanceMap: Record<string, any> = {};

        for (const trainDoc of trainings) {
          const attSnap = await getDocs(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", trainDoc.id, "attendance"));
          attSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'going') {
              if (!playerAttendanceMap[data.playerId]) {
                playerAttendanceMap[data.playerId] = {
                  playerId: data.playerId,
                  playerName: data.playerName,
                  attendedCount: 0
                };
              }
              playerAttendanceMap[data.playerId].attendedCount += 1;
            }
          });
        }

        const sortedRanking = Object.values(playerAttendanceMap).map((p: any) => ({
          ...p,
          percentage: totalTrainings > 0 ? Math.round((p.attendedCount / totalTrainings) * 100) : 0
        })).sort((a, b) => b.percentage - a.percentage);

        setRanking(sortedRanking);
      } catch (e) {
        console.error("Error calculando asistencia:", e);
      } finally {
        setLoading(false);
      }
    }
    calculateAttendance();
  }, [db, clubId, divisionId, teamId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al equipo
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Compromiso del Plantel</h1>
          <p className="text-muted-foreground">Ranking de asistencia a entrenamientos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ranking.slice(0, 3).map((player, index) => (
          <Card key={player.playerId} className={index === 0 ? "border-primary bg-primary/5" : ""}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2">
                {index === 0 && <Award className="h-10 w-10 text-yellow-500 mx-auto" />}
                {index === 1 && <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto" />}
                {index === 2 && <Activity className="h-10 w-10 text-amber-600 mx-auto" />}
              </div>
              <CardTitle>{player.playerName}</CardTitle>
              <CardDescription>Puesto #{index + 1}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-black text-primary">{player.percentage}%</div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Asistencia</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Tabla de Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Entrenamientos</TableHead>
                <TableHead className="w-[300px]">Porcentaje</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((p) => (
                <TableRow key={p.playerId}>
                  <TableCell className="font-medium">{p.playerName}</TableCell>
                  <TableCell>{p.attendedCount} sesiones</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={p.percentage} className="h-2" />
                      <span className="text-xs font-bold w-8">{p.percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.percentage > 80 ? "default" : p.percentage > 50 ? "secondary" : "outline"}>
                      {p.percentage > 80 ? "Ejemplar" : p.percentage > 50 ? "Regular" : "A mejorar"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No hay datos de asistencia registrados para entrenamientos.
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
