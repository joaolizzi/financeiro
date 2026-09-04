import React from 'react';
import {Info} from 'lucide-react';
import './CalcInfo.css';

export default function CalcInfo({title='Como calculamos',children,label}){
 const text=label||title;
 return <span className="calc-info" tabIndex={0} aria-label={text}>
  <Info size={12}/>
  <span className="calc-info-popover" role="tooltip"><b>{title}</b><span>{children}</span></span>
 </span>;
}
