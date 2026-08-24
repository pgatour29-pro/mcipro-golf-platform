// Returns the caller's IP-derived geography from Vercel's edge headers.
// Called once per login by captureLoginGeo() in index.html. No secrets, no lookups -
// Vercel attaches these headers to every request; x-vercel-ip-city is URI-encoded.
module.exports = (req, res) => {
    const h = (name) => req.headers[name] || null;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
        country: h('x-vercel-ip-country'),
        region: h('x-vercel-ip-country-region'),
        city: h('x-vercel-ip-city') ? decodeURIComponent(h('x-vercel-ip-city')) : null,
        timezone: h('x-vercel-ip-timezone'),
        ip: (h('x-forwarded-for') || '').split(',')[0].trim() || null
    });
};
