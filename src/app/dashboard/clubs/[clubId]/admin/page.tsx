
"use client";

import { useParams } from "next/navigation";
import { 
  ShieldCheck, 
  ChevronLeft, 
  Loader2, 
  Users, 
  CreditCard, 
  Stethoscope, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Layers,
  UserRound as UserRoundIcon
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionNav } from "@/components/layout/section-nav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ClubAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRoundIcon },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Administración: {club?.name}</h1>
          <p className="text-muted-foreground">Gestión de legajos, padrón social y auditoría interna.</p>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Estado Médicos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">85%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Aptos físicos cargados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Socio Pleno</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{players?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Jugadores en el padrón</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Morosidad</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">18%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Deuda mayor a 60 días</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Auditoría de Legajos Médicos
            </CardTitle>
            <CardDescription>Control de aptitud física para la competencia oficial.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Fecha Examen</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players?.slice(0, 5).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                    <TableCell>15/03/2024</TableCell>
                    <TableCell>15/03/2025</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">AL DÍA</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!players || players.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No hay jugadores registrados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
