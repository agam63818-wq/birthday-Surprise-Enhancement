import LegalPage from "@/pages/legal/LegalPage";
import { PRIVACY_POLICY } from "@/lib/legal/content";

export default function PrivacyPolicyPage() {
  return <LegalPage doc={PRIVACY_POLICY} />;
}
