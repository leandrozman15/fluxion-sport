
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Building2, 
  Save, 
  ImagePlus, 
  Trash2, 
  MapPin, 
  Phone, 
  Globe,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function ClubSettingsPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading } = useDoc(clubRef);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    logoUrl: ""
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (club) {
      setForm({
        name: club.name || "",
        address: club.address || "",
        phone: club.phone || "",
        logoUrl: club.logoUrl || ""
      });
    }
  }, [club]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      updateDocumentNonBlocking(clubRef, form);
      toast({
        title: "Cambios guardados",
        description: "La información del club se ha actualizado correctamente.",
      });
      setTimeout(() => router.push(`/dashboard/clubs/${clubId}`), 500);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al panel
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline">Identidad Institucional</h1>
          <p className="text-muted-foreground">Gestiona la información pública y visual de tu club.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Logo Oficial</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative group">
              <Avatar className="h-40 w-40 border-4 border-muted shadow-xl">
                <AvatarImage src={form.logoUrl} className="object-cover" />
                <AvatarFallback className="bg-muted">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ImagePlus className="h-8 w-8 text-white" />
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />

            <div className="text-center space-y-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <UploadCloud className="h-4 w-4" /> Subir Imagen
              </Button>
              <p className="text-[10px] text-muted-foreground px-4 italic">
                Formatos recomendados: PNG o JPG. Tamaño ideal: 512x512px.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Datos Generales
            </CardTitle>
            <CardDescription>Esta información aparecerá en los carnets de las jugadoras y planillas oficiales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName" className="font-bold">Nombre de la Institución</Label>
              <Input 
                id="clubName"
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="Ej. Club Atlético Vicentinos"
                className="h-12 text-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clubAddress" className="flex items-center gap-2 font-bold">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Dirección de la Sede
                </Label>
                <Input 
                  id="clubAddress"
                  value={form.address} 
                  onChange={e => setForm({...form, address: e.target.value})} 
                  placeholder="Calle y Número, Ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clubPhone" className="flex items-center gap-2 font-bold">
                  <Phone className="h-4 w-4 text-muted-foreground" /> Teléfono de Contacto
                </Label>
                <Input 
                  id="clubPhone"
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})} 
                  placeholder="+54 11..."
                />
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="bg-muted/30 p-4 rounded-xl flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Visibilidad en el Ecosistema</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Al actualizar estos datos, la Federación y la CAH verán tu información actualizada en el Padrón Nacional de Instituciones.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-muted/10 p-6 border-t">
            <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="h-11 px-8 font-bold gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
