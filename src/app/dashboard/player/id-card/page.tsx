
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  QrCode, 
  Download,
  Share2,
  UserCircle
} from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function PlayerIdCardPage() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !firestore) return;
      try {
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(
            collection(firestore, "clubs", clubDoc.id, "players"), 
            where("email", "==", user.email || "")
          ));
          if (!pSnap.empty) {
            setPlayerInfo({ ...pSnap.docs[0].data(), clubId: clubDoc.id });
            setClubInfo(clubDoc.data());
            break;
          }
        }
      } catch (e) {
        console.error("Error cargando carnet:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, firestore]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="text-center py-20 px-4">
      <UserCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2">No hemos encontrado un carnet asociado a {user?.email}</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 max-w-md mx-auto">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-foreground">Mi Carnet Digital</h1>
        <p className="text-muted-foreground">Identificación oficial del club.</p>
      </header>

      <Card className="w-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden shadow-2xl rounded-2xl border-none">
        <CardContent className="p-0">
          <div className="p-6 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Socio Oficial</p>
                <p className="text-lg font-bold font-headline">{clubInfo?.name || "SportsManager"}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm">
              2024-2025
            </Badge>
          </div>

          <div className="bg-white text-foreground mx-4 mb-4 rounded-xl p-6 flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-lg">
              <AvatarImage src={playerInfo.photoUrl} />
              <AvatarFallback className="text-4xl">{playerInfo.firstName[0]}</AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold font-headline uppercase">{playerInfo.firstName} {playerInfo.lastName}</h2>
              <p className="text-primary font-bold flex items-center justify-center gap-2 mt-1">
                <Badge>#{playerInfo.jerseyNumber}</Badge>
                {playerInfo.position}
              </p>
            </div>

            <div className="w-full h-px bg-border my-2" />

            <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-center w-40 h-40 border-2 border-dashed border-muted">
              <QrCode className="h-32 w-32 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {playerInfo.id.substring(0, 12)}</p>
          </div>
          
          <div className="px-6 py-4 bg-black/10 flex justify-between items-center">
             <p className="text-xs font-medium">ESTADO: ACTIVO</p>
             <ShieldCheck className="h-5 w-5 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 w-full">
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Guardar
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" /> Compartir
        </Button>
      </div>
    </div>
  );
}
