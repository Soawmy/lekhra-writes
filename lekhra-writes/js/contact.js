/* ==========================================================================
   LEKHRA WRITES — Start a Project branching brief
   Multi-select services: pick any number of services, each contributes its
   own specific fields, and fields shared across every service (References,
   Timeline) are asked once regardless of how many services are chosen.
   On submit, posts JSON to /api/submit — a Vercel serverless function that
   emails the brief via Resend. See /api/submit.js for that side of it.
   ========================================================================== */
(function(){
  "use strict";
  var form = document.getElementById('brief-form');
  if(!form) return;

  var SERVICE_LABELS = {
    website: 'Website', content: 'Content', script: 'Script', video: 'Video',
    design: 'Design', social: 'Social Media', marketing: 'Marketing', other: 'Something Else'
  };

  var state = { categories: [] };
  var steps = form.querySelectorAll('.brief-step');
  var progressBar = document.querySelector('.brief-progress-track span');
  var categoryFields = form.querySelectorAll('[data-for-category]');
  var step1Selected = document.getElementById('brief-step1-selected');
  var step0Hint = document.getElementById('brief-step0-hint');
  var errorMsg = document.getElementById('brief-error');
  var submitBtn = document.getElementById('brief-submit');

  function goTo(stepIndex){
    steps.forEach(function(s, i){
      s.classList.toggle('is-active', i === stepIndex);
      s.style.display = (i === stepIndex) ? '' : 'none';
    });
    form.setAttribute('data-step', stepIndex);
    if(progressBar){ progressBar.style.width = (((stepIndex + 1) / steps.length) * 100) + '%'; }
    var activeStep = steps[stepIndex];
    if(activeStep){ activeStep.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  /* ---- step 0: toggle-select any number of services ---- */
  form.querySelectorAll('[data-category]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var cat = btn.getAttribute('data-category');
      var idx = state.categories.indexOf(cat);
      if(idx === -1){ state.categories.push(cat); btn.classList.add('is-active'); }
      else { state.categories.splice(idx, 1); btn.classList.remove('is-active'); }
      if(state.categories.length && step0Hint){ step0Hint.style.display = 'none'; }
    });
  });

  var continueBtn = form.querySelector('[data-continue-from-services]');
  if(continueBtn){
    continueBtn.addEventListener('click', function(){
      if(!state.categories.length){
        if(step0Hint) step0Hint.style.display = 'block';
        return;
      }

      // show exactly the field groups for selected services, each field
      // required only when its service is selected — nothing is repeated
      // since the shared References field lives outside every group
      categoryFields.forEach(function(group){
        var show = state.categories.indexOf(group.getAttribute('data-for-category')) !== -1;
        group.style.display = show ? 'grid' : 'none';
        group.querySelectorAll('input, select, textarea').forEach(function(f){
          f.required = show && f.dataset.required === 'true';
        });
      });

      if(step1Selected){
        step1Selected.textContent = 'For: ' + state.categories.map(function(c){ return SERVICE_LABELS[c] || c; }).join(', ');
      }

      goTo(1);
    });
  }

  form.querySelectorAll('[data-next]').forEach(function(btn){
    btn.addEventListener('click', function(){ goTo(parseInt(btn.getAttribute('data-next'), 10)); });
  });
  form.querySelectorAll('[data-back]').forEach(function(btn){
    btn.addEventListener('click', function(){ goTo(parseInt(btn.getAttribute('data-back'), 10)); });
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!state.categories.length){ goTo(0); return; }

    if(errorMsg) errorMsg.style.display = 'none';
    var originalLabel = submitBtn ? submitBtn.innerHTML : '';
    if(submitBtn){ submitBtn.setAttribute('disabled', 'true'); submitBtn.innerHTML = '<span>Sending&hellip;</span>'; }

    var data = new FormData(form);
    var payload = { services: state.categories.map(function(c){ return SERVICE_LABELS[c] || c; }).join(', ') };
    data.forEach(function(v, k){ if(v) payload[k] = v; });

    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res){ if(!res.ok) throw new Error('Request failed'); return res.json(); })
      .then(function(){
        form.style.display = 'none';
        document.getElementById('brief-confirm').style.display = 'block';
        document.getElementById('brief-confirm').scrollIntoView({ behavior:'smooth', block:'center' });
      })
      .catch(function(){
        if(errorMsg) errorMsg.style.display = 'block';
        if(submitBtn){ submitBtn.removeAttribute('disabled'); submitBtn.innerHTML = originalLabel; }
      });
  });
})();
