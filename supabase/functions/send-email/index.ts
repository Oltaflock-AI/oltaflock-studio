const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'PROMUNCH Studio <studio@promunch.in>';
const APP_URL = (Deno.env.get('SITE_URL') || 'https://studio.promunch.in').replace(/\/$/, '');

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// PROMUNCH layout: ink header with the wordmark, cream body, red button.
const FONT = "'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const button = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; background: #E1251B; color: #fff; padding: 13px 26px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;">${label}</a>`;
const p = (html: string) => `<p style="color: #3d3a36; font-size: 15px; line-height: 1.6; margin: 0 0 14px;">${html}</p>`;
const layout = (title: string, body: string) => `
  <div style="background: #FFF8EE; padding: 32px 12px; font-family: ${FONT};">
    <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #efe4d3;">
      <div style="background: #141414; padding: 22px 28px;">
        <div style="font-family: 'Archivo Black', ${FONT}; font-size: 24px; color: #FFF8EE; letter-spacing: -0.02em;">PROMUNCH</div>
        <div style="font-size: 10px; font-weight: 800; letter-spacing: .22em; color: #E1251B; text-transform: uppercase; margin-top: 4px;">Your munchy pal · Studio</div>
      </div>
      <div style="padding: 30px 28px;">
        <h1 style="font-family: 'Archivo Black', ${FONT}; font-size: 24px; color: #141414; margin: 0 0 16px; text-transform: uppercase; letter-spacing: -0.01em;">${title}</h1>
        ${body}
      </div>
    </div>
    <p style="max-width: 560px; margin: 16px auto 0; color: #8a8278; font-size: 12px; text-align: center;">PROMUNCH Studio · for the PROMUNCH team only</p>
  </div>`;

// Email templates
const templates = {
  welcome: (name: string) => ({
    subject: "You're in: PROMUNCH Studio",
    html: layout(`Welcome, ${name}`, [
      p("You're on the PROMUNCH Studio team. Make posts, posters, pack ideas and reels with the real packs and the brand rules built in."),
      p('Start from Home: pick a job, fill in the brief, and send it for review when it looks right.'),
      `<div style="margin: 26px 0 8px;">${button(`${APP_URL}/`, 'Open PROMUNCH Studio')}</div>`,
    ].join('')),
  }),

  generation_complete: (name: string, model: string, outputUrl: string) => ({
    subject: `Ready: your ${model} result`,
    html: layout('It\'s ready', [
      p(`Hi ${name}, your <strong>${model}</strong> result is done.`),
      `<div style="margin: 20px 0;"><img src="${outputUrl}" alt="Your result" style="max-width: 100%; border-radius: 12px; border: 1px solid #efe4d3;" /></div>`,
      `<div style="margin: 24px 0 8px;">${button(outputUrl, 'View it')}</div>`,
    ].join('')),
  }),

  low_credits: (name: string, balance: number) => ({
    subject: 'Credits running low · PROMUNCH Studio',
    html: layout('Credits running low', [
      p(`Hi ${name}, the team's balance is down to <strong>${balance} credits</strong>.`),
      p('Ask your admin to top up the Kie.ai account so the team can keep making.'),
    ].join('')),
  }),

  password_reset: (name: string, resetLink: string) => ({
    subject: 'Reset your password · PROMUNCH Studio',
    html: layout('Reset your password', [
      p(`Hi ${name}, use the button below to set a new password.`),
      `<div style="margin: 24px 0 14px;">${button(resetLink, 'Reset password')}</div>`,
      p('<span style="color: #8a8278; font-size: 13px;">Didn\'t ask for this? Ignore this email. The link expires in 1 hour.</span>'),
    ].join('')),
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
