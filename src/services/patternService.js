// Pattern lookup and filtering logic.
// This service is responsible for validating a user-provided LeetCode pattern and
// retrieving all questions that match it for the UI or bot integrations.
const { postGraphQL } = require('./leetcodeClient');
const { normalizePatternName } = require('../utils/normalizePattern');

let validPatternsCache = null;

async function fetchValidPatterns() {
    // Cache the valid pattern slug list for the lifetime of the process to reduce
    // repeated network calls and speed up validation requests.
    if (validPatternsCache) {
        return validPatternsCache;
    }

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

    const jsonResponse = await postGraphQL(payload);
    const problems = jsonResponse?.data?.problemsetQuestionList?.questions || [];
    const validSet = new Set();

    for (const problem of problems) {
        const tags = problem?.topicTags || [];
        for (const tag of tags) {
            if (tag && tag.slug) {
                // We normalize the slug because the user may send different casing or separators.
                validSet.add(normalizePatternName(tag.slug));
            }
        }
    }

    validPatternsCache = validSet;
    return validSet;
}

async function fetchProblemsByPattern(patternName, limit, skip) {
    // Used when the bot or API wants a list of problems from a specific category, such as
    // arrays, graphs, dynamic programming, etc.
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

    const jsonResponse = await postGraphQL(payload);
    return jsonResponse?.data?.problemsetQuestionList?.questions || [];
}

module.exports = {
    fetchValidPatterns,
    fetchProblemsByPattern
};
