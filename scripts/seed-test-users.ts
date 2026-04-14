import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testUsers = [
  {
    email: "test_teacher@hiraya.app",
    password: "ereflect12",
    data: { first_name: "Test", last_name: "Teacher", role: "teacher" },
  },
  {
    email: "test_student@hiraya.app",
    password: "ereflect12",
    data: { first_name: "Test", last_name: "Student", role: "student" },
  },
];

async function seed() {
  for (const user of testUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      user_metadata: user.data,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`[skip] ${user.email} already exists`);
      } else {
        console.error(`[error] ${user.email}:`, error.message);
      }
    } else {
      console.log(`[created] ${user.email} (${user.data.role}) — id: ${data.user.id}`);
    }
  }
}

seed();
