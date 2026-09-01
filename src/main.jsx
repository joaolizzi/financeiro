import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, LockKeyhole, Trash2, LogOut, LoaderCircle, Pencil } from 'lucide-react';
import { supabase } from './lib/supabase';
import './styles.css';

const categories = ['Moradia','Alimentação','Transporte','Lazer','Compras','Contas','Assinaturas','Investimentos','Outros'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

function Login({ onLogin }) {
  const [email,setEmail]=useState(''); const [pass,setPass]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e){
    e.preventDefault(); setError(''); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if(error){ setError(error.message.includes('Email not confirmed') ? 'Confirme seu e-mail no Supabase ou desative a confirmação de e-mail.' : 'E-mail ou senha inválidos.'); return; }
    onLogin(data.user);
  }
  return <main className="login-page"><section className="login-card"><div className="brand"><div className="logo"><Wallet size={22}/></div><span>Finanças</span></div><div className="lock"><LockKeyhole size={24}/></div><h1>Bem-vindo de volta</h1><p>Acesse seu controle financeiro.</p><form onSubmit={submit}><label>E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Seu e-mail" autoComplete="username" required/><label>Senha</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required/>{error&&<div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading?<><LoaderCircle size={17} className="spin"/> Entrando...</>:'Entrar'}</button></form><small>Área privada • acesso pessoal</small></section></main>
}

