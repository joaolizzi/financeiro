import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const anon=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const client=url&&anon?createClient(url,anon,{auth:{persistSession:false}}):null;
const admin=url&&service?createClient(url,service,{auth:{persistSession:false}}):null;
const json=(res,status,data)=>res.status(status).json(data);

async function requireAdmin(req,res){
 if(!url)return json(res,500,{ok:false,error:'SUPABASE_URL não configurada no servidor.'}),null;
 if(!anon)return json(res,500,{ok:false,error:'Chave pública do Supabase não configurada no servidor.'}),null;
 if(!service)return json(res,500,{ok:false,error:'Configure SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) nas variáveis do Vercel e faça um novo deploy.'}),null;
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token){json(res,401,{ok:false,error:'Sessão ausente.'});return null}
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user){json(res,401,{ok:false,error:'Sessão inválida.'});return null}
 const {data:role,error:roleError}=await admin.from('app_admins').select('role').eq('user_id',user.id).maybeSingle();
 if(roleError){json(res,500,{ok:false,error:`Falha ao validar administrador: ${roleError.message}`});return null}
 if(!role){json(res,403,{ok:false,error:'Acesso restrito a administradores.'});return null}
 return {user,role:role.role};
}

async function audit(actor,action,targetUserId=null,targetEmail=null,metadata={}){
 const {error}=await admin.from('admin_audit_logs').insert({actor_id:actor.user.id,action,target_user_id:targetUserId,target_email:targetEmail,metadata});
 if(error&&error.code!=='42P01')console.error('audit:',error.message);
}

async function dashboard(res,actor){
 const [{data:users,error:usersError},{data:admins},{data:expenses},{data:cards},{data:incomes},{data:logs,error:logsError}]=await Promise.all([
  admin.auth.admin.listUsers({page:1,perPage:200}),
  admin.from('app_admins').select('user_id,role,created_at').order('created_at',{ascending:true}),
  admin.from('gastos').select('user_id,valor'),
  admin.from('credit_cards').select('user_id'),
  admin.from('rendas').select('user_id,valor'),
  admin.from('admin_audit_logs').select('id,actor_id,action,target_user_id,target_email,metadata,created_at').order('created_at',{ascending:false}).limit(40)
 ]);
 if(usersError)return json(res,500,{ok:false,error:usersError.message});
 const adminMap=new Map((admins||[]).map(a=>[a.user_id,a])),expenseMap=new Map(),cardMap=new Map(),incomeMap=new Map();
 for(const e of expenses||[]){const v=expenseMap.get(e.user_id)||{count:0,total:0};v.count++;v.total+=Number(e.valor||0);expenseMap.set(e.user_id,v)}
 for(const c of cards||[])cardMap.set(c.user_id,(cardMap.get(c.user_id)||0)+1);
 for(const r of incomes||[])incomeMap.set(r.user_id,(incomeMap.get(r.user_id)||0)+Number(r.valor||0));
 const base=users?.users||[],emailMap=new Map(base.map(u=>[u.id,u.email]));
 const list=base.map(u=>{const ex=expenseMap.get(u.id)||{count:0,total:0};return{id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,confirmed_at:u.email_confirmed_at||u.confirmed_at,role:adminMap.get(u.id)?.role||'user',banned_until:u.banned_until||null,metrics:{expenses:ex.count,totalSpent:ex.total,cards:cardMap.get(u.id)||0,income:incomeMap.get(u.id)||0}}});
 const auditLogs=logsError?[]:(logs||[]).map(l=>({...l,actor_email:emailMap.get(l.actor_id)||'Usuário removido'}));
 return json(res,200,{ok:true,data:{actorRole:actor.role,users:list,audit:auditLogs,stats:{users:list.length,admins:list.filter(u=>u.role!=='user').length,expenses:(expenses||[]).length,cards:(cards||[]).length,totalSpent:list.reduce((s,u)=>s+u.metrics.totalSpent,0)}}});
}

