
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
  {
    id: "t1",
    amount: 1200,
    date: "2024-05-10",
    description: "Cuotas Sociales - Mayo",
    category: "Mensualidades",
    type: "revenue"
  },
  {
    id: "t2",
    amount: 450,
    date: "2024-05-12",
    description: "Pago Arbitraje - Fecha 4",
    category: "Gastos Operativos",
    type: "expense"
  },
  {
    id: "t3",
    amount: 2500,
    date: "2024-05-15",
    description: "Sponsor - Bebidas Power",
    category: "Patrocinios",
    type: "revenue"
  },
  {
    id: "t4",
    amount: 800,
    date: "2024-05-18",
    description: "Compra de Material (Conos y Pelotas)",
    category: "Equipamiento",
    type: "expense"
  },
  {
    id: "t5",
    amount: 150,
    date: "2024-05-20",
    description: "Inscripción Torneo Relámpago",
    category: "Torneos",
    type: "revenue"
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: "a1",
    clientName: "Entrenadores",
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    description: "Reunión Táctica Semanal",
    location: "Sala de Prensa",
    status: "confirmed"
  },
  {
    id: "a2",
    clientName: "Padres de Familia - 9na Div",
    dateTime: new Date(Date.now() + 172800000).toISOString(),
    description: "Reunión Informativa Viaje",
    location: "Gimnasio Cubierto",
    status: "pending"
  },
  {
    id: "a3",
    clientName: "C.D. Los Leones",
    dateTime: new Date(Date.now() + 259200000).toISOString(),
    description: "Amistoso Preparación",
    location: "Cancha Principal",
    status: "confirmed"
  }
];
