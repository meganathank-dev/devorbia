import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Eye, EyeOff } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format')
      .trim()
      .toLowerCase()
      .max(255, 'Email must be at most 255 characters'),
    otp: z
      .string({ required_error: 'OTP is required' })
      .regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
    newPassword: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmNewPassword: z
      .string({ required_error: 'Password confirmation is required' })
      .min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSuccessMessage('');
    try {
      await authService.resetPassword(data);
      setSuccessMessage('Password reset successfully. You can now sign in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setServerError(
        error.response?.data?.message || 'Failed to reset password. Please verify your OTP and try again.'
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the OTP sent to your email and choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {successMessage ? (
          <div className="p-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 rounded-md border border-green-200 text-center">
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="6-Digit OTP"
              type="text"
              placeholder="123456"
              maxLength={6}
              {...register('otp')}
              error={errors.otp?.message}
            />

            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('newPassword')}
                error={errors.newPassword?.message}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmNewPassword')}
                error={errors.confirmNewPassword?.message}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {serverError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full mt-6" isLoading={isSubmitting}>
              Reset Password
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center border-t border-gray-200 dark:border-gray-800 pt-6">
        <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
          Return to sign in
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ResetPasswordPage;
