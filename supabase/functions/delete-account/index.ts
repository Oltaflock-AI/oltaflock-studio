import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's JWT to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Use service role client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Delete user's storage files (avatars + generation uploads)
    const buckets = ['avatars', 'generation-uploads'];
    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage
        .from(bucket)
        .list(userId);

      if (files && files.length > 0) {
        const paths = files.map(f => `${userId}/${f.name}`);
        await adminClient.storage.from(bucket).remove(paths);
        console.log(`Deleted ${paths.length} files from ${bucket}`);
      }
    }

    // 2. Delete user data from tables (cascade handles most, but be explicit)
    // credit_logs
    await adminClient.from('credit_logs').delete().eq('user_id', userId);
    // generations (and jobs if they reference generations)
    await adminClient.from('generations').delete().eq('user_id', userId);
    // jobs
    await adminClient.from('jobs').delete().eq('user_id', userId);
    // user_credits
    await adminClient.from('user_credits').delete().eq('user_id', userId);
    // profiles
    await adminClient.from('profiles').delete().eq('user_id', userId);

    console.log(`Deleted all data for user: ${userId}`);

    // 3. Delete the auth user (must be last)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth user deleted: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account and all data deleted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting account:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to delete account', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
