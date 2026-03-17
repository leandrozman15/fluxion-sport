
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Loader2, 
  ChevronRight, 
  Trophy,
  Calendar,
  Activity,
  ClipboardCheck,
  UserCircle,
  Star,
  TrendingUp,
  History
} from "lucide-react";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CoachDashboard() {
  const { firestore, user } = useFirebase();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyTeams() {
      if (!user || !firestore) return;
      try {
        // En un sistema real, buscaríamos por coachId. 
        // Para el MVP, buscamos en la estructura simplificada: clubs -> divisions -> teams
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        const myTeams: any[] = [];

        for (const clubDoc of clubsSnap.docs) {
          const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
          for (const divDoc of divsSnap.docs) {
            // Buscamos equipos donde el coachName coincida con el usuario actual
            const teamsSnap = await getDocs(query(
              collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"),
              where("coachName", "==", user.displayName || user.email)
            ));

            for (const tDoc of teamsSnap.docs) {
              const teamData = tDoc.data();
              
              // 1. Obtener tamaño de plantilla (Roster)
              const rosterSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "assignments"));
              
              // 2. Obtener últimos resultados
              const matchesSnap = await getDocs(query(
                collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "events"),
                where("type", "==", "match"),
                where("status", "==", "played"),
                limit(3)
              ));
              
              const results = matchesSnap.docs.map(d => d.data());

              myTeams.push({
                ...teamData,
                id: tDoc.id,
                clubId: clubDoc.id,
                divisionId: divDoc.id,
                clubName: clubDoc.data().name,
                divisionName: divDoc.data().name,
                rosterSize: rosterSnap.size,
                recentResults: results
              });
            }
          }
        }
        setTeams(myTeams);
      } catch (e) {
        console.error("Error al buscar equipos del coach:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchMyTeams();
  }, [user, firestore]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Panel del Entrenador</h1>
          <p className="text-muted-foreground">Gestión estratégica de planteles y seguimiento de resultados.</p>
        </div>
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-lg border shadow-sm">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Profesor</p>
            <p className="text-sm font-bold">{user?.displayName || user?.email}</p>
          </div>
          <UserCircle className="h-8 w-8 text-primary" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {teams.length > 0 ? (
          teams.map((team) => (
            <Card key={team.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all group flex flex-col">
              <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-white/20 text-white border-none hover:bg-white/30">
                      {team.divisionName}
                    </Badge>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {team.clubName}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black font-headline tracking-tight">{team.name}</h3>
                  <p className="text-primary-foreground/80 font-medium mt-1">Temporada {team.season}</p>
                </div>
                <Trophy className="absolute right-[-20px] bottom-[-20px] h-40 w-40 opacity-10 rotate-12" />
              </div>

              <CardContent className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 p-3 rounded-xl text-center border">
                    <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-black">{team.rosterSize}</div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Plantilla</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl text-center border">
                    <Activity className="h-4 w-4 mx-auto mb-1 text-accent" />
                    <div className="text-xl font-black">85%</div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Asistencia</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl text-center border">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <div className="text-xl font-black">#3</div>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Posición</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="h-3 w-3" /> Últimos Resultados
                  </h4>
                  <div className="space-y-2">
                    {team.recentResults?.map((res: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border-l-4 border-l-primary">
                        <span className="text-xs font-bold truncate max-w-[120px]">{res.opponent}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-black px-2 py-0.5 rounded",
                            res.homeScore > res.awayScore ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          )}>
                            {res.homeScore} - {res.awayScore}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!team.recentResults || team.recentResults.length === 0) && (
                      <p className="text-xs text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-lg">
                        Sin partidos jugados todavía.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 p-4 border-t grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="w-full font-bold h-11 border-2">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}`}>
                    <Users className="h-4 w-4 mr-2" /> Plantilla
                  </Link>
                </Button>
                <Button asChild className="w-full font-bold h-11 shadow-lg shadow-primary/20">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/events`}>
                    <ChevronRight className="h-4 w-4 mr-2" /> Gestionar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-2xl bg-muted/10">
            <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xl font-bold">No tienes equipos vinculados</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              Solicita al administrador del club que te asigne como entrenador en la sección de <strong>Staff Técnico</strong> para poder gestionar tus categorías.
            </p>
            <Button variant="outline" className="mt-6 font-bold" asChild>
              <Link href="/dashboard/clubs">Ir a Instituciones</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
