/**
 * State Machines
 */

import type { TodoState } from './types';

/**
 * Allowed state transitions.
 * - TODO → ONGOING
 * - ONGOING → TODO | DONE
 * - DONE → ONGOING
 */
export const ALLOWED_NEXT_STATES: Record<TodoState, readonly TodoState[]> = {
  TODO: ['ONGOING'],
  ONGOING: ['TODO', 'DONE'],
  DONE: ['ONGOING'],
} as const;

/**
 * Checks if a state transition is valid.
 */
export function isValidTransition(from: TodoState, to: TodoState): boolean {
  return ALLOWED_NEXT_STATES[from].includes(to);
}

/**
 * Gets the allowed next states for a given state.
 */
export function getAllowedNextStates(state: TodoState): readonly TodoState[] {
  return ALLOWED_NEXT_STATES[state];
}
