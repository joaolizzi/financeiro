import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Search,LayoutDashboard,ReceiptText,CreditCard,Target,Sparkles,Plus,Pencil,Command,ArrowRight,Zap,Upload,Clock3,FileSpreadsheet,LoaderCircle,CheckCircle2} from 'lucide-react';
import * as XLSX from 'xlsx';
import {supabase} from '../lib/supabase';
import './CommandCenter.css';

const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const aliases={date:['data','date','data da compra','data compra'],description:['descricao','description','historico','lançamento','lancamento','estabelecimento'],value:['valor','value','amount','total','valor total'],category:['categoria','category'],type:['tipo','type']};
const getValue=(row,names)=>{const map=Object.fromEntries(Object.entries(row).map(([k,v])=>[normalize(k),v]));for(const n of names){if(map[normalize(n)]!==undefined)return map[normalize(n)]}return ''};
const parseMoney=v=>{if(typeof v==='number')return Math.abs(v);let s=String(v||'').replace(/[^0-9,.-]/g,'').trim();if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');return Math.abs(Number(s)||0)};
const parseDate=v=>{if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const br=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);if(br){const y=br[3].length===2?`20${br[3]}`:br[3];return `${y}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`}const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
const inferCategory=text=>{const s=normalize(text);if(/mercado|ifood|restaurante|padaria|comida|lanche/.test(s))return'Alimentação';if(/uber|99|gasolina|combustivel|posto|onibus/.test(s))return'Transporte';if(/netflix|spotify|prime|assinatura/.test(s))return'Assinaturas';if(/aluguel|condominio|casa/.test(s))return'Moradia';if(/luz|energia|agua|internet|telefone/.test(s))return'Contas';if(/cinema|jogo|bar|show/.test(s))return'Lazer';if(/amazon|shopee|mercado livre|loja/.test(s))return'Compras';return'Outros'};

export default function CommandCenter({open,onClose,onNavigate,onNewExpense,onQuickAdd,onIncome}){
 const[q,setQ]=useState(''),[results,setResults]=useState([]),[searching,setSearching]=useState(false),[importRows,setImportRows]=useState([]),[importing,setImporting]=useState(false),[importName,setImportName]=useState('');
 const fileRef=useRef(null);
 useEffect(()=>{if(open){setQ('');setResults([]);setImportRows([]);setImportName('')}},[open]);
 const actions=useMemo(()=>[
  {label:'Visão geral',hint:'Dashboard principal',icon:LayoutDashboard,run:()=>onNavigate('overview')},
  {label:'Timeline',hint:'Todos os eventos financeiros',icon:Clock3,run:()=>onNavigate('timeline')},
  {label:'Lançamentos',hint:'Histórico e filtros',icon:ReceiptText,run:()=>onNavigate('transactions')},
  {label:'Cartões',hint:'Faturas e limites',icon:CreditCard,run:()=>onNavigate('cards')},
  {label:'Planejamento',hint:'Metas e recorrências',icon:Target,run:()=>onNavigate('planning')},
  {label:'Análises',hint:'Insights e inteligência',icon:Sparkles,run:()=>onNavigate('insights')},
  {label:'Quick Add',hint:'Digite um gasto em linguagem natural',icon:Zap,run:onQuickAdd,accent:true},
  {label:'Novo gasto',hint:'Abrir formulário completo',icon:Plus,run:onNewExpense},
  {label:'Editar renda',hint:'Atualizar renda mensal',icon:Pencil,run:onIncome},
  {label:'Importar CSV / Excel',hint:'Adicionar vários lançamentos de uma planilha',icon:Upload,run:()=>fileRef.current?.click(),accent:true}
 ],[onNavigate,onNewExpense,onQuickAdd,onIncome]);
 const filtered=actions.filter(a=>`${a.label} ${a.hint}`.toLowerCase().includes(q.toLowerCase()));
 useEffect(()=>{if(!open||q.trim().length<2){setResults([]);setSearching(false);return}let alive=true;const timer=setTimeout(async()=>{setSearching(true);const term=q.trim().replace(/[%_]/g,'');const{data:{user}}=await supabase.auth.getUser();if(!user){if(alive)setSearching(false);return}const[gastos,compras,cartoes]=await Promise.all([
   supabase.from('gastos').select('id,descricao,categoria,valor,data').eq('user_id',user.id).ilike('descricao',`%${term}%`).order('data',{ascending:false}).limit(6),
   supabase.from('credit_card_purchases').select('id,descricao,categoria,valor_total,data_compra,credit_cards(nome)').eq('user_id',user.id).ilike('descricao',`%${term}%`).order('data_compra',{ascending:false}).limit(6),
   supabase.from('credit_cards').select('id,nome,apelido,limite').eq('user_id',user.id).ilike('nome',`%${term}%`).limit(4)
  ]);
  const items=[...(gastos.data||[]).map(x=>({id:`g-${x.id}`,label:x.descricao,hint:`${x.categoria} • ${money(x.valor)} • ${new Date(`${x.data}T12:00:00`).toLocaleDateString('pt-BR')}`,type:'Lançamento',icon:ReceiptText,run:()=>onNavigate('transactions')})),...(compras.data||[]).map(x=>({id:`p-${x.id}`,label:x.descricao,hint:`${x.credit_cards?.nome||'Cartão'} • ${money(x.valor_total)} • ${new Date(`${x.data_compra}T12:00:00`).toLocaleDateString('pt-BR')}`,type:'Compra no cartão',icon:CreditCard,run:()=>onNavigate('cards')})),...(cartoes.data||[]).map(x=>({id:`c-${x.id}`,label:x.apelido||x.nome,hint:`${x.nome} • Limite ${money(x.limite)}`,type:'Cartão',icon:CreditCard,run:()=>onNavigate('cards')}))];if(alive){setResults(items);setSearching(false)}},280);return()=>{alive=false;clearTimeout(timer)}},[q,open,onNavigate]);
 if(!open)return null;
 function execute(a){a.run();if(a.label!=='Importar CSV / Excel')onClose()}
 async function readFile(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;setImportName(file.name);try{const buffer=await file.arrayBuffer();const wb=XLSX.read(buffer,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});const rows=raw.map((row,i)=>{const descricao=String(getValue(row,aliases.description)||'').trim(),valor=parseMoney(getValue(row,aliases.value)),data=parseDate(getValue(row,aliases.date)),rawCat=String(getValue(row,aliases.category)||'').trim(),rawType=normalize(getValue(row,aliases.type));return{id:i+1,descricao,valor,data,categoria:rawCat||inferCategory(descricao),tipo:rawType.includes('fix')?'fixo':'variavel'}}).filter(r=>r.descricao&&r.valor>0&&r.data);setImportRows(rows)}catch{setImportRows([]);setImportName('Não foi possível ler o arquivo.')} }
 async function importAll(){if(!importRows.length)return;setImporting(true);const{data:{user}}=await supabase.auth.getUser();if(!user){setImporting(false);return}const payload=importRows.map(({descricao,valor,data,categoria,tipo})=>({user_id:user.id,descricao,valor,data,categoria,tipo}));const{error}=await supabase.from('gastos').insert(payload);setImporting(false);if(error){setImportName(`Erro: ${error.message}`);return}onNavigate('transactions');onClose();setTimeout(()=>window.location.reload(),120)}
 return <div className="command-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <section className="command-center" role="dialog" aria-modal="true">
   <input ref={fileRef} className="command-file-input" type="file" accept=".csv,.xlsx,.xls" onChange={readFile}/>
   <div className="command-search"><Search size={19}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Busque gastos, compras, cartões ou ações..."/><kbd>ESC</kbd></div>
   {importRows.length?<div className="command-import"><div className="command-import-head"><FileSpreadsheet size={19}/><div><b>{importName}</b><span>{importRows.length} lançamentos prontos para importar</span></div><button onClick={()=>setImportRows([])}>Cancelar</button></div><div className="command-import-preview">{importRows.slice(0,6).map(r=><div key={r.id}><span>{new Date(`${r.data}T12:00:00`).toLocaleDateString('pt-BR')}</span><b>{r.descricao}</b><em>{r.categoria}</em><strong>{money(r.valor)}</strong></div>)}</div><button className="command-import-confirm" onClick={importAll} disabled={importing}>{importing?<><LoaderCircle className="spin" size={15}/> Importando...</>:<><CheckCircle2 size={15}/> Importar {importRows.length} lançamentos</>}</button></div>:<>
   <div className="command-caption"><span>{q.trim().length>=2?'BUSCA GLOBAL':'AÇÕES RÁPIDAS'}</span><span><Command size={12}/> K</span></div>
   <div className="command-list">{q.trim().length>=2&&results.map(a=><button key={a.id} onClick={()=>execute(a)}><span className="command-icon"><a.icon size={18}/></span><span><b>{a.label}</b><small>{a.type} • {a.hint}</small></span><ArrowRight size={15}/></button>)}{q.trim().length>=2&&searching&&<div className="command-searching"><LoaderCircle className="spin" size={15}/> Buscando no seu histórico...</div>}{filtered.map((a,i)=><button key={a.label} className={a.accent?'accent':''} onClick={()=>execute(a)}><span className="command-icon"><a.icon size={18}/></span><span><b>{a.label}</b><small>{a.hint}</small></span><ArrowRight size={15}/><em>{i+1}</em></button>)}{!filtered.length&&!results.length&&!searching&&<div className="command-empty">Nada encontrado no seu histórico.</div>}</div>
   <footer><span>Busca global em lançamentos, compras e cartões</span><span>Finanças Command Center</span></footer></>}
  </section>
 </div>
}
