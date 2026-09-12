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

  var socialLinkForm = document.getElementById('social-link-form');
  var socialNameInput = document.getElementById('social-name-input');
  var socialUrlInput = document.getElementById('social-url-input');
  var socialFormMsg = document.getElementById('social-form-msg');
  var socialListMsg = document.getElementById('social-list-msg');
  var socialLinksList = document.getElementById('social-links-list');
  var socialCount = document.getElementById('social-count');
  var socialRestoreDefaultsBtn = document.getElementById('social-restore-defaults-btn');
  var socialPresetChips = document.getElementById('social-preset-chips');

  var currentEmails = [];
  var currentSocialLinks = [];

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

   function fileToCompressedDataUrl(file, maxDim, quality){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function(){ reject(new Error('Could not read that image.')); };
      img.src = e.target.result;
    };
    reader.onerror = function(){ reject(new Error('Could not read that file.')); };
    reader.readAsDataURL(file);
  });
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
    loadDesignGrids();
    loadSocialLinks();
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

    var images = Array.isArray(item.images) && item.images.length > 0 ? item.images.slice() : (item.imageUrl ? [item.imageUrl] : []);
    var coverImg = item.imageUrl || (images[0] || '');

    function renderView(){
      var countBadge = images.length > 1 ? '<span style="font-size:0.75rem; color:var(--gold); margin-left:6px;">(' + images.length + ' images)</span>' : '';
      wrap.innerHTML =
        '<div style="display:flex; gap:14px; align-items:center; flex:1; min-width:0;">' +
          (coverImg ? '<div style="width:54px; height:54px; background:#070709; border:1px solid rgba(241,238,231,0.12); border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:2px;"><img src="' + esc(coverImg) + '" alt="" style="width:100%; height:100%; object-fit:contain;"></div>' : '') +
          '<div style="min-width:0;"><div class="cs-item-title">' + esc(item.title) + countBadge + '</div>' +
          '<div class="cs-item-cat">' + esc(item.category) + '</div></div>' +
        '</div>' +
        '<div class="ci-actions">' +
          '<button type="button" class="edit-btn">Edit</button>' +
          '<button type="button" class="delete-btn" data-id="' + esc(item.id) + '">Remove</button>' +
        '</div>';
      wrap.querySelector('.edit-btn').addEventListener('click', renderEdit);
      wrap.querySelector('.delete-btn').addEventListener('click', function(){
        if(!confirm('Remove "' + item.title + '" from the Work page?')) return;
        fetch('/api/admin/case-studies', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id })
        }).then(function(){ loadCaseStudies(); });
      });
    }

    function renderEdit(){
      var catOpts = ['Content', 'Script', 'Video', 'Design', 'Social', 'Website', 'Marketing'].map(function(c){
        return '<option value="'+c+'"'+(item.category===c?' selected':'')+'>'+c+'</option>';
      }).join('');
      var inpStyle = 'background:var(--obsidian); border:1px solid rgba(241,238,231,0.14); border-radius:3px; padding:10px 12px; color:var(--ivory); font-size:0.85rem; font-family:inherit;';

      var editImages = images.slice();
      var editCover = coverImg || (editImages[0] || '');
      if(editCover && !editImages.includes(editCover)){
        editImages.unshift(editCover);
      }

      wrap.innerHTML =
        '<div style="display:flex; flex-direction:column; gap:10px; flex:1;">' +
          '<label class="field" style="margin-bottom:0;">Project Title<input type="text" class="edit-title" value="' + esc(item.title) + '" placeholder="Title" style="'+inpStyle+'"></label>' +
          '<label class="field" style="margin-bottom:0;">Category<select class="edit-category" style="'+inpStyle+'">' + catOpts + '</select></label>' +

          '<div class="cs-mgr-wrap" style="margin:4px 0 0;">' +
            '<div class="cs-mgr-title">Case Study Images &amp; Cover</div>' +
            '<div class="cs-mgr-sub">The image marked with <strong>Cover</strong> appears on the Work page card. Click any image\'s "Set as Cover" button to make it the cover.</div>' +
            '<div class="edit-images-grid cs-mgr-grid"></div>' +
            '<div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">' +
              '<label style="font-size:0.75rem; color:var(--ivory);">Add more image files:<input type="file" class="edit-more-files" accept="image/*" multiple style="display:block; margin-top:4px; font-size:0.8rem; color:var(--ivory);"></label>' +
              '<div style="display:flex; gap:8px; align-items:center;">' +
                '<input type="url" class="edit-more-url" placeholder="Or add image URL..." style="flex:1; '+inpStyle+'">' +
                '<button type="button" class="btn btn-ghost edit-add-url-btn" style="padding:9px 14px; font-size:0.78rem;"><span>Add URL</span></button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<label class="field" style="margin-bottom:0;">The Challenge<textarea class="edit-challenge" placeholder="The challenge" rows="2" style="'+inpStyle+'">' + esc(item.challenge || '') + '</textarea></label>' +
          '<label class="field" style="margin-bottom:0;">What We Did<textarea class="edit-whatwedid" placeholder="What we did" rows="2" style="'+inpStyle+'">' + esc(item.whatWeDid || '') + '</textarea></label>' +
          '<label class="field" style="margin-bottom:0;">The Outcome<textarea class="edit-outcome" placeholder="The outcome" rows="2" style="'+inpStyle+'">' + esc(item.outcome || '') + '</textarea></label>' +
          '<label class="field" style="margin-bottom:0;">Live Link (optional)<input type="url" class="edit-link" value="' + esc(item.link || '') + '" placeholder="Live link (optional)" style="'+inpStyle+'"></label>' +
        '</div>' +
        '<div class="ci-actions" style="margin-top:10px;">' +
          '<button type="button" class="edit-btn save-btn">Save Changes</button>' +
          '<button type="button" class="delete-btn cancel-btn">Cancel</button>' +
        '</div>';

      var gridEl = wrap.querySelector('.edit-images-grid');

      function refreshEditGrid(){
        gridEl.innerHTML = '';
        if(!editImages.length){
          gridEl.innerHTML = '<div style="grid-column:1/-1; font-size:0.8rem; color:var(--grey); font-style:italic;">No images in this project yet. Add some below.</div>';
          return;
        }
        if(!editImages.includes(editCover)){
          editCover = editImages[0] || '';
        }
        editImages.forEach(function(src, i){
          var isCover = (src === editCover);
          var card = document.createElement('div');
          card.className = 'cs-mgr-card' + (isCover ? ' is-cover' : '');
          card.innerHTML =
            '<div class="cs-mgr-img-wrap"><img src="' + esc(src) + '" alt=""></div>' +
            '<div class="cs-mgr-card-actions">' +
              (isCover
                ? '<span class="cs-mgr-cover-badge">&#9733; Cover Image</span>'
                : '<button type="button" class="cs-mgr-btn set-cover-btn">Set as Cover</button>') +
              '<button type="button" class="cs-mgr-btn cs-mgr-del-btn rm-img-btn">Remove</button>' +
            '</div>';
          var setBtn = card.querySelector('.set-cover-btn');
          if(setBtn){
            setBtn.addEventListener('click', function(){
              editCover = src;
              refreshEditGrid();
            });
          }
          card.querySelector('.rm-img-btn').addEventListener('click', function(){
            editImages.splice(i, 1);
            if(editCover === src){
              editCover = editImages[0] || '';
            }
            refreshEditGrid();
          });
          gridEl.appendChild(card);
        });
      }

      refreshEditGrid();

      var fileInp = wrap.querySelector('.edit-more-files');
      fileInp.addEventListener('change', function(){
        var files = Array.from(fileInp.files || []);
        if(!files.length) return;
        Promise.all(files.map(function(f){ return fileToCompressedDataUrl(f, 1200, 0.78); }))
          .then(function(urls){
            urls.forEach(function(u){ if(u && !editImages.includes(u)) editImages.push(u); });
            fileInp.value = '';
            refreshEditGrid();
          });
      });

      var urlInp = wrap.querySelector('.edit-more-url');
      wrap.querySelector('.edit-add-url-btn').addEventListener('click', function(){
        var u = urlInp.value.trim();
        if(u){
          if(!editImages.includes(u)) editImages.push(u);
          urlInp.value = '';
          refreshEditGrid();
        }
      });

      wrap.querySelector('.cancel-btn').addEventListener('click', renderView);
      wrap.querySelector('.save-btn').addEventListener('click', function(){
        var title = wrap.querySelector('.edit-title').value.trim();
        var category = wrap.querySelector('.edit-category').value.trim();
        var challenge = wrap.querySelector('.edit-challenge').value.trim();
        var whatWeDid = wrap.querySelector('.edit-whatwedid').value.trim();
        var outcome = wrap.querySelector('.edit-outcome').value.trim();
        var link = wrap.querySelector('.edit-link').value.trim();
        if(!title) return;

        var payload = { 
          id: item.id,
          title: title,
          category: category,
          challenge: challenge,
          whatWeDid: whatWeDid, 
          outcome: outcome,
          link: link,
          imageUrl: editCover || (editImages[0] || ''),
          images: editImages
        };

        fetch('/api/admin/case-studies', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(){ loadCaseStudies(); });
      });
    }

    renderView();
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
      try { localStorage.setItem('lw_case_studies_cache', JSON.stringify(data.items || [])); } catch(e){}
      if(!data.items || !data.items.length){
        caseStudyList.innerHTML = '<p class="empty-note">No case studies added yet.</p>';
        return;
      }
      data.items.forEach(function(item){ caseStudyList.appendChild(renderCaseStudy(item)); });
    }).catch(function(){
      caseStudyList.innerHTML = '<p class="empty-note">Couldn\'t load case studies right now.</p>';
    });
  }

  // --- New Case Study Multi-Image State ---
  var newFormImages = [];
  var newFormCoverIndex = 0;
  var newFileInput = document.getElementById('cs-new-file-input');
  var newUrlInput = document.getElementById('cs-new-url-input');
  var addUrlBtn = document.getElementById('cs-add-url-btn');
  var newImagesGrid = document.getElementById('cs-new-images-grid');

  function renderNewImagesGrid(){
    if(!newImagesGrid) return;
    newImagesGrid.innerHTML = '';
    if(!newFormImages.length){
      newImagesGrid.innerHTML = '<div style="grid-column:1/-1; font-size:0.8rem; color:var(--grey); font-style:italic;">No images added yet. Upload files or enter image URLs above.</div>';
      return;
    }
    newFormImages.forEach(function(src, idx){
      var isCover = (idx === newFormCoverIndex);
      var card = document.createElement('div');
      card.className = 'cs-mgr-card' + (isCover ? ' is-cover' : '');
      card.innerHTML =
        '<div class="cs-mgr-img-wrap"><img src="' + esc(src) + '" alt=""></div>' +
        '<div class="cs-mgr-card-actions">' +
          (isCover
            ? '<span class="cs-mgr-cover-badge">&#9733; Cover Image</span>'
            : '<button type="button" class="cs-mgr-btn set-cover-btn">Set as Cover</button>') +
          '<button type="button" class="cs-mgr-btn cs-mgr-del-btn rm-img-btn">Remove</button>' +
        '</div>';

      var setBtn = card.querySelector('.set-cover-btn');
      if(setBtn){
        setBtn.addEventListener('click', function(){
          newFormCoverIndex = idx;
          renderNewImagesGrid();
        });
      }
      card.querySelector('.rm-img-btn').addEventListener('click', function(){
        newFormImages.splice(idx, 1);
        if(newFormCoverIndex >= newFormImages.length){
          newFormCoverIndex = Math.max(0, newFormImages.length - 1);
        }
        renderNewImagesGrid();
      });
      newImagesGrid.appendChild(card);
    });
  }

  if(newFileInput){
    newFileInput.addEventListener('change', function(){
      var files = Array.from(newFileInput.files || []);
      if(!files.length) return;
      Promise.all(files.map(function(f){ return fileToCompressedDataUrl(f, 1200, 0.78); }))
        .then(function(urls){
          urls.forEach(function(u){ if(u && !newFormImages.includes(u)) newFormImages.push(u); });
          newFileInput.value = '';
          renderNewImagesGrid();
        });
    });
  }

  if(addUrlBtn && newUrlInput){
    addUrlBtn.addEventListener('click', function(){
      var u = newUrlInput.value.trim();
      if(u){
        if(!newFormImages.includes(u)) newFormImages.push(u);
        newUrlInput.value = '';
        renderNewImagesGrid();
      }
    });
  }

  renderNewImagesGrid();

  caseStudyForm.addEventListener('submit', function(e){
    e.preventDefault();
    caseStudyMsg.textContent = '';
    caseStudyMsg.className = 'form-msg';
    var data = new FormData(caseStudyForm);

    var cover = newFormImages[newFormCoverIndex] || (newFormImages[0] || '');
    var payload = {
      title: data.get('title'),
      category: data.get('category'),
      challenge: data.get('challenge'),
      whatWeDid: data.get('whatWeDid'),
      outcome: data.get('outcome'),
      link: data.get('link'),
      imageUrl: cover,
      images: newFormImages
    };

    fetch('/api/admin/case-studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        if(!result.ok){
          caseStudyMsg.textContent = (result.body && result.body.error) || 'Could not add this project.';
          caseStudyMsg.className = 'form-msg is-error';
          return;
        }
        caseStudyMsg.textContent = 'Added — it\'s live on the Work page now with ' + newFormImages.length + ' image(s).';
        caseStudyMsg.className = 'form-msg is-ok';
        caseStudyForm.reset();
        newFormImages = [];
        newFormCoverIndex = 0;
        renderNewImagesGrid();
        loadCaseStudies();
      })
      .catch(function(err){
        caseStudyMsg.textContent = err.message || 'Could not reach the server.';
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

  // --- Design Showcase Grids Manager ---
  var designGridsManager = document.getElementById('design-grids-manager');
  var designGridsMsg = document.getElementById('design-grids-msg');
  var currentDesignGrids = [];

  var DEFAULT_DESIGN_GRIDS = [
    { id: 'grid-1', title: 'Visual Identity', imageUrl: '', defaultClass: 'a1' },
    { id: 'grid-2', title: 'Social Design', imageUrl: '', defaultClass: 'a2' },
    { id: 'grid-3', title: 'Thumbnails', imageUrl: '', defaultClass: 'a3' },
    { id: 'grid-4', title: 'Brand Assets', imageUrl: '', defaultClass: 'a4' }
  ];

  function saveAllGrids(successMsg){
    return fetch('/api/admin/design-grids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grids: currentDesignGrids })
    })
      .then(function(res){ return res.json().then(function(b){ return { ok: res.ok, body: b }; }); })
      .then(function(result){
        if(!result.ok){
          designGridsMsg.textContent = (result.body && result.body.error) || 'Could not save.';
          designGridsMsg.className = 'form-msg is-error';
          return;
        }
        if(successMsg){
          designGridsMsg.textContent = successMsg;
          designGridsMsg.className = 'form-msg is-ok';
        }
        renderDesignGrids();
      })
      .catch(function(err){
        designGridsMsg.textContent = err.message || 'Error saving design grids.';
        designGridsMsg.className = 'form-msg is-error';
      });
  }

  function renderDesignGridItem(item, idx){
    var wrap = document.createElement('div');
    wrap.className = 'cs-item';

    var defaultClass = item.defaultClass || ('a' + (idx + 1));

    function renderView(){
      var hasCurrentImg = Boolean(item.imageUrl && item.imageUrl.trim());
      var thumbHtml = hasCurrentImg
        ? '<div class="dg-thumb-box has-custom-img"><img src="' + esc(item.imageUrl) + '" alt=""></div>'
        : '<div class="dg-thumb-box ' + defaultClass + '"><span class="dg-thumb-num">' + (idx + 1) + '</span></div>';

      var statusText = hasCurrentImg
        ? '<span style="color:var(--gold);">&#9733; Custom Picture Active</span>'
        : '<span style="color:var(--grey);">Original Geometric Design</span>';

      wrap.innerHTML =
        '<div style="display:flex; gap:14px; align-items:center; flex:1; min-width:0;">' +
          thumbHtml +
          '<div style="min-width:0;">' +
            '<div class="cs-item-title">' + esc(item.title) + '</div>' +
            '<div class="cs-item-cat">Design Slot ' + (idx + 1) + ' &bull; ' + statusText + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ci-actions">' +
          '<button type="button" class="edit-btn change-btn">Change Picture</button>' +
          (hasCurrentImg ? '<button type="button" class="delete-btn remove-btn">Remove</button>' : '') +
        '</div>';

      wrap.querySelector('.change-btn').addEventListener('click', renderEdit);

      var removeBtn = wrap.querySelector('.remove-btn');
      if(removeBtn){
        removeBtn.addEventListener('click', function(){
          if(!confirm('Remove custom picture for "' + item.title + '" and restore the original geometric design?')) return;
          designGridsMsg.textContent = '';
          designGridsMsg.className = 'form-msg';
          item.imageUrl = '';
          saveAllGrids('Restored original geometric design for "' + item.title + '".');
        });
      }
    }

    function renderEdit(){
      var inpStyle = 'background:var(--obsidian); border:1px solid rgba(241,238,231,0.14); border-radius:3px; padding:10px 12px; color:var(--ivory); font-size:0.85rem; font-family:inherit;';
      var hasCurrentImg = Boolean(item.imageUrl && item.imageUrl.trim());
      var thumbHtml = hasCurrentImg
        ? '<div class="dg-thumb-box has-custom-img"><img src="' + esc(item.imageUrl) + '" alt=""></div>'
        : '<div class="dg-thumb-box ' + defaultClass + '"><span class="dg-thumb-num">' + (idx + 1) + '</span></div>';

      wrap.innerHTML =
        '<div style="display:flex; flex-direction:column; gap:12px; flex:1; width:100%;">' +
          '<div style="display:flex; gap:14px; align-items:center;">' +
            thumbHtml +
            '<div>' +
              '<div class="cs-item-title">' + esc(item.title) + '</div>' +
              '<div class="cs-item-cat">Update Slot ' + (idx + 1) + ' Picture</div>' +
            '</div>' +
          '</div>' +
          '<label class="field" style="margin-bottom:0;">Upload Picture File <input type="file" class="edit-file" accept="image/*" style="'+inpStyle+'"></label>' +
          '<label class="field" style="margin-bottom:0;">Or Image URL <input type="url" class="edit-url" placeholder="https://..." value="' + esc(item.imageUrl || '') + '" style="'+inpStyle+'"></label>' +
          '<div class="ci-actions" style="margin-top:4px;">' +
            '<button type="button" class="edit-btn save-btn">Save Picture</button>' +
            '<button type="button" class="edit-btn cancel-btn" style="border-color:rgba(241,238,231,0.18); color:var(--grey);">Cancel</button>' +
            (hasCurrentImg ? '<button type="button" class="delete-btn restore-btn" style="margin-left:auto;">Restore Original Design</button>' : '') +
          '</div>' +
        '</div>';

      var fileInp = wrap.querySelector('.edit-file');
      var urlInp = wrap.querySelector('.edit-url');
      var saveBtn = wrap.querySelector('.save-btn');
      var cancelBtn = wrap.querySelector('.cancel-btn');
      var restoreBtn = wrap.querySelector('.restore-btn');

      cancelBtn.addEventListener('click', renderView);

      if(restoreBtn){
        restoreBtn.addEventListener('click', function(){
          if(!confirm('Restore the original geometric design for "' + item.title + '"?')) return;
          item.imageUrl = '';
          saveAllGrids('Restored original geometric design for "' + item.title + '".');
        });
      }

      saveBtn.addEventListener('click', function(){
        designGridsMsg.textContent = '';
        designGridsMsg.className = 'form-msg';

        var file = fileInp.files && fileInp.files[0];
        var urlVal = (urlInp.value || '').trim();

        if(!file && !urlVal){
          designGridsMsg.textContent = 'Please choose an image file or enter an image URL.';
          designGridsMsg.className = 'form-msg is-error';
          return;
        }

        saveBtn.disabled = true;
        var step = file ? fileToCompressedDataUrl(file, 1200, 0.8) : Promise.resolve(urlVal);
        step.then(function(imgUrl){
          item.imageUrl = imgUrl;
          return saveAllGrids('Saved picture for "' + item.title + '" — updated on the Design page.');
        }).catch(function(err){
          saveBtn.disabled = false;
          designGridsMsg.textContent = err.message || 'Error processing image.';
          designGridsMsg.className = 'form-msg is-error';
        });
      });
    }

    renderView();
    return wrap;
  }

  function renderDesignGrids(){
    if(!designGridsManager) return;
    designGridsManager.innerHTML = '';
    currentDesignGrids.forEach(function(item, idx){
      designGridsManager.appendChild(renderDesignGridItem(item, idx));
    });
  }

  function loadDesignGrids(){
    if(!designGridsManager) return;
    designGridsManager.innerHTML = '<p class="empty-note">Loading design grids&hellip;</p>';
    fetch('/api/admin/design-grids')
      .then(function(res){
        if(res.status === 401){ showLogin(); return null; }
        return res.json();
      })
      .then(function(data){
        if(!data) return;
        currentDesignGrids = (data.grids && data.grids.length) ? data.grids : DEFAULT_DESIGN_GRIDS.slice();
        renderDesignGrids();
      })
      .catch(function(){
        designGridsManager.innerHTML = '<p class="empty-note">Couldn\'t load design grids right now.</p>';
      });
  }

  /* ==========================================================================
     Social Media Management (Connect Section)
     ========================================================================== */
  var POPULAR_SOCIAL_PRESETS = [
    { name: 'Instagram', placeholder: 'https://instagram.com/' },
    { name: 'LinkedIn', placeholder: 'https://linkedin.com/company/' },
    { name: 'Behance', placeholder: 'https://behance.net/' },
    { name: 'YouTube', placeholder: 'https://youtube.com/@' },
    { name: 'X (Twitter)', placeholder: 'https://x.com/' },
    { name: 'TikTok', placeholder: 'https://tiktok.com/@' },
    { name: 'Facebook', placeholder: 'https://facebook.com/' },
    { name: 'Dribbble', placeholder: 'https://dribbble.com/' },
    { name: 'GitHub', placeholder: 'https://github.com/' },
    { name: 'Threads', placeholder: 'https://threads.net/@' },
    { name: 'Pinterest', placeholder: 'https://pinterest.com/' },
    { name: 'Vimeo', placeholder: 'https://vimeo.com/' },
    { name: 'Substack', placeholder: 'https://substack.com/@' },
    { name: 'Medium', placeholder: 'https://medium.com/@' }
  ];

  function getSocialSvg(platform){
    var p = (platform || '').toLowerCase().trim();
    // Instagram - Official camera logo
    if(p.indexOf('insta') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
    }
    // LinkedIn - Official 'in' logo
    if(p.indexOf('link') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>';
    }
    // Behance - Official 'Bē' logo
    if(p.indexOf('behance') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-1.246 2.318-2.396 3.035C20.177 20.75 18.79 21.1 17.15 21.1c-1.862 0-3.447-.469-4.717-1.397-1.27-.932-2.2-2.188-2.766-3.738-.564-1.554-.852-3.265-.852-5.097 0-1.879.301-3.606.897-5.143.597-1.536 1.552-2.781 2.846-3.708C13.854 1.09 15.42.63 17.228.63c1.782 0 3.268.423 4.437 1.261 1.168.837 2.012 1.986 2.516 3.424.505 1.437.712 3.064.618 4.847H13.673c.094 1.516.549 2.68 1.353 3.463.806.784 1.873 1.182 3.178 1.182.916 0 1.697-.184 2.327-.549.63-.364 1.077-.872 1.332-1.514l1.863.256zm-1.996-5.834c-.066-1.125-.407-1.993-1.016-2.583-.61-.59-1.428-.89-2.436-.89-.993 0-1.802.29-2.408.86-.606.57-.96 1.436-1.054 2.58h6.914zM0 2.25h8.924c1.232 0 2.285.167 3.16.501.875.334 1.579.818 2.111 1.452.532.634.908 1.403 1.127 2.307.219.904.329 1.932.329 3.084 0 .979-.115 1.85-.344 2.613-.23.763-.594 1.417-1.093 1.961-.499.544-1.139.967-1.92 1.269.96.287 1.748.749 2.364 1.387.616.638 1.077 1.413 1.383 2.325.306.912.459 1.954.459 3.126 0 1.299-.148 2.45-.444 3.453-.297 1.003-.761 1.844-1.394 2.523-.633.679-1.448 1.183-2.445 1.512-.997.329-2.203.493-3.619.493H0V2.25zm4.842 6.643h2.096c.7 0 1.31-.089 1.828-.268.518-.179.943-.451 1.275-.815.332-.365.579-.832.742-1.402.163-.57.244-1.246.244-2.029 0-.825-.079-1.528-.237-2.11-.158-.581-.41-1.046-.756-1.394-.345-.348-.797-.599-1.355-.753-.558-.155-1.223-.232-1.996-.232H4.842v9.003zm0 10.37h2.518c.708 0 1.313-.071 1.815-.212.502-.141.911-.382 1.226-.723.315-.341.544-.792.688-1.353.143-.561.215-1.239.215-2.033 0-.765-.062-1.419-.186-1.961-.124-.543-.324-.986-.601-1.33-.277-.343-.639-.597-1.085-.761-.446-.164-.984-.246-1.614-.246H4.842v8.619z"/></svg>';
    }
    // X / Twitter - Official 'X' logo
    if(p.indexOf('twitter') !== -1 || p === 'x' || p.indexOf(' x') !== -1 || p.indexOf('x ') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
    }
    // YouTube - Official play button logo
    if(p.indexOf('youtu') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
    }
    // TikTok - Official note glyph
    if(p.indexOf('tik') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>';
    }
    // Facebook - Official 'f' badge
    if(p.indexOf('face') !== -1 || p.indexOf('fb') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
    }
    // Dribbble - Official basketball logo
    if(p.indexOf('drib') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.143 5.597c1.47 1.745 2.378 3.992 2.457 6.447-.577-.123-2.748-.562-5.362-.239-.076-.184-.156-.37-.24-.555-.668-1.468-1.465-2.887-2.366-4.218 2.571-.628 4.593-1.22 5.511-1.435zM12 2.4c2.25 0 4.316.764 5.968 2.05-.788.223-2.668.797-5.12 1.407-1.332-2.274-2.435-4.475-2.748-5.143C10.74 2.483 11.36 2.4 12 2.4zM7.564 1.488c.325.688 1.42 2.871 2.768 5.161-3.66 1.054-6.974 1.096-7.85 1.096C3.398 4.869 5.253 2.708 7.564 1.488zm-5.16 8.707c.883 0 4.457-.043 8.358-1.185.347.674.673 1.37.973 2.083-2.235.686-4.66 2.379-6.398 5.556C3.606 14.887 2.4 12.569 2.4 10.195zm4.27 7.917c1.554-2.868 3.69-4.382 5.753-5.028.91 2.41 1.487 5.034 1.677 7.749C12.784 21.31 11.417 21.6 12 21.6c-2.025 0-3.899-.684-5.33-1.488zM15.937 19.98c-.183-2.529-.714-4.975-1.554-7.234 2.443-.377 4.605.02 5.176.143-.356 3.12-2.122 5.792-4.622 7.091h-.001z"/></svg>';
    }
    // GitHub - Official Octocat silhouette
    if(p.indexOf('git') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';
    }
    // Threads - Official logo
    if(p.indexOf('thread') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007C5.463 23.975 0 18.57 0 11.942 0 5.304 5.467 0 12.186 0c6.7 0 12.15 5.289 12.186 11.916v.053c0 6.64-5.468 12.031-12.186 12.031zm0-21.722c-5.452 0-9.889 4.364-9.889 9.664 0 5.311 4.437 9.686 9.889 9.686 5.438 0 9.874-4.353 9.889-9.638 0-5.322-4.437-9.712-9.889-9.712zm6.262 9.775c-.247 3.535-2.457 5.793-5.918 5.793-2.228 0-4.043-.997-4.832-2.65-.548-1.151-.715-2.664-.473-4.264.394-2.607 2.115-4.321 4.673-4.697 1.341-.197 2.697.027 3.82.632.748.404 1.353.989 1.761 1.704.428.75.599 1.62.502 2.532-.09.845-.444 1.583-1.026 2.138-.646.617-1.503.95-2.474.962-1.042.012-1.905-.333-2.43-.974-.352-.43-.538-.999-.553-1.696-.026-1.229.47-2.124 1.472-2.661.73-.39 1.65-.515 2.735-.371.189.025.378.06.566.104-.078-.501-.264-.93-.568-1.277-.487-.557-1.25-.85-2.148-.827-1.39.037-2.467.671-2.956 1.74-.287.627-.378 1.401-.271 2.298.243 2.034 1.554 3.731 3.42 4.426.657.244 1.378.368 2.146.368 2.454 0 4.392-1.272 5.318-3.491.564-1.35.632-2.909.196-4.509-.597-2.193-2.071-3.958-4.044-4.843-1.782-.8-3.799-1.01-5.681-.591-3.606.803-6.425 3.659-7.23 7.323-.559 2.544-.22 5.094.954 7.181 1.488 2.645 4.148 4.301 7.299 4.544 2.871.221 5.56-.732 7.571-2.684l1.597 1.528c-2.451 2.38-5.74 3.541-9.256 3.269-3.837-.297-7.076-2.313-8.889-5.534-1.433-2.547-1.847-5.658-1.164-8.761.981-4.464 4.417-7.943 8.812-8.922 2.292-.51 4.75-.255 6.921.718 2.404 1.077 4.198 3.227 4.925 5.897.534 1.956.452 3.86-.239 5.508z"/></svg>';
    }
    // Pinterest - Official 'P' logo
    if(p.indexOf('pin') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.5.02-3.57.11-.97.74-6.3.74-6.3s-.19-.38-.19-.94c0-.88.51-1.54 1.15-1.54.54 0 .8.41.8.9 0 .55-.35 1.37-.53 2.13-.15.64.32 1.16.95 1.16 1.14 0 2.02-1.2 2.02-2.94 0-1.54-1.1-2.61-2.69-2.61-1.83 0-2.91 1.38-2.91 2.8 0 .56.21 1.15.48 1.48.05.06.06.12.04.18-.05.21-.16.65-.18.74-.03.12-.1.17-.23.11-1.02-.48-1.66-1.97-1.66-3.17 0-2.58 1.88-4.96 5.41-4.96 2.84 0 5.06 2.03 5.06 4.74 0 2.82-1.78 5.1-4.25 5.1-.83 0-1.61-.43-1.88-.94l-.51 1.95c-.18.72-.68 1.62-1.01 2.17A12 12 0 1 0 12 0z"/></svg>';
    }
    // Discord - Official logo
    if(p.indexOf('disc') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
    }
    // Telegram - Official logo
    if(p.indexOf('tele') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z"/></svg>';
    }
    // WhatsApp - Official logo
    if(p.indexOf('what') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.3-.777.979-.952 1.18-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.087-.176-.3-.019-.463.132-.612.136-.135.301-.351.451-.527.151-.175.201-.3.302-.501.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.927-2.235-.244-.587-.492-.507-.677-.517-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.3-1.053 1.028-1.053 2.508 0 1.479 1.078 2.908 1.228 3.109.15.2 2.122 3.24 5.141 4.542.719.31 1.28.496 1.718.635.722.23 1.378.197 1.898.12.58-.087 1.78-.727 2.03-1.43.25-.702.25-1.304.175-1.43-.075-.125-.276-.2-.577-.35zm-5.467 7.424c-1.815 0-3.593-.489-5.158-1.413l-.37-.22-3.834 1.006 1.024-3.738-.241-.383A10.457 10.457 0 0 1 1.8 11.806C1.8 6.178 6.377 1.6 12.005 1.6c2.727 0 5.289 1.063 7.218 2.993a10.16 10.16 0 0 1 2.987 7.213c0 5.629-4.577 10.207-10.205 10.207zM12 0C5.373 0 0 5.373 0 12c0 2.115.548 4.102 1.512 5.836L0 24l6.335-1.472A11.936 11.936 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';
    }
    // Spotify - Official wave logo
    if(p.indexOf('spoti') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>';
    }
    // Substack - Official logo
    if(p.indexOf('sub') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>';
    }
    // Medium - Official logo
    if(p.indexOf('med') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>';
    }
    // Vimeo - Official logo
    if(p.indexOf('vimeo') !== -1){
      return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881l-1.92-7.054c-.716-2.56-1.477-3.841-2.28-3.841-.177 0-.793.376-1.849 1.129L0 7.284C1.229 6.208 2.458 5.158 3.687 4.135c1.716-1.493 3.012-2.298 3.886-2.417 2.052-.284 3.313.916 3.782 3.6.5 2.871.847 4.654 1.042 5.348.583 2.502 1.218 3.753 1.905 3.753.535 0 1.242-.83 2.12-2.489.878-1.659 1.349-2.909 1.413-3.752.126-1.393-.385-2.09-1.533-2.09-.548 0-1.118.125-1.711.375 1.127-3.702 3.284-5.498 6.471-5.388 2.364.081 3.514 1.47 3.447 4.167-.039.09-.039.245 0 .47z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  }

  function initSocialPresets(){
    if(!socialPresetChips) return;
    socialPresetChips.innerHTML = '';
    POPULAR_SOCIAL_PRESETS.forEach(function(preset){
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'social-preset-chip';
      chip.textContent = preset.name;
      chip.addEventListener('click', function(){
        socialNameInput.value = preset.name;
        if(!socialUrlInput.value || socialUrlInput.value === 'https://'){
          socialUrlInput.value = preset.placeholder;
        }
        socialUrlInput.focus();
      });
      socialPresetChips.appendChild(chip);
    });
  }

  function renderSocialItem(item, idx, total){
    var wrap = document.createElement('div');
    wrap.className = 'social-item';

    function renderView(){
      var isFirst = (idx === 0);
      var isLast = (idx === total - 1);

      wrap.innerHTML =
        '<div style="display:flex; gap:14px; align-items:center; flex:1; min-width:0;">' +
          '<div style="display:flex; flex-direction:column; gap:3px;">' +
            '<button type="button" class="social-order-btn order-up-btn" title="Move Up"' + (isFirst ? ' disabled' : '') + '>&uarr;</button>' +
            '<button type="button" class="social-order-btn order-down-btn" title="Move Down"' + (isLast ? ' disabled' : '') + '>&darr;</button>' +
          '</div>' +
          '<div class="social-item-icon">' + getSocialSvg(item.platform) + '</div>' +
          '<div style="min-width:0; flex:1;">' +
            '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">' +
              '<span class="social-item-title">' + esc(item.platform) + '</span>' +
              '<span class="social-status-tag">Connect Section</span>' +
            '</div>' +
            '<div class="social-item-url">' +
              '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer" title="Test link">' + esc(item.url) + ' &nearr;</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ci-actions">' +
          '<button type="button" class="edit-btn item-edit-btn">Edit</button>' +
          '<button type="button" class="delete-btn item-del-btn">Delete</button>' +
        '</div>';

      wrap.querySelector('.item-edit-btn').addEventListener('click', renderEdit);

      wrap.querySelector('.item-del-btn').addEventListener('click', function(){
        if(!confirm('Delete "' + item.platform + '" from the Connect section?')) return;
        deleteSocialLink(item.id, item.platform);
      });

      var upBtn = wrap.querySelector('.order-up-btn');
      if(upBtn && !isFirst){
        upBtn.addEventListener('click', function(){
          moveSocialLink(idx, idx - 1);
        });
      }

      var downBtn = wrap.querySelector('.order-down-btn');
      if(downBtn && !isLast){
        downBtn.addEventListener('click', function(){
          moveSocialLink(idx, idx + 1);
        });
      }
    }

    function renderEdit(){
      var inpStyle = 'background:var(--obsidian); border:1px solid rgba(241,238,231,0.14); border-radius:3px; padding:10px 12px; color:var(--ivory); font-size:0.9rem; font-family:inherit; width:100%;';
      wrap.innerHTML =
        '<div style="display:flex; flex-direction:column; gap:12px; flex:1; width:100%;">' +
          '<div style="display:flex; gap:12px; align-items:center;">' +
            '<div class="social-item-icon">' + getSocialSvg(item.platform) + '</div>' +
            '<div style="font-family:var(--font-display); font-size:1.05rem;">Edit ' + esc(item.platform) + '</div>' +
          '</div>' +
          '<div class="grid-2-admin">' +
            '<label class="field" style="margin-bottom:0;">Platform Name' +
              '<input type="text" class="edit-name-inp" value="' + esc(item.platform) + '" style="' + inpStyle + '" required>' +
            '</label>' +
            '<label class="field" style="margin-bottom:0;">URL' +
              '<input type="url" class="edit-url-inp" value="' + esc(item.url) + '" style="' + inpStyle + '" required>' +
            '</label>' +
          '</div>' +
          '<div class="ci-actions" style="margin-top:4px;">' +
            '<button type="button" class="edit-btn save-edit-btn">Save Changes</button>' +
            '<button type="button" class="edit-btn cancel-edit-btn" style="border-color:rgba(241,238,231,0.18); color:var(--grey);">Cancel</button>' +
            '<button type="button" class="delete-btn del-in-edit-btn" style="margin-left:auto;">Delete Link</button>' +
          '</div>' +
        '</div>';

      var nameInp = wrap.querySelector('.edit-name-inp');
      var urlInp = wrap.querySelector('.edit-url-inp');
      var saveBtn = wrap.querySelector('.save-edit-btn');
      var cancelBtn = wrap.querySelector('.cancel-edit-btn');
      var delBtn = wrap.querySelector('.del-in-edit-btn');

      cancelBtn.addEventListener('click', renderView);

      delBtn.addEventListener('click', function(){
        if(!confirm('Delete "' + item.platform + '" from the Connect section?')) return;
        deleteSocialLink(item.id, item.platform);
      });

      saveBtn.addEventListener('click', function(){
        var newName = (nameInp.value || '').trim();
        var newUrl = (urlInp.value || '').trim();
        if(!newName){
          alert('Please enter a platform name.');
          nameInp.focus();
          return;
        }
        if(!newUrl){
          alert('Please enter a URL.');
          urlInp.focus();
          return;
        }

        saveBtn.disabled = true;
        updateSocialLink(item.id, newName, newUrl);
      });
    }

    renderView();
    return wrap;
  }

  function renderSocialLinks(){
    if(!socialLinksList) return;
    socialLinksList.innerHTML = '';
    if(socialCount) socialCount.textContent = currentSocialLinks.length;

    if(!currentSocialLinks.length){
      socialLinksList.innerHTML = '<p class="empty-note" style="padding:20px 0; text-align:left;">No social media links in the Connect section. Add one using the form above.</p>';
      return;
    }

    currentSocialLinks.forEach(function(item, idx){
      socialLinksList.appendChild(renderSocialItem(item, idx, currentSocialLinks.length));
    });
  }

  function loadSocialLinks(){
    if(!socialLinksList) return;
    initSocialPresets();
    socialLinksList.innerHTML = '<p class="empty-note">Loading social links&hellip;</p>';
    fetch('/api/admin/social-links')
      .then(function(res){
        if(res.status === 401){ showLogin(); return null; }
        return res.json();
      })
      .then(function(data){
        if(!data) return;
        currentSocialLinks = Array.isArray(data.links) ? data.links : [];
        renderSocialLinks();
      })
      .catch(function(){
        socialLinksList.innerHTML = '<p class="empty-note">Couldn\'t load social links right now.</p>';
      });
  }

  function updateSocialLink(id, platform, url){
    socialListMsg.textContent = '';
    socialListMsg.className = 'form-msg';

    fetch('/api/admin/social-links', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, platform: platform, url: url })
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.ok){
          currentSocialLinks = data.links;
          renderSocialLinks();
          socialListMsg.textContent = 'Saved changes for "' + platform + '" — updated in the Connect section.';
          socialListMsg.className = 'form-msg is-ok';
        } else {
          socialListMsg.textContent = (data && data.error) || 'Failed to update link.';
          socialListMsg.className = 'form-msg is-error';
        }
      })
      .catch(function(err){
        socialListMsg.textContent = err.message || 'Error updating link.';
        socialListMsg.className = 'form-msg is-error';
      });
  }

  function deleteSocialLink(id, platformName){
    socialListMsg.textContent = '';
    socialListMsg.className = 'form-msg';

    fetch('/api/admin/social-links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.ok){
          currentSocialLinks = data.links;
          renderSocialLinks();
          socialListMsg.textContent = 'Deleted "' + (platformName || 'link') + '" — removed from the Connect section.';
          socialListMsg.className = 'form-msg is-ok';
        } else {
          socialListMsg.textContent = (data && data.error) || 'Failed to delete link.';
          socialListMsg.className = 'form-msg is-error';
        }
      })
      .catch(function(err){
        socialListMsg.textContent = err.message || 'Error deleting link.';
        socialListMsg.className = 'form-msg is-error';
      });
  }

  function moveSocialLink(fromIdx, toIdx){
    if(toIdx < 0 || toIdx >= currentSocialLinks.length) return;
    var item = currentSocialLinks.splice(fromIdx, 1)[0];
    currentSocialLinks.splice(toIdx, 0, item);
    renderSocialLinks();

    fetch('/api/admin/social-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: currentSocialLinks })
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.ok){
          currentSocialLinks = data.links;
          socialListMsg.textContent = 'Reordered links — updated in the Connect section.';
          socialListMsg.className = 'form-msg is-ok';
        }
      })
      .catch(function(){});
  }

  // Add new social link
  if(socialLinkForm){
    socialLinkForm.addEventListener('submit', function(e){
      e.preventDefault();
      socialFormMsg.textContent = '';
      socialFormMsg.className = 'form-msg';

      var platform = (socialNameInput.value || '').trim();
      var url = (socialUrlInput.value || '').trim();

      if(!platform){
        socialFormMsg.textContent = 'Please enter a platform name.';
        socialFormMsg.className = 'form-msg is-error';
        return;
      }
      if(!url){
        socialFormMsg.textContent = 'Please enter a valid URL.';
        socialFormMsg.className = 'form-msg is-error';
        return;
      }

      fetch('/api/admin/social-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform, url: url })
      })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if(data && data.ok){
            currentSocialLinks = data.links;
            renderSocialLinks();
            socialNameInput.value = '';
            socialUrlInput.value = '';
            socialFormMsg.textContent = 'Added "' + platform + '" — it now appears in the Connect section!';
            socialFormMsg.className = 'form-msg is-ok';
          } else {
            socialFormMsg.textContent = (data && data.error) || 'Failed to add link.';
            socialFormMsg.className = 'form-msg is-error';
          }
        })
        .catch(function(err){
          socialFormMsg.textContent = err.message || 'Error saving link.';
          socialFormMsg.className = 'form-msg is-error';
        });
    });
  }

  // Restore defaults
  if(socialRestoreDefaultsBtn){
    socialRestoreDefaultsBtn.addEventListener('click', function(){
      if(!confirm('Reset social links to the default platforms (Instagram, LinkedIn, Behance)? This will replace current links.')) return;
      socialFormMsg.textContent = '';
      socialFormMsg.className = 'form-msg';

      var defaultLinks = [
        { id: 'instagram', platform: 'Instagram', url: 'https://instagram.com/lekhrawrites' },
        { id: 'linkedin', platform: 'LinkedIn', url: 'https://linkedin.com/company/lekhrawrites' },
        { id: 'behance', platform: 'Behance', url: 'https://behance.net/lekhrawrites' }
      ];

      fetch('/api/admin/social-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: defaultLinks })
      })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if(data && data.ok){
            currentSocialLinks = data.links;
            renderSocialLinks();
            socialFormMsg.textContent = 'Reset to default social media links.';
            socialFormMsg.className = 'form-msg is-ok';
          }
        })
        .catch(function(){
          socialFormMsg.textContent = 'Error resetting to defaults.';
          socialFormMsg.className = 'form-msg is-error';
        });
    });
  }

  logoutBtn.addEventListener('click', function(){
    fetch('/api/admin/logout', { method: 'POST' }).then(function(){ showLogin(); });
  });

  // on load, see if there's already a valid session
  fetch('/api/admin/settings').then(function(res){
    if(res.status === 401){ showLogin(); } else { showDashboard(); }
  }).catch(function(){ showLogin(); });

})();
