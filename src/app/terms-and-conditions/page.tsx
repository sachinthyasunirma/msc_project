import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "1. Acceptance Of Terms",
    content:
      "By using this platform, you agree to these Terms and Conditions. If you do not agree, do not use the service.",
  },
  {
    title: "2. Service Scope",
    content:
      "The platform provides tourism operations management capabilities, including master data, planning, access control, and subscription management features.",
  },
  {
    title: "3. Account Responsibilities",
    content:
      "You are responsible for safeguarding credentials, controlling user access, and maintaining accurate company data. You must promptly deactivate unauthorized access.",
  },
  {
    title: "4. Subscription & Billing",
    content:
      "Paid access is governed by your selected plan. Plan changes and renewals are controlled by authorized company administrators. Fees are billed annually unless otherwise agreed in writing.",
  },
  {
    title: "5. Fair Use & Restrictions",
    content:
      "You must not misuse the service, attempt unauthorized access, disrupt service availability, reverse engineer protected components, or use the platform for unlawful purposes.",
  },
  {
    title: "6. Data Ownership & Processing",
    content:
      "Your company retains ownership of business data submitted to the platform. We process data to provide, secure, and improve the service.",
  },
  {
    title: "7. Security",
    content:
      "We implement technical and organizational safeguards, but no system is risk-free. You are responsible for role and privilege governance inside your tenant.",
  },
  {
    title: "8. Availability & Support",
    content:
      "Service availability targets and support commitments may vary by subscription tier or contract. Planned maintenance may affect availability.",
  },
  {
    title: "9. Limitation Of Liability",
    content:
      "To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential losses arising from platform use.",
  },
  {
    title: "10. Termination",
    content:
      "We may suspend or terminate access for violations of these terms, security risks, or non-payment. You may stop using the service at any time.",
  },
  {
    title: "11. Changes To Terms",
    content:
      "We may update these terms from time to time. Continued use after updates constitutes acceptance of revised terms.",
  },
  {
    title: "12. Contact",
    content:
      "For legal, billing, or contract matters, contact support@mscproject.com or sales@mscproject.com.",
  },
];

const Page = () => {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Effective Date: March 5, 2026</p>
          <p>
            These Terms and Conditions govern use of the MSC Project SaaS platform for tourism
            operations.
          </p>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{section.content}</CardContent>
        </Card>
      ))}
    </main>
  );
};

export default Page;
