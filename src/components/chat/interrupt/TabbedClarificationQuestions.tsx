'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, ChevronLeft, ChevronRight, Check, Circle, AlertCircle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  ClarificationQuestionsData,
  ClarificationQuestion,
  ClarificationQuestionsResponse,
  QuestionOption,
} from '@/types/interrupt';
import {
  isTextQuestion,
  isSingleSelectQuestion,
  isMultiSelectQuestion,
  isSliderQuestion,
} from '@/types/interrupt';

// Special value to indicate custom "Other" option
const OTHER_OPTION_VALUE = '__other__';

interface TabbedClarificationQuestionsProps {
  data: ClarificationQuestionsData;
  onSubmit: (responses: ClarificationQuestionsResponse) => void;
  isSubmitting: boolean;
}

/**
 * Tabbed component for rendering clarification questions from a LangGraph interrupt
 * Shows one question at a time with step indicators and a final review step
 */
export function TabbedClarificationQuestions({
  data,
  onSubmit,
  isSubmitting,
}: TabbedClarificationQuestionsProps) {
  // Initialize with empty responses (no defaults)
  const [responses, setResponses] = useState<ClarificationQuestionsResponse>({});
  // Track custom "Other" text for each question
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const totalSteps = data.questions.length + 1; // +1 for review step
  const isReviewStep = currentStep === data.questions.length;
  const currentQuestion = isReviewStep ? null : data.questions[currentStep];

  // Check if "Other" option is selected for a question
  const isOtherSelected = useCallback((value: string | string[] | undefined): boolean => {
    if (Array.isArray(value)) {
      return value.includes(OTHER_OPTION_VALUE);
    }
    return value === OTHER_OPTION_VALUE;
  }, []);

  // Check if a question has been answered
  const isQuestionAnswered = useCallback((question: ClarificationQuestion): boolean => {
    const value = responses[question.id];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;

    // If "Other" is selected, check if custom text is provided
    // Only applies to string or string[] values (not numbers from slider)
    if (typeof value !== 'number' && isOtherSelected(value)) {
      const customText = customTexts[question.id];
      if (!customText || customText.trim() === '') return false;
    }

    return true;
  }, [responses, customTexts, isOtherSelected]);

  // Get list of unanswered questions
  const getUnansweredQuestions = useCallback((): ClarificationQuestion[] => {
    return data.questions.filter((q) => !isQuestionAnswered(q));
  }, [data.questions, isQuestionAnswered]);

  const handleTextChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSingleSelectChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    // Clear custom text if not selecting "Other"
    if (value !== OTHER_OPTION_VALUE) {
      setCustomTexts((prev) => {
        const newTexts = { ...prev };
        delete newTexts[questionId];
        return newTexts;
      });
    }
  }, []);

  const handleMultiSelectToggle = useCallback((questionId: string, value: string) => {
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const isSelected = current.includes(value);
      const updated = isSelected
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated };
    });
    // Clear custom text if deselecting "Other"
    if (value === OTHER_OPTION_VALUE) {
      const currentValues = (responses[questionId] as string[]) || [];
      if (currentValues.includes(OTHER_OPTION_VALUE)) {
        setCustomTexts((prev) => {
          const newTexts = { ...prev };
          delete newTexts[questionId];
          return newTexts;
        });
      }
    }
  }, [responses]);

  const handleCustomTextChange = useCallback((questionId: string, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [questionId]: text }));
  }, []);

  const handleSliderChange = useCallback((questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  // Prepare final responses with custom text substitution
  const prepareFinalResponses = useCallback((): ClarificationQuestionsResponse => {
    const finalResponses: ClarificationQuestionsResponse = {};

    for (const [questionId, value] of Object.entries(responses)) {
      if (Array.isArray(value)) {
        // Multi-select: replace OTHER_OPTION_VALUE with custom text
        const finalValues = value.map((v) =>
          v === OTHER_OPTION_VALUE ? (customTexts[questionId] || '') : v
        ).filter((v) => v !== '');
        finalResponses[questionId] = finalValues;
      } else if (value === OTHER_OPTION_VALUE) {
        // Single-select: use custom text
        finalResponses[questionId] = customTexts[questionId] || '';
      } else {
        finalResponses[questionId] = value;
      }
    }

    return finalResponses;
  }, [responses, customTexts]);

  const handleSubmitClick = useCallback(() => {
    const unanswered = getUnansweredQuestions();
    if (unanswered.length > 0) {
      setShowConfirmDialog(true);
    } else {
      onSubmit(prepareFinalResponses());
    }
  }, [getUnansweredQuestions, onSubmit, prepareFinalResponses]);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirmDialog(false);
    onSubmit(prepareFinalResponses());
  }, [onSubmit, prepareFinalResponses]);

  const getQuestionLabel = useCallback((question: ClarificationQuestion): string => {
    if (!isQuestionAnswered(question)) {
      return 'Nao respondido';
    }
    if (isSingleSelectQuestion(question) || isMultiSelectQuestion(question)) {
      const value = responses[question.id];
      if (Array.isArray(value)) {
        const labels = value.map((v) => {
          if (v === OTHER_OPTION_VALUE) {
            return customTexts[question.id] || 'Outro';
          }
          const opt = question.options.find((o) => o.value === v);
          return opt?.label || v;
        });
        return labels.join(', ');
      }
      if (value === OTHER_OPTION_VALUE) {
        return customTexts[question.id] || 'Outro';
      }
      const option = question.options.find((opt) => opt.value === value);
      return option?.label || 'Nao respondido';
    }
    if (isSliderQuestion(question)) {
      return String(responses[question.id]);
    }
    return String(responses[question.id]);
  }, [responses, customTexts, isQuestionAnswered]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isReview = index === totalSteps - 1;
          const isCurrent = index === currentStep;
          // Only mark as completed if the question was actually answered
          const isAnswered = !isReview && index < data.questions.length
            ? isQuestionAnswered(data.questions[index])
            : false;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleStepClick(index)}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all',
                'hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
                isCurrent && 'bg-primary text-primary-foreground',
                isAnswered && !isCurrent && 'bg-primary/20 text-primary',
                !isAnswered && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isAnswered ? (
                <Check className="h-3 w-3" />
              ) : (
                <Circle className={cn('h-3 w-3', isCurrent && 'fill-current')} />
              )}
              <span className="hidden sm:inline">
                {isReview ? 'Revisar' : `${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Context (only shown on first step) */}
      {currentStep === 0 && data.context && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mb-4"
        >
          {data.context}
        </motion.p>
      )}

      {/* Question/Review Content */}
      <div className="relative min-h-[120px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
          >
            {isReviewStep ? (
              <ReviewStep
                questions={data.questions}
                getQuestionLabel={getQuestionLabel}
                isQuestionAnswered={isQuestionAnswered}
                onEditStep={handleStepClick}
                disabled={isSubmitting}
              />
            ) : currentQuestion && (
              <QuestionStep
                question={currentQuestion}
                value={responses[currentQuestion.id]}
                customText={customTexts[currentQuestion.id] || ''}
                onTextChange={handleTextChange}
                onSingleSelectChange={handleSingleSelectChange}
                onMultiSelectToggle={handleMultiSelectToggle}
                onCustomTextChange={handleCustomTextChange}
                onSliderChange={handleSliderChange}
                disabled={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Existem perguntas nao respondidas
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tem certeza que deseja enviar as respostas mesmo com campos vazios?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    Voltar e responder
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleConfirmSubmit}
                  >
                    Enviar mesmo assim
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>

        {isReviewStep ? (
          <Button
            onClick={handleSubmitClick}
            disabled={isSubmitting || showConfirmDialog}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Respostas
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="gap-1"
          >
            Proximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface QuestionStepProps {
  question: ClarificationQuestion;
  value: string | number | string[] | undefined;
  customText: string;
  onTextChange: (id: string, value: string) => void;
  onSingleSelectChange: (id: string, value: string) => void;
  onMultiSelectToggle: (id: string, value: string) => void;
  onCustomTextChange: (id: string, text: string) => void;
  onSliderChange: (id: string, value: number) => void;
  disabled: boolean;
}

function QuestionStep({
  question,
  value,
  customText,
  onTextChange,
  onSingleSelectChange,
  onMultiSelectToggle,
  onCustomTextChange,
  onSliderChange,
  disabled,
}: QuestionStepProps) {
  const isOtherSelectedSingle = value === OTHER_OPTION_VALUE;
  const isOtherSelectedMulti = Array.isArray(value) && value.includes(OTHER_OPTION_VALUE);
  const showCustomInput = isOtherSelectedSingle || isOtherSelectedMulti;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-foreground">
        {question.question}
      </h3>

      <div>
        {isTextQuestion(question) && (
          <Input
            type="text"
            placeholder={question.placeholder || 'Digite sua resposta...'}
            value={(value as string) || ''}
            onChange={(e) => onTextChange(question.id, e.target.value)}
            disabled={disabled}
            className="bg-background"
            autoFocus
          />
        )}

        {isSingleSelectQuestion(question) && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <RadioOption
                key={option.value}
                option={option}
                isSelected={(value as string) === option.value}
                onClick={() => onSingleSelectChange(question.id, option.value)}
                disabled={disabled}
              />
            ))}
            {/* Other option */}
            <OtherRadioOption
              isSelected={isOtherSelectedSingle}
              onClick={() => onSingleSelectChange(question.id, OTHER_OPTION_VALUE)}
              disabled={disabled}
            />
          </div>
        )}

        {isMultiSelectQuestion(question) && (
          <div className="space-y-2">
            {question.options.map((option) => {
              const selectedValues = (value as string[]) || [];
              return (
                <CheckboxOption
                  key={option.value}
                  option={option}
                  isSelected={selectedValues.includes(option.value)}
                  onClick={() => onMultiSelectToggle(question.id, option.value)}
                  disabled={disabled}
                />
              );
            })}
            {/* Other option */}
            <OtherCheckboxOption
              isSelected={isOtherSelectedMulti}
              onClick={() => onMultiSelectToggle(question.id, OTHER_OPTION_VALUE)}
              disabled={disabled}
            />
          </div>
        )}

        {isSliderQuestion(question) && (
          <SliderField
            question={question}
            value={value as number | undefined}
            onChange={(val) => onSliderChange(question.id, val)}
            disabled={disabled}
          />
        )}

        {/* Custom text input for "Other" option */}
        <AnimatePresence>
          {showCustomInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pl-7">
                <OtherTextInput
                  value={customText}
                  onChange={(text) => onCustomTextChange(question.id, text)}
                  disabled={disabled}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface OtherTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

function OtherTextInput({ value, onChange, disabled }: OtherTextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when it appears
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder="Digite sua resposta personalizada..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-background"
    />
  );
}

interface ReviewStepProps {
  questions: ClarificationQuestion[];
  getQuestionLabel: (question: ClarificationQuestion) => string;
  isQuestionAnswered: (question: ClarificationQuestion) => boolean;
  onEditStep: (step: number) => void;
  disabled: boolean;
}

function ReviewStep({
  questions,
  getQuestionLabel,
  isQuestionAnswered,
  onEditStep,
  disabled,
}: ReviewStepProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium text-foreground mb-4">
        Revise suas respostas
      </h3>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {questions.map((question, index) => {
          const answered = isQuestionAnswered(question);
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onEditStep(index)}
              disabled={disabled}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg text-left',
                'bg-muted/50 hover:bg-muted transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                !answered && 'border border-destructive/30'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {question.question}
                </p>
                <p className={cn(
                  'text-sm font-medium mt-1',
                  answered ? 'text-foreground' : 'text-destructive'
                )}>
                  {getQuestionLabel(question)}
                </p>
              </div>
              {!answered && (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface RadioOptionProps {
  option: QuestionOption;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function RadioOption({
  option,
  isSelected,
  onClick,
  disabled,
}: RadioOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-transparent'
      )}
    >
      <div className={cn(
        'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
      )}>
        {isSelected && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{option.label}</span>
        {option.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
        )}
      </div>
    </button>
  );
}

interface OtherRadioOptionProps {
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function OtherRadioOption({
  isSelected,
  onClick,
  disabled,
}: OtherRadioOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-transparent border-dashed'
      )}
    >
      <div className={cn(
        'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
      )}>
        {isSelected && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </div>
      <div className="flex-1 flex items-center gap-2">
        <PenLine className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Outro</span>
        <span className="text-xs text-muted-foreground">(resposta personalizada)</span>
      </div>
    </button>
  );
}

interface CheckboxOptionProps {
  option: QuestionOption;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function CheckboxOption({
  option,
  isSelected,
  onClick,
  disabled,
}: CheckboxOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-transparent'
      )}
    >
      <div className={cn(
        'mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
      )}>
        {isSelected && (
          <Check className="h-3 w-3 text-primary-foreground" />
        )}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{option.label}</span>
        {option.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
        )}
      </div>
    </button>
  );
}

interface OtherCheckboxOptionProps {
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function OtherCheckboxOption({
  isSelected,
  onClick,
  disabled,
}: OtherCheckboxOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
        isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-transparent border-dashed'
      )}
    >
      <div className={cn(
        'mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
      )}>
        {isSelected && (
          <Check className="h-3 w-3 text-primary-foreground" />
        )}
      </div>
      <div className="flex-1 flex items-center gap-2">
        <PenLine className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Outro</span>
        <span className="text-xs text-muted-foreground">(resposta personalizada)</span>
      </div>
    </button>
  );
}

interface SliderFieldProps {
  question: {
    id: string;
    min_value: number;
    max_value: number;
    default_value?: string;
  };
  value: number | undefined;
  onChange: (value: number) => void;
  disabled: boolean;
}

function SliderField({ question, value, onChange, disabled }: SliderFieldProps) {
  // Don't auto-select a value - wait for user interaction
  const currentValue = value ?? question.min_value;
  const hasValue = value !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{question.min_value}</span>
        <input
          type="range"
          min={question.min_value}
          max={question.max_value}
          value={currentValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className={cn(
            'flex-1 h-2 rounded-full appearance-none cursor-pointer',
            'bg-secondary',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:h-5',
            '[&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:h-5',
            '[&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-primary',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        <span className="text-sm text-muted-foreground">{question.max_value}</span>
      </div>
      <div className="flex justify-center">
        <span
          className={cn(
            'min-w-[4rem] text-center text-lg font-semibold tabular-nums',
            'rounded-md px-3 py-1',
            hasValue ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {hasValue ? currentValue : '-'}
        </span>
      </div>
    </div>
  );
}
