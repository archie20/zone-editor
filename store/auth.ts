/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia'
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth'

interface AuthState {
    user: User | null
    tenantId: string | null
    idToken: string | null
    loading: boolean
    error: string | null
    isAuthReady: boolean
}

interface CustomClaims {
    tenantId?: string
    role?: string
    [key: string]: any
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        tenantId: null,
        idToken: null,
        loading: false,
        error: null,
        isAuthReady: false
    }),

    getters: {
        isAuthenticated: (state): boolean => !!state.user,
        isLoading: (state): boolean => state.loading,
        hasError: (state): boolean => !!state.error,
        userEmail: (state): string | null => state.user?.email || null,
        userName: (state): string | null => state.user?.displayName || null,
        userPhotoURL: (state): string | null => state.user?.photoURL || null,
    },

    actions: {
        initializeAuth() {
            const { $auth } = useNuxtApp()

            onAuthStateChanged($auth, async (user) => {
                if (user) {
                    this.user = user
                    await this.fetchIdToken()
                } else {
                    this.user = null
                    this.tenantId = null
                    this.idToken = null
                }
                // Once the first check from Firebase is complete,
                // we mark the auth state as ready.
                this.isAuthReady = true
                
            })
        },

        async fetchIdToken() {
            if (!this.user) return

            try {
                const token = await this.user.getIdToken(true)
                this.idToken = token

                // Decode the token to extract custom claims
                const tokenResult = await this.user.getIdTokenResult()
                const claims = tokenResult.claims as CustomClaims

                // Extract tenantId from custom claims
                this.tenantId = claims.tenantId || null

            } catch (error) {
                console.error('Error fetching ID token:', error)
                this.error = 'Failed to fetch authentication token'
            }
        },

        async signInWithGoogle() {
            const { $auth } = useNuxtApp()
            this.loading = true
            this.error = null

            try {
                const provider = new GoogleAuthProvider()

                // Add custom parameters if needed
                provider.addScope('email')
                provider.addScope('profile')

                const result = await signInWithPopup($auth, provider)
                this.user = result.user

                // Fetch the ID token and extract claims
                await this.fetchIdToken()

                return result
            } catch (error: any) {
                console.error('Google sign-in error:', error)

                // Handle specific error codes
                switch (error.code) {
                    case 'auth/popup-closed-by-user':
                        this.error = 'Sign-in was cancelled'
                        break
                    case 'auth/popup-blocked':
                        this.error = 'Popup was blocked by your browser'
                        break
                    case 'auth/cancelled-popup-request':
                        this.error = 'Sign-in request was cancelled'
                        break
                    default:
                        this.error = error.message || 'Failed to sign in with Google'
                }

                throw error
            } finally {
                this.loading = false
            }
        },

        async signOut() {
            const { $auth } = useNuxtApp()
            this.loading = true

            try {
                await firebaseSignOut($auth)

                // Clear state
                this.user = null
                this.tenantId = null
                this.idToken = null
                this.error = null

                // Redirect to login page
                await navigateTo('/login')
            } catch (error: any) {
                console.error('Sign-out error:', error)
                this.error = 'Failed to sign out'
                throw error
            } finally {
                this.loading = false
            }
        },

        clearError() {
            this.error = null
        },

        // Method to refresh the ID token
        async refreshToken() {
            if (!this.user) return

            try {
                await this.fetchIdToken()
            } catch (error) {
                console.error('Error refreshing token:', error)
                // If token refresh fails, sign out the user
                await this.signOut()
            }
        }
    }
})