import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant, TransactionStatus } from 'genlayer-js/types';
import deployment from './deployment.json';
import { escapeHTML as esc, refs, successful } from './safety.mjs';
import './style.css';
import { mountParticleDrift } from './particle-drift';

type Ref = {url:string;sha256:string};
type Revision={revision:number;at:number;actor:string;reason:string;evidence:Ref[];evidence_commitment:string;checks:string[];integrity:string;verified:string[];outcome:string;previous:string};
type Standard={title:string;creator:string;original:Ref;methodology:Ref;criteria:string[];deadline:number;recheck_seconds:number;commitment:string;submission_ids:string[]};
type Submission={standard_id:string;participant:string;evidence:Ref[];commitment:string;submitted_at:number;history:Revision[]};
const $ = (id:string) => document.getElementById(id)!;
const reader=createClient({chain:studionet});
let account:`0x${string}`|undefined;
let selected:Standard|undefined;
let selectedSubmission:Submission|undefined;
let pending:{method:string;args:(string|number)[]}|undefined;
let busy=false;
const fmt=(time:number)=>new Date(time*1000).toLocaleString();
const short=(v:string)=>v.slice(0,8)+'…'+v.slice(-6);
const txURL=(hash:string)=>deployment.explorer+'/tx/'+encodeURIComponent(hash);
const badge=(v:string)=>`<span class="status ${esc(v)}">${esc(v)}</span>`;
function files(values:Ref[]){return values.map((r,i)=>`<div class="file"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${i+1}. ${esc(r.url.split('/').pop())} ↗</a><p class="code">SHA-256 ${esc(r.sha256)}</p></div>`).join('');}
function message(value:string){$('message').textContent=value;}
async function read(method:string,args:string[]=[]){if(!deployment.contract)throw Error('Deployment verification is in progress.');return reader.readContract({address:deployment.contract as `0x${string}`,functionName:method,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL});}
const transactions = deployment.pilot as {label:string;hash:string;result:string;submission_id?:string}[];
$('app').innerHTML=`<nav><a class="brand" href="#"><span class="mark"><span>R</span></span>ReplicaProof</a><div class="right"><a href="#registry">Registry</a><a href="#workflow">How it works</a><a href="https://github.com/ANZA24k/ReplicaProof" target="_blank" rel="noopener">Source ↗</a><button class="btn secondary" id="connect">Connect wallet</button></div></nav>
<main><section class="hero"><div><div class="eyebrow"><span class="dot"></span> GenLayer · Studionet research pilot</div><h1>Claims need evidence.<br><em>Reproduce. Verify.</em></h1><p class="intro">An evidence-first protocol for technical and research reproductions. Lock the standard, commit the exact files, and let independent validators inspect the work.</p><div class="hero-actions"><a class="btn" href="#registry">Explore reproductions ↘</a><a class="btn secondary" href="#workspace">Start a verification</a></div></div><div class="diagram"><div class="step"><span>VERIFICATION PROTOCOL</span><span>01 → 03</span></div><div class="grid"><div class="paper"><b>Locked reproduction standard</b><p>Original claim · Methodology · Exact requirements</p><div class="bar"></div><div class="bar short"></div><div class="code">SHA-256 commitments → immutable evidence</div></div><div class="nodes"><span class="node">VALIDATOR 01</span><span class="node">VALIDATOR 02</span><span class="node">VALIDATOR 03</span></div></div><footer>Independent retrieval. Criterion-level agreement.</footer></div></section>
<div class="metrics"><div class="metric"><b id="standard-count">—</b><span>LOCKED STANDARDS</span></div><div class="metric"><b id="submission-count">—</b><span>REPRODUCTION ATTEMPTS</span></div><div class="metric"><b>SHA-256</b><span>EXACT EVIDENCE COMMITMENTS</span></div><div class="metric"><b>2</b><span>MAXIMUM RECHECKS PER ATTEMPT</span></div></div>
<div id="message" role="status" aria-live="polite"></div>
<section class="section" id="registry"><div class="section-head"><div><div class="eyebrow">Public evidence registry</div><h2 class="standard-title">Reproduction standards</h2></div><button class="btn secondary" id="refresh">Refresh finalized state</button></div><div class="notice">Pilot evidence is explicitly synthetic. Results show how GenLayer reviews committed documents; they do not establish independent scientific truth or prove that an experiment was performed.</div><div class="cards" id="standards"><div class="loading">Reading finalized Studionet state…</div></div></section>
<section class="section" id="detail"><div class="section-head"><h2 id="detail-title"></h2><button class="btn secondary" id="close-detail">Close details</button></div><div class="detail-grid"><div class="panel" id="standard-detail"></div><div class="panel"><h3>Reproduction attempts</h3><div id="attempts"></div></div></div><div class="panel" style="margin-top:20px" id="history"></div></section>
<section class="section" id="workspace"><div class="section-head"><div><div class="eyebrow">Participant workspace</div><h2 class="standard-title">Commit work. Request consensus.</h2></div></div><p class="small">Use Studio’s faucet and test accounts, or MetaMask on Studionet (chain 61999). Connection does not send a transaction. Every write sends zero GEN value; network fees may apply. No approvals, seed phrases, signatures for login, or Snaps.</p><div class="panel"><div class="hash-tool"><label for="hash-file">Compute SHA-256 locally</label><input type="file" id="hash-file"><span class="code" id="hash-output"></span></div><details><summary>01 · Create a locked standard</summary><form id="create-form"><div class="form-grid"><div class="full"><label for="title">Title</label><input id="title" required minlength="3" maxlength="120" placeholder="What result should be reproduced?"></div><div><label for="original-url">Original claim · commit-pinned raw GitHub URL</label><input id="original-url" type="url" required><label for="original-hash">Original SHA-256</label><input id="original-hash" required pattern="[a-f0-9]{64}"></div><div><label for="method-url">Methodology · commit-pinned raw GitHub URL</label><input id="method-url" type="url" required><label for="method-hash">Methodology SHA-256</label><input id="method-hash" required pattern="[a-f0-9]{64}"></div><div class="full"><label for="criteria">Criteria · one per line, 1–6 criteria, 10–700 bytes each</label><textarea id="criteria" required placeholder="Specify methodology, controls, measurements and acceptable deviations."></textarea></div><div><label for="deadline">Submission deadline</label><input id="deadline" type="datetime-local" required></div><div><label for="window">Recheck window after initial decision</label><select id="window"><option value="86400">24 hours</option><option value="604800">7 days</option><option value="3600">1 hour</option></select></div></div><button class="btn">Review standard transaction</button></form></details>
<details><summary>02 · Submit immutable reproduction evidence</summary><form id="submit-form"><label for="submit-standard">Standard commitment ID</label><input id="submit-standard" required pattern="[a-f0-9]{64}"><label for="submit-evidence">Evidence references · JSON array, up to three files</label><textarea id="submit-evidence" required placeholder='[{"url":"https://raw.githubusercontent.com/owner/repo/COMMIT/file.txt","sha256":"64 lowercase hex characters"}]'></textarea><button class="btn">Review submission transaction</button></form></details>
<details><summary>03 · Evaluate or request a bounded recheck</summary><form id="evaluate-form"><label for="evaluate-id">Submission commitment ID</label><input id="evaluate-id" required pattern="[a-f0-9]{64}"><button class="btn">Review evaluation transaction</button></form><form id="recheck-form"><label for="recheck-id">Submission commitment ID</label><input id="recheck-id" required pattern="[a-f0-9]{64}"><label for="recheck-evidence">New supplemental evidence · JSON array</label><textarea id="recheck-evidence" required></textarea><label for="reason">Reason · 10–500 bytes</label><textarea id="reason" required minlength="10" maxlength="500"></textarea><p class="small">Only the participant or standard creator may recheck. Earlier evidence and decisions remain; fresh evidence is added cumulatively. Maximum two rechecks within the locked window.</p><button class="btn">Review recheck transaction</button></form></details></div></section>
<section class="section" id="workflow"><div class="eyebrow">Designed for review</div><h2 class="standard-title">A claim is a starting point.</h2><div class="steps"><div class="step-card"><b>01 / LOCK</b><h3>Define the standard</h3><p>Commit the original claim, methodology, deadline and specific reproduction requirements before anyone submits.</p></div><div class="step-card"><b>02 / REPRODUCE</b><h3>Commit the exact evidence</h3><p>Publish UTF-8 text at a Git commit. SHA-256 binds each file’s bytes. Duplicate content and mutable references are rejected.</p></div><div class="step-card"><b>03 / VERIFY</b><h3>Inspect independently</h3><p>Leader and validators independently fetch, hash and assess every source. Deterministic rules derive QUALIFIED, FAILED or INCONCLUSIVE.</p></div></div></section>
<section class="section"><div class="two"><div class="panel"><h3>Deployment & real transactions</h3><div id="deployment"></div><div id="transactions"></div></div><div class="panel"><h3>Boundaries & limitations</h3><p class="small">Studionet is a development network. Only commit-pinned raw GitHub UTF-8 files are supported: 16 KiB per file, 64 KiB combined. Standards support up to six criteria and 32 attempts. LLMs can misinterpret evidence and prompt injection defenses are not a guarantee.</p><p class="small">Unavailable or mismatched evidence becomes INCONCLUSIVE. Validator disagreement can leave a transaction undetermined with no stored decision. Missing proof differs from an explicitly demonstrated failure. This release has no reward escrow and rejects attached value.</p><a class="small" href="https://github.com/ANZA24k/ReplicaProof#readme" target="_blank" rel="noopener">Read verification notes ↗</a></div></div></section>
<footer class="footer"><span>ReplicaProof · Evidence over assertion.</span><span>Powered by GenLayer consensus · Synthetic Studionet pilot</span><a href="https://github.com/ANZA24k/ReplicaProof" target="_blank" rel="noopener">Open source ↗</a></footer></main>
<dialog id="review"><h2>Review this write</h2><p class="small">This sends a public transaction to ReplicaProof on Studionet. Your wallet shows network fees before confirmation. Attached GEN value: 0. The action is separate from connecting your wallet.</p><pre id="review-content"></pre><div class="dialog-actions"><button class="btn" id="confirm-write">Continue to wallet</button><button class="btn secondary" id="cancel-write">Cancel</button></div></dialog>`;
$('deployment').innerHTML=deployment.contract?`<p class="code">Contract: <a target="_blank" rel="noopener" href="${deployment.explorer}/address/${deployment.contract}">${deployment.contract}</a></p><p class="small"><a href="${txURL(deployment.deploymentTransaction)}" target="_blank" rel="noopener">Deployment transaction ↗</a></p>`:'<p class="small">Deployment verification in progress.</p>';
$('transactions').innerHTML=transactions.map(t=>`<p class="small"><a href="${txURL(t.hash)}" target="_blank" rel="noopener">${esc(t.label)} ↗</a> · ${esc(t.result)}</p>`).join('');

