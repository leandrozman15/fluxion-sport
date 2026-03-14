
"use client";

import { useState } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Sparkles,
  Bell,
  Loader2
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAppointments, Appointment } from "@/lib/mock-data";
import { generateAppointmentReminders, Reminder } from "@/ai/flows/generate-appointment-reminders";

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remLoading, setRemLoading] = useState(false);

  const handleGenerateReminders = async () => {
    setRemLoading(true);
    try {
      const result = await generateAppointmentReminders({
        appointments: appointments.map(a => ({
          id: a.id,
          clientName: a.clientName,
          dateTime: a.dateTime,
          description: a.description,
          location: a.location
        }))
      });
      setReminders(result.reminders);
    } catch (e) {
      console.error(e);
    } finally {
      setRemLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Appointment Scheduler</h1>
          <p className="text-muted-foreground">Manage your client meetings and schedules.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateReminders} disabled={remLoading} className="flex items-center gap-2">
            {remLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />}
            Generate Reminders
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-4 h-fit">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm"
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-6">
          {reminders.length > 0 && (
            <Card className="border-accent bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-accent" /> AI Suggested Reminders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reminders.map((r, i) => (
                  <div key={i} className="text-xs p-2 bg-background border rounded-md shadow-sm">
                    <span className="font-bold text-accent">{r.suggestedTime}:</span> {r.reminderText}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setReminders([])} className="w-full text-xs">Dismiss Reminders</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Scheduled sessions for the next few days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments.map((app) => (
                <div key={app.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card hover:border-accent transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="bg-secondary p-3 rounded-full shrink-0">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {app.description}
                        <Badge variant={app.status === 'confirmed' ? 'default' : 'secondary'}>{app.status}</Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><User className="h-3 w-3" /> {app.clientName}</div>
                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {new Date(app.dateTime).toLocaleString()}</div>
                        {app.location && <div className="flex items-center gap-2 col-span-2"><MapPin className="h-3 w-3" /> {app.location}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-2">
                    <Button variant="outline" size="sm">Reschedule</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Cancel</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
