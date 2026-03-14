
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Trophy, 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { doc, collection, setDoc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function PublicPlayerRegistration() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    birthDate: "", 
    phone: "", 
    email: "", 
    photoUrl: "",
    position: "",
    jerseyNumber: 1
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) return;

    setLoading(true);
    try {
      const playerId = doc(collection(db, "clubs", clubId, "players")).id;
      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      
      await setDoc(playerDoc, {
        ...form,
        id: playerId,
        clubId,
        status: "pending_approval",
        createdAt: new Date().toISOString()
      });

      setSubmitted(true);
      toast({
        title: "¡Inscripción Enviada!",
        description: "Tu solicitud ha sido registrada correctamente.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar tu inscripción.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="bg-green-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡Registro Completado!</CardTitle>
            <CardDescription>
              Gracias por inscribirte en <strong>{club?.name}</strong>. El club revisará tu ficha y se pondrá en contacto contigo pronto.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" variant="outline" onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <Avatar className="h-20 w-20 mx-auto border shadow-sm">
            <AvatarImage src={club?.logoUrl} />
            <AvatarFallback><Trophy /></AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold font-headline">Inscripción: {club?.name}</h1>
          <p className="text-muted-foreground">Completa tus datos para formar parte de nuestras categorías formativas.</p>
        </header>

        <Card className="shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> Ficha del Deportista
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Ej. Mateo" />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Ej. González" />
                </div>
                <div className="space-y-2">
                  <Label>Email de contacto</Label>
                  <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="mateo@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+34..." />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Nacimiento</Label>
                  <Input required type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Posición Preferida</Label>
                  <Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="Ej. Portero, Delantero..." />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>URL de Foto (Opcional)</Label>
                <Input value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})} placeholder="https://..." />
                <p className="text-[10px] text-muted-foreground italic">Puedes subir tu foto a un servicio externo y pegar el enlace aquí.</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                Enviar Inscripción
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <ShieldCheck className="h-4 w-4" /> Tus datos están protegidos por la política de {club?.name}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
