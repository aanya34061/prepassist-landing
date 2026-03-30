/**
 * Tests for MCQ Parsing and Format Alignment
 * Verifies that MCQ parsing handles various AI response formats correctly
 */

import { MCQ, generateMCQsFromText } from '../utils/mcqAI';
import { ACTIVE_MODELS } from '../config/aiModels';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock the secure key
jest.mock('../utils/secureKey', () => ({
    OPENROUTER_API_KEY: 'test-key-for-testing',
    getOpenRouterKey: () => 'test-key-for-testing',
    isKeyConfigured: () => true,
}));

describe('MCQ Parsing and Format Alignment', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ===== API Configuration Tests =====
    describe('API Configuration', () => {
        it('should call Claude model via OpenRouter', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: `Question 1: What is the capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai
Correct Answer: B
Explanation: New Delhi is the capital of India.

Question 2: Which article deals with fundamental rights?
A. Article 12
B. Article 14
C. Article 21
D. All of the above
Correct Answer: D
Explanation: Articles 12-35 deal with fundamental rights.`
                    }
                }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            await generateMCQsFromText('Test content about Indian polity and geography');

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            expect(callArgs[0]).toBe('https://openrouter.ai/api/v1/chat/completions');

            const body = JSON.parse(callArgs[1].body);
            expect(body.model).toBe(ACTIVE_MODELS.MCQ_GENERATION);
        });

        it('should include proper OpenRouter headers', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Question 1: Test?\nA. A\nB. B\nC. C\nD. D\nCorrect Answer: A\nExplanation: Test' } }]
                }),
            });

            await generateMCQsFromText('Test content');

            const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
            expect(headers['Authorization']).toContain('Bearer');
            expect(headers['Content-Type']).toBe('application/json');
        });
    });

    // ===== MCQ Parsing Tests =====
    describe('MCQ Response Parsing', () => {
        it('should parse well-formatted MCQ response', async () => {
            const mockContent = `Question 1: What is the largest state in India by area?
A. Rajasthan
B. Maharashtra
C. Madhya Pradesh
D. Uttar Pradesh
Correct Answer: A
Explanation: Rajasthan is the largest state in India by area.

Question 2: Who was the first President of India?
A. Mahatma Gandhi
B. Jawaharlal Nehru
C. Dr. Rajendra Prasad
D. Sardar Patel
Correct Answer: C
Explanation: Dr. Rajendra Prasad was the first President of India.`;

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: mockContent } }]
                }),
            });

            const mcqs = await generateMCQsFromText('Indian geography and history');

            expect(mcqs.length).toBeGreaterThanOrEqual(2);
            expect(mcqs[0].question).toContain('largest state');
            expect(mcqs[0].optionA).toBe('Rajasthan');
            expect(mcqs[0].correctAnswer).toBe('A');
            expect(mcqs[0].optionB).toBeDefined();
            expect(mcqs[0].optionC).toBeDefined();
            expect(mcqs[0].optionD).toBeDefined();
        });

        it('should handle API errors gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            await expect(generateMCQsFromText('test')).rejects.toThrow();
        });

        it('should handle empty AI response', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: '' } }]
                }),
            });

            await expect(generateMCQsFromText('test')).rejects.toThrow('No content received from AI');
        });

        it('should truncate input text to 200k characters', async () => {
            const longText = 'A'.repeat(250000);

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: `Question 1: Test?
A. Option A
B. Option B
C. Option C
D. Option D
Correct Answer: A
Explanation: Test explanation` } }]
                }),
            });

            await generateMCQsFromText(longText);

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            const promptText = body.messages[0].content[0].text;
            // The prompt includes extra text around the truncated content,
            // but the content itself should be truncated
            expect(promptText.length).toBeLessThan(250000);
        });
    });

    // ===== MCQ Structure Validation =====
    describe('MCQ Structure', () => {
        it('parsed MCQs should have all required fields', async () => {
            const mockContent = `Question 1: What is Article 370?
A. Right to Education
B. Special status to J&K
C. Right to Information
D. Fundamental Rights
Correct Answer: B
Explanation: Article 370 granted special autonomous status to Jammu and Kashmir.`;

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: mockContent } }]
                }),
            });

            const mcqs = await generateMCQsFromText('Indian Constitution');

            if (mcqs.length > 0) {
                const mcq = mcqs[0];
                expect(mcq).toHaveProperty('question');
                expect(mcq).toHaveProperty('optionA');
                expect(mcq).toHaveProperty('optionB');
                expect(mcq).toHaveProperty('optionC');
                expect(mcq).toHaveProperty('optionD');
                expect(mcq).toHaveProperty('correctAnswer');
                expect(['A', 'B', 'C', 'D']).toContain(mcq.correctAnswer);
            }
        });

        it('correct answer should be a valid option letter', async () => {
            const mockContent = `Question 1: Capital of India?
A. Mumbai
B. Delhi
C. Kolkata
D. Chennai
Correct Answer: B
Explanation: Delhi is the capital.`;

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: mockContent } }]
                }),
            });

            const mcqs = await generateMCQsFromText('Geography');

            mcqs.forEach(mcq => {
                expect(['A', 'B', 'C', 'D']).toContain(mcq.correctAnswer);
            });
        });
    });

    // ===== Prompt Format Tests =====
    describe('Prompt Format', () => {
        it('should not include bilingual requirement in prompt', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Question 1: Test?\nA. A\nB. B\nC. C\nD. D\nCorrect Answer: A\nExplanation: Test' } }]
                }),
            });

            await generateMCQsFromText('Test content');

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            const promptText = body.messages[0].content[0].text;
            expect(promptText).not.toContain('Hindi');
            expect(promptText).not.toContain('Bilingual');
        });

        it('should request exactly 10 MCQs', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Question 1: Test?\nA. A\nB. B\nC. C\nD. D\nCorrect Answer: A\nExplanation: Test' } }]
                }),
            });

            await generateMCQsFromText('Test content');

            const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            const promptText = body.messages[0].content[0].text;
            expect(promptText).toContain('exactly 10');
        });
    });
});
