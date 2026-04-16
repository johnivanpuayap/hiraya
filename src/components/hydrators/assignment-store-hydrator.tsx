"use client";

import { useRef } from "react";

import { useAssignmentStore } from "@/stores/assignment-store";

import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

interface AssignmentStoreHydratorProps {
  assignments: AssignmentRow[];
  classNameMap: Record<string, string>;
}

export function AssignmentStoreHydrator({
  assignments,
  classNameMap,
}: AssignmentStoreHydratorProps): null {
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useAssignmentStore.getState().hydrate(assignments, classNameMap);
    hydrated.current = true;
  }
  return null;
}
