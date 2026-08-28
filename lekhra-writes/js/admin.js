/* ==========================================================================
   LEKHRA WRITES — Admin dashboard
   ========================================================================== */
(function(){
  "use strict";

  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginMsg = document.getElementById('login-msg');
  var settingsForm = document.getElementById('settings-form');
  var settingsMsg = document.getElementById('settings-msg');
  var submissionsList = document.getElementById('submissions-list');
  var logoutBtn = document.getElementById('logout-btn');

  var FIELD_LABELS = {
    services: 'Services requested',
    website_type: 'Type of website', website_purpose: 'Purpose', website_pages: 'Number of pages', website_branding: 'Existing branding',
    content_type: 'Content type', content_qty: 'Quantity', content_format: 'Format', content_audience: 'Target audience',
    script_format: 'Script format', script_length: 'Approximate length', script_genre: 'Genre', script_concept: 'Existing concept',
    video_type: 'Video type', video_scope: 'Video scope',
    design_type: 'Design type', design_scope: 'Design scope',
    social_type: 'Social content type', social_scope: 'Social scope',
    marketing_type: 'Marketing type', marketing_scope: 'Marketing scope',
    other_desc: 'What they want to create',
    references: 'References',
    name: 'Name', contact: 'Email / phone', budget: 'Budget range', final_timeline: 'Timeline', details: 'Additional details'
  };
  var FIELD_ORDER = Object.keys(FIELD_LABELS);

  function esc(v){
    var d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  }

  function showLogin(){
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
  }

  function showDashboard(){
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    loadSettings();
    loadSubmissions();
  }

  function loadSettings(){
    fetch('/api/settings').then(function(res){
      if(res.status === 401){ showLogin(); return null; }
      return res.json();
    }).then(function(data){
      if(!data) return;
      settingsForm.toEmail.value = data.toEmail || '';
      settingsForm.username.value = data.username || '';
    }).catch(function(){});
  }

  function renderSubmission(item){
    var wrap = document.createElement('div');
    wrap.className = 'sub-item';

    var when = item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '';
    var top = '<div class="sub-top"><span class="services">' + esc(item.services || 'Unspecified') + '</span><time>' + esc(when) + '</time></div>';
    var basics =
      '<div class="sub-line"><b>Name</b>' + esc(item.name || '&mdash;') + '</div>' +
      '<div class="sub-line"><b>Contact</b>' + esc(item.contact || '&mdash;') + '</div>' +
      (item.budget ? '<div class="sub-line"><b>Budget</b>' + esc(item.budget) + '</div>' : '') +
      (item.final_timeline ? '<div class="sub-line"><b>Timeline</b>' + esc(item.final_timeline) + '</div>' : '');

    var allRows = FIELD_ORDER
      .filter(function(k){ return item[k]; })
      .map(function(k){ return '<b>' + esc(FIELD_LABELS[k]) + '</b><span>' + esc(item[k]) + '</span>'; })
      .join('');

    wrap.innerHTML = top + basics +
      '<details><summary>Show full brief</summary><div class="all-fields">' + allRows + '</div></details>';

    return wrap;
  }

  function loadSubmissions(){
    submissionsList.innerHTML = '<p class="empty-note">Loading…</p>';
    fetch('/api/submissions').then(function(res){
      if(res.status === 401){ showLogin(); return null; }
      return res.json();
    }).then(function(data){
      if(!data) return;
      submissionsList.innerHTML = '';
      if(!data.items || !data.items.length){
        submissionsList.innerHTML = '<p class="empty-note">No submissions yet — they\'ll show up here as soon as someone sends a brief.</p>';
        return;
      }
      data.items.forEach(function(item){ submissionsList.appendChild(renderSubmission(item)); });
    }).catch(function(){
      submissionsList.innerHTML = '<p class="empty-note">Couldn\'t load submissions right now.</p>';
    });
  }

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    loginMsg.textContent = '';
    loginMsg.className = 'form-msg';
    var data = new FormData(loginForm);
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.get('username'), password: data.get('password') })
    }).then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        if(!result.ok){
          loginMsg.textContent = (result.body && result.body.error) || 'Login failed.';
          loginMsg.className = 'form-msg is-error';
          return;
        }
        loginForm.reset();
        showDashboard();
      })
      .catch(function(){
        loginMsg.textContent = 'Could not reach the server.';
        loginMsg.className = 'form-msg is-error';
      });
  });

  settingsForm.addEventListener('submit', function(e){
    e.preventDefault();
    settingsMsg.textContent = '';
    settingsMsg.className = 'form-msg';
    var data = new FormData(settingsForm);
    var payload = { toEmail: data.get('toEmail'), username: data.get('username') };
    if(data.get('password')) payload.password = data.get('password');

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        if(!result.ok){
          settingsMsg.textContent = (result.body && result.body.error) || 'Could not save changes.';
          settingsMsg.className = 'form-msg is-error';
          return;
        }
        settingsMsg.textContent = 'Saved.';
        settingsMsg.className = 'form-msg is-ok';
        settingsForm.password.value = '';
      })
      .catch(function(){
        settingsMsg.textContent = 'Could not reach the server.';
        settingsMsg.className = 'form-msg is-error';
      });
  });

  logoutBtn.addEventListener('click', function(){
    fetch('/api/logout', { method: 'POST' }).then(function(){ showLogin(); });
  });

  // on load, see if there's already a valid session
  fetch('/api/settings').then(function(res){
    if(res.status === 401){ showLogin(); } else { showDashboard(); }
  }).catch(function(){ showLogin(); });

})();
