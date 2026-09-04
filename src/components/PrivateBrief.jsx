import React,{useMemo} from 'react';
import {ArrowUpRight,BrainCircuit,CalendarClock,ShieldCheck,Sparkles,Target,WalletCards} from 'lucide-react';
import './PrivateBrief.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

export default function PrivateBrief({income=0,expenses=[],month,year,onPlanning,onInsights}){
 const brief=useMemo(()=>{
  const total=expenses.reduce((s,x)=>s+Number(x.valor||0),0),balance=Number(income||0)-total,saving=income>0?balance/income*100:0;
  const today=new Date(),isCurrent=today.getFullYear()===year&&today.getMonth()+1===month,daysInMonth=new Date(year,month,0).getDate(),elapsed=isCurrent?today.getDate():daysInMonth;
  const pace=elapsed?total/elapsed:0,projection=isCurrent?pace*daysInMonth:total,projectedBalance=Number(income||0)-projection;
  const fixed=expenses.filter(x=>x.tipo==='fixo').reduce((s,x)=>s+Number(x.valor||0),0),fixedPct=income>0?fixed/income*100:0;
  const score=income<=0?0:Math.round(clamp(100-(Math.max(0,-saving)*1.5)-Math.max(0,fixedPct-50)*.65+(Math.max(0,saving)*.45),0,100));
  let status='Sob controle',tone='good',message='Seu mês está equilibrado. Continue acompanhando o ritmo dos gastos.';
  if(income<=0){status='Configure sua renda';tone='neutral';message='Defina a renda mensal para liberar uma leitura financeira mais precisa.'}
  else if(projectedBalance<0){status='Ritmo acima do ideal';tone='danger';message=`No ritmo atual, o mês pode fechar ${money(Math.abs(projectedBalance))} acima da renda.`}
  else if(saving<10){status='Margem apertada';tone='warn';message='Sua margem de segurança está baixa. Priorize despesas essenciais até o fechamento.'}
  else if(saving>=25){status='Excelente margem';tone='great';message=`Você preservou ${saving.toFixed(0)}% da renda até agora. Há espaço para metas e investimentos.`}
  const runway=pace>0?Math.max(0,balance/pace):0;
  return{total,balance,saving,projection,projectedBalance,fixedPct,score,status,tone,message,runway};
 },[income,expenses,month,year]);
 const period=new Date(year,month-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 return <section className={`private-brief tone-${brief.tone}`}>
  <div className="private-brief-main"><div className="private-brief-title"><span><Sparkles size={12}/> PRIVATE INTELLIGENCE</span><h2>Seu briefing financeiro</h2><p>{period} • leitura executiva do seu dinheiro</p></div><div className="private-score"><div><strong>{brief.score}</strong><small>/100</small></div><span>Financial score</span></div></div>
  <div className="private-brief-grid"><article className="private-signal"><div className="private-signal-icon"><BrainCircuit size={18}/></div><div><span>LEITURA DO MOMENTO</span><b>{brief.status}</b><p>{brief.message}</p></div></article><article><WalletCards size={16}/><span>Saldo do mês</span><b className={brief.balance<0?'negative':''}>{money(brief.balance)}</b><small>{brief.saving.toFixed(0)}% da renda preservada</small></article><article><CalendarClock size={16}/><span>Projeção de gastos</span><b>{money(brief.projection)}</b><small>{brief.runway>0?`${brief.runway.toFixed(0)} dias de margem no ritmo atual`:'Sem margem no ritmo atual'}</small></article><article><ShieldCheck size={16}/><span>Comprometimento fixo</span><b>{brief.fixedPct.toFixed(0)}%</b><small>{brief.fixedPct<=50?'Faixa saudável':'Acima da faixa recomendada'}</small></article></div>
  <div className="private-brief-actions"><button onClick={onPlanning}><Target size={14}/> Ajustar planejamento</button><button onClick={onInsights}>Abrir inteligência <ArrowUpRight size={14}/></button></div>
 </section>;
}
