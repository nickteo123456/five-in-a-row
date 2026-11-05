// In-memory user store for development when Supabase is not configured
import bcrypt from 'bcryptjs'
import { devStore } from './dev-store'

export interface DevUser {
  id: string
  email: string
  name: string
  password_hash: string
  role: string
  created_at: string
  updated_at: string
}

const devUsers = devStore.users

// Seed the teacher account from env vars so it can log in during development.
const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase()
const teacherPassword = process.env.TEACHER_PASSWORD

if (teacherEmail && teacherPassword && !devUsers.has(teacherEmail)) {
  devUsers.set(teacherEmail, {
    id: 'dev-teacher-001',
    email: teacherEmail,
    name: process.env.TEACHER_NAME || 'Teacher',
    password_hash: bcrypt.hashSync(teacherPassword, 10),
    role: 'teacher',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export function findDevUserByEmail(email: string): DevUser | null {
  return devUsers.get(email.toLowerCase()) || null
}

export function findDevUserById(id: string): DevUser | null {
  return Array.from(devUsers.values()).find((user) => user.id === id) || null
}

export function createDevUser(
  email: string,
  name: string,
  passwordHash: string,
  role: string = 'student'
): DevUser {
  const user: DevUser = {
    id: `dev-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    email: email.toLowerCase(),
    name,
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  devUsers.set(email.toLowerCase(), user)
  return user
}

export function getAllDevUsers(): DevUser[] {
  return Array.from(devUsers.values())
}

export function deleteDevUser(userId: string): boolean {
  for (const [email, user] of devUsers.entries()) {
    if (user.id === userId) {
      devUsers.delete(email)
      return true
    }
  }
  return false
}
