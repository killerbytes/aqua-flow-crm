import { describe, it, expect, vi } from "vitest";

vi.mock("@sentry/nextjs", () => {
  return {
    init: vi.fn(),
    captureRequestError: vi.fn(),
    captureRouterTransitionStart: vi.fn(),
    captureException: vi.fn(),
    replayIntegration: vi.fn(() => ({ name: "Replay" })),
    withSentryConfig: vi.fn((config) => config),
  };
});

describe("Sentry Next.js Configuration Unit Tests", () => {
  it("should have instrumentation.ts exporting register and onRequestError", async () => {
    const instrumentation = await import("../../src/instrumentation");
    expect(instrumentation.register).toBeTypeOf("function");
    expect(instrumentation.onRequestError).toBeDefined();
  });

  it("should initialize sentry server config with includeLocalVariables and enableLogs", async () => {
    await import("../../src/sentry.server.config");
    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        includeLocalVariables: true,
        enableLogs: true,
      })
    );
  });

  it("should initialize sentry edge config with enableLogs", async () => {
    await import("../../src/sentry.edge.config");
    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogs: true,
      })
    );
  });

  it("should export onRouterTransitionStart from instrumentation-client", async () => {
    const clientConfig = await import("../../src/instrumentation-client");
    expect(clientConfig.onRouterTransitionStart).toBeDefined();
  });
});
