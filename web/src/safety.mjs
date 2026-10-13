export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function refs(raw) {
 const values = JSON.parse(raw);
 if (!Array.isArray(values) || values.length < 1 || values.length > 3) throw Error('Provide 1–3 evidence references.');
 for (const r of values) if (!r || !/^https:\/\/raw\.githubusercontent\.com\/[\w-]+\/[\w.-]+\/[a-f0-9]{40}\/[\w./-]+$/.test(r.url) || r.url.includes('..') || !/^[a-f0-9]{64}$/.test(r.sha256)) throw Error('Use exact commit-pinned raw GitHub URLs and lowercase SHA-256 hashes.');
 if(new Set(values.map(r=>r.sha256)).size!==values.length) throw Error('Duplicate evidence hashes.');
 return values;
}
export function successful(tx) {
 const receipts = tx.consensus_data?.leader_receipt;
 const leader = Array.isArray(receipts) ? receipts.find(r=>r.mode==='leader') : receipts;
 return (tx.statusName === 'FINALIZED' || tx.status === 'FINALIZED') &&
   (leader?.execution_result === 'SUCCESS' || tx.txExecutionResultName === 'FINISHED_WITH_RETURN');
}
