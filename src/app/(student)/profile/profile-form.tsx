"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useProfileStore } from "@/stores/profile-store";

export function ProfileForm() {
  const profile = useProfileStore((s) => s.profile);
  const hydrate = useProfileStore((s) => s.hydrate);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setFirstName(profileData.first_name);
          setLastName(profileData.last_name);
          hydrate({
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: user.email ?? "",
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [hydrate]);

  // Sync local state with store on rollback
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ firstName, lastName });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 max-w-md rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            value={email}
            disabled
            onChange={() => {}}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
