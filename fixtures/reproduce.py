"""Transparent synthetic technical pilot: actually execute the disclosed experiment."""
import asyncio
import json

class Provider:
    def __init__(self): self.calls = 0
    async def read(self, key):
        self.calls += 1
        await asyncio.sleep(0.01)
        return key + '-value'

async def main():
    baseline, cached = Provider(), Provider()
    tasks = {}
    async def read(key):
        if key not in tasks: tasks[key] = asyncio.create_task(cached.read(key))
        return await tasks[key]
    values = await asyncio.gather(*(baseline.read('alpha') for _ in range(100)))
    assert baseline.calls == 100 and all(x == 'alpha-value' for x in values)
    values = await asyncio.gather(*(read('alpha') for _ in range(100)))
    assert cached.calls == 1 and all(x == 'alpha-value' for x in values)
    values = await asyncio.gather(*(read('beta') for _ in range(100)))
    assert cached.calls == 2 and all(x == 'beta-value' for x in values)
    print(json.dumps({'synthetic':True,'baseline_calls':baseline.calls,'cached_alpha_calls':1,'cached_total_calls':cached.calls,'all_values_correct':True}))

if __name__ == '__main__': asyncio.run(main())
