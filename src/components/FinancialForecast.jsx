import React,{useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,CalendarClock,CreditCard,Repeat,ShieldCheck,Sparkles,TrendingDown,TrendingUp,WalletCards} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './FinancialForecast.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
const monthIndex=(y,m)=>y*12+(m-1);

export default function FinancialForecast({userId,expenses,income,month,year}){
 const[data,setData]=useState({budget:0,recurring:[],subscriptions:[],purchases:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;async function load(){setLoading(true);setError('');const[b,r,s,p]=await Promise.all([
  supabase.from('finance_monthly_budgets').select('valor').eq('user_id',userId).eq('mes',month).eq('ano',year).maybeSingle(),
  supabase.from('finance_recurring').select('id,descricao,valor,dia,last_confirmed_month,ativo').eq('user_id',userId).eq('ativo',true),
  supabase.from('finance_subscriptions').select('id,nome,valor,dia,ativo').eq('user_id',userId).eq('ativo',true),
  supabase.from('credit_card_purchases').select('id,descricao,valor_total,parcelas,data_compra').eq('user_id',userId)
 ]);if(!alive)return;const firstError=b.error||r.error||s.error||p.error;if(firstError)setError(firstError.message);setData({budget:Number(b.data?.valor||0),recurring:r.data||[],subscriptions:s.data||[],purchases:p.data||[]});setLoading(false)}load();return()=>{alive=false}},[userId,month,year]);

 const calc=useMemo(()=>{
  const total=expenses.reduce((sum,x)=>sum+Number(x.valor||0),0),days=new Date(year,month,0).getDate(),now=new Date(),current=now.getFullYear()===year&&now.getMonth()+1===month,past=new Date(year,month-1,1)<new Date(now.getFullYear(),now.getMonth(),1),elapsed=past?days:current?Math.max(now.getDate(),1):1,remainingDays=past?0:Math.max(days-elapsed,0),daily=elapsed?total/elapsed:0;
  const key=`${year}-${String(month).padStart(2,'0')}`;
  const pendingRecurring=data.recurring.filter(x=>x.last_confirmed_month!==key).reduce((s,x)=>s+Number(x.valor||0),0);
  const subscriptionTotal=data.subscriptions.reduce((s,x)=>s+Number(x.valor||0),0);
  const target=monthIndex(year,month);
  const cardInstallments=data.purchases.reduce((sum,p)=>{if(!p.data_compra)return sum;const d=new Date(`${p.data_compra}T12:00:00`),start=monthIndex(d.getFullYear(),d.getMonth()+1),n=Math.max(Number(p.parcelas||1),1);return target>=start&&target<start+n?sum+Number(p.valor_total||0)/n:sum},0);
  const paceFuture=current?daily*remainingDays:0;
  const committed=pendingRecurring+subscriptionTotal+cardInstallments;
  const base=total+paceFuture+committed;
  const saving=total+(paceFuture*.9)+committed;
  const allRecurring=total+paceFuture+subscriptionTotal+cardInstallments+data.recurring.reduce((s,x)=>s+Number(x.valor||0),0);
  const limit=data.budget||Number(income||0),balance=Number(income||0)-base,usage=limit?base/limit*100:0;
  const monthlyPace=days?base/days:0,budgetRemaining=data.budget?data.budget-total:0,daysToBurst=data.budget&&monthlyPace>0?Math.max(0,Math.ceil(budgetRemaining/monthlyPace)):null;
  const subscriptionPct=income?subscriptionTotal/Number(income)*100:0;
  return{total,days,elapsed,remainingDays,daily,pendingRecurring,subscriptionTotal,cardInstallments,committed,base,saving,allRecurring,limit,balance,usage,daysToBurst,subscriptionPct};
 },[expenses,income,month,year,data]);

 if(loading)return <section className="panel forecast"><div className="forecast-loading">Calculando sua previsão financeira...</div></section>;
 const status=calc.balance<0?'critical':calc.usage>100?'warning':'healthy';
 const headline=status==='critical'?'Seu mês pode fechar no negativo':status==='warning'?'A projeção passa do limite':'Sua projeção está sob controle';
 return <section className={`panel forecast forecast-${status}`}><div className="forecast-head"><div><span className="forecast-kicker"><Sparkles size={12}/> PREVISÃO FINANCEIRA 2.0</span><h2>Como seu mês tende a terminar</h2><p>Combina seu ritmo de gastos, recorrentes, assinaturas, cartão e orçamento.</p></div><div className={`forecast-status ${status}`}>{status==='healthy'?<ShieldCheck size={15}/>:<AlertTriangle size={15}/>} {headline}</div></div>{error&&<div className="error banner">{error}</div>}
 <div className="forecast-hero"><div><span>Saldo projetado no fim do mês</span><strong className={calc.balance<0?'negative':''}>{money(calc.balance)}</strong><small>com gasto total estimado em {money(calc.base)}</small></div><div className="forecast-meter"><div><i style={{width:`${clamp(calc.usage,0,100)}%`}}/></div><span>{calc.limit?`${calc.usage.toFixed(0)}% do ${data.budget?'orçamento':'valor disponível'}`:'Defina renda ou orçamento para comparar'}</span></div></div>
 <div className="forecast-scenarios"><article><Activity size={17}/><span>Mantendo o ritmo</span><b>{money(calc.base)}</b><small>cenário mais provável</small></article><article><TrendingDown size={17}/><span>Economizando 10%</span><b>{money(calc.saving)}</b><small>sobre o ritmo dos próximos dias</small></article><article><Repeat size={17}/><span>Se todas recorrentes ocorrerem</span><b>{money(calc.allRecurring)}</b><small>cenário conservador</small></article></div>
 <div className="forecast-commitments"><div><Repeat size={15}/><span>Recorrentes ainda não confirmadas</span><b>{money(calc.pendingRecurring)}</b></div><div><CalendarClock size={15}/><span>Assinaturas ativas</span><b>{money(calc.subscriptionTotal)}</b></div><div><CreditCard size={15}/><span>Parcelas de cartão estimadas</span><b>{money(calc.cardInstallments)}</b></div><div className="total"><WalletCards size={15}/><span>Total já comprometido</span><b>{money(calc.committed)}</b></div></div>
 <div className="forecast-alerts">{data.budget&&calc.base>data.budget&&<div className="danger"><AlertTriangle size={16}/><span>Você pode ultrapassar o orçamento em <b>{money(calc.base-data.budget)}</b>{calc.daysToBurst!==null&&calc.daysToBurst<=calc.remainingDays?` em aproximadamente ${calc.daysToBurst} dias`:''}.</span></div>}{calc.subscriptionPct>=10&&<div><CalendarClock size={16}/><span>Assinaturas representam <b>{calc.subscriptionPct.toFixed(1)}%</b> da sua renda mensal.</span></div>}{calc.committed>0&&<div><TrendingUp size={16}/><span>Recorrentes + assinaturas + cartão já comprometem <b>{money(calc.committed)}</b> neste cenário.</span></div>}{status==='healthy'&&calc.subscriptionPct<10&&<div className="good"><ShieldCheck size={16}/><span>Seu ritmo atual está compatível com o limite considerado.</span></div>}</div>
 </section>;
}
