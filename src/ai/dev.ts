import { config } from 'dotenv';
config();

import '@/ai/flows/categorize-transaction-flow.ts';
import '@/ai/flows/suggest-financial-reconciliation-flow.ts';
import '@/ai/flows/generate-appointment-reminders.ts';