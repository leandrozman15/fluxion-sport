
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Loader2, 
  AlertCircle,
  Table as TableIcon,
  ChevronRight,
  Shield
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PlayerStandingsView() {
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
            
            // Buscar division y equipo
            const divSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
            for (const divDoc of divSnap.docs) {
              const teamsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"));
              for (const tDoc of teamsSnap.docs) {
                const rosterSnap = await getDocs(query(
                  collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "assignments"),
                  where("playerId", "==", pData.id)
                ));
                if (!rosterSnap.empty) {
                  setTeamInfo({ ...tDoc.data(), id: tDoc.id, divisionId: divDoc.id, divisionName: divDoc.data().name });
                  break;
                }
              }
              if (teamInfo) break;
            }
            break;
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const standingsQuery = useMemoFirebase(() => {
    if (!firestore || !teamInfo) return null;
    return collection(firestore, "clubs", playerInfo.clubId, "divisions", teamInfo.divisionId, "standings");
  }, [firestore, playerInfo, teamInfo]);

  const { data: standings, isLoading: standingsLoading } = useCollection(standingsQuery);

  const sortedStandings = standings?.sort((a: any, b: any) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="text-center py-20 px-4">
      <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2">No hemos encontrado tu categoría para mostrar la tabla.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Tabla de Posiciones</h1>
        <p className="text-muted-foreground">Sigue el camino de tu equipo en el torneo.</p>
        {teamInfo && (
          <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
            Categoría: {teamInfo.divisionName}
          </Badge>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Clasificación
          </CardTitle>
          <CardDescription>Estadísticas del torneo actual.</CardDescription>
        </CardHeader>
        <CardContent>
          {standingsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Pos</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-center">PJ</TableHead>
                  <TableHead className="text-center">G</TableHead>
                  <TableHead className="text-center">E</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-right font-bold">PTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStandings?.map((s: any, i: number) => {
                  const isMyTeam = s.teamName.toLowerCase().includes(teamInfo?.name.toLowerCase() || "");
                  return (
                    <TableRow key={s.id} className={isMyTeam ? "bg-primary/5 border-l-4 border-l-primary font-bold" : ""}>
                      <TableCell className="text-center">{i + 1}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {isMyTeam && <Shield className="h-3 w-3 text-primary" />}
                        {s.teamName}
                      </TableCell>
                      <TableCell className="text-center">{s.played}</TableCell>
                      <TableCell className="text-center">{s.won}</TableCell>
                      <TableCell className="text-center">{s.drawn}</TableCell>
                      <TableCell className="text-center">{s.lost}</TableCell>
                      <TableCell className="text-right text-primary font-black">{s.points}</TableCell>
                    </TableRow>
                  );
                })}
                {(!sortedStandings || sortedStandings.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      La tabla aún no ha sido cargada por el administrador.
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
