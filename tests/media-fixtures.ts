import type { Page } from '@playwright/test';

export const pngBuffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAwMDAxAABBgAE/wH+W2nUAAAAAElFTkSuQmCC','base64');

export function wavBuffer(){
  const sampleRate=8000,duration=.2,samples=Math.floor(sampleRate*duration),buffer=Buffer.alloc(44+samples*2);let offset=0;
  const text=(value:string)=>{buffer.write(value,offset);offset+=value.length};const u32=(value:number)=>{buffer.writeUInt32LE(value,offset);offset+=4};const u16=(value:number)=>{buffer.writeUInt16LE(value,offset);offset+=2};
  text('RIFF');u32(36+samples*2);text('WAVE');text('fmt ');u32(16);u16(1);u16(1);u32(sampleRate);u32(sampleRate*2);u16(2);u16(16);text('data');u32(samples*2);
  for(let i=0;i<samples;i++)buffer.writeInt16LE(Math.round(Math.sin(i/8)*800),44+i*2);return buffer;
}

export async function webmBuffer(page:Page){
  const bytes=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const ctx=canvas.getContext('2d')!;const stream=canvas.captureStream(12);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks:Blob[]=[];recorder.ondataavailable=event=>chunks.push(event.data);
    const stopped=new Promise<void>(resolve=>recorder.onstop=()=>resolve());recorder.start();
    for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#269f68':'#123f32';ctx.fillRect(0,0,96,64);ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.fillText('MYM',24,38);await new Promise(resolve=>setTimeout(resolve,40));}
    recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
  });
  return Buffer.from(bytes);
}
