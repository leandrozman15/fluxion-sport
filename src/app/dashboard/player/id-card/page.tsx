
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  QrCode, 
  Download,
  Share2,
  Trophy,
  Star,
  Building2,
  LayoutDashboard,
  Table as TableIcon,
  CreditCard,
  ShoppingBag,
  Award,
  BadgeCheck,
  ClipboardCheck,
  Calendar,
  Users
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
  const [roleInfo, setRoleInfo] = useState<{ role: string, label: string }>({ role: 'player', label: 'Jugador' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !firestore) return;
      try {
        const userEmail = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscamos en Staff (users) primero por UID o Email
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        let userData = userDoc.exists() ? userDoc.data() : null;

        if (!userData) {
          const qStaff = query(collection(firestore, "users"), where("email", "==", userEmail));
          const staffSnap = await getDocs(qStaff);
          if (!staffSnap.empty) userData = staffSnap.docs[0].data();
        }

        let foundProfile = null;
        let foundClub = null;

        if (userData) {
          foundProfile = userData;
          const role = userData.role || 'coach';
          setRoleInfo({ 
            role, 
            label: role === 'admin' || role === 'club_admin' ? 'Director Club' : 
                   role === 'coordinator' ? 'Coordinador' : 
                   role === 'coach' ? 'Entrenador Oficial' : 'Staff' 
          });
          
          if (userData.clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", userData.clubId));
            foundClub = clubDoc.exists() ? { ...clubDoc.data(), id: clubDoc.id } : null;
          }
        } else {
          // 2. Si no es staff, buscamos en el índice de jugadores
          const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", userEmail));
          const pSnap = await getDocs(qPlayer);
          if (!pSnap.empty) {
            const pData = pSnap.docs[0].data();
            foundProfile = pData;
            foundClub = { id: pData.clubId, name: pData.clubName, logoUrl: "" }; // Fallback
            
            // Intentar traer el logo real del club
            const cDoc = await getDoc(doc(firestore, "clubs", pData.clubId));
            if (cDoc.exists()) foundClub = { ...cDoc.data(), id: cDoc.id };
            
            setRoleInfo({ role: 'player', label: 'Jugador Federado' });
          }
        }

        setProfile(foundProfile);
        setClubInfo(foundClub);
      } catch (e) { 
        console.error("Error cargando carnet:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [user, firestore]);

  // Navegación dinámica basada en el rol detectado
  const isStaff = roleInfo.role === 'coach' || roleInfo.role === 'coordinator' || roleInfo.role === 'club_admin' || roleInfo.role === 'admin';

  const coachNav = [
    { title: "Gestión Técnica", href: "/dashboard/coach", icon: ClipboardCheck },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
    { title: "Búsqueda Jugadores", href: "/dashboard/player/search", icon: Users },
  ];

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Posiciones", href: "/dashboard/player/standings", icon: TableIcon },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: clubInfo ? `/dashboard/clubs/${clubInfo.id}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  const currentNav = isStaff ? coachNav : playerNav;

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  const isCoach = roleInfo.role === 'coach';
  const isAdmin = roleInfo.role === 'admin' || roleInfo.role === 'club_admin';

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={currentNav} basePath={isStaff ? "/dashboard/coach" : "/dashboard/player"} />
      
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto pb-20">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-xl">Credencial Digital</h1>
          <p className="ambient-text text-lg opacity-80">Identificación oficial para competencia y sede.</p>
        </header>

        <Card className={cn(
          "w-full text-white overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] border-none transition-all relative",
          isAdmin ? "bg-gradient-to-br from-slate-800 to-slate-950" :
          isCoach ? "bg-gradient-to-br from-blue-700 to-blue-950" :
          "bg-gradient-to-br from-primary to-primary/80"
        )}>
          <CardContent className="p-0">
            {/* Header del Carnet */}
            <div className="p-8 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-white p-1.5 rounded-2xl shadow-2xl">
                  <Avatar className="h-14 w-14 rounded-xl border-none bg-white">
                    <AvatarImage src={clubInfo?.logoUrl} className="object-contain" />
                    <AvatarFallback className="bg-slate-50 text-primary"><Building2 className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 leading-none mb-1.5">Estatus Oficial</p>
                  <p className="text-xl font-black font-headline truncate max-w-[200px] leading-none drop-shadow-sm">{clubInfo?.name || "Fluxion Sport"}</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md font-black text-xs px-4 py-1.5 rounded-full">2025</Badge>
            </div>

            {/* Cuerpo del Carnet */}
            <div className="bg-white text-slate-900 mx-5 mb-5 rounded-[2rem] p-8 flex flex-col items-center space-y-6 shadow-inner relative overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl animate-pulse" />
                <Avatar className="h-44 w-44 border-[6px] border-slate-50 shadow-2xl rounded-3xl relative z-10">
                  <AvatarImage src={profile?.photoUrl} className="object-cover" />
                  <AvatarFallback className="text-6xl font-black text-slate-200 bg-slate-50">{profile?.firstName?.[0] || profile?.name?.[0]}</AvatarFallback>
                </Avatar>
                {profile?.jerseyNumber && (
                  <div className="absolute -bottom-3 -right-3 bg-primary text-white text-xl font-black w-14 h-14 flex items-center justify-center rounded-2xl border-[5px] border-white shadow-2xl z-20">
                    #{profile.jerseyNumber}
                  </div>
                )}
                {(isCoach || isAdmin) && (
                  <div className="absolute -top-3 -left-3 bg-accent text-accent-foreground text-[10px] font-black px-3 py-1.5 rounded-lg border-2 border-white shadow-xl z-20 uppercase tracking-widest flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5" /> Oficial
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black font-headline uppercase tracking-tighter leading-none text-slate-900">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || "Usuario"}
                </h2>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-primary font-black text-xs uppercase tracking-[0.2em]">
                    {roleInfo.label}
                  </p>
                  {isCoach && profile?.specialty && (
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{profile.specialty}</p>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100" />
              
              <div className="flex flex-col items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-center w-36 h-36 border-2 border-dashed border-slate-200 group">
                  <QrCode className="h-32 w-32 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-black font-mono uppercase tracking-widest">REG: {profile?.id?.substring(0, 14) || "STAFF-ID-PENDING"}</p>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 bg-black/20 backdrop-blur-md flex justify-between items-center border-t border-white/5">
               <div className="flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-accent" />
                 <span className="text-xs font-black tracking-widest uppercase text-white">Estado: Activo</span>
               </div>
               <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">SISTEMA NACIONAL • 2025</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 w-full px-2">
          <Button variant="outline" className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest h-14 shadow-xl bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary transition-all">
            <Download className="h-4 w-4" /> Descargar PDF
          </Button>
          <Button variant="outline" className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest h-14 shadow-xl bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary transition-all">
            <Share2 className="h-4 w-4" /> Compartir
          </Button>
        </div>
      </div>
    </div>
  );
}
