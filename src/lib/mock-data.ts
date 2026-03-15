
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

// --- ECOSISTEMA DE EJEMPLO DEPORTIVO ---

export const demoFederations = [
  { 
    id: "fed-cah", 
    name: "Confederación Argentina de Hockey", 
    sport: "Hockey sobre Césped", 
    country: "Argentina", 
    logoUrl: "https://picsum.photos/seed/cah/200/200", 
    description: "Máxima autoridad del hockey en Argentina." 
  }
];

export const demoAssociations = [
  { 
    id: "assoc-ahba", 
    federationId: "fed-cah", 
    name: "Asociación de Hockey de Buenos Aires", 
    region: "Metropolitana", 
    logoUrl: "https://picsum.photos/seed/ahba/200/200", 
    description: "Liga más importante de la región metropolitana." 
  }
];

export const demoClubs = [
  { 
    id: "club-vic", 
    associationId: "assoc-ahba", 
    name: "Club Atlético Vicentinos", 
    address: "San Miguel, Buenos Aires", 
    phone: "11-4455-6677", 
    logoUrl: "https://picsum.photos/seed/vic/200/200" 
  },
  { 
    id: "club-lomas", 
    associationId: "assoc-ahba", 
    name: "Lomas Athletic Club", 
    address: "Lomas de Zamora", 
    phone: "11-2233-4455", 
    logoUrl: "https://picsum.photos/seed/lomas/200/200" 
  },
  { 
    id: "club-geba", 
    associationId: "assoc-ahba", 
    name: "Gimnasia y Esgrima de Buenos Aires", 
    address: "Palermo, CABA", 
    phone: "11-9988-7766", 
    logoUrl: "https://picsum.photos/seed/geba/200/200" 
  }
];

export const demoPlayers = [
  { firstName: "Juana", lastName: "Viale", position: "Delantera", jerseyNumber: 10, email: "juana@example.com", photoUrl: "https://picsum.photos/seed/p1/200/200" },
  { firstName: "Martina", lastName: "García", position: "Volante", jerseyNumber: 8, email: "martina@example.com", photoUrl: "https://picsum.photos/seed/p2/200/200" },
  { firstName: "Delfina", lastName: "Merino", position: "Delantera", jerseyNumber: 7, email: "delfi@example.com", photoUrl: "https://picsum.photos/seed/p3/200/200" },
  { firstName: "Belén", lastName: "Succi", position: "Arquera", jerseyNumber: 1, email: "belen@example.com", photoUrl: "https://picsum.photos/seed/p4/200/200" },
  { firstName: "Agustina", lastName: "Albertario", position: "Delantera", jerseyNumber: 19, email: "agus@example.com", photoUrl: "https://picsum.photos/seed/p5/200/200" },
];

export const demoTournaments = [
  { 
    id: "tour-metro-2025", 
    name: "Metropolitano Damas 2025", 
    season: "2025", 
    sport: "Hockey", 
    startDate: "2025-03-15", 
    endDate: "2025-11-30" 
  }
];

export const demoStandings = [
  { teamName: "Club Atlético Vicentinos", played: 5, won: 4, drawn: 1, lost: 0, goalsFor: 12, goalsAgainst: 3, points: 13 },
  { teamName: "Lomas Athletic Club", played: 5, won: 3, drawn: 2, lost: 0, goalsFor: 10, goalsAgainst: 4, points: 11 },
  { teamName: "Gimnasia y Esgrima", played: 5, won: 3, drawn: 0, lost: 2, goalsFor: 8, goalsAgainst: 6, points: 9 },
  { teamName: "San Fernando", played: 5, won: 2, drawn: 1, lost: 2, goalsFor: 7, goalsAgainst: 7, points: 7 },
  { teamName: "River Plate", played: 5, won: 1, drawn: 0, lost: 4, goalsFor: 4, goalsAgainst: 11, points: 3 },
];

export const demoMatches = [
  { title: "Fecha 1: Vicentinos vs Lomas", type: "match", opponent: "Lomas Athletic", date: new Date().toISOString(), location: "Cancha Vicentinos", homeScore: 2, awayScore: 1, matchFinished: true, status: "played" },
  { title: "Entrenamiento Físico", type: "training", date: new Date(Date.now() + 86400000).toISOString(), location: "Club Sede Central", status: "scheduled" },
  { title: "Fecha 2: Vicentinos vs GEBA", type: "match", opponent: "GEBA", date: new Date(Date.now() + 172800000).toISOString(), location: "Sede Palermo", status: "scheduled" }
];
