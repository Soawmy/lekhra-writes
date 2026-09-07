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
  var caseStudyForm = document.getElementById('case-study-form');
  var caseStudyMsg = document.getElementById('case-study-msg');
  var caseStudyList = document.getElementById('case-study-list');
  var emailList = document.getElementById('email-list');
  var newEmailInput = document.getElementById('new-email-input');
  var addEmailBtn = document.getElementById('add-email-btn');
  var emailMsg = document.getElementById('email-msg');

  var currentEmails = [];

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
    loadCaseStudies();
  }

  function renderEmailList(){
    emailList.innerHTML = '';
    if(!currentEmails.length){
      emailList.innerHTML = '<p class="empty-note" style="padding:6px 0; text-align:left;">No recipient emails yet — submissions will fail until you add one.</p>';
      return;
    }
    currentEmails.forEach(function(email){
      var row = document.createElement('div');
      row.className = 'email-item';
      row.innerHTML = '<span>' + esc(email) + '</span><button type="button" class="delete-btn">Remove</button>';
      row.querySelector('.delete-btn').addEventListener('click', function(){
        currentEmails = currentEmails.filter(function(e){ return e !== email; });
        saveEmails();
      });
      emailList.appendChild(row);
    });
  }

  function saveEmails(){
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: currentEmails })
    }).then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        if(!result.ok){
          emailMsg.textContent = (result.body && result.body.error) || 'Could not save.';
          emailMsg.className = 'form-msg is-error';
          return;
        }
        emailMsg.textContent = 'Saved.';
        emailMsg.className = 'form-msg is-ok';
        renderEmailList();
      })
      .catch(function(){
        emailMsg.textContent = 'Could not reach the server.';
        emailMsg.className = 'form-msg is-error';
      });
  }

  addEmailBtn.addEventListener('click', function(){
    var value = (newEmailInput.value || '').trim();
    emailMsg.textContent = '';
    emailMsg.className = 'form-msg';
    if(!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){
      emailMsg.textContent = 'Enter a valid email address.';
      emailMsg.className = 'form-msg is-error';
      return;
    }
    if(currentEmails.indexOf(value) !== -1){
      emailMsg.textContent = 'That address is already on the list.';
      emailMsg.className = 'form-msg is-error';
      return;
    }
    currentEmails.push(value);
    newEmailInput.value = '';
    saveEmails();
  });

  function loadSettings(){
    fetch('/api/admin/settings').then(function(res){
      if(res.status === 401){ showLogin(); return null; }
      return res.json();
    }).then(function(data){
      if(!data) return;
      currentEmails = Array.isArray(data.emails) ? data.emails : [];
      renderEmailList();
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
    fetch('/api/admin/submissions').then(function(res){
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

  function renderCaseStudy(item){
    var wrap = document.createElement('div');
    wrap.className = 'cs-item';
    wrap.innerHTML =
      '<div><div class="cs-item-title">' + esc(item.title) + '</div>' +
      '<div class="cs-item-cat">' + esc(item.category) + '</div></div>' +
      '<button type="button" class="delete-btn" data-id="' + esc(item.id) + '">Remove</button>';
    wrap.querySelector('.delete-btn').addEventListener('click', function(){
      if(!confirm('Remove "' + item.title + '" from the Work page?')) return;
      fetch('/api/admin/case-studies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      }).then(function(){ loadCaseStudies(); });
    });
    return wrap;
  }

  function loadCaseStudies(){
    caseStudyList.innerHTML = '<p class="empty-note">Loading&hellip;</p>';
    fetch('/api/admin/case-studies').then(function(res){
      if(res.status === 401){ showLogin(); return null; }
      return res.json();
    }).then(function(data){
      if(!data) return;
      caseStudyList.innerHTML = '';
      if(!data.items || !data.items.length){
        caseStudyList.innerHTML = '<p class="empty-note">No case studies added yet.</p>';
        return;
      }
      data.items.forEach(function(item){ caseStudyList.appendChild(renderCaseStudy(item)); });
    }).catch(function(){
      caseStudyList.innerHTML = '<p class="empty-note">Couldn\'t load case studies right now.</p>';
    });
  }

  caseStudyForm.addEventListener('submit', function(e){
    e.preventDefault();
    caseStudyMsg.textContent = '';
    caseStudyMsg.className = 'form-msg';
    var data = new FormData(caseStudyForm);
    var payload = {
      title: data.get('title'), category: data.get('category'),
      challenge: data.get('challenge'), whatWeDid: data.get('whatWeDid'),
      outcome: data.get('outcome'), link: data.get('link')
    };
    fetch('/api/admin/case-studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        if(!result.ok){
          caseStudyMsg.textContent = (result.body && result.body.error) || 'Could not add this project.';
          caseStudyMsg.className = 'form-msg is-error';
          return;
        }
        caseStudyMsg.textContent = 'Added — it\'s live on the Work page now.';
        caseStudyMsg.className = 'form-msg is-ok';
        caseStudyForm.reset();
        loadCaseStudies();
      })
      .catch(function(){
        caseStudyMsg.textContent = 'Could not reach the server.';
        caseStudyMsg.className = 'form-msg is-error';
      });
  });

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    loginMsg.textContent = '';
    loginMsg.className = 'form-msg';
    var data = new FormData(loginForm);
    fetch('/api/admin/login', {
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
    var payload = { username: data.get('username') };
    if(data.get('password')) payload.password = data.get('password');

    fetch('/api/admin/settings', {
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
    fetch('/api/admin/logout', { method: 'POST' }).then(function(){ showLogin(); });
  });

  // on load, see if there's already a valid session
  fetch('/api/admin/settings').then(function(res){
    if(res.status === 401){ showLogin(); } else { showDashboard(); }
  }).catch(function(){ showLogin(); });

})();
