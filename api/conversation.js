import {generateText,Output} from 'ai';
import {responseSchema,validateRequest,guardedReply,modelContext,systemPrompt} from '../server/conversation.js';
export const config={maxDuration:30};
const buckets=new Map();
// Defense in depth for this demo only. Durable auth and distributed quotas are still required before public launch.
function limited(ip){const now=Date.now();for(const [k,v] of buckets)if(v.until<now)buckets.delete(k);const v=buckets.get(ip)||{n:0,until:now+60000};v.n++;buckets.set(ip,v);return v.n>12||buckets.size>2000}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.status(200).json({service:'conversation',mode:'model-backed',model:process.env.AI_GATEWAY_MODEL||'google/gemini-3.8-flash',status:'configured; availability verified per request'});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'})}
 if(req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==`http://${req.headers.host}`)return res.status(403).json({error:'Origin not allowed.'});
 if(limited(String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0])){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please pause a moment before your next message.'})}
 let request;try{if(JSON.stringify(req.body).length>60000)throw Error('Conversation is too large. Start a new call.');request=validateRequest(req.body)}catch(e){return res.status(400).json({error:e.message})}
 const {brief,input,history}=request;const guard=guardedReply(brief,input,history);if(guard)return res.status(200).json(guard);
 try{
 const result=await generateText({model:process.env.AI_GATEWAY_MODEL||'google/gemini-3.8-flash',system:systemPrompt,prompt:modelContext(brief,input,history),output:Output.object({schema:responseSchema}),maxOutputTokens:1300,reasoning:'minimal',maxRetries:0,abortSignal:AbortSignal.timeout(22000)});
 const parsed=responseSchema.parse(result.output);
 return res.status(200).json({...parsed,engine:'ai-gateway',model:process.env.AI_GATEWAY_MODEL||'google/gemini-3.8-flash'});
 }catch(e){
 const status=Number(e.statusCode||e.cause?.statusCode||0);const detail=String(e.message||'');const setup=[401,402,403].includes(status)||/verification|credit|authentication|unauthorized|api.key/i.test(detail);
 const failure = /customer_verification_required|payment method|verify your|verification required/i.test(detail) ? 'ACCOUNT_VERIFICATION_REQUIRED' : /insufficient.funds|credit balance|not enough credits/i.test(detail) ? 'CREDITS_REQUIRED' : /quota|budget/i.test(detail) ? 'BUDGET_EXHAUSTED' : /oidc|authentication|unauthorized|api.key/i.test(detail) ? 'AUTHENTICATION_REQUIRED' : status===403 ? 'PROVIDER_ACCESS_DENIED' : 'AI_UNAVAILABLE';
 const messages={ACCOUNT_VERIFICATION_REQUIRED:'Vercel AI Gateway requires account verification. Open AI Gateway in your Vercel dashboard and complete its verification step.',CREDITS_REQUIRED:'AI Gateway has insufficient credits. Check the credit balance in your Vercel dashboard.',BUDGET_EXHAUSTED:'The AI Gateway usage budget has been reached.',AUTHENTICATION_REQUIRED:'AI Gateway authentication is not configured correctly.',PROVIDER_ACCESS_DENIED:'AI Gateway denied this request (403). Check your team’s AI Gateway access and account verification.'};
 console.error('conversation_provider_error',{name:e.name,status,failure});
 return res.status(503).json({error:messages[failure]||'The AI service is temporarily unavailable. Please retry, or switch to offline practice.',code:failure});
 }
}
