import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import { resetPasswordSchema } from "@/lib/validation";
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

export default function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", new_password2: "" },
  });

  const linkIsMissingParams = !uid || !token;

  const onSubmit = async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await confirmPasswordReset({ uid, token, ...values });
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      });
    } catch (error) {
      const message = applyApiErrorsToForm(error, form.setError, [
        "new_password",
        "new_password2",
        "uid",
        "token",
      ]);
      if (message) setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-gray-800 selection:bg-indigo-100 overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Modern SaaS Background Effects */}
      <div className="absolute top-[-10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-multiply" />

      {/* Header / Logo Area */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link
          to="/"
          className="flex items-center gap-3 mb-6 hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-white shadow-sm border border-gray-100 p-1.5">
            <img
              src="logo.webp"
              alt="insightU-logo"
              className="object-contain w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            InsightU
          </h1>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Set a new password
        </h2>
        <p className="mt-2 text-center text-base text-gray-500">
          Choose a new password for your account
        </p>
      </div>

      {/* Form Container */}
      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="bg-white/80 backdrop-blur-md py-8 px-6 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)] border border-white/60 sm:rounded-[2rem] sm:px-10">
          {linkIsMissingParams ? (
            <Alert
              variant="destructive"
              className="rounded-xl border-red-200 bg-red-50 text-red-800"
            >
              <AlertDescription className="font-medium text-center">
                This reset link looks incomplete. Please use the link from your
                email, or request a new one.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {formError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6"
                >
                  <Alert
                    variant="destructive"
                    className="rounded-xl border-red-200 bg-red-50 text-red-800"
                  >
                    <AlertDescription className="font-medium">
                      {formError}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          New password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_password2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          Confirm new password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="h-12 rounded-xl border-gray-200 bg-gray-50/50 focus-visible:bg-white focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
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
                    className="w-full h-12 mt-4 text-base font-semibold text-white transition-all bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>

        {/* Back to Login Prompt */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
