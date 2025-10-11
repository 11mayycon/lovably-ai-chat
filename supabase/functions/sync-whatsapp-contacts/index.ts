import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL')
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY')

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      throw new Error('Evolution API credentials not configured')
    }

    // Pegar o user autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Sincronizando contatos para usuário:', user.id)

    // Buscar instâncias conectadas do usuário
    const { data: connections, error: connectionsError } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_name, status')
      .eq('admin_user_id', user.id)
      .eq('status', 'connected')

    if (connectionsError) {
      console.error('Erro ao buscar conexões:', connectionsError)
      throw connectionsError
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma instância conectada encontrada',
          contacts: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let allContacts: any[] = []

    // Para cada instância conectada, buscar contatos
    for (const connection of connections) {
      try {
        console.log('Buscando contatos para instância:', connection.instance_name)

        // Buscar contatos da Evolution API
        const contactsResponse = await fetch(
          `${EVO_BASE_URL}/chat/findContacts/${connection.instance_name}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!contactsResponse.ok) {
          console.error(`Erro ao buscar contatos da instância ${connection.instance_name}`)
          continue
        }

        const contactsData = await contactsResponse.json()
        console.log(`Contatos encontrados para ${connection.instance_name}:`, contactsData.length || 0)

        // Processar e salvar contatos no banco
        if (Array.isArray(contactsData) && contactsData.length > 0) {
          for (const contact of contactsData) {
            const contactPhone = contact.id?.replace('@s.whatsapp.net', '') || contact.remoteJid?.replace('@s.whatsapp.net', '')
            const contactName = contact.name || contact.pushName || contact.verifiedName || contactPhone

            if (!contactPhone) continue

            // Inserir ou atualizar contato
            const { error: upsertError } = await supabase
              .from('whatsapp_contacts')
              .upsert({
                whatsapp_connection_id: connection.id,
                contact_phone: contactPhone,
                contact_name: contactName,
                profile_pic_url: contact.profilePictureUrl || null,
                is_group: contactPhone.includes('@g.us') || false,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'whatsapp_connection_id,contact_phone'
              })

            if (upsertError) {
              console.error('Erro ao salvar contato:', upsertError)
            } else {
              allContacts.push({
                id: contactPhone,
                name: contactName,
                phone: contactPhone,
                profilePicUrl: contact.profilePictureUrl || null,
                isGroup: contactPhone.includes('@g.us') || false,
                instanceName: connection.instance_name,
                whatsappConnectionId: connection.id,
                isWhatsApp: true,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao processar instância ${connection.instance_name}:`, error)
        continue
      }
    }

    console.log('Total de contatos sincronizados:', allContacts.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${allContacts.length} contatos sincronizados com sucesso`,
        contacts: allContacts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
