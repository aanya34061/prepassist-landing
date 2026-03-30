/**
 * OpenRouter API Service for Gemini 3 Mind Map Generation
 */

// OpenRouter API Configuration
// Get your API key from https://openrouter.ai/keys
import { OPENROUTER_API_KEY } from '../../../utils/secureKey';
import { ACTIVE_MODELS, OPENROUTER_BASE_URL, SITE_CONFIG } from '../../../config/aiModels';

const API_URL = OPENROUTER_BASE_URL;
const MODEL = ACTIVE_MODELS.MIND_MAP;

// Check if API key is configured
const isApiKeyConfigured = () => {
  return OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10 && !OPENROUTER_API_KEY.includes('YOUR_');
};

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: any;
}

export interface GenerateMindMapResponse {
  content: string;
  mermaidCode: string;
  reasoning_details?: any;
}

// System prompt for mind map generation
const SYSTEM_PROMPT = `You are an expert mind map creator specialized in creating Mermaid mindmap diagrams for UPSC (Union Public Service Commission) exam preparation.

When the user asks you to create or modify a mind map, you should:
1. Understand the topic thoroughly
2. Create a hierarchical structure suitable for learning
3. Generate valid Mermaid mindmap syntax

CRITICAL RULES FOR MERMAID MINDMAP SYNTAX:
- Always start with \`mindmap\` keyword on the first line
- Use proper indentation (2 spaces for each level)
- Root node: \`root((Topic Name))\`
- ONLY use these node shapes:
  - Round edges: \`(Node Text)\`
  - Square: \`[Node Text]\`
- Do NOT use any other node shapes like \`))Node((\`, \`)Node(\`, \`{{Node}}\`, or \`{Node}\`
- Do NOT add any color, style, or class annotations
- Do NOT use special characters like ::, :::, ---, or color names in nodes
- Node text must be plain text only - no markdown, no bold, no HTML
- Use concise labels (max 30 chars per node)
- Maximum 4 levels deep
- Group related concepts together
- Each line should have ONLY the indentation and the node - nothing else

RESPONSE FORMAT:
Always respond with:
1. A brief explanation of the mind map structure
2. The Mermaid code block wrapped in \`\`\`mermaid and \`\`\`

Example:
\`\`\`mermaid
mindmap
  root((Indian Constitution))
    (Historical Background)
      [Government of India Act 1935]
      [Cabinet Mission Plan]
      [Independence Act 1947]
    (Salient Features)
      [Federal Structure]
      [Parliamentary System]
      [Fundamental Rights]
      [Directive Principles]
    (Parts and Schedules)
      [22 Parts]
      [12 Schedules]
\`\`\`

For modifications, update the existing diagram based on user requests (add nodes, reorganize, expand sections, etc.).
REMINDER: Only use round \`()\` and square \`[]\` node shapes. No curly braces, no styling, no colors.`;

// Sanitize mermaid mindmap code to fix common AI output errors
const sanitizeMermaidCode = (code: string): string => {
  if (!code.trim().startsWith('mindmap')) return code;

  const lines = code.split('\n');
  const sanitized: string[] = [];

  for (const line of lines) {
    // Keep the mindmap keyword line as-is
    if (line.trim() === 'mindmap') {
      sanitized.push(line);
      continue;
    }

    // Skip empty lines
    if (!line.trim()) continue;

    // Preserve leading whitespace (indentation)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    let content = line.trim();

    // Remove any Mermaid styling/class annotations like :::className, ::icon(), etc.
    content = content.replace(/:::?\w[\w-]*/g, '').trim();

    // Remove color annotations like [Red], [Blue] that appear after node shapes
    // But don't remove actual node content in brackets
    // This targets standalone color words after closing brackets
    content = content.replace(/\]\s*\[(?:Red|Blue|Green|Yellow|Orange|Purple|Pink|Cyan|Black|White|Grey|Gray)\]/gi, ']');

    // Remove trailing dashes, arrows, or other decorators
    content = content.replace(/\s*[-=~]+\s*$/, '').trim();

    // Fix single curly braces {Node} -> (Node) since {Node} is invalid
    if (/^\{[^{].*[^}]\}$/.test(content) || /^\{[^{].*\}$/.test(content)) {
      if (!content.startsWith('{{')) {
        content = '(' + content.slice(1, -1) + ')';
      }
    }

    // Fix double curly braces {{Node}} -> (Node) as it's problematic across versions
    content = content.replace(/^\{\{(.+)\}\}$/, '($1)');

    // Fix bang shape ))Node(( -> (Node) as it's problematic
    content = content.replace(/^\)\)(.+)\(\($/, '($1)');

    // Fix cloud shape )Node( -> (Node) as it's problematic
    if (/^\)[^)]+\($/.test(content)) {
      content = '(' + content.slice(1, -1) + ')';
    }

    // Skip lines that are just decorators or invalid
    if (!content || /^[-=~>|*]+$/.test(content)) continue;

    sanitized.push(indent + content);
  }

  return sanitized.join('\n');
};

