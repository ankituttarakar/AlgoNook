export const CONTAINS_DUPLICATE_PROBLEM: Readonly<{
  id: 'contains-duplicate';
  functionName: 'containsDuplicate';
  testCases: ReadonlyArray<Readonly<{
    id: string;
    nums: readonly number[];
    expected: boolean;
  }>>;
}>;

export function getCodeProblemById(id: string): typeof CONTAINS_DUPLICATE_PROBLEM | null;