async function refresh(){
 $('refresh').setAttribute('disabled','');
 try{
  const ids=await read('list_standards') as string[];
  const standards=await Promise.all(ids.map(async id=>JSON.parse(await read('get_standard',[id]) as string) as Standard));
  $('standard-count').textContent=String(standards.length);
  $('submission-count').textContent=String(standards.reduce((n,s)=>n+s.submission_ids.length,0));
  $('standards').innerHTML=standards.length?standards.map((s,i)=>`<article class="card"><div class="card-top"><span class="eyebrow">STANDARD ${String(i+1).padStart(2,'0')}</span><span class="status">LOCKED</span></div><h3>${esc(s.title)}</h3><p class="small">${s.criteria.length} criteria · ${s.submission_ids.length} attempts</p><p class="code">${esc(short(s.commitment))}</p><p class="small">Deadline ${esc(fmt(s.deadline))}</p><button class="btn secondary" data-standard="${esc(s.commitment)}">Inspect evidence →</button></article>`).join(''):'<div class="panel">No finalized standards yet. Create one in the workspace.</div>';
  $('standards').querySelectorAll<HTMLButtonElement>('[data-standard]').forEach(b=>b.onclick=()=>void openStandard(standards.find(s=>s.commitment===b.dataset.standard)!));
  if(selected)await openStandard(standards.find(s=>s.commitment===selected!.commitment)!,false);
 }catch(e){$('standards').innerHTML='<div class="panel error">Finalized state could not be loaded. Refresh to retry; no cached result is presented as live.</div>';message(String(e));}
 finally{$('refresh').removeAttribute('disabled');}
}
async function openStandard(s:Standard,scroll=true){
 if(!s)return;
 selected=s;
 $('detail').style.display='block';$('detail-title').textContent=s.title;
 $('standard-detail').innerHTML=`<h3>Locked requirements</h3><p class="code">Commitment ${esc(s.commitment)}</p><p class="small">Creator ${esc(s.creator)}<br>Deadline ${esc(fmt(s.deadline))} · Recheck ${s.recheck_seconds/3600} hours</p>${s.criteria.map((c,i)=>`<div class="criterion"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(c)}</span></div>`).join('')}<h3 style="margin-top:20px">Original claim & methodology</h3>${files([s.original,s.methodology])}`;
 ($('submit-standard') as HTMLInputElement).value=s.commitment;
 try{
  const submissions=await Promise.all(s.submission_ids.map(async id=>JSON.parse(await read('get_submission',[id]) as string) as Submission));
  $('attempts').innerHTML=submissions.length?submissions.map((r,i)=>`<div class="revision"><div class="card-top"><b>Attempt ${i+1}</b>${badge(r.history.at(-1)?.outcome||'UNREVIEWED')}</div><p class="code">${esc(r.commitment)}</p><p class="small">Participant ${esc(short(r.participant))} · ${r.history.length} decisions</p><button class="btn secondary" data-attempt="${r.commitment}">View decision history</button></div>`).join(''):'<p class="small">No finalized submissions yet.</p>';
  $('attempts').querySelectorAll<HTMLButtonElement>('[data-attempt]').forEach(b=>b.onclick=()=>openSubmission(submissions.find(r=>r.commitment===b.dataset.attempt)!));
  const r=submissions.find(r=>r.commitment===selectedSubmission?.commitment)||submissions[0];
  if(r)openSubmission(r);else $('history').innerHTML='<p class="small">Submit evidence to begin a decision history.</p>';
 }catch(e){message(String(e));}
 if(scroll)$('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function openSubmission(s:Submission){
 selectedSubmission=s;
 for(const id of ['evaluate-id','recheck-id'])($ (id) as HTMLInputElement).value=s.commitment;
 $('history').innerHTML=`<div class="section-head"><h3>Append-only decision history</h3>${badge(s.history.at(-1)?.outcome||'UNREVIEWED')}</div><p class="code">Submission ${esc(s.commitment)} · Participant ${esc(s.participant)}</p><h3>Original immutable evidence</h3>${files(s.evidence)}<div class="timeline">${s.history.map(r=>`<div class="revision"><div class="card-top"><h3>Revision ${r.revision} · ${esc(r.reason)}</h3>${badge(r.outcome)}</div><p class="small">${esc(fmt(r.at))} · Actor ${esc(r.actor)} · Integrity ${esc(r.integrity)}</p>${r.checks.map((v,i)=>`<div class="check"><b>${esc(v)}</b> · ${esc(selected?.criteria[i]||'')}</div>`).join('')}<p class="code">Evidence commitment ${r.evidence_commitment}<br>Previous revision hash ${r.previous||'Genesis'}</p><details><summary>Inspect cumulative evidence (${r.evidence.length} files)</summary>${files(r.evidence)}</details></div>`).join('')||'<p class="small">Awaiting initial consensus evaluation.</p>'}</div>`;
}
function field(id:string){return ($ (id) as HTMLInputElement).value.trim();}
function review(method:string,args:(string|number)[]){
 if(!account){message('Connect a wallet first. Connection only requests your address.');return;}
 if(busy)return;
 pending={method,args};$('review-content').textContent=JSON.stringify({network:'Studionet',chainId:61999,contract:deployment.contract,from:account,method,args,value:'0 GEN'},null,2);($('review') as HTMLDialogElement).showModal();
}
$('create-form').onsubmit=e=>{e.preventDefault();try{
 refs(JSON.stringify([{url:field('original-url'),sha256:field('original-hash')}]));refs(JSON.stringify([{url:field('method-url'),sha256:field('method-hash')}]));
 const criteria=field('criteria').split('\n').filter(Boolean);if(criteria.length<1||criteria.length>6||criteria.some(c=>new TextEncoder().encode(c).length<10||new TextEncoder().encode(c).length>700))throw Error('Use 1–6 criteria of 10–700 bytes.');
 const deadline=Math.floor(new Date(field('deadline')).getTime()/1000);if(deadline<Date.now()/1000+300||deadline>Date.now()/1000+90*86400)throw Error('Deadline must be 5 minutes to 90 days away.');
 review('create_standard',[field('title'),field('original-url'),field('original-hash'),field('method-url'),field('method-hash'),JSON.stringify(criteria),deadline,Number(field('window'))]);
 }catch(e){message(String(e));}};
$('submit-form').onsubmit=e=>{e.preventDefault();try{refs(field('submit-evidence'));review('submit',[field('submit-standard'),field('submit-evidence')]);}catch(e){message(String(e));}};
$('evaluate-form').onsubmit=e=>{e.preventDefault();review('evaluate',[field('evaluate-id')]);};
$('recheck-form').onsubmit=e=>{e.preventDefault();try{refs(field('recheck-evidence'));review('recheck',[field('recheck-id'),field('recheck-evidence'),field('reason')]);}catch(e){message(String(e));}};
$('cancel-write').onclick=()=>{pending=undefined;($('review') as HTMLDialogElement).close();};
$('connect').onclick=async()=>{try{
 const provider=(window as any).ethereum;if(!provider)throw Error('No EIP-1193 wallet found. Use MetaMask or operate the contract in GenLayer Studio.');
 const accounts=await provider.request({method:'eth_requestAccounts'});account=accounts[0];if(!account)throw Error('No account selected.');$('connect').textContent=short(account);message('Wallet connected. No transaction or signature was requested.');
 provider.on?.('accountsChanged',(a:string[])=>{account=a[0] as `0x${string}`|undefined;$('connect').textContent=account?short(account):'Connect wallet';pending=undefined;($('review') as HTMLDialogElement).close();});
 }catch(e){message(String(e));}};
