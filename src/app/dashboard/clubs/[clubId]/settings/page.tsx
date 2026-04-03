
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Building2, 
  Save, 
  ImagePlus, 
  MapPin, 
  Phone, 
  Globe,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { doc } from "firebase/firestore";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { uploadFileAndGetUrl } from "@/lib/storage-utils";

export default function ClubSettingsPage() {
  const { clubId } = useParams() as { clubId: string };
  const { firestore, storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const clubRef = useMemoFirebase(() => doc(firestore, "clubs", clubId), [firestore, clubId]);
  const { data: club, isLoading } = useDoc(clubRef);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    logoUrl: ""
  });

  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (club) {
      setForm({
        name: club.name || "",
        address: club.address || "",
        phone: club.phone || "",
        logoUrl: club.logoUrl || ""
      });
      setImagePreview(club.logoUrl || "");
    }
  }, [club]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalLogoUrl = form.logoUrl;

      if (imageFile) {
        // Subir a Storage en lugar de guardar Base64
        finalLogoUrl = await uploadFileAndGetUrl(
          storage, 
          `clubs/${clubId}/logo_${Date.now()}`, 
          imageFile
        );
      }

      updateDocumentNonBlocking(clubRef, { ...form, logoUrl: finalLogoUrl });
      
      toast({
        title: "Cambios guardados",
        description: "La información institucional se ha actualizado en la nube.",
      });
      setTimeout(() => router.push(`/dashboard/clubs/${clubId}`), 500);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios en Storage.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}`} className="ambient-link group">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel del club
        </Link>
        <div>
          <h1 className="text-4xl font-bold font-headline">Identidad Institucional</h1>
          <p className="ambient-text text-lg opacity-90">Gestiona la información pública y visual de tu institución.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit shadow-2xl border-none">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-black">Escudo / Logo Oficial</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
            <div className="relative group">
              <div className="h-44 w-44 rounded-full border-4 border-slate-100 shadow-2xl overflow-hidden bg-white flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} className="h-full w-full object-contain p-2" alt="Logo" />
                ) : (
                  <Building2 className="h-20 w-20 text-slate-200" />
                )}
              </div>
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

            <div className="text-center space-y-3">
              <Button variant="default" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 font-bold h-10 px-6">
                <UploadCloud className="h-4 w-4" /> Subir Logo
              </Button>
              <p className="text-[10px] text-slate-400 px-4 italic font-medium">
                Sube el escudo para Storage.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <Building2 className="h-6 w-6" /> Información Base
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 font-medium italic">Esta información se utilizará en carnets y documentos oficiales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-8 bg-white">
            <div className="space-y-3">
              <Label htmlFor="clubName" className="text-xs font-black uppercase tracking-widest text-slate-400">Nombre de la Institución</Label>
              <Input 
                id="clubName"
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="Ej. Club Atlético Vicentinos"
                className="h-14 text-xl font-bold border-2 focus:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="clubAddress" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Dirección de Sede
                </Label>
                <Input 
                  id="clubAddress"
                  value={form.address} 
                  onChange={e => setForm({...form, address: e.target.value})} 
                  placeholder="Calle y Ciudad"
                  className="h-12 border-2 font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="clubPhone" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                <Input 
                  id="clubPhone"
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})} 
                  placeholder="+54 11..."
                  className="h-12 border-2 font-medium"
                />
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-full shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Almacenamiento Cloud</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Toda la multimedia ahora se procesa a través de Google Cloud Storage para mayor seguridad y velocidad.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-slate-50/50 p-6 border-t">
            <Button variant="ghost" onClick={() => router.back()} className="font-bold">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="h-12 px-10 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Actualizar Identidad
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
