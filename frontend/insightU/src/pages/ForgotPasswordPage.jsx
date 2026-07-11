import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { forgotPasswordSchema } from "@/lib/validation"
import { applyApiErrorsToForm } from "@/lib/api-errors"
import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [formError, setFormError] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (values) => {
    setFormError(null)
    setIsSubmitting(true)
    try {
      await requestPasswordReset(values)
      // The backend intentionally returns the same success response whether
      // or not the email exists, so we can't (and shouldn't) tell the user
      // which happened — just confirm the request went through.
      setIsSubmitted(true)
    } catch (error) {
      const message = applyApiErrorsToForm(error, form.setError, ["email"])
      if (message) setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      description="We'll email you a link to reset it"
      footer={
        <Link to="/login" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      }
    >
      <Card>
        <CardContent className="pt-6">
          {isSubmitted ? (
            <Alert variant="success">
              <AlertDescription>
                If an account exists for that email, a reset link is on its way.
                Check your inbox (and spam folder).
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {formError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
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

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}  