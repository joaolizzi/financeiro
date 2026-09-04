import React,{useMemo} from 'react';
import {ShieldCheck,TrendingUp,Wallet,Target,Activity} from 'lucide-react';
import CalcInfo from './CalcInfo';
import './FinancialHealth.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);

export default function FinancialHealth({expenses,income}){
 const data=useMemo(()=>{
  const total=expenses.reduce((s,e)=>s+Number(e.valor||0),0);
  const fixed=expenses.filter(e=>e.tipo==='fixo').reduce((s,e)=>s+Number(e.valor||0),0);
  const balance=income-total;
  const used=income>0?total/income:1;
  const fixedRatio=income>0?fixed/income:1;
  const map={};expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});
  const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
  const concentration=top&&total?top[1]/total:0;
  let score=100;
  score-=clamp((used-.55)*90,0,40);
  score-=clamp((fixedRatio-.35)*70,0,25);
  score-=clamp((concentration-.38)*55,0,18);
  if(balance<0)score-=17;
  if(!income)score=35;
  score=Math.round(clamp(score,0,100));
  const level=score>=85?'Excelente':score>=70?'Saudável':score>=55?'Atenção':'Crítico';
  const summary=score>=85?'Seu orçamento está bem equilibrado.':score>=70?'Boa base financeira, com alguns pontos para otimizar.':score>=55?'Alguns hábitos estão pressionando seu orçamento.':'Seu orçamento precisa de atenção agora.';
  return{total,fixed,balance,used,fixedRatio,top,concentration,score,level,summary};
 },[expenses,income]);
 const circumference=2*Math.PI*52,offset=circumference-(data.score/100)*circumference;
 return <section className="health-shell panel"><div className="health-head"><div><span className="health-kicker"><ShieldCheck size={13}/> FINANCIAL HEALTH</span><h2>Saúde financeira <CalcInfo title="Como calculamos o score">Começamos em 100 pontos e reduzimos conforme a renda usada passa de 55%, os gastos fixos passam de 35%, uma categoria concentra mais de 38% dos gastos e quando o saldo fica negativo. Sem renda definida, o indicador começa em 35.</CalcInfo></h2><p>Um indicador pessoal baseado no equilíbrio do seu mês.</p></div><span className={`health-level score-${data.score>=70?'good':data.score>=55?'mid':'low'}`}>{data.level}</span></div><div className="health-grid"><div className="health-score"><svg viewBox="0 0 120 120"><circle className="health-track" cx="60" cy="60" r="52"/><circle className="health-ring" cx="60" cy="60" r="52" strokeDasharray={circumference} strokeDashoffset={offset}/></svg><div><strong>{data.score}</strong><span>/100</span></div></div><div className="health-copy"><b>{data.summary}</b><span>Este score é apenas um indicador interno do Finanças e não tem relação com score de crédito bancário.</span><div className="health-metrics"><article><Wallet size={15}/><div><small>Renda usada <CalcInfo title="Renda usada">Total de gastos do mês ÷ renda do mês × 100.</CalcInfo></small><b>{(data.used*100).toFixed(0)}%</b></div></article><article><Activity size={15}/><div><small>Gastos fixos <CalcInfo title="Gastos fixos">Soma dos lançamentos marcados como fixos ÷ renda do mês × 100.</CalcInfo></small><b>{(data.fixedRatio*100).toFixed(0)}%</b></div></article><article><Target size={15}/><div><small>Maior categoria <CalcInfo title="Maior categoria">Somamos os gastos de cada categoria e mostramos a que possui o maior total no período.</CalcInfo></small><b>{data.top?.[0]||'—'}</b></div></article><article><TrendingUp size={15}/><div><small>Saldo atual <CalcInfo title="Saldo atual">Renda do mês − total de gastos cadastrados no período.</CalcInfo></small><b>{money(data.balance)}</b></div></article></div></div></div></section>;
}
