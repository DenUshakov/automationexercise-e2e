import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { env } from './env';

const TestDataSchema = z.object({
  user: z.object({
    emailPrefix: z.string().min(1),
    emailDomain: z.string().min(1),
    namePrefix: z.string().min(1),
    title: z.enum(['Mr', 'Mrs']),
    birthDate: z.object({ day: z.string(), month: z.string(), year: z.string() }),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    company: z.string(),
    address1: z.string().min(1),
    address2: z.string(),
    country: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    zipcode: z.string().min(1),
    mobileNumber: z.string().min(1),
  }),
  product: z.object({
    id: z.number().int().positive(),
    searchTerm: z.string().min(1),
    name: z.string().min(1),
    price: z.string().min(1),
    availability: z.string().min(1),
  }),
  search: z.object({
    caseVariants: z.array(z.string().min(1)).min(1),
    partialTerm: z.string().min(1),
    noResultsTerm: z.string().min(1),
    specialCharacters: z.array(z.string().min(1)).min(1),
    paddedTerm: z.string().min(1),
  }),
  cart: z.object({
    quantity: z.number().int().min(2),
    belowMinimumQuantity: z.number().int().max(0),
  }),
});

export type TestData = z.infer<typeof TestDataSchema>;

function loadTestData(file: string): TestData {
  const path = resolve(process.cwd(), file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    throw new Error(`Cannot read test data file ${path}`, { cause: error });
  }
  const parsed = TestDataSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid test data in ${path}:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

export const testData = loadTestData(env.testDataFile);
