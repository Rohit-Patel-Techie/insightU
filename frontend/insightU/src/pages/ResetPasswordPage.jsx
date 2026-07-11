import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { resetPasswordSchema } from "@/lib/validation"
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

export default function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const { uid, token } = useParams()
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", new_password2: "" },
  })

  const linkIsMissingParams = !uid || !token

  const onSubmit = async (values) => {
    setFormError(null)
    setIsSubmitting(true)
    try {
      await confirmPasswordReset({ uid, token, ...values })
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      })
    } catch (error) {
      const message = applyApiErrorsToForm(error, form.setError, [
        "new_password",
        "new_password2",
        "uid",
        "token",
      ])
      if (message) setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a new password for your account"
      footer={
        <Link to="/login" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      }
    >
      <Card>
        <CardContent className="pt-6">
          {linkIsMissingParams ? (
            <Alert variant="destructive">
              <AlertDescription>
                This reset link looks incomplete. Please use the link from
                your email, or request a new one.
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
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
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
                    name="new_password2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm new password</FormLabel>
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
                    {isSubmitting ? "Resetting..." : "Reset password"}
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