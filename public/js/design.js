/* ==========================================================================
   LEKHRA WRITES — Design & Branding page showcase grid loader.
   Loads custom images configured in the Admin Dashboard. If no custom image
   is set for a grid, the grid seamlessly retains its original aesthetic.
   ========================================================================== */
(function(){
  "use strict";

  var grid = document.querySelector('.artboard-grid');
  if(!grid) return;

  fetch('/api/design-grids')
    .then(function(res){ return res.json(); })
    .then(function(data){
      var items = (data && data.grids) || [];
      if(!Array.isArray(items) || !items.length) return;

      var artboards = grid.querySelectorAll('.artboard');
      artboards.forEach(function(el, idx){
        var item = items[idx];
        if(!item) return;

        var existingImg = el.querySelector('.artboard-img');
        if(item.imageUrl && item.imageUrl.trim()){
          el.classList.add('has-custom-img');
          if(!existingImg){
            var img = document.createElement('img');
            img.className = 'artboard-img';
            img.src = item.imageUrl.trim();
            img.alt = item.title || 'Design showcase';
            el.insertBefore(img, el.firstChild);
          } else {
            existingImg.src = item.imageUrl.trim();
          }
        } else {
          el.classList.remove('has-custom-img');
          if(existingImg) existingImg.remove();
        }

        if(item.title && item.title.trim()){
          var span = el.querySelector('span');
          if(span) span.textContent = item.title.trim();
        }
      });
    })
    .catch(function(err){
      // Graceful failure: default artboard styling is preserved
    });
})();
