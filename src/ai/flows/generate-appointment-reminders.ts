'use server';

/**
 * @fileOverview A Genkit flow for generating appointment reminders.
 *
 * - generateAppointmentReminders - A function that handles the generation of appointment reminders.
 * - GenerateAppointmentRemindersInput - The input type for the generateAppointmentReminders function.
 * - GenerateAppointmentRemindersOutput - The return type for the generateAppointmentReminders function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const AppointmentSchema = z.object({
  id: z.string().describe('Unique identifier for the appointment.'),
  clientName: z.string().describe('The name of the client for the appointment.'),
  dateTime: z.string().describe('The date and time of the appointment in a parsable format (e.g., ISO string).'),
  description: z.string().describe('A brief description of the appointment.'),
  location: z.string().optional().describe('The location where the appointment will take place.'),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

const GenerateAppointmentRemindersInputSchema = z.object({
  appointments: z.array(AppointmentSchema).describe('A list of upcoming appointments for which reminders need to be generated.'),
});
export type GenerateAppointmentRemindersInput = z.infer<typeof GenerateAppointmentRemindersInputSchema>;

// Output Schema
const ReminderSchema = z.object({
  appointmentId: z.string().describe('The ID of the appointment this reminder is for.'),
  reminderText: z.string().describe('The suggested reminder text for the appointment.'),
  suggestedTime: z.string().optional().describe('The suggested timing for the reminder (e.g., "1 hour before", "1 day before").'),
});
export type Reminder = z.infer<typeof ReminderSchema>;

const GenerateAppointmentRemindersOutputSchema = z.object({
  reminders: z.array(ReminderSchema).describe('A list of generated reminders for the provided appointments.'),
});
export type GenerateAppointmentRemindersOutput = z.infer<typeof GenerateAppointmentRemindersOutputSchema>;

// Wrapper function
export async function generateAppointmentReminders(input: GenerateAppointmentRemindersInput): Promise<GenerateAppointmentRemindersOutput> {
  return generateAppointmentRemindersFlow(input);
}

// Prompt definition
const generateRemindersPrompt = ai.definePrompt({
  name: 'generateAppointmentRemindersPrompt',
  input: { schema: GenerateAppointmentRemindersInputSchema },
  output: { schema: GenerateAppointmentRemindersOutputSchema },
  prompt: `You are an AI assistant tasked with generating timely and helpful reminders for business appointments.\nFor each upcoming appointment provided, generate a clear, concise, and professional reminder text.\nAlso, suggest a good time for the reminder to be sent (e.g., "1 hour before", "1 day before").\n\nHere is the list of upcoming appointments:\n{{#each appointments}}\n  - ID: {{{id}}}\n    Client: {{{clientName}}}\n    Date/Time: {{{dateTime}}}\n    Description: {{{description}}}\n    {{#if location}}Location: {{{location}}}{{/if}}\n{{/each}}\n\nPlease generate the reminders in the specified JSON format.`,
});

// Flow definition
const generateAppointmentRemindersFlow = ai.defineFlow(
  {
    name: 'generateAppointmentRemindersFlow',
    inputSchema: GenerateAppointmentRemindersInputSchema,
    outputSchema: GenerateAppointmentRemindersOutputSchema,
  },
  async (input) => {
    const { output } = await generateRemindersPrompt(input);
    return output!;
  }
);
