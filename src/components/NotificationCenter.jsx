import React,{useEffect,useMemo,useState} from 'react';
import {Bell,AlertTriangle,CheckCircle2,Target,Wallet,TrendingUp,X,CreditCard,CalendarClock,Gauge,ShieldAlert,ReceiptText} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './NotificationCenter.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const median=values=>{const a=values.filter(v=>Number.isFinite(v)&&v>0).sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const daysUntilDay=day=>{const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),max=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),d=Math.min(Math.max(Number(day||1),1),max);let target=new Date(now.getFullYear(),now.getMonth(),d);if(target<today){const nextMax=new Date(now.getFullYear(),now.getMonth()+2,0).getDate();target=new Date(now.getFullYear(),now.getMonth()+1,Math.min(d,nextMax))}return Math.ceil((target-today)/86400000)};

export default function NotificationCenter({open,onClose,expenses,income}){
 const[extra,setExtra]=useState({cards:[],limits:[],budget:0,subscriptions:[]}),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!open)return;let alive=true;async function load(){setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user){if(alive)setLoading(false);return}const now=new Date(),month=now.getMonth()+1,year=now.getFullYear();const[c,l,b,s]=await Promise.all([
  supabase.from('credit_cards').select('id,nome,apelido,dia_vencimento,limite').eq('user_id',user.id),
  supabase.from('finance_limits').select('id,categoria,valor').eq('user_id',user.id),
  supabase.from('finance_monthly_budgets').select('valor').eq('user_id',user.id).eq('mes',month).eq('ano',year).maybeSingle(),
  supabase.from('finance_subscriptions').select('id,nome,valor,dia,ativo').eq('user_id',user.id).eq('ativo',true)
 ]);if(!alive)return;setExtra({cards:c.data||[],limits:l.data||[],budget:Number(b.data?.valor||0),subscriptions:s.data||[]});setLoading(false)}load();return()=>{alive=false}},[open]);
 const items=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0),fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0),balance=income-total;
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0],out=[];
  const limit=extra.budget||Number(income||0),used=limit?total/limit:0;
  if(limit&&used>=1)out.push({priority:100,type:'danger',icon:Gauge,title:'Limite mensal ultrapassado',text:`Você passou ${money(total-limit)} do ${extra.budget?'orçamento':'valor disponível'} deste mês.`,when:'agora'});
  else if(limit&&used>=.8)out.push({priority:85,type:'warning',icon:Gauge,title:'Orçamento perto do limite',text:`Você já utilizou ${(used*100).toFixed(0)}% de ${money(limit)}.`,when:'agora'});
  if(balance<0)out.push({priority:98,type:'danger',icon:Wallet,title:'Saldo negativo',text:`Seus gastos ultrapassaram a renda em ${money(Math.abs(balance))}.`,when:'agora'});
  extra.limits.forEach(l=>{const spent=Number(map[l.categoria]||0),cap=Number(l.valor||0),pct=cap?spent/cap:0;if(pct>=1)out.push({priority:94,type:'danger',icon:ShieldAlert,title:`Limite de ${l.categoria} estourado`,text:`Você gastou ${money(spent)} de um limite de ${money(cap)}.`,when:'este mês'});else if(pct>=.8)out.push({priority:76,type:'warning',icon:ShieldAlert,title:`${l.categoria} perto do limite`,text:`${(pct*100).toFixed(0)}% do limite da categoria já foi utilizado.`,when:'este mês'})});
  extra.cards.forEach(c=>{const days=daysUntilDay(c.dia_vencimento);if(days<=3)out.push({priority:92-days,type:days===0?'danger':'warning',icon:CreditCard,title:`Fatura ${c.apelido||c.nome} ${days===0?'vence hoje':'perto do vencimento'}`,text:days===0?'Confira a fatura antes do fim do dia.':`Vencimento em ${days} ${days===1?'dia':'dias'} (dia ${c.dia_vencimento}).`,when:days===0?'hoje':`em ${days}d`});else if(days<=7)out.push({priority:62,type:'info',icon:CalendarClock,title:`Próximo vencimento: ${c.apelido||c.nome}`,text:`A fatura vence no dia ${c.dia_vencimento}, em ${days} dias.`,when:`em ${days}d`})});
  extra.subscriptions.forEach(s=>{const days=daysUntilDay(s.dia);if(days<=2)out.push({priority:58,type:'info',icon:CalendarClock,title:`${s.nome} ${days===0?'cobra hoje':'está próxima'}`,text:`${money(s.valor)} previsto${days===0?' para hoje':` em ${days} ${days===1?'dia':'dias'}`}.`,when:days===0?'hoje':`em ${days}d`})});
  const values=expenses.map(e=>Number(e.valor||0)).filter(v=>v>0),med=median(values);if(values.length>=5&&med>0){const unusual=expenses.filter(e=>Number(e.valor||0)>=Math.max(med*2.7,100)).sort((a,b)=>Number(b.valor)-Number(a.valor))[0];if(unusual)out.push({priority:72,type:'info',icon:ReceiptText,title:'Gasto fora do padrão detectado',text:`${unusual.descricao} (${money(unusual.valor)}) ficou bem acima do gasto típico de ${money(med)}.`,when:'este mês'})}
  if(income>0&&fixed/income>=.5)out.push({priority:55,type:'warning',icon:TrendingUp,title:'Fixos elevados',text:`Gastos fixos consomem ${(fixed/income*100).toFixed(0)}% da renda.`,when:'este mês'});
  if(top&&total&&top[1]/total>=.35)out.push({priority:42,type:'info',icon:Target,title:`${top[0]} em destaque`,text:`Essa categoria concentra ${(top[1]/total*100).toFixed(0)}% dos seus gastos.`,when:'este mês'});
  const unique=[];for(const item of out.sort((a,b)=>b.priority-a.priority)){if(!unique.some(x=>x.title===item.title))unique.push(item)}
  if(!unique.length&&!loading)unique.push({priority:0,type:'positive',icon:CheckCircle2,title:'Tudo sob controle',text:'Nenhuma situação importante exige sua atenção agora.',when:'agora'});
  return unique.slice(0,8);
 },[expenses,income,extra,loading]);
 if(!open)return null;
 const critical=items.filter(x=>x.type==='danger').length,warning=items.filter(x=>x.type==='warning').length;
 return <div className="notify-layer" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="notify-center"><header><div><span><Bell size={14}/> INTELLIGENCE 2.0</span><h3>Notificações</h3><p>Prioridades do seu financeiro em tempo real.</p></div><button onClick={onClose}><X size={17}/></button></header><div className="notify-summary"><div><strong>{critical}</strong><span>críticos</span></div><div><strong>{warning}</strong><span>atenção</span></div><div><strong>{items.length}</strong><span>ativos</span></div></div><div className="notify-list">{loading&&<div className="notify-loading">Analisando cartões, limites e compromissos...</div>}{items.map((n,i)=>{const Icon=n.icon;return <article className={`notify-item ${n.type}`} key={`${n.title}-${i}`}><div className="notify-icon"><Icon size={16}/></div><div><b>{n.title}</b><span>{n.text}</span></div><em>{n.when||'agora'}</em></article>})}</div><footer><span>{items.length} {items.length===1?'aviso':'avisos'} ativos</span><b>Finanças Intelligence 2.0</b></footer></aside></div>;
}
