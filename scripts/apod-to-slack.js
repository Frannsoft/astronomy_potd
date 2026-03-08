const NASA_API = 'https://api.nasa.gov/planetary/apod';
const DEMO_KEY = 'DEMO_KEY';

async function fetchApod() {
  const url = `${NASA_API}?api_key=${process.env.NASA_API_KEY || DEMO_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NASA API failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function buildSlackPayload(apod) {
  const { title, explanation, url, media_type } = apod;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: title, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: explanation.length > 3000 ? explanation.slice(0, 2997) + '...' : explanation,
      },
    },
  ];

  if (media_type === 'image' && url) {
    blocks.splice(1, 0, {
      type: 'image',
      image_url: url,
      alt_text: title,
    });
  } else if (url) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Video:* <${url}|Watch here>`,
      },
    });
  }

  return {
    text: `${title}\n${explanation.slice(0, 200)}...`,
    blocks,
  };
}

async function postToSlack(payload) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is not set');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${body}`);
  }
}

async function main() {
  try {
    const apod = await fetchApod();
    const payload = buildSlackPayload(apod);
    await postToSlack(payload);
    console.log('APOD posted to Slack successfully');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
