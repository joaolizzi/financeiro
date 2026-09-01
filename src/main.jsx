import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, LockKeyhole, Trash2, LogOut, LoaderCircle } from 'lucide-react';
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
    if(error){ setError('E-mail ou senha inválidos.'); return; }
    onLogin(data.user);
  }
  return <main className="login-page"><section className="login-card"><div className="brand"><div className="logo"><Wallet size={22}/></div><span>Finan<span className="accent">.A</span></span></div><div className="lock"><LockKeyhole size={24}/></div><h1>Bem-vindo de volta</h1><p>Acesse seu controle financeiro.</p><form onSubmit={submit}><label>E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Seu e-mail" autoComplete="username" required/><label>Senha</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required/>{error&&<div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading?<><LoaderCircle size={17} className="spin"/> Entrando...</>:'Entrar'}</button></form><small>Área privada • acesso pessoal</small></section></main>
}

function App(){
 const [session,setSession]=useState(undefined); const [expenses,setExpenses]=useState([]); const [income,setIncome]=useState(0); const [show,setShow]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 const now=new Date(); const month=now.getMonth()+1; const year=now.getFullYear();
 useEffect(()=>{ let active=true; supabase.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false);}}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setLoading(false);}); return()=>{active=false;subscription.unsubscribe();}; },[]);
 useEffect(()=>{if(session?.user) loadData(); else {setExpenses([]);setIncome(0);}},[session?.user?.id,month,year]);
 async function loadData(){
   setError('');
   const [g,r]=await Promise.all([
     supabase.from('gastos').select('*').eq('user_id',session.user.id).gte('data',`${year}-${String(month).padStart(2,'0')}-01`).lt('data',`${year}-${String(month===12?1:month+1).padStart(2,'0')}-${month===12?year+1:year}-01`).order('data',{ascending:false}).order('created_at',{ascending:false}),
     supabase.from('rendas').select('valor').eq('user_id',session.user.id).eq('mes',month).eq('ano',year).maybeSingle()
   ]);
   if(g.error||r.error){setError('Não foi possível carregar seus dados.');return;}
   setExpenses(g.data||[]); setIncome(Number(r.data?.valor||0));
 }
 const total=useMemo(()=>expenses.reduce((s,e)=>s+Number(e.valor),0),[expenses]); const fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor),0); const balance=income-total; const percent=income?Math.min(total/income*100,100):0;
 async function addExpense(e){e.preventDefault();setError('');const f=new FormData(e.currentTarget);const date=f.get('date');const {data,error}=await supabase.from('gastos').insert({user_id:session.user.id,descricao:f.get('description'),valor:Number(f.get('value')),categoria:f.get('category'),data:date,tipo:f.get('type')}).select().single();if(error){setError('Não foi possível salvar o gasto.');return;}setExpenses(prev=>[data,...prev]);setShow(false);e.currentTarget.reset();}
 async function deleteExpense(id){const {error}=await supabase.from('gastos').delete().eq('id',id).eq('user_id',session.user.id);if(error){setError('Não foi possível excluir o gasto.');return;}setExpenses(prev=>prev.filter(x=>x.id!==id));}
 async function signOut(){await supabase.auth.signOut();}
 if(loading)return <main className="login-page"><LoaderCircle size={28} className="spin"/></main>;
 if(!session)return <Login onLogin={setSession}/>;
 return <div className="app"><header><div className="brand"><div className="logo"><Wallet size={20}/></div><span>Finan<span className="accent">.A</span></span></div><div className="header-actions"><span className="month">{now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span><button className="icon-btn" onClick={signOut} title="Sair"><LogOut size={18}/></button></div></header><main className="content"><div className="top"><div><span className="eyebrow">VISÃO GERAL</span><h1>Suas finanças</h1><p>Acompanhe seus gastos e mantenha o controle.</p></div><button className="primary add" onClick={()=>setShow(true)}><Plus size={18}/> Novo gasto</button></div>{error&&<div className="error banner">{error}</div>}
 <section className="cards"><article className="card"><span>Renda mensal</span><strong>{money(income)}</strong><div className="muted">Definida para este mês</div></article><article className="card"><span>Total gasto</span><strong>{money(total)}</strong><div className="danger"><ArrowDownRight size={16}/> {percent.toFixed(1)}% da renda</div></article><article className="card highlight"><span>Saldo disponível</span><strong>{money(balance)}</strong><div className="positive"><ArrowUpRight size={16}/> {balance>=0?'Você está dentro do orçamento':'Acima da renda'}</div></article></section>
 <section className="grid"><article className="panel"><div className="panel-head"><div><h2>Gastos recentes</h2><p>Seus últimos lançamentos</p></div><button className="link" onClick={()=>setShow(true)}>Adicionar</button></div>{expenses.length===0?<div className="empty">Nenhum gasto cadastrado neste mês.</div>:<div className="expense-list">{expenses.slice(0,6).map(x=><div className="expense" key={x.id}><div className="cat-dot">{x.categoria[0]}</div><div className="expense-info"><b>{x.descricao}</b><small>{x.categoria} • {new Date(`${x.data}T12:00:00`).toLocaleDateString('pt-BR')}</small></div><strong>- {money(x.valor)}</strong><button className="delete" onClick={()=>deleteExpense(x.id)}><Trash2 size={16}/></button></div>)}</div>}</article><article className="panel"><div className="panel-head"><div><h2>Resumo</h2><p>Distribuição deste mês</p></div></div><div className="progress-wrap"><div className="progress-label"><span>Renda utilizada</span><b>{percent.toFixed(0)}%</b></div><div className="progress"><i style={{width:`${percent}%`}}/></div><div className="summary"><span>Gastos fixos <b>{money(fixed)}</b></span><span>Gastos variáveis <b>{money(total-fixed)}</b></span><span>Restante <b>{money(Math.max(balance,0))}</b></span></div></div></article></section>
 </main>{show&&<div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&setShow(false)}><form className="modal" onSubmit={addExpense}><div className="modal-head"><div><h2>Novo gasto</h2><p>Adicione uma despesa ao mês.</p></div><button type="button" className="close" onClick={()=>setShow(false)}>×</button></div><label>Descrição</label><input name="description" required placeholder="Ex.: Mercado"/><label>Valor</label><input name="value" type="number" step="0.01" min="0.01" required placeholder="0,00"/><div className="two"><div><label>Categoria</label><select name="category">{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label>Tipo</label><select name="type"><option value="variavel">Variável</option><option value="fixo">Fixo</option></select></div></div><label>Data</label><input name="date" type="date" required defaultValue={now.toISOString().slice(0,10)}/><button className="primary">Salvar gasto</button></form></div>}</div>
}
createRoot(document.getElementById('root')).render(<App/>);
