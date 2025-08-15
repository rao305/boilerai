import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning up existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.magicLink.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create test admin user (development only)
  if (process.env.NODE_ENV === 'development') {
    const adminUser = await prisma.user.create({
      data: {
        id: 'admin-user-id',
        email: 'admin@purdue.edu',
        name: 'System Administrator',
        provider: 'azure-ad',
        providerId: 'admin-provider-id',
        emailVerified: new Date(),
        profile: {
          create: {
            displayName: 'System Administrator',
            role: Role.admin,
            department: 'Information Technology',
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create test student user
    const studentUser = await prisma.user.create({
      data: {
        id: 'student-user-id',
        email: 'student@purdue.edu',
        name: 'Test Student',
        provider: 'azure-ad',
        providerId: 'student-provider-id',
        emailVerified: new Date(),
        profile: {
          create: {
            displayName: 'Test Student',
            role: Role.student,
            department: 'Computer Science',
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Created student user:', studentUser.email);

    // Create test faculty user
    const facultyUser = await prisma.user.create({
      data: {
        id: 'faculty-user-id',
        email: 'faculty@purdue.edu',
        name: 'Test Faculty',
        provider: 'azure-ad',
        providerId: 'faculty-provider-id',
        emailVerified: new Date(),
        profile: {
          create: {
            displayName: 'Dr. Test Faculty',
            role: Role.faculty,
            department: 'Computer Science',
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Created faculty user:', facultyUser.email);

    // Create test staff user
    const staffUser = await prisma.user.create({
      data: {
        id: 'staff-user-id',
        email: 'staff@purdue.edu',
        name: 'Test Staff',
        provider: 'azure-ad',
        providerId: 'staff-provider-id',
        emailVerified: new Date(),
        profile: {
          create: {
            displayName: 'Test Staff Member',
            role: Role.staff,
            department: 'Student Services',
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Created staff user:', staffUser.email);

    // Create some sample audit log entries
    await prisma.auditLog.createMany({
      data: [
        {
          userId: adminUser.id,
          action: 'login_success',
          details: { provider: 'azure-ad', method: 'sso' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          success: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          userId: studentUser.id,
          action: 'login_success',
          details: { provider: 'azure-ad', method: 'sso' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          success: true,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
        {
          userId: facultyUser.id,
          action: 'login_success',
          details: { provider: 'azure-ad', method: 'sso' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          success: true,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        },
        {
          action: 'login_failed',
          details: { provider: 'azure-ad', error: 'invalid_tenant', email: 'external@gmail.com' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Suspicious Browser)',
          success: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          action: 'rate_limit_exceeded',
          details: { endpoint: '/auth/signin', limit: 10, window: 900 },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Suspicious Browser)',
          success: false,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
      ]
    });

    console.log('✅ Created sample audit log entries');
  }

  // Create system configuration (production-safe)
  console.log('⚙️ Creating system configuration...');
  
  // These could be stored in a configuration table if needed
  // For now, we'll just log that the system is ready

  console.log('🎉 Database seeded successfully!');
  
  // Print summary
  const userCount = await prisma.user.count();
  const auditLogCount = await prisma.auditLog.count();
  
  console.log('\n📊 Seed Summary:');
  console.log(`   Users: ${userCount}`);
  console.log(`   Audit logs: ${auditLogCount}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🧪 Test Accounts Created:');
    console.log('   Admin: admin@purdue.edu');
    console.log('   Student: student@purdue.edu');
    console.log('   Faculty: faculty@purdue.edu');
    console.log('   Staff: staff@purdue.edu');
    console.log('\n   Note: These are for development only and use mock Azure AD provider IDs');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });