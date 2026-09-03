import React,{useMemo} from 'react';
import {Bell,AlertTriangle,CheckCircle2,Target,Wallet,TrendingUp,X} from 'lucide-react';
import './NotificationCenter.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function NotificationCenter({open,onClose,expenses,income}){
 const items=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0),fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0),balance=income-total;
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0];const out=[];
  if(income>0&&total/income>=.8)out.push({type:'warning',icon:AlertTriangle,title:'Orçamento pressionado',text:`Você já usou ${(total/income*100).toFixed(0)}% da renda.`});
  if(balance<0)out.push({type:'danger',icon:Wallet,title:'Saldo negativo',text:`Seus gastos ultrapassaram a renda em ${money(Math.abs(balance))}.`});
  if(income>0&&fixed/income>=.5)out.push({type:'warning',icon:TrendingUp,title:'Fixos elevados',text:`Gastos fixos consomem ${(fixed/income*100).toFixed(0)}% da renda.`});
  if(top&&total&&top[1]/total>=.35)out.push({type:'info',icon:Target,title:`${top[0]} em destaque`,text:`Essa categoria concentra ${(top[1]/total*100).toFixed(0)}% dos seus gastos.`});
  if(!out.length)out.push({type:'positive',icon:CheckCircle2,title:'Tudo sob controle',text:'Nenhuma situação importante exige sua atenção agora.'});
  return out.slice(0,5);
 },[expenses,income]);
 if(!open)return null;
 return <div className="notify-layer" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="notify-center"><header><div><span><Bell size={14}/> CENTRAL</span><h3>Notificações</h3></div><button onClick={onClose}><X size={17}/></button></header><div className="notify-list">{items.map((n,i)=>{const Icon=n.icon;return <article className={`notify-item ${n.type}`} key={`${n.title}-${i}`}><div className="notify-icon"><Icon size={16}/></div><div><b>{n.title}</b><span>{n.text}</span></div><em>{i===0?'agora':'este mês'}</em></article>})}</div><footer><span>{items.length} {items.length===1?'aviso':'avisos'} ativos</span><b>Finanças Intelligence</b></footer></aside></div>;
}
