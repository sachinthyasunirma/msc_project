"use client";

import { useMemo, useState } from "react";
import { Headset, Mail, MessageSquareText, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const supportEmail = "support@mscproject.com";
const salesEmail = "sales@mscproject.com";
const supportPhone = "+1 800 555 2048";

export function ContactUsView() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    topic: "Subscription Upgrade",
    message: "",
  });

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(`[${form.topic}] Inquiry from ${form.company || "Unknown Company"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\nMessage:\n${form.message}`
    );
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }, [form]);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headset className="size-4" />
            Contact Us
          </CardTitle>
          <CardDescription>
            Reach our team for subscription upgrades, pricing questions, onboarding, and technical support.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support Desk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="size-4" />
              <a className="underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4" />
              <span>{supportPhone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="size-4" />
              <a className="underline" href={`mailto:${salesEmail}`}>
                {salesEmail}
              </a>
            </div>
            <p className="text-muted-foreground">
              Contact sales for annual plan pricing, procurement, and enterprise contracts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Priority support: within 4 business hours.</p>
            <p>General support: within 1 business day.</p>
            <p>Enterprise ticket escalations: same business day.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="size-4" />
            Send Inquiry
          </CardTitle>
          <CardDescription>
            Fill in details and click send. Your email client will open with a prepared message.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder="Subscription Upgrade"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Describe your request"
              rows={6}
            />
          </div>
          <div className="md:col-span-2">
            <Button asChild>
              <a href={mailtoHref}>
                <Send className="mr-2 size-4" />
                Send To Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
