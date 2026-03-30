
"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Loader2, 
  UserRoundSearch, 
  ArrowUpRight,
  Filter,
  Building2,
  ClipboardCheck,
  ShieldCheck,
  Calendar,
  Users,
  LayoutDashboard,
  Star,
  Table as TableIcon,
  CreditCard,
  ShoppingBag
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from "@/firebase";
import { collection, query, where, limit, doc, getDoc, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionNav } from "@/components/layout/section-nav";

export default function GlobalPlayerSearch() {
  const { firestore: db, user } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string>("player");
  const [clubId, setClubId] = useState<string | null>(null);
  
  useEffect(() => {
    async function checkRole() {
      if (!user || !db) return;
      const email = user.email?.toLowerCase().trim();
      const qStaff = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(qStaff);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUserRole(data.role);
        setClubId(data.clubId);
      }
    }
    checkRole();
  }, [user, db]);

  const playersQuery = useMemoFirebase(() => {
    return query(collection(db, "all_players_index"), limit(20)); 
  }, [db]);

  const { data: results, isLoading } = useCollection(playersQuery);

  const isStaff = userRole === 'coach' || userRole === 'coordinator' || userRole === 'club_admin' || userRole === 'admin';

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
    { title: "Tienda Club", href: clubId ? `/dashboard/clubs/${clubId}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={isStaff ? coachNav : playerNav} basePath={isStaff ? "/dashboard/coach" : "/dashboard/player"} />
      
      <div className="flex-1 space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white border-white/20 backdrop-blur-md">Base de Datos Transversal</Badge>
          </div>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-xl">Registro Nacional de Jugadores</h1>
          <p className="ambient-text text-lg opacity-80">Historial, pases y estadísticas oficiales de todos los deportistas federados.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              className="pl-12 h-14 text-lg font-bold border-2 focus:border-primary transition-all bg-white" 
              placeholder="Buscar por nombre, DNI o número de carnet..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="h-14 px-10 gap-3 font-black uppercase text-xs tracking-widest shadow-xl">
            <Filter className="h-5 w-5" /> Filtros Avanzados
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-white h-12 w-12" /></div>
          ) : (
            results?.map((p: any) => (
              <Card key={p.id} className="group hover:border-primary transition-all overflow-hidden border-none shadow-xl bg-white/95 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-sm rounded-xl">
                    <AvatarImage src={p.photoUrl} className="object-cover" />
                    <AvatarFallback className="font-black text-slate-300">{p.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-black text-slate-900 truncate">{p.firstName} {p.lastName}</CardTitle>
                    <CardDescription className="flex items-center gap-1 font-black text-primary text-[10px] uppercase tracking-tighter">
                      <Building2 className="h-3 w-3" /> {p.clubName || "Club Federado"}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest py-2 border-b border-slate-100">
                    <span className="text-slate-400">Disciplina</span>
                    <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">{p.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest py-2 border-b border-slate-100">
                    <span className="text-slate-400">Estado Carnet</span>
                    <Badge className="bg-green-500 text-white border-none text-[9px] px-2 h-5">ACTIVO</Badge>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 pt-4 flex justify-end border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="gap-2 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary transition-all group-hover:bg-primary/5">
                    Ver Ficha Completa <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
          {(!results || results.length === 0) && !isLoading && (
            <div className="col-span-full text-center py-32 border-2 border-dashed rounded-3xl bg-white/5 backdrop-blur-md opacity-50">
              <UserRoundSearch className="h-16 w-16 mx-auto text-white opacity-20 mb-4" />
              <p className="text-white font-black uppercase tracking-widest text-sm">No se encontraron jugadores registrados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
