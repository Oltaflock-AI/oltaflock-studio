const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Oltaflock Studio <studio@oltaflock.ai>';

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// Email templates
const templates = {
  welcome: (name: string) => ({
    subject: 'Welcome to Oltaflock Creative Studio',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">Welcome to Oltaflock Creative Studio</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Your account has been created and you've been granted <strong>1,000 credits</strong> to get started.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">You can generate images and videos using our AI models. Each generation costs a certain number of credits based on the model and settings you choose.</p>
        <div style="margin: 32px 0;">
          <a href="https://studio.oltaflock.ai" style="background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Open Studio</a>
        </div>
        <p style="color: #999; font-size: 13px;">For internal use only. Do not share access credentials.</p>
      </div>
    `,
  }),

  generation_complete: (name: string, model: string, outputUrl: string) => ({
    subject: `Your ${model} generation is ready`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">Generation Complete</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Your <strong>${model}</strong> generation is ready.</p>
        <div style="margin: 24px 0;">
          <img src="${outputUrl}" alt="Generated output" style="max-width: 100%; border-radius: 12px; border: 1px solid #eee;" />
        </div>
        <div style="margin: 32px 0;">
          <a href="${outputUrl}" style="background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">View Output</a>
        </div>
        <p style="color: #999; font-size: 13px;">Oltaflock Creative Studio</p>
      </div>
    `,
  }),

  low_credits: (name: string, balance: number) => ({
    subject: 'Low credit balance - Oltaflock Studio',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">Low Credit Balance</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Your Oltaflock Studio credit balance is down to <strong>${balance} credits</strong>.</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Please contact your admin to get more credits added to your account.</p>
        <p style="color: #999; font-size: 13px;">Oltaflock Creative Studio</p>
      </div>
    `,
  }),

  password_reset: (name: string, resetLink: string) => ({
    subject: 'Reset your password - Oltaflock Studio',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">Reset Your Password</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Click the button below to reset your password.</p>
        <div style="margin: 32px 0;">
          <a href="${resetLink}" style="background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Reset Password</a>
        </div>
        <p style="color: #999; font-size: 13px;">If you didn't request this, ignore this email. This link expires in 1 hour.</p>
      </div>
    `,
  }),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();

    let emailData: EmailRequest;

    // If a template is specified, use it
    if (body.template) {
      const { template, to, data } = body;

      if (!templates[template as keyof typeof templates]) {
        return new Response(
          JSON.stringify({ error: `Unknown template: ${template}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let generated;
      switch (template) {
        case 'welcome':
          generated = templates.welcome(data.name || 'there');
          break;
        case 'generation_complete':
          generated = templates.generation_complete(data.name || 'there', data.model, data.outputUrl);
          break;
        case 'low_credits':
          generated = templates.low_credits(data.name || 'there', data.balance);
          break;
        case 'password_reset':
          generated = templates.password_reset(data.name || 'there', data.resetLink);
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Unknown template: ${template}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }

      emailData = { to, ...generated };
    }
    // Otherwise use raw email data
    else {
      const { to, subject, html, text, replyTo } = body;
      if (!to || !subject || !html) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      emailData = { to, subject, html, text, replyTo };
    }

    // Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.replyTo,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent:', result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send email error:', msg);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
