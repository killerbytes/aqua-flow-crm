import { seedDatabase } from "../../src/backend/db/seed";

export async function setupTestDatabase(refDate?: Date) {
  const testRefDate = refDate || new Date("2026-07-30T00:00:00Z");
  await seedDatabase({ isTest: true, force: true, refDate: testRefDate });
}
