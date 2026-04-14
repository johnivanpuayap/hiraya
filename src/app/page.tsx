import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

import { getAuthenticatedUser } from "@/lib/auth";

const LandingPage = dynamic(
  () => import("@/components/landing/landing-page").then((m) => ({ default: m.LandingPage })),
  { ssr: true }
);

export default async function Home() {
  const { user } = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
