import { logger } from './logger'

const RESEND_URL = 'https://api.resend.com/emails'

// Sends through Resend when configured. Returns false when email isn't set up.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    logger.error('Email is not configured: set RESEND_API_KEY and EMAIL_FROM')
    return false
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!response.ok) {
    logger.error('Error sending email:', response.status)
    return false
  }

  return true
}
