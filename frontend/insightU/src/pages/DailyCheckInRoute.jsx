import { useAuth } from "@/context/AuthContext"
import DailyCheckInPage from "@/pages/DailyCheckInPage"

export default function DailyCheckInRoute() {
  const { user } = useAuth()
  return <DailyCheckInPage user={user} />
}

