// Utility helpers for pattern-based LeetCode requests.
// These functions standardize user input so the wrapper accepts a consistent
// format regardless of whether the client sends a route param, query param, or JSON body.
function normalizePatternName(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Example: "Two Sum" -> "two-sum"
    // "array_string" -> "array-string"
    // This keeps the internal representation aligned with LeetCode slugs.
    return input
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');
}

function getPatternName(req) {
    // The same concept may be requested through route params, query strings, or JSON.
    // We accept all common shapes and normalize them into a single slug.
    const paramPattern = req.params.pattern || req.params.topic;
    const queryPattern = req.query.pattern || req.query.topic || req.query.tag;
    const bodyPattern = req.body && (req.body.pattern || req.body.topic || req.body.tag);

    return normalizePatternName(paramPattern || queryPattern || bodyPattern || '');
}

module.exports = {
    normalizePatternName,
    getPatternName
};
