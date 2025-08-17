import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: 'azure-ad',
      name: 'Microsoft Entra ID',
      type: 'oauth',
      wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid_configuration`,
      authorization: {
        params: {
          scope: 'openid profile email',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email?.endsWith('@purdue.edu')) {
        console.warn(`❌ Non-Purdue email attempted login: ${user.email}`)
        return false
      }

      // Check MFA requirement
      if (account?.provider === 'azure-ad') {
        const amr = (profile as any)?.amr
        if (!amr || !amr.includes('mfa')) {
          console.warn(`❌ MFA required but not present for: ${user.email}`)
          return false
        }
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        
        // Fetch user roles from database
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { user: true },
        })
        
        session.user.roles = userRoles.map(ur => ur.role)
        session.user.orgId = userRoles[0]?.orgId || null
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  debug: process.env.NODE_ENV === 'development',
}

export async function setOrgContext(orgId: string) {
  await prisma.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true);`
}