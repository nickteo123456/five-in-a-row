const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mgkqekfmsguoqhgjydrt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3Fla2Ztc2d1b3FoZ2p5ZHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDA3MDgsImV4cCI6MjA3Njc3NjcwOH0.UzpwZUJpnYrCbv826UpY9oXEmmEnptAzTAsO9rFGu8w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTeacherAccount() {
  try {
    console.log('🔐 Creating teacher account...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('20040925nick', 10);
    console.log('✅ Password hashed successfully');

    // Check if teacher already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'iamnick0925@gmail.com')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing user:', checkError);
      return;
    }

    if (existingUser) {
      console.log('👨‍🏫 Teacher account already exists!');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🎭 Role:', existingUser.role);
      return;
    }

    // Create the teacher account
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        email: 'iamnick0925@gmail.com',
        name: 'Nick',
        password_hash: hashedPassword,
        role: 'teacher'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating teacher account:', insertError);
      return;
    }

    console.log('✅ Teacher account created successfully!');
    console.log('📧 Email:', newUser.email);
    console.log('👤 Name:', newUser.name);
    console.log('🎭 Role:', newUser.role);
    console.log('🆔 ID:', newUser.id);
    console.log('📅 Created:', newUser.created_at);

    console.log('\n🎯 Login Credentials:');
    console.log('Email: iamnick0925@gmail.com');
    console.log('Password: 20040925nick');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTeacherAccount();
