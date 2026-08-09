import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Department model.
 *
 * Represents an organizational department within a tenant.
 * Each department belongs to exactly one organization.
 */
const departmentSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// No duplicate department names within the same organization
departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const Department = model('Department', departmentSchema);

export default Department;
