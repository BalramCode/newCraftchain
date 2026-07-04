import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const SECRET = process.env.JWT_SECRET || 'dev_secret'

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 8)
}

export function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash)
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch (e) {
    return null
  }
}

export function getAuthUser(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}
