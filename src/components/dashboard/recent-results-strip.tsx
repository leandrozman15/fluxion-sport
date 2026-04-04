"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, doc, getDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RecentResultsStripProps {
  clubId: string;
  divisionId?: string;
  teamId?: string;
  clubLogo?: string;
  teamName?: string;
}

export function RecentResultsStrip({ clubId, divisionId, teamId, clubLogo, teamName }: RecentResultsStripProps) {
  const { firestore } = useFirebase();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      if (!firestore || !clubId) return;
      try {
        const allResults: any[] = [];

        if (divisionId && teamId) {
          // Fetch for a specific team
          const eventsSnap = await getDocs(query(
            collection(firestore, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events"),
            where("type", "==", "match"),
            where("status", "==", "played")
          ));
          eventsSnap.forEach(d => allResults.push({ ...d.data(), id: d.id }));
        } else {
          // Fetch across all divisions/teams in the club
          const divsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions"));
          for (const divDoc of divsSnap.docs) {
            const teamsSnap = await getDocs(collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams"));
            for (const tDoc of teamsSnap.docs) {
              const eventsSnap = await getDocs(query(
                collection(firestore, "clubs", clubId, "divisions", divDoc.id, "teams", tDoc.id, "events"),
                where("type", "==", "match"),
                where("status", "==", "played")
              ));
              eventsSnap.forEach(d => allResults.push({
                ...d.data(),
                id: d.id,
                _teamName: tDoc.data().name,
                _divName: divDoc.data().name
              }));
            }
          }
        }

        allResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setResults(allResults.slice(0, 8));
      } catch (e) {
        console.error("Error fetching recent results:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [firestore, clubId, divisionId, teamId]);

  if (loading) return null;
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Últimos Resultados</h2>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {results.map((r) => {
            const isWin = r.homeScore > r.awayScore;
            const isDraw = r.homeScore === r.awayScore;
            const isLoss = r.homeScore < r.awayScore;
            
            return (
              <div
                key={r.id}
                className={cn(
                  "flex-shrink-0 bg-white rounded-2xl shadow-lg p-3 flex flex-col items-center gap-2 min-w-[120px] border-t-4 transition-all hover:scale-105",
                  isWin && "border-t-green-500",
                  isDraw && "border-t-yellow-500",
                  isLoss && "border-t-red-500"
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 border border-slate-100">
                    <AvatarImage src={clubLogo} className="object-contain p-0.5" />
                    <AvatarFallback className="text-[8px] font-black bg-slate-50 text-slate-400">L</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl">
                    <span className="text-lg font-black text-slate-900 tabular-nums leading-none">{r.homeScore}</span>
                    <span className="text-[8px] font-black text-slate-300">-</span>
                    <span className="text-lg font-black text-slate-900 tabular-nums leading-none">{r.awayScore}</span>
                  </div>
                  <Avatar className="h-7 w-7 border border-slate-100">
                    <AvatarImage src={r.opponentLogo} className="object-contain p-0.5" />
                    <AvatarFallback className="text-[8px] font-black bg-slate-50 text-slate-400">V</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider truncate max-w-[110px]">
                  vs {r.opponent}
                </span>
                <Badge
                  className={cn(
                    "text-[7px] font-black uppercase tracking-widest px-2 h-4 border-none",
                    isWin && "bg-green-100 text-green-700",
                    isDraw && "bg-yellow-100 text-yellow-700",
                    isLoss && "bg-red-100 text-red-700"
                  )}
                >
                  {isWin ? "Victoria" : isDraw ? "Empate" : "Derrota"}
                </Badge>
                {r._divName && (
                  <span className="text-[7px] font-bold text-slate-400 truncate max-w-[100px]">{r._divName}</span>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
