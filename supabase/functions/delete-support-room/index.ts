// @ts-nocheck
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }

    // Create Supabase client with the user's session
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Create admin client for operations that need elevated permissions
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user has admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid user session')
    }

    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      throw new Error('Access denied. Admin role required.')
    }

    // Get room ID from request
    const { roomId } = await req.json()
    if (!roomId) {
      throw new Error('Room ID is required')
    }

    console.log(`Starting deletion process for room: ${roomId}`)

    // Step 1: Get all attendance IDs for this room first
    const { data: attendances, error: getAttendancesError } = await supabaseAdmin
      .from('attendances')
      .select('id')
      .eq('room_id', roomId)

    if (getAttendancesError) {
      console.error('Error getting attendances:', getAttendancesError)
    }

    // Step 2: Delete all messages related to these attendances
    if (attendances && attendances.length > 0) {
      const attendanceIds = attendances.map(a => a.id)
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .in('attendance_id', attendanceIds)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        // Continue anyway, as CASCADE should handle this
      }
    }

    // Step 3: Delete all attendances in this room
    const { error: attendancesError } = await supabaseAdmin
      .from('attendances')
      .delete()
      .eq('room_id', roomId)

    if (attendancesError) {
      console.error('Error deleting attendances:', attendancesError)
      // Continue anyway, as CASCADE should handle this
    }

    // Step 4: Delete all room members
    const { error: membersError } = await supabaseAdmin
      .from('room_members')
      .delete()
      .eq('room_id', roomId)

    if (membersError) {
      console.error('Error deleting room members:', membersError)
      // Continue anyway, as CASCADE should handle this
    }

    // Step 5: Finally delete the room itself
    const { error: roomError } = await supabaseAdmin
      .from('support_rooms')
      .delete()
      .eq('id', roomId)

    if (roomError) {
      console.error('Error deleting room:', roomError)
      throw new Error(`Failed to delete room: ${roomError.message}`)
    }

    console.log(`Successfully deleted room: ${roomId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Room deleted successfully',
        roomId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in delete-support-room function:', (error as Error).message)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})