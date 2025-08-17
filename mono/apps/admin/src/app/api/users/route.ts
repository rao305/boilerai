import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Set org context for RLS (in production, this would come from auth)
    const PURDUE_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    await prisma.$executeRaw`SELECT set_config('app.org_id', ${PURDUE_ORG_ID}, true);`

    // Get all users with their roles
    const users = await prisma.user.findMany({
      where: {
        orgId: PURDUE_ORG_ID
      },
      include: {
        userRoles: {
          select: {
            role: true
          }
        }
      },
      orderBy: {
        lastLoginAt: 'desc'
      }
    })

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      roles: user.userRoles.map(ur => ur.role),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (localPart.length <= 1) return email
  
  return `${localPart[0]}***@${domain}`
}