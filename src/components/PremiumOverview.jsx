import React,{useEffect} from 'react';
import PremiumOverviewCore from './PremiumOverviewCore';
import DashboardCustomizer,{useDashboardLayout} from './DashboardCustomizer';

const selectors={intelligence:'.overview-intelligence',hero:'.premium-hero',rhythm:'.cinematic-strip'};
export default function PremiumOverview(props={}){
 const safeProps={
  ...props,
  expenses:Array.isArray(props.expenses)?props.expenses:[],
  income:Number(props.income||0),
  month:Number(props.month||new Date().getMonth()+1),
  year:Number(props.year||new Date().getFullYear())
 };
 const{layout,save}=useDashboardLayout(safeProps.userId);
 useEffect(()=>{let hidden=[];try{const parsed=JSON.parse(localStorage.getItem('finance-dashboard-hidden'));hidden=Array.isArray(parsed)?parsed:[]}catch{};const apply=()=>{layout.forEach((id,index)=>{const el=document.querySelector(selectors[id]);if(el){el.style.order=String(index);el.style.display=hidden.includes(id)?'none':''}})};apply();const listener=e=>{hidden=Array.isArray(e.detail)?e.detail:[];apply()};window.addEventListener('finance-dashboard-visibility',listener);return()=>window.removeEventListener('finance-dashboard-visibility',listener)},[layout]);
 return <div className="customizable-overview"><DashboardCustomizer layout={layout} onChange={save}/><div className="customizable-overview-blocks"><PremiumOverviewCore {...safeProps}/></div></div>;
}
