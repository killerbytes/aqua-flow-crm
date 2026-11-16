import { errorMessage } from "@/lib/errors";
import { z } from "zod";
import { getAuthContext, requireAuth, UserSession } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission, PermissionAction } from "../rbac/permissions";

export type ActionResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export type ActionContext = {
  user: UserSession;
};

export interface CreateActionOptions<TArgs extends unknown[], TOutput> {
  permission?: PermissionAction;
  schema?: z.ZodType;
  /** Which argument the schema validates. Use 1 for (id, input) actions. */
  inputIndex?: number;
  handler: (ctx: ActionContext, ...args: TArgs) => Promise<TOutput> | TOutput;
}

export function createProtectedAction<TArgs extends unknown[], TOutput>(
  opts: CreateActionOptions<TArgs, TOutput>,
) {
  return async (...args: TArgs): Promise<ActionResponse<TOutput>> => {
    try {
      await initDatabase();

      const context = await getAuthContext();
      if (!context) {
        return {
          success: false,
          error: "Unauthorized: authentication required",
        };
      }

      let user: UserSession;
      try {
        user = requireAuth(context);
      } catch (authErr) {
        return {
          success: false,
          error:
            errorMessage(authErr) || "Unauthorized: authentication required",
        };
      }

      if (opts.permission && !checkPermission(user.role, opts.permission)) {
        return {
          success: false,
          error: "Forbidden: insufficient permissions",
        };
      }

      if (opts.schema && args.length > 0) {
        const validation = opts.schema.safeParse(args[opts.inputIndex ?? 0]);
        if (!validation.success) {
          const formatted = validation.error.flatten().fieldErrors;
          return {
            success: false,
            error: "Validation failed",
            fieldErrors: formatted,
          };
        }
      }

      const data = await opts.handler({ user }, ...args);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: errorMessage(error) || "An unexpected error occurred",
      };
    }
  };
}
