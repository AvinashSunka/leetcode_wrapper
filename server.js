const express = require('express');
const path = require('path');
const app = express();

const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function normalizePatternName(input) {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');
}

function getPatternName(req) {
    const paramPattern = req.params.pattern || req.params.topic;
    const queryPattern = req.query.pattern || req.query.topic || req.query.tag;
    const bodyPattern = req.body && (req.body.pattern || req.body.topic || req.body.tag);

    return normalizePatternName(paramPattern || queryPattern || bodyPattern || '');
}

let validPatternsCache = null;

async function fetchValidPatterns() {
    if (validPatternsCache) {
        return validPatternsCache;
    }

    const url = 'https://leetcode.com/graphql';
    const payload = {
        query: `
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
                    questions: data {
                        topicTags {
                            name
                            slug
                        }
                    }
                }
            }
        `,
        variables: {
            categorySlug: '',
            skip: 0,
            limit: 1000,
            filters: {}
        }
    };

    const leetcodeResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify(payload)
    });

    if (!leetcodeResponse.ok) {
        throw new Error(`LeetCode HTTP Error: ${leetcodeResponse.status}`);
    }

    const jsonResponse = await leetcodeResponse.json();
    const problems = jsonResponse?.data?.problemsetQuestionList?.questions || [];
    const validSet = new Set();

    for (const problem of problems) {
        const tags = problem?.topicTags || [];
        for (const tag of tags) {
            if (tag && tag.slug) {
                validSet.add(normalizePatternName(tag.slug));
            }
        }
    }

    validPatternsCache = validSet;
    return validSet;
}

async function fetchProblemsByPattern(patternName, limit, skip) {
    const url = 'https://leetcode.com/graphql';
    const payload = {
        query: `
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
                    questions: data {
                        frontendQuestionId: questionFrontendId
                        title
                        titleSlug
                        difficulty
                        topicTags {
                            name
                            slug
                        }
                    }
                }
            }
        `,
        variables: {
            categorySlug: '',
            skip,
            limit,
            filters: {
                tags: [patternName]
            }
        }
    };

    const leetcodeResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify(payload)
    });

    if (!leetcodeResponse.ok) {
        throw new Error(`LeetCode HTTP Error: ${leetcodeResponse.status}`);
    }

    const jsonResponse = await leetcodeResponse.json();
    return jsonResponse?.data?.problemsetQuestionList?.questions || [];
}

async function handlePatternRequest(req, res) {
    const patternName = getPatternName(req);
    const limit = parseInt(req.query.limit) || 1000;
    const skip = parseInt(req.query.skip) || 0;

    if (!patternName) {
        return res.status(400).json({
            success: false,
            message: 'Pattern name is required. Send it as /api/problems/:pattern or ?pattern=... or { "pattern": "..." }.'
        });
    }

    console.log(`[API] Requested problems for pattern: ${patternName}`);

    try {
        const validPatterns = await fetchValidPatterns();

        if (!validPatterns.has(patternName)) {
            return res.status(404).json({
                success: false,
                message: `Pattern name '${patternName}' is wrong or not found on LeetCode.`,
                pattern: patternName,
                count: 0,
                data: []
            });
        }

        const problems = await fetchProblemsByPattern(patternName, limit, skip);

        return res.status(200).json({
            success: true,
            pattern: patternName,
            count: problems.length,
            data: problems
        });
    } catch (error) {
        console.error('Error fetching from LeetCode:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve data from LeetCode',
            error: error.message,
            pattern: patternName
        });
    }
}

app.get('/api/problems', handlePatternRequest);
app.get('/api/problems/:pattern', handlePatternRequest);
app.get('/api/problems/:topic', handlePatternRequest);
app.post('/api/problems', handlePatternRequest);

app.listen(PORT, () => {
    console.log(`LeetCode microservice is running on http://localhost:${PORT}`);
});
