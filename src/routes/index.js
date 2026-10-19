// API route definitions for the wrapper service.
// This file acts as the boundary between external HTTP requests and the service layer.
// It keeps route handling logic readable and delegates the hard work to dedicated services.
const express = require('express');
const { fetchDailyChallenge } = require('../services/dailyChallengeService');
const { fetchValidPatterns, fetchProblemsByPattern } = require('../services/patternService');
const { getPatternName } = require('../utils/normalizePattern');

const router = express.Router();

async function handlePatternRequest(req, res) {
    // This endpoint accepts a pattern in several ways: route param, query string, or JSON body.
    // The normalize utility makes the value consistent before validation.
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

// Liveness check used by monitors, uptime checks, and deployment platforms.
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'leetcode-wrapper',
        timestamp: new Date().toISOString()
    });
});

// Health route kept under the /api namespace for consistency with the rest of the app.
router.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'leetcode-wrapper',
        timestamp: new Date().toISOString()
    });
});

// Returns the current LeetCode daily challenge for the bot and any app that wants it.
router.get('/api/daily', async (req, res) => {
    try {
        const challenge = await fetchDailyChallenge();

        if (!challenge) {
            return res.status(404).json({
                success: false,
                message: 'Daily challenge is not available right now.'
            });
        }

        return res.status(200).json({
            success: true,
            date: challenge.date,
            data: challenge,
            question: challenge
        });
    } catch (error) {
        console.error('Error fetching daily challenge:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve the daily challenge from LeetCode',
            error: error.message
        });
    }
});

// Pattern-based request endpoints. These are intentionally grouped together because they
// all serve the same business function: returning problems for a LeetCode topic/tag.
router.get('/api/problems', handlePatternRequest);
router.get('/api/problems/:pattern', handlePatternRequest);
router.get('/api/problems/:topic', handlePatternRequest);
router.post('/api/problems', handlePatternRequest);

module.exports = router;
