import { supabase, isDevMode } from './supabase';
import { findDevUserByEmail, createDevUser, getAllDevUsers, deleteDevUser } from './dev-users';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function createUser(email: string, name: string, passwordHash: string, role: string = 'student'): Promise<User | null> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    console.log('🔧 Development mode: Creating user in memory');
    return createDevUser(email, name, passwordHash, role);
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        name,
        password_hash: passwordHash,
        role
      }])
      .select()
      .single();

    if (error) {
      // If table doesn't exist, return null instead of error
      if (error.code === '42P01') { // Table doesn't exist
        console.log('Users table does not exist yet');
        return null;
      }
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    return findDevUserByEmail(email);
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      // If table doesn't exist, return null instead of error
      if (error.code === '42P01') { // Table doesn't exist
        console.log('Users table does not exist yet');
        return null;
      }
      console.error('Error finding user:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    return getAllDevUsers();
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    return deleteDevUser(userId);
  }

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database error:', error);
    return false;
  }
}
