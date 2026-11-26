const state={whatsapp:'iniciando',storage:'verificando',media:0};
export const runtimeStatus=()=>({...state});
export const setRuntime=(k,v)=>{if(Object.hasOwn(state,k))state[k]=v;};
export function makeJobQueue({max=3,onChange=()=>{},now=Date.now,maxWait=60000}={}){
    let count=0,tail=Promise.resolve();
    return {
        size:()=>count,
        add(fn,onExpired=()=>{}){
            if(count>=max)return false;
            const created=now();
            count++;onChange(count);
            tail=tail.then(()=>now()-created>maxWait?onExpired():fn()).catch(()=>{}).finally(()=>{count--;onChange(count);});
            return true;
        },
        idle:()=>tail
    };
}
export function reconnectDelay(status,attempt,registered){
    if(!registered||attempt>=3||![408,428,503,515].includes(status))return null;
    return status===515&&attempt===0?0:[2000,8000,20000][attempt];
}
