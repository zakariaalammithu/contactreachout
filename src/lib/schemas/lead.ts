import { z } from 'zod';

export const LeadSchema = z.object({
  website: z.string().url('Please enter a valid website URL'),
  companyName: z.string().min(1, 'Company name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  customFields: z.record(z.string()).optional(),
});

export const ColumnMappingSchema = z.object({
  website: z.string().min(1, 'Website column mapping is required'),
  companyName: z.string().min(1, 'Company name column mapping is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;
export type ColumnMappingInput = z.infer<typeof ColumnMappingSchema>;
