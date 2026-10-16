import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE_ID,
  type AdmitCardTemplateId,
} from "../component/panel/exams/exam-settings/admit-card-template/admitCardTemplates";
import { subscribeAdmitCardTemplate } from "../component/panel/exams/exam-settings/admit-card-template/admitCardSettings";

export function useAdmitCardTemplate() {
  const [templateId, setTemplateId] =
    useState<AdmitCardTemplateId>(DEFAULT_TEMPLATE_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAdmitCardTemplate(
      (id) => {
        setTemplateId(id ?? DEFAULT_TEMPLATE_ID);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return { templateId, loading, error };
}
