import React,{useEffect,useMemo,useState} from 'react';
import {Sparkles,ArrowRight,Check,CalendarDays,Tag,WalletCards,X,ArrowDownCircle,ArrowUpCircle} from 'lucide-react';
import {supabase} from '../lib/supabase';
import './QuickAdd.css';

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
const incomeWords=['salário','salario','recebi','recebido','renda','pix recebido','entrada','freela','freelance','pagamento recebido','vendi','venda'];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function moneyNumber(value){
 const v=String(value||'').replace(/\s/g,'');
 if(v.includes(',')&&v.includes('.'))return Number(v.lastIndexOf(',')>v.lastIndexOf('.')?v.replace(/\./g,'').replace(',','.'):v.replace(/,/g,''));
 if(v.includes(','))return Number(v.replace(',','.'));
 if(v.includes('.')){const parts=v.split('.');return parts.length===2&&parts[1].length<=2?Number(v):Number(v.replace(/\./g,''));}
 return Number(v);
}
function parse(text){
 const raw=text.trim(),lower=raw.toLowerCase();
 const amountMatches=[...raw.matchAll(/(?:r\$\s*)?(\d{1,9}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?)/gi)];
 const amount=amountMatches.length?moneyNumber(amountMatches.at(-1)[1]):0;
 const kind=incomeWords.some(w=>lower.includes(w))?'income':'expense';
 const category=kind==='expense'?(categoryRules.find(([,words])=>words.some(w=>lower.includes(w)))?.[0]||'Outros'):'Renda';
 let date=new Date();if(lower.includes('ontem'))date.setDate(date.getDate()-1);if(lower.includes('amanhã')||lower.includes('amanha'))date.setDate(date.getDate()+1);
 const fixed=['aluguel','assinatura','mensal','mensalidade','condomínio','condominio'].some(w=>lower.includes(w));
 let description=raw.replace(/r\$\s*\d{1,9}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?/gi,'').replace(/\b\d{1,9}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?\b/g,'').replace(/\b(hoje|ontem|amanhã|amanha|fixo|variável|variavel)\b/gi,'').replace(/\s+/g,' ').trim();
 if(!description)description=kind==='income'?'Entrada rápida':'Gasto rápido';description=description.charAt(0).toUpperCase()+description.slice(1);
 return{description,amount:Number.isFinite(amount)?amount:0,category,date:iso(date),type:fixed?'fixo':'variavel',kind};
}

export default function QuickAdd({open,onClose,userId,onSaved}){
 const[text,setText]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const parsed=useMemo(()=>parse(text),[text]);
 useEffect(()=>{if(!open)return;const key=e=>{if(e.key==='Escape'&&!saving)onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open,saving,onClose]);
 if(!open)return null;
 async function save(){
  if(saving)return;if(!userId){setError('Sua sessão não está disponível. Entre novamente.');return}if(!parsed.amount||parsed.amount<=0){setError('Inclua um valor válido. Ex.: Mercado 87,50 hoje');return}
  setSaving(true);setError('');
  const payload=parsed.kind==='income'?{user_id:userId,descricao:parsed.description,valor:parsed.amount,data:parsed.date}:{user_id:userId,descricao:parsed.description,valor:parsed.amount,categoria:parsed.category,data:parsed.date,tipo:parsed.type};
  const table=parsed.kind==='income'?'rendas':'gastos';
  const{data,error}=await supabase.from(table).insert(payload).select().single();setSaving(false);
  if(error){setError(error.message);return}onSaved?.(data,{kind:parsed.kind});setText('');onClose();
 }
 return <div className="quickadd-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!saving&&onClose()}>
  <section className="quickadd-card">
   <header><div><span><Sparkles size={13}/> QUICK ADD 2.0</span><h2>Digite como você pensa.</h2><p>Ex.: <b>Mercado 87.50 hoje</b>, <b>Netflix 39,90 mensal</b> ou <b>Recebi salário 2500</b></p></div><button onClick={onClose} disabled={saving}><X size={18}/></button></header>
   <div className="quickadd-input"><input autoFocus inputMode="text" value={text} onChange={e=>{setText(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();save()}}} placeholder="Gasto ou entrada em uma linha..."/><button onClick={save} disabled={saving}><ArrowRight size={18}/></button></div>
   <div className={`quickadd-kind ${parsed.kind}`}><span>{parsed.kind==='income'?<ArrowUpCircle size={14}/>:<ArrowDownCircle size={14}/>} {parsed.kind==='income'?'Entrada':'Gasto'}</span><small>detectado automaticamente</small></div>
   <div className="quickadd-preview"><span><WalletCards size={14}/><b>{parsed.amount?parsed.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'R$ 0,00'}</b></span>{parsed.kind==='expense'&&<span><Tag size={14}/>{parsed.category}</span>}<span><CalendarDays size={14}/>{new Date(`${parsed.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>{parsed.kind==='expense'&&<span>{parsed.type==='fixo'?'Fixo':'Variável'}</span>}</div>
   <div className="quickadd-description"><small>INTERPRETAÇÃO</small><b>{parsed.description}</b></div>
   {error&&<div className="quickadd-error">{error}</div>}
   <footer><span>Enter para salvar • Esc para fechar</span><button onClick={save} disabled={saving}><Check size={15}/>{saving?'Salvando...':parsed.kind==='income'?'Salvar entrada':'Salvar gasto'}</button></footer>
  </section>
 </div>
}
