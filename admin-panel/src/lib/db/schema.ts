import {
    pgTable,
    serial,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    jsonb,
    primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    picture: text('picture'),
    provider: varchar('provider', { length: 50 }).notNull(),
    role: varchar('role', { length: 50 }).default('student').notNull(),
    isGuest: boolean('is_guest').default(false),
    isActive: boolean('is_active').default(true),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('admin').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const maps = pgTable('maps', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    imageUrl: text('image_url').notNull(),
    imagePath: text('image_path'),
    tags: jsonb('tags').default([]),
    additionalInfo: jsonb('additional_info'),
    hotspots: jsonb('hotspots'),
    isPublished: boolean('is_published').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 500 }).notNull(),
    author: varchar('author', { length: 255 }),
    sourceUrl: text('source_url'),
    publishedDate: timestamp('published_date'),
    summary: text('summary'),
    metaDescription: text('meta_description'),
    content: jsonb('content'),
    rawHtml: text('raw_html'),
    images: jsonb('images'),
    gsPaper: varchar('gs_paper', { length: 50 }),
    subject: varchar('subject', { length: 100 }),
    tags: jsonb('tags').default([]),
    isPublished: boolean('is_published').default(false),
    scrapedAt: timestamp('scraped_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionSets = pgTable('question_sets', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    year: integer('year'),
    isPublished: boolean('is_published').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const practiceQuestions = pgTable('practice_questions', {
    id: serial('id').primaryKey(),
    questionSetId: integer('question_set_id').references(() => questionSets.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    optionA: text('option_a').notNull(),
    optionB: text('option_b').notNull(),
    optionC: text('option_c').notNull(),
    optionD: text('option_d').notNull(),
    correctAnswer: varchar('correct_answer', { length: 1 }).notNull(),
    explanation: text('explanation').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
    id: serial('id').primaryKey(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id'),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const roadmapTopics = pgTable('roadmap_topics', {
    id: serial('id').primaryKey(),
    topicId: varchar('topic_id', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    paper: varchar('paper', { length: 50 }).notNull(),
    icon: varchar('icon', { length: 10 }),
    estimatedHours: integer('estimated_hours').notNull(),
    difficulty: varchar('difficulty', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 50 }).notNull(),
    isRecurring: boolean('is_recurring').default(false),
    optional: varchar('optional', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roadmapSubtopics = pgTable('roadmap_subtopics', {
    id: serial('id').primaryKey(),
    subtopicId: varchar('subtopic_id', { length: 100 }).unique().notNull(),
    topicId: integer('topic_id').notNull().references(() => roadmapTopics.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    estimatedHours: integer('estimated_hours').notNull(),
    order: integer('order').notNull(),
});

export const roadmapSources = pgTable('roadmap_sources', {
    id: serial('id').primaryKey(),
    topicId: integer('topic_id').notNull().references(() => roadmapTopics.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    link: text('link'),
    order: integer('order').notNull(),
});

export const historyTimelineEvents = pgTable('history_timeline_events', {
    id: serial('id').primaryKey(),
    year: varchar('year', { length: 50 }).notNull(),
    event: text('event').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    details: text('details'),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const visualReferences = pgTable('visual_references', {
    id: serial('id').primaryKey(),
    category: varchar('category', { length: 100 }).notNull(),
    subcategory: varchar('subcategory', { length: 100 }),
    title: varchar('title', { length: 255 }).notNull(),
    data: jsonb('data').notNull(),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).unique().notNull(),
    color: varchar('color', { length: 20 }).default('#6366F1'),
    usageCount: integer('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notes = pgTable('notes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    content: jsonb('content'),
    plainText: text('plain_text'),
    folderId: integer('folder_id'),
    backlinks: jsonb('backlinks').default([]),
    linkedMindMapNodes: jsonb('linked_mind_map_nodes').default([]),
    isPinned: boolean('is_pinned').default(false),
    isArchived: boolean('is_archived').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const noteTags = pgTable('note_tags', {
    noteId: integer('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.noteId, table.tagId] }),
}));

export const articleMcqs = pgTable('article_mcqs', {
    id: serial('id').primaryKey(),
    articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    optionA: text('option_a').notNull(),
    optionB: text('option_b').notNull(),
    optionC: text('option_c').notNull(),
    optionD: text('option_d').notNull(),
    correctAnswer: varchar('correct_answer', { length: 1 }).notNull(),
    explanation: text('explanation'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
