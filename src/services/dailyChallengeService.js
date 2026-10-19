// Daily challenge fetcher.
// This is dedicated to the LeetCode "question of the day" endpoint and keeps that
// integration isolated from the pattern-based search logic.
const { postGraphQL } = require('./leetcodeClient');

async function fetchDailyChallenge() {
    // We request the current daily challenge from LeetCode's public GraphQL API.
    // The response includes the date, link, and the question metadata used by the bot.
    const payload = {
        query: `
            query questionOfToday {
                activeDailyCodingChallengeQuestion {
                    date
                    userStatus
                    link
                    question {
                        questionId
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
        `
    };

    const jsonResponse = await postGraphQL(payload);
    const challengeData = jsonResponse?.data?.activeDailyCodingChallengeQuestion;

    if (!challengeData || !challengeData.question) {
        // This can happen transiently when LeetCode does not yet return a daily challenge
        // or when the upstream API structure changes unexpectedly.
        return null;
    }

    return {
        date: challengeData.date,
        link: challengeData.link,
        userStatus: challengeData.userStatus,
        ...challengeData.question
    };
}

module.exports = {
    fetchDailyChallenge
};
