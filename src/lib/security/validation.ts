import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10)) * 1024 * 1024;

export const PDFUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileSize: z.number().max(MAX_FILE_SIZE_BYTES, 'File size exceeds maximum limit of 25MB'),
  fileType: z.string().refine((val) => val === 'application/pdf' || val.endsWith('.pdf'), {
    message: 'Only PDF documents are allowed',
  }),
});

export const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Question cannot be empty').max(2000, 'Question too long'),
  conversationId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  stream: z.boolean().optional().default(true),
});

export function validatePDFFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  try {
    PDFUploadSchema.parse({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    return { valid: true };
  } catch (err: any) {
    const firstError = err?.issues?.[0]?.message || err?.errors?.[0]?.message || 'Invalid PDF file';
    return { valid: false, error: firstError };
  }
}
