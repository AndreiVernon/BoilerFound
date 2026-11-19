const app = document.querySelector('#app');

const state = {
  screen: 'home',
  photoName: '',
  photoFile: null,
  foundLocation: '',
  dropLocation: '',
  description: '',
  question: '',
  reportId: null,
  submitting: false,
};

const button = (label, destination, style = 'btn-gold', extra = '') =>
  `<button class="btn ${style} ${extra}" data-go="${destination}">${label}</button>`;
const page = (content, className = '') => `<section class="page ${className}">${content}</section>`;

function render() {
  const screens = {
    home: () => page(`<div class="center-state"><span class="eyebrow">BoilerFound · Purdue community</span><h1 style="margin-top:12px">Help reunite someone with what they lost.</h1><p class="lede">Found an item on campus? Share a few details so its owner can find it.</p>${button('Report a found item', 'found-choice', 'btn-gold btn-block')}</div>`),
    'found-choice': () => page(`<div class="center-state"><button class="back-link" data-go="home">← Back</button><span class="eyebrow">Found item report</span><h1 style="margin-top:12px">What did you find?</h1><p class="lede">Wallets, IDs and payment cards are handled by Purdue Police, so we don’t list them here.</p><div class="notice warning" style="text-align:left"><strong>For everyone’s safety, sensitive items go straight to the police.</strong>Hand the item to Purdue Police, or ask a building front desk to pass it on.</div><div class="stack" style="max-width:420px;margin:20px auto 0">${button('Wallet, ID or payment card', 'sensitive', 'btn-outline btn-block')}${button('Something else', 'found', 'btn-gold btn-block')}</div></div>`),
    sensitive: () => page(`<div class="center-state"><button class="back-link" data-go="found-choice">← Back</button><div class="state-icon">ⓘ</div><h1>Take it to Purdue Police</h1><p class="lede">Wallets, IDs and payment cards are handled by Purdue Police.</p><div class="card" style="text-align:left"><h3 class="card-title" style="font-size:19px">A few helpful steps</h3><ol class="steps-list"><li>Hand the item to Purdue Police, or ask a building front desk to pass it on.</li><li>Don’t post photos of it online.</li></ol></div>${button('Done', 'home', 'btn-dark btn-block')}</div>`),
    found: () => page(`<div class="app-layout"><aside class="side-note"><span class="eyebrow">Found item report</span><p>Help its owner find it.</p><small>Keep identifying details private. The owner sees the handoff location after the item is claimed.</small></aside><div class="form-card"><button class="back-link" data-go="found-choice">← Back</button><div class="card"><div class="stepper"><span class="done"></span><span></span></div><h1 class="card-title">Report a found item</h1><p class="card-subtitle">Add a photo and where you found it. Other details are optional.</p><form id="found-report"><div class="field"><label for="photo">Photo <span style="color:#9b5c46">· Required</span></label><label class="upload"><span class="upload-icon">▧</span><strong>${escapeHtml(state.photoName || 'Take or upload a photo')}</strong><span>${state.photoName ? 'Photo selected' : 'Helps the owner recognize their item'}</span><input id="photo" name="photo" type="file" accept="image/*" ${state.photoFile ? '' : 'required'} class="hidden"></label></div><div class="field"><label for="found-location">Where did you find it?</label><input id="found-location" name="foundLocation" class="input" required maxlength="150" placeholder="e.g. Lawson, room 1142" value="${escapeHtml(state.foundLocation)}"></div><div class="field"><label for="drop-location">Where are you leaving it?</label><input id="drop-location" name="dropLocation" class="input" maxlength="150" placeholder="e.g. Lawson front desk" value="${escapeHtml(state.dropLocation)}"></div><div class="field"><label for="description">Description (optional)</label><textarea id="description" name="description" class="textarea" maxlength="1000" placeholder="Color, brand, unique details…">${escapeHtml(state.description)}</textarea></div><div class="field"><label for="question">Question only the owner can answer (optional)</label><input id="question" name="question" class="input" maxlength="300" placeholder="e.g. What’s written on the inside tag?" value="${escapeHtml(state.question)}"></div><p class="field-hint">The owner sees the handoff location only after they claim the item.</p><p id="submit-error" class="field-hint" role="alert"></p><button class="btn btn-gold btn-block" style="margin-top:18px" ${state.submitting ? 'disabled' : ''}>${state.submitting ? 'Submitting report…' : 'Submit report'}</button></form></div></div></div>`),
    'found-success': () => page(`<div class="complete"><div class="badge-big">✓</div><h1>Thank you!</h1><p class="lede">Your report has been submitted. Please leave the item here:</p><div class="card pickup-card"><div class="notice-title">${state.dropLocation ? 'Leave it at' : 'Found at'}</div><h2>${escapeHtml(state.dropLocation || state.foundLocation)}</h2><div class="info-row"><span class="info-icon">⌖</span><div><b>FOUND AT</b><span>${escapeHtml(state.foundLocation)}</span></div></div><div class="info-row"><span class="info-icon">✓</span><div><b>STATUS</b><span>Available · Demo report #${state.reportId}</span></div></div></div><p class="field-hint">This prototype submits report details to a demo API. Photo contents are not uploaded.</p>${button('Back to home', 'home', 'btn-dark btn-block')}</div>`),
  };
  app.innerHTML = (screens[state.screen] || screens.home)();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function go(screen) {
  state.screen = screen;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitReport(form) {
  if (state.submitting) return;
  const data = new FormData(form);
  const location = String(data.get('foundLocation') || '').trim();
  const photo = data.get('photo')?.size ? data.get('photo') : state.photoFile;
  if (!photo || !location) {
    form.reportValidity();
    return;
  }

  state.foundLocation = location;
  state.dropLocation = String(data.get('dropLocation') || '').trim();
  state.description = String(data.get('description') || '').trim();
  state.question = String(data.get('question') || '').trim();
  state.photoName = photo.name;
  state.photoFile = photo;
  state.submitting = true;
  render();

  try {
    // Assignment demo API: JSONPlaceholder accepts POSTs and returns a mock record.
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Found item report',
        body: JSON.stringify({
          foundLocation: state.foundLocation,
          dropLocation: state.dropLocation,
          description: state.description,
          question: state.question,
          photoName: state.photoName,
        }),
        userId: 1,
      }),
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const report = await response.json();
    state.reportId = report.id;
    state.submitting = false;
    go('found-success');
  } catch {
    state.submitting = false;
    render();
    const error = document.querySelector('#submit-error');
    if (error) error.textContent = 'The demo API could not be reached. Your entries are still here; please try again.';
  }
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-go]');
  if (control) {
    event.preventDefault();
    go(control.dataset.go);
  }
});

document.addEventListener('change', event => {
  if (!event.target.matches('#photo')) return;
  state.photoFile = event.target.files?.[0] || null;
  state.photoName = state.photoFile?.name || '';
  render();
});

document.addEventListener('input', event => {
  const field = event.target;
  if (field.name === 'foundLocation') state.foundLocation = field.value;
  if (field.name === 'dropLocation') state.dropLocation = field.value;
  if (field.name === 'description') state.description = field.value;
  if (field.name === 'question') state.question = field.value;
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'found-report') return;
  event.preventDefault();
  submitReport(event.target);
});

render();
