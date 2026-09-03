import React,{useEffect,useMemo,useState} from 'react';
import {ShieldCheck,Users,ReceiptText,CreditCard,UserPlus,RefreshCw,Crown,Shield,UserRound,CheckCircle2,AlertTriangle} from 'lucide-react';
import './AdminPanel.css';

const date=v=>v?new Date(v).toLocaleDateString('pt-BR'):'—';

export default function AdminPanel({session}){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[query,setQuery]=useState('');
 async function request(body){
  const r=await fetch('/api/admin',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Falha no painel administrativo.');return j;
 }
 async function load(){setLoading(true);setError('');try{const j=await request();setData(j.data)}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function createUser(e){e.preventDefault();setSaving(true);setError('');const f=new FormData(e.currentTarget);try{await request({action:'create-user',email:f.get('email'),password:f.get('password'),makeAdmin:f.get('makeAdmin')==='on'});e.currentTarget.reset();await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
 async function setRole(userId,role){setSaving(true);setError('');try{await request({action:'set-role',userId,role});await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
 const users=useMemo(()=>{const q=query.toLowerCase().trim();return (data?.users||[]).filter(u=>!q||String(u.email||'').toLowerCase().includes(q)||u.role.includes(q))},[data,query]);
 if(loading)return <section className="admin-shell"><div className="admin-loading"><RefreshCw className="spin" size={22}/> Carregando painel administrativo...</div></section>;
 return <section className="admin-shell">
  <div className="admin-hero"><div><span><ShieldCheck size={14}/> ADMIN CONTROL</span><h2>Painel administrativo</h2><p>Gerencie usuários, permissões e acompanhe a atividade geral do Finanças.</p></div><div className="admin-role"><Crown size={16}/><span>Seu nível</span><b>{data?.actorRole==='owner'?'Proprietário':'Administrador'}</b></div></div>
  {error&&<div className="admin-error"><AlertTriangle size={16}/>{error}</div>}
  <div className="admin-stats">
   <article><Users size={18}/><span>Usuários</span><strong>{data?.stats?.users||0}</strong></article>
   <article><Shield size={18}/><span>Admins</span><strong>{data?.stats?.admins||0}</strong></article>
   <article><ReceiptText size={18}/><span>Gastos registrados</span><strong>{data?.stats?.expenses||0}</strong></article>
   <article><CreditCard size={18}/><span>Cartões cadastrados</span><strong>{data?.stats?.cards||0}</strong></article>
  </div>
  <div className="admin-grid">
   <article className="panel admin-create"><div className="admin-section-head"><div><span>NOVO ACESSO</span><h3>Adicionar usuário</h3></div><UserPlus size={20}/></div><form onSubmit={createUser}><label>E-mail</label><input name="email" type="email" required placeholder="usuario@email.com"/><label>Senha inicial</label><input name="password" type="password" minLength="6" required placeholder="Mínimo de 6 caracteres"/><label className="admin-check"><input name="makeAdmin" type="checkbox"/><span><b>Criar como administrador</b><small>Esse usuário poderá acessar este painel e promover outros usuários.</small></span></label><button className="primary" disabled={saving}>{saving?'Salvando...':'Criar usuário'}</button></form></article>
   <article className="panel admin-users"><div className="admin-section-head"><div><span>ACESSOS</span><h3>Usuários cadastrados</h3></div><button className="admin-refresh" onClick={load}><RefreshCw size={15}/></button></div><input className="admin-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por e-mail ou função..."/><div className="admin-user-list">{users.map(u=><div className="admin-user" key={u.id}><div className={`admin-avatar role-${u.role}`}>{u.role==='owner'?<Crown size={16}/>:u.role==='admin'?<Shield size={16}/>:<UserRound size={16}/>}</div><div className="admin-user-main"><b>{u.email||'Sem e-mail'}</b><span>Criado em {date(u.created_at)} • Último acesso {date(u.last_sign_in_at)}</span></div><div className={`admin-badge role-${u.role}`}>{u.role==='owner'?'OWNER':u.role==='admin'?'ADMIN':'USUÁRIO'}</div><div className="admin-user-actions">{u.role==='owner'?<span className="admin-protected"><CheckCircle2 size={14}/> Protegido</span>:u.role==='admin'?<button disabled={saving} onClick={()=>setRole(u.id,'user')}>Remover admin</button>:<button disabled={saving} onClick={()=>setRole(u.id,'admin')}>Tornar admin</button>}</div></div>)}{!users.length&&<div className="admin-empty">Nenhum usuário encontrado.</div>}</div></article>
  </div>
 </section>;
}
