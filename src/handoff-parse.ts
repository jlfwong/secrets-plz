/**
 * Decode the RHS of a bash assignment/export from a NoxKey handoff script.
 *
 * NoxKey currently emits values like API_KEY=''\''sk_live_...'
 * which bash interprets as a leading literal quote before the key. The stored
 * secret does not include that quote — it is an over-escape artifact. We parse
 * the RHS directly instead of relying on `source` + parameter expansion.
 */
export function decodeBashAssignmentValue(rhs: string): string {
  const trimmed = rhs.trim();

  // NoxKey: ''\''value' → value (spurious leading quote escape before simple value)
  const noxkeyOverEscape = /^''\\''(.+)'$/.exec(trimmed);
  if (noxkeyOverEscape) {
    return noxkeyOverEscape[1]!;
  }

  // Simple single-quoted value: 'value'
  const simpleQuoted = /^'((?:[^'\\]|\\.)*)'$/.exec(trimmed);
  if (simpleQuoted) {
    return simpleQuoted[1]!.replace(/\\'/g, "'");
  }

  throw new Error(
    `Unsupported bash assignment encoding: ${trimmed.slice(0, 20)}…`,
  );
}

/** Find VAR=value or export VAR=value in a NoxKey handoff script. */
export function findAssignmentRhs(
  handoffContents: string,
  varName: string,
): string | undefined {
  const pattern = new RegExp(
    `(?:^export\\s+)?${varName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}=(.*)$`,
    'm',
  );
  const match = pattern.exec(handoffContents);
  return match?.[1]?.trim();
}
