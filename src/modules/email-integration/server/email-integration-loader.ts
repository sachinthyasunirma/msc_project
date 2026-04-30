import { headers } from "next/headers";
import {
  listCompanyEmailAccounts,
  listCompanyEmailIntakeProfiles,
} from "@/modules/email-integration/server/email-integration-service";

export async function loadEmailIntegrationInitialData() {
  try {
    const requestHeaders = await headers();
    const [accounts, intakeProfiles] = await Promise.all([
      listCompanyEmailAccounts(requestHeaders, false),
      listCompanyEmailIntakeProfiles(requestHeaders),
    ]);
    return {
      accounts,
      intakeProfiles,
    };
  } catch {
    return null;
  }
}
