import React,{useEffect} from 'react';
import PremiumOverviewCore from './PremiumOverviewCore';
import DashboardCustomizer,{useDashboardLayout} from './DashboardCustomizer';

const selectors={intelligence:'.overview-intelligence',hero:'.premium-hero',rhythm:'.cinematic-strip'};
export default function PremiumOverview(props){
 const{layout,save}=useDashboardLayout(props.userId);
 useEffect(()=>{let hidden=[];try{hidden=JSON.parse(localStorage.getItem('finance-dashboard-hidden'))||[]}catch{};const apply=()=>{layout.forEach((id,index)=>{const el=document.querySelector(selectors[id]);if(el){el.style.order=String(index);el.style.display=hidden.includes(id)?'none':''}})};apply();const listener=e=>{hidden=e.detail||[];apply()};window.addEventListener('finance-dashboard-visibility',listener);return()=>window.removeEventListener('finance-dashboard-visibility',listener)},[layout]);
 return <div className="customizable-overview"><DashboardCustomizer layout={layout} onChange={save}/><div className="customizable-overview-blocks"><PremiumOverviewCore {...props}/></div></div>;
}
