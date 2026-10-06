-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  calculator_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculator_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (edge functions use service role to bypass)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via edge functions with service role key

-- Create private storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('purchase-pdfs', 'purchase-pdfs', false);

-- Storage policy: only service role can access (no public access needed - edge functions handle download)
CREATE POLICY "Service role full access to purchase-pdfs"
ON storage.objects
FOR ALL
USING (bucket_id = 'purchase-pdfs')
WITH CHECK (bucket_id = 'purchase-pdfs');