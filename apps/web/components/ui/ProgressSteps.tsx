import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowSkip?: boolean;
}

export function ProgressSteps({
  steps,
  currentStep,
  onStepClick,
  allowSkip = false
}: ProgressStepsProps) {
  const handleStepClick = (stepId: number) => {
    if (allowSkip || stepId <= currentStep) {
      onStepClick?.(stepId);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = allowSkip || step.id <= currentStep;

          return (
            <div
              key={step.id}
              className="flex items-center flex-1 last:flex-initial"
            >
              <div className="flex flex-col items-center">
                <motion.button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all relative',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-100',
                    !isCompleted && !isCurrent && 'bg-gray-200 text-gray-600',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <span>{step.id}</span>
                  )}

                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-blue-600"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                    />
                  )}
                </motion.button>

                <div className="mt-2 text-center">
                  <p
                    className={clsx(
                      'text-sm font-medium',
                      isCurrent && 'text-blue-600',
                      isCompleted && 'text-green-600',
                      !isCurrent && !isCompleted && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-1 max-w-[100px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-4 mb-8 relative overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-600"
                    initial={{ width: 0 }}
                    animate={{
                      width: step.id < currentStep ? '100%' : '0%'
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
