import React,{useEffect,useMemo,useState} from 'react';
import {CalendarDays,CreditCard,ReceiptText,Wallet,Filter,ChevronLeft,ChevronRight,Clock3} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './FinancialTimeline.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const day=v=>new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const monthName=(m,y)=>new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const iso=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

export default function FinancialTimeline({userId,expenses,income,month,year,onChangeMonth,onOpenCards,onOpenTransactions}){
 const[cards,setCards]=useState([]),[purchases,setPurchases]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');
 useEffect(()=>{if(!userId)return;let active=true;setLoading(true);Promise.all([
  supabase.from('credit_cards').select('id,nome,dia_vencimento,dia_fechamento').eq('user_id',userId),
  supabase.from('credit_card_purchases').select('id,card_id,descricao,categoria,valor_total,parcelas,data_compra').eq('user_id',userId).order('data_compra',{ascending:false})
 ]).then(([c,p])=>{if(!active)return;setCards(c.data||[]);setPurchases(p.data||[]);setLoading(false)});return()=>{active=false}},[userId]);
 const events=useMemo(()=>{
  const list=[];
  expenses.forEach(e=>list.push({id:`expense-${e.id}`,type:'expense',date:e.data,title:e.descricao,meta:`${e.categoria} • ${e.tipo==='fixo'?'Fixo':'Variável'}`,value:-Number(e.valor||0)}));
  if(income>0)list.push({id:`income-${year}-${month}`,type:'income',date:iso(year,month,1),title:'Renda mensal',meta:'Entrada do mês',value:Number(income)});
  const first=iso(year,month,1),nextDate=new Date(year,month,1),next=iso(nextDate.getFullYear(),nextDate.getMonth()+1,1);
  purchases.filter(p=>p.data_compra>=first&&p.data_compra<next).forEach(p=>{const card=cards.find(c=>c.id===p.card_id);list.push({id:`card-${p.id}`,type:'card',date:p.data_compra,title:p.descricao,meta:`${card?.nome||'Cartão'} • ${p.parcelas||1}x`,value:-Number(p.valor_total||0)})});
  cards.forEach(c=>{const due=Math.min(Math.max(Number(c.dia_vencimento||10),1),28);list.push({id:`due-${c.id}-${year}-${month}`,type:'due',date:iso(year,month,due),title:`Vencimento • ${c.nome}`,meta:'Data da fatura',value:null})});
  return list.sort((a,b)=>b.date.localeCompare(a.date));
 },[expenses,income,purchases,cards,month,year]);
 const visible=events.filter(e=>filter==='all'||e.type===filter);
 const stats=useMemo(()=>({expenses:events.filter(e=>e.type==='expense').length,cards:events.filter(e=>e.type==='card').length,due:events.filter(e=>e.type==='due').length}),[events]);
 const icon={expense:ReceiptText,income:Wallet,card:CreditCard,due:CalendarDays};
 return <section className="timeline-shell">
  <div className="timeline-hero"><div><span><Clock3 size={14}/> LINHA DO TEMPO</span><h2>{monthName(month,year)}</h2><p>Gastos, compras no cartão, renda e vencimentos organizados cronologicamente.</p></div><div className="timeline-month-nav"><button onClick={()=>onChangeMonth(-1)}><ChevronLeft size={17}/></button><b>{String(month).padStart(2,'0')}/{year}</b><button onClick={()=>onChangeMonth(1)}><ChevronRight size={17}/></button></div></div>
  <div className="timeline-kpis"><article><ReceiptText size={17}/><span>Gastos</span><b>{stats.expenses}</b></article><article><CreditCard size={17}/><span>Compras no cartão</span><b>{stats.cards}</b></article><article><CalendarDays size={17}/><span>Vencimentos</span><b>{stats.due}</b></article></div>
  <div className="timeline-toolbar"><div className="timeline-filters"><Filter size={14}/>{[['all','Tudo'],['expense','Gastos'],['card','Cartões'],['income','Entradas'],['due','Vencimentos']].map(([k,l])=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}</button>)}</div><div><button onClick={onOpenTransactions}>Lançamentos</button><button onClick={onOpenCards}>Cartões</button></div></div>
  <article className="panel timeline-panel">{loading?<div className="timeline-empty">Carregando timeline...</div>:visible.length?<div className="timeline-list">{visible.map(e=>{const Icon=icon[e.type];return <div className={`timeline-event type-${e.type}`} key={e.id}><div className="timeline-date"><b>{day(e.date)}</b><span>{e.date}</span></div><div className="timeline-line"><i/><span><Icon size={15}/></span></div><div className="timeline-body"><b>{e.title}</b><small>{e.meta}</small></div>{e.value!==null&&<strong className={e.value>=0?'positive':'negative'}>{e.value>=0?'+ ':'− '}{money(Math.abs(e.value))}</strong>}</div>})}</div>:<div className="timeline-empty">Nenhum evento nesse filtro.</div>}</article>
 </section>;
}
