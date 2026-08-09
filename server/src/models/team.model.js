import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Team model.
 *
 * Represents a team within a department of an organization.
 * Each team belongs to exactly one department and one organization.
 */
const teamSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// No duplicate team names within the same department
teamSchema.index({ departmentId: 1, name: 1 }, { unique: true });

const Team = model('Team', teamSchema);

export default Team;
