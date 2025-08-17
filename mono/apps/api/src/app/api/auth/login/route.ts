import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Basic validation for Purdue emails
    if (!email.endsWith('@purdue.edu')) {
      return NextResponse.json(
        { success: false, message: 'Must use a Purdue email address (@purdue.edu)' },
        { status: 400 }
      )
    }

    // Development login bypass
    if (email === 'dev@purdue.edu' && password === 'bypass') {
      // Set org context for RLS
      const PURDUE_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      await prisma.$executeRaw`SELECT set_config('app.org_id', ${PURDUE_ORG_ID}, true);`

      // Check if user exists, create if not
      let user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || 'Development User',
            orgId: PURDUE_ORG_ID,
            lastLoginAt: new Date()
          }
        })

        // Add default USER role
        await prisma.userRole.create({
          data: {
            userId: user.id,
            role: 'USER',
            orgId: PURDUE_ORG_ID
          }
        })
      } else {
        // Update last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }

      return NextResponse.json({
        success: true,
        token: `dev-token-${Date.now()}`,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      })
    }

    // For real authentication, you would verify password here
    // For now, just return error for non-dev logins
    return NextResponse.json(
      { success: false, message: 'Authentication not implemented for production users yet' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}