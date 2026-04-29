import { z } from 'zod'

export const imprintContactFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'Name must be 120 characters or fewer.'),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  message: z.string().trim().min(1, 'Enter a message.').max(4000, 'Message must be 4000 characters or fewer.'),
  website: z.string().trim().max(500)
})
