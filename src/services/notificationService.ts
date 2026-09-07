/**
 * 管理者向けメール通知サービス
 * 
 * 公認クリエイター申請やユーザーからの問い提案を受信した際、
 * 管理者へ即時メール通知を送信し、ローカル管理画面での迅速な審査を支援します。
 */

export interface ProposalNotificationPayload {
  type: 'creator_application' | 'user_proposal';
  applicantName: string;
  contactEmail?: string;
  profileUrl?: string;
  expertise?: string;
  title: string;
  oracleUrl?: string;
  reason?: string;
  category?: string;
  id: string;
}

export async function sendAdminNotification(payload: ProposalNotificationPayload): Promise<{ success: boolean; message: string }> {
  const isCreator = payload.type === 'creator_application';
  const subject = `【未来レーダー】新規の${isCreator ? '🌟 公認クリエイター審査申請' : '💡 問いの提案'}が届きました`;

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'support@mirairadar.com';
  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #0b1320; color: #f8fafc;">
      <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 20px;">未来レーダー 管理者審査通知</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">新しい審査キューが追加されました</p>
      </div>

      <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background-color: ${isCreator ? '#8b5cf6' : '#0284c7'}; color: #ffffff; margin-bottom: 12px;">
          ${isCreator ? '🌟 公認クリエイター審査申請' : '💡 ユーザー問い提案'}
        </span>
        
        <h3 style="font-size: 16px; color: #ffffff; margin: 8px 0;">${escapeHtml(payload.title)}</h3>
        <p style="font-size: 13px; color: #94a3b8; margin: 4px 0;">カテゴリー: <strong>${escapeHtml(payload.category || '未分類')}</strong></p>
      </div>

      <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 6px 0;"><strong>👤 申請者名・活動名:</strong> ${escapeHtml(payload.applicantName || '匿名')}</p>
        ${payload.contactEmail ? `<p style="margin: 6px 0;"><strong>✉️ 連絡先メール:</strong> <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color: #38bdf8;">${escapeHtml(payload.contactEmail)}</a></p>` : ''}
        ${payload.expertise ? `<p style="margin: 6px 0;"><strong>🎯 専門領域:</strong> ${escapeHtml(payload.expertise)}</p>` : ''}
        ${payload.profileUrl ? `<p style="margin: 6px 0;"><strong>🔗 実績・プロフィールURL:</strong> <a href="${escapeHtml(payload.profileUrl)}" target="_blank" style="color: #38bdf8;">${escapeHtml(payload.profileUrl)}</a></p>` : ''}
        ${payload.oracleUrl ? `<p style="margin: 6px 0;"><strong>⚖️ 判定オラクルURL:</strong> <a href="${escapeHtml(payload.oracleUrl)}" target="_blank" style="color: #38bdf8;">${escapeHtml(payload.oracleUrl)}</a></p>` : ''}
        ${payload.reason ? `<p style="margin: 12px 0 6px 0;"><strong>📝 背景・提案理由:</strong><br/><span style="color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(payload.reason)}</span></p>` : ''}
      </div>

      <div style="border-top: 1px solid #334155; padding-top: 20px; text-align: center;">
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
          ローカル開発環境の管理者コンソールからワンクリックで承認（本番上場）が可能です。
        </p>
        <a href="http://localhost:5173/admin" style="display: inline-block; background-color: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 6px;">
          管理画面で審査・承認する
        </a>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #64748b;">
        未来レーダー (MiraiRadar) 自動通知システム ｜ ID: ${escapeHtml(payload.id)}
      </div>
    </div>
  `;

  // 1. Worker API (/api/notify) 経由での送信を試行
  try {
    const workerRes = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: adminEmail,
        subject,
        html: htmlContent,
        payload,
      }),
    });
    if (workerRes.ok) {
      return { success: true, message: 'Worker経由でメール通知を送信しました。' };
    }
  } catch {
    // Worker がないローカル環境等ではフォールバックへ
  }

  // 2. Resend API 直接呼び出し (キーがある場合)
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: '未来レーダー通知 <onboarding@resend.dev>',
          to: adminEmail,
          subject,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, message: 'Resend経由でメール通知を送信しました。' };
      }
    } catch (e) {
      console.warn('Resend direct notification failed:', e);
    }
  }

  // 3. キー未設定または失敗時：コンソール通知（開発中ログ）
  console.info(`[Notification Simulation] 管理者(${adminEmail})宛通知:\n件名: ${subject}\n内容:`, payload);
  return { success: false, message: 'メールAPI未設定のため、データベース記録のみ完了しました。' };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
