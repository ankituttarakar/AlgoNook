export const CURRENT_SCHEMA_VERSION: '004';

export function checkDatabaseSchema(
  databaseUrl: string,
  createSql?: (connectionString: string) => { query(statement: string): PromiseLike<unknown> },
): Promise<{ compatible: boolean }>;
