import { neon } from '@neondatabase/serverless'
import { Resend } from 'resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { category, message, email, lang } = req.body || {}

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }
    if (message.length > 5000) {
      return res.status(413).json({ error: 'Message too long' })
    }

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL)

    // Save to database
    await sql(
      `INSERT INTO feedback (category, message, email, lang) VALUES ($1, $2, $3, $4)`,
      [
        category || 'general',
        message.trim(),
        email && email.trim() ? email.trim() : null,
        lang || 'en'
      ]
    )

    // Send email notification via Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)

        const emailVal = email && email.trim() ? email.trim() : null
        const isValidEmail = emailVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
        const categoryLabel = category || 'General'
        const langLabel = lang === 'zh-TW' ? '中文' : 'English'

        const emailParams = {
          from: 'ABG Interpreter <onboarding@resend.dev>',
          to: 'galen147258369@gmail.com',
          subject: 'ABG/VBG Interpreter User Feedback',
        }
        if (isValidEmail) {
          emailParams.cc = emailVal
          emailParams.replyTo = emailVal
        }

        await resend.emails.send({
          ...emailParams,
          html: `
            <h2>New Feedback Received</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:6px 12px;font-weight:bold;">Category</td><td style="padding:6px 12px;">${esc(categoryLabel)}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;">Language</td><td style="padding:6px 12px;">${langLabel}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;">User Email</td><td style="padding:6px 12px;">${replyTo ? esc(replyTo) : '<em>Not provided</em>'}</td></tr>
            </table>
            <h3>Message</h3>
            <div style="padding:12px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap;font-size:14px;">${esc(message.trim())}</div>
          `
        })
      } catch (emailErr) {
        console.error('[Feedback] Email send error:', emailErr)
        // Don't fail the request — DB write succeeded
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Feedback error:', err)
    res.status(500).json({ error: 'failed' })
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
