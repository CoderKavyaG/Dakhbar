export async function register() {
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {getModelHealth}=await import('./lib/llm/catalog');
  await getModelHealth(true);
  const timer=setInterval(()=>{void getModelHealth(true);},15*60000);timer.unref();
 }
}
