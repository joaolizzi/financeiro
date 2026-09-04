import React,{useEffect,useMemo,useState} from 'react';
import {Eye,EyeOff,Settings2,Plus,CreditCard,Target,Sparkles,Command,LayoutGrid,X,Check} from 'lucide-react';
import './PrivateWorkspace.css';

const MODULES=[['wealth','Patrimônio','Dashboard de patrimônio'],['health','Saúde financeira','Score e indicadores do mês'],['alerts','Alertas','Alertas e pontos de atenção'],['month','Resumo mensal','Gastos recentes e resumo do orçamento']];
const FAVORITES=[['expense','Novo gasto',Plus],['cards','Cartões',CreditCard],['planning','Planejamento',Target],['insights','Inteligência',Sparkles],['search','Busca global',Command]];
const defaults={modules:{wealth:true,health:true,alerts:true,month:true},favorites:['expense','cards','planning','insights','search']};

export default function PrivateWorkspace({userId,onNewExpense,onOpenCards}){
 const key=`finance-private-workspace-${userId}`;
 const[privacy,setPrivacy]=useState(()=>localStorage.getItem(`${key}-privacy`)==='1');
 const[settings,setSettings]=useState(()=>{try{return{...defaults,...JSON.parse(localStorage.getItem(key)||'{}'),modules:{...defaults.modules,...JSON.parse(localStorage.getItem(key)||'{}')?.modules}}}catch{return defaults}});
 const[open,setOpen]=useState(false);
 useEffect(()=>{localStorage.setItem(`${key}-privacy`,privacy?'1':'0');document.documentElement.classList.toggle('privacy-mode',privacy);return()=>document.documentElement.classList.remove('privacy-mode')},[privacy,key]);
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(settings));const root=document.documentElement;Object.entries(settings.modules).forEach(([name,visible])=>root.dataset[`hide${name[0].toUpperCase()}${name.slice(1)}`]=visible?'0':'1');return()=>{['Wealth','Health','Alerts','Month'].forEach(x=>delete root.dataset[`hide${x}`])}},[settings,key]);
 const favs=useMemo(()=>FAVORITES.filter(([id])=>settings.favorites.includes(id)),[settings.favorites]);
 function go(id){if(id==='expense')return onNewExpense?.();if(id==='cards')return onOpenCards?.();if(id==='search'){document.querySelector('.command-trigger[title="Command Center"]')?.click();return}const label=id==='planning'?'Planejamento':'Análises';[...document.querySelectorAll('.app-tabs button')].find(b=>b.textContent?.includes(label))?.click()}
 function toggleModule(id){setSettings(s=>({...s,modules:{...s.modules,[id]:!s.modules[id]}}))}
 function toggleFavorite(id){setSettings(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]}))}
 function reset(){setSettings(defaults)}
 return <>
  <section className="private-workspace" aria-label="Finanças Private 3.0">
   <div className="private-workspace-title"><span>PRIVATE 3.0</span><b>Seu espaço financeiro</b></div>
   <div className="private-favorites">{favs.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={14}/><span>{label}</span></button>)}</div>
   <div className="private-tools"><button className={privacy?'active':''} onClick={()=>setPrivacy(v=>!v)} title={privacy?'Mostrar valores':'Ocultar valores'}>{privacy?<EyeOff size={15}/>:<Eye size={15}/>}<span>{privacy?'Valores ocultos':'Privacidade'}</span></button><button onClick={()=>setOpen(true)}><Settings2 size={15}/><span>Personalizar</span></button></div>
  </section>
  {open&&<div className="private-customize-bg" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}><section className="private-customize"><div className="private-customize-head"><div><span>PRIVATE WORKSPACE</span><h3>Personalizar dashboard</h3><p>Escolha o que aparece na sua visão geral e quais atalhos ficam sempre à mão.</p></div><button onClick={()=>setOpen(false)}><X size={17}/></button></div><div className="private-customize-group"><b>Módulos da visão geral</b>{MODULES.map(([id,label,desc])=><button className={`private-option ${settings.modules[id]?'selected':''}`} key={id} onClick={()=>toggleModule(id)}><div><strong>{label}</strong><small>{desc}</small></div><i>{settings.modules[id]&&<Check size={13}/>}</i></button>)}</div><div className="private-customize-group"><b>Atalhos favoritos</b><div className="private-favorite-grid">{FAVORITES.map(([id,label,Icon])=><button key={id} className={settings.favorites.includes(id)?'selected':''} onClick={()=>toggleFavorite(id)}><Icon size={15}/><span>{label}</span><i>{settings.favorites.includes(id)&&<Check size={11}/>}</i></button>)}</div></div><div className="private-customize-actions"><button onClick={reset}><LayoutGrid size={14}/> Restaurar padrão</button><button className="save" onClick={()=>setOpen(false)}>Concluir</button></div></section></div>}
 </>;
}
