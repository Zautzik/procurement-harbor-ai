import { useEffect } from "react";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useLanguageSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("language").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.language && data.language !== i18n.language) {
          i18n.changeLanguage(data.language);
        }
      });
  }, [user?.id]);
}
