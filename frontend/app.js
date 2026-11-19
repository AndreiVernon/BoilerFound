const API_BASE = 'http://127.0.0.1:8000';
// Public placeholder token seeded by the backend until real sign-in exists (see backend/README.md).
const DEV_AUTH_TOKEN = 'dev-token-alice';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const dismissedMatches = new Set();
const imageCache = new Map();
let currentRender = 0;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- API ----------

async function api(path, { method = 'GET', json, form } = {}) {
  const headers = { Authorization: `Bearer ${DEV_AUTH_TOKEN}` };
  let body = form;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  let response;
  try {
    response = await fetch(API_BASE + path, { method, headers, body });
  } catch {
    throw new ApiError(0, 'Could not reach the BoilerFound server. Check that it is running, then try again.');
  }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return response.json();
}

async function errorMessage(response) {
  const messages = {
    401: 'The server could not verify your account.',
    413: 'That photo is larger than 10 MB. Please choose a smaller one.',
    415: 'The photo must be a JPEG or PNG image.',
    422: 'Some details are missing or too long. Please check the form.',
  };
  if (messages[response.status]) return messages[response.status];
  try {
    const { detail } = await response.json();
    if (typeof detail === 'string') return detail;
  } catch {
    // Non-JSON error bodies fall through to the generic message.
  }
  return `Something went wrong (error ${response.status}). Please try again.`;
}

function imageUrl(path) {
  if (!imageCache.has(path)) {
    const request = fetch(API_BASE + path, { headers: { Authorization: `Bearer ${DEV_AUTH_TOKEN}` } })
      .then(response => {
        if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
        return response.blob();
      })
      .then(blob => URL.createObjectURL(blob));
    request.catch(() => imageCache.delete(path));
    imageCache.set(path, request);
  }
  return imageCache.get(path);
}

// The image endpoints need the Authorization header, which a plain <img src> can't send.
function loadImages(root) {
  for (const img of root.querySelectorAll('img[data-src]')) {
    imageUrl(img.dataset.src)
      .then(url => { img.src = url; })
      .catch(() => { img.alt = 'Photo unavailable'; });
  }
}

// ---------- Helpers ----------

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));
}

