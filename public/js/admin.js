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

  logoutBtn.addEventListener('click', function(){
    fetch('/api/admin/logout', { method: 'POST' }).then(function(){ showLogin(); });
  });

  // on load, see if there's already a valid session
  fetch('/api/admin/settings').then(function(res){
    if(res.status === 401){ showLogin(); } else { showDashboard(); }
  }).catch(function(){ showLogin(); });

})();
