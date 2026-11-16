import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/auth/login/route";
import {
  AuthenticationError,
  AuthService,
} from "../../src/backend/services/auth.service";

vi.mock("../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

type LoginResult = Awaited<ReturnType<typeof AuthService.login>>;

const mockLogin = () =>
  vi.spyOn(AuthService, "login").mockResolvedValue({
    token: "signed.jwt.token",
    user: { userId: 1, username: "admin", name: "Admin" },
  } as unknown as LoginResult);

describe("Unit - Login Route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should set the session cookie and return the user", async () => {
    const login = mockLogin();

    const response = await post({ username: "admin", password: "pass" });

    expect(response.status).toBe(200);
    expect(login).toHaveBeenCalledWith("admin", "pass");
    expect((await response.json()).user).toMatchObject({ username: "admin" });
    expect(response.cookies.get("token")).toMatchObject({
      value: "signed.jwt.token",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("should keep the token out of the response body", async () => {
    mockLogin();

    const response = await post({ username: "admin", password: "pass" });

    expect(JSON.stringify(await response.json())).not.toContain(
      "signed.jwt.token",
    );
  });

  it.each([
    ["no username", { password: "pass" }],
    ["no password", { username: "admin" }],
    ["empty values", { username: "", password: "" }],
  ])("should answer 400 for %s, without trying to log in", async (_, body) => {
    const login = mockLogin();

    const response = await post(body);

    expect(response.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
    expect(response.cookies.get("token")).toBeUndefined();
  });

  it("should answer 401 with the reason for wrong credentials", async () => {
    vi.spyOn(AuthService, "login").mockRejectedValue(
      new AuthenticationError("Invalid email or password"),
    );

    const response = await post({ username: "admin", password: "wrong" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password" });
    expect(response.cookies.get("token")).toBeUndefined();
  });

  it("should answer 500 without the details of an unexpected failure", async () => {
    vi.spyOn(AuthService, "login").mockRejectedValue(
      new Error("connect ECONNREFUSED secret-host:5432"),
    );

    const response = await post({ username: "admin", password: "pass" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });

  it("should not fail open on a body that isn't JSON", async () => {
    const login = mockLogin();

    const response = await post("not json");

    expect(response.status).toBe(500);
    expect(login).not.toHaveBeenCalled();
  });
});
