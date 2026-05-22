/**
 * Ollama service - replaces AWS Bedrock with local LLM
 * Requires Ollama running locally on http://localhost:11434
 */

<<<<<<< HEAD
const OLLAMA_URL = 'http://localhost:11434/api/generate'
const MODEL = 'llama3.2:1b' // Using 1B model for faster generation
=======
import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MODEL = 'llama3.2:1b' // 1.2B model - faster generation for quick responses
const GENERATION_TIMEOUT = 8000 // 8 second timeout for questions
const ANALYSIS_TIMEOUT = 15000 // 15 second timeout for analysis (needs more time)
const HEALTH_CHECK_TIMEOUT = 2000 // 2 second health check
const USE_OLLAMA = true // Set to true to enable Ollama, false to always use fallback

// Fallback questions if Ollama is slow or unavailable
const FALLBACK_QUESTIONS = {
  behavioral: [
    "Tell me about a time when you had to work with a difficult team member.",
    "Describe a situation where you had to meet a tight deadline.",
    "Give me an example of a time when you showed leadership.",
    "Tell me about a time when you had to adapt to a significant change.",
    "Describe a situation where you went above and beyond what was expected.",
    "Tell me about a time when you received constructive criticism and how you handled it.",
  ],
  leadership: [
    "Tell me about a time when you had to lead a team through a challenging project.",
    "Describe a situation where you had to motivate others to achieve a goal.",
    "Give me an example of when you had to make a difficult decision as a leader.",
    "Tell me about a time when you had to delegate tasks effectively.",
    "Describe a situation where you had to lead without formal authority.",
  ],
  teamwork: [
    "Tell me about a time when you had to collaborate with people from different backgrounds.",
    "Describe a situation where you had to resolve a conflict within your team.",
    "Give me an example of when you helped a struggling team member.",
    "Tell me about a time when you had to compromise to achieve a team goal.",
    "Describe a situation where you contributed to a successful team project.",
  ],
  conflict: [
    "Tell me about a time when you disagreed with a supervisor or colleague.",
    "Describe how you handled a situation where team members had opposing views.",
    "Give me an example of when you had to address a conflict between others.",
    "Tell me about a time when you had to stand up for your ideas.",
    "Describe a situation where you turned a conflict into a positive outcome.",
  ],
  problem_solving: [
    "Tell me about a complex problem you solved and how you approached it.",
    "Describe a time when you had to think creatively to overcome an obstacle.",
    "Give me an example of when you identified a problem before others noticed it.",
    "Tell me about a time when your first solution didn't work and what you did next.",
    "Describe a situation where you had to analyze data to make a decision.",
  ],
  failure: [
    "Tell me about a time when you failed and what you learned from it.",
    "Describe a situation where things didn't go as planned and how you recovered.",
    "Give me an example of a mistake you made and how you handled it.",
    "Tell me about a time when you missed a deadline or goal.",
    "Describe a situation where you had to admit you were wrong.",
  ],
  time_management: [
    "Tell me about a time when you had to juggle multiple priorities.",
    "Describe how you managed your time during a particularly busy period.",
    "Give me an example of when you had to prioritize competing demands.",
    "Tell me about a time when you had to work under pressure.",
    "Describe a situation where you had to balance quality with speed.",
  ],
}

function getRandomFallbackQuestion(category = 'behavioral') {
  const questions = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS.behavioral
  return questions[Math.floor(Math.random() * questions.length)]
}

/**
 * Run Ollama generation in a worker thread with timeout
 * @param {string} prompt - The prompt to send to Ollama
 * @param {object} options - Ollama generation options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} The generated text
 */
async function runOllamaWorker(prompt, options, timeout = GENERATION_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'ollama-worker.js'), {
      workerData: { model: MODEL, prompt, options }
    })

    let terminated = false

    // Set timeout to terminate worker if it takes too long
    const timeoutId = setTimeout(() => {
      terminated = true
      worker.terminate()
      reject(new Error('Worker timeout'))
    }, timeout)

    worker.on('message', (message) => {
      clearTimeout(timeoutId)
      if (!terminated) {
        if (message.success) {
          resolve(message.result)
        } else {
          reject(new Error(message.error))
        }
      }
    })

    worker.on('error', (error) => {
      clearTimeout(timeoutId)
      if (!terminated) {
        reject(error)
      }
    })

    worker.on('exit', (code) => {
      clearTimeout(timeoutId)
      if (!terminated && code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

/**
 * Quick health check for Ollama
 * @returns {Promise<boolean>} True if Ollama is responsive
 */
async function checkOllamaHealth() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)
    
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    return response.ok
  } catch (error) {
    return false
  }
}
>>>>>>> 8061c9c5 (fixed generate questions)

/**
 * Generates a single behavioral interview question for the given category.
 * @param {string} [category='behavioral'] - The question category (e.g. 'leadership', 'teamwork')
 * @returns {Promise<string>} The generated question text
 */
