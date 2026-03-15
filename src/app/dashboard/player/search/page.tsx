
"use client";

import { useState } from "react";
import { 
  Search, 
  Loader2, 
  UserRoundSearch, 
  ChevronRight, 
  ArrowUpRight,
  Filter,
  ShieldCheck,
  Building2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function GlobalPlayerSearch() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // En un sistema real, haríamos una consulta de colección de grupo 'players'
  // Para este MVP, buscamos en una colección plana o simulamos la búsqueda.
  // Como los jugadores están bajo clubs/id/players, necesitamos collectionGroup.
  
  // Simulación: Consultamos todos los jugadores si el usuario tiene permiso
  const playersQuery = useMemoFirebase(() => {
    return query(collection(db, "all_players_index"), limit(20)); // Colección de índice para búsqueda global
  }, [db]);

  const { data: results, isLoading } = useCollection(playersQuery);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">Base de Datos Transversal</Badge>
        </div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Registro Nacional de Jugadores</h1>
        <p className="text-muted-foreground">Historial, pases y estadísticas oficiales de todos los deportistas federados.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 text-lg" 
            placeholder="Buscar por nombre, DNI o número de carnet..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="h-12 px-8 gap-2">
          <Filter className="h-4 w-4" /> Filtros Avanzados
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : (
          results?.map((p: any) => (
            <Card key={p.id} className="group hover:border-primary transition-all overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/10">
                  <AvatarImage src={p.photoUrl} />
                  <AvatarFallback>{p.firstName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{p.firstName} {p.lastName}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-bold text-primary">
                    <Building2 className="h-3 w-3" /> {p.clubName || "Club Federado"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs py-1 border-b">
                  <span className="text-muted-foreground">Categoría</span>
                  <span className="font-bold">{p.categoryName || "Sub 15"}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b">
                  <span className="text-muted-foreground">Estado Carnet</span>
                  <Badge variant="outline" className="h-5 text-[9px] bg-green-50 text-green-700 border-green-200">ACTIVO</Badge>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 pt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="gap-2 group-hover:text-primary">
                  Ver Ficha Completa <ArrowUpRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {(!results || results.length === 0) && !isLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
            <UserRoundSearch className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No se encontraron jugadores con ese criterio de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
