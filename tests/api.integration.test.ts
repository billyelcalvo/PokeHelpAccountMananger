import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db';

test('account and Pokemon lifecycle against PostgreSQL', async (t) => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'Set TEST_DATABASE_URL to a migrated test database');
  const db = createDatabase(url);
  const server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const accountIds: number[] = [];
  const typeIds: number[] = [];
  const createdIvIds: number[] = [];
  const marker = `test-${crypto.randomUUID()}`;

  async function request(method: string, path: string, body?: unknown, expected = 200) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = response.status === 204 ? undefined : await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  }

  try {
    for (const name of ['main', 'secondary']) {
      const account = await request('POST', '/accounts', {
        name: `${marker}-${name}`, email: `${name}@example.com`, password: 'test-secret',
      }, 201);
      accountIds.push(account.id);
      assert.equal('password' in account, false);
    }
    const [accountId, otherAccountId] = accountIds;
    const type = await request('POST', '/types', { type: `${marker}-Eléctrico` }, 201);
    typeIds.push(type.id);
    assert.equal(type.icon, null);
    const collection = `/accounts/${accountId}/pokemons`;
    const pokemon = await request('POST', collection, { name: 'Pikachu', typeId: type.id }, 201);
    const path = `${collection}/${pokemon.id}`;

    await t.test('creates without IVs and lists Pokemon only for their account', async () => {
      assert.equal(pokemon.iv, null);
      assert.equal(pokemon.accountId, accountId);
      assert.equal((await request('GET', collection)).length, 1);
      assert.deepEqual(await request('GET', `/accounts/${otherAccountId}/pokemons`), []);
      assert.equal((await request('GET', path)).type.type, type.type);
      const account = await request('GET', `/accounts/${accountId}`);
      assert.equal(account.pokemons.length, 1);
      assert.equal('password' in account, false);
      assert.ok((await request('GET', '/accounts')).every((entry: object) => !('password' in entry)));
    });

    await t.test('adds IVs later and updates them without creating orphan rows', async () => {
      const added = await request('PATCH', path, { iv: { attack: 0, defense: 14, hp: 15 } });
      createdIvIds.push(added.iv.id);
      assert.equal(added.iv.attack, 0);
      const edited = await request('PATCH', path, { iv: { attack: 15, defense: 15, hp: 15 } });
      assert.equal(edited.iv.id, added.iv.id);
      assert.equal(edited.iv.attack, 15);
      const renamed = await request('PATCH', path, { name: 'Raichu' });
      assert.equal(renamed.iv.id, added.iv.id);
      assert.equal(renamed.name, 'Raichu');
    });

    await t.test('another account cannot read, update or delete this Pokemon', async () => {
      const wrongPath = `/accounts/${otherAccountId}/pokemons/${pokemon.id}`;
      await request('GET', wrongPath, undefined, 404);
      await request('PATCH', wrongPath, { name: 'Wrong account' }, 404);
      await request('DELETE', wrongPath, undefined, 404);
      assert.equal((await request('GET', path)).name, 'Raichu');
    });

    await t.test('rejects invalid bodies, IDs, missing references and malformed JSON', async () => {
      await request('PATCH', path, { iv: { attack: 16, defense: 15, hp: 15 } }, 400);
      await request('PATCH', path, { iv: { attack: 15 } }, 400);
      await request('PATCH', path, { accountId: otherAccountId }, 400);
      await request('PATCH', path, {}, 400);
      await request('POST', collection, { name: ' ', typeId: type.id }, 400);
      await request('GET', '/accounts/1abc', undefined, 400);
      await request('GET', '/accounts/2147483647/pokemons', undefined, 404);
      await request('POST', collection, {
        name: 'Missing type', typeId: 2147483647, iv: { attack: 15, defense: 15, hp: 15 },
      }, 404);
      await request('POST', '/accounts/2147483647/pokemons', { name: 'Missing account', typeId: type.id }, 404);
      await request('GET', '/missing-route', undefined, 404);
      const malformed = await fetch(`${base}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
      });
      assert.equal(malformed.status, 400);
      const oversized = await fetch(`${base}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(110000) }),
      });
      assert.equal(oversized.status, 413);
    });

    await t.test('custom types can be edited and cannot be deleted while referenced', async () => {
      await request('DELETE', `/types/${type.id}`, undefined, 409);
      const updated = await request('PATCH', `/types/${type.id}`, { type: `${marker}-Personalizado` });
      assert.equal((await request('GET', path)).type.type, updated.type);
      assert.equal((await request('GET', `/types/${type.id}`)).type, updated.type);
    });

    await t.test('removing IVs deletes their row, and they can be added again', async () => {
      assert.equal((await request('PATCH', path, { iv: null })).iv, null);
      assert.equal(await db.iV.findUnique({ where: { id: createdIvIds[0] } }), null);
      assert.equal((await request('PATCH', path, { iv: null })).iv, null);
      const readded = await request('PATCH', path, { iv: { attack: 1, defense: 2, hp: 3 } });
      createdIvIds.push(readded.iv.id);
      await request('DELETE', path, undefined, 204);
      assert.equal(await db.iV.findUnique({ where: { id: readded.iv.id } }), null);
    });

    await t.test('account updates hide passwords and deletion cleans only its Pokemon and IVs', async () => {
      const updated = await request('PATCH', `/accounts/${accountId}`, { name: 'Renamed', password: 'new-secret' });
      assert.equal(updated.name, 'Renamed');
      assert.equal('password' in updated, false);
      for (const owner of accountIds) {
        const owned = await request('POST', `/accounts/${owner}/pokemons`, {
          name: 'Eevee', typeId: type.id, iv: { attack: 15, defense: 15, hp: 15 },
        }, 201);
        createdIvIds.push(owned.iv.id);
      }
      await request('DELETE', `/accounts/${accountId}`, undefined, 204);
      await request('GET', `/accounts/${accountId}`, undefined, 404);
      assert.equal((await request('GET', `/accounts/${otherAccountId}/pokemons`)).length, 1);
      await request('DELETE', `/accounts/${otherAccountId}`, undefined, 204);
      assert.equal(await db.iV.count({ where: { id: { in: createdIvIds } } }), 0);
      await request('DELETE', `/types/${type.id}`, undefined, 204);
    });
  } finally {
    // Clean only fixtures from this run, including after a failed assertion.
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    try {
      await db.$transaction(async (tx) => {
        const remaining = await tx.pokemon.findMany({
          where: { accountId: { in: accountIds } }, select: { ivId: true },
        });
        await tx.pokemon.deleteMany({ where: { accountId: { in: accountIds } } });
        await tx.account.deleteMany({ where: { id: { in: accountIds } } });
        await tx.iV.deleteMany({
          where: { id: { in: [...createdIvIds, ...remaining.flatMap(p => p.ivId === null ? [] : [p.ivId])] } },
        });
        await tx.pokemonType.deleteMany({ where: { id: { in: typeIds } } });
      });
    } finally {
      await db.$disconnect();
    }
  }
});
