export function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function copyAddress(addr: string): Promise<void> {
  await navigator.clipboard.writeText(addr);
}
