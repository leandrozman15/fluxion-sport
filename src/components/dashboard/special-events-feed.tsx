
"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Megaphone, Calendar, Loader2, Play, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `Vence en ${h}h`;
  const d = Math.floor(h / 24);
  return `Vence en ${d}d`;
}

export function SpecialEventsFeed({ clubId }: { clubId?: string }) {
  const db = useFirestore();

  const eventsQuery = useMemoFirebase(() => {
    if (!db || !clubId) return null;
    return query(
      collection(db, "clubs", clubId, "special_events"),
      orderBy("createdAt", "desc"),
      limit(12) // fetch more, we'll filter expired client-side
    );
  }, [db, clubId]);

  const { data: rawEvents, isLoading } = useCollection(eventsQuery);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  if (!rawEvents || rawEvents.length === 0) return null;

  const now = Date.now();
  const events = rawEvents.filter((e: any) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);

  if (events.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <Megaphone className="h-4 w-4 text-primary" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Novedades Institucionales</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event: any) => (
          <Card key={event.id} className="border-none shadow-2xl bg-white overflow-hidden rounded-[2rem] group transition-all hover:-translate-y-1">

            {/* ── Video ── */}
            {event.mediaType === "video" && event.videoUrl && (
              <div className="aspect-video w-full overflow-hidden relative bg-black">
                <video
                  src={event.videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1">
                    <Play className="h-2.5 w-2.5" /> Video
                    {event.videoDuration > 0 && <span className="ml-1 opacity-70">· {event.videoDuration}s</span>}
                  </span>
                </div>
              </div>
            )}

            {/* ── Image ── */}
            {event.mediaType !== "video" && event.imageUrl && (
              <div className="aspect-video w-full overflow-hidden relative">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 font-black uppercase text-[8px] tracking-widest px-3">Oficial</Badge>
                </div>
              </div>
            )}

            <CardHeader className="pt-6 px-8 pb-4">
              <div className="flex justify-between items-start gap-4">
                <CardTitle className="text-xl font-black text-slate-900 leading-tight">{event.title}</CardTitle>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                  {event.expiresAt && (
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTimeLeft(event.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                {event.comment}
              </p>
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-3">
                <Avatar className="h-6 w-6 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-black">A</AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Publicado por: {event.authorName || "Administración"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
