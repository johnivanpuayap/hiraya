import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  email: string;
  password: string;
  role: "student" | "teacher";
  firstName: string;
  lastName: string;
  username: string;
}

const testUsers: TestUser[] = [
  {
    email: "test_teacher@hiraya.app",
    password: "ereflect12",
    role: "teacher",
    firstName: "Test",
    lastName: "Teacher",
    username: "test_teacher",
  },
  {
    email: "test_student@hiraya.app",
    password: "ereflect12",
    role: "student",
    firstName: "Test",
    lastName: "Student",
    username: "test_student",
  },
];

async function applyUser(u: TestUser): Promise<void> {
  const userMetadata = {
    first_name: u.firstName,
    last_name: u.lastName,
    username: u.username,
  };
  // Role lives in app_metadata so it can't be self-edited by the user.
  // auth.ts reads user.app_metadata.role first, with profiles.role as fallback.
  const appMetadata = { role: u.role };

  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
    email_confirm: true,
  });

  let userId: string | undefined;
  if (error) {
    if (!error.message.includes("already been registered")) {
      console.error(`[error]   ${u.email}:`, error.message);
      return;
    }
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users.find((x) => x.email === u.email);
    if (!existing) {
      console.error(`[error]   ${u.email}: already registered but cannot locate`);
      return;
    }
    const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: userMetadata,
      app_metadata: appMetadata,
      password: u.password,
    });
    if (updErr) {
      console.error(`[error]   updating ${u.email}:`, updErr.message);
      return;
    }
    userId = existing.id;
    console.log(`[updated] ${u.email} (${u.role}) — username: ${u.username}`);
  } else {
    userId = data.user.id;
    console.log(`[created] ${u.email} (${u.role}) — username: ${u.username}`);
  }

  if (!userId) return;

  // Upsert profiles row so role + username always reflect the seed,
  // regardless of whether a JWT hook / on-signup trigger populated it.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: u.role,
        username: u.username,
        first_name: u.firstName,
        last_name: u.lastName,
      },
      { onConflict: "id" },
    );
  if (profileError) {
    console.error(`[error]   profile upsert for ${u.email}:`, profileError.message);
  }
}

async function seed(): Promise<void> {
  for (const u of testUsers) {
    await applyUser(u);
  }
}

seed();
