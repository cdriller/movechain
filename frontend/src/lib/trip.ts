import { isAddress } from "viem";

export const ACTION_START = 0 as const;
export const ACTION_STOP = 1 as const;
export type TripAction = typeof ACTION_START | typeof ACTION_STOP;

// Must match MoveChain's EIP712("MoveChain", "1") and TRIP_AUTH_TYPEHASH.
export const EIP712_DOMAIN_NAME = "MoveChain";
export const EIP712_DOMAIN_VERSION = "1";

export const tripAuthTypes = {
  TripAuth: [
    { name: "rider", type: "address" },
    { name: "operator", type: "address" },
    { name: "action", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function buildDomain(chainId: number, verifyingContract: `0x${string}`) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

/**
 * Payload that travels in the QR code from the rider's wallet to the operator.
 * All bigints are serialized as decimal strings so the JSON stays portable.
 */
export interface TripQrPayload {
  rider: `0x${string}`;
  operator: `0x${string}`;
  action: TripAction;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
}

export function encodeTripPayload(payload: TripQrPayload): string {
  return JSON.stringify(payload);
}

export function decodeTripPayload(raw: string): TripQrPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("QR payload is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("QR payload is malformed");
  }

  const p = parsed as Record<string, unknown>;

  if (typeof p.rider !== "string" || !isAddress(p.rider)) {
    throw new Error("QR payload: invalid rider address");
  }
  if (typeof p.operator !== "string" || !isAddress(p.operator)) {
    throw new Error("QR payload: invalid operator address");
  }
  if (p.action !== ACTION_START && p.action !== ACTION_STOP) {
    throw new Error("QR payload: invalid action");
  }
  if (typeof p.nonce !== "string" || typeof p.deadline !== "string") {
    throw new Error("QR payload: missing nonce/deadline");
  }
  if (typeof p.signature !== "string" || !p.signature.startsWith("0x")) {
    throw new Error("QR payload: invalid signature");
  }

  return {
    rider: p.rider,
    operator: p.operator,
    action: p.action,
    nonce: p.nonce,
    deadline: p.deadline,
    signature: p.signature as `0x${string}`,
  };
}

export function actionLabel(action: TripAction): string {
  return action === ACTION_START ? "Start trip" : "Complete trip";
}

export function shortAddress(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDeadline(deadline: string): string {
  const ms = Number(deadline) * 1000;
  if (!Number.isFinite(ms)) return deadline;
  return new Date(ms).toLocaleTimeString();
}
