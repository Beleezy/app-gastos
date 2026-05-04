// Fixture combinado: agrupa llmMock + tracker + authHeaders en un solo `test`
// para specs que necesitan todos. Si solo necesitas uno, importa directamente
// desde su archivo.

import { test as base, expect, mergeTests } from '@playwright/test'
import { test as llmTest } from './llm-mock.fixture.js'
import { test as seedTest } from './seed.fixture.js'
import { test as authTest } from './auth.fixture.js'

export const test = mergeTests(llmTest, seedTest, authTest)
export { expect }