function timeAgo(isoDate) {
  const seconds = (new Date(isoDate) - Date.now()) / 1000;
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function pageHeader({ back, eyebrow, title, lede }) {
  return `
    ${back ? `<a class="back-link" href="${back.href}">← ${back.label}</a>` : ''}
    <div class="page-header">
      ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}
      <h1>${title}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
    </div>`;
}

function statusBadge(report) {
  if (report.status === 'closed') return '<span class="badge grey">Closed</span>';
  if (report.pickup_location) return '<span class="badge green">Ready for pickup</span>';
  return '<span class="badge">Searching</span>';
}

function visibleMatches(report, matches) {
  return matches.filter(match => !dismissedMatches.has(`${report.id}:${match.id}`));
}

// ---------- Pages ----------

function homePage() {
  return `
    <section class="hero">
      <div>
        <span class="eyebrow">Purdue lost and found</span>
        <h1>Lost something on campus?</h1>
        <p class="lede">Tell us what you lost and where you last saw it. We compare your report with items other Boilermakers have turned in and show you anything that looks like yours.</p>
        <div class="actions">
          <a class="btn btn-primary" href="#/report">Report a lost item</a>
          <a class="btn btn-outline" href="#/reports">My reports</a>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">How it works</h2>
        <ol class="steps">
          <li><span class="step-num">1</span><div><h3>Describe what you lost</h3><p>Add a description, where you last saw it, and a photo if you have one.</p></div></li>
          <li><span class="step-num">2</span><div><h3>Review possible matches</h3><p>Compare photos and details of found items with yours.</p></div></li>
          <li><span class="step-num">3</span><div><h3>Verify and pick it up</h3><p>Answer the finder's question to see where to collect your item.</p></div></li>
        </ol>
      </div>
    </section>`;
}

function reportFields(report = {}) {
  return `
    <div class="field">
      <label for="description">Description</label>
      <textarea class="textarea" id="description" name="description" required minlength="5" maxlength="1000"
        placeholder="e.g. Blue Hydro Flask with a Purdue sticker on the side">${escapeHtml(report.description)}</textarea>
    </div>
    <div class="field">
      <label for="location">Where did you last see it?</label>
      <input class="input" id="location" name="location" required maxlength="150"
        placeholder="e.g. WALC, next to the printers" value="${escapeHtml(report.location)}">
    </div>`;
}

function newReportPage() {
  return `
    ${pageHeader({
      back: { href: '#/', label: 'Home' },
      eyebrow: 'Lost item report',
      title: 'What did you lose?',
      lede: 'The more detail you give, the better we can match it with items that have been found.',
    })}
    <div class="split">
      <form class="card" data-form="create" novalidate>
        ${reportFields()}
        <div class="field">
          <label for="photo">Photo <span class="optional">(optional)</span></label>
          <label class="upload" for="photo">
            <span class="upload-preview" aria-hidden="true">+</span>
            <span><strong data-photo-name>Add a photo</strong><span class="hint">JPEG or PNG, up to 10 MB</span></span>
            <input type="file" id="photo" name="image" accept="image/jpeg,image/png">
          </label>
        </div>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit">Submit report</button>
      </form>
      <aside class="card soft">
        <h3>Tips for a good match</h3>
        <ul class="tips">
          <li>Mention the color, size, material, and anything unique, like stickers or engravings.</li>
          <li>Name the building and the spot, e.g. “WALC, next to the printers”.</li>
          <li>A photo of your item, or one like it, helps match it with photos of found items.</li>
        </ul>
      </aside>
    </div>`;
}

async function reportsPage() {
  const reports = await api('/lost-reports');
  const header = pageHeader({ title: 'My reports', lede: 'Track your lost item reports and any matches.' });
  if (!reports.length) {
    return `${header}
      <div class="card empty">
        <p class="lede">You haven't reported anything yet.</p>
        <div class="actions"><a class="btn btn-primary" href="#/report">Report a lost item</a></div>
      </div>`;
  }
  const rows = reports.map(report => `
    <a class="report-row" href="#/reports/${report.id}">
      ${report.image_url ? `<img class="thumb" data-src="${report.image_url}" alt="">` : '<span class="thumb"></span>'}
      <div>
        <h3>${escapeHtml(report.description)}</h3>
        <p class="muted">${escapeHtml(report.location)} · ${formatDate(report.created_at)}</p>
      </div>
      ${statusBadge(report)}
    </a>`).join('');
  return `${header}<div class="report-list">${rows}</div>`;
}

async function reportDetailPage(reportId) {
  const [report, allMatches] = await Promise.all([
    api(`/lost-reports/${reportId}`),
    api(`/lost-reports/${reportId}/matches`),
  ]);
  const matches = visibleMatches(report, allMatches);
  const back = { href: '#/reports', label: 'My reports' };
  let header;
  let main;

  if (report.status === 'closed') {
    header = pageHeader({
      back, eyebrow: 'Lost item report', title: 'Report closed',
      lede: report.pickup_location ? 'Glad you got it back. Matching has stopped for this report.' : 'Matching has stopped for this report.',
    });
    main = `
      <div class="card">
        <div class="state-icon green">✓</div>
        <p>You can reopen the report if you still need to find this item.</p>
        <div class="actions">
          <button class="btn btn-outline" data-action="reopen" data-report="${report.id}">Reopen report</button>
          <a class="btn btn-primary" href="#/report">Report another item</a>
        </div>
      </div>`;
  } else if (report.pickup_location) {
    header = pageHeader({
      back, eyebrow: 'Ready for pickup', title: 'It’s yours!',
      lede: 'Your answer matched the finder’s question. Here’s where to pick up your item.',
    });
    main = `
      <div class="card">
        <dl class="details">
          <div><dt>Pickup location</dt><dd class="pickup-location">${escapeHtml(report.pickup_location)}</dd></div>
          <div><dt>Bring</dt><dd>Your Purdue ID</dd></div>
        </dl>
        <div class="actions">
          <a class="btn btn-outline" href="https://www.google.com/maps/search/${encodeURIComponent(`${report.pickup_location} Purdue University`)}" target="_blank" rel="noreferrer">Open in Maps ↗</a>
          <button class="btn btn-dark" data-action="close" data-report="${report.id}">I picked it up</button>
        </div>
        <p class="hint below-actions">Marking it picked up closes your report.</p>
      </div>`;
  } else if (matches.length) {
    header = pageHeader({
      back, eyebrow: `${matches.length} possible ${matches.length === 1 ? 'match' : 'matches'}`, title: 'Is this yours?',
      lede: 'These found items look like what you described. Compare the photo and details before claiming one.',
    });
    main = `<div class="stack">${matches.map(match => matchCard(report, match)).join('')}</div>`;
  } else {
    header = pageHeader({
      back, eyebrow: 'Lost item report', title: 'Looking for matches',
      lede: 'Nothing matches your report yet. Every new found item is compared with it, so check back soon.',
    });
    main = `
      <div class="card searching">
        <div class="state-icon">⌕</div>
        <p>Adding more detail to your description can help us find a match.</p>
        <div class="actions">
          <button class="btn btn-primary" data-action="refresh">Check again</button>
          <a class="btn btn-outline" href="#/reports/${report.id}/edit">Edit report</a>
        </div>
      </div>`;
  }
  return `${header}<div class="split">${main}${reportSummary(report)}</div>`;
}

function matchCard(report, match) {
  return `
    <article class="card match-card">
      <img class="match-photo" data-src="${match.image_url}" alt="Photo of the found item">
      <div>
        <span class="badge">Possible match</span>
        <h2 class="match-title">${escapeHtml(match.description || 'Found item')}</h2>
        <dl class="details">
          <div><dt>Found at</dt><dd>${escapeHtml(match.location)}</dd></div>
          <div><dt>Turned in</dt><dd>${timeAgo(match.created_at)}</dd></div>
        </dl>
        <div class="actions">
          <button class="btn btn-outline" data-action="dismiss" data-report="${report.id}" data-match="${match.id}">Not mine</button>
          <a class="btn btn-primary" href="#/reports/${report.id}/claim/${match.id}">This is mine</a>
        </div>
      </div>
    </article>`;
}

function reportSummary(report) {
  const actions = report.status === 'open' && !report.pickup_location
    ? `<div class="actions">
        <a class="btn btn-outline" href="#/reports/${report.id}/edit">Edit</a>
        <button class="btn btn-outline" data-action="close" data-report="${report.id}">Close report</button>
      </div>`
    : '';
  return `
    <aside class="card summary">
      ${report.image_url ? `<img class="summary-photo" data-src="${report.image_url}" alt="Your photo of the lost item">` : ''}
      <div><span class="eyebrow">Your report</span>${statusBadge(report)}</div>
      <dl class="details">
        <div><dt>Description</dt><dd>${escapeHtml(report.description)}</dd></div>
        <div><dt>Last seen</dt><dd>${escapeHtml(report.location)}</dd></div>
        <div><dt>Reported</dt><dd>${formatDate(report.created_at)}</dd></div>
      </dl>
      ${actions}
    </aside>`;
}

async function editReportPage(reportId) {
  const report = await api(`/lost-reports/${reportId}`);
  return `
    ${pageHeader({
      back: { href: `#/reports/${report.id}`, label: 'Back to report' },
      eyebrow: 'Lost item report',
      title: 'Edit report',
      lede: 'Matching uses your latest description and location.',
    })}
    <div class="split">
      <form class="card" data-form="edit" data-report="${report.id}" novalidate>
        ${reportFields(report)}
        <p class="form-error" role="alert"></p>
        <div class="actions">
          <a class="btn btn-outline" href="#/reports/${report.id}">Cancel</a>
          <button class="btn btn-primary" type="submit">Save changes</button>
        </div>
      </form>
    </div>`;
}

async function claimPage(reportId, foundReportId) {
  const [report, matches] = await Promise.all([
    api(`/lost-reports/${reportId}`),
    api(`/lost-reports/${reportId}/matches`),
  ]);
  const match = matches.find(item => item.id === foundReportId);
  const back = { href: `#/reports/${report.id}`, label: 'Back to matches' };
  if (!match) {
    return `
      ${pageHeader({ back, title: 'This item is no longer available', lede: 'It may have been claimed already, or your report has changed.' })}`;
  }
  const question = match.question
    ? `<div class="question-box"><strong>Question from the finder</strong><p>${escapeHtml(match.question)}</p></div>
       <div class="field">
         <label for="answer">Your answer</label>
         <input class="input" id="answer" name="answer" required maxlength="300" autocomplete="off" placeholder="Type your answer">
       </div>`
    : '<p class="lede no-question">The finder didn’t leave a question. Desk staff will check your Purdue ID when you pick it up.</p>';
  return `
    ${pageHeader({
      back,
      eyebrow: 'Verify it’s yours',
      title: match.question ? 'Answer the finder’s question' : 'Claim this item',
      lede: 'This makes sure the item goes back to its real owner. You’ll see the pickup location once it’s confirmed.',
    })}
    <div class="split">
      <form class="card" data-form="claim" data-report="${report.id}" data-match="${match.id}" novalidate>
        ${question}
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit">Claim this item</button>
      </form>
      <aside class="card summary">
        <img class="summary-photo" data-src="${match.image_url}" alt="Photo of the found item">
        <dl class="details">
          <div><dt>Found item</dt><dd>${escapeHtml(match.description || 'Found item')}</dd></div>
          <div><dt>Found at</dt><dd>${escapeHtml(match.location)}</dd></div>
        </dl>
      </aside>
    </div>`;
}

