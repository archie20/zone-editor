import { useAuth } from "~/composables/useAuth"

export default defineNuxtRouteMiddleware(() => {
    const { isAuthenticated } = useAuth()

    // If user is authenticated, redirect to app
    if (isAuthenticated.value) {
        return navigateTo('/app')
    }
  })