import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, passwordHash) {
  if (typeof password !== "string" || typeof passwordHash !== "string") {
    return false;
  }

  const parts = passwordHash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, storedHash] = parts;

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedBuffer = Buffer.from(derivedKey);

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
}
