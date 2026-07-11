import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { registerSchema } from "@/lib/validation";
import { applyApiErrorsToForm } from "@/lib/api-errors";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  const { register } = useAuth();
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
      await register(values);
      toast.success("Account created — you can now sign in.");
      navigate("/login", { replace: true });
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
    <AuthLayout
      title="Create an account"
      description="Sign up to get started"
      footer={
        <div className="text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6">
          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your_username"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
