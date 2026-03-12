import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Page = () => {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Effective Date: March 5, 2026</p>
          <p>
            We collect and process account and operational data to deliver platform functionality,
            security, and support. We do not sell customer business data.
          </p>
          <p>
            For privacy requests, contact support@mscproject.com with your company and account
            details.
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default Page;
