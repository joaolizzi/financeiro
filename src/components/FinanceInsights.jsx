import React,{useEffect,useMemo,useState} from 'react';
import {PieChart,BarChart3,Target,TrendingUp} from 'lucide-react';
import {supabase} from '../lib/supabase';
import FinancialEvolution from './FinancialEvolution';
import AdvancedDashboard from './AdvancedDashboard';
import DashboardCharts from './DashboardCharts';
import MonthlyClosing from './MonthlyClosing';
import FinancialForecast from './FinancialForecast';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function FinanceInsights({expenses,income,userId,month,year}){
 const[resolvedUserId,setResolvedUserId]=useState(userId||null);
 useEffect(()=>{let alive=true;if(userId){setResolvedUserId(userId);return()=>{alive=false}}supabase.auth.getUser().then(({data})=>{if(alive)setResolvedUserId(data?.user?.id||null)});return()=>{alive=false}},[userId]);
 const period=useMemo(()=>{if(month&&year)return{month:Number(month),year:Number(year)};const dated=expenses.find(x=>x.data);if(dated){const[y,m]=String(dated.data).split('-').map(Number);if(y&&m)return{month:m,year:y}}const now=new Date();return{month:now.getMonth()+1,year:now.getFullYear()}},[month,year,expenses]);
 const categories=useMemo(()=>{const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[expenses]);
 const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0);
 const top=categories[0];
 const average=expenses.length?total/expenses.length:0;
 return <>
  {resolvedUserId&&<><FinancialForecast userId={resolvedUserId} expenses={expenses} income={income} month={period.month} year={period.year}/><MonthlyClosing userId={resolvedUserId} month={period.month} year={period.year}/></>}
  <DashboardCharts expenses={expenses} income={income}/>
  {resolvedUserId&&<><AdvancedDashboard userId={resolvedUserId} expenses={expenses} income={income} month={period.month} year={period.year}/><FinancialEvolution userId={resolvedUserId} month={period.month} year={period.year}/></>}
  <section className="insights-grid">
   <article className="panel insight-card"><div className="panel-head"><div><h2>Onde seu dinheiro está indo</h2><p>Distribuição dos gastos deste mês.</p></div><PieChart size={20}/></div>{categories.length?<div className="category-bars">{categories.slice(0,6).map(([name,value])=><div className="category-row" key={name}><div><span>{name}</span><b>{money(value)}</b></div><div className="category-track"><i style={{width:`${total?value/total*100:0}%`}}/></div></div>)}</div>:<div className="empty compact">Adicione gastos para ver a distribuição.</div>}</article>
   <article className="panel insight-card"><div className="panel-head"><div><h2>Insights rápidos</h2><p>Uma leitura simples do seu mês.</p></div><TrendingUp size={20}/></div><div className="insight-list"><div><BarChart3 size={17}/><span>Gasto médio por lançamento</span><b>{money(average)}</b></div><div><Target size={17}/><span>Maior categoria</span><b>{top?`${top[0]} · ${money(top[1])}`:'—'}</b></div><div><TrendingUp size={17}/><span>Renda ainda disponível</span><b>{money(Math.max(Number(income||0)-total,0))}</b></div></div></article>
  </section>
 </>;
}