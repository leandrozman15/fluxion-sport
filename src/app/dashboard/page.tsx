
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Bienvenido</h1>
        <p className="text-muted-foreground">Tu nuevo proyecto comienza aquí. ¿Qué te gustaría construir hoy?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Primeros Pasos</CardTitle>
            <CardDescription>Define tu idea y yo te ayudaré a codificarla.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Puedes pedirme que cree una base de datos, formularios, paneles de control o cualquier otra funcionalidad.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
