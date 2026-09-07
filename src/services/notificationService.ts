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
          from: '未来レーダー <notifications@mail.mirairadar.com>',
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

export interface CreatorApprovalPayload {
  creatorEmail: string;
  creatorName: string;
  marketTitle: string;
  marketSlug: string;
  categoryLabel?: string;
}

/**
 * 審査通過・本番上場完了をクリエイターへ自動通知する
 */
export async function sendCreatorApprovalNotification(payload: CreatorApprovalPayload): Promise<{ success: boolean; message: string }> {
  if (!payload.creatorEmail || !payload.creatorEmail.includes('@')) {
    return { success: false, message: '有効なメールアドレスがありません。' };
  }

  const subject = `【未来レーダー】公認クリエイター審査通過および予測銘柄上場のお知らせ`;
  const marketUrl = `https://mirairadar.com/market/${payload.marketSlug}`;
  const shareText = `未来レーダー（@MiraiRadar）にて、私が提案した独自予測銘柄が上場されました！ぜひあなたの見解を投票してください。\n\n「${payload.marketTitle}」`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(marketUrl)}`;

  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #1e293b; border-radius: 12px; background-color: #0b1320; color: #f8fafc; line-height: 1.6;">
      <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); margin-bottom: 8px;">
          🌟 公認インテリジェンス・クリエイター認定
        </span>
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">審査通過 ＆ 独自銘柄の上場完了</h2>
      </div>

      <p style="font-size: 15px; margin-bottom: 20px;">
        <strong>${escapeHtml(payload.creatorName)} 様</strong>
      </p>

      <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px;">
        未来レーダー（総務省届出電気通信事業者 Ａ－０８－２４２３７）へのご申請ありがとうございます。<br/>
        厳正な上場審査の結果、ご提案いただいたテーマが3大上場基準（客観的オラクル・事実判定の中立性・公共性）を満たしていると確認され、<strong>未来レーダー本番マーケット一覧へ正式に上場・公開されました。</strong>
      </p>

      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
        <span style="font-size: 12px; color: #38bdf8; font-weight: bold;">上場銘柄情報</span>
        <h3 style="font-size: 16px; color: #ffffff; margin: 8px 0 12px 0;">${escapeHtml(payload.marketTitle)}</h3>
        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0;">カテゴリー: ${escapeHtml(payload.categoryLabel || '公認クリエイター銘柄')}</p>
        
        <a href="${marketUrl}" style="display: inline-block; background-color: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px;">
          👉 上場された銘柄ページを開く
        </a>
      </div>

      <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 24px;">
        <h4 style="font-size: 14px; color: #fbbf24; margin: 0 0 8px 0;">📣 フォロワー・読者の皆様へ投票を呼びかけましょう</h4>
        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 12px 0;">
          銘柄ページには、あなたのお名前と専門領域、公式プロフィールへのリンクが掲載されています。Xやnote、YouTube等でシェアして集合知を集めましょう！
        </p>
        <a href="${shareUrl}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; border: 1px solid #334155; text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: bold; border-radius: 6px;">
          𝕏 (Twitter) でシェアして投票を募る
        </a>
      </div>

      <div style="border-top: 1px solid #334155; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 4px 0;">未来レーダー運営事務局（ＤＥＬＩＣＩＯＵＳ株式会社）</p>
        <p style="margin: 0;">公式サイト: <a href="https://mirairadar.com" style="color: #38bdf8;">https://mirairadar.com</a></p>
      </div>
    </div>
  `;

  // 1. Worker API (/api/notify) 経由
  try {
    const workerRes = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.creatorEmail,
        subject,
        html: htmlContent,
      }),
    });
    if (workerRes.ok) {
      return { success: true, message: 'クリエイターへ上場通知メールを送信しました。' };
    }
  } catch {
    // Worker がないローカル環境等ではフォールバックへ
  }

  // 2. Resend API 直接呼び出し
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: '未来レーダー <notifications@mail.mirairadar.com>',
          to: payload.creatorEmail,
          subject,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, message: 'クリエイターへ上場通知メールを送信しました。' };
      }
    } catch (e) {
      console.warn('Resend approval notification failed:', e);
    }
  }

  console.info(`[Creator Approval Simulated] ${payload.creatorEmail} 宛て上場通知:\n`, payload);
  return { success: false, message: 'メール送信はスキップされました（開発ログ記録）。' };
}

