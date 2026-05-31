import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExecutionFeedback } from '../../orchestration/feedback.js';

test('buildExecutionFeedback classifies runtime mismatches as retriable runtime failures', () => {
  const feedback = buildExecutionFeedback(
    'pip install -r requirements.txt',
    'ERROR: Package requires a different Python. Requires-Python <3.14,>=3.9',
    1
  );

  assert.equal(feedback.failureKind, 'runtime');
  assert.equal(feedback.retriable, true);
  assert.match(feedback.suggestion, /Runtime version mismatch detected/);
});
