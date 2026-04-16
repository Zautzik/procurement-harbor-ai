
-- Fix audit_log INSERT policy
DROP POLICY "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can insert own audit_log" ON public.audit_log 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Fix ai_agent_actions INSERT policy
DROP POLICY "System can insert ai_actions" ON public.ai_agent_actions;
CREATE POLICY "Managers can insert ai_actions" ON public.ai_agent_actions 
FOR INSERT TO authenticated 
WITH CHECK (public.is_manager_or_admin(auth.uid()));
