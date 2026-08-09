import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth.service.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CheckCircle2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .trim()
    .toLowerCase()
    .max(255, 'Email must be at most 255 characters'),
});

const ForgotPasswordPage = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await authService.forgotPassword(data);
      // We always show success to prevent email enumeration,
      // though the backend should handle this already.
      setIsSuccess(true);
    } catch (error) {
      setServerError(
        error.response?.data?.message || 'Failed to process request. Please try again.'
      );
    }
  };

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Check your email</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            If an account exists with that email address, we've sent password reset instructions.
          </p>
          <Link
            to="/reset-password"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors mb-3"
          >
            Enter OTP Code
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Return to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a recovery OTP.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@company.com"
            {...register('email')}
            error={errors.email?.message}
          />

          {serverError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 rounded-md border border-red-200">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
            Send reset instructions
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-gray-200 dark:border-gray-800 pt-6">
        <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
          Wait, I remember my password
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ForgotPasswordPage;
