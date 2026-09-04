import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,CheckCircle2,Eye,Lightbulb,Sparkles,Target,WalletCards,X} from 'lucide-react';
import {supabase} from '../lib/supabase';
import CalcInfo from './CalcInfo';
import './RecommendationCenter.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const monthStart=(y,m,delta=0)=>{const d=new Date(Number(y),Number(m)-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
const priorityOrder={now:0,watch:1,opportunity:2};

export default function RecommendationCenter({userId,expenses,income,month,year,onIncome,onTransactions,onPlanning,onInsights,onNewExpense}){
 const[history,setHistory]=useState([]),[loading,setLoading]=useState(true);
 const storageKey=`finance-recommendations-dismissed-${userId}-${year}-${month}`;
 const[dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}});
 useEffect(()=>{setDismissed((()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}})())},[storageKey]);
 useEffect(()=>{if(!userId)return;let alive=true;(async()=>{setLoading(true);const{data}=await supabase.from('gastos').select('descricao,categoria,valor,data,tipo').eq('user_id',userId).gte('data',monthStart(year,month,-3)).lt('data',monthStart(year,month,0));if(alive){setHistory(data||[]);setLoading(false)}})();return()=>{alive=false}},[userId,month,year]);
 const data=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0),fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0),balance=Number(income||0)-total;
  const currentCats={};expenses.forEach(e=>currentCats[e.categoria]=(currentCats[e.categoria]||0)+Number(e.valor||0));
  const histMonths={};history.forEach(e=>{const k=String(e.data).slice(0,7);histMonths[k]=histMonths[k]||{};histMonths[k][e.categoria]=(histMonths[k][e.categoria]||0)+Number(e.valor||0)});
  const monthMaps=Object.values(histMonths),catAvgs={};for(const cat of Object.keys(currentCats)){const vals=monthMaps.map(m=>Number(m[cat]||0));catAvgs[cat]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0}
  const top=Object.entries(currentCats).sort((a,b)=>b[1]-a[1])[0]||null;
  const anomaly=Object.entries(currentCats).map(([cat,value])=>({cat,value,avg:catAvgs[cat]||0})).filter(x=>x.avg>=30&&x.value>x.avg*1.35).sort((a,b)=>(b.value/b.avg)-(a.value/a.avg))[0];
  const now=new Date(),current=now.getFullYear()===Number(year)&&now.getMonth()+1===Number(month),days=new Date(Number(year),Number(month),0).getDate(),remainingDays=current?Math.max(days-now.getDate()+1,1):days;
  const safeDaily=income>0?Math.max(balance,0)/remainingDays:0;
  const fixedPct=income>0?fixed/Number(income)*100:0;
  return{total,fixed,balance,top,anomaly,safeDaily,fixedPct,current,remainingDays,historyMonths:monthMaps.length};
 },[expenses,income,history,month,year]);
 const recommendations=useMemo(()=>{
  const r=[];
  if(!income)r.push({id:'set-income',priority:'now',icon:WalletCards,title:'Defina sua renda do mês',text:'Sem uma renda definida, projeções, limite diário e alertas de orçamento ficam menos precisos.',action:'Definir renda',run:onIncome});
  if(income>0&&data.balance<0)r.push({id:'negative',priority:'now',icon:AlertTriangle,title:'Revise os gastos agora',text:`O mês está ${money(Math.abs(data.balance))} acima da renda cadastrada. Comece pelos maiores lançamentos.`,action:'Ver lançamentos',run:onTransactions});
  else if(income>0&&data.current&&data.safeDaily>0)r.push({id:'safe-daily',priority:'watch',icon:Eye,title:`Teto confortável: ${money(data.safeDaily)}/dia`,text:`Mantendo até esse valor médio pelos próximos ${data.remainingDays} dias, você permanece dentro da renda atual.`,action:'Ver análises',run:onInsights,info:`Cálculo: (renda ${money(income)} − gastos registrados ${money(data.total)}) ÷ ${data.remainingDays} dias restantes.`});
  if(data.anomaly)r.push({id:`anomaly-${data.anomaly.cat}`,priority:'now',icon:AlertTriangle,title:`${data.anomaly.cat} saiu do seu padrão`,text:`Você gastou ${money(data.anomaly.value)} nessa categoria, contra média de ${money(data.anomaly.avg)} nos meses anteriores disponíveis.`,action:'Investigar',run:onTransactions,info:`Comparação do total atual de ${data.anomaly.cat} com a média dessa mesma categoria em ${data.historyMonths} mês(es) anteriores com dados.`});
  if(data.fixedPct>=50)r.push({id:'fixed-high',priority:'watch',icon:Target,title:'Custos fixos estão pesando',text:`Gastos fixos consomem ${data.fixedPct.toFixed(0)}% da renda. Vale revisar recorrências e assinaturas.`,action:'Revisar planejamento',run:onPlanning,info:`Cálculo: gastos marcados como fixos ÷ renda do mês × 100.`});
  if(data.top&&data.total>0&&data.top[1]/data.total>=.35)r.push({id:`top-${data.top[0]}`,priority:'opportunity',icon:Lightbulb,title:`Oportunidade em ${data.top[0]}`,text:`Essa categoria concentra ${(data.top[1]/data.total*100).toFixed(0)}% dos seus gastos. Uma redução pequena aqui tem impacto maior no mês.`,action:'Ver lançamentos',run:onTransactions,info:'Participação = total da categoria ÷ total de gastos do mês × 100.'});
  if(!expenses.length)r.push({id:'first-expense',priority:'opportunity',icon:Sparkles,title:'Comece registrando os gastos',text:'Com alguns lançamentos, o Finanças consegue gerar recomendações personalizadas e detectar padrões.',action:'Novo gasto',run:onNewExpense});
  if(!r.length)r.push({id:'stable',priority:'opportunity',icon:CheckCircle2,title:'Seu mês está equilibrado',text:'Nenhuma ação urgente foi detectada. Continue registrando os gastos para manter as recomendações atualizadas.',action:'Abrir análises',run:onInsights});
  return r.filter(x=>!dismissed.includes(x.id)).sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]).slice(0,5);
 },[data,income,expenses.length,dismissed,onIncome,onTransactions,onPlanning,onInsights,onNewExpense]);
 function dismiss(id){const next=[...dismissed,id];setDismissed(next);localStorage.setItem(storageKey,JSON.stringify(next))}
 const labels={now:'FAÇA AGORA',watch:'OBSERVE',opportunity:'OPORTUNIDADE'};
 if(loading)return <section className="panel recommendation-center"><div className="recommendation-loading">Montando recomendações pessoais...</div></section>;
 return <section className="panel recommendation-center"><div className="panel-head recommendation-head"><div><span className="recommendation-kicker"><Sparkles size={12}/> INTELLIGENCE 4.1</span><h2>Recomendações para você</h2><p>Prioridades criadas a partir do seu mês e do seu histórico recente.</p></div><span className="recommendation-count">{recommendations.length}</span></div>{recommendations.length?<div className="recommendation-list">{recommendations.map(item=>{const Icon=item.icon;return <article key={item.id} className={`recommendation-item ${item.priority}`}><div className="recommendation-icon"><Icon size={17}/></div><div className="recommendation-copy"><span className="recommendation-priority">{labels[item.priority]}</span><div className="recommendation-title"><b>{item.title}</b>{item.info&&<CalcInfo title="Como chegamos nisso">{item.info}</CalcInfo>}</div><p>{item.text}</p><button type="button" onClick={item.run}>{item.action}<ArrowRight size={14}/></button></div><button type="button" className="recommendation-dismiss" onClick={()=>dismiss(item.id)} title="Ocultar recomendação"><X size={14}/></button></article>})}</div>:<div className="recommendation-empty"><CheckCircle2 size={17}/>Você já revisou todas as recomendações deste mês.</div>}</section>;
}
