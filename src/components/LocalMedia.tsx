import { useEffect, useState } from 'react';
import { File, Image as ImageIcon, Play, Volume2 } from 'lucide-react';
import { getOPFSObjectURL } from '../data/opfs';
import { formatDuration } from '../data/presentation';
import type { Media } from '../types';

export function useOPFSObjectURL(path?:string) {
  const [state,setState]=useState<{url?:string;error?:string}>({});
  useEffect(()=>{
    let active=true,url:string|undefined;
    setState({});
    if(!path)return;
    getOPFSObjectURL(path).then(value=>{url=value;if(active)setState({url:value});else URL.revokeObjectURL(value);}).catch(error=>{if(active)setState({error:error instanceof Error?error.message:'媒体无法读取'});});
    return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[path]);
  return state;
}

export function MediaThumbnail({media,className='',alt='本地媒体'}:{media?:Media;className?:string;alt?:string}) {
  const path=media?.thumbnailPath||(media?.kind==='image'?media.opfsPath:undefined);
  const {url}=useOPFSObjectURL(path);
  if(!media)return <div className={`media-placeholder ${className}`}><ImageIcon/></div>;
  if(url)return <div className={`media-thumbnail ${className}`}><img src={url} alt={alt}/>{media.kind==='video'&&<><span className="media-play"><Play fill="currentColor"/></span>{media.duration&&<small>{formatDuration(media.duration)}</small>}</>}</div>;
  const Icon=media.kind==='video'?Play:media.kind==='audio'?Volume2:media.kind==='file'?File:ImageIcon;
  return <div className={`media-placeholder ${className}`}><Icon/>{media.kind==='video'&&<span>视频</span>}</div>;
}

export function FullMedia({media}:{media:Media}) {
  const {url,error}=useOPFSObjectURL(media.opfsPath);
  if(error)return <div className="media-error">{error}</div>;
  if(!url)return <div className="media-loading">正在读取本地媒体…</div>;
  if(media.kind==='image')return <img className="full-media" src={url} alt="记录图片"/>;
  if(media.kind==='video')return <video className="full-media" src={url} controls playsInline preload="metadata"/>;
  if(media.kind==='audio')return <audio className="audio-player" src={url} controls preload="metadata"/>;
  return <a className="attachment-link" href={url} download={media.title||'附件'}><File/> 下载附件</a>;
}
