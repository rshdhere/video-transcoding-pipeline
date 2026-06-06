"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeHero() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [isPending, router, session]);

  if (isPending) {
    return <Skeleton className="mx-auto mt-8 h-11 w-64" />;
  }

  if (session) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg">
        <Link href="/signup">
          Get started
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}
