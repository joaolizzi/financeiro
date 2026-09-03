import React,{useMemo} from 'react';
import {BarChart,Bar,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer} from 'recharts';
import './DashboardCharts.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

function shortDate(value){
 const d=new Date(`${value}T12:00:00`);
 return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
}

export default function DashboardCharts({expenses,income}){
 const categoryData=useMemo(()=>{
  const map={};
  expenses.forEach(e=>{map[e.categoria]=(map[e.categoria]||0)+Number(e.valor||0)});
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([categoria,valor])=>({categoria,valor:Number(valor.toFixed(2))}));
 },[expenses]);

 const dailyData=useMemo(()=>{
  const map={};
  expenses.forEach(e=>{map[e.data]=(map[e.data]||0)+Number(e.valor||0)});
  let acumulado=0;
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([data,gasto])=>{
   acumulado+=gasto;
   return {data:shortDate(data),gasto:Number(gasto.toFixed(2)),acumulado:Number(acumulado.toFixed(2))};
  });
 },[expenses]);

 const trend=useMemo(()=>{
  if(dailyData.length<2)return {label:'Sem dados suficientes',type:'neutral'};
  const first=dailyData[0].acumulado;
  const last=dailyData[dailyData.length-1].acumulado;
  if(!first)return {label:'Gastos começaram recentemente',type:'neutral'};
  const change=((last-first)/first)*100;
  return change>10?{label:`Ritmo de gastos acelerando (${change.toFixed(0)}%)`,type:'negative'}:change<-10?{label:`Ritmo de gastos desacelerando (${Math.abs(change).toFixed(0)}%)`,type:'positive'}:{label:'Ritmo de gastos estável',type:'neutral'};
 },[dailyData]);

 const used=income>0?(expenses.reduce((s,e)=>s+Number(e.valor||0),0)/income)*100:null;

 return <section className="dashboard-charts">
  <div className="dashboard-charts-head"><div><span className="advanced-eyebrow">DASHBOARD 2.0</span><h2>Gráficos e tendências</h2><p>Explore seus gastos por categoria e veja como eles evoluem ao longo do mês.</p></div><div className={`trend-badge ${trend.type}`}>● {trend.label}</div></div>
  <div className="charts-grid">
   <article className="panel chart-panel"><div className="chart-head"><div><h3>Gastos por categoria</h3><p>Passe o mouse sobre as barras para ver os valores.</p></div></div>{categoryData.length?<ResponsiveContainer width="100%" height={280}><BarChart data={categoryData} margin={{top:8,right:8,left:0,bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#202735"/><XAxis dataKey="categoria" tick={{fill:'#7f8999',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`R$ ${v>=1000?(v/1000).toFixed(1)+'k':v}`} tick={{fill:'#7f8999',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>money(v)} contentStyle={{background:'#111722',border:'1px solid #303a4d',borderRadius:10,color:'#fff'}} labelStyle={{color:'#aeb8ff'}}/><Bar dataKey="valor" name="Gastos" radius={[7,7,0,0]} fill="#aeb8ff"/></BarChart></ResponsiveContainer>:<div className="chart-empty">Adicione gastos para gerar o gráfico.</div>}</article>
   <article className="panel chart-panel"><div className="chart-head"><div><h3>Evolução dos gastos</h3><p>Gasto diário e acumulado no mês.</p></div></div>{dailyData.length?<ResponsiveContainer width="100%" height={280}><LineChart data={dailyData} margin={{top:8,right:8,left:0,bottom:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#202735"/><XAxis dataKey="data" tick={{fill:'#7f8999',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`R$ ${v>=1000?(v/1000).toFixed(1)+'k':v}`} tick={{fill:'#7f8999',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>money(v)} contentStyle={{background:'#111722',border:'1px solid #303a4d',borderRadius:10,color:'#fff'}} labelStyle={{color:'#aeb8ff'}}/><Line type="monotone" dataKey="gasto" name="Gasto do dia" stroke="#aeb8ff" strokeWidth={2.5} dot={{r:3}} activeDot={{r:6}}/><Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#91d4ad" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>:<div className="chart-empty">Adicione gastos para acompanhar sua evolução.</div>}</article>
  </div>
  <div className="trend-grid">
   <article className="panel trend-card"><span>Leitura da tendência</span><strong className={trend.type}>{trend.label}</strong><p>O gráfico considera os lançamentos registrados e ajuda a identificar mudanças no ritmo de consumo.</p></article>
   <article className="panel trend-card"><span>Renda comprometida</span><strong>{used===null?'—':`${Math.min(used,999).toFixed(0)}%`}</strong><p>{used===null?'Defina sua renda mensal para comparar seus gastos.':used>100?'Os gastos já ultrapassaram a renda cadastrada.':`${money(Math.max(Number(income||0)-expenses.reduce((s,e)=>s+Number(e.valor||0),0),0))} ainda não foram comprometidos.`}</p></article>
  </div>
 </section>;
}
