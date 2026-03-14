'use server';
/**
 * @fileOverview An AI agent that analyzes financial transactions and suggests reconciliation tasks.
 *
 * - suggestFinancialReconciliation - A function that handles the financial reconciliation suggestion process.
 * - SuggestFinancialReconciliationInput - The input type for the suggestFinancialReconciliation function.
 * - SuggestFinancialReconciliationOutput - The return type for the suggestFinancialReconciliation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestFinancialReconciliationInputSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the transaction.'),
      amount: z.number().describe('The amount of the transaction.'),
      date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
      description: z.string().describe('A brief description of the transaction.'),
      category: z.string().optional().describe('The category of the transaction, if available. Transactions without a category should be flagged for categorization.'),
    })
  ).describe('A list of financial transactions to analyze for reconciliation tasks.'),
  prioritizedCategories: z.array(z.string()).optional().describe('Optional: A list of categories that are important or frequently used, which can help the AI categorize.'),
});
export type SuggestFinancialReconciliationInput = z.infer<typeof SuggestFinancialReconciliationInputSchema>;

const SuggestFinancialReconciliationOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(['categorize_expense', 'review_spending_pattern', 'other_reconciliation']).describe('The type of reconciliation task.'),
      description: z.string().describe('A detailed description of the suggested task.'),
      transactionId: z.string().optional().describe('The ID of the transaction relevant to this suggestion, if applicable.'),
      reason: z.string().describe('The reason why this suggestion is being made.'),
    })
  ).describe('A list of suggested financial reconciliation tasks.'),
});
export type SuggestFinancialReconciliationOutput = z.infer<typeof SuggestFinancialReconciliationOutputSchema>;

export async function suggestFinancialReconciliation(input: SuggestFinancialReconciliationInput): Promise<SuggestFinancialReconciliationOutput> {
  return suggestFinancialReconciliationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFinancialReconciliationPrompt',
  input: { schema: SuggestFinancialReconciliationInputSchema },
  output: { schema: SuggestFinancialReconciliationOutputSchema },
  prompt: `You are an AI assistant designed to help business owners keep their financial records organized and accurate. Your task is to analyze a list of financial transactions and proactively suggest reconciliation tasks.

Identify the following types of tasks:
1.  **Categorize Uncategorized Expenses**: For any transaction missing a category, suggest categorizing it.
2.  **Review Unusual Spending Patterns**: Identify any transactions that seem unusual based on their amount, description, or context, and suggest reviewing them. Explain why you consider it unusual.

Here are the financial transactions:

{{#each transactions}}
- ID: {{{id}}}, Amount: {{{amount}}}, Date: {{{date}}}, Description: "{{{description}}}", Category: {{{category}}}
{{/each}}

{{#if prioritizedCategories}}
Consider these prioritized categories for categorization suggestions: {{#each prioritizedCategories}}- {{{this}}} {{/each}}
{{/if}}

Please provide your suggestions in a JSON array format, strictly following the output schema.`,
});

const suggestFinancialReconciliationFlow = ai.defineFlow(
  {
    name: 'suggestFinancialReconciliationFlow',
    inputSchema: SuggestFinancialReconciliationInputSchema,
    outputSchema: SuggestFinancialReconciliationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
