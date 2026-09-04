import { createClient } from '@supabase/supabase-js';

const supabaseUrl=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const supabasePublicKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    if(!supabaseUrl||!supabasePublicKey)return res.status(500).json({error:'Supabase não está configurado corretamente no servidor.'});
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sessão não encontrada.' });

    const supabase = createClient(supabaseUrl, supabasePublicKey,{auth:{persistSession:false}});
    const token = auth.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

    const { question, context } = req.body || {};
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return res.status(400).json({ error: 'Digite uma pergunta.' });
    }
    if(question.length>4000)return res.status(400).json({error:'A pergunta ficou muito longa. Resuma para até 4.000 caracteres.'});

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'A IA ainda não está configurada no servidor.' });

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const safeContext = JSON.stringify(context || {}).slice(0, 30000);

    const systemInstruction = `Você é o assistente financeiro pessoal do aplicativo Finanças. Analise SOMENTE os dados fornecidos pelo usuário. Nunca invente valores. Responda em português do Brasil, de forma objetiva, clara e útil. Pode calcular totais, médias, percentuais e comparar dados usando somente as informações fornecidas. Não dê recomendações de investimento específicas nem trate sua resposta como aconselhamento financeiro profissional. Se não houver dados suficientes, diga claramente.`;

    const input = `DADOS DO USUÁRIO:\n${safeContext}\n\nPERGUNTA:\n${question.trim()}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model,
        input,
        system_instruction: systemInstruction,
        store: false
      })
    });

    let result={};
    try{result=await response.json()}catch{return res.status(502).json({error:'A IA respondeu em um formato inválido.'})}
    if (!response.ok) {
      return res.status(response.status).json({
        error: result?.error?.message || result?.errors?.[0]?.message || 'Não foi possível consultar a IA.'
      });
    }

    const text = result?.output_text || result?.steps
      ?.filter(step => step?.type === 'model_output')
      ?.flatMap(step => step?.content || [])
      ?.filter(item => item?.type === 'text')
      ?.map(item => item.text || '')
      ?.join('')
      ?.trim();

    if (!text) return res.status(502).json({ error: 'A IA não retornou uma resposta.' });

    return res.status(200).json({ answer: text });
  } catch (error) {
    console.error('finance-ai:', error);
    return res.status(500).json({ error: 'Erro ao consultar a IA.' });
  }
}
