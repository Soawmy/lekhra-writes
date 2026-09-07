/* ==========================================================================
   LEKHRA WRITES — Work page: renders case studies added via the admin
   dashboard. Falls back to the honest empty state if there are none yet
   (or if the backend isn't configured), never fake placeholders.
   ========================================================================== */
(function(){
  "use strict";

  var loading = document.getElementById('work-loading');
  var empty = document.getElementById('work-empty');
  var grid = document.getElementById('work-grid');
  var template = document.getElementById('case-study-template');
  if(!grid || !template) return;

  function esc(v){
    var div = document.createElement('div');
    div.textContent = v == null ? '' : String(v);
    return div.innerHTML;
  }

  fetch('/api/case-studies')
    .then(function(res){ return res.json(); })
    .then(function(data){
      var items = (data && data.items) || [];
      if(loading) loading.style.display = 'none';

      if(!items.length){
        if(empty) empty.style.display = '';
        return;
      }

      items.forEach(function(item){
        var node = template.content.cloneNode(true);
        node.querySelector('.cs-category').textContent = item.category || '';
        node.querySelector('.cs-title').textContent = item.title || '';
        node.querySelector('.cs-challenge').textContent = item.challenge || '\u2014';
        node.querySelector('.cs-whatwedid').textContent = item.whatWeDid || '\u2014';
        node.querySelector('.cs-outcome').textContent = item.outcome || '\u2014';
        var link = node.querySelector('.cs-link');
        if(item.link){
          link.href = item.link;
          link.style.display = 'inline-flex';
        }
        grid.appendChild(node);
      });
      grid.style.display = 'grid';

      // newly-inserted .reveal cards need the observer main.js already set
      // up — dispatch a custom event it listens for, so they animate in
      // instead of sitting there with the reveal system unaware of them.
      document.dispatchEvent(new CustomEvent('lw:content-inserted'));
    })
    .catch(function(){
      if(loading) loading.style.display = 'none';
      if(empty) empty.style.display = '';
    });
})();
