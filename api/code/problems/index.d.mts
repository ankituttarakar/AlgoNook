export type CodeProblem = Readonly<{
  id: string;
  functionName: string;
  argumentKey?: string;
  argumentKeys?: readonly string[];
  resultType?: string;
  testCases: ReadonlyArray<Readonly<{
    id: string;
    nums?: readonly number[];
    values?: readonly string[];
    target?: number;
    expected: boolean | readonly number[] | Readonly<Record<string, number>>;
  }>>;
}>;

export function getCodeProblemById(id: string): CodeProblem | null;
