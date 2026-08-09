import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Employee Profile model.
 *
 * Stores business and profile details for an employee.
 * Strictly tied to a User and an Organization.
 */
const employeeProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: null,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying employees within an organization
employeeProfileSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });

const EmployeeProfile = model('EmployeeProfile', employeeProfileSchema);

export default EmployeeProfile;