export async function generateQuestion(category = 'behavioral') {
<<<<<<< HEAD
  const prompt = `Generate one ${category} interview question for entry-level candidates. Question only:`

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 50,
        num_ctx: 512,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`)
=======
  // If Ollama is disabled, use fallback immediately
  if (!USE_OLLAMA) {
    console.log('Using fallback question (Ollama disabled)')
    return getRandomFallbackQuestion(category)
>>>>>>> 8061c9c5 (fixed generate questions)
  }

  // Quick health check first
  const isHealthy = await checkOllamaHealth()
  if (!isHealthy) {
    console.warn('Ollama health check failed, using fallback')
    return getRandomFallbackQuestion(category)
  }

  // Try to generate with Ollama using worker thread
  const prompt = `Generate one ${category} interview question for entry-level candidates. Question only:`

  try {
    const question = await runOllamaWorker(prompt, {
      temperature: 0.8,
      num_predict: 60,
    })
    
    console.log('✓ Generated question with Ollama')
    return question
  } catch (error) {
    console.warn(`Ollama generation failed (${error.message}), using fallback`)
    return getRandomFallbackQuestion(category)
  }
}

/**
 * Analyzes a candidate's interview response and returns structured STAR feedback.
 * @param {string} question - The behavioral interview question that was asked
 * @param {string} transcription - The candidate's spoken response (transcribed)
 * @returns {Promise<Feedback>} Structured feedback object
 *
 * @typedef {Object} Feedback
 * @property {{ situation: boolean, task: boolean, action: boolean, result: boolean }} starAnalysis
 * @property {string[]} strengths
 * @property {string[]} areasForImprovement
 * @property {string[]} actionableTips
 */
export async function analyzeResponse(question, transcription) {
<<<<<<< HEAD
  const prompt = `You are an expert interview coach. Analyze this behavioral interview response using the STAR framework.
=======
  const prompt = `You are an encouraging interview coach. Analyze this interview response using the STAR framework.
>>>>>>> 8061c9c5 (fixed generate questions)

Question: ${question}

Candidate's Response: ${transcription}

<<<<<<< HEAD
Provide detailed, constructive feedback in JSON format:

{
  "starAnalysis": {
    "situation": true/false (Did they describe the context/background?),
    "task": true/false (Did they explain their responsibility/goal?),
    "action": true/false (Did they detail specific actions they took?),
    "result": true/false (Did they share measurable outcomes/impact?)
  },
  "strengths": [
    "List 2-3 specific things they did well",
    "Be encouraging and specific"
  ],
  "areasForImprovement": [
    "List 2-3 specific gaps or areas to strengthen",
    "Focus on what's missing from STAR"
  ],
  "actionableTips": [
    "Provide 2-3 concrete, specific suggestions",
    "Make them immediately actionable for next time"
  ]
}

Return ONLY valid JSON, no markdown or explanation.`

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:latest', // Use larger 3.2B model for better analysis
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 1000,
        num_ctx: 4096,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`)
  }

  const data = await response.json()
  const rawText = data.response?.trim()

  if (!rawText) {
    throw new Error('No analysis generated by Ollama')
  }

  // Strip markdown code fences if present
  let jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  
  // Fix incomplete JSON by adding missing closing braces
  const openBraces = (jsonText.match(/{/g) || []).length
  const closeBraces = (jsonText.match(/}/g) || []).length
  if (openBraces > closeBraces) {
    jsonText += '}'.repeat(openBraces - closeBraces)
  }

  let feedback
  try {
    feedback = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Ollama returned malformed JSON: ${err.message}. Raw response: ${rawText}`)
  }

  // Ensure all required fields exist with defaults
  feedback.starAnalysis = feedback.starAnalysis || { situation: false, task: false, action: false, result: false }
  feedback.strengths = feedback.strengths || []
  feedback.areasForImprovement = feedback.areasForImprovement || []
  feedback.actionableTips = feedback.actionableTips || []

  return feedback
=======
Return a valid JSON object with:
{
  "starAnalysis": {
    "situation": true or false,
    "task": true or false,
    "action": true or false,
    "result": true or false
  },
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "actionableTips": ["tip 1", "tip 2"]
}

Use true/false (not null). Be encouraging. Return ONLY valid JSON, no markdown.`

  try {
    const rawResponse = await runOllamaWorker(prompt, {
      temperature: 0.3,
      num_predict: 400,
    }, ANALYSIS_TIMEOUT)

    // Strip markdown code fences if present
    const jsonText = rawResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let feedback
    try {
      feedback = JSON.parse(jsonText)
      
      // Validate and fix the structure
      if (!feedback.starAnalysis || typeof feedback.starAnalysis !== 'object') {
        feedback.starAnalysis = { situation: false, task: false, action: false, result: false }
      }
      
      // Ensure all STAR fields are booleans, not null
      feedback.starAnalysis.situation = Boolean(feedback.starAnalysis.situation)
      feedback.starAnalysis.task = Boolean(feedback.starAnalysis.task)
      feedback.starAnalysis.action = Boolean(feedback.starAnalysis.action)
      feedback.starAnalysis.result = Boolean(feedback.starAnalysis.result)
      
      // Ensure arrays exist
      feedback.strengths = Array.isArray(feedback.strengths) ? feedback.strengths : []
      feedback.areasForImprovement = Array.isArray(feedback.areasForImprovement) ? feedback.areasForImprovement : []
      feedback.actionableTips = Array.isArray(feedback.actionableTips) ? feedback.actionableTips : []
      
    } catch (err) {
      throw new Error(`Ollama returned malformed JSON: ${err.message}. Raw response: ${rawResponse}`)
    }

    console.log('✓ Analyzed response with Ollama')
    return feedback
  } catch (error) {
    console.error(`Failed to analyze response: ${error.message}`)
    throw new Error(`Failed to analyze response: ${error.message}`)
  }
>>>>>>> 8061c9c5 (fixed generate questions)
}
