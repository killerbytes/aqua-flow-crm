"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Droplets, ShieldCheck, UserCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { LoginSchema } from "@/backend/schemas/zodSchemas";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "admin@test.com",
      password: "pass",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Login failed. Please check your credentials.",
        );
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-2">
            <Droplets className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            AquaFlow <span className="text-cyan-400">CRM</span>
          </h1>
          <p className="text-sm text-slate-400">
            Water Station Management & Operations Portal
          </p>
        </div>

        <Card className="glass-card border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Sign In
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Enter your credentials to access your account dashboard
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-500/10 border-red-500/30 text-red-400 text-xs py-2"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FieldGroup>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        type="text"
                        placeholder="e.g. Acme Corp"
                        {...field}
                      />
                      <FieldError>{errors.email?.message}</FieldError>
                    </Field>
                  )}
                />
              </FieldGroup>

              <FieldGroup>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Password</FieldLabel>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                      <FieldError>{errors.password?.message}</FieldError>
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-cyan-400" /> Quick Demo
                  Credentials:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickFill("admin@aquaflow.com")}
                    className="border-slate-800 bg-slate-900/40 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 text-xs justify-start px-2 py-1 h-auto"
                  >
                    👑 Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickFill("manager@aquaflow.com")}
                    className="border-slate-800 bg-slate-900/40 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 text-xs justify-start px-2 py-1 h-auto"
                  >
                    💼 Manager
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20"
              >
                {loading ? "Signing in..." : "Sign In to Portal"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
