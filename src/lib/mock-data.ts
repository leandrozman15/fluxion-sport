
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

export const mockTransactions: Transaction[] = [];
export const mockAppointments: Appointment[] = [];
