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
    data: { first_name: "Test", last_name: "Teacher", role: "teacher", username: "test_teacher" },
  },
  {
    email: "test_student@hiraya.app",
    password: "ereflect12",
    data: { first_name: "Test", last_name: "Student", role: "student", username: "test_student" },
  },
];

async function seed() {
  for (const user of testUsers) {
    // Try to create user first
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      user_metadata: user.data,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        // User exists — find them and update metadata + username on profile
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users.find((u) => u.email === user.email);
        if (existing) {
          // Update auth user metadata
          await supabase.auth.admin.updateUserById(existing.id, {
            user_metadata: user.data,
            password: user.password,
          });
          // Update profile username
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ username: user.data.username })
            .eq("id", existing.id);
          if (profileError) {
            console.error(`[error] updating profile for ${user.email}:`, profileError.message);
          } else {
            console.log(`[updated] ${user.email} — username: ${user.data.username}`);
          }
        }
      } else {
        console.error(`[error] ${user.email}:`, error.message);
      }
    } else {
      console.log(`[created] ${user.email} (${user.data.role}) — username: ${user.data.username} — id: ${data.user.id}`);
    }
  }
}

seed();
