/**
 * Tests for AI Model Configuration
 * Verifies Claude upgrade for MCQ generation and PDF extraction
 */

import {
    AI_MODELS,
    ACTIVE_MODELS,
    MODEL_CAPABILITIES,
    PARALLEL_CONFIG,
} from '../config/aiModels';

describe('AI Models Configuration', () => {

    // ===== Claude Model Definition =====
    describe('AI_MODELS', () => {
        it('should have Claude Sonnet pointing to latest model', () => {
            expect(AI_MODELS.CLAUDE_SONNET).toBe('anthropic/claude-sonnet-4.5');
        });

        it('should have Claude Haiku defined', () => {
            expect(AI_MODELS.CLAUDE_HAIKU).toBe('anthropic/claude-3-haiku');
        });

        it('should have Gemini models defined', () => {
            expect(AI_MODELS.GEMINI_FLASH).toBeDefined();
            expect(AI_MODELS.GEMINI_PRO).toBeDefined();
        });

        it('should have all model keys as strings', () => {
            Object.values(AI_MODELS).forEach(model => {
                expect(typeof model).toBe('string');
                expect(model.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Active Models - Claude for MCQ/PDF =====
    describe('ACTIVE_MODELS', () => {
        it('should use Gemini Flash for MCQ generation', () => {
            expect(ACTIVE_MODELS.MCQ_GENERATION).toBe(AI_MODELS.GEMINI_FLASH);
            expect(ACTIVE_MODELS.MCQ_GENERATION).toContain('google/gemini');
        });

        it('should use Gemini Flash for PDF extraction', () => {
            expect(ACTIVE_MODELS.PDF_EXTRACTION).toBe(AI_MODELS.GEMINI_FLASH);
            expect(ACTIVE_MODELS.PDF_EXTRACTION).toContain('google/gemini');
        });

        it('should have essay evaluation model defined', () => {
            expect(ACTIVE_MODELS.ESSAY_EVALUATION).toBeDefined();
        });

        it('should have mind map model defined', () => {
            expect(ACTIVE_MODELS.MIND_MAP).toBeDefined();
        });

        it('MCQ_GENERATION and PDF_EXTRACTION should use the same model', () => {
            expect(ACTIVE_MODELS.MCQ_GENERATION).toBe(ACTIVE_MODELS.PDF_EXTRACTION);
        });
    });

    // ===== Model Capabilities =====
    describe('MODEL_CAPABILITIES', () => {
        it('should have Claude Sonnet with vision support', () => {
            const capabilities = MODEL_CAPABILITIES[AI_MODELS.CLAUDE_SONNET];
            expect(capabilities).toBeDefined();
            expect(capabilities.vision).toBe(true);
        });

        it('should have Claude Sonnet maxTokens of 16384', () => {
            const capabilities = MODEL_CAPABILITIES[AI_MODELS.CLAUDE_SONNET];
            expect(capabilities.maxTokens).toBe(16384);
        });

        it('should have Claude Sonnet speed as fast', () => {
            const capabilities = MODEL_CAPABILITIES[AI_MODELS.CLAUDE_SONNET];
            expect(capabilities.speed).toBe('fast');
        });

        it('should have Claude Haiku as ultra-fast', () => {
            const capabilities = MODEL_CAPABILITIES[AI_MODELS.CLAUDE_HAIKU];
            expect(capabilities).toBeDefined();
            expect(capabilities.speed).toBe('ultra-fast');
        });
    });

    // ===== Parallel Config =====
    describe('PARALLEL_CONFIG', () => {
        it('should have max concurrent requests defined', () => {
            expect(PARALLEL_CONFIG.MAX_CONCURRENT_REQUESTS).toBeGreaterThan(0);
        });

        it('should have request timeout defined', () => {
            expect(PARALLEL_CONFIG.REQUEST_TIMEOUT).toBeGreaterThan(0);
        });

        it('should have total timeout of 60 seconds', () => {
            expect(PARALLEL_CONFIG.TOTAL_TIMEOUT).toBe(60000);
        });

        it('should have MCQ batch size defined', () => {
            expect(PARALLEL_CONFIG.MCQ_BATCH_SIZE).toBeGreaterThan(0);
        });
    });
});
