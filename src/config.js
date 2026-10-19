// Central configuration for the wrapper service.
// Keeping values here gives one place to change runtime settings, ports,
// and external service URLs without touching the business logic.
const PORT = Number(process.env.PORT) || 3000;
const LEETCODE_GRAPHQL_URL = process.env.LEETCODE_GRAPHQL_URL || 'https://leetcode.com/graphql';

module.exports = {
  PORT,
  LEETCODE_GRAPHQL_URL
};
