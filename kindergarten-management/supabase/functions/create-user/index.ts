import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Verify requester is Admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'Admin') {
      throw new Error('Forbidden: Only admins can create users')
    }

    // 2. Create User via Admin API
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { email, password, full_name, phone, role } = await req.json()

    if (!email || !password || !role) {
      throw new Error('Missing required fields: email, password, role')
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone, role }
    })

    if (createError) throw createError

    // 3. Insert Profile (optional if trigger exists, but explicit is safer here)
    // Checking if profile already exists (trigger might have created it)
    const { data: existingProfile } = await adminClient
      .from('users')
      .select('id')
      .eq('id', newUser.user.id)
      .maybeSingle()

    if (!existingProfile) {
      const { error: insertError } = await adminClient
        .from('users')
        .insert({
          id: newUser.user.id,
          full_name,
          phone,
          role
        })

      if (insertError) throw insertError
    } else {
      // Update existing profile with correct metadata
      const { error: updateError } = await adminClient
        .from('users')
        .update({
          full_name,
          phone,
          role
        })
        .eq('id', newUser.user.id)

      if (updateError) throw updateError
    }

    return new Response(JSON.stringify({ user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
