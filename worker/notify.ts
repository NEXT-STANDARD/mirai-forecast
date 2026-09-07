/**
 * 🔔 未来レーダー 管理者通知 API (/api/notify)
 *
 * 公認クリエイター審査申請やユーザー問い提案を受信した際、
 * 管理者宛てにメール通知を安全にディスパッチする。
 */

export interface NotifyEnv {
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
}

export async function handleNotify(request: Request, env: NotifyEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as {
      to?: string;
      subject?: string;
      html?: string;
      payload?: any;
    };

    const targetEmail = body.to || env.ADMIN_EMAIL || 'support@mirairadar.com';
    const apiKey = env.RESEND_API_KEY;

    if (!apiKey) {
      // APIキー未設定の場合はローカル環境や開発環境として200で成功扱いにし、ログを記録
      console.info('[Notify API] RESEND_API_KEY未設定のため、通知ログを記録しました:', {
        targetEmail,
        subject: body.subject,
        payload: body.payload,
      });
      return new Response(JSON.stringify({ success: true, mocked: true, message: 'Logged to worker console' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: '未来レーダー通知 <onboarding@resend.dev>',
        to: targetEmail,
        subject: body.subject || '【未来レーダー】新規の申請が届きました',
        html: body.html || '<p>新しい申請が届きました。</p>',
      }),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error('[Notify API] Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email via Resend', details: errorText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await resendRes.json();
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Notify API] Internal Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
