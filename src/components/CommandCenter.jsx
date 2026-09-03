import React,{useEffect,useMemo,useState} from 'react';
import {Search,LayoutDashboard,ReceiptText,CreditCard,Target,Sparkles,Plus,Pencil,Command,ArrowRight,Zap} from 'lucide-react';
import './CommandCenter.css';

export default function CommandCenter({open,onClose,onNavigate,onNewExpense,onQuickAdd,onIncome}){
 const[q,setQ]=useState('');
 useEffect(()=>{if(open)setQ('')},[open]);
 const actions=useMemo(()=>[
  {label:'Visão geral',hint:'Dashboard principal',icon:LayoutDashboard,run:()=>onNavigate('overview')},
  {label:'Lançamentos',hint:'Histórico e filtros',icon:ReceiptText,run:()=>onNavigate('transactions')},
  {label:'Cartões',hint:'Faturas e limites',icon:CreditCard,run:()=>onNavigate('cards')},
  {label:'Planejamento',hint:'Metas e recorrências',icon:Target,run:()=>onNavigate('planning')},
  {label:'Análises',hint:'Insights e inteligência',icon:Sparkles,run:()=>onNavigate('insights')},
  {label:'Quick Add',hint:'Digite um gasto em linguagem natural',icon:Zap,run:onQuickAdd,accent:true},
  {label:'Novo gasto',hint:'Abrir formulário completo',icon:Plus,run:onNewExpense},
  {label:'Editar renda',hint:'Atualizar renda mensal',icon:Pencil,run:onIncome}
 ],[onNavigate,onNewExpense,onQuickAdd,onIncome]);
 const filtered=actions.filter(a=>`${a.label} ${a.hint}`.toLowerCase().includes(q.toLowerCase()));
 if(!open)return null;
 function execute(a){a.run();onClose()}
 return <div className="command-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <section className="command-center" role="dialog" aria-modal="true">
   <div className="command-search"><Search size={19}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="O que você quer fazer?"/><kbd>ESC</kbd></div>
   <div className="command-caption"><span>AÇÕES RÁPIDAS</span><span><Command size={12}/> K</span></div>
   <div className="command-list">{filtered.map((a,i)=><button key={a.label} className={a.accent?'accent':''} onClick={()=>execute(a)}><span className="command-icon"><a.icon size={18}/></span><span><b>{a.label}</b><small>{a.hint}</small></span><ArrowRight size={15}/><em>{i+1}</em></button>)}{!filtered.length&&<div className="command-empty">Nenhuma ação encontrada.</div>}</div>
   <footer><span>Digite para filtrar</span><span>Finanças Command Center</span></footer>
  </section>
 </div>
}
