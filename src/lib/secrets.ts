// Section 8 of the plan: credentials move only through approved secure channels.
// The app warns (the user can override) when an update looks like it holds one.

const PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\b(pass(word)?|passwd|pwd|passcode)\s*[:=]/i, why: "a password" },
  { re: /\b(api[_-]?key|secret|token|private[_-]?key|client[_-]?secret)\s*[:=]\s*\S+/i, why: "a key or token" },
  { re: /\bsb_secret_[A-Za-z0-9_-]+/, why: "a Supabase secret key" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: "a private key" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, why: "an AWS access key" },
  { re: /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, why: "a GitHub token" },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, why: "a JWT" },
];

/** Long base64/hex-like runs with mixed case and digits (paths and words don't qualify). */
function hasLongEncodedString(text: string) {
  const runs = text.match(/[A-Za-z0-9+/=_-]{40,}/g) ?? [];
  return runs.some((r) => /[a-z]/.test(r) && /[A-Z]/.test(r) && /\d/.test(r));
}

/** Returns a short reason if the text looks like it contains a secret, else null. */
export function looksLikeSecret(text: string): string | null {
  for (const { re, why } of PATTERNS) {
    if (re.test(text)) return why;
  }
  if (hasLongEncodedString(text)) return "a long encoded string";
  return null;
}
