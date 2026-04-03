
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Redirección de página de finanzas global a dashboard específico.
 * Fluxion Sport utiliza una arquitectura per-club basada en Firestore.
 */
export default function GlobalFinanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
    </div>
  );
}
