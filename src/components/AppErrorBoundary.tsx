import { Component, type ErrorInfo, type ReactNode } from 'react';

export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('MYM page error',error,info.componentStack);}
  render(){if(this.state.failed)return <main className="fatal-error"><h1>页面暂时无法打开</h1><p>你的数据没有丢失。可以重新加载应用后继续。</p><button onClick={()=>location.reload()}>重新加载</button></main>;return this.props.children;}
}
