import React,{useMemo,useState} from 'react';
import {Sparkles,ArrowRight,Check,CalendarDays,Tag,WalletCards,X} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './QuickAdd.css';

const categories=['Moradia','Alimentação','Transporte','Lazer','Compras','Contas','Assinaturas','Investimentos','Outros'];
const categoryRules=[
 ['Alimentação',['mercado','supermercado','ifood','comida','almoço','almoco','janta','lanche','restaurante','padaria','café','cafe']],
 ['Transporte',['uber','99','gasolina','combustível','combustivel','ônibus','onibus','pedágio','pedagio','estacionamento']],
 ['Moradia',['aluguel','condomínio','condominio','casa','apartamento']],
 ['Contas',['luz','energia','água','agua','internet','telefone','celular','conta']],
 ['Assinaturas',['netflix','spotify','youtube','prime','assinatura','icloud','game pass']],
 ['Lazer',['cinema','bar','festa','show','jogo','lazer']],
 ['Compras',['roupa','amazon','shopee','mercado livre','compra','tênis','tenis']],
 ['Investimentos',['investimento','aporte','tesouro','cdb','ação','acao','fii']]
];
const iso=d=>d.toISOString().slice(0,10);
function parse(text){
 const raw=text.trim(), lower=raw.toLowerCase();
 const amountMatches=[...raw.matchAll(/(?:r\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?)/gi)];
 const amount=amountMatches.length?Number(amountMatches.at(-1)[1].replace('.','').replace(',','.')):0;
 const category=categoryRules.find(([,words])=>words.some(w=>lower.includes(w)))?.[0]||'Outros';
 let date=new Date(); if(lower.includes('ontem'))date.setDate(date.getDate()-1); if(lower.includes('amanhã')||lower.includes('amanha'))date.setDate(date.getDate()+1);
 const fixed=['aluguel','assinatura','mensal','mensalidade','condomínio','condominio'].some(w=>lower.includes(w));
 let description=raw.replace(/r\$\s*\d{1,6}(?:[.,]\d{1,2})?/gi,'').replace(/\b\d{1,6}(?:[.,]\d{1,2})?\b/g,'').replace(/\b(hoje|ontem|amanhã|amanha|fixo|variável|variavel)\b/gi,'').replace(/\s+/g,' ').trim();
 if(!description)description='Gasto rápido'; description=description.charAt(0).toUpperCase()+description.slice(1);
 return {description,amount,category,date:iso(date),type:fixed?'fixo':'variavel'};
}

export default function QuickAdd({open,onClose,userId,onSaved}){
 const[text,setText]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const parsed=useMemo(()=>parse(text),[text]);
 if(!open)return null;
 async function save(){if(!parsed.amount){setError('Inclua um valor. Ex.: Mercado 87,50 hoje');return}setSaving(true);setError('');const{data,error}=await supabase.from('gastos').insert({user_id:userId,descricao:parsed.description,valor:parsed.amount,categoria:parsed.category,data:parsed.date,tipo:parsed.type}).select().single();setSaving(false);if(error){setError(error.message);return}onSaved?.(data);setText('');onClose()}
 return <div className="quickadd-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <section className="quickadd-card">
   <header><div><span><Sparkles size={13}/> QUICK ADD</span><h2>Digite como você pensa.</h2><p>Ex.: <b>Mercado 87,50 hoje</b> ou <b>Netflix 39,90 mensal</b></p></div><button onClick={onClose}><X size={18}/></button></header>
   <div className="quickadd-input"><input autoFocus value={text} onChange={e=>{setText(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter')save()}} placeholder="Descreva o gasto em uma linha..."/><button onClick={save} disabled={saving}><ArrowRight size={18}/></button></div>
   <div className="quickadd-preview"><span><WalletCards size={14}/><b>{parsed.amount?parsed.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'R$ 0,00'}</b></span><span><Tag size={14}/>{parsed.category}</span><span><CalendarDays size={14}/>{new Date(`${parsed.date}T12:00:00`).toLocaleDateString('pt-BR')}</span><span>{parsed.type==='fixo'?'Fixo':'Variável'}</span></div>
   <div className="quickadd-description"><small>INTERPRETAÇÃO</small><b>{parsed.description}</b></div>
   {error&&<div className="quickadd-error">{error}</div>}
   <footer><span>Enter para salvar • Esc para fechar</span><button onClick={save} disabled={saving}><Check size={15}/>{saving?'Salvando...':'Salvar gasto'}</button></footer>
  </section>
 </div>
}
