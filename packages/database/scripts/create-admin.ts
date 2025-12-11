import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@truck4u.tn' }
    });

    if (existingAdmin) {
      console.log('✅ Admin already exists:', existingAdmin.email);
      return;
    }

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@truck4u.tn',
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Admin created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Login: admin@truck4u.tn / admin123 (mock login)');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
