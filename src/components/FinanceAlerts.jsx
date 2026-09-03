import React,{useMemo,useState} from 'react';
import {AlertTriangle,CheckCircle2,Target,TrendingUp,Clock3,X} from 'lucide-react';
import './FinanceAlerts.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function FinanceAlerts({expenses,income,month,year}){
 const storageKey=`finance-alerts-dismissed-${year}-${month}`;
 const [dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}});
 const alerts=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0);
  const fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0);
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});
  const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
  const daysInMonth=new Date(year,month,0).getDate();
  const today=new Date();
  const isCurrentMonth=today.getFullYear()===year&&today.getMonth()+1===month;
  const elapsed=isCurrentMonth?Math.min(today.getDate(),daysInMonth):daysInMonth;
  const dayProgress=elapsed/daysInMonth*100;
  const result=[];
  if(income>0){
   const used=total/income*100;
   if(used>=100) result.push({id:'budget-over',type:'danger',icon:AlertTriangle,title:'Orçamento ultrapassado',text:`Seus gastos já ultrapassaram sua renda em ${money(total-income)}.`});
   else if(used>=80) result.push({id:'budget-high',type:'warning',icon:AlertTriangle,title:'Atenção ao orçamento',text:`Você já utilizou ${used.toFixed(0)}% da renda. Restam ${money(income-total)}.`});
   else if(isCurrentMonth&&used>dayProgress+10) result.push({id:'pace-high',type:'warning',icon:Clock3,title:'Ritmo de gastos acima do ideal',text:`Você consumiu ${used.toFixed(0)}% da renda, mas o mês avançou ${dayProgress.toFixed(0)}%.`});
   else if(isCurrentMonth&&used<=Math.max(dayProgress-15,20)) result.push({id:'pace-good',type:'positive',icon:CheckCircle2,title:'Bom ritmo financeiro',text:`Você usou ${used.toFixed(0)}% da renda com ${dayProgress.toFixed(0)}% do mês já passado.`});
  }
  if(top&&total>0&&top[1]/total>=.4) result.push({id:`category-${top[0]}`,type:'info',icon:Target,title:`${top[0]} concentra seus gastos`,text:`Essa categoria representa ${(top[1]/total*100).toFixed(0)}% dos gastos (${money(top[1])}).`});
  if(fixed>0&&income>0&&fixed/income>=.5) result.push({id:'fixed-high',type:'warning',icon:TrendingUp,title:'Muitos gastos fixos',text:`Seus gastos fixos consomem ${(fixed/income*100).toFixed(0)}% da renda.`});
  if(!result.length) result.push({id:'ok',type:'positive',icon:CheckCircle2,title:'Tudo sob controle',text:'Não encontramos nenhum alerta importante nos seus dados deste mês.'});
  return result.filter(a=>!dismissed.includes(a.id)).slice(0,4);
 },[expenses,income,month,year,dismissed]);
 function dismiss(id){const next=[...dismissed,id];setDismissed(next);localStorage.setItem(storageKey,JSON.stringify(next));}
 return <section className="alerts-section"><div className="panel alerts-panel"><div className="panel-head"><div><h2>Alertas inteligentes</h2><p>O Finanças acompanha seu comportamento e destaca o que merece atenção.</p></div><TrendingUp size={20}/></div>{alerts.length?<div className="alerts-list">{alerts.map(a=>{const Icon=a.icon;return <article className={`alert-item ${a.type}`} key={a.id}><div className="alert-icon"><Icon size={17}/></div><div><b>{a.title}</b><span>{a.text}</span></div><button className="alert-dismiss" onClick={()=>dismiss(a.id)} title="Dispensar alerta"><X size={14}/></button></article>})}</div>:<div className="alerts-empty"><CheckCircle2 size={17}/><span>Sem novos alertas para este mês.</span></div>}</div></section>;
}
