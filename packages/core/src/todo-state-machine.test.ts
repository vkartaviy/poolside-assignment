/**
 * Tests for the TODO state machine.
 *
 * These tests use HARDCODED expectations intentionally.
 * They validate that ALLOWED_NEXT_STATES matches our requirements.
 * If these fail, someone changed the config - verify it was intentional.
 *
 * Integration tests (in todos.test.ts) use config-driven tests to verify
 * that the API correctly enforces whatever the config says.
 */

import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedNextStates } from '@poolside/core';

describe('Todo State Machine', () => {
  describe('isValidTransition', () => {
    it('allows TODO -> ONGOING', () => {
      expect(isValidTransition('TODO', 'ONGOING')).toBe(true);
    });

    it('allows ONGOING -> DONE', () => {
      expect(isValidTransition('ONGOING', 'DONE')).toBe(true);
    });

    it('allows ONGOING -> TODO', () => {
      expect(isValidTransition('ONGOING', 'TODO')).toBe(true);
    });

    it('allows DONE -> ONGOING', () => {
      expect(isValidTransition('DONE', 'ONGOING')).toBe(true);
    });

    it('rejects TODO -> DONE (skipping ONGOING)', () => {
      expect(isValidTransition('TODO', 'DONE')).toBe(false);
    });

    it('rejects DONE -> TODO (skipping ONGOING)', () => {
      expect(isValidTransition('DONE', 'TODO')).toBe(false);
    });

    it('rejects same state transitions', () => {
      expect(isValidTransition('TODO', 'TODO')).toBe(false);
      expect(isValidTransition('ONGOING', 'ONGOING')).toBe(false);
      expect(isValidTransition('DONE', 'DONE')).toBe(false);
    });
  });

  describe('getAllowedNextStates', () => {
    it('returns ONGOING for TODO state', () => {
      expect(getAllowedNextStates('TODO')).toEqual(['ONGOING']);
    });

    it('returns TODO and DONE for ONGOING state', () => {
      expect(getAllowedNextStates('ONGOING')).toEqual(['TODO', 'DONE']);
    });

    it('returns ONGOING for DONE state', () => {
      expect(getAllowedNextStates('DONE')).toEqual(['ONGOING']);
    });
  });
});
