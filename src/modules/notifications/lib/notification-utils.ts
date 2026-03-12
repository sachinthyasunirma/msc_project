type DirectoryUser = {
  id: string;
  name: string;
  email: string;
};

export function countWords(input: string) {
  const normalized = input.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}

function sanitizeHandle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 32);
}

function buildBaseHandle(row: DirectoryUser) {
  const emailPrefix = row.email.split("@")[0] ?? "";
  const fromName = row.name.replace(/\s+/g, ".").toLowerCase();
  return sanitizeHandle(fromName) || sanitizeHandle(emailPrefix) || "user";
}

export function buildMentionDirectory<T extends DirectoryUser>(users: T[]) {
  const used = new Set<string>();
  return users.map((row) => {
    const base = buildBaseHandle(row);
    let handle = base;
    let suffix = 2;
    while (used.has(handle)) {
      handle = `${base}${suffix}`;
      suffix += 1;
    }
    used.add(handle);
    return { ...row, mentionHandle: handle };
  });
}

export function normalizeMentionHandle(value: string) {
  return sanitizeHandle(value);
}
