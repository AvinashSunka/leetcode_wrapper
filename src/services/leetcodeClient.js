// Shared GraphQL transport layer for the LeetCode wrapper.
// Having a single client avoids duplicating the same HTTP headers and request setup
// across every service method.
const { LEETCODE_GRAPHQL_URL } = require('../config');

async function postGraphQL(payload) {
    // Every request to LeetCode is sent as a POST with JSON payloads and a browser-like
    // user agent so the upstream service accepts the request more reliably.
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Fail early with a clear message so the route layer can translate it into a
        // clean API response for downstream consumers like the Java backend or Discord bot.
        throw new Error(`LeetCode HTTP Error: ${response.status}`);
    }

    return response.json();
}

module.exports = {
    postGraphQL
};