function App(){
 const [session,setSession]=useState(undefined); const [expenses,setExpenses]=useState([]); const [income,setIncome]=useState(0); const [showExpense,setShowExpense]=useState(false); const [showIncome,setShowIncome]=useState(false); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
 const now=new Date(); const month=now.getMonth()+1; const year=now.getFullYear();
 useEffect(()=>{ let active=true; supabase.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false);}}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setLoading(false);}); return()=>{active=false;subscription.unsubscribe();}; },[]);
 useEffect(()=>{if(session?.user) loadData(); else {setExpenses([]);setIncome(0);}},[session?.user?.id,month,year]);
 async function loadData(){
   setError('');
   const first=`${year}-${String(month).padStart(2,'0')}-01`;
   const nextMonth=month===12?1:month+1; const nextYear=month===12?year+1:year;
   const last=`${nextYear}-${String(nextMonth).padStart(2,'0')}-01`;
   const [g,r]=await Promise.all([
     supabase.from('gastos').select('*').eq('user_id',session.user.id).gte('data',first).lt('data',last).order('data',{ascending:false}).order('created_at',{ascending:false}),
     supabase.from('rendas').select('*').eq('user_id',session.user.id).eq('mes',month).eq('ano',year).maybeSingle()
   ]);
   if(g.error||r.error){setError(g.error?.message || r.error?.message || 'Não foi possível carregar seus dados.');return;}
   setExpenses(g.data||[]); setIncome(Number(r.data?.valor||0));
 }
 const total=useMemo(()=>expenses.reduce((s,e)=>s+Number(e.valor),0),[expenses]); const fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor),0); const balance=income-total; const percent=income?Math.min(total/income*100,100):0;
 async function addExpense(e){
   e.preventDefault(); setSaving(true); setError(''); const f=new FormData(e.currentTarget);
   const payload={user_id:session.user.id,descricao:String(f.get('description')).trim(),valor:Number(f.get('value')),categoria:f.get('category'),data:f.get('date'),tipo:f.get('type')};
   const {data,error}=await supabase.from('gastos').insert(payload).select().single();
   setSaving(false);
   if(error){setError(`Erro ao salvar gasto: ${error.message}`);return;}
   setExpenses(prev=>[data,...prev]); setShowExpense(false); e.currentTarget.reset();
 }
 async function saveIncome(e){
   e.preventDefault(); setSaving(true); setError(''); const f=new FormData(e.currentTarget); const value=Number(f.get('income'));
   const {data,error}=await supabase.from('rendas').upsert({user_id:session.user.id,valor:value,mes:month,ano:year},{onConflict:'user_id,mes,ano'}).select().single();
   setSaving(false);
   if(error){setError(`Erro ao salvar renda: ${error.message}`);return;}
   setIncome(Number(data.valor)); setShowIncome(false);
 }
 async function deleteExpense(id){const {error}=await supabase.from('gastos').delete().eq('id',id).eq('user_id',session.user.id);if(error){setError(`Erro ao excluir gasto: ${error.message}`);return;}setExpenses(prev=>prev.filter(x=>x.id!==id));}
 async function signOut(){await supabase.auth.signOut();}
 if(loading)return <main className="login-page"><LoaderCircle size={28} className="spin"/></main>;
 if(!session)return <Login onLogin={setSession}/>;
 return <div className="app"><header><div className="brand"><div className="logo"><Wallet size={20}/></div><span>Finanças</span></div><div className="header-actions"><span className="month">{now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span><button className="icon-btn" onClick={signOut} title="Sair"><LogOut size={18}/></button></div></header><main className="content"><div className="top"><div><span className="eyebrow">VISÃO GERAL</span><h1>Suas finanças</h1><p>Acompanhe seus gastos e mantenha o controle.</p></div><div className="top-actions"><button className="secondary" onClick={()=>setShowIncome(true)}><Pencil size={16}/> {income ? 'Alterar renda' : 'Definir renda'}</button><button className="primary add" onClick={()=>setShowExpense(true)}><Plus size={18}/> Novo gasto</button></div></div>{error&&<div className="error banner">{error}</div>}
 <section className="cards"><article className="card"><span>Renda mensal</span><strong>{money(income)}</strong><button className="card-action" onClick={()=>setShowIncome(true)}>{income?'Editar valor':'Definir agora'}</button></article><article className="card"><span>Total gasto</span><strong>{money(total)}</strong><div className="danger"><ArrowDownRight size={16}/> {percent.toFixed(1)}% da renda</div></article><article className="card highlight"><span>Saldo disponível</span><strong>{money(balance)}</strong><div className={balance>=0?'positive':'danger'}><ArrowUpRight size={16}/> {balance>=0?'Você está dentro do orçamento':'Acima da renda'}</div></article></section>
 <section className="grid"><article className="panel"><div className="panel-head"><div><h2>Gastos recentes</h2><p>Seus últimos lançamentos</p></div><button className="link" onClick={()=>setShowExpense(true)}>Adicionar</button></div>{expenses.length===0?<div className="empty">Nenhum gasto cadastrado neste mês.</div>:<div className="expense-list">{expenses.slice(0,8).map(x=><div className="expense" key={x.id}><div className="cat-dot">{x.categoria[0]}</div><div className="expense-info"><b>{x.descricao}</b><small>{x.categoria} • {new Date(`${x.data}T12:00:00`).toLocaleDateString('pt-BR')} • {x.tipo==='fixo'?'Fixo':'Variável'}</small></div><strong>- {money(x.valor)}</strong><button className="delete" onClick={()=>deleteExpense(x.id)}><Trash2 size={16}/></button></div>)}</div>}</article><article className="panel"><div className="panel-head"><div><h2>Resumo</h2><p>Distribuição deste mês</p></div></div><div className="progress-wrap"><div className="progress-label"><span>Renda utilizada</span><b>{percent.toFixed(0)}%</b></div><div className="progress"><i style={{width:`${percent}%`}}/></div><div className="summary"><span>Gastos fixos <b>{money(fixed)}</b></span><span>Gastos variáveis <b>{money(total-fixed)}</b></span><span>Restante <b>{money(Math.max(balance,0))}</b></span></div></div></article></section>
 </main>{showExpense&&<div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&setShowExpense(false)}><form className="modal" onSubmit={addExpense}><div className="modal-head"><div><h2>Novo gasto</h2><p>Adicione uma despesa ao mês.</p></div><button type="button" className="close" onClick={()=>setShowExpense(false)}>×</button></div><label>Descrição</label><input name="description" required placeholder="Ex.: Mercado"/><label>Valor</label><input name="value" type="number" step="0.01" min="0.01" required placeholder="0,00"/><div className="two"><div><label>Categoria</label><select name="category">{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label>Tipo</label><select name="type"><option value="variavel">Variável</option><option value="fixo">Fixo</option></select></div></div><label>Data</label><input name="date" type="date" required defaultValue={now.toISOString().slice(0,10)}/><button className="primary" disabled={saving}>{saving?'Salvando...':'Salvar gasto'}</button></form></div>}
 {showIncome&&<div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&setShowIncome(false)}><form className="modal" onSubmit={saveIncome}><div className="modal-head"><div><h2>Renda mensal</h2><p>Defina quanto você tem disponível neste mês.</p></div><button type="button" className="close" onClick={()=>setShowIncome(false)}>×</button></div><label>Quanto você tem?</label><input name="income" type="number" step="0.01" min="0" required defaultValue={income||''} placeholder="Ex.: 3000,00" autoFocus/><button className="primary" disabled={saving}>{saving?'Salvando...':'Salvar renda'}</button></form></div>}</div>
}
createRoot(document.getElementById('root')).render(<App/>);
