/**
 * One-time development migration script.
 *
 * Purpose:
 * Associate the existing admin@flowforge.local user with the
 * FlowForge Test Organization (domain: flowforge.local) if the
 * user's organizationId is currently null.
 *
 * Safety:
 * - Does NOT create duplicate organizations.
 * - Does NOT create duplicate admin users.
 * - Does NOT overwrite a conflicting organizationId.
 * - Does NOT delete any data.
 *
 * Usage:
 *   node src/scripts/fix-admin-org.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models to ensure they are registered
import Organization from '../models/organization.model.js';
import User from '../models/user.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowforge-ai';
const ORG_DOMAIN = 'flowforge.local';
const ADMIN_EMAIL = 'admin@flowforge.local';

const run = async () => {
  console.log('──────────────────────────────────────────────');
  console.log('FlowForge AI — Admin Organization Fix Script');
  console.log('──────────────────────────────────────────────');
  console.log(`MongoDB URI: ${MONGODB_URI}`);
  console.log();

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find the organization
    const org = await Organization.findOne({ domain: ORG_DOMAIN }).exec();
    if (!org) {
      console.error(`❌ Organization with domain "${ORG_DOMAIN}" not found.`);
      console.error('   Please create the organization first via Super Admin.');
      process.exit(1);
    }
    console.log(`✅ Found organization: "${org.name}" (${org._id})`);

    // 2. Find the admin user
    const admin = await User.findOne({ email: ADMIN_EMAIL }).exec();
    if (!admin) {
      console.error(`❌ Admin user with email "${ADMIN_EMAIL}" not found.`);
      console.error('   Please create the admin user first.');
      process.exit(1);
    }
    console.log(`✅ Found admin user: ${admin.email} (${admin._id})`);
    console.log(`   Current organizationId: ${admin.organizationId || 'null'}`);

    // 3. Check current state
    if (admin.organizationId && admin.organizationId.toString() === org._id.toString()) {
      console.log();
      console.log('✅ Admin user already has the correct organizationId.');
      console.log('   No changes needed.');
      process.exit(0);
    }

    if (admin.organizationId && admin.organizationId.toString() !== org._id.toString()) {
      console.error();
      console.error('⚠️  CONFLICT: Admin user has a different organizationId!');
      console.error(`   Current: ${admin.organizationId}`);
      console.error(`   Expected: ${org._id}`);
      console.error('   This requires manual review. Script will NOT overwrite.');
      process.exit(1);
    }

    // 4. Fix: Set organizationId
    admin.organizationId = org._id;
    await admin.save();

    console.log();
    console.log('✅ Updated admin user organizationId successfully.');
    console.log(`   organizationId: ${admin.organizationId}`);

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log();
    console.log('Disconnected from MongoDB.');
  }
};

run();
