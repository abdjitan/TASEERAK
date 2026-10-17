// Shared link helpers. Until Taseerak.com is connected (links.json domain_live=false) every working
// link and QR code points at the live Vercel address; "Taseerak.com" stays as display text only.
const fs = require('fs');
const path = require('path');

const links = JSON.parse(fs.readFileSync(path.join(__dirname, 'links.json'), 'utf8'));
const base = links.domain_live ? links.site : links.live_site;
const display = links.site.replace(/^https?:\/\//, '');
const inviteUrl = lang => `${base}/invite${lang ? `?lang=${lang}` : ''}`;

module.exports = { links, base, display, inviteUrl };
