
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Pantalla de Búsqueda Nacional desactivada.
 * Se redirige al dashboard correspondiente para centrar la experiencia en la gestión institucional del club.
 */
export default function GlobalPlayerSearchRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white opacity-50" />
    </div>
  );
}
