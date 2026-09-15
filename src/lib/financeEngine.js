const number=v=>Number(v||0);

export const normalizeFinanceText=value=>String(value||'')
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'')
 .toLowerCase()
 .replace(/[^a-z0-9]/g,' ')
 .replace(/\s+/g,' ')
 .trim();

export const sameMoney=(a,b)=>Math.abs(number(a)-number(b))<0.02;
export const financeMonthIndex=(year,month)=>Number(year)*12+(Number(month)-1);

export function getPeriodState(year,month,now=new Date()){
 const y=Number(year),m=Number(month);
 const selected=new Date(y,m-1,1),currentStart=new Date(now.getFullYear(),now.getMonth(),1);
 const current=now.getFullYear()===y&&now.getMonth()+1===m;
 const past=selected<currentStart;
 const future=!current&&!past;
 const days=new Date(y,m,0).getDate();
 const elapsed=past?days:current?Math.max(1,Math.min(now.getDate(),days)):0;
 const remainingDays=past?0:current?Math.max(days-now.getDate()+1,1):days;
 const todayDay=current?now.getDate():future?0:days;
 return{current,past,future,days,elapsed,remainingDays,todayDay,key:`${y}-${String(m).padStart(2,'0')}`};
}

export function expenseAlreadyRegistered(expenses,name,value){
 const target=normalizeFinanceText(name);
 if(!target)return false;
 return (expenses||[]).some(expense=>{
  const current=normalizeFinanceText(expense.descricao);
  const textMatches=current===target||(target.length>=5&&current.includes(target))||(current.length>=5&&target.includes(current));
  return textMatches&&sameMoney(expense.valor,value);
 });
}

function commitmentKey(name,value){
 return `${normalizeFinanceText(name)}:${number(value).toFixed(2)}`;
}

export function cardCycleMonthIndex(date,closingDay){
 if(!date)return null;
 const d=new Date(`${date}T12:00:00`);
 if(Number.isNaN(d.getTime()))return null;
 const cycle=new Date(d);
 const closing=Math.max(1,Math.min(31,Number(closingDay||1)));
 if(d.getDate()>closing)cycle.setMonth(cycle.getMonth()+1);
 return financeMonthIndex(cycle.getFullYear(),cycle.getMonth()+1);
}

export function calculateCardInstallmentsForMonth({cards=[],purchases=[],month,year}){
 const cardsById=Object.fromEntries((cards||[]).map(card=>[String(card.id),card]));
 const target=financeMonthIndex(year,month);
 const items=[];
 for(const purchase of purchases||[]){
  const card=cardsById[String(purchase.card_id)];
  if(!card)continue;
  const start=cardCycleMonthIndex(purchase.data_compra,card.dia_fechamento);
  if(start===null)continue;
  const count=Math.max(1,Math.trunc(number(purchase.parcelas)||1));
  if(target<start||target>=start+count)continue;
  const installment=number(purchase.valor_total)/count;
  items.push({purchase,card,installment,installmentNumber:target-start+1,installments:count});
 }
 const byCard={};
 items.forEach(item=>{const key=String(item.card.id);byCard[key]=(byCard[key]||0)+item.installment});
 return{total:items.reduce((sum,item)=>sum+item.installment,0),items,byCard};
}

export function calculatePendingCommitments({expenses=[],recurring=[],subscriptions=[],cards=[],purchases=[],month,year,now=new Date()}){
 const period=getPeriodState(year,month,now);
 if(period.past)return{...period,pendingRecurring:0,pendingSubscriptions:0,pendingCards:0,totalCommitments:0};
 const already=(name,value)=>expenseAlreadyRegistered(expenses,name,value);
 const counted=new Set();
 const addOnce=(name,value)=>{
  const amount=number(value);
  if(amount<=0||already(name,amount))return 0;
  const key=commitmentKey(name,amount);
  if(counted.has(key))return 0;
  counted.add(key);
  return amount;
 };
 const pendingRecurring=(recurring||[])
  .filter(item=>item?.ativo!==false)
  .filter(item=>item.last_confirmed_month!==period.key)
  .reduce((sum,item)=>sum+addOnce(item.descricao,item.valor),0);
 const pendingSubscriptions=(subscriptions||[])
  .filter(item=>item?.ativo!==false)
  .reduce((sum,item)=>sum+addOnce(item.nome,item.valor),0);
 const cardInvoice=calculateCardInstallmentsForMonth({cards,purchases,month,year});
 const pendingCards=cardInvoice.items
  .reduce((sum,item)=>sum+addOnce(item.purchase.descricao,item.installment),0);
 return{...period,pendingRecurring,pendingSubscriptions,pendingCards,totalCommitments:pendingRecurring+pendingSubscriptions+pendingCards};
}

export function calculateMonthProjection({expenses=[],income=0,month,year,commitments=0,now=new Date()}){
 const period=getPeriodState(year,month,now);
 const total=(expenses||[]).reduce((sum,item)=>sum+number(item.valor),0);
 const projected=period.current&&period.elapsed?total/period.elapsed*period.days:total;
 const free=number(income)-total-number(commitments);
 const safeDaily=period.current&&number(income)>0?Math.max(free,0)/period.remainingDays:0;
 const projectedWithCommitments=projected+number(commitments);
 return{...period,total,projected,projectedWithCommitments,free,safeDaily};
}
