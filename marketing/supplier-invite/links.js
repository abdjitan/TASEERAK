// Shared link helpers. With Taseerak.com connected (links.json domain_live=true) every working link
// and QR code points at https://taseerak.com; otherwise at the Vercel address (live_site).
const fs = require('fs');
const path = require('path');

const links = JSON.parse(fs.readFileSync(path.join(__dirname, 'links.json'), 'utf8'));
// Working links use the lowercase host (https://taseerak.com); "Taseerak.com" is display text.
const base = links.domain_live ? links.site.toLowerCase() : links.live_site;
const display = links.site.replace(/^https?:\/\//, '');
const inviteUrl = lang => `${base}/invite${lang ? `?lang=${lang}` : ''}`;

module.exports = { links, base, display, inviteUrl };
