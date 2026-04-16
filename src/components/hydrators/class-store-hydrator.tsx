"use client";

import { useRef } from "react";

import { useClassStore } from "@/stores/class-store";

interface ClassItem {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  teacher_id: string;
  updated_at: string;
}

interface ClassStoreHydratorProps {
  classes: ClassItem[];
  memberCounts: Record<string, number>;
}

export function ClassStoreHydrator({
  classes,
  memberCounts,
}: ClassStoreHydratorProps): null {
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useClassStore.getState().hydrate(classes, memberCounts);
    hydrated.current = true;
  }
  return null;
}
