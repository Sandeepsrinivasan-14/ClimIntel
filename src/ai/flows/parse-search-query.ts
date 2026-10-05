'use server';

import {ai} from '@/ai/genkit';
import { ParseSearchQueryInput, ParseSearchQueryOutput, ParseSearchQueryInputSchema, ParseSearchQueryOutputSchema } from '@/lib/types';


export async function parseSearchQuery(input: ParseSearchQueryInput): Promise<ParseSearchQueryOutput> {
    return parseSearchQueryFlow(input);
}

const parseSearchQueryPrompt = ai.definePrompt({
    name: 'parseSearchQueryPrompt',
    input: { schema: ParseSearchQueryInputSchema },
    output: { schema: ParseSearchQueryOutputSchema },
    prompt: `You are an expert at parsing natural language search queries for a health dashboard.
Your task is to extract a region, a disease, and a date from the user's query.

- The user's query is: "{{{query}}}"
- Today's date is: {{{currentDate}}}

- Map the user's location term to one of the following available regions (return its ID):
  {{#each regions}}
  - {{name}} (id: {{id}})
  {{/each}}

- Map the user's disease term to one of the following available diseases (return its ID):
  {{#each diseases}}
  - {{name}} (id: {{id}})
  {{/each}}

- Parse any date reference (like "last month", "August 2023", "yesterday") into a YYYY-MM-DD format.

If a value is not mentioned, leave its field empty.
Return a JSON object with the extracted values.`,
});


const parseSearchQueryFlow = ai.defineFlow(
    {
        name: 'parseSearchQueryFlow',
        inputSchema: ParseSearchQueryInputSchema,
        outputSchema: ParseSearchQueryOutputSchema,
    },
    async (input) => {
        const { output } = await parseSearchQueryPrompt(input);
        return output!;
    }
);
