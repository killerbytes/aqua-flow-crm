import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unit - Railway Configuration Validation', () => {
  it('should explicitly set HOSTNAME to 0.0.0.0 in railway.json deploy env for Next.js standalone mode', () => {
    const railwayPath = path.resolve(process.cwd(), 'railway.json');
    expect(fs.existsSync(railwayPath)).toBe(true);

    const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));
    expect(railwayConfig.deploy?.env?.HOSTNAME).toBe('0.0.0.0');
  });

  it('should run migrations before deploying and wait for the health check', () => {
    const railwayPath = path.resolve(process.cwd(), 'railway.json');
    const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));

    expect(railwayConfig.deploy?.preDeployCommand).toEqual(['npm run db:migrate']);
    expect(railwayConfig.deploy?.healthcheckPath).toBe('/api/health');
  });
});
