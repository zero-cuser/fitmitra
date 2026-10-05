/**
 * FitMitra Platform-Neutral Exam Mode Rules & Session Generator
 */

export {
  getExamModeConstraints,
  createExamSession
} from '../../services/examModeEngine.ts';

export type {
  ExamModeType,
  ExamActivityCategory,
  ExamActivityItem,
  ExamSessionConfig
} from '../../types/fitness.ts';
