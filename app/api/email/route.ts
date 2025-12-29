import { NextRequest, NextResponse } from 'next/server';

// Email notification service using Resend
// Note: You need to set RESEND_API_KEY in your environment variables
// Sign up at https://resend.com and get an API key

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

async function sendEmail(payload: EmailPayload) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.warn('RESEND_API_KEY not set, email not sent');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Veegan.jp <noreply@veegan.jp>',
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend API error:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: String(error) };
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { type, data } = body;

    let emailPayload: EmailPayload | null = null;

    switch (type) {
        case 'reservation_created':
            // Send to user
            emailPayload = {
                to: data.user_email,
                subject: `【Veegan.jp】予約リクエストを受け付けました - ${data.restaurant_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #16a34a;">予約リクエストを受け付けました</h2>
                        <p>${data.user_name} 様</p>
                        <p><strong>${data.restaurant_name}</strong> への予約リクエストを受け付けました。</p>
                        <p>レストランからの確認をお待ちください。承認・拒否の結果はメールでお知らせします。</p>
                        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
                        <p style="color: #78716c; font-size: 14px;">Veegan.jp - ビーガン・ベジタリアン対応レストラン予約</p>
                    </div>
                `,
            };
            break;

        case 'reservation_confirmed':
            emailPayload = {
                to: data.user_email,
                subject: `【Veegan.jp】予約が承認されました - ${data.restaurant_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #16a34a;">🎉 予約が承認されました</h2>
                        <p>${data.user_name} 様</p>
                        <p><strong>${data.restaurant_name}</strong> への予約が承認されました！</p>
                        <p>ご来店をお待ちしております。</p>
                        ${data.owner_note ? `<p><strong>レストランからのメッセージ:</strong> ${data.owner_note}</p>` : ''}
                        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
                        <p style="color: #78716c; font-size: 14px;">Veegan.jp - ビーガン・ベジタリアン対応レストラン予約</p>
                    </div>
                `,
            };
            break;

        case 'reservation_rejected':
            emailPayload = {
                to: data.user_email,
                subject: `【Veegan.jp】予約について - ${data.restaurant_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">予約をお受けできませんでした</h2>
                        <p>${data.user_name} 様</p>
                        <p>申し訳ございませんが、<strong>${data.restaurant_name}</strong> への予約をお受けすることができませんでした。</p>
                        ${data.owner_note ? `<p><strong>レストランからのメッセージ:</strong> ${data.owner_note}</p>` : ''}
                        <p>他のレストランをお探しいただくか、別の日程で再度お試しください。</p>
                        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
                        <p style="color: #78716c; font-size: 14px;">Veegan.jp - ビーガン・ベジタリアン対応レストラン予約</p>
                    </div>
                `,
            };
            break;

        case 'inquiry_received':
            // Send to restaurant owner (or admin for now)
            emailPayload = {
                to: data.owner_email || 'admin@veegan.jp',
                subject: `【Veegan.jp】お客様からのお問い合わせ - ${data.restaurant_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #7c3aed;">🌱 お客様からのお問い合わせ</h2>
                        <p>以下のお客様があなたのレストランに興味を持っています：</p>
                        <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <p><strong>お客様名:</strong> ${data.user_name}</p>
                            <p><strong>メール:</strong> ${data.user_email}</p>
                            <p><strong>食事制限:</strong> ${(data.dietary_tags || []).join(', ') || 'なし'}</p>
                        </div>
                        <p>このお客様に対応可能かどうか、オーナー管理画面からご回答ください。</p>
                        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
                        <p style="color: #78716c; font-size: 14px;">Veegan.jp - ビーガン・ベジタリアン対応レストラン予約</p>
                    </div>
                `,
            };
            break;

        default:
            return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    const result = await sendEmail(emailPayload);
    return NextResponse.json(result);
}
