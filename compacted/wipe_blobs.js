// Direct Netlify Blobs wipe script
const { getStore } = require('@netlify/blobs');

async function wipeData() {
  const cfg = {
    name: 'mcipro-data',
    siteID: '27e7a460-3f3a-4be4-ba66-2ed82ccc5c8f',
    token: process.env.NETLIFY_ACCESS_TOKEN || 'nfp_yWrPsQp3sm9KvYiEa2T5moqDGon13gTLbb5e'
  };

  const store = getStore(cfg);

  const cleanStorage = {
    bookings: [],
    version: 0,
    updatedAt: Date.now()
  };

  await store.setJSON('storage', cleanStorage);
  console.log('✅ Wiped all bookings!');
  console.log('New state:', cleanStorage);
}

wipeData().catch(console.error);
