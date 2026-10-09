import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * 口令哈希用 Node 内置 scrypt。
 *
 * 为什么不上 argon2：argon2 的 node 绑定要走 node-gyp，node:22-slim
 * 镜像里还得先装 build-essential，骨架阶段为一个函数引一串构建链不划算。
 * scrypt 是内存硬的，抗 GPU 暴破，够用。真要换 argon2，只改本文件两个导出。
 */
const scryptAsync = promisify(scrypt)

const KEY_LEN = 64
const COST = 16384 // N
const BLOCK_SIZE = 8 // r
const PARALLEL = 1 // p

/** 格式：scrypt$N$r$p$saltB64$hashB64 —— 参数跟着哈希走，以后调参不会让旧口令失效。 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const key = (await scryptAsync(plain, salt, KEY_LEN, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLEL,
    maxmem: 128 * COST * BLOCK_SIZE * 2,
  })) as Buffer
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLEL}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || expected.length === 0) {
    return false
  }

  const actual = (await scryptAsync(plain, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2,
  })) as Buffer

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
