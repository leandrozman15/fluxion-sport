"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Trophy, 
  Timer, 
  ChevronRight, 
  Circle,
  Loader2,
  Building2
} from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function LiveMatchesCard({ clubId }: { clubId?: string }) {
  const { firestore } = useFirebase();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    // Buscamos partidos con status 'live'
    // Si hay clubId filtramos por club, si no (SuperAdmin) mostramos todos
    let q = query(collection(firestore, "live_matches_index"), where("status", "==", "live"));
    
    if (clubId) {
      q = query(collection(firestore, "live_matches_index"), where("status", "==", "live"), where("clubId", "==", clubId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const matches = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setLiveMatches(matches);
      setLoading(false);
    }, (err) => {
      console.error("Error en LiveMatchesCard:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, clubId]);

  if (loading) return null;
  if (liveMatches.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 px-1">
        <Circle className="h-2 w-2 fill-red-500 animate-pulse text-red-500" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Partidos en Vivo</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {liveMatches.map((match) => (
          <Card key={match.id} className="border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-0">
              <div className="bg-red-500 p-1.5 flex justify-center items-center gap-2">
                <span className="text-[9px] font-black text-white tracking-widest uppercase flex items-center gap-1.5">
                  <Activity className="h-3 w-3 animate-bounce" /> {match.sport?.toUpperCase() || 'COMPETENCIA'} • VIVO
                </span>
              </div>
              
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-2 flex-1 text-center">
                    <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm">
                      <AvatarImage src={match.clubLogo} className="object-contain p-1" />
                      <AvatarFallback className="bg-slate-50 text-slate-300 font-black">L</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-black text-slate-900 truncate max-w-[80px] uppercase leading-tight">{match.teamName}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border-2 border-slate-100 shadow-inner">
                      <span className="text-3xl font-black text-slate-900 tabular-nums">{match.homeScore}</span>
                      <span className="text-xs font-black opacity-20 text-slate-400">-</span>
                      <span className="text-3xl font-black text-slate-900 tabular-nums">{match.awayScore}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase tracking-tighter">
                      <Timer className="h-3 w-3" /> {match.timeDisplay || '00:00'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1 text-center">
                    <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm">
                      <AvatarImage src={match.opponentLogo} className="object-contain p-1" />
                      <AvatarFallback className="bg-slate-50 text-slate-300 font-black">V</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-black text-slate-900 truncate max-w-[80px] uppercase leading-tight">{match.opponentName}</span>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full h-10 border-slate-100 hover:bg-slate-50 text-slate-600 font-black uppercase text-[9px] tracking-widest gap-2 rounded-xl">
                  <Link href={`/dashboard/clubs/${match.clubId}/divisions/${match.divisionId}/teams/${match.teamId}/match-live`}>
                    Seguir Incidencias <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
