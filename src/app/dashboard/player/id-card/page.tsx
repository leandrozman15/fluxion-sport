
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  QrCode, 
  Download,
  Share2,
  UserCircle,
  Trophy,
  Star,
  Target,
  Building2,
  Car,
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Table as TableIcon,
  CreditCard,
  ShoppingBag
} from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SectionNav } from "@/components/layout/section-nav";

export default function GenericIdCardPage() {
  const { firestore, user } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [roleInfo, setRoleInfo] = useState<{ role: string, label: string }>({ role: 'player', label: 'Jugador' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !firestore) return;
      try {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : null;
        const role = userData?.role || 'player';
        
        let foundProfile = null;
        let foundClub = null;

        if (role === 'admin' || role === 'coach' || role === 'fed_admin') {
          foundProfile = userData;
          setRoleInfo({ role, label: role === 'admin' ? 'Directivo' : role === 'coach' ? 'Entrenador' : 'Federativo' });
          if (userData?.clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", userData.clubId));
            foundClub = clubDoc.exists() ? clubDoc.data() : null;
          }
        } else {
          const clubsSnap = await getDocs(collection(firestore, "clubs"));
          for (const clubDoc of clubsSnap.docs) {
            const pSnap = await getDocs(query(collection(firestore, "clubs", clubDoc.id, "players"), where("email", "==", user.email || "")));
            if (!pSnap.empty) {
              foundProfile = pSnap.docs[0].data();
              foundClub = clubDoc.data();
              break;
            }
          }
        }
        setProfile(foundProfile);
        setClubInfo(foundClub);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [user, firestore]);

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Posiciones", href: "/dashboard/player/standings", icon: TableIcon },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: clubInfo ? `/dashboard/clubs/${clubInfo.id}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto pb-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-foreground">Carnet Institucional</h1>
          <p className="text-muted-foreground">Credencial digital oficial oficial.</p>
        </header>

        <Card className={cn(
          "w-full text-primary-foreground overflow-hidden shadow-2xl rounded-2xl border-none transition-all",
          roleInfo.role === 'admin' ? "bg-gradient-to-br from-slate-800 to-slate-900" :
          roleInfo.role === 'coach' ? "bg-gradient-to-br from-blue-700 to-blue-900" :
          "bg-gradient-to-br from-primary to-primary/80"
        )}>
          <CardContent className="p-0">
            <div className="p-6 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-lg shadow-inner">
                  <Avatar className="h-12 w-12 rounded-md border-none">
                    <AvatarImage src={clubInfo?.logoUrl} className="object-contain" />
                    <AvatarFallback className="bg-muted"><Trophy className="h-6 w-6 text-primary" /></AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">{roleInfo.label} Oficial</p>
                  <p className="text-lg font-black font-headline truncate max-w-[180px] leading-tight">{clubInfo?.name || "SportsManager"}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm font-bold">2025</Badge>
            </div>

            <div className="bg-white text-foreground mx-4 mb-4 rounded-xl p-6 flex flex-col items-center space-y-4 shadow-inner">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-muted shadow-lg">
                  <AvatarImage src={profile?.photoUrl} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold">{profile?.firstName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                {profile?.jerseyNumber && (
                  <div className="absolute -bottom-2 -right-2 bg-primary text-white text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-lg">#{profile.jerseyNumber}</div>
                )}
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold font-headline uppercase leading-tight">{profile?.firstName} {profile?.lastName}</h2>
                <p className="text-primary font-bold text-sm mt-1 uppercase tracking-wider">{profile?.position || roleInfo.label}</p>
              </div>

              {profile?.parkingActive && (
                <div className="w-full bg-green-50 border border-green-100 rounded-lg p-2 flex items-center justify-center gap-2">
                  <Car className="h-4 w-4 text-green-600" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Estacionamiento Permitido</span>
                </div>
              )}

              <div className="w-full h-px bg-border my-2" />
              <div className="bg-muted/30 p-2 rounded-lg flex items-center justify-center w-32 h-32 border-2 border-dashed border-muted/50"><QrCode className="h-28 w-28 text-muted-foreground opacity-50" /></div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {profile?.id?.substring(0, 12)}</p>
            </div>
            
            <div className="px-6 py-4 bg-black/10 flex justify-between items-center">
               <p className="text-xs font-black tracking-widest flex items-center gap-2 uppercase"><ShieldCheck className="h-4 w-4 text-white" /> Estado: Activo</p>
               <p className="text-[10px] font-bold opacity-50">SISTEMA NACIONAL</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 w-full px-4">
          <Button variant="outline" className="flex items-center gap-2 font-bold h-12 shadow-sm"><Download className="h-4 w-4" /> Bajar PDF</Button>
          <Button variant="outline" className="flex items-center gap-2 font-bold h-12 shadow-sm"><Share2 className="h-4 w-4" /> Compartir</Button>
        </div>
      </div>
    </div>
  );
}
