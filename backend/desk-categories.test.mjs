import {test} from 'node:test';import assert from 'node:assert/strict';
import {DESK_CATEGORIES,findDeskCategory} from './desk-categories.mjs';
test('all seven category routes are stable and unknown slugs are rejected',()=>{assert.equal(DESK_CATEGORIES.length,7);assert.equal(new Set(DESK_CATEGORIES.map(c=>c.slug)).size,7);assert.equal(findDeskCategory('recent-comebacks').id,'comebacks');assert.equal(findDeskCategory('../admin'),undefined);assert.equal(findDeskCategory('gross-out-gallery'),undefined);assert.ok(DESK_CATEGORIES.every(c=>c.byline&&c.summary));});
