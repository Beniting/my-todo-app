import { CreateTaskInput, Priority, UpdateTaskInput } from './task.types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateTaskInput(input: CreateTaskInput | UpdateTaskInput): ValidationResult {
  const errors: Record<string, string> = {};

  if ('title' in input) {
    if (!input.title || input.title.trim().length === 0) {
      errors.title = 'Task title cannot be empty.';
    } else if (input.title.trim().length > 150) {
      errors.title = 'Task title is too long (max 150 characters).';
    }
  }

  if (input.description && input.description.length > 2000) {
    errors.description = 'Description is too long (max 2000 characters).';
  }

  if (input.priority) {
    const validPriorities: Priority[] = ['low', 'medium', 'high'];
    if (!validPriorities.includes(input.priority)) {
      errors.priority = 'Priority must be low, medium, or high.';
    }
  }

  if (input.due_at) {
    const dueDate = new Date(input.due_at);
    if (isNaN(dueDate.getTime())) {
      errors.due_at = 'Invalid due date format.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
