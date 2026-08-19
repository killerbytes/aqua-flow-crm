import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unit - Standalone Server Hostname Binding Validation', () => {
  it('should use node .next/standalone/server.js in railway.json startCommand', () => {
    const railwayPath = path.resolve(process.cwd(), 'railway.json');
    const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));

    expect(railwayConfig.deploy?.startCommand).toBe('node .next/standalone/server.js');
  });

  it('should patch .next/standalone/server.js to enforce process.env.HOSTNAME = 0.0.0.0', () => {
    const serverJsPath = path.resolve(process.cwd(), '.next', 'standalone', 'server.js');
    if (fs.existsSync(serverJsPath)) {
      const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
      expect(serverJsContent).toContain("process.env.HOSTNAME = '0.0.0.0'");
    }
  });
});
