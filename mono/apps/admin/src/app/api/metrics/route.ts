import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Set org context for RLS (in production, this would come from auth)
    const PURDUE_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    await prisma.$executeRaw`SELECT set_config('app.org_id', ${PURDUE_ORG_ID}, true);`

    // Get active users metrics
    const dailyUsers = await prisma.dpMetric.findFirst({
      where: {
        orgId: PURDUE_ORG_ID,
        metricKey: 'daily_active_users'
      },
      orderBy: { createdAt: 'desc' }
    })

    const weeklyUsers = await prisma.dpMetric.findFirst({
      where: {
        orgId: PURDUE_ORG_ID,
        metricKey: 'weekly_active_users'
      },
      orderBy: { createdAt: 'desc' }
    })

    const monthlyUsers = await prisma.dpMetric.findFirst({
      where: {
        orgId: PURDUE_ORG_ID,
        metricKey: 'monthly_active_users'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get recent outcomes for performance metrics
    const recentOutcomes = await prisma.outcome.findMany({
      where: {
        orgId: PURDUE_ORG_ID,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    // Calculate performance metrics
    const totalRequests = recentOutcomes.length
    const successfulRequests = recentOutcomes.filter(o => o.status === 'success').length
    const avgLatency = recentOutcomes.length > 0 
      ? recentOutcomes.reduce((sum, o) => sum + o.latencyMs, 0) / recentOutcomes.length 
      : 0
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100
    const requestsPerSecond = totalRequests / (24 * 60 * 60) // Approximate RPS over 24h

    return NextResponse.json({
      activeUsers: {
        daily: dailyUsers?.valueNumeric || 0,
        weekly: weeklyUsers?.valueNumeric || 0,
        monthly: monthlyUsers?.valueNumeric || 0,
      },
      performance: {
        uptime: 99.8, // Would come from monitoring system
        avgResponseTime: Math.round(avgLatency),
        successRate: Math.round(successRate * 10) / 10,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        totalRequests24h: totalRequests
      }
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}