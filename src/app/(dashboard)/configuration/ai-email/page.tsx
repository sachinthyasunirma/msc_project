import { loadEmailIntegrationInitialData } from "@/modules/email-integration/server/email-integration-loader";
import { EmailIntegrationView } from "@/modules/email-integration/ui/views/email-integration-view";

const AIEmailConfigurationPage = async () => {
  const initialData = await loadEmailIntegrationInitialData();

  return <EmailIntegrationView initialData={initialData} />;
};

export default AIEmailConfigurationPage;
