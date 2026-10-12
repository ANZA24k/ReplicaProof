import hashlib
import json
from pathlib import Path
import pytest
from gltest.direct import VMContext, deploy_contract, create_address

BASE = 'https://raw.githubusercontent.com/ANZA24k/ReplicaProof/' + 'a' * 40 + '/fixtures/'
BODY = b'Synthetic reproduction evidence. Exact bytes.'
SHA = hashlib.sha256(BODY).hexdigest()

def ref(name='result.txt', body=BODY):
    return {'url': BASE + name, 'sha256': hashlib.sha256(body).hexdigest()}

@pytest.fixture
def env():
    vm = VMContext()
    vm.warp('2026-10-12T12:00:00Z')
    vm.sender = create_address('creator')
    with vm.activate():
        c = deploy_contract(Path('contracts/replicaproof.py'), vm, sdk_version='v0.2.16')
        yield vm, c

def standard(c):
    return c.create_standard('Synthetic research pilot', BASE+'original.txt', '1'*64,
        BASE+'method.txt', '2'*64, json.dumps(['Method and control fidelity', 'Results meet locked tolerance']), 1792411200, 3600)

def mocks(vm, checks=('PASS','PASS')):
    for name, sha in [('original.txt','1'), ('method.txt','2')]:
        # For integrity tests the original hashes must be real; standard helper overridden below.
        pass
    vm.mock_web(r'.*', {'status':200, 'body':BODY.decode()})
    vm.mock_llm(r'.*', json.dumps({'checks':list(checks)}))

def real_standard(c):
    return c.create_standard('Synthetic research pilot', BASE+'original.txt', SHA,
        BASE+'method.txt', SHA, json.dumps(['Method and control fidelity', 'Results meet locked tolerance']), 1792411200, 3600)

@pytest.mark.parametrize('checks,expected',[(('PASS','PASS'),'QUALIFIED'),(('PASS','FAIL'),'FAILED'),(('PASS','UNKNOWN'),'INCONCLUSIVE')])
def test_consensus_outcomes(env, checks, expected):
    vm,c=env
    st=real_standard(c)
    r=ref(body=b'Additional reproduction data')
    sid=c.submit(st,json.dumps([r]))
    vm.mock_web('original|method',{'status':200,'body':BODY.decode()})
    vm.mock_web('result',{'status':200,'body':'Additional reproduction data'})
    vm.mock_llm(r'.*',json.dumps({'checks':list(checks)}))
    c.evaluate(sid)
    assert json.loads(c.get_submission(sid))['history'][0]['outcome']==expected
    assert vm.run_validator()
    vm.clear_mocks()
    vm.mock_web(r'.*',{'status':200,'body':'tampered'})
    assert not vm.run_validator()

@pytest.mark.parametrize('field,value', [('title','x'),('criteria_json','[]'),('criteria_json','["short"]'),('deadline',0),('recheck_seconds',1),('original_url','http://localhost/x'),('original_sha256','X'*64)])
def test_invalid_standard(env,field,value):
    vm,c=env
    args=dict(title='Research pilot',original_url=BASE+'original.txt',original_sha256=SHA,methodology_url=BASE+'method.txt',methodology_sha256=SHA,criteria_json='["Methodology fidelity"]',deadline=1792411200,recheck_seconds=3600)
    args[field]=value
    with pytest.raises(Exception): c.create_standard(**args)
    assert c.counts()['standards']==0

@pytest.mark.parametrize('raw',['[]','{}','[{"url":"https://evil.test","sha256":"'+'1'*64+'"}]','[{"url":"x"}]'])
def test_invalid_evidence(env,raw):
    vm,c=env
    st=standard(c)
    with pytest.raises(Exception): c.submit(st,raw)

@pytest.mark.parametrize('mode',['mismatch','404','oversize','malformed'])
def test_integrity_fail_closed(env,mode):
    vm,c=env
    st=real_standard(c)
    sid=c.submit(st,json.dumps([ref(body=b'new evidence')]))
    body='tampered' if mode=='mismatch' else 'x'*17000 if mode=='oversize' else BODY.decode()
    vm.mock_web(r'.*',{'status':404 if mode=='404' else 200,'body':body})
    vm.mock_web('result',{'status':200,'body':'new evidence'})
    vm.mock_llm(r'.*','{"checks":["APPROVED"]}')
    c.evaluate(sid)
    result=json.loads(c.get_submission(sid))['history'][0]
    assert result['outcome']=='INCONCLUSIVE'
    assert vm.run_validator()


def test_duplicates_authorization_history_and_bounds(env):
    vm,c=env
    st=real_standard(c)
    sid=c.submit(st,json.dumps([ref(body=b'new evidence')]))
    with pytest.raises(Exception): c.submit(st,json.dumps([ref(body=b'new evidence')]))
    vm.mock_web('original|method',{'status':200,'body':BODY.decode()})
    vm.mock_web('result',{'status':200,'body':'new evidence'})
    vm.mock_llm(r'.*','{"checks":["PASS","PASS"]}')
    c.evaluate(sid)
    first=json.loads(c.get_submission(sid))['history'][0]
    with pytest.raises(Exception): c.evaluate(sid)
    with vm.prank(create_address('outsider')):
        with pytest.raises(Exception): c.recheck(sid,json.dumps([ref('supp.txt',b'supp')]),'Review supplemental observations')
    for n in (1,2):
        r=ref(f'supp{n}.txt',f'supp{n}'.encode())
        vm.mock_web(f'supp{n}',{'status':200,'body':f'supp{n}'})
        c.recheck(sid,json.dumps([r]),'Review supplemental observations')
    history=json.loads(c.get_submission(sid))['history']
    assert len(history)==3 and history[0]==first
    assert history[1]['previous']==hashlib.sha256(json.dumps(first,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest()
    with pytest.raises(Exception): c.recheck(sid,json.dumps([ref('supp3.txt',b'supp3')]),'Review supplemental observations')


def test_deadlines(env):
    vm,c=env
    st=standard(c)
    vm.warp('2027-01-01T00:00:00Z')
    with pytest.raises(Exception): c.submit(st,json.dumps([ref()]))


def test_value_rejected(env):
    vm,c=env
    vm.value=1
    with pytest.raises(Exception): standard(c)
