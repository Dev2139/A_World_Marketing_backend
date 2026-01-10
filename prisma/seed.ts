import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Seeding database...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@me.com' },
    });

    if (existingAdmin) {
      console.log('Default admin user already exists, skipping creation.');
      return;
    }

    // Create default admin user with hashed password
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await prisma.user.create({
      data: {
        email: 'admin@me.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('Default admin user created successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();