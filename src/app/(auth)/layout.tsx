import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestSession } from "@/lib/request-session";

interface Props {
  children: React.ReactNode;
}

const Layout = async ({ children }: Props) => {
  const session = await getRequestSession(await headers());

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="bg-muted flex flex-col min-h-svh justify-center items-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">{children}</div>
    </div>
  );
};

export default Layout;
