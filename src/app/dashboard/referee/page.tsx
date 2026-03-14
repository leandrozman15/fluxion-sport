
"use client";

import { useState, useEffect } from "react";
import { 
  Flag, 
  Loader2, 
  Calendar as CalendarIcon, 
  MapPin, 
  Trophy, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RefereeDashboard() {
  const { firestore, user } = useFirebase();
  const [assignedMatches, setAssignedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      if (!firestore || !user) return;
      try {
        // Buscamos tanto en la colección global de torneos como en los eventos de equipo
        const matchesQuery = query(
          collection(firestore, "tournament_matches"), 
          where("refereeId", "==", user.uid)
        );
        const snapshot = await getDocs(matchesQuery);
        const matches = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          type: 'tournament',
          path: doc.ref.path
        }));
        setAssignedMatches(matches);
      } catch (e) {
        console.error("Error fetching referee matches:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [firestore, user]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Panel del Árbitro</h1>
        <p className="text-muted-foreground">Mis partidos asignados para dirigir.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignedMatches.length > 0 ? (
          assignedMatches.map((match) => {
            const navUrl = `/dashboard/referee/matches/${match.id}?path=${encodeURIComponent(match.path)}`;

            return (
              <Card key={match.id} className="overflow-hidden border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant={match.status === 'played' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                      {match.status || 'scheduled'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                      <CalendarIcon className="h-3 w-3" /> {new Date(match.date).toLocaleDateString()}
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-2">{match.homeTeamName || 'Local'} vs {match.awayTeamName || 'Visita'}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-bold text-primary">
                    <Trophy className="h-4 w-4" /> Torneo Oficial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {match.location}
                  </div>
                  {match.status === 'played' && (
                    <div className="bg-muted p-2 rounded-lg text-center font-black text-2xl">
                      {match.homeScore} - {match.awayScore}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t pt-3 flex justify-end">
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link href={navUrl}>
                      Gestionar Partido <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
            <Flag className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No tienes partidos de torneo asignados actualmente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
