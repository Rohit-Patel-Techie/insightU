import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { toast } from "sonner"

import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success("Signed out")
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-lg"
      >
        <Card>
          <CardHeader>
            <CardTitle>You're signed in</CardTitle>
            <CardDescription>
              This page is only reachable with a valid access token — try
              opening it in a private window without logging in first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Username</dt>
              <dd className="font-medium">{user?.username}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user?.email}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="font-medium">
                {user?.date_joined &&
                  new Date(user.date_joined).toLocaleDateString()}
              </dd>
            </dl>
            <Button variant="outline" onClick={handleLogout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}