-- Add observations field to attendances table
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS observations TEXT;

-- Create quick_replies table for storing quick response templates
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for quick_replies
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own quick replies
CREATE POLICY "Users can manage their own quick replies"
ON public.quick_replies
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all quick replies
CREATE POLICY "Admins can view all quick replies"
ON public.quick_replies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();