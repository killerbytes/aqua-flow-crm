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
import { ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { loginAction } from "@/backend/actions";
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
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
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
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    startTransition(async () => {
      try {
        const res = await loginAction(data.username, data.password);

        if (!res?.success) {
          setError(res?.error || "Login failed. Please check your credentials.");
          return;
        }

        router.push(redirectPath);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-2">
            <Droplets className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            AquaFlow <span className="text-cyan-400">CRM</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Water Station Management & Operations Portal
          </p>
        </div>

        <Card className="backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold  flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Sign In
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Enter your credentials to access your account dashboard
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Username</FieldLabel>
                      <Input
                        type="text"
                        placeholder="Enter your username"
                        {...field}
                      />
                      <FieldError>{errors.username?.message}</FieldError>
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Signing in..." : "Sign In to Portal"}
                {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
