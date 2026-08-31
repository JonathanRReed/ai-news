import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const FORBIDDEN_FIELD = /(authorization|cookie|password|secret|service.?role.?key|api.?key|access.?token|refresh.?token)/i;

function assertNoForbiddenFields(value, path = 'receipt') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(key)) {
      throw new Error(`receipt contains a forbidden field at ${path}.${key}`);
    }
    assertNoForbiddenFields(entry, `${path}.${key}`);
  }
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortValue(value[key])]),
  );
}

export function serializeReceipt(receipt) {
  assertNoForbiddenFields(receipt);
  return `${JSON.stringify(sortValue(receipt), null, 2)}\n`;
}

export function hashReceipt(receipt) {
  return createHash('sha256').update(serializeReceipt(receipt)).digest('hex');
}

export async function writeReceipt(receipt, path) {
  const serialized = serializeReceipt(receipt);
  const sha256 = createHash('sha256').update(serialized).digest('hex');
  const temporaryPath = `${path}.${globalThis.process.pid}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(temporaryPath, 'wx', 0o600);
  try {
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, path);
  return { path, sha256 };
}
