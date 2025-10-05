/**
 * Stool Analysis Utility using Hugging Face Free API
 * Analyzes stool images for Bristol Scale classification and health indicators
 */

const HF_API_URL = 'https://api-inference.huggingface.co/models/';
// Updated to use more reliable models
const VISION_MODEL = 'nlpconnect/vit-gpt2-image-captioning';
const LLM_MODEL = 'meta-llama/Llama-3.2-3B-Instruct';

// Load API token from environment variables
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;



// Debug: Log token status (not the actual token for security)
console.log('HF API Token loaded:', HF_API_TOKEN ? `Yes (${HF_API_TOKEN.substring(0, 6)}...)` : 'No - token missing!');

if (!HF_API_TOKEN) {
  console.warn('WARNING: VITE_HF_API_TOKEN is not set in environment variables. API calls may fail or have rate limits.');
}

/**
 * Analyzes an image using Hugging Face's vision model
 * @param {File|Blob} imageFile - The image file to analyze
 * @param {string} apiKey - Hugging Face API key (optional, uses env var if not provided)
 * @returns {Promise<string>} Image description
 */
async function describeImage(imageFile, apiKey = null) {
  const headers = {
    'Content-Type': 'application/octet-stream',
  };

  // Use provided API key or fall back to environment variable
  const token = apiKey || HF_API_TOKEN;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Vision API: Using Bearer token (first 6 chars):', token.substring(0, 6) + '...');
  } else {
    console.warn('Vision API: No token provided - using free tier (may have rate limits)');
  }

  const response = await fetch(`${HF_API_URL}${VISION_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_TOKEN}`,  // Your "ID card"
      'Content-Type': 'application/json'
    },
    body: imageFile,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Vision API error response:', error);
    throw new Error(`Vision API error: ${error}`);
  }

  const result = await response.json();
  return result[0]?.generated_text || '';
}

/**
 * Analyzes image description using LLM to extract medical information
 * @param {string} description - Image description from vision model
 * @param {string} apiKey - Hugging Face API key (optional, uses env var if not provided)
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeWithLLM(description, apiKey = null) {
  const prompt = `You are a medical analysis assistant. Analyze this image description and determine if it appears to be a stool sample. If yes, provide a detailed analysis. If no, indicate it's not relevant.

Image description: "${description}"

Respond ONLY with valid JSON in this exact format:
{
  "isRelevant": true/false,
  "bristolScore": 1-7 or null,
  "sizeEstimation": "small/medium/large" or null,
  "healthIndicators": {
    "dehydration": true/false/null,
    "bloodPresence": true/false/null,
    "unusualColor": true/false/null,
    "consistencyIssues": true/false/null
  },
  "warnings": ["array of health warnings"],
  "notes": "brief analysis notes"
}

Bristol Scale Reference:
1-2: Hard lumps (constipation)
3-4: Normal (ideal)
5-7: Loose/liquid (diarrhea)`;

  const headers = {
    'Content-Type': 'application/json',
  };

  // Use provided API key or fall back to environment variable
  const token = apiKey || HF_API_TOKEN;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('LLM API: Using Bearer token (first 6 chars):', token.substring(0, 6) + '...');
  } else {
    console.warn('LLM API: No token provided - using free tier (may have rate limits)');
  }

  const response = await fetch(`${HF_API_URL}${LLM_MODEL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LLM API error response:', error);
    throw new Error(`LLM API error: ${error}`);
  }

  const result = await response.json();
  const generatedText = result[0]?.generated_text || '';

  // Extract JSON from the response
  try {
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (parseError) {
    // Fallback: return structured error
    return {
      isRelevant: false,
      bristolScore: null,
      sizeEstimation: null,
      healthIndicators: {
        dehydration: null,
        bloodPresence: null,
        unusualColor: null,
        consistencyIssues: null,
      },
      warnings: ['Unable to parse analysis results'],
      notes: 'Analysis failed - could not interpret image description',
    };
  }
}

/**
 * Main function to analyze stool images
 * @param {File|Blob} imageFile - The image file to analyze
 * @param {string} apiKey - Hugging Face API key (optional, uses env var if not provided)
 * @returns {Promise<Object>} Complete analysis results
 */
export async function analyzeStoolImage(imageFile, apiKey = null) {
  try {
    // Validate input
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    // Use provided API key or fall back to environment variable
    const tokenToUse = apiKey || HF_API_TOKEN;

    console.log('Starting stool image analysis...');
    console.log('Using API token:', tokenToUse ? 'Yes' : 'No (free tier)');

    // Step 1: Get image description using vision model
    let description;
    try {
      description = await describeImage(imageFile, tokenToUse);
    } catch (visionError) {
      return {
        success: false,
        error: 'Failed to analyze image',
        details: visionError.message,
        isRelevant: false,
        bristolScore: null,
        sizeEstimation: null,
        healthIndicators: {
          dehydration: null,
          bloodPresence: null,
          unusualColor: null,
          consistencyIssues: null,
        },
        warnings: ['Image analysis failed - please try again'],
        notes: null,
      };
    }

    // Step 2: Analyze description with LLM
    let analysis;
    try {
      analysis = await analyzeWithLLM(description, tokenToUse);
    } catch (llmError) {
      return {
        success: false,
        error: 'Failed to process analysis',
        details: llmError.message,
        description,
        isRelevant: false,
        bristolScore: null,
        sizeEstimation: null,
        healthIndicators: {
          dehydration: null,
          bloodPresence: null,
          unusualColor: null,
          consistencyIssues: null,
        },
        warnings: ['Analysis processing failed - please try again'],
        notes: null,
      };
    }

    // Step 3: Validate and return results
    return {
      success: true,
      description,
      isRelevant: analysis.isRelevant || false,
      bristolScore: analysis.bristolScore,
      sizeEstimation: analysis.sizeEstimation,
      healthIndicators: {
        dehydration: analysis.healthIndicators?.dehydration ?? null,
        bloodPresence: analysis.healthIndicators?.bloodPresence ?? null,
        unusualColor: analysis.healthIndicators?.unusualColor ?? null,
        consistencyIssues: analysis.healthIndicators?.consistencyIssues ?? null,
      },
      warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
      notes: analysis.notes || null,
    };
  } catch (error) {
    // Catch-all error handler
    return {
      success: false,
      error: 'Unexpected error during analysis',
      details: error.message,
      isRelevant: false,
      bristolScore: null,
      sizeEstimation: null,
      healthIndicators: {
        dehydration: null,
        bloodPresence: null,
        unusualColor: null,
        consistencyIssues: null,
      },
      warnings: ['An unexpected error occurred - please try again'],
      notes: null,
    };
  }
}

/**
 * Helper function to get Bristol Scale interpretation
 * @param {number} score - Bristol Scale score (1-7)
 * @returns {string} Interpretation
 */
export function getBristolInterpretation(score) {
  const interpretations = {
    1: 'Severe constipation - Hard lumps',
    2: 'Mild constipation - Lumpy and sausage-like',
    3: 'Normal - Sausage shape with cracks',
    4: 'Ideal - Smooth, soft sausage',
    5: 'Lacking fiber - Soft blobs with clear edges',
    6: 'Mild diarrhea - Fluffy, mushy pieces',
    7: 'Severe diarrhea - Liquid, no solid pieces',
  };

  return interpretations[score] || 'Unknown';
}

export default {
  analyzeStoolImage,
  getBristolInterpretation,
};
