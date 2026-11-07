import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { envSchema } from '../../src/backend/db/env';

describe('Unit - Environment Schema Validation', () => {
  it('should default PORT to 3000 in env.ts for Next.js compatibility', () => {
    const envPath = path.resolve(process.cwd(), 'src/backend/db/env.ts');
    const envContent = fs.readFileSync(envPath, 'utf8');

    expect(envContent).toContain('.default("3000")');
  });

  it('should reject a missing JWT_SECRET in production', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'production' }).success).toBe(false);
  });

  it('should accept a real JWT_SECRET in production', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-real-production-secret',
    });
    expect(result.success).toBe(true);
  });

  it('should still allow the fallback secret outside production', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'development' }).success).toBe(true);
  });
});
