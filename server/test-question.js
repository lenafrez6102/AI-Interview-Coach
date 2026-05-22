// Quick test script to verify question generation works
import { generateQuestion } from './services/ollama.js'

console.log('Testing question generation...')
console.log('This should timeout after 10 seconds and use fallback\n')

const start = Date.now()
const question = await generateQuestion('teamwork')
const elapsed = ((Date.now() - start) / 1000).toFixed(1)

console.log(`\n✓ Got question in ${elapsed}s:`)
console.log(`"${question}"`)
