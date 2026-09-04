import React,{useEffect,useMemo,useState} from 'react';
import {BriefcaseBusiness,Landmark,RefreshCw,WalletCards} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './MoneyBuckets.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const TYPES=[['disponivel','Disponível','Dinheiro para gastos do dia a dia',WalletCards],['guardado','Guardado','Reserva e dinheiro separado',Landmark],['investimentos','Investimentos','Patrimônio investido',BriefcaseBusiness]];
const EMPTY={disponivel:0,guardado:0,investimentos:0};

export default function MoneyBuckets({userId}){
 const[buckets,setBuckets]=useState(EMPTY);
 const[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[show,setShow]=useState(false);
 const[from,setFrom]=useState('disponivel'),[to,setTo]=useState('guardado'),[amount,setAmount]=useState(''),[description,setDescription]=useState('');
 async function load(){setLoading(true);setError('');const{data,error}=await supabase.from('finance_balances').select('tipo,valor').eq('user_id',userId);if(error)setError(error.message);else setBuckets({...EMPTY,...Object.fromEntries((data||[]).map(x=>[x.tipo,Number(x.valor)]))});setLoading(false)}
 useEffect(()=>{if(userId)load()},[userId]);
 const total=useMemo(()=>Object.values(buckets).reduce((a,b)=>a+b,0),[buckets]);
 async function transfer(e){e.preventDefault();if(saving)return;const value=Number(amount);if(!Number.isFinite(value)||value<=0){setError('Informe um valor válido.');return}if(from===to){setError('Escolha locais diferentes para a transferência.');return}setSaving(true);setError('');
  const{data:old,error:oldError}=await supabase.from('finance_balances').select('tipo,valor').eq('user_id',userId).in('tipo',[from,to]);
  if(oldError){setError(oldError.message);setSaving(false);return}
  const current={...EMPTY,...buckets,...Object.fromEntries((old||[]).map(x=>[x.tipo,Number(x.valor)]))};
  if(current[from]<value){setError('Você não tem saldo suficiente nesse local.');setSaving(false);return}
  const next={...current,[from]:current[from]-value,[to]:current[to]+value};
  const{error:upError}=await supabase.from('finance_balances').upsert([{user_id:userId,tipo:from,valor:next[from]},{user_id:userId,tipo:to,valor:next[to]}],{onConflict:'user_id,tipo'});
  if(upError){setError(upError.message);setSaving(false);return}
  const{error:txError}=await supabase.from('finance_transfers').insert({user_id:userId,de:from,para:to,valor:value,descricao:description.trim()||'Transferência'});
  if(txError){
   const{error:rollbackError}=await supabase.from('finance_balances').upsert([{user_id:userId,tipo:from,valor:current[from]},{user_id:userId,tipo:to,valor:current[to]}],{onConflict:'user_id,tipo'});
   setSaving(false);setError(rollbackError?`A transferência falhou e não foi possível restaurar os saldos automaticamente: ${rollbackError.message}`:`A transferência foi cancelada: ${txError.message}`);await load();return
  }
  setBuckets(next);setAmount('');setDescription('');setShow(false);setSaving(false)
 }
 return <section className="panel money-panel"><div className="panel-head"><div><h2>Onde está seu dinheiro?</h2><p>Separe o dinheiro disponível, guardado e investido.</p></div><button className="secondary" onClick={()=>{setError('');setShow(true)}}><RefreshCw size={15}/> Transferir</button></div>{error&&<div className="error banner">{error}</div>}<div className="money-total"><span>Patrimônio controlado</span><strong>{loading?'Carregando...':money(total)}</strong></div><div className="money-grid">{TYPES.map(([type,label,desc,Icon])=><article className="money-bucket" key={type}><div className="money-icon"><Icon size={18}/></div><div><span>{label}</span><b>{money(buckets[type])}</b><small>{desc}</small></div></article>)}</div>{show&&<div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&!saving&&setShow(false)}><form className="modal" onSubmit={transfer}><div className="modal-head"><div><h2>Transferir dinheiro</h2><p>Mova valores entre suas reservas sem alterar seus gastos.</p></div><button type="button" className="close" disabled={saving} onClick={()=>setShow(false)}>×</button></div><label>De</label><select value={from} onChange={e=>setFrom(e.target.value)}>{TYPES.map(([t,l])=><option key={t} value={t}>{l} — {money(buckets[t])}</option>)}</select><label>Para</label><select value={to} onChange={e=>setTo(e.target.value)}>{TYPES.map(([t,l])=><option key={t} value={t}>{l}</option>)}</select><label>Valor</label><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" required/><label>Descrição</label><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Guardar dinheiro do mês"/><button className="primary" disabled={saving||from===to}>{saving?'Transferindo...':'Confirmar transferência'}</button></form></div>}</section>;
}
