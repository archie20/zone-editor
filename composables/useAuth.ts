/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "~/store/auth"

export const useAuth = () => {
    const authStore = useAuthStore()

    // Reactive state
    const user = computed(() => authStore.user)
    const tenantId = computed(() => authStore.tenantId)
    const idToken = computed(() => authStore.idToken)
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    const isLoading = computed(() => authStore.isLoading)
    const error = computed(() => authStore.error)
    const userEmail = computed(() => authStore.userEmail)
    const userName = computed(() => authStore.userName)
    const userPhotoURL = computed(() => authStore.userPhotoURL)

    // Actions
    const signInWithGoogle = async () => {
        try {
            await authStore.signInWithGoogle()

            // Redirect to app after successful login
            await navigateTo('/')
        } catch (error) {
            // Error handling is already done in the store
            console.error('Sign-in failed:', error)
        }
    }

    const signOut = async () => {
        try {
            await authStore.signOut()
        } catch (error) {
            console.error('Sign-out failed:', error)
        }
    }

    const clearError = () => {
        authStore.clearError()
    }

    const refreshToken = async () => {
        try {
            await authStore.refreshToken()
        } catch (error) {
            console.error('Token refresh failed:', error)
        }
    }

    // Initialize auth state on first use
    const initializeAuth = async () => {
        try {
            await authStore.initializeAuth()
        } catch (error) {
            console.error('Auth initialization failed:', error)
        }
    }

    // Auto-refresh token every 50 minutes (Firebase tokens expire in 1 hour)
    const startTokenRefresh = () => {
        if (import.meta.client && isAuthenticated.value) {
            const refreshInterval = setInterval(async () => {
                if (isAuthenticated.value) {
                    await refreshToken()
                } else {
                    clearInterval(refreshInterval)
                }
            }, 50 * 60 * 1000) // 50 minutes

            // Clean up interval on component unmount
            onUnmounted(() => {
                clearInterval(refreshInterval)
            })
        }
    }

    // Helper function to get authorization header for API calls
    const getAuthHeader = () => {
        if (!idToken.value) {
            throw new Error('No authentication token available')
        }

        return {
            Authorization: `Bearer ${idToken.value}`
        }
    }

    // Helper function to make authenticated API calls
    const $fetchAuth = async (url: string, options: any = {}) => {
        try {
            const headers = {
                ...options.headers,
                ...getAuthHeader()
            }

            return await $fetch(url, {
                ...options,
                headers
            })
        } catch (error: any) {
            // If we get a 401, try to refresh the token and retry once
            if (error.statusCode === 401 && idToken.value) {
                try {
                    await refreshToken()

                    const headers = {
                        ...options.headers,
                        ...getAuthHeader()
                    }

                    return await $fetch(url, {
                        ...options,
                        headers
                    })
                } catch (refreshError) {
                    // If refresh fails, sign out the user
                    await signOut()
                    throw refreshError
                }
            }

            throw error
        }
    }

    return {
        // State
        user: readonly(user),
        tenantId: readonly(tenantId),
        idToken: readonly(idToken),
        isAuthenticated: readonly(isAuthenticated),
        isLoading: readonly(isLoading),
        error: readonly(error),
        userEmail: readonly(userEmail),
        userName: readonly(userName),
        userPhotoURL: readonly(userPhotoURL),

        // Actions
        signInWithGoogle,
        signOut,
        clearError,
        refreshToken,
        initializeAuth,
        startTokenRefresh,

        // Utilities
        getAuthHeader,
        $fetchAuth
    }
  }