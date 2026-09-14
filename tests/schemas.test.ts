import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccountSchema, updateAccountSchema } from '../src/schemas/accountSchema';
import { routeId } from '../src/schemas/common';
import { createPokemonSchema, updatePokemonSchema } from '../src/schemas/pokemonSchema';
import { createTypeSchema, updateTypeSchema } from '../src/schemas/typeSchema';

test('Pokemon can be registered without IVs or with explicit null', () => {
  const pokemon = { name: ' Pikachu ', typeId: 1 };
  assert.equal(createPokemonSchema.parse(pokemon).name, 'Pikachu');
  assert.equal(createPokemonSchema.parse(pokemon).iv, undefined);
  assert.equal(createPokemonSchema.parse({ ...pokemon, iv: null }).iv, null);
});

test('IVs accept zero and fifteen, and reject incomplete or invalid stats', () => {
  assert.ok(updatePokemonSchema.safeParse({ iv: { attack: 0, defense: 15, hp: 0 } }).success);
  for (const attack of [-1, 16, 1.5, '15', null]) {
    assert.equal(updatePokemonSchema.safeParse({ iv: { attack, defense: 15, hp: 15 } }).success, false);
  }
  assert.equal(updatePokemonSchema.safeParse({ iv: { attack: 15 } }).success, false);
});

test('updates reject empty bodies and unknown fields including account reassignment', () => {
  for (const schema of [updateAccountSchema, updatePokemonSchema, updateTypeSchema]) {
    assert.equal(schema.safeParse({}).success, false);
    assert.equal(schema.safeParse({ unknown: true }).success, false);
  }
  assert.equal(updatePokemonSchema.safeParse({ accountId: 2 }).success, false);
});

test('IDs must be positive PostgreSQL integers with no trailing characters', () => {
  assert.equal(routeId.parse('123'), 123);
  for (const id of ['0', '-1', '1.5', '1abc', '1e2', '2147483648', '']) {
    assert.equal(routeId.safeParse(id).success, false);
  }
});

test('user-defined types need only a name and optionally a valid icon URL', () => {
  assert.deepEqual(createTypeSchema.parse({ type: ' Eléctrico ' }), { type: 'Eléctrico' });
  assert.equal(createTypeSchema.safeParse({ type: ' ' }).success, false);
  assert.equal(createTypeSchema.safeParse({ type: 'Eléctrico', icon: 'invalid' }).success, false);
  assert.ok(updateTypeSchema.safeParse({ icon: null }).success);
});

test('account input trims names and emails while preserving the password', () => {
  const account = createAccountSchema.parse({ name: ' Main ', email: ' test@example.com ', password: ' secret ' });
  assert.deepEqual(account, { name: 'Main', email: 'test@example.com', password: ' secret ' });
  assert.equal(createAccountSchema.safeParse({ ...account, email: 'invalid' }).success, false);
  assert.equal(createAccountSchema.safeParse({ ...account, password: '' }).success, false);
});
