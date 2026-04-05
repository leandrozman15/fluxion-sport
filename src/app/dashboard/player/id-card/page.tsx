
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ShieldCheck, 
  QrCode, 
  Download,
  Share2,
  Building2,
  ArrowLeft,
  Car
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function GenericIdCardPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
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

          // Enriquecer con datos completos del legajo (photoUrl, dni, jerseyNumber, parkingIncluded, etc.)
          if (userData?.clubId && userData?.id) {
            try {
              const fullPlayerDoc = await getDoc(doc(firestore, "clubs", userData.clubId, "players", userData.id));
              if (fullPlayerDoc.exists()) {
                userData = { ...userData, ...fullPlayerDoc.data() };
              }
            } catch (_) {}
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
            if (clubDoc.exists()) {
              setClubInfo({ ...clubDoc.data(), id: clubDoc.id });
            } else {
              // fallback: usar clubName del index si el doc del club no existe o no tiene acceso
              setClubInfo({ name: userData.clubName || "Club", logoUrl: null });
            }
          } else if (userData.clubName) {
            setClubInfo({ name: userData.clubName, logoUrl: null });
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

  const backHref =
    roleInfo.role === 'coordinator' ? '/dashboard/coordinator' :
    (roleInfo.role === 'admin' || roleInfo.role === 'club_admin') ?
      (clubInfo ? `/dashboard/clubs/${clubInfo.id}` : '/dashboard/clubs') :
    isStaff ? '/dashboard/coach' :
    '/dashboard/player';

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 md:relative md:inset-auto md:z-auto md:overflow-visible md:bg-transparent md:min-h-[100dvh] flex flex-col items-center justify-center animate-in fade-in duration-500 px-0 md:px-4 py-0 md:py-8">

      {/* X button — floating on mobile, inline above card on desktop */}
      <button
        onClick={() => router.push(backHref)}
        className="fixed md:hidden z-50 bg-black/40 backdrop-blur-md text-white rounded-full h-10 w-10 flex items-center justify-center shadow-xl border border-white/20 hover:bg-black/60 transition-colors"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))', right: '1rem' }}
        aria-label="Volver"
      >
        <span className="font-black text-lg leading-none">×</span>
      </button>

      <div className="hidden md:flex w-full max-w-md mx-auto mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push(backHref)}
          className="text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest gap-2 h-10 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Panel
        </Button>
      </div>

      <Card className={cn(
        "w-full text-white overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border-none transition-all relative",
        "md:max-w-md md:rounded-[2.5rem]",
        "rounded-none min-h-[100dvh] md:min-h-0",
        "[padding-top:max(2rem,env(safe-area-inset-top,2rem))] md:pt-0",
        "[padding-bottom:max(2rem,env(safe-area-inset-bottom,2rem))] md:pb-0",
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
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md font-black text-xs px-4 py-1.5 rounded-full">2026</Badge>
            </div>

            <div className="bg-white text-slate-900 mx-5 mb-5 rounded-[2rem] p-6 flex flex-col items-center space-y-4 shadow-inner relative overflow-hidden">
              {/* Club logo watermark */}
              {clubInfo?.logoUrl && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                  <img src={clubInfo.logoUrl} alt="" className="w-64 h-64 object-contain" />
                </div>
              )}
              <Avatar className="h-32 w-32 border-[6px] border-slate-50 shadow-2xl rounded-3xl relative z-10">
                <AvatarImage src={profile?.photoUrl} className="object-cover" />
                <AvatarFallback className="text-5xl font-black text-slate-200 bg-slate-50">{profile?.firstName?.[0] || profile?.name?.[0]}</AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black font-headline uppercase tracking-tighter leading-none text-slate-900">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || "Usuario"}
                </h2>
                <p className="text-primary font-black text-xs uppercase tracking-[0.2em]">{roleInfo.label}</p>
              </div>

              <div className="w-full h-px bg-slate-100" />

              {/* Extra info row */}
              <div className="w-full grid grid-cols-3 gap-2 text-center">
                {profile?.dni && (
                  <div className="bg-slate-50 rounded-xl py-2 px-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DNI</p>
                    <p className="text-[11px] font-black text-slate-800 mt-0.5 font-mono">{profile.dni}</p>
                  </div>
                )}
                {profile?.jerseyNumber && (
                  <div className="bg-primary/5 rounded-xl py-2 px-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Camiseta</p>
                    <p className="text-sm font-black text-primary mt-0.5">#{profile.jerseyNumber}</p>
                  </div>
                )}
                {profile?.sport && (
                  <div className="bg-slate-50 rounded-xl py-2 px-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deporte</p>
                    <p className="text-[11px] font-black text-slate-800 mt-0.5">{profile.sport === 'rugby' ? '🏉' : '🏑'} {profile.sport}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 w-full">
                <div className="bg-slate-50 p-2 rounded-2xl flex items-center justify-center w-28 h-28 border-2 border-dashed border-slate-200">
                  <QrCode className="h-24 w-24 text-slate-300" />
                </div>
                <p className="text-[9px] text-slate-400 font-black font-mono uppercase tracking-widest">REG: {profile?.id?.substring(0, 14) || "SISTEMA-OK"}</p>
              </div>

              {/* Parking status */}
              <div className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl border",
                profile?.parkingIncluded
                  ? "bg-green-50 border-green-100"
                  : "bg-red-50 border-red-100"
              )}>
                <div className="flex items-center gap-2">
                  <Car className={cn("h-4 w-4", profile?.parkingIncluded ? "text-green-600" : "text-red-400")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", profile?.parkingIncluded ? "text-green-700" : "text-red-500")}>
                    Estacionamiento
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[9px] font-black uppercase", profile?.parkingIncluded ? "text-green-600" : "text-red-400")}>
                    {profile?.parkingIncluded ? "Incluido" : "No incluido"}
                  </span>
                  <span className="relative flex h-3 w-3">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
                      profile?.parkingIncluded ? "bg-green-400" : "bg-red-400"
                    )} />
                    <span className={cn(
                      "relative inline-flex rounded-full h-3 w-3",
                      profile?.parkingIncluded ? "bg-green-500" : "bg-red-500"
                    )} />
                  </span>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 bg-primary/10 backdrop-blur-md flex justify-between items-center border-t border-white/5">
               <div className="flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-accent" />
                 <span className="text-xs font-black tracking-widest uppercase text-white">Estado: Activo</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="relative flex h-2.5 w-2.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                 </span>
                 <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">SISTEMA NACIONAL • 2026</p>
               </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
