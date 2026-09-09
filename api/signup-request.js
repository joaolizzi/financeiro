import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const service=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin=url&&service?createClient(url,service,{auth:{persistSession:false}}):null;
const json=(res,status,data)=>res.status(status).json(data);
const normalizeEmail=value=>String(value||'').trim().toLowerCase();

async function findUserByEmail(email){
 for(let page=1;page<=5;page++){
  const{data,error}=await admin.auth.admin.listUsers({page,perPage:200});
  if(error)throw error;
  const user=(data?.users||[]).find(u=>normalizeEmail(u.email)===email);
  if(user)return user;
  if((data?.users||[]).length<200)break;
 }
 return null;
}

export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
 if(!url||!service)return json(res,500,{ok:false,error:'Cadastro temporariamente indisponível.'});
 const email=normalizeEmail(req.body?.email),password=String(req.body?.password||'');
 if(!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{ok:false,error:'Informe um e-mail válido.'});
 if(password.length<6)return json(res,400,{ok:false,error:'A senha precisa ter pelo menos 6 caracteres.'});
 try{
  const existing=await findUserByEmail(email);
  if(existing){
   const{data:reqRow}=await admin.from('finance_signup_requests').select('status').eq('user_id',existing.id).maybeSingle();
   if(reqRow?.status==='pending')return json(res,409,{ok:false,error:'Sua solicitação já está aguardando aprovação do administrador.'});
   if(reqRow?.status==='approved')return json(res,409,{ok:false,error:'Essa conta já foi aprovada. Use a tela de login.'});
   return json(res,409,{ok:false,error:'Já existe uma conta com este e-mail.'});
  }

  // Pre-authorize the email so an optional Before User Created hook can coexist
  // with the moderated signup flow. The Auth account remains banned until approval.
  const{error:allowError}=await admin.from('app_access_emails').upsert({email},{onConflict:'email'});
  if(allowError&&allowError.code!=='42P01')throw allowError;

  const{data,error:createError}=await admin.auth.admin.createUser({
   email,
   password,
   email_confirm:true,
   ban_duration:'876000h',
   user_metadata:{access_status:'pending'}
  });
  if(createError){
   if(!allowError)await admin.from('app_access_emails').delete().eq('email',email).catch(()=>{});
   throw createError;
  }
  const user=data?.user;
  if(!user?.id)throw new Error('O Supabase não retornou o usuário criado.');

  const{error:requestError}=await admin.from('finance_signup_requests').insert({user_id:user.id,email,status:'pending'});
  if(requestError){
   await admin.auth.admin.deleteUser(user.id).catch(()=>{});
   await admin.from('app_access_emails').delete().eq('email',email).catch(()=>{});
   throw requestError;
  }
  return json(res,200,{ok:true,data:{status:'pending'},message:'Conta criada. Aguarde a aprovação do administrador para entrar.'});
 }catch(error){
  console.error('signup request:',error);
  return json(res,500,{ok:false,error:'Não foi possível enviar a solicitação agora. Tente novamente em instantes.'});
 }
}