function errorPage(error) {
  return `
    <div class="card error-state">
      <h2>Something went wrong</h2>
      <p class="muted">${escapeHtml(error.message)}</p>
      <button class="btn btn-outline" data-action="refresh">Try again</button>
    </div>`;
}

function notFoundPage() {
  return `
    <div class="card error-state">
      <h2>Page not found</h2>
      <a class="btn btn-outline" href="#/">Go home</a>
    </div>`;
}

// ---------- Routing ----------

const routes = [
  [/^\/$/, homePage],
  [/^\/report$/, newReportPage],
  [/^\/reports$/, reportsPage],
  [/^\/reports\/([\w-]+)$/, reportDetailPage],
  [/^\/reports\/([\w-]+)\/edit$/, editReportPage],
  [/^\/reports\/([\w-]+)\/claim\/([\w-]+)$/, claimPage],
];

async function render() {
  const path = location.hash.slice(1) || '/';
  const renderId = ++currentRender;
  for (const link of document.querySelectorAll('[data-nav]')) {
    const section = link.dataset.nav === 'report' ? path === '/report' : path.startsWith('/reports');
    link.classList.toggle('active', section);
  }
  let html;
  try {
    const route = routes.find(([pattern]) => pattern.test(path));
    if (!route) {
      html = notFoundPage();
    } else {
      const [pattern, page] = route;
      const params = path.match(pattern).slice(1);
      app.innerHTML = '<p class="loading muted">Loading…</p>';
      html = await page(...params);
    }
  } catch (error) {
    html = errorPage(error);
  }
  if (renderId !== currentRender) return;
  app.innerHTML = html;
  loadImages(app);
}

