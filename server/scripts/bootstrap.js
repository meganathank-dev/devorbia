require('dotenv').config();
const mongoose = require('mongoose');
const { hashPassword } = require('../src/utils/password.util');
const OrganizationService = require('../src/services/organization.service');

const runBootstrap = async () => {
  try {
    console.log('Starting system bootstrap...');

    // Read environment variables
    const secret = process.env.BOOTSTRAP_SECRET;
    const orgName = process.env.BOOTSTRAP_ORG_NAME;
    const orgSlug = process.env.BOOTSTRAP_ORG_SLUG;
    const ownerEmail = process.env.BOOTSTRAP_OWNER_EMAIL;
    const ownerPassword = process.env.BOOTSTRAP_OWNER_PASSWORD;
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devorbia';

    if (!secret || !orgName || !orgSlug || !ownerEmail || !ownerPassword) {
      console.error('ERROR: Missing required bootstrap configuration.');
      console.error('Ensure BOOTSTRAP_SECRET, BOOTSTRAP_ORG_NAME, BOOTSTRAP_ORG_SLUG, BOOTSTRAP_OWNER_EMAIL, and BOOTSTRAP_OWNER_PASSWORD are set in the environment.');
      process.exit(1);
    }

    // A secondary check: require the secret to be passed as an argument to confirm execution
    const providedSecret = process.argv[2];
    if (providedSecret !== secret) {
      console.error('ERROR: Invalid or missing bootstrap secret.');
      console.error('Usage: npm run bootstrap <BOOTSTRAP_SECRET>');
      process.exit(1);
    }

    // Connect to Database
    await mongoose.connect(mongoUri);
    console.log('Connected to database.');

    // Hash the password
    const passwordHash = await hashPassword(ownerPassword);

    // Bootstrap
    const { user, organization } = await OrganizationService.bootstrap(
      orgName,
      orgSlug,
      ownerEmail,
      passwordHash
    );

    console.log('=============================================');
    console.log('SYSTEM BOOTSTRAP SUCCESSFUL');
    console.log('=============================================');
    console.log(`Organization: ${organization.name} (${organization.slug})`);
    console.log(`Owner Account: ${user.email}`);
    console.log('=============================================');
    console.log('IMPORTANT: Please clear BOOTSTRAP_OWNER_PASSWORD from your environment file.');

    process.exit(0);
  } catch (error) {
    console.error('BOOTSTRAP FAILED:', error.message);
    process.exit(1);
  }
};

runBootstrap();
