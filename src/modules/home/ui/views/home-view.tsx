"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const HomeView = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  if (!session) {
    return (
      <div className="p-6">
        <LoadingState
          title="Preparing your workspace"
          description="Fetching your tour-management session."
          size="lg"
        />
      </div>
    );
  }
  return (
    <div>
      <p>{session.user.name}</p>
      <Button
        variant={"destructive"}
        onClick={() =>
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/sign-in"),
            },
          })
        }
      >
        click me
      </Button>
    </div>
  );
};
