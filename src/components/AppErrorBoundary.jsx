import React from 'react';
import {AlertTriangle,RefreshCw,Home} from 'lucide-react';
import './AppErrorBoundary.css';

export default class AppErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={hasError:false,error:null}}
 static getDerivedStateFromError(error){return{hasError:true,error}}
 componentDidCatch(error,info){console.error('[Finanças] UI error:',error,info)}
 reset=()=>this.setState({hasError:false,error:null});
 render(){
  if(!this.state.hasError)return this.props.children;
  return <main className="app-error-page"><section className="app-error-card"><div className="app-error-icon"><AlertTriangle size={24}/></div><span className="app-error-kicker">RECUPERAÇÃO SEGURA</span><h1>Esta área encontrou um problema</h1><p>Seus dados não foram apagados. Você pode tentar carregar novamente sem deixar um componente derrubar o app inteiro.</p><div className="app-error-actions"><button className="primary" onClick={()=>window.location.reload()}><RefreshCw size={15}/> Recarregar</button><button className="secondary" onClick={()=>{this.reset();window.history.replaceState({},'',window.location.pathname)}}><Home size={15}/> Tentar voltar</button></div>{import.meta.env.DEV&&this.state.error&&<code>{String(this.state.error.message||this.state.error)}</code>}</section></main>
 }
}
