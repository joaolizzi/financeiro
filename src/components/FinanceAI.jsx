import React,{useState} from 'react';
import {Bot,Send,LoaderCircle,Sparkles} from 'lucide-react';
import '../ai.css';

export default function FinanceAI({session,expenses,income,month,year}){
 const[question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const suggestions=['Onde estou gastando mais?','Estou gastando mais que o normal?','Quanto posso gastar até o fim do mês?','Como posso economizar?'];
 async function ask(e){e?.preventDefault();if(!question.trim()||loading)return;setLoading(true);setError('');setAnswer('');
  try{
   const{data:{session:current}}=await import('../lib/supabase').then(m=>m.supabase.auth.getSession()).then(x=>x);
   const token=current?.access_token||session?.access_token;
   if(!token)throw new Error('Sua sessão expirou. Entre novamente.');
   const categories={};expenses.forEach(x=>{categories[x.categoria]=(categories[x.categoria]||0)+Number(x.valor||0)});
   const r=await fetch('/api/finance-ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({question,context:{mes:`${month}/${year}`,renda:Number(income||0),gastosDoMes:expenses.map(x=>({descricao:x.descricao,categoria:x.categoria,valor:Number(x.valor||0),data:x.data,tipo:x.tipo})),totalGasto:expenses.reduce((s,x)=>s+Number(x.valor||0),0),gastosPorCategoria:categories}})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível consultar a IA.');setAnswer(data.answer||'Não recebi uma resposta.');
  }catch(err){setError(err.message||'Erro ao consultar a IA.')}finally{setLoading(false)}
 }
 return <section className="panel ai-panel"><div className="panel-head"><div><h2><Bot size={19}/> Assistente financeiro</h2><p>Pergunte sobre seus gastos e renda.</p></div><Sparkles size={20}/></div><div className="ai-suggestions">{suggestions.map(s=><button type="button" key={s} onClick={()=>setQuestion(s)}>{s}</button>)}</div><form className="ai-form" onSubmit={ask}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: quanto gastei com lazer?" disabled={loading}/><button className="primary" disabled={loading||!question.trim()}>{loading?<LoaderCircle size={17} className="spin"/>:<Send size={17}/>}<span>{loading?'Analisando...':'Perguntar'}</span></button></form>{error&&<div className="error ai-error">{error}</div>}{answer&&<div className="ai-answer"><div className="ai-answer-title"><Bot size={16}/> Análise</div><div>{answer.split('\n').map((line,i)=><p key={i}>{line||' '}</p>)}</div></div>}</section>;
}