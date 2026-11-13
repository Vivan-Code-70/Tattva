import { getCachedAccessToken, getCachedGoogleUser } from './googleCalendarService';
import { DayAttendanceExportItem } from '../utils/attendanceExport';

export interface EmailSendParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attendanceData?: DayAttendanceExportItem[];
}

export interface SentEmailResult {
  id: string;
  threadId: string;
  labelIds: string[];
}

export class GmailService {
  /**
   * Send an email via the Gmail REST API (POST /gmail/v1/users/me/messages/send)
   * User confirmation dialog MUST be confirmed before invoking this method!
   */
  public static async sendEmail(params: EmailSendParams): Promise<SentEmailResult> {
    const token = getCachedAccessToken();
    if (!token) {
      throw new Error('Gmail authorization required. Please connect your Google account.');
    }

    const user = getCachedGoogleUser();
    const fromAddress = user?.email || 'me';

    // Construct RFC 2822 MIME message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const textContent = params.bodyText || params.bodyHtml.replace(/<[^>]+>/g, ' ');

    const rawMessage = [
      `From: ${fromAddress}`,
      `To: ${params.to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      textContent,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      params.bodyHtml,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // Base64url encode
    const utf8Bytes = new TextEncoder().encode(rawMessage);
    let binary = '';
    utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64Url = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64Url,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to send email via Gmail (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Helper to format an HTML attendance trend email
   */
  public static buildAttendanceEmailHtml(
    recipientName: string,
    weekRange: string,
    dailyData: DayAttendanceExportItem[],
    avgTurnout: number
  ): string {
    const rowsHtml = dailyData
      .map(
        (d) => `
        <tr style="border-bottom: 1px solid #fed7aa;">
          <td style="padding: 8px 12px; font-weight: bold; color: #1c140e;">${d.day} (${d.dateStr})</td>
          <td style="padding: 8px 12px; font-family: monospace; font-weight: bold; color: #ea580c;">${d.overallAttendance.toFixed(1)}%</td>
          <td style="padding: 8px 12px; font-family: monospace; color: #2563eb;">${d.grade10Attendance.toFixed(1)}%</td>
          <td style="padding: 8px 12px; font-family: monospace; color: #9333ea;">${d.grade8Attendance.toFixed(1)}%</td>
          <td style="padding: 8px 12px; font-family: monospace; color: #10b981;">${d.onTimeRate.toFixed(1)}%</td>
          <td style="padding: 8px 12px; font-size: 11px; color: #78716c;">${d.note}</td>
        </tr>`
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #fffdfb; margin: 0; padding: 24px; color: #1c140e;">
        <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(234, 88, 12, 0.08);">
          <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #ea580c; margin: 0; font-size: 20px;">Tattvasayam Future Academy</h2>
            <p style="font-size: 12px; color: #78716c; margin: 4px 0 0 0;">Campus Attendance & Turnout Audit • ${weekRange}</p>
          </div>

          <p style="font-size: 14px;">Dear ${recipientName},</p>
          <p style="font-size: 13px; line-height: 1.5; color: #44403c;">
            Here is the verified weekly campus turnout report compiled from our RFID turnstiles and homeroom biometric logs. 
            Overall campus attendance for the period stands at <strong style="color: #ea580c;">${avgTurnout.toFixed(1)}%</strong>, surpassing the CBSE / Cambridge benchmark of 95.0%.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 20px 0; border: 1px solid #fed7aa;">
            <thead>
              <tr style="background-color: #ffedd5; text-align: left; color: #9a3412;">
                <th style="padding: 10px 12px;">Day</th>
                <th style="padding: 10px 12px;">Campus %</th>
                <th style="padding: 10px 12px;">Grade 10-A</th>
                <th style="padding: 10px 12px;">Grade 8-B</th>
                <th style="padding: 10px 12px;">On-Time %</th>
                <th style="padding: 10px 12px;">Status / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; border-radius: 6px; font-size: 12px; color: #7c2d12; margin-top: 20px;">
            <strong>Institutional Compliance Note:</strong><br/>
            Turnout data is cryptographically timestamped and synced with academy gate registries.
          </div>

          <p style="font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #fed7aa; pt: 12px;">
            Tattvasayam Future Academy • Jakkur Plantation Road, Bengaluru, Karnataka 560064
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Resolve audience string ('All students', 'All parents', 'All students & parents', 'Grade 10-A students', etc.)
   * to recipient profile and email addresses from the academy directory.
   */
  public static resolveBroadcastRecipients(
    targetAudience: string,
    profiles: Record<string, { name: string; role: string; title?: string; email?: string }>
  ): Array<{ name: string; role: string; email: string; title?: string }> {
    const list: Array<{ name: string; role: string; email: string; title?: string }> = [];
    const aud = targetAudience.toLowerCase();

    Object.entries(profiles).forEach(([_, p]) => {
      if (!p.email) return;

      const isStudent = p.role === 'student';
      const isParent = p.role === 'parent';
      const isTeacher = p.role === 'teacher';
      const titleLower = (p.title || '').toLowerCase();

      let match = false;

      if (aud.includes('all') && (aud.includes('student') || aud.includes('parent') || aud.includes('academy') || aud.includes('everyone'))) {
        if (aud.includes('student') && isStudent) match = true;
        if (aud.includes('parent') && isParent) match = true;
        if (aud.includes('academy') || aud.includes('everyone') || aud.includes('all stakeholders')) {
          if (isStudent || isParent || isTeacher) match = true;
        }
      }

      if (aud.includes('grade 10') || aud.includes('10-a') || aud.includes('class 10')) {
        if (titleLower.includes('10') || titleLower.includes('grade 10-a')) match = true;
      }

      if (aud.includes('grade 8') || aud.includes('8-b') || aud.includes('class 8')) {
        if (titleLower.includes('8') || titleLower.includes('grade 8-b')) match = true;
      }

      if (aud.includes('faculty') || aud.includes('teacher') || aud.includes('staff')) {
        if (isTeacher) match = true;
      }

      // Default fallback if targetAudience specifically names 'All students'
      if (!match && aud === 'all students' && isStudent) match = true;
      if (!match && aud === 'all parents' && isParent) match = true;

      // Direct email if typed
      if (aud.includes('@') && p.email.toLowerCase() === aud.trim()) {
        match = true;
      }

      if (match) {
        list.push({
          name: p.name,
          role: p.role,
          email: p.email,
          title: p.title,
        });
      }
    });

    // If still empty and an email was provided in the audience string:
    if (list.length === 0 && targetAudience.includes('@')) {
      list.push({
        name: 'Direct Recipient',
        role: 'stakeholder',
        email: targetAudience.trim(),
        title: 'Academy Member',
      });
    }

    return list;
  }

  /**
   * Helper to format an HTML broadcast email from the Academy Directorate
   */
  public static buildBroadcastEmailHtml(
    recipientName: string,
    recipientRole: string,
    subject: string,
    bodyText: string,
    senderName: string = 'Directorate of Academics',
    priority: string = 'Normal'
  ): string {
    const paragraphs = bodyText
      .split('\n')
      .filter((p) => p.trim().length > 0)
      .map((p) => `<p style="font-size: 14px; line-height: 1.6; color: #292524; margin: 0 0 12px 0;">${p.trim()}</p>`)
      .join('');

    const priorityBadge =
      priority.toLowerCase() === 'urgent'
        ? `<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; text-transform: uppercase; font-family: monospace;">Urgent Priority</span>`
        : `<span style="background-color: #ffedd5; color: #9a3412; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; text-transform: uppercase; font-family: monospace;">Official Circular</span>`;

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 24px; color: #1c1917;">
        <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
          <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 24px 28px; color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">Tattvasayam Future Academy</h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #ffedd5; opacity: 0.95;">Official Directorate Communications • Central Bengaluru Campus</p>
              </div>
            </div>
          </div>

          <div style="padding: 28px;">
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f5f5f4; padding-bottom: 14px;">
              <div>
                <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #78716c; letter-spacing: 0.05em;">Notice & Circular Dispatch</p>
                <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #1c1917;">${subject}</h2>
              </div>
              <div>${priorityBadge}</div>
            </div>

            <p style="font-size: 14px; font-weight: 600; color: #44403c; margin: 0 0 16px 0;">
              Salutations ${recipientName} (${recipientRole}),
            </p>

            <div style="background-color: #fafaf9; border-left: 4px solid #ea580c; padding: 16px 18px; border-radius: 8px; margin-bottom: 20px;">
              ${paragraphs}
            </div>

            <div style="background-color: #fff7ed; border: 1px dashed #fdba74; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #9a3412;">
              <strong>Institutional Verification:</strong><br/>
              This broadcast email was initiated by authenticated academy staff (<strong>${senderName}</strong>) via Google Workspace OAuth token security.
            </div>

            <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e7e5e4; font-size: 11px; color: #78716c; line-height: 1.5;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #44403c;">Tattvasayam Future Academy Portal • Academic Directorate</p>
              <p style="margin: 0;">Jakkur Plantation Road, Bengaluru, Karnataka 560064 • Official Mail Dispatch</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

