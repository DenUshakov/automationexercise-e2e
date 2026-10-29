import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Values from the real environment (CI variables, shell) win over .env.
loadDotenv({ quiet: true });

// An empty value in .env means "not set", so the default applies.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const EnvSchema = z.object({
  BASE_URL: optional(z.url().default('https://automationexercise.com')),
  TEST_DATA_FILE: optional(z.string().default('test-data/default.json')),
  WORKERS: optional(z.coerce.number().int().positive().optional()),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

export const env = {
  baseUrl: parsed.data.BASE_URL.replace(/\/+$/, ''),
  testDataFile: parsed.data.TEST_DATA_FILE,
  workers: parsed.data.WORKERS,
} as const;
