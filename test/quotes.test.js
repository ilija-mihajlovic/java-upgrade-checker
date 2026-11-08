const test = require('node:test')
const assert = require('node:assert')
const rules = require('../rules.js')

test('single quoted and double quoted Gradle compatibility values are read', () => {
  for (const text of ["sourceCompatibility = '11'", 'sourceCompatibility = "11"', "targetCompatibility = '1.8'"]) {
    const found = rules.analyze(text).some(f => /below 17/.test(f.title))
    assert.ok(found, text)
  }
  assert.ok(!rules.analyze("sourceCompatibility = '17'").some(f => /below 17/.test(f.title)))
})
