import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { registerSchema } from "@/lib/validation";
import { applyApiErrorsToForm } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", password2: "" },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      // Create the account
      await register(values);

      // Immediately log them in using the credentials they just typed
      await login({
        username: values.username,
        password: values.password,
      });

      toast.success("Account created successfully! ✅");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = applyApiErrorsToForm(error, form.setError, [
        "username",
        "email",
        "password",
        "password2",
      ]);
      if (message) setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-gray-800 selection:bg-indigo-100 overflow-hidden flex flex-col justify-center py-4 sm:px-6 lg:px-8">
      {/* Modern SaaS Background Effects (Matching Home & Login) */}
      <div className="absolute top-[-10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-multiply" />

      {/* Header / Logo Area */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link
          to="/"
          className="flex items-center gap-2 mb-3 hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-center size-10 rounded-xl bg-white shadow-sm border border-gray-100 p-1">
            <img
              src="logo.webp"
              alt="insightU-logo"
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
            InsightU
          </h1>
        </Link>
        <h2 className="text-center text-2xl font-extrabold text-gray-900 tracking-tight">
          Create an account
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Sign up to get started
        </p>
      </div>

      {/* Registration Form Container */}
      <div className="relative z-10 mt-4 sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="m-3 bg-white/80 backdrop-blur-md py-6 px-6 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)]  border border-white/60 rounded-[2rem] sm:rounded-[2rem] sm:px-10">
          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <Alert
                variant="destructive"
                className="rounded-xl border-red-200 bg-red-50 text-red-800 py-2"
              >
                <AlertDescription className="font-medium text-sm">
                  {formError}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              noValidate
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your_username"
                        autoComplete="username"
                        className="h-10 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-10 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-10 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Confirm password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-10 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 mt-4 text-sm font-semibold text-white transition-all bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>
          {/* Sign In Prompt */}
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
