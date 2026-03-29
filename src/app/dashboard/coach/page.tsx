
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
  History,
  LayoutGrid,
  PlayCircle,
  Settings2
} from "lucide-react";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
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
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        const myTeams: any[] = [];

        for (const clubDoc of clubsSnap.docs) {
          const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
          for (const divDoc of divsSnap.docs) {
            const teamsSnap = await getDocs(query(
              collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"),
              where("coachName", "==", user.displayName || user.email)
            ));

            for (const tDoc of teamsSnap.docs) {
              const teamData = tDoc.data();
              const rosterSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", tDoc.id, "assignments"));
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-headline text-foreground tracking-tight">Centro de Alto Rendimiento</h1>
          <p className="text-muted-foreground text-lg">Bienvenido, Prof. {user?.displayName || user?.email}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-primary leading-none mb-1">Estado de Licencia</p>
            <p className="text-xs font-bold">Validado por CAH/Federación</p>
          </div>
          <div className="bg-primary/10 p-2 rounded-xl">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {teams.length > 0 ? (
          teams.map((team) => (
            <Card key={team.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all group flex flex-col bg-card">
              <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <Badge className="bg-primary text-white border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                      {team.divisionName}
                    </Badge>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                      <Trophy className="h-3 w-3" /> {team.clubName}
                    </span>
                  </div>
                  <h3 className="text-4xl font-black font-headline tracking-tighter leading-none">{team.name}</h3>
                  <p className="text-white/60 font-bold mt-2 uppercase text-xs tracking-wider">Temporada Oficial {team.season}</p>
                </div>
                <Users className="absolute right-[-20px] bottom-[-20px] h-48 w-48 opacity-5 -rotate-12" />
              </div>

              <CardContent className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 p-4 rounded-2xl text-center border border-transparent hover:border-primary/20 transition-colors">
                    <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-black">{team.rosterSize}</div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Plantilla</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl text-center border border-transparent hover:border-accent/20 transition-colors">
                    <Activity className="h-5 w-5 mx-auto mb-2 text-accent" />
                    <div className="text-2xl font-black">85%</div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Asistencia</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl text-center border border-transparent hover:border-green-200 transition-colors">
                    <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-black">#3</div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Posición</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <LayoutGrid className="h-3 w-3 text-primary" /> Gestión Estratégica
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Plantilla", icon: Users, href: `/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}`, color: "hover:bg-blue-50" },
                      { label: "Calendario", icon: Calendar, href: `/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/events`, color: "hover:bg-purple-50" },
                      { label: "Asistencia", icon: Activity, href: `/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/attendance-ranking`, color: "hover:bg-green-50" },
                      { label: "Goleadores", icon: Star, href: `/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/stats`, color: "hover:bg-yellow-50" },
                    ].map((item, i) => (
                      <Button key={i} variant="outline" asChild className={cn("justify-start gap-3 h-12 font-bold transition-all border-muted/50", item.color)}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-muted">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <History className="h-3 w-3" /> Últimos Encuentros
                  </h4>
                  <div className="space-y-2">
                    {team.recentResults?.map((res: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-transparent hover:border-muted-foreground/10 transition-colors">
                        <span className="text-xs font-bold truncate max-w-[150px]">{res.opponent}</span>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs font-black px-2 py-1 rounded-lg tabular-nums shadow-sm",
                            res.homeScore > res.awayScore ? "bg-green-500 text-white" : "bg-white text-muted-foreground"
                          )}>
                            {res.homeScore} - {res.awayScore}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                        </div>
                      </div>
                    ))}
                    {(!team.recentResults || team.recentResults.length === 0) && (
                      <div className="text-center py-6 border-2 border-dashed rounded-2xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Sin partidos registrados</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 p-6 border-t flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="flex-1 font-black gap-2 bg-foreground hover:bg-primary transition-all shadow-lg hover:shadow-primary/20 h-14 uppercase tracking-tight">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}/match-live`}>
                    <PlayCircle className="h-5 w-5" /> Iniciar Modo Live
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="font-black gap-2 border-2 h-14 uppercase tracking-tight">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/teams/${team.id}`}>
                    <Settings2 className="h-5 w-5" /> Pizarra Táctica
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[3rem] bg-muted/10">
            <div className="bg-background p-8 rounded-full shadow-inner mb-6">
              <ClipboardCheck className="h-16 w-16 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">No tienes equipos vinculados</h3>
            <p className="text-muted-foreground max-w-sm text-center mt-3 font-medium">
              Solicita al administrador del club que asigne tu correo oficial como <strong>Coach</strong> en la sección de Staff Técnico.
            </p>
            <Button variant="default" className="mt-8 font-black px-10 h-12 uppercase tracking-tighter" asChild>
              <Link href="/dashboard/clubs">Explorar Instituciones</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
