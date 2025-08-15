import { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { env } from './env'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    AzureADProvider({
      clientId: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET,
      tenantId: env.AZURE_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email',
          prompt: 'consent',
          // Enable PKCE for enhanced security
          code_challenge_method: 'S256',
        },
      },
      // Custom profile mapping for Purdue validation
      profile: (profile, tokens) => {
        // Validate Purdue tenant and email domain
        const isPurdueUser = 
          profile.tid === env.AZURE_TENANT_ID &&
          (profile.preferred_username?.endsWith('@purdue.edu') || 
           profile.upn?.endsWith('@purdue.edu') ||
           profile.email?.endsWith('@purdue.edu'))

        if (!isPurdueUser) {
          throw new Error('Access restricted to Purdue University accounts')
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.preferred_username || profile.upn || profile.email,
          image: null, // No profile images for privacy
        }
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.boilerai.com' : undefined,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  pages: {
    signIn: '/signin',
    error: '/signin',
    newUser: '/app', // Redirect new users to main app with privacy intro
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Additional Purdue validation at sign-in
      if (account?.provider === 'azure-ad') {
        const email = user.email || profile?.email
        if (!email?.endsWith('@purdue.edu')) {
          console.warn(`Blocked non-Purdue sign-in attempt: ${email}`)
          return false
        }

        // Validate tenant ID in the token
        const tenantId = (profile as any)?.tid
        if (tenantId !== env.AZURE_TENANT_ID) {
          console.warn(`Blocked sign-in from wrong tenant: ${tenantId}`)
          return false
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      // Store minimal user info in JWT
      if (user) {
        token.userId = user.id
        token.email = user.email
      }
      return token
    },

    async session({ session, token }) {
      // Include user ID in session for RLS
      if (token) {
        session.user.id = token.userId as string
        session.user.email = token.email as string
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Secure redirect logic
      const allowedPaths = ['/app', '/signin', '/']
      
      // Same origin redirects
      if (url.startsWith('/')) {
        const path = url.split('?')[0]
        if (allowedPaths.includes(path) || path.startsWith('/app/')) {
          return `${baseUrl}${url}`
        }
      }
      
      // Absolute URLs (same origin only)
      if (url.startsWith(baseUrl)) {
        return url
      }
      
      // Default to app
      return `${baseUrl}/app`
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      // Create profile for new users
      if (isNewUser) {
        try {
          await prisma.profile.create({
            data: {
              userId: user.id,
              displayName: user.name,
              role: 'STUDENT', // Default role
            },
          })
        } catch (error) {
          console.error('Failed to create user profile:', error)
          // Non-blocking - user can still sign in
        }
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
}