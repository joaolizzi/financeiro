import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {ArrowDownRight,ArrowUpRight,CalendarDays,Gauge,Receipt,WalletCards} from 'lucide-react';
import './AdvancedDashboard.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

function previousMonth(month,year){
 if(month===1)return {month:12,year:year-1};
 return {month:month-1,year};
}
function daysInMonth(month,year){return new Date(year,month,0).getDate()}

export default function AdvancedDashboard({userId,expenses,income,month,year}){
 const[previous,setPrevious]=useState({total:0,income:0,count:0});
 const[loading,setLoading]=useState(true);

 useEffect(()=>{
  let active=true;
  async function load(){
   if(!userId){setLoading(false);return}
   const p=previousMonth(month,year);
   const first=`${p.year}-${String(p.month).padStart(2,'0')}-01`;
   const next=p.month===12?1:p.month+1;
   const ny=p.month===12?p.year+1:p.year;
   const end=`${ny}-${String(next).padStart(2,'0')}-01`;
   const[g,r]=await Promise.all([
    supabase.from('gastos').select('valor').eq('user_id',userId).gte('data',first).lt('data',end),
    supabase.from('rendas').select('valor').eq('user_id',userId).eq('mes',p.month).eq('ano',p.year).maybeSingle()
   ]);
   if(active)setPrevious({total:(g.data||[]).reduce((s,e)=>s+Number(e.valor||0),0),income:Number(r.data?.valor||0),count:(g.data||[]).length});
   if(active)setLoading(false);
  }
  load();
  return()=>{active=false};
 },[userId,month,year]);

 const total=useMemo(()=>expenses.reduce((s,e)=>s+Number(e.valor||0),0),[expenses]);
 const count=expenses.length;
 const monthDays=daysInMonth(month,year);
 const today=new Date();
 const isCurrentMonth=today.getMonth()+1===month&&today.getFullYear()===year;
 const elapsed=isCurrentMonth?Math.min(today.getDate(),monthDays):monthDays;
 const dailyAverage=elapsed?total/elapsed:0;
 const projected= isCurrentMonth ? dailyAverage*monthDays : total;
 const savings=Number(income||0)-total;
 const savingsRate=income>0?savings/income*100:0;
 const difference=total-previous.total;
 const differencePct=previous.total>0?difference/previous.total*100:null;
 const top=useMemo(()=>{
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});
  return Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
 },[expenses]);
 const max=Math.max(total,previous.total,1);

 return <section className="advanced-dashboard">
  <div className="advanced-head"><div><span className="advanced-eyebrow">VISÃO GERAL</span><h2>Seu mês em números</h2><p>Indicadores para entender seu ritmo de gastos antes do fim do mês.</p></div><div className="advanced-badge"><Gauge size={15}/> {isCurrentMonth?'Acompanhamento em tempo real':'Fechamento do mês'}</div></div>
  <div className="advanced-grid">
   <article className="advanced-card"><div className="advanced-card-top"><span>Gasto por dia</span><CalendarDays size={17}/></div><strong>{money(dailyAverage)}</strong><small>Média considerando {elapsed} {elapsed===1?'dia':'dias'}.</small></article>
   <article className="advanced-card"><div className="advanced-card-top"><span>Projeção do mês</span><ArrowDownRight size={17}/></div><strong>{money(projected)}</strong><small>{isCurrentMonth?'Se mantiver o ritmo atual.':'Total registrado no mês.'}</small></article>
   <article className="advanced-card"><div className="advanced-card-top"><span>Taxa de economia</span><WalletCards size={17}/></div><strong className={savingsRate<0?'negative':''}>{income>0?`${savingsRate.toFixed(1)}%`:'—'}</strong><small>{income>0?`${money(Math.max(savings,0))} restantes da renda.`:'Defina sua renda para calcular.'}</small></article>
   <article className="advanced-card"><div className="advanced-card-top"><span>Maior categoria</span><Receipt size={17}/></div><strong className="advanced-category">{top?top[0]:'—'}</strong><small>{top?money(top[1]):'Adicione gastos para descobrir.'}</small></article>
  </div>
  <div className="advanced-lower">
   <article className="advanced-panel"><div className="advanced-panel-head"><div><h3>Comparação com o mês anterior</h3><p>{loading?'Carregando histórico...':previous.total?'Compare seus gastos registrados.':'Ainda não há gastos no mês anterior.'}</p></div>{!loading&&previous.total>0&&<div className={difference>0?'advanced-change negative':'advanced-change positive'}>{difference>0?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>} {differencePct===null?'—':`${Math.abs(differencePct).toFixed(0)}%`}</div>}</div><div className="comparison"><div className="comparison-row"><div><span>Este mês</span><b>{money(total)}</b></div><div className="comparison-track"><i style={{width:`${total/max*100}%`}}/></div></div><div className="comparison-row"><div><span>Mês anterior</span><b>{money(previous.total)}</b></div><div className="comparison-track muted"><i style={{width:`${previous.total/max*100}%`}}/></div></div></div></article>
   <article className="advanced-panel forecast-panel"><div className="advanced-panel-head"><div><h3>Ritmo financeiro</h3><p>Quanto da renda já foi comprometido.</p></div></div><div className="forecast-value"><strong>{income>0?`${Math.min(total/income*100,999).toFixed(0)}%`:'—'}</strong><span>da renda utilizada</span></div><div className="forecast-track"><i style={{width:`${income?Math.min(total/income*100,100):0}%`}}/></div><div className="forecast-footer"><span>Gasto atual <b>{money(total)}</b></span><span>Saldo <b className={savings<0?'negative':''}>{money(savings)}</b></span></div></article>
  </div>
 </section>;
}
