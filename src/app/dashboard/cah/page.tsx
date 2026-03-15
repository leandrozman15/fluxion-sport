
"use client";

import { 
  Database, 
  Settings2, 
  ShieldAlert, 
  Users, 
  Globe, 
  Trophy,
  Activity,
  FileText,
  Lock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CahControlPanel() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary text-primary">Nivel Nacional</Badge>
          </div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Control Central: CAH</h1>
          <p className="text-muted-foreground">Administración global del sistema y reglamentación nacional.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" /> Configuración Global
          </Button>
          <Button className="gap-2">
            <Lock className="h-4 w-4" /> Auditoría Sistema
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Temporada Activa</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">2025</div>
            <p className="text-[10px] text-muted-foreground mt-1">Cierre: 15 Dic 2025</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Federaciones</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">24</div>
            <p className="text-[10px] text-muted-foreground mt-1">Todas las regiones activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Transferencias</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">142</div>
            <p className="text-[10px] text-muted-foreground mt-1">Pendientes de validación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Estado Servidores</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-lg font-bold">100% Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Salud del Ecosistema
            </CardTitle>
            <CardDescription>Monitoreo de actividad a nivel nacional.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-xl m-6">
            <p className="text-muted-foreground text-sm italic">Módulo de métricas en tiempo real disponible con más datos.</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-500" /> Acciones de Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-3 h-12">
                <FileText className="h-4 w-4" /> Reglamentos PDF
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12">
                <Users className="h-4 w-4" /> Base de Árbitros Nacionales
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12">
                <Globe className="h-4 w-4" /> Mapa de Infraestructura
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12">
                <Trophy className="h-4 w-4" /> Torneos Nacionales (CAH)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