$('confirm-write').onclick=async()=>{
 if(!pending||!account||busy)return;
 const action=pending;pending=undefined;($('review') as HTMLDialogElement).close();busy=true;
 try{
 const provider=(window as any).ethereum;const chain=await provider.request({method:'eth_chainId'});if(parseInt(chain,16)!==61999)throw Error('Select Studionet chain 61999 in your wallet, then review the write again.');
 const active=await provider.request({method:'eth_accounts'});if(active[0]?.toLowerCase()!==account.toLowerCase())throw Error('Wallet account changed. Connect and review again.');
 const writer=createClient({chain:studionet,account,provider});message('Confirm the explained write in your wallet.');
 const hash=await writer.writeContract({address:deployment.contract as `0x${string}`,functionName:action.method,args:action.args,value:0n,leaderOnly:false});
 message('Submitted '+hash+'\nWaiting for finalization. No final result is shown yet.');
 const tx=await reader.waitForTransactionReceipt({hash,status:TransactionStatus.FINALIZED,interval:5000,retries:120});
 const success=successful(tx);
 if(!success)throw Error('Finalized transaction did not confirm successful execution. Inspect '+txURL(hash));
 message('Finalized with successful execution. Transaction: '+txURL(hash));await refresh();
 }catch(e){message(String(e));}finally{busy=false;}
};
$('hash-file').onchange=async()=>{const f=($('hash-file') as HTMLInputElement).files?.[0];if(!f)return;if(f.size>16384){$('hash-output').textContent='Contract limit: 16 KiB per file.';return;}const bytes=await f.arrayBuffer();const h=await crypto.subtle.digest('SHA-256',bytes);$('hash-output').textContent=Array.from(new Uint8Array(h)).map(v=>v.toString(16).padStart(2,'0')).join('');};
$('refresh').onclick=()=>void refresh();$('close-detail').onclick=()=>{$('detail').style.display='none';selected=undefined;selectedSubmission=undefined;};
void refresh();

const stopBackground=mountParticleDrift();
if(import.meta.hot)import.meta.hot.dispose(stopBackground);
