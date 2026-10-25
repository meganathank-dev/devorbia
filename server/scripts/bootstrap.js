import mongoose from 'mongoose';
import { connectDatabase, transaction } from '../src/config/database.js';
import { User } from '../src/models/index.js';
import { hashPassword } from '../src/utils/security.js';
import { email, password } from '../src/validators/index.js';
try {
  const adminEmail = email.parse(process.env.SUPER_ADMIN_EMAIL),
    adminPassword = password.parse(process.env.SUPER_ADMIN_PASSWORD);
  await connectDatabase();
  if (await User.exists({
    role: 'SUPER_ADMIN'
  })) console.log('A platform administrator already exists. Nothing was changed.');else {
    await transaction(async session => {
      await User.create([{
        name: process.env.SUPER_ADMIN_NAME || 'Platform Administrator',
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }], {
        session
      });
    });
    console.log('The platform administrator is ready. Sign in with your configured credentials.');
  }
} catch (error) {
  console.error(error.name === 'ZodError' ? 'Set SUPER_ADMIN_EMAIL and a password of at least 12 characters in .env.' : error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
