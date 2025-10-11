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
    const { phoneNumber, instanceName } = await req.json()

    if (!phoneNumber || !instanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'phoneNumber e instanceName são obrigatórios' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL')
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY')

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      throw new Error('Credenciais da Evolution API não configuradas')
    }

    console.log('Verificando se é WhatsApp:', phoneNumber, 'na instância:', instanceName)

    // Verificar se o número é WhatsApp usando a Evolution API
    const response = await fetch(`${EVO_BASE_URL}/chat/checkIsWhatsapp/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': EVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numbers: [phoneNumber]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro da Evolution API:', errorText)
      throw new Error(`Erro ao verificar WhatsApp: ${errorText}`)
    }

    const data = await response.json()
    console.log('Resposta da verificação:', data)

    // A resposta vem como array de objetos com o formato:
    // [{ jid: "5511999999999@s.whatsapp.net", exists: true }]
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    return new Response(
      JSON.stringify({ 
        success: true,
        isWhatsApp: result.exists || false,
        jid: result.jid || null,
        data: result
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
