import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const PURDUE_ORG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Purdue org UUID
  
  // Seed roles for initial setup
  const roles: Role[] = ['OWNER', 'ADMIN', 'ANALYST', 'DEVOPS', 'USER']
  
  console.log('🌱 Seeding Boiler AI database...')
  
  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@purdue.edu' },
    update: {},
    create: {
      orgId: PURDUE_ORG_ID,
      name: 'Boiler AI Admin',
      email: 'admin@purdue.edu',
      lastLoginAt: new Date(),
    },
  })
  
  // Assign OWNER role to admin
  await prisma.userRole.upsert({
    where: {
      userId_orgId_role: {
        userId: adminUser.id,
        orgId: PURDUE_ORG_ID,
        role: 'OWNER',
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      orgId: PURDUE_ORG_ID,
      role: 'OWNER',
    },
  })
  
  // Create sample metrics for demo
  const metrics = [
    { metricKey: 'daily_active_users', valueNumeric: 157 },
    { metricKey: 'weekly_active_users', valueNumeric: 423 },
    { metricKey: 'monthly_active_users', valueNumeric: 1250 },
    { metricKey: 'chat_sessions_today', valueNumeric: 89 },
    { metricKey: 'avg_response_time_ms', valueNumeric: 850 },
    { metricKey: 'success_rate_percent', valueNumeric: 96.8 },
  ]
  
  for (const metric of metrics) {
    await prisma.dpMetric.create({
      data: {
        orgId: PURDUE_ORG_ID,
        metricKey: metric.metricKey,
        valueNumeric: metric.valueNumeric,
        labels: { source: 'seed_data' },
      },
    })
  }
  
  // Create sample topic for Elo tracking
  await prisma.eloTopic.upsert({
    where: {
      orgId_topicKey: {
        orgId: PURDUE_ORG_ID,
        topicKey: 'academic_planning',
      },
    },
    update: {},
    create: {
      orgId: PURDUE_ORG_ID,
      topicKey: 'academic_planning',
      rating: 1200,
      rd: 300,
      vol: 0.05,
    },
  })
  
  console.log('✅ Seed completed successfully!')
  console.log(`🔑 Admin user: ${adminUser.email}`)
  console.log(`🏢 Org ID: ${PURDUE_ORG_ID}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })