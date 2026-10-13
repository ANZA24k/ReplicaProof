import fs from 'node:fs';
import crypto from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {successful} from '../web/src/safety.mjs';
const path='web/src/deployment.json';const d=JSON.parse(fs.readFileSync(path));
const client=createClient({chain:studionet});
const tx=await client.getTransaction({hash:d.deploymentTransaction});
if(!successful(tx))throw Error('Deployment not finalized and successful');
const deployed=Buffer.from(tx.data.contract_code,'base64');
if(!deployed.equals(fs.readFileSync('contracts/replicaproof.py')))throw Error('Source mismatch');
d.sourceSha256=crypto.createHash('sha256').update(deployed).digest('hex');
const standardIds=await client.readContract({address:d.contract,functionName:'list_standards',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const standards=[];
for(const id of standardIds){
 const s=JSON.parse(await client.readContract({address:d.contract,functionName:'get_standard',args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
 const submissions=[];
 for(const sid of s.submission_ids)submissions.push(JSON.parse(await client.readContract({address:d.contract,functionName:'get_submission',args:[sid],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})));
 standards.push({standard:s,submissions});
}
for(const p of d.pilot){const t=await client.getTransaction({hash:p.hash});if(!successful(t))throw Error(p.label+' not finalized SUCCESS');p.sender=t.from_address;p.status=t.statusName;p.consensus=t.result_name;p.votes=t.last_round?.validator_votes_name;p.returnValue=t.consensus_data.leader_receipt.find(r=>r.mode==='leader')?.result?.payload?.readable;}
fs.writeFileSync('docs/live-state.json',JSON.stringify({verifiedAt:new Date().toISOString(),contract:d.contract,sourceSha256:d.sourceSha256,standards,transactions:d.pilot},null,2)+'\n');
fs.writeFileSync(path,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({sourceMatch:true,standards:standards.length,submissions:standards.flatMap(x=>x.submissions).map(s=>({id:s.commitment,history:s.history.map(r=>({outcome:r.outcome,checks:r.checks,integrity:r.integrity}))})),verifiedTransactions:d.pilot.length}));
