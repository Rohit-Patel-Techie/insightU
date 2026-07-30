import { api } from "@/lib/api"

export async function getProfile() { return (await api.get("/user/profile/me/")).data }
export async function updateProfile(payload) { return (await api.patch("/user/profile/me/", payload)).data }
export async function completeOnboarding(payload) { return (await api.post("/user/onboarding/complete/", payload)).data }
