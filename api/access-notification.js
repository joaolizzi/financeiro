import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const anon=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey=process.env.RESEND_API_KEY;
const fromEmail=process.env.RESEND_FROM_EMAIL;
const appUrl=process.env.FINANCE_APP_URL||process.env.APP_URL||'https://finan-a-rosy.vercel.app';
const client=url&&anon?createClient(url,anon,{auth:{persistSession:false}}):null;
const admin=url&&service?createClient(url,service,{auth:{persistSession:false}}):null;
const json=(res,status,data)=>res.status(status).json(data);
const normalizeEmail=value=>String(value||'').trim().toLowerCase();

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

async function requireAdmin(req,res){
 if(!url||!anon||!service){json(res,500,{ok:false,error:'Configuração do Supabase incompleta.'});return null}
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token){json(res,401,{ok:false,error:'Sessão ausente.'});return null}
 const{data:{user},error}=await client.auth.getUser(token);
 if(error||!user){json(res,401,{ok:false,error:'Sessão inválida.'});return null}
 const{data:role,error:roleError}=await admin.from('app_admins').select('role').eq('user_id',user.id).maybeSingle();
 if(roleError||!role){json(res,403,{ok:false,error:'Acesso restrito a administradores.'});return null}
 return user;
}

function emailTemplate(email,decision){
 const approved=decision==='approve';
 const title=approved?'Seu acesso ao Finanças foi aprovado':'Sua solicitação de acesso foi analisada';
 const message=approved?'Sua conta foi liberada e você já pode entrar no Finanças usando o e-mail e a senha cadastrados.':'Sua solicitação de acesso ao Finanças não foi aprovada neste momento.';
 const action=approved?`<a href="${escapeHtml(appUrl)}" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#eef1ff;color:#10141d;text-decoration:none;font-weight:800">Entrar no Finanças</a>`:'';
 return{
  subject:approved?'Acesso ao Finanças aprovado':'Atualização sobre seu acesso ao Finanças',
  html:`<!doctype html><html><body style="margin:0;background:#080b11;font-family:Arial,sans-serif;color:#eef1f6"><div style="max-width:560px;margin:0 auto;padding:38px 20px"><div style="padding:28px;border:1px solid #252d3a;border-radius:18px;background:#101620"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#aeb8ff">FINANÇAS</div><h1 style="margin:14px 0 10px;font-size:25px">${title}</h1><p style="margin:0;color:#98a3b4;line-height:1.65">${message}</p>${action}<div style="margin-top:28px;padding-top:18px;border-top:1px solid #252d3a;color:#657086;font-size:12px">Conta: ${escapeHtml(email)}</div></div></div></body></html>`
 };
}

export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
 const actor=await requireAdmin(req,res);if(!actor)return;
 const email=normalizeEmail(req.body?.email),decision=String(req.body?.decision||'');
 if(!/^\S+@\S+\.\S+$/.test(email)||!['approve','reject'].includes(decision))return json(res,400,{ok:false,error:'Dados da notificação inválidos.'});
 if(!resendKey||!fromEmail)return json(res,503,{ok:false,error:'Configure RESEND_API_KEY e RESEND_FROM_EMAIL no Vercel.'});
 const template=emailTemplate(email,decision);
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:fromEmail,to:[email],subject:template.subject,html:template.html})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){console.error('resend:',body);return json(res,502,{ok:false,error:body?.message||'O Resend não conseguiu enviar a notificação.'})}
  return json(res,200,{ok:true,data:{id:body?.id||null,sent:true}});
 }catch(error){console.error('access notification:',error);return json(res,502,{ok:false,error:'Não foi possível enviar a notificação por e-mail.'})}
}
