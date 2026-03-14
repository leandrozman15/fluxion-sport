
"use client";

import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Calendar as CalendarIcon,
  MapPin,
  Users
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EventAttendancePage() {
  const { clubId, divisionId, teamId, eventId } = useParams() as any;
  const db = useFirestore();

  const eventRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId), [db, clubId, divisionId, teamId, eventId]);
  const { data: event, isLoading: eventLoading } = useDoc(eventRef);

  const attendanceQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "events", eventId, "attendance"), [db, clubId, divisionId, teamId, eventId]);
  const { data: attendance, isLoading: attLoading } = useCollection(attendanceQuery);

  if (eventLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const goingCount = attendance?.filter(a => a.status === 'going').length || 0;
  const notGoingCount = attendance?.filter(a => a.status === 'not_going').length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/teams/${teamId}/events`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al calendario
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{event?.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-sm"><CalendarIcon className="h-4 w-4" /> {new Date(event?.date).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> {event?.location}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="h-fit py-1 px-3 bg-green-100 text-green-700 hover:bg-green-100">
              {goingCount} Confirmados
            </Badge>
            <Badge variant="secondary" className="h-fit py-1 px-3 bg-red-100 text-red-700 hover:bg-red-100">
              {notGoingCount} Bajas
            </Badge>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Lista de Asistencia
          </CardTitle>
          <CardDescription>Seguimiento en tiempo real de quiénes han confirmado su asistencia.</CardDescription>
        </CardHeader>
        <CardContent>
          {attLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance?.map((att: any) => (
                  <TableRow key={att.id}>
                    <TableCell className="font-medium">{att.playerName}</TableCell>
                    <TableCell>
                      {att.status === 'going' ? (
                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                          <CheckCircle2 className="h-4 w-4" /> Confirmado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <XCircle className="h-4 w-4" /> No asiste
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(att.updatedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {attendance?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nadie ha confirmado asistencia todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
