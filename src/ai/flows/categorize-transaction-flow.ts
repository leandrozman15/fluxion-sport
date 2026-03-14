'use server';
/**
 * @fileOverview An AI agent for categorizing financial transactions.
 *
 * - categorizeTransaction - A function that handles the transaction categorization process.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  description: z
    .string()
    .describe(
      'A detailed description of the financial transaction, e.g., "Payment to Acme Corp for office supplies", "Monthly internet bill from ISP", "Grocery shopping at SuperMart", "Freelance work for Client X".'
    ),
});
export type CategorizeTransactionInput = z.infer<
  typeof CategorizeTransactionInputSchema
>;

const CategorizeTransactionOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe(
      'An array of suggested categories for the transaction. Examples: ["Groceries", "Rent", "Utilities", "Salary", "Software Subscriptions", "Office Supplies", "Travel", "Dining", "Transportation", "Consulting Fees"].'
    ),
});
export type CategorizeTransactionOutput = z.infer<
  typeof CategorizeTransactionOutputSchema
>;

export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const categorizeTransactionPrompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `You are an AI assistant specialized in financial transaction categorization for small businesses.

Given a transaction description, your task is to suggest up to 3 relevant categories that best classify the income or expense.
Consider common business and personal finance categories.

Transaction Description: {{{description}}}

Please provide your suggestions as a JSON array of strings, like this example: {"suggestedCategories": ["Office Supplies", "Business Expenses"]}
`,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await categorizeTransactionPrompt(input);
    return output!;
  }
);
