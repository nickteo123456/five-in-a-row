// In-memory user store for development when Supabase is not configured
import bcrypt from 'bcryptjs';

export interface DevUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Pre-hashed password for "20040925nick"
const TEACHER_PASSWORD_HASH = '$2b$10$z9o93vItn7bbhsvfoorEIORf3wsJMrB0v.mv2qUTsjPIi8G2HGZ9W';

const devUsers: Map<string, DevUser> = new Map();

// Initialize with teacher account
devUsers.set('iamnick0925@gmail.com', {
  id: 'dev-teacher-001',
  email: 'iamnick0925@gmail.com',
  name: 'Nick',
  password_hash: TEACHER_PASSWORD_HASH,
  role: 'teacher',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function findDevUserByEmail(email: string): DevUser | null {
  return devUsers.get(email.toLowerCase()) || null;
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
  };
  
  devUsers.set(email.toLowerCase(), user);
  return user;
}

export function getAllDevUsers(): DevUser[] {
  return Array.from(devUsers.values());
}

export function deleteDevUser(userId: string): boolean {
  for (const [email, user] of devUsers.entries()) {
    if (user.id === userId) {
      devUsers.delete(email);
      return true;
    }
  }
  return false;
}

