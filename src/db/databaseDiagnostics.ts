export interface DatabaseErrorDiagnostics {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  constraint?: string;
}

export function getDatabaseErrorDiagnostics(
  error: unknown
): DatabaseErrorDiagnostics {
  const pending: unknown[] = [error];
  const visited = new Set<object>();
  const fallback: DatabaseErrorDiagnostics = {};

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    const fields = current as Record<string, unknown>;
    if (fields.cause) pending.push(fields.cause);
    if (Array.isArray(fields.errors)) pending.push(...fields.errors);

    const diagnostics: DatabaseErrorDiagnostics = {
      code: typeof fields.code === 'string' ? fields.code : undefined,
      table: typeof fields.table === 'string' ? fields.table : undefined,
      column: typeof fields.column === 'string' ? fields.column : undefined,
      constraint:
        typeof fields.constraint === 'string' ? fields.constraint : undefined,
      message: typeof fields.message === 'string' ? fields.message : undefined,
    };

    if (diagnostics.code || diagnostics.table || diagnostics.column) {
      return {
        ...diagnostics,
        message: diagnostics.message
          ? sanitizeDatabaseMessage(diagnostics.message)
          : undefined,
      };
    }

    if (!fallback.message && diagnostics.message) {
      fallback.message = sanitizeDatabaseMessage(diagnostics.message);
    }
  }

  return fallback;
}

function sanitizeDatabaseMessage(message: string): string {
  return message
    .replace(/'(?:[^']|'')*'|"[^"]*"/g, '[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/(?:postgres(?:ql)?:\/\/)\S+/gi, '[redacted]');
}
