import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const anon=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const client=url&&anon?createClient(url,anon,{auth:{persistSession:false}}):null;
const admin=url&&service?createClient(url,service,{auth:{persistSession:false}}):null;
const json=(res,status,data)=>res.status(status).json(data);

export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
 if(!url||!anon||!service)return json(res,500,{ok:false,error:'Autenticação privada não está configurada no servidor.'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{ok:false,error:'Sessão ausente.'});
 const{data:{user},error}=await client.auth.getUser(token);
 if(error||!user)return json(res,401,{ok:false,error:'Sessão inválida.'});
 const email=String(user.email||'').trim().toLowerCase();
 if(!email)return json(res,403,{ok:false,error:'Sua conta não possui um e-mail válido.'});
 const{data:allowed,error:allowError}=await admin.from('app_access_emails').select('email').eq('email',email).maybeSingle();
 if(allowError?.code==='42P01')return json(res,200,{ok:true,configured:false});
 if(allowError)return json(res,500,{ok:false,error:'Não foi possível validar o acesso privado.'});
 if(allowed)return json(res,200,{ok:true,configured:true,allowed:true});
 const provider=String(user.app_metadata?.provider||'');
 if(provider==='google'){
  await admin.auth.admin.deleteUser(user.id).catch(()=>{});
  return json(res,403,{ok:false,configured:true,allowed:false,error:'Esta conta Google não está autorizada a acessar o Finanças.'});
 }
 return json(res,403,{ok:false,configured:true,allowed:false,error:'Esta conta não está autorizada a acessar o Finanças.'});
}
