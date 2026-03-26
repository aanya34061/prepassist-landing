export const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export const UPSC_SUBJECTS = [
  'Polity', 'Economy', 'Geography', 'History',
  'Science & Technology', 'Environment', 'Current Affairs',
] as const;

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'unordered-list' | 'ordered-list' | 'quote';
  content?: string;
  level?: number;
  items?: string[];
}

export interface NewsArticle {
  title: string;
  summary: string;
  content: ContentBlock[];
  subject: string;
  source: string;
  tags: string[];
}

export function buildPerplexityPrompt(dateStr: string): string {
  return `You are an expert UPSC (Union Public Service Commission) current affairs analyst for India.

Today's date is ${dateStr}. Find and summarize the most important news stories from TODAY that are relevant for UPSC Civil Services Examination preparation.

Focus on news from these categories:
- Polity & Governance (constitutional amendments, supreme court judgments, government policies)
- Economy (RBI decisions, budget, trade, GDP, economic reforms)
- Science & Technology (ISRO, DRDO, new tech policies, digital India)
- Environment & Ecology (climate change, wildlife, conservation, pollution)
- International Relations (bilateral relations, UN, summits, geopolitics)
- Social Issues (education policy, health, welfare schemes)
- History & Culture (archaeological discoveries, cultural events)

Return EXACTLY a JSON array of 5-8 news articles. Each article must have:
- "title": A clear, concise headline (max 100 chars)
- "summary": A 2-3 sentence UPSC-focused summary explaining why this matters for aspirants
- "content": An array of content blocks structuring the article like a news website. Include 5-8 blocks covering background, key developments, significance, and UPSC relevance. Use these block types:
  - Heading: {"type":"heading","level":2,"content":"Section Title"}
  - Paragraph: {"type":"paragraph","content":"Text content here"}
  - Bullet list: {"type":"unordered-list","items":["point 1","point 2","point 3"]}
  Example structure: background heading + paragraph, key points heading + list, significance heading + paragraph, UPSC relevance heading + list
- "subject": One of: "Polity", "Economy", "Geography", "History", "Science & Technology", "Environment", "Current Affairs"
- "source": The original news source name (e.g., "The Hindu", "Indian Express", "PIB", "Livemint")
- "tags": Array of 3-5 relevant keywords

IMPORTANT: Return ONLY the JSON array, no other text. Example format:
[{"title":"...","summary":"...","content":[{"type":"heading","level":2,"content":"Background"},{"type":"paragraph","content":"..."},{"type":"heading","level":2,"content":"Key Points"},{"type":"unordered-list","items":["...","..."]}],"subject":"...","source":"...","tags":["..."]}]`;
}

function parseContentBlocks(content: any): ContentBlock[] {
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block.type === 'unordered-list' || block.type === 'ordered-list') {
          const items = Array.isArray(block.items) ? block.items.map(String).filter(Boolean) : [];
          return { type: block.type as ContentBlock['type'], items, content: items.join(', ') };
        }
        return {
          type: (block.type || 'paragraph') as ContentBlock['type'],
          content: String(block.content || ''),
          ...(block.level !== undefined && { level: Number(block.level) }),
        };
      })
      .filter((block) => (block.items && block.items.length > 0) || (block.content && block.content.trim()));
  }
  // Fallback: if content is a plain string, wrap it in a paragraph block
  if (typeof content === 'string' && content.trim()) {
    return [{ type: 'paragraph', content: content.trim() }];
  }
  return [];
}

export function parsePerplexityResponse(responseText: string): NewsArticle[] {
  let jsonStr = responseText.trim();

  // Remove markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find array in the response
  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1) {
    jsonStr = jsonStr.substring(arrayStart, arrayEnd + 1);
  }

  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error('Response is not an array');
  }

  return parsed
    .filter((item: any) => item.title && item.summary && item.content)
    .map((item: any) => ({
      title: String(item.title).slice(0, 500),
      summary: String(item.summary),
      content: parseContentBlocks(item.content),
      subject: UPSC_SUBJECTS.includes(item.subject) ? item.subject : 'Current Affairs',
      source: String(item.source || 'News Sources'),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 5) : ['UPSC', 'Current Affairs'],
    }));
}

export async function fetchFromPerplexity(dateStr: string): Promise<NewsArticle[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a UPSC current affairs expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: buildPerplexityPrompt(dateStr),
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error('Empty response from Perplexity');
  }

  return parsePerplexityResponse(responseText);
}
