import { z } from 'zod';

export const MessageTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  subjectTemplate: z.string().min(2, 'Subject line template is required'),
  bodyTemplate: z.string().min(10, 'Message body template must be at least 10 characters'),
  complianceFooter: z.string().min(5, 'Mandatory compliance footer is required'),
  isSpintaxEnabled: z.boolean().default(true),
});

export type MessageTemplateFormData = z.infer<typeof MessageTemplateSchema>;
