'use client';

import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
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
import { getDefaultResponses } from '@/lib/hooks/useInterrupt';

interface ClarificationQuestionsProps {
  data: ClarificationQuestionsData;
  onSubmit: (responses: ClarificationQuestionsResponse) => void;
  isSubmitting: boolean;
}

/**
 * Component for rendering clarification questions from a LangGraph interrupt
 * Supports text, single select, multi select, and slider question types
 */
export function ClarificationQuestions({
  data,
  onSubmit,
  isSubmitting,
}: ClarificationQuestionsProps) {
  const [responses, setResponses] = useState<ClarificationQuestionsResponse>(() =>
    getDefaultResponses(data)
  );

  const handleTextChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSingleSelectChange = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
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
  }, []);

  const handleSliderChange = useCallback((questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(responses);
  }, [onSubmit, responses]);

  return (
    <Card className="mx-auto max-w-2xl border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm">
            ?
          </span>
          Preciso de mais informacoes
        </CardTitle>
        {data.context && (
          <p className="text-sm text-muted-foreground mt-2">{data.context}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {data.questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={responses[question.id]}
            onTextChange={handleTextChange}
            onSingleSelectChange={handleSingleSelectChange}
            onMultiSelectToggle={handleMultiSelectToggle}
            onSliderChange={handleSliderChange}
            disabled={isSubmitting}
          />
        ))}
      </CardContent>

      <CardFooter className="justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
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
      </CardFooter>
    </Card>
  );
}

interface QuestionFieldProps {
  question: ClarificationQuestion;
  value: string | number | string[] | undefined;
  onTextChange: (id: string, value: string) => void;
  onSingleSelectChange: (id: string, value: string) => void;
  onMultiSelectToggle: (id: string, value: string) => void;
  onSliderChange: (id: string, value: number) => void;
  disabled: boolean;
}

function QuestionField({
  question,
  value,
  onTextChange,
  onSingleSelectChange,
  onMultiSelectToggle,
  onSliderChange,
  disabled,
}: QuestionFieldProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        {question.question}
      </label>

      {isTextQuestion(question) && (
        <Input
          type="text"
          placeholder={question.placeholder || ''}
          value={(value as string) || ''}
          onChange={(e) => onTextChange(question.id, e.target.value)}
          disabled={disabled}
          className="bg-background"
        />
      )}

      {isSingleSelectQuestion(question) && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <OptionButton
              key={option.value}
              option={option}
              isSelected={(value as string) === option.value}
              onClick={() => onSingleSelectChange(question.id, option.value)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {isMultiSelectQuestion(question) && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => {
            const selectedValues = (value as string[]) || [];
            return (
              <OptionButton
                key={option.value}
                option={option}
                isSelected={selectedValues.includes(option.value)}
                onClick={() => onMultiSelectToggle(question.id, option.value)}
                disabled={disabled}
                isMulti
              />
            );
          })}
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
    </div>
  );
}

interface OptionButtonProps {
  option: QuestionOption;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
  isMulti?: boolean;
}

function OptionButton({
  option,
  isSelected,
  onClick,
  disabled,
  isMulti,
}: OptionButtonProps) {
  return (
    <Button
      type="button"
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-col h-auto py-2 px-3 gap-0.5',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        isMulti && isSelected && 'bg-primary/90'
      )}
    >
      <span className="text-sm font-medium">{option.label}</span>
      {option.description && (
        <span
          className={cn(
            'text-xs',
            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {option.description}
        </span>
      )}
    </Button>
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
  const currentValue =
    value ?? (question.default_value ? parseInt(question.default_value, 10) : question.min_value);

  return (
    <div className="flex items-center gap-4">
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
      <span
        className={cn(
          'min-w-[3rem] text-center text-lg font-semibold tabular-nums',
          'bg-primary/10 text-primary rounded-md px-2 py-1'
        )}
      >
        {currentValue}
      </span>
    </div>
  );
}
