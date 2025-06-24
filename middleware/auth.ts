import { useAuthStore } from "~/store/auth"

export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.server) {
        return
    }

    const authStore = useAuthStore()

    // Initialize auth if not already done
    if (!authStore.isAuthReady) {
        authStore.initializeAuth()
    }

    // Wait for auth state to be ready with timeout
    if (!authStore.isAuthReady) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Auth initialization timeout'))
            }, 10000) // 10 second timeout

            // Check if already ready (race condition fix)
            if (authStore.isAuthReady) {
                clearTimeout(timeout)
                resolve(undefined)
                return
            }

            const unsubscribe = authStore.$subscribe((mutation, state) => {
                if (state.isAuthReady) {
                    clearTimeout(timeout)
                    unsubscribe()
                    resolve(undefined)
                }
            })
        }).catch((error) => {
            console.error('Auth initialization failed:', error)
            // Fallback: assume not authenticated
        })
    }

    // Check authentication status
    if (!authStore.isAuthenticated) {
        if (to.path !== '/login') {
            return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
        }
    } else if (to.path === '/login') {
        // Handle redirect after login
        const redirectTo = to.query.redirect as string
        if (redirectTo && redirectTo !== '/login') {
            return navigateTo(redirectTo)
        }
        return navigateTo('/')
    }
})