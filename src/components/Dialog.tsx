import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({title,children,onClose,actions}:{title:string;children:ReactNode;onClose:()=>void;actions?:ReactNode}) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="dialog-sheet" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button aria-label="关闭" onClick={onClose}><X/></button></header><div className="dialog-content">{children}</div>{actions&&<footer>{actions}</footer>}</section></div>;
}

export function Toast({message}:{message:string}) {return <div className="toast" role="status">{message}</div>}