// Extract Mermaid code from response
const extractMermaidCode = (content: string): string => {
  let raw = '';

  // Try to find mermaid code block
  const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
  if (mermaidMatch) {
    raw = mermaidMatch[1].trim();
  }

  // Try to find code block without language
  if (!raw) {
    const codeMatch = content.match(/```\n?([\s\S]*?)```/);
    if (codeMatch && codeMatch[1].trim().startsWith('mindmap')) {
      raw = codeMatch[1].trim();
    }
  }

  // Check if content itself is mermaid code
  if (!raw && content.trim().startsWith('mindmap')) {
    raw = content.trim();
  }

  // Sanitize before returning
  return raw ? sanitizeMermaidCode(raw) : '';
};

// Generate mind map using OpenRouter API
export const generateMindMap = async (
  userMessage: string,
  conversationHistory: Message[] = [],
  existingMermaidCode?: string
): Promise<GenerateMindMapResponse> => {
  // Check if API key is configured
  if (!isApiKeyConfigured()) {
    throw new Error(
      'OpenRouter API key not configured. Please add EXPO_PUBLIC_OPENROUTER_API_KEY to your .env file. Get your key from https://openrouter.ai/keys'
    );
  }

  // Build messages array
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add conversation history
  conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content,
      reasoning_details: msg.reasoning_details,
    });
  });

  // If there's existing code, include it for context
  let userContent = userMessage;
  if (existingMermaidCode) {
    userContent = `Current mind map:\n\`\`\`mermaid\n${existingMermaidCode}\n\`\`\`\n\nUser request: ${userMessage}`;
  }

  messages.push({ role: 'user', content: userContent });

  // Debug: Log what we're about to send
  console.log('[OpenRouter] Preparing request...');
  console.log('[OpenRouter] Model:', MODEL);
  console.log('[OpenRouter] Message count:', messages.length);

  try {
    console.log('[OpenRouter] Sending request to:', API_URL);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_CONFIG.url,
        'X-Title': SITE_CONFIG.name,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.reasoning_details ? { reasoning_details: m.reasoning_details } : {}),
        })),
        reasoning: { enabled: true }, // Enable reasoning for better mind map generation
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    console.log('[OpenRouter] Response status:', response.status);
    console.log('[OpenRouter] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[OpenRouter] API error response:', JSON.stringify(errorData, null, 2));
      console.error('[OpenRouter] Error status:', response.status);
      console.error('[OpenRouter] Error message:', errorData.error?.message);
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[OpenRouter] Response received successfully');
    console.log('[OpenRouter] Response has choices:', !!data.choices);
    console.log('[OpenRouter] Choices count:', data.choices?.length);

    const assistantMessage = data.choices?.[0]?.message;

    if (!assistantMessage) {
      console.error('[OpenRouter] No assistant message in response');
      throw new Error('No response from AI');
    }

    console.log('[OpenRouter] Assistant message received');
    const content = assistantMessage.content || '';
    const mermaidCode = extractMermaidCode(content);
    console.log('[OpenRouter] Mermaid code extracted:', !!mermaidCode);

    return {
      content,
      mermaidCode,
      reasoning_details: assistantMessage.reasoning_details,
    };
  } catch (error) {
    console.error('[OpenRouter] Request failed:', error);
    console.error('[OpenRouter] Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// Generate initial mind map from topic
export const generateInitialMindMap = async (
  topic: string,
  description?: string
): Promise<GenerateMindMapResponse> => {
  let prompt = `Create a comprehensive mind map for the UPSC topic: "${topic}"`;
  if (description) {
    prompt += `\n\nAdditional context: ${description}`;
  }
  prompt += '\n\nCreate a well-structured mind map that covers the key concepts, sub-topics, and important points for UPSC preparation.';

  return generateMindMap(prompt);
};

// Modify existing mind map
export const modifyMindMap = async (
  instruction: string,
  existingMermaidCode: string,
  conversationHistory: Message[] = []
): Promise<GenerateMindMapResponse> => {
  return generateMindMap(instruction, conversationHistory, existingMermaidCode);
};

// Suggest improvements for mind map
export const suggestImprovements = async (
  mermaidCode: string
): Promise<GenerateMindMapResponse> => {
  const prompt = `Analyze this mind map and suggest improvements. Add more relevant nodes, reorganize if needed, and ensure it covers all important aspects for UPSC preparation.`;
  return generateMindMap(prompt, [], mermaidCode);
};

// Expand a specific node
export const expandNode = async (
  nodeName: string,
  mermaidCode: string,
  conversationHistory: Message[] = []
): Promise<GenerateMindMapResponse> => {
  const prompt = `Expand the "${nodeName}" section in more detail. Add relevant sub-topics and concepts that would be important for UPSC preparation.`;
  return generateMindMap(prompt, conversationHistory, mermaidCode);
};

