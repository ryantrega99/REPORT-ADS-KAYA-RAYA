import https from 'https';

const options = {
  hostname: 'googleads.googleapis.com',
  port: 443,
  path: '/v22/customers/4682459621/googleAds:search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, res => {
  console.log('statusCode:', res.statusCode);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', e => {
  console.error(e);
});

req.write(JSON.stringify({ query: 'SELECT campaign.id FROM campaign LIMIT 1' }));
req.end();
