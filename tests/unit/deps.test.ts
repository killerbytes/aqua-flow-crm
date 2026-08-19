import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unit - Package Dependencies Validation', () => {
  it('should explicitly declare Linux native oxide bindings in optionalDependencies for Railway/Linux builds', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkgContent.optionalDependencies).toBeDefined();
    expect(pkgContent.optionalDependencies['@tailwindcss/oxide-linux-x64-gnu']).toBeDefined();
    expect(pkgContent.optionalDependencies['@tailwindcss/oxide-linux-x64-musl']).toBeDefined();
  });

  it('should specify engines.node >= 20.0.0 in package.json and .nvmrc for Nixpacks Node 20 runtime', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const nvmrcPath = path.resolve(process.cwd(), '.nvmrc');

    expect(pkgContent.engines).toBeDefined();
    expect(pkgContent.engines.node).toBe('>=20.0.0');

    expect(fs.existsSync(nvmrcPath)).toBe(true);
    expect(fs.readFileSync(nvmrcPath, 'utf8').trim()).toBe('20');
  });

  it('should include tailwindcss and @tailwindcss/postcss in dependencies', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkgContent.dependencies['tailwindcss']).toBeDefined();
    expect(pkgContent.dependencies['@tailwindcss/postcss']).toBeDefined();
  });
});
