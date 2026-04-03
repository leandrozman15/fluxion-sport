
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon, LogOut, Camera, Loader2, UserCircle, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
        // 1. Sincronizar Perfil por UID (Asegura existencia con set merge)
        setDocumentNonBlocking(doc(firestore, "users", user.uid), { 
          photoUrl: base64,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Sincronizar por Email en otras colecciones vinculadas (Staff/Jugadores)
        if (email) {
          // Actualizar en tabla de staff
          const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          staffSnap.forEach(d => {
            if (d.id !== user.uid) updateDocumentNonBlocking(doc(firestore, "users", d.id), { photoUrl: base64 });
          });

          // Actualizar en padrón de jugadores y su club
          const indexSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
          indexSnap.forEach(d => {
            updateDocumentNonBlocking(doc(firestore, "all_players_index", d.id), { photoUrl: base64 });
            const clubId = d.data().clubId;
            if (clubId) {
              updateDocumentNonBlocking(doc(firestore, "clubs", clubId, "players", d.id), { photoUrl: base64 });
            }
          });
        }

        toast({ title: "Foto Actualizada", description: "Tu nueva imagen ya es visible en tu carnet y pizarra." });
        setIsPhotoOpen(false);
      } catch (err) {
        console.error("Error subiendo foto:", err);
        toast({ variant: "destructive", title: "Error al subir", description: "No se pudo actualizar la imagen." });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] md:relative md:z-auto md:flex md:flex-col gap-3 bg-white/95 backdrop-blur-xl md:bg-white/80 border-t md:border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl p-2 md:rounded-2xl h-[72px] md:h-fit md:sticky md:top-8 md:min-w-[72px] md:max-w-[72px] animate-in slide-in-from-bottom md:slide-in-from-left duration-500 flex flex-row items-center justify-around md:justify-start pb-safe">
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-row md:flex-col gap-1 md:gap-3 w-full items-center justify-around md:justify-start">
          {items.map((item) => {
            const isReallyActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative",
                      isReallyActive 
                        ? "bg-primary text-primary-foreground shadow-lg scale-110 md:scale-105" 
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {Icon && <Icon className={cn("h-6 w-6 md:h-5 md:w-5", isReallyActive ? "scale-110" : "group-hover:scale-110")} />}
                    {isReallyActive && (
                      <span className="absolute -top-1 -right-1 md:hidden w-2 h-2 bg-accent rounded-full animate-pulse shadow-sm" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden md:block font-bold bg-primary text-primary-foreground border-none">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="hidden md:block w-8 h-px bg-slate-200 my-2" />

        <div className="flex flex-row md:flex-col gap-1 md:gap-3 items-center">
          <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary transition-all duration-200 group focus:outline-none">
                    <Camera className="h-6 w-6 md:h-5 md:w-5 group-hover:scale-110" />
                  </button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block font-bold bg-slate-100 text-slate-900 border-none">Actualizar Mi Foto</TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-sm bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900">Actualizar Perfil</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Sube una foto o tómate una selfie para tu carnet oficial.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="h-32 w-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                  <UserCircle className="h-16 w-16 text-slate-200" />
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <div className="grid grid-cols-1 w-full gap-2">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="font-black uppercase text-[10px] tracking-widest h-12 gap-2 shadow-lg shadow-primary/20">
                    {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    Seleccionar Foto o Selfie
                  </Button>
                  <Button variant="ghost" onClick={() => setIsPhotoOpen(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleLogout} className="flex items-center justify-center w-12 h-12 rounded-xl text-destructive hover:bg-red-50 transition-all duration-200 group">
                <LogOut className="h-6 w-6 md:h-5 md:w-5 group-hover:scale-110" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden md:block font-bold bg-red-50 text-destructive border-none">Cerrar Sesión</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
