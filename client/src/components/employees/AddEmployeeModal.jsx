import { useState } from 'react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { ROLES } from '../../constants/roles.js';

export const AddEmployeeModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    title: '',
    skills: '',
    role: ROLES.EMPLOYEE,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        title: formData.title.trim() || undefined,
        skills: formData.skills
          ? formData.skills
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean)
          : [],
        role: formData.role,
      };

      const success = await onCreate(payload);

      if (!success) {
        throw new Error('Failed to create employee');
      }

      setFormData({
        employeeId: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        title: '',
        skills: '',
        role: ROLES.EMPLOYEE,
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-surface-900 shadow-xl rounded-xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Add Employee
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create a new employee account within your organization.
          </p>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee ID
              </label>

              <Input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="EMP001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>

              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="employee@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temporary Password
              </label>

              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter a strong password"
                minLength={8}
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Must satisfy the organization's password strength requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>

                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>

                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>

              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Frontend Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Skills
              </label>

              <Input
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="React, JavaScript, Node.js"
              />

              <p className="mt-1 text-xs text-gray-500">
                Separate multiple skills with commas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-surface-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value={ROLES.EMPLOYEE}>
                  Employee
                </option>

                <option value={ROLES.TEAM_LEADER}>
                  Team Leader
                </option>

                <option value={ROLES.PROJECT_MANAGER}>
                  Project Manager
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
};