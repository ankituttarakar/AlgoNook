import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { CONTAINS_DUPLICATE_PROBLEM } from '../api/code/problems/containsDuplicate.mjs';
import { FREQUENCY_MAP_PROBLEM } from '../api/code/problems/frequencyMap.mjs';
import { TWO_SUM_SORTED_PROBLEM } from '../api/code/problems/twoSumSorted.mjs';
import { executePythonSandbox } from '../api/code/pythonRunner.mjs';

const image = 'algonook-python-runner:3.12.11';
const dockerInfo = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', windowsHide: true });
if (dockerInfo.error || dockerInfo.status !== 0) {
  console.error('Docker daemon unavailable. Start Docker Desktop with the Linux container engine.');
  process.exit(2);
}
const imageInfo = spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8', windowsHide: true });
if (imageInfo.error || imageInfo.status !== 0) {
  console.error(`Runner image ${image} is not built. Run: npm run sandbox:build`);
  process.exit(2);
}

async function run(name, sourceCode, problem = CONTAINS_DUPLICATE_PROBLEM) {
  const result = await executePythonSandbox({
    sourceCode,
    problemId: problem.id,
    testCases: problem.testCases,
  });
  console.log(`${name}: ${result.status} (${result.summary.passed}/${result.summary.total})${result.error?.message ? ` · ${result.error.message}` : ''}`);
  return result;
}

const correct = await run(
  'Correct implementation',
  'def containsDuplicate(nums):\n    return len(nums) != len(set(nums))',
);
assert.equal(correct.status, 'PASSED');
assert.equal(correct.summary.passed, CONTAINS_DUPLICATE_PROBLEM.testCases.length);
assert.equal(correct.summary.total, CONTAINS_DUPLICATE_PROBLEM.testCases.length);
assert.equal(correct.tests.length, CONTAINS_DUPLICATE_PROBLEM.testCases.length);
assert.ok(correct.tests.every((test) => test.status === 'PASSED'));
console.log('PASS multiple trusted cases evaluated');

const incorrect = await run(
  'Incorrect implementation',
  'def containsDuplicate(nums):\n    return True',
);
assert.equal(incorrect.status, 'WRONG_ANSWER');
assert.ok(incorrect.summary.passed < incorrect.summary.total);
console.log('PASS incorrect implementation rejected');

const attemptsToReplaceTests = await run(
  'Learner globals cannot replace trusted tests',
  'def containsDuplicate(nums):\n    global testCases, expected\n    testCases = []\n    expected = True\n    return True',
);
assert.equal(attemptsToReplaceTests.summary.total, CONTAINS_DUPLICATE_PROBLEM.testCases.length);
assert.equal(attemptsToReplaceTests.status, 'WRONG_ANSWER');
console.log('PASS learner-defined test/expected names do not change the trusted contract');

const syntaxError = await run(
  'Syntactically invalid implementation',
  'def containsDuplicate(nums)\n    return True',
);
assert.equal(syntaxError.status, 'COMPILE_ERROR');
assert.equal(syntaxError.summary.total, CONTAINS_DUPLICATE_PROBLEM.testCases.length);
assert.ok(syntaxError.error?.message);
console.log('PASS syntax error returned as a structured compile error');

const frequencyCorrect = await run(
  'Correct frequency-map implementation',
  'def countFrequencies(values):\n    counts = {}\n    for value in values:\n        counts[value] = counts.get(value, 0) + 1\n    return counts',
  FREQUENCY_MAP_PROBLEM,
);
assert.equal(frequencyCorrect.status, 'PASSED');
assert.equal(frequencyCorrect.summary.passed, FREQUENCY_MAP_PROBLEM.testCases.length);
assert.ok(frequencyCorrect.tests.every((test) => test.status === 'PASSED'));
console.log('PASS frequency map against trusted hidden cases');

const frequencyIncorrect = await run(
  'Incorrect frequency-map implementation',
  'def countFrequencies(values):\n    return {}',
  FREQUENCY_MAP_PROBLEM,
);
assert.equal(frequencyIncorrect.status, 'WRONG_ANSWER');
assert.ok(frequencyIncorrect.summary.passed < frequencyIncorrect.summary.total);
console.log('PASS incorrect frequency map rejected');

const twoSumCorrect = await run(
  'Correct sorted two-sum implementation',
  'def twoSumSorted(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        total = nums[left] + nums[right]\n        if total == target:\n            return [left, right]\n        if total < target:\n            left += 1\n        else:\n            right -= 1\n    return []',
  TWO_SUM_SORTED_PROBLEM,
);
assert.equal(twoSumCorrect.status, 'PASSED');
assert.equal(twoSumCorrect.summary.passed, TWO_SUM_SORTED_PROBLEM.testCases.length);
assert.ok(twoSumCorrect.tests.every((test) => test.status === 'PASSED'));
console.log('PASS sorted two-sum against trusted hidden cases');

const twoSumIncorrect = await run(
  'Incorrect sorted two-sum implementation',
  'def twoSumSorted(nums, target):\n    return []',
  TWO_SUM_SORTED_PROBLEM,
);
assert.equal(twoSumIncorrect.status, 'WRONG_ANSWER');
assert.ok(twoSumIncorrect.summary.passed < twoSumIncorrect.summary.total);
console.log('PASS incorrect sorted two-sum rejected');