// ---------- Actions and forms ----------

async function setReportStatus(reportId, status, message) {
  try {
    await api(`/lost-reports/${reportId}`, { method: 'PATCH', json: { status } });
    showToast(message);
    render();
  } catch (error) {
    showToast(error.message);
  }
}

const actions = {
  refresh: () => render(),
  dismiss: ({ report, match }) => {
    dismissedMatches.add(`${report}:${match}`);
    showToast('We’ll keep looking for other matches.');
    render();
  },
  close: ({ report }) => setReportStatus(report, 'closed', 'Report closed. Matching has stopped.'),
  reopen: ({ report }) => setReportStatus(report, 'open', 'Report reopened. Matching has resumed.'),
};

function photoProblem(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'The photo must be a JPEG or PNG image.';
  if (file.size > MAX_IMAGE_BYTES) return 'That photo is larger than 10 MB. Please choose a smaller one.';
  return '';
}

function validateReportForm(form) {
  const description = form.description.value.trim();
  const location = form.location.value.trim();
  if (description.length < 5) return 'Please describe the item in at least 5 characters.';
  if (!location) return 'Please say where you last saw it.';
  const photo = form.image?.files[0];
  return photo ? photoProblem(photo) : '';
}

const forms = {
  async create(form) {
    const problem = validateReportForm(form);
    if (problem) throw new Error(problem);
    const data = new FormData(form);
    if (!form.image.files.length) data.delete('image');
    const report = await api('/lost-reports', { method: 'POST', form: data });
    showToast('Report submitted.');
    navigate(`#/reports/${report.id}`);
  },
  async edit(form) {
    const problem = validateReportForm(form);
    if (problem) throw new Error(problem);
    const { report } = form.dataset;
    await api(`/lost-reports/${report}`, {
      method: 'PATCH',
      json: { description: form.description.value, location: form.location.value },
    });
    showToast('Report updated.');
    navigate(`#/reports/${report}`);
  },
  async claim(form) {
    const answer = form.answer?.value.trim() ?? '';
    if (form.answer && !answer) throw new Error('Please enter your answer.');
    const { report, match } = form.dataset;
    try {
      await api(`/lost-reports/${report}/claim`, { method: 'POST', json: { found_report_id: match, answer } });
    } catch (error) {
      if (error.status === 400) throw new Error('That answer doesn’t match. Check the details and try again.');
      throw error;
    }
    showToast('Confirmed! Here’s where to pick it up.');
    navigate(`#/reports/${report}`);
  },
};

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  event.preventDefault();
  actions[control.dataset.action]?.(control.dataset);
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('.form-error');
  if (submit.disabled) return;
  const label = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Please wait…';
  error.textContent = '';
  try {
    await forms[form.dataset.form](form);
  } catch (problem) {
    error.textContent = problem.message;
    submit.disabled = false;
    submit.textContent = label;
  }
});

document.addEventListener('change', event => {
  if (event.target.id !== 'photo') return;
  const file = event.target.files[0];
  const upload = event.target.closest('.upload');
  const preview = upload.querySelector('.upload-preview');
  const error = event.target.form.querySelector('.form-error');
  const problem = file ? photoProblem(file) : '';
  error.textContent = problem;
  upload.querySelector('[data-photo-name]').textContent = file ? file.name : 'Add a photo';
  preview.textContent = file && !problem ? '' : '+';
  preview.style.backgroundImage = file && !problem ? `url("${URL.createObjectURL(file)}")` : '';
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  render();
});

api('/me')
  .then(user => { document.querySelector('#user-name').textContent = `Signed in as ${user.display_name}`; })
  .catch(() => {});

render();