export interface SponsorInquiryPayload {
  companyName: string;
  contactName: string;
  email: string;
  targetMarketTitle?: string;
  targetCategory?: string;
  budgetMonthly?: string;
  message: string;
}

/**
 * スポンサー・タイアップ出稿の問い合わせを管理者に即時通知
 */
export async function sendSponsorInquiryNotification(payload: SponsorInquiryPayload): Promise<{ success: boolean; message: string }> {
  const subject = `【未来レーダー】新規スポンサーシップ・タイアップのお問い合わせ（${payload.companyName}様）`;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'keita@next-standard.com';
  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #0b1320; color: #f8fafc;">
      <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #34d399; margin: 0; font-size: 20px;">未来レーダー スポンサー出稿・タイアップ問い合わせ</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">銘柄コンテクスト連動型ネイティブ広告への出稿希望が届きました</p>
      </div>

      <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background-color: #059669; color: #ffffff; margin-bottom: 10px;">
          💎 ネイティブ・スポンサーシップ出稿希望
        </span>
        <h3 style="font-size: 18px; color: #ffffff; margin: 4px 0;">${escapeHtml(payload.companyName)}</h3>
        <p style="font-size: 13px; color: #94a3b8; margin: 4px 0;">ご担当者様: <strong>${escapeHtml(payload.contactName)}</strong></p>
      </div>

      <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 6px 0;"><strong>✉️ 返信先メール:</strong> <a href="mailto:${escapeHtml(payload.email)}" style="color: #38bdf8;">${escapeHtml(payload.email)}</a></p>
        ${payload.targetMarketTitle ? `<p style="margin: 6px 0;"><strong>🎯 対象希望銘柄:</strong> ${escapeHtml(payload.targetMarketTitle)}</p>` : ''}
        ${payload.targetCategory ? `<p style="margin: 6px 0;"><strong>🏷️ 希望カテゴリー:</strong> ${escapeHtml(payload.targetCategory)}</p>` : ''}
        ${payload.budgetMonthly ? `<p style="margin: 6px 0;"><strong>💰 ご予算感（月額等）:</strong> ${escapeHtml(payload.budgetMonthly)}</p>` : ''}
        <div style="margin-top: 14px; padding: 12px; background-color: #0f172a; border-radius: 6px; border-left: 3px solid #10b981;">
          <strong>💬 ご相談・要望内容:</strong><br/>
          <span style="color: #cbd5e1; white-space: pre-wrap;">${escapeHtml(payload.message)}</span>
        </div>
      </div>

      <div style="border-top: 1px solid #334155; padding-top: 20px; text-align: center;">
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
          返信用メールアドレス（${escapeHtml(payload.email)}）へ直接ご返信いただくか、管理画面にてスポンサー枠を割り当ててください。
        </p>
        <a href="mailto:${escapeHtml(payload.email)}?subject=${encodeURIComponent(`Re: 未来レーダー スポンサーシップについて（${payload.companyName}様）`)}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 6px;">
          担当者へメール返信する
        </a>
      </div>
    </div>
  `;

  // 1. Worker API
  try {
    const workerRes = await fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: adminEmail,
        subject,
        html: htmlContent,
      }),
    });
    if (workerRes.ok) {
      return { success: true, message: 'スポンサー出稿のお問い合わせを送信しました。運営よりご連絡いたします。' };
    }
  } catch {}

  // 2. Resend API 直送
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: '未来レーダー <notifications@mail.mirairadar.com>',
          to: adminEmail,
          reply_to: payload.email,
          subject,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        return { success: true, message: 'スポンサー出稿のお問い合わせを送信しました。運営よりご連絡いたします。' };
      }
    } catch (e) {
      console.warn('Resend sponsor inquiry notification failed:', e);
    }
  }

  console.info(`[Sponsor Inquiry Simulated] ${adminEmail} 宛て問い合わせ:\n`, payload);
  return { success: true, message: 'スポンサー出稿のお問い合わせを受け付けました（シミュレーション）。' };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
