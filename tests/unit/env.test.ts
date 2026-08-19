import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unit - Environment Schema Validation', () => {
  it('should default PORT to 3000 in env.ts for Next.js compatibility', () => {
    const envPath = path.resolve(process.cwd(), 'src/backend/db/env.ts');
    const envContent = fs.readFileSync(envPath, 'utf8');

    expect(envContent).toContain('.default("3000")');
  });
});
