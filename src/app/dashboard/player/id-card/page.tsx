
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
        const email = user.email?.toLowerCase().trim() || "";
        let userData: any = null;

        // 1. STAFF
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
        } else {
          const staffByEmailId = await getDoc(doc(firestore, "users", email));
          if (staffByEmailId.exists()) userData = staffByEmailId.data();
        }

        // 2. JUGADOR
        if (!userData) {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = playerByUid.data();
          } else {
            const playerByEmailId = await getDoc(doc(firestore, "all_players_index", email));
            if (playerByEmailId.exists()) userData = playerByEmailId.data();
          }
        }

        if (userData) {
          setProfile(userData);
          const role = userData.role || 'player';
          setRoleInfo({ 
            role, 
            label: role === 'admin' || role === 'club_admin' ? 'Director Club' : 
                   role === 'coordinator' ? 'Coordinador' : 
                   role === 'coach' || role.includes('coach') ? 'Staff Técnico' : 'Jugador Federado' 
          });
          
          if (userData.clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", userData.clubId));
            if (clubDoc.exists()) setClubInfo({ ...clubDoc.data(), id: clubDoc.id });
          }
        }
      } catch (e) { 
        console.error("Error carnet:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [user, firestore]);

  const isStaff = ['admin', 'club_admin', 'coordinator', 'coach', 'coach_lvl1', 'coach_lvl2'].includes(roleInfo.role);

  const staffDashboardHref =
    roleInfo.role === 'coordinator' ? '/dashboard/coordinator' :
    (roleInfo.role === 'admin' || roleInfo.role === 'club_admin') ?
      (clubInfo ? `/dashboard/clubs/${clubInfo.id}` : '/dashboard/clubs') :
    '/dashboard/coach';

  const staffDashboardLabel =
    roleInfo.role === 'coordinator' ? 'Coordinación' :
    (roleInfo.role === 'admin' || roleInfo.role === 'club_admin') ? 'Panel Club' :
    'Gestión Técnica';

  const coachNav = [
    { title: staffDashboardLabel, href: staffDashboardHref, icon: ClipboardCheck },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Tienda Club", href: clubInfo ? `/dashboard/clubs/${clubInfo.id}/shop` : staffDashboardHref, icon: ShoppingBag },
    { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
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

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={currentNav} basePath={isStaff ? "/dashboard/coach" : "/dashboard/player"} />
      
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto pb-24 md:pb-20">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-xl">Credencial Digital</h1>
          <p className="ambient-text text-lg opacity-80">Identificación oficial para competencia y sede.</p>
        </header>

        <Card className={cn(
          "w-full text-white overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] border-none transition-all relative",
          roleInfo.role.includes('admin') ? "bg-gradient-to-br from-slate-700 to-slate-800" :
          isStaff ? "bg-gradient-to-br from-blue-600 to-blue-800" :
          "bg-gradient-to-br from-primary to-primary/80"
        )}>
          <CardContent className="p-0">
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

            <div className="bg-white text-slate-900 mx-5 mb-5 rounded-[2rem] p-8 flex flex-col items-center space-y-6 shadow-inner relative overflow-hidden">
              <Avatar className="h-44 w-44 border-[6px] border-slate-50 shadow-2xl rounded-3xl relative z-10">
                <AvatarImage src={profile?.photoUrl} className="object-cover" />
                <AvatarFallback className="text-6xl font-black text-slate-200 bg-slate-50">{profile?.firstName?.[0] || profile?.name?.[0]}</AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black font-headline uppercase tracking-tighter leading-none text-slate-900">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || "Usuario"}
                </h2>
                <p className="text-primary font-black text-xs uppercase tracking-[0.2em]">{roleInfo.label}</p>
              </div>

              <div className="w-full h-px bg-slate-100" />
              
              <div className="flex flex-col items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-center w-36 h-36 border-2 border-dashed border-slate-200">
                  <QrCode className="h-32 w-32 text-slate-300" />
                </div>
                <p className="text-[10px] text-slate-400 font-black font-mono uppercase tracking-widest">REG: {profile?.id?.substring(0, 14) || "SISTEMA-OK"}</p>
              </div>
            </div>
            
            <div className="px-8 py-5 bg-primary/10 backdrop-blur-md flex justify-between items-center border-t border-white/5">
               <div className="flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-accent" />
                 <span className="text-xs font-black tracking-widest uppercase text-white">Estado: Activo</span>
               </div>
               <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">SISTEMA NACIONAL • 2025</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
