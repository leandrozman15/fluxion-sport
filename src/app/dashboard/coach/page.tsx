
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
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { collectionGroup, query, where, getDocs, collection } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CoachDashboard() {
  const { firestore, user } = useFirebase();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyTeams() {
      if (!user || !firestore) return;
      try {
        // Buscamos todos los equipos donde el coachId coincida con el usuario actual
        // Para simplificar en el MVP, buscamos en todos los clubes
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        const myTeams: any[] = [];

        for (const clubDoc of clubsSnap.docs) {
          const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
          for (const divDoc of divsSnap.docs) {
            const subsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "subcategories"));
            for (const subDoc of subsSnap.docs) {
              const teamsSnap = await getDocs(query(
                collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "subcategories", subDoc.id, "teams"),
                where("coachName", "==", user.displayName || user.email) // En un sistema real usaríamos coachId
              ));
              teamsSnap.forEach(tDoc => {
                myTeams.push({
                  ...tDoc.data(),
                  id: tDoc.id,
                  clubId: clubDoc.id,
                  divisionId: divDoc.id,
                  subcategoryId: subDoc.id,
                  clubName: clubDoc.data().name,
                  categoryName: subDoc.data().name
                });
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
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Panel del Entrenador</h1>
        <p className="text-muted-foreground">Gestiona tus planteles, entrenamientos y asistencia.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.length > 0 ? (
          teams.map((team) => (
            <Card key={team.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="font-bold">{team.categoryName}</Badge>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">{team.clubName}</span>
                </div>
                <CardTitle className="text-2xl mt-2">{team.name}</CardTitle>
                <CardDescription>Temporada {team.season}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <Button asChild variant="secondary" size="sm" className="flex flex-col h-auto py-3 gap-1">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/subcategories/${team.subcategoryId}/teams/${team.id}`}>
                    <Users className="h-4 w-4" />
                    <span className="text-[10px]">Plantilla</span>
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm" className="flex flex-col h-auto py-3 gap-1">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/subcategories/${team.subcategoryId}/teams/${team.id}/events`}>
                    <Calendar className="h-4 w-4" />
                    <span className="text-[10px]">Agenda</span>
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm" className="flex flex-col h-auto py-3 gap-1">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/subcategories/${team.subcategoryId}/teams/${team.id}/attendance-ranking`}>
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px]">Asistencia</span>
                  </Link>
                </Button>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t pt-3 flex justify-end">
                <Button asChild size="sm" className="gap-2">
                  <Link href={`/dashboard/clubs/${team.clubId}/divisions/${team.divisionId}/subcategories/${team.subcategoryId}/teams/${team.id}/events`}>
                    Gestionar Equipo <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">No tienes equipos asignados</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">Contacta al administrador del club para que te vincule como entrenador de un equipo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
