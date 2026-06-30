// netlify/functions/campaign.js
// Campaign save/load using Netlify Blobs for persistence

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const store = getStore({ name: "campaigns", consistency: "strong" });
  const { httpMethod, queryStringParameters, body } = event;
  const id = queryStringParameters?.id;

  try {
    if (httpMethod === "GET" && id) {
      const data = await store.get(id, { type: "json" });
      if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: "Campaign not found" }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (httpMethod === "GET") {
      const { blobs } = await store.list();
      const campaigns = blobs.map(b => ({ id: b.key, etag: b.etag }));
      return { statusCode: 200, headers, body: JSON.stringify(campaigns) };
    }

    if (httpMethod === "POST") {
      const parsed = JSON.parse(body);
      const campaignId = parsed.id || `campaign_${Date.now()}`;
      await store.setJSON(campaignId, { ...parsed, id: campaignId, updatedAt: new Date().toISOString() });
      return { statusCode: 200, headers, body: JSON.stringify({ id: campaignId, saved: true }) };
    }

    if (httpMethod === "DELETE" && id) {
      await store.delete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("Campaign store error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
