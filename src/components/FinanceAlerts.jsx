import React,{useMemo} from 'react';
import {AlertTriangle,CheckCircle2,Target,TrendingUp} from 'lucide-react';
import './FinanceAlerts.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function FinanceAlerts({expenses,income}){
 const alerts=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0);
  const fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0);
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});
  const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
  const result=[];
  if(income>0){
   const used=total/income*100;
   if(used>=100) result.push({type:'danger',icon:AlertTriangle,title:'Orçamento ultrapassado',text:`Seus gastos já ultrapassaram sua renda em ${money(total-income)}.`});
   else if(used>=80) result.push({type:'warning',icon:AlertTriangle,title:'Atenção ao orçamento',text:`Você já utilizou ${used.toFixed(0)}% da sua renda. Restam ${money(income-total)}.`});
   else if(used<=50&&new Date().getDate()>=15) result.push({type:'positive',icon:CheckCircle2,title:'Bom ritmo financeiro',text:`Você usou apenas ${used.toFixed(0)}% da renda até agora.`});
  }
  if(top&&total>0&&top[1]/total>=.4) result.push({type:'info',icon:Target,title:`${top[0]} concentra seus gastos`,text:`Essa categoria representa ${(top[1]/total*100).toFixed(0)}% dos gastos (${money(top[1])}).`});
  if(fixed>0&&income>0&&fixed/income>=.5) result.push({type:'warning',icon:TrendingUp,title:'Muitos gastos fixos',text:`Seus gastos fixos consomem ${(fixed/income*100).toFixed(0)}% da renda.`});
  if(!result.length) result.push({type:'positive',icon:CheckCircle2,title:'Tudo sob controle',text:'Não encontramos nenhum alerta importante nos seus dados deste mês.'});
  return result.slice(0,4);
 },[expenses,income]);
 return <section className="alerts-section"><div className="panel alerts-panel"><div className="panel-head"><div><h2>Alertas inteligentes</h2><p>O Finanças acompanha seu comportamento e destaca o que merece atenção.</p></div><TrendingUp size={20}/></div><div className="alerts-list">{alerts.map((a,i)=>{const Icon=a.icon;return <article className={`alert-item ${a.type}`} key={`${a.title}-${i}`}><div className="alert-icon"><Icon size={17}/></div><div><b>{a.title}</b><span>{a.text}</span></div></article>})}</div></div></section>;
}
