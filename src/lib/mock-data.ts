
export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  category?: string;
  type: 'revenue' | 'expense';
}

export interface Appointment {
  id: string;
  clientName: string;
  dateTime: string;
  description: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

// --- BASES DE DATOS VACIADAS PARA REINICIO DEL SISTEMA ---

export const mockTransactions: Transaction[] = [];

export const mockAppointments: Appointment[] = [];

export const demoFederations: any[] = [];

export const demoAssociations: any[] = [];

export const demoClubs: any[] = [];

export const demoPlayers: any[] = [];

export const demoTournaments: any[] = [];

export const demoStandings: any[] = [];

export const demoMatches: any[] = [];
