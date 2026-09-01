import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, Trash2, Plus } from 'lucide-react';

const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const categories = ['Moradia','Alimentação','Transporte','Lazer','Compras','Contas','Assinaturas','Investimentos','Outros'];
const monthName = (month, year) => new Date(year, month - 1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

export default function FinanceHistory({ expenses, income, month, year, onMonthChange, onDelete, onAdd }) {
  const [view,setView]=useState('tabela');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('Todas');
  const filtered=useMemo(()=>expenses.filter(x=>
    (!query || `${x.descricao} ${x.categoria}`.toLowerCase().includes(query.toLowerCase())) &&
    (category==='Todas' || x.categoria===category)
  ),[expenses,query,category]);
  const total=expenses.reduce((s,x)=>s+Number(x.valor||0),0);
  const fixed=expenses.filter(x=>x.tipo==='fixo').reduce((s,x)=>s+Number(x.valor||0),0);
  const variable=total-fixed;
  return <section className="history-panel">
    <div className="history-top"><div><span className="eyebrow">CONTROLE</span><h2>Histórico financeiro</h2><p>Veja seus lançamentos como uma planilha e navegue entre os meses.</p></div>
      <div className="history-month"><button onClick={()=>onMonthChange(-1)} aria-label="Mês anterior"><ArrowLeft size={17}/></button><strong>{monthName(month,year)}</strong><button onClick={()=>onMonthChange(1)} aria-label="Próximo mês"><ArrowRight size={17}/></button></div>
    </div>
    <div className="history-stats"><div><span>Entradas</span><b className="positive">{money(income)}</b></div><div><span>Gastos</span><b className="danger">{money(total)}</b></div><div><span>Resultado</span><b>{money(income-total)}</b></div><div><span>Fixos</span><b>{money(fixed)}</b></div><div><span>Variáveis</span><b>{money(variable)}</b></div></div>
    <div className="history-tabs"><button className={view==='tabela'?'active':''} onClick={()=>setView('tabela')}>Tabela</button><button className={view==='visao'?'active':''} onClick={()=>setView('visao')}>Visão do mês</button></div>
    {view==='tabela' ? <><div className="history-tools"><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar..."/></label><select value={category} onChange={e=>setCategory(e.target.value)}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button className="primary" onClick={onAdd}><Plus size={17}/> Novo gasto</button></div><div className="sheet-wrap"><table className="sheet"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td>{new Date(`${x.data}T12:00:00`).toLocaleDateString('pt-BR')}</td><td><b>{x.descricao}</b></td><td>{x.categoria}</td><td>{x.tipo==='fixo'?'Fixo':'Variável'}</td><td className="danger">− {money(x.valor)}</td><td><button className="delete" onClick={()=>onDelete(x.id)} title="Excluir"><Trash2 size={16}/></button></td></tr>)}{!filtered.length&&<tr><td colSpan="6" className="empty">Nenhum lançamento encontrado neste mês.</td></tr>}</tbody></table></div></> : <div className="month-overview"><div className="overview-row"><span>Renda</span><b>{money(income)}</b></div><div className="overview-row"><span>Total de gastos</span><b className="danger">{money(total)}</b></div><div className="overview-row"><span>Saldo do mês</span><b>{money(income-total)}</b></div><div className="overview-row"><span>Gastos fixos</span><b>{money(fixed)}</b></div><div className="overview-row"><span>Gastos variáveis</span><b>{money(variable)}</b></div></div>}
  </section>;
}
