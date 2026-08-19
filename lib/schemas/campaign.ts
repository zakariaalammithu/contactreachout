import { z } from 'zod';

export const CampaignFormSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  messageTemplateId: z.string().min(1, 'Please select a message template'),
  isDryRun: z.boolean().default(true),
  rateLimitPerMinute: z.number().min(1).max(120).default(10),
  maxConcurrency: z.number().min(1).max(20).default(5),
  interPageDelayMs: z.number().min(1000).default(3000),
  selectedLeadIds: z.array(z.string()).min(1, 'Select at least one lead for this campaign'),
});

export type CampaignFormData = z.infer<typeof CampaignFormSchema>;
