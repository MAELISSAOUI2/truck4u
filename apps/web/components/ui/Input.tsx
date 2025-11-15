import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      success,
      icon,
      hint,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}

          <motion.input
            ref={ref}
            initial={false}
            animate={{
              borderColor: hasError ? '#ef4444' : hasSuccess ? '#10b981' : '#e5e7eb'
            }}
            className={clsx(
              'w-full px-4 py-3 border-2 rounded-xl transition-all',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-400',
              icon && 'pl-10',
              (hasError || hasSuccess) && 'pr-10',
              hasError && 'border-red-500 focus:ring-red-500',
              hasSuccess && 'border-green-500 focus:ring-green-500',
              disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
              className
            )}
            disabled={disabled}
            {...props}
          />

          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          )}

          {hasSuccess && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>

        {hint && !error && (
          <p className="mt-2 text-sm text-gray-500">{hint}</p>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