export default async function handler(req,res){
 try{
  const actor=await requireAdmin(req,res);if(!actor)return;
  if(req.method==='GET')return dashboard(res,actor);
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Método não permitido.'});
  const action=req.body?.action;

  if(action==='create-user'){
   const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||''),makeAdmin=Boolean(req.body?.makeAdmin);
   if(!email||password.length<6)return json(res,400,{ok:false,error:'Informe e-mail e senha com pelo menos 6 caracteres.'});
   const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
   if(error){const msg=String(error.message||'Erro ao criar usuário.');if(/already|registered|exists/i.test(msg))return json(res,409,{ok:false,error:'Já existe uma conta com este e-mail.'});return json(res,400,{ok:false,error:`Supabase Auth: ${msg}`})}
   if(!data?.user?.id)return json(res,500,{ok:false,error:'O Supabase não retornou o usuário criado.'});
   if(makeAdmin){const {error:roleError}=await admin.from('app_admins').insert({user_id:data.user.id,role:'admin',created_by:actor.user.id});if(roleError){await admin.auth.admin.deleteUser(data.user.id).catch(()=>{});return json(res,400,{ok:false,error:`Usuário não foi mantido porque a permissão de admin falhou: ${roleError.message}`})}}
   await audit(actor,'create_user',data.user.id,data.user.email,{role:makeAdmin?'admin':'user'});
   return json(res,200,{ok:true,data:{id:data.user.id,email:data.user.email}});
  }

  if(action==='set-role'){
   const userId=String(req.body?.userId||''),role=String(req.body?.role||'user');
   if(!userId||!['user','admin'].includes(role))return json(res,400,{ok:false,error:'Dados inválidos.'});
   if(userId===actor.user.id&&role==='user')return json(res,400,{ok:false,error:'Você não pode remover seu próprio acesso administrativo.'});
   const [{data:target},{data:{user:targetUser}}]=await Promise.all([admin.from('app_admins').select('role').eq('user_id',userId).maybeSingle(),admin.auth.admin.getUserById(userId)]);
   if(target?.role==='owner')return json(res,400,{ok:false,error:'O proprietário não pode ser rebaixado por este painel.'});
   if(role==='admin'){const {error}=await admin.from('app_admins').upsert({user_id:userId,role:'admin',created_by:actor.user.id},{onConflict:'user_id'});if(error)return json(res,400,{ok:false,error:error.message})}
   else{const {error}=await admin.from('app_admins').delete().eq('user_id',userId);if(error)return json(res,400,{ok:false,error:error.message})}
   await audit(actor,'set_role',userId,targetUser?.email,{role});return json(res,200,{ok:true});
  }

  if(action==='set-access'){
   const userId=String(req.body?.userId||''),disabled=Boolean(req.body?.disabled);if(!userId)return json(res,400,{ok:false,error:'Usuário inválido.'});
   if(userId===actor.user.id&&disabled)return json(res,400,{ok:false,error:'Você não pode bloquear sua própria conta.'});
   const {data:target}=await admin.from('app_admins').select('role').eq('user_id',userId).maybeSingle();if(target?.role==='owner')return json(res,400,{ok:false,error:'A conta do proprietário é protegida.'});
   const {data,error}=await admin.auth.admin.updateUserById(userId,disabled?{ban_duration:'876000h'}:{ban_duration:'none'});if(error)return json(res,400,{ok:false,error:error.message});
   await audit(actor,disabled?'disable_user':'enable_user',userId,data.user?.email,{disabled});return json(res,200,{ok:true});
  }

  if(action==='delete-user'){
   if(actor.role!=='owner')return json(res,403,{ok:false,error:'A exclusão de usuários exige confirmação do proprietário da aplicação.'});
   const userId=String(req.body?.userId||''),confirmEmail=String(req.body?.confirmEmail||'').trim().toLowerCase();
   if(!userId)return json(res,400,{ok:false,error:'Usuário inválido.'});
   if(userId===actor.user.id)return json(res,400,{ok:false,error:'Você não pode excluir sua própria conta.'});
   const [{data:target},{data:{user:targetUser},error:getError}]=await Promise.all([admin.from('app_admins').select('role').eq('user_id',userId).maybeSingle(),admin.auth.admin.getUserById(userId)]);
   if(getError||!targetUser)return json(res,404,{ok:false,error:'Usuário não encontrado.'});
   if(target?.role==='owner')return json(res,400,{ok:false,error:'A conta do proprietário não pode ser excluída.'});
   if(confirmEmail!==String(targetUser.email||'').trim().toLowerCase())return json(res,400,{ok:false,error:'Confirmação inválida. Digite exatamente o e-mail do usuário para excluir.'});
   await audit(actor,'delete_user',userId,targetUser.email,{role:target?.role||'user',confirmedByOwner:true});
   const {error}=await admin.auth.admin.deleteUser(userId);if(error)return json(res,400,{ok:false,error:`Não foi possível excluir o usuário: ${error.message}`});
   return json(res,200,{ok:true});
  }

  return json(res,400,{ok:false,error:'Ação administrativa desconhecida.'});
 }catch(error){console.error('admin api:',error);return json(res,500,{ok:false,error:'Erro interno no painel administrativo. Verifique as variáveis do Supabase e tente novamente.'})}
}
