import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,CheckCircle2,Eye,Lightbulb,Sparkles,Target,WalletCards,X} from 'lucide-react';
import {supabase} from '../lib/supabase';
import CalcInfo from './CalcInfo';
import './RecommendationCenter.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const monthStart=(y,m,delta=0)=>{const d=new Date(Number(y),Number(m)-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
const priorityOrder={now:0,watch:1,opportunity:2};
const clickTab=label=>{const buttons=[...document.querySelectorAll('.app-tabs button')];const button=buttons.find(b=>b.textContent?.trim().toLowerCase().includes(label.toLowerCase()));button?.click();return Boolean(button)};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
const sameAmount=(a,b)=>Math.abs(Number(a||0)-Number(b||0))<.02;

export default function RecommendationCenter({userId:providedUserId,expenses,income,month,year,onIncome,onTransactions,onPlanning,onInsights,onNewExpense}){
 const[userId,setUserId]=useState(providedUserId||null),[history,setHistory]=useState([]),[commitments,setCommitments]=useState({recurring:[],subscriptions:[]}),[loading,setLoading]=useState(true);
 useEffect(()=>{if(providedUserId){setUserId(providedUserId);return}let alive=true;supabase.auth.getUser().then(({data})=>alive&&setUserId(data?.user?.id||null));return()=>{alive=false}},[providedUserId]);
 const storageKey=`finance-recommendations-dismissed-${userId||'anon'}-${year}-${month}`;
 const[dismissed,setDismissed]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}});
 useEffect(()=>{try{setDismissed(JSON.parse(localStorage.getItem(storageKey)||'[]'))}catch{setDismissed([])}},[storageKey]);
 useEffect(()=>{if(!userId){setLoading(false);return}let alive=true;(async()=>{setLoading(true);const[h,r,s]=await Promise.all([supabase.from('gastos').select('descricao,categoria,valor,data,tipo').eq('user_id',userId).gte('data',monthStart(year,month,-3)).lt('data',monthStart(year,month,0)),supabase.from('finance_recurring').select('descricao,valor,dia,last_confirmed_month,ativo').eq('user_id',userId).eq('ativo',true),supabase.from('finance_subscriptions').select('nome,valor,dia,ativo').eq('user_id',userId).eq('ativo',true)]);if(alive){setHistory(h.data||[]);setCommitments({recurring:r.data||[],subscriptions:s.data||[]});setLoading(false)}})();return()=>{alive=false}},[userId,month,year]);
 const data=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0),fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0),balance=Number(income||0)-total;
  const currentCats={};expenses.forEach(e=>{const cat=e.categoria||'Outros';currentCats[cat]=(currentCats[cat]||0)+Number(e.valor||0)});
  const histMonths={};history.forEach(e=>{const k=String(e.data).slice(0,7),cat=e.categoria||'Outros';histMonths[k]=histMonths[k]||{};histMonths[k][cat]=(histMonths[k][cat]||0)+Number(e.valor||0)});
  const monthMaps=Object.values(histMonths),catAvgs={};for(const cat of Object.keys(currentCats)){const vals=monthMaps.map(m=>Number(m[cat]||0));catAvgs[cat]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0}
  const top=Object.entries(currentCats).sort((a,b)=>b[1]-a[1])[0]||null,anomaly=Object.entries(currentCats).map(([cat,value])=>({cat,value,avg:catAvgs[cat]||0})).filter(x=>x.avg>=30&&x.value>x.avg*1.35).sort((a,b)=>(b.value/b.avg)-(a.value/a.avg))[0];
  const now=new Date(),current=now.getFullYear()===Number(year)&&now.getMonth()+1===Number(month),days=new Date(Number(year),Number(month),0).getDate(),remainingDays=current?Math.max(days-now.getDate()+1,1):days,todayDay=current?now.getDate():0,key=`${year}-${String(month).padStart(2,'0')}`;
  const already=(name,value)=>expenses.some(e=>norm(e.descricao)===norm(name)&&sameAmount(e.valor,value));
  const recurringPending=current?commitments.recurring.filter(x=>Number(x.dia||1)>=todayDay&&x.last_confirmed_month!==key&&!already(x.descricao,x.valor)).reduce((s,x)=>s+Number(x.valor||0),0):0;
  const subscriptionPending=current?commitments.subscriptions.filter(x=>Number(x.dia||1)>=todayDay&&!already(x.nome,x.valor)).reduce((s,x)=>s+Number(x.valor||0),0):0;
  const pending=recurringPending+subscriptionPending,freeAfterCommitments=Number(income||0)-total-pending,safeDaily=current&&income>0?Math.max(freeAfterCommitments,0)/remainingDays:0,fixedPct=income>0?fixed/Number(income)*100:0;
  return{total,fixed,balance,top,anomaly,safeDaily,fixedPct,current,remainingDays,historyMonths:monthMaps.length,pending,freeAfterCommitments};
 },[expenses,income,history,commitments,month,year]);
 const actions=useMemo(()=>({income:onIncome||(()=>clickTab('Lançamentos')),transactions:onTransactions||(()=>clickTab('Lançamentos')),planning:onPlanning||(()=>clickTab('Planejamento')),insights:onInsights||(()=>clickTab('Análises')),newExpense:onNewExpense||(()=>clickTab('Lançamentos'))}),[onIncome,onTransactions,onPlanning,onInsights,onNewExpense]);
 const recommendations=useMemo(()=>{const r=[];
  if(!income)r.push({id:'set-income',priority:'now',icon:WalletCards,title:'Defina sua renda do mês',text:'Sem uma renda definida, projeções e limites ficam menos precisos.',action:'Ir para renda',run:actions.income});
  if(income>0&&data.freeAfterCommitments<0)r.push({id:'negative-committed',priority:'now',icon:AlertTriangle,title:'O mês está em risco',text:`Considerando ${money(data.pending)} em compromissos ainda previstos, faltariam ${money(Math.abs(data.freeAfterCommitments))} para fechar o mês.`,action:'Revisar planejamento',run:actions.planning,info:'Renda − gastos já registrados − recorrências e assinaturas ainda previstas.'});
  else if(income>0&&data.current&&data.safeDaily>0)r.push({id:'safe-daily-42',priority:'watch',icon:Eye,title:`Limite seguro: ${money(data.safeDaily)}/dia`,text:data.pending>0?`Já reservei ${money(data.pending)} para recorrências e assinaturas previstas antes de calcular este valor.`:`Esse é o valor médio disponível por dia até o fim do mês.`,action:'Ver análises',run:actions.insights,info:`(${money(income)} de renda − ${money(data.total)} gastos − ${money(data.pending)} compromissos previstos) ÷ ${data.remainingDays} dias.`});
  if(data.anomaly)r.push({id:`anomaly-${data.anomaly.cat}`,priority:'now',icon:AlertTriangle,title:`${data.anomaly.cat} saiu do seu padrão`,text:`Você gastou ${money(data.anomaly.value)}, contra média recente de ${money(data.anomaly.avg)}.`,action:'Investigar',run:actions.transactions,info:`Compara ${data.anomaly.cat} com até ${data.historyMonths} meses anteriores.`});
  if(data.fixedPct>=50)r.push({id:'fixed-high',priority:'watch',icon:Target,title:'Custos fixos estão pesando',text:`Gastos fixos já consomem ${data.fixedPct.toFixed(0)}% da renda.`,action:'Revisar planejamento',run:actions.planning,info:'Gastos marcados como fixos ÷ renda × 100.'});
  if(data.top&&data.total>0&&data.top[1]/data.total>=.35)r.push({id:`top-${data.top[0]}`,priority:'opportunity',icon:Lightbulb,title:`Oportunidade em ${data.top[0]}`,text:`A categoria concentra ${(data.top[1]/data.total*100).toFixed(0)}% dos gastos. Cortar 10% nela liberaria cerca de ${money(data.top[1]*.1)}.`,action:'Ver lançamentos',run:actions.transactions,info:'Economia potencial ilustrativa = 10% do total atual da categoria.'});
  if(!expenses.length)r.push({id:'first-expense',priority:'opportunity',icon:Sparkles,title:'Comece registrando os gastos',text:'Com alguns lançamentos, o Finanças consegue detectar padrões pessoais.',action:'Abrir lançamentos',run:actions.newExpense});
  if(!r.length)r.push({id:'stable',priority:'opportunity',icon:CheckCircle2,title:'Seu mês está equilibrado',text:'Nenhuma ação urgente foi detectada agora.',action:'Abrir análises',run:actions.insights});
  return r.filter(x=>!dismissed.includes(x.id)).sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]).slice(0,5)},[data,income,expenses.length,dismissed,actions]);
 function dismiss(id){const next=[...new Set([...dismissed,id])];setDismissed(next);localStorage.setItem(storageKey,JSON.stringify(next))}
 const labels={now:'FAÇA AGORA',watch:'OBSERVE',opportunity:'OPORTUNIDADE'};
 if(loading)return <section className="panel recommendation-center"><div className="recommendation-loading">Montando recomendações pessoais...</div></section>;
 return <section className="panel recommendation-center"><div className="panel-head recommendation-head"><div><span className="recommendation-kicker"><Sparkles size={12}/> INTELLIGENCE 4.2</span><h2>Recomendações para você</h2><p>Agora considera também recorrências e assinaturas que ainda podem cair no mês.</p></div><span className="recommendation-count">{recommendations.length}</span></div>{recommendations.length?<div className="recommendation-list">{recommendations.map(item=>{const Icon=item.icon;return <article key={item.id} className={`recommendation-item ${item.priority}`}><div className="recommendation-icon"><Icon size={17}/></div><div className="recommendation-copy"><span className="recommendation-priority">{labels[item.priority]}</span><div className="recommendation-title"><b>{item.title}</b>{item.info&&<CalcInfo title="Como chegamos nisso">{item.info}</CalcInfo>}</div><p>{item.text}</p><button type="button" onClick={item.run}>{item.action}<ArrowRight size={14}/></button></div><button type="button" className="recommendation-dismiss" onClick={()=>dismiss(item.id)} title="Ocultar recomendação"><X size={14}/></button></article>})}</div>:<div className="recommendation-empty"><CheckCircle2 size={17}/>Você já revisou todas as recomendações deste mês.</div>}</section>;
}
