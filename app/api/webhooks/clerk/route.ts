import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Get webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  // If no webhook secret, skip verification (development mode)
  let evt: WebhookEvent

  if (webhookSecret) {
    // Create a new Svix instance with your secret
    const wh = new Webhook(webhookSecret)

    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Webhook verification failed', { status: 400 })
    }
  } else {
    // Development mode - trust the payload
    evt = payload as WebhookEvent
  }

  const eventType = evt.type

  // Handle user.created event
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address

    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('users')
      .upsert({
        clerk_id: id,
        email: primaryEmail || '',
        first_name: first_name || null,
        last_name: last_name || null,
        full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
        profile_image_url: image_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clerk_id'
      })

    if (error) {
      console.error('Error saving user to database:', error)
      return new Response('Failed to save user', { status: 500 })
    }

    console.log(`User created: ${id} (${primaryEmail})`)
  }

  // Handle user.updated event
  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, last_sign_in_at } = evt.data

    const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address

    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('users')
      .upsert({
        clerk_id: id,
        email: primaryEmail || '',
        first_name: first_name || null,
        last_name: last_name || null,
        full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
        profile_image_url: image_url || null,
        last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clerk_id'
      })

    if (error) {
      console.error('Error updating user in database:', error)
      return new Response('Failed to update user', { status: 500 })
    }

    console.log(`User updated: ${id}`)
  }

  // Handle user.deleted event
  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (id) {
      const supabase = getSupabaseAdmin()
      
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('clerk_id', id)

      if (error) {
        console.error('Error deactivating user:', error)
        return new Response('Failed to deactivate user', { status: 500 })
      }

      console.log(`User deactivated: ${id}`)
    }
  }

  // Handle session.created event (track logins)
  if (eventType === 'session.created') {
    const { user_id } = evt.data

    if (user_id) {
      const supabase = getSupabaseAdmin()
      
      await supabase
        .from('users')
        .update({ 
          last_sign_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('clerk_id', user_id)

      // Log activity
      await supabase
        .from('user_activity')
        .insert({
          user_id: user_id,
          action_type: 'login',
          created_at: new Date().toISOString()
        })

      console.log(`User login tracked: ${user_id}`)
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
