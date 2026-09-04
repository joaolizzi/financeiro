import React,{useEffect,useMemo,useState} from 'react';
import {Landmark,WalletCards,TrendingUp,CreditCard,ShieldCheck,ArrowUpRight,ArrowDownRight} from 'lucide-react';
import {Area,AreaChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {supabase} from '../lib/supabase';
import './WealthDashboard.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const monthKey=(y,m)=>`${y}-${String(m).padStart(2,'0')}`;
const shiftMonth=(y,m,delta)=>{const d=new Date(y,m-1+delta,1);return{year:d.getFullYear(),month:d.getMonth()+1}};
const monthLabel=(y,m)=>new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','');

export default function WealthDashboard({userId,month,year}){
 const[data,setData]=useState({balances:[],cards:[],purchases:[],expenses:[],income:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);setError('');const start=shiftMonth(year,month,-5),first=`${start.year}-${String(start.month).padStart(2,'0')}-01`,next=shiftMonth(year,month,1),last=`${next.year}-${String(next.month).padStart(2,'0')}-01`;const[b,c,p,g,r]=await Promise.all([
   supabase.from('finance_balances').select('tipo,valor').eq('user_id',userId),
   supabase.from('credit_cards').select('id,nome,apelido,limite').eq('user_id',userId),
   supabase.from('credit_card_purchases').select('id,card_id,descricao,valor_total,parcelas,data_compra').eq('user_id',userId).lt('data_compra',last),
   supabase.from('gastos').select('valor,data').eq('user_id',userId).gte('data',first).lt('data',last),
   supabase.from('rendas').select('valor,mes,ano').eq('user_id',userId).gte('ano',start.year).lte('ano',year)
  ]);if(!alive)return;const err=b.error||c.error||p.error||g.error||r.error;if(err)setError(err.message);setData({balances:b.data||[],cards:c.data||[],purchases:p.data||[],expenses:g.data||[],income:r.data||[]});setLoading(false)})().catch(e=>{if(alive){setError(e.message||'Não foi possível carregar o patrimônio.');setLoading(false)}});return()=>{alive=false}},[userId,month,year]);

 const calc=useMemo(()=>{
  const balances=Object.fromEntries(data.balances.map(x=>[x.tipo,Number(x.valor||0)])),available=balances.disponivel||0,saved=balances.guardado||0,investments=balances.investimentos||0,assets=available+saved+investments;
  const liabilityFor=(y,m)=>data.purchases.reduce((sum,p)=>{const date=new Date(`${p.data_compra}T12:00:00`),py=date.getFullYear(),pm=date.getMonth()+1,offset=(y-py)*12+(m-pm),parts=Math.max(1,Number(p.parcelas||1));return offset>=0&&offset<parts?sum+Number(p.valor_total||0)/parts:sum},0);
  const cardDebt=liabilityFor(year,month),net=assets-cardDebt,totalLimit=data.cards.reduce((s,c)=>s+Number(c.limite||0),0),availableLimit=Math.max(0,totalLimit-cardDebt);
  const months=Array.from({length:6},(_,i)=>shiftMonth(year,month,i-5));const flows=months.map(({year:y,month:m})=>{const key=monthKey(y,m),expenses=data.expenses.filter(x=>String(x.data||'').startsWith(key)).reduce((s,x)=>s+Number(x.valor||0),0),income=data.income.filter(x=>Number(x.ano)===y&&Number(x.mes)===m).reduce((s,x)=>s+Number(x.valor||0),0);return{y,m,label:monthLabel(y,m),flow:income-expenses}});let running=net;const history=[...flows].reverse().map((x,i)=>{const point={...x,value:running};if(i<flows.length-1)running-=x.flow;return point}).reverse();
  const prev=history.at(-2)?.value??net,variation=net-prev,variationPct=Math.abs(prev)>0?variation/Math.abs(prev)*100:0;
  const allocation=[['Disponível',available],['Guardado',saved],['Investimentos',investments],['Fatura estimada',cardDebt]];
  return{available,saved,investments,assets,cardDebt,net,totalLimit,availableLimit,history,variation,variationPct,allocation};
 },[data,month,year]);

 if(loading)return <section className="wealth-panel panel"><div className="wealth-loading">Calculando patrimônio...</div></section>;
 return <section className="wealth-panel panel"><div className="panel-head wealth-head"><div><span className="wealth-kicker">PATRIMÔNIO 1.0</span><h2><Landmark size={17}/> Dashboard de patrimônio</h2><p>Ativos, compromissos no cartão e patrimônio líquido em uma única visão.</p></div><div className={`wealth-trend ${calc.variation>=0?'up':'down'}`}>{calc.variation>=0?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>} {calc.variationPct.toFixed(1)}%</div></div>{error&&<div className="error banner">{error}</div>}
  <div className="wealth-hero"><div><span>Patrimônio líquido estimado</span><strong>{money(calc.net)}</strong><small>Ativos {money(calc.assets)} − fatura estimada {money(calc.cardDebt)}</small></div><div className="wealth-score"><ShieldCheck size={18}/><span>{calc.net>=0?'Patrimônio positivo':'Atenção ao endividamento'}</span></div></div>
  <div className="wealth-stats"><article><WalletCards size={16}/><span>Disponível</span><b>{money(calc.available)}</b></article><article><Landmark size={16}/><span>Guardado</span><b>{money(calc.saved)}</b></article><article><TrendingUp size={16}/><span>Investimentos</span><b>{money(calc.investments)}</b></article><article><CreditCard size={16}/><span>Fatura estimada</span><b>{money(calc.cardDebt)}</b></article></div>
  <div className="wealth-grid"><div className="wealth-chart"><div className="wealth-section-title"><b>Evolução estimada</b><span>últimos 6 meses</span></div><ResponsiveContainer width="100%" height={205}><AreaChart data={calc.history} margin={{top:12,right:8,left:-18,bottom:0}}><defs><linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".24"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:9}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>money(v)} labelFormatter={l=>String(l).toUpperCase()} contentStyle={{background:'#0c121c',border:'1px solid #263044',borderRadius:10,fontSize:11}}/><Area type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} fill="url(#wealthFill)"/></AreaChart></ResponsiveContainer><small className="wealth-note">Estimativa reconstruída a partir do patrimônio atual e do resultado mensal registrado.</small></div>
   <div className="wealth-allocation"><div className="wealth-section-title"><b>Composição</b><span>distribuição atual</span></div>{calc.allocation.map(([label,value])=>{const base=Math.max(calc.assets+calc.cardDebt,1),pct=Math.min(100,Math.max(0,value/base*100));return <div className="wealth-row" key={label}><div><span>{label}</span><b>{money(value)}</b></div><div className="wealth-track"><i style={{width:`${pct}%`}}/></div></div>})}<div className="wealth-limit"><span>Limite disponível nos cartões</span><b>{money(calc.availableLimit)}</b><small>de {money(calc.totalLimit)} em limite total</small></div></div>
  </div>
 </section>;
}
