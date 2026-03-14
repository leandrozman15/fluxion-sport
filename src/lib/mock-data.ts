
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

export const mockTransactions: Transaction[] = [
  { id: '1', amount: 5000, date: '2024-05-01', description: 'Consulting Project A', category: 'Consulting Fees', type: 'revenue' },
  { id: '2', amount: 1200, date: '2024-05-03', description: 'Monthly Office Rent', category: 'Rent', type: 'expense' },
  { id: '3', amount: 300, date: '2024-05-05', description: 'Cloud Services Subscription', category: 'Software Subscriptions', type: 'expense' },
  { id: '4', amount: 2500, date: '2024-05-10', description: 'Web Development Project B', category: 'Consulting Fees', type: 'revenue' },
  { id: '5', amount: 150, date: '2024-05-12', description: 'Grocery for office', category: 'Office Supplies', type: 'expense' },
  { id: '6', amount: 800, date: '2024-05-15', description: 'Freelance Design Work', category: 'Design', type: 'revenue' },
  { id: '7', amount: 45, date: '2024-05-18', description: 'Starbucks Meeting', category: 'Dining', type: 'expense' },
];

export const mockAppointments: Appointment[] = [
  { id: 'a1', clientName: 'Alice Johnson', dateTime: '2024-05-20T10:00:00', description: 'Initial Project Consultation', location: 'Zoom', status: 'confirmed' },
  { id: 'a2', clientName: 'Bob Smith', dateTime: '2024-05-21T14:30:00', description: 'Design Review Meeting', location: 'Office Room 302', status: 'pending' },
  { id: 'a3', clientName: 'Charlie Brown', dateTime: '2024-05-22T09:00:00', description: 'Q2 Strategy Planning', location: 'Coffee Shop', status: 'confirmed' },
  { id: 'a4', clientName: 'Diana Prince', dateTime: '2024-05-23T16:00:00', description: 'Final Handover', location: 'Microsoft Teams', status: 'confirmed' },
];
