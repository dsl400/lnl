// Diagnostic codes are stable within a major version (engine.md, Lint).
export const CODES = {
  NO_BLOCK: 'LNL001',
  MANY_BLOCKS: 'LNL002',
  UNCLOSED_BLOCK: 'LNL003',
  UNKNOWN_INSTRUCTION: 'LNL010',
  BAD_OPERAND: 'LNL011',
  BAD_LABEL: 'LNL012',
  UNTERMINATED_STRING: 'LNL013',
  IF_NOT_ALLOWED: 'LNL014',
  DUPLICATE_LABEL: 'LNL020',
  MISSING_START: 'LNL021',
  MISSING_TARGET: 'LNL022',
  MISSING_REVIEW_REPLY: 'LNL023',
  ASK_WITHOUT_BRANCH: 'LNL030',
  BRANCH_WITHOUT_ASK: 'LNL031',
  DUPLICATE_BRANCH: 'LNL032',
  UNREACHABLE_LABEL: 'LNL040',
  FALLS_OFF_END: 'LNL041',
  NO_PATH_TO_END: 'LNL042',
  UNCONTROLLED_CYCLE: 'LNL050',
  DUPLICATE_LIMIT: 'LNL051',
  TOO_MANY_CYCLES: 'LNL052',
  NO_STOP_MODE_PATH: 'LNL060',
  CALL_PATH: 'LNL070',
  CALL_OUTSIDE_ROOT: 'LNL071',
  CALL_MISSING: 'LNL072',
  RECURSIVE_CALL: 'LNL073',
  FILE_ACCESS: 'LNL080',
};

export function diag(code, file, line, column, message, severity = 'error') {
  return { code, severity, file, line, column, message };
}

export function formatText(d) {
  return `${d.file}:${d.line}:${d.column}: ${d.severity} ${d.code}: ${d.message}`;
}

export function compareDiagnostics(a, b) {
  return a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.code.localeCompare(b.code);
}
