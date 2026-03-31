
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon, LogOut, Camera, Loader2, UserCircle, Upload, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

interface SectionNavProps {
  items: NavItem[];
  basePath: string;
}

export function SectionNav({ items }: SectionNavProps) {
  const pathname = usePathname();
  const { auth, firestore, user } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const email = user.email?.toLowerCase().trim();

      try {
        // 1. Actualizar en colección de Staff (users) si existe
        const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
        staffSnap.forEach(d => {
          updateDocumentNonBlocking(doc(firestore, "users", d.id), { photoUrl: base64 });
        });

        // 2. Actualizar en índice global de jugadores
        const indexSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
        indexSnap.forEach(d => {
          updateDocumentNonBlocking(doc(firestore, "all_players_index", d.id), { photoUrl: base64 });
          
          // 3. Buscar y actualizar en la colección específica del club para ese jugador
          const clubId = d.data().clubId;
          if (clubId) {
            updateDocumentNonBlocking(doc(firestore, "clubs", clubId, "players", d.id), { photoUrl: base64 });
          }
        });

        toast({ title: "Foto Actualizada", description: "Tu nueva imagen ya es visible en tu carnet y pizarra." });
        setIsPhotoOpen(false);
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error al subir", description: "No se pudo actualizar la imagen." });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="hidden md:flex flex-col gap-3 bg-card/80 backdrop-blur-md border shadow-2xl p-2 rounded-2xl h-fit sticky top-8 animate-in slide-in-from-left duration-500 min-w-[64px] items-center">
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-3 w-full items-center">
          {items.map((item) => {
            const isReallyActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group",
                      isReallyActive 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {Icon && <Icon className={cn("h-5 w-5", isReallyActive ? "scale-110" : "group-hover:scale-110")} />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold bg-primary text-primary-foreground border-none">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="w-8 h-px bg-slate-200 my-2" />

        {/* Botón de Cámara para Selfie / Foto */}
        <Tooltip>
          <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary transition-all duration-200 group">
                  <Camera className="h-5 w-5 group-hover:scale-110" />
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <DialogContent className="max-w-sm bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Actualizar Perfil</DialogTitle>
                <DialogDescription>Sube una foto o tómate una selfie para tu carnet oficial.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="h-32 w-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                  <UserCircle className="h-16 w-16 text-slate-200" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="user" 
                  onChange={handlePhotoUpload} 
                />
                <div className="grid grid-cols-1 w-full gap-2">
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className="font-black uppercase text-[10px] tracking-widest h-12 gap-2"
                  >
                    {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    Tomar Selfie / Subir Foto
                  </Button>
                  <Button variant="ghost" onClick={() => setIsPhotoOpen(false)} className="text-[10px] font-bold uppercase tracking-widest">
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <TooltipContent side="right" className="font-bold bg-slate-900 text-white border-none">
            Actualizar Mi Foto
          </TooltipContent>
        </Tooltip>

        {/* Salir integrado en la navegación de iconos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-destructive hover:bg-red-50 transition-all duration-200 group"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold bg-destructive text-white border-none">
            Cerrar Sesión
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
