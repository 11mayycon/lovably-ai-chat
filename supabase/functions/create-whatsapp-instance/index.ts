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
    let body;
    try {
      const text = await req.text()
      console.log('Request body text:', text)
      body = text ? JSON.parse(text) : {}
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Body da requisição inválido ou vazio' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { instanceName } = body

    if (!instanceName || typeof instanceName !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'instanceName é obrigatório e deve ser uma string' 
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

    console.log('Criando instância:', instanceName)

    // Criar instância na Evolution API
    const evolutionResponse = await fetch(`${EVO_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        token: EVO_API_KEY,
      }),
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error('Erro da Evolution API:', errorData)
      throw new Error(`Erro ao criar instância: ${errorData}`)
    }

    const evolutionData = await evolutionResponse.json()
    console.log('Instância criada com sucesso:', evolutionData)

    // Aguardar um pouco para a instância estar pronta
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Buscar QR Code imediatamente após criar a instância
    let qrCodeData = null
    try {
      console.log('Buscando QR code para:', instanceName)
      const qrResponse = await fetch(`${EVO_BASE_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVO_API_KEY,
        },
      })

      if (qrResponse.ok) {
        const rawQrData = await qrResponse.json()
        console.log('QR code obtido:', { hasBase64: !!rawQrData?.base64, hasCode: !!rawQrData?.code })
        
        // Garantir que o base64 tenha o prefixo correto
        if (rawQrData?.base64) {
          let base64Image = rawQrData.base64;
          if (!base64Image.startsWith('data:image/')) {
            base64Image = `data:image/png;base64,${base64Image}`;
          }
          qrCodeData = {
            base64: base64Image,
            code: rawQrData.code || ''
          }
        }
      } else {
        console.warn('QR code não disponível ainda, status:', qrResponse.status)
      }
    } catch (qrError) {
      console.warn('Erro ao buscar QR code:', qrError)
    }

    // Salvar no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Não autorizado')
    }

    const { error: insertError } = await supabase
      .from('whatsapp_connections')
      .insert({
        instance_name: instanceName,
        status: 'disconnected',
        admin_user_id: user.id,
      })

    if (insertError) {
      console.error('Erro ao salvar no banco:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: evolutionData,
        qrCode: qrCodeData,
        instanceName 
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
