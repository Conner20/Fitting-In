export default {
  async scheduled(_controller, env, context) {
    context.waitUntil(runSync(env));
  },
};

async function runSync(env) {
  const response = await fetch(env.FITTING_IN_SYNC_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (!response.ok) {
    throw new Error(`Fitting In metrics sync failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }
  return new Response("Metrics synced", { status: 200 });
}
