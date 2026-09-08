const mongoose = require('mongoose');
const OrganizationRepository = require('../repositories/organization.repository');
const MembershipRepository = require('../repositories/membership.repository');
const UserRepository = require('../repositories/user.repository');
const { ORG_ROLES, ACCOUNT_STATUS } = require('../utils/constants');

class OrganizationService {
  /**
   * Safely bootstrap the very first organization and owner.
   * This should only be used when no organizations exist.
   */
  static async bootstrap(orgName, orgSlug, ownerEmail, passwordHash) {
    // Idempotency check: refuse to run if system is already bootstrapped
    const orgCount = await OrganizationRepository.count();
    if (orgCount > 0) {
      throw new Error('System already bootstrapped: organizations exist.');
    }

    // Try transaction first
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Create the Owner user
      const user = await UserRepository.create({
        email: ownerEmail,
        passwordHash,
        status: ACCOUNT_STATUS.ACTIVE,
      }, { session });

      // 2. Create the Organization
      const organization = await OrganizationRepository.create({
        name: orgName,
        slug: orgSlug,
        createdBy: user._id,
      }, { session });

      // 3. Create the Owner Membership
      await MembershipRepository.create({
        userId: user._id,
        organizationId: organization._id,
        role: ORG_ROLES.OWNER,
      }, { session });

      await session.commitTransaction();
      return { user, organization };
    } catch (error) {
      await session.abortTransaction();
      
      // If error is about transactions not being supported (e.g. standalone local mongo)
      if (error.message.includes('Transaction') || error.message.includes('replica set') || error.name === 'MongoServerError') {
        console.warn('Transactions not supported. Falling back to sequential creation with manual rollback.');
        return this._bootstrapSequential(orgName, orgSlug, ownerEmail, passwordHash);
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Fallback for environments without replica sets (e.g. some local setups/tests).
   * Note: This does not guarantee perfect atomicity.
   */
  static async _bootstrapSequential(orgName, orgSlug, ownerEmail, passwordHash) {
    // 1. Create the Owner user
    const user = await UserRepository.create({
      email: ownerEmail,
      passwordHash,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    // 2. Create the Organization
    let organization;
    try {
      organization = await OrganizationRepository.create({
        name: orgName,
        slug: orgSlug,
        createdBy: user._id,
      });
    } catch (err) {
      // Cleanup user if org creation fails
      await UserRepository.update(user._id, { status: ACCOUNT_STATUS.INACTIVE });
      throw err;
    }

    // 3. Create the Owner Membership
    try {
      await MembershipRepository.create({
        userId: user._id,
        organizationId: organization._id,
        role: ORG_ROLES.OWNER,
      });
    } catch (err) {
      // Cleanup on failure (best-effort rollback without transactions)
      await UserRepository.update(user._id, { status: ACCOUNT_STATUS.INACTIVE });
      throw err;
    }

    return { user, organization };
  }

  /**
   * Verify if a user belongs to an organization.
   */
  static async getActiveMembership(userId, organizationId) {
    return MembershipRepository.findActiveMembership(userId, organizationId);
  }
}

module.exports = OrganizationService;
