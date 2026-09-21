import { providerConfig, type ProviderConfig } from './provider';
export type ModelHealth = { provider: string; model: string; available: boolean; error: string | null; checkedAt: string };
let cached: { signature: string; expires: number; rows: ModelHealth[] } | undefined;
let pending: Promise<ModelHealth[]> | undefined;
export function configuredModels() {
 const models = new Map<string, ProviderConfig>();
 for (const tier of ['lead', 'standard'] as const) {
  const config = providerConfig(tier);
  if(config) for(const model of [config.primary,...(config.fallback?[config.fallback]:[])]) models.set(model.name+':'+model.model,model);
 }
 return [...models.values()];
}
export async function validateModelCatalog(configs: ProviderConfig[], fetchImpl: typeof fetch = fetch): Promise<ModelHealth[]> {
 const rows: ModelHealth[]=[]; const groups=new Map<string,ProviderConfig[]>();
 for(const config of configs){const key=config.name+':'+config.baseUrl;groups.set(key,[...(groups.get(key)??[]),config]);}
 for(const group of groups.values()){
  const config=group[0];const checkedAt=new Date().toISOString();
  try{
   const response=await fetchImpl(config.baseUrl.replace(/\/$/,'')+'/models',{headers:{authorization:'Bearer '+config.apiKey},signal:AbortSignal.timeout(10000),cache:'no-store'});
   if(!response.ok)throw new Error('catalog_http_'+response.status);
   const body=await response.json() as {data?:{id:string}[]};
   if(!Array.isArray(body.data))throw new Error('catalog_invalid_response');
   const ids=new Set(body.data.map(model=>model.id));
   for(const model of group)rows.push({provider:model.name,model:model.model,available:ids.has(model.model),error:!model.model?'model_env_unconfigured':ids.has(model.model)?null:'configured_model_missing',checkedAt});
  }catch(error){for(const model of group)rows.push({provider:model.name,model:model.model,available:false,error:error instanceof Error&&error.message.startsWith('catalog_')?error.message:'catalog_unreachable',checkedAt});}
 }
 return rows;
}
export async function getModelHealth(force=false){
 const configs=configuredModels();const signature=JSON.stringify(configs.map(({name,model,baseUrl})=>({name,model,baseUrl})));
 if(!force&&cached?.signature===signature&&cached.expires>Date.now())return cached.rows;
 if(pending)return pending;
 pending=validateModelCatalog(configs).then(rows=>{cached={signature,rows,expires:Date.now()+15*60000};for(const row of rows)if(!row.available)console.error(JSON.stringify({event:'llm_model_health_error',...row}));return rows;}).finally(()=>{pending=undefined;});
 return pending;
}
