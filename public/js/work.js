/* ==========================================================================
   LEKHRA WRITES — Work page: renders case studies added via the admin
   dashboard. Clicking any case study opens a rich profile popup with an
   interactive image gallery on the left and project details on the right.
   ========================================================================== */
(function(){
  "use strict";

  var empty = document.getElementById('work-empty');
  var grid = document.getElementById('work-grid');
  var template = document.getElementById('case-study-template');
  var modal = document.getElementById('cs-modal');
  if(!grid || !template) return;

  var modalCloseBtn = modal ? modal.querySelector('.cs-modal-close') : null;
  var modalBackdrop = modal ? modal.querySelector('.cs-modal-backdrop') : null;
  var modalMainImg = modal ? document.getElementById('cs-modal-active-img') : null;
  var modalPrevBtn = modal ? modal.querySelector('.cs-modal-prev') : null;
  var modalNextBtn = modal ? modal.querySelector('.cs-modal-next') : null;
  var modalCounter = modal ? document.getElementById('cs-modal-counter') : null;
  var modalThumbs = modal ? document.getElementById('cs-modal-thumbs') : null;
  var modalCat = modal ? document.getElementById('cs-modal-category') : null;
  var modalTitle = modal ? document.getElementById('cs-modal-title') : null;
  var modalChallenge = modal ? document.getElementById('cs-modal-challenge') : null;
  var modalWhatWeDid = modal ? document.getElementById('cs-modal-whatwedid') : null;
  var modalOutcome = modal ? document.getElementById('cs-modal-outcome') : null;
  var modalLink = modal ? document.getElementById('cs-modal-link') : null;

  var currentImages = [];
  var currentImgIndex = 0;
  var keydownHandler = null;

  function closeModal(){
    if(!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(keydownHandler){
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }

  function updateModalGallery(){
    if(!currentImages.length){
      if(modalMainImg) modalMainImg.src = '';
      if(modalPrevBtn) modalPrevBtn.style.display = 'none';
      if(modalNextBtn) modalNextBtn.style.display = 'none';
      if(modalCounter) modalCounter.style.display = 'none';
      if(modalThumbs) modalThumbs.innerHTML = '';
      return;
    }

    if(modalMainImg){
      modalMainImg.style.opacity = '0.4';
      modalMainImg.src = currentImages[currentImgIndex];
      modalMainImg.alt = (modalTitle ? modalTitle.textContent : '') + ' image ' + (currentImgIndex + 1);
      setTimeout(function(){
        modalMainImg.style.opacity = '1';
      }, 100);
    }

    if(currentImages.length > 1){
      if(modalPrevBtn) modalPrevBtn.style.display = 'flex';
      if(modalNextBtn) modalNextBtn.style.display = 'flex';
      if(modalCounter){
        modalCounter.style.display = 'block';
        modalCounter.textContent = (currentImgIndex + 1) + ' / ' + currentImages.length;
      }
      if(modalThumbs){
        modalThumbs.style.display = 'flex';
        modalThumbs.innerHTML = '';
        currentImages.forEach(function(imgUrl, idx){
          var thumb = document.createElement('button');
          thumb.type = 'button';
          thumb.className = 'cs-modal-thumb' + (idx === currentImgIndex ? ' is-active' : '');
          thumb.setAttribute('aria-label', 'View image ' + (idx + 1));
          var img = document.createElement('img');
          img.src = imgUrl;
          img.alt = '';
          thumb.appendChild(img);
          thumb.addEventListener('click', function(e){
            e.stopPropagation();
            currentImgIndex = idx;
            updateModalGallery();
          });
          modalThumbs.appendChild(thumb);
        });
      }
    } else {
      if(modalPrevBtn) modalPrevBtn.style.display = 'none';
      if(modalNextBtn) modalNextBtn.style.display = 'none';
      if(modalCounter) modalCounter.style.display = 'none';
      if(modalThumbs){
        modalThumbs.style.display = 'none';
        modalThumbs.innerHTML = '';
      }
    }
  }

  function openModal(item, images, initialIndex){
    if(!modal) return;
    currentImages = images || [];
    currentImgIndex = (initialIndex >= 0 && initialIndex < currentImages.length) ? initialIndex : 0;

    if(modalCat) modalCat.textContent = item.category || '';
    if(modalTitle) modalTitle.textContent = item.title || '';
    if(modalChallenge) modalChallenge.textContent = item.challenge || '\u2014';
    if(modalWhatWeDid) modalWhatWeDid.textContent = item.whatWeDid || '\u2014';
    if(modalOutcome) modalOutcome.textContent = item.outcome || '\u2014';

    if(modalLink){
      if(item.link){
        modalLink.href = item.link;
        modalLink.style.display = 'inline-flex';
      } else {
        modalLink.style.display = 'none';
      }
    }

    updateModalGallery();

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if(keydownHandler){
      document.removeEventListener('keydown', keydownHandler);
    }
    keydownHandler = function(e){
      if(e.key === 'Escape'){
        closeModal();
      } else if(e.key === 'ArrowLeft' && currentImages.length > 1){
        currentImgIndex = (currentImgIndex - 1 + currentImages.length) % currentImages.length;
        updateModalGallery();
      } else if(e.key === 'ArrowRight' && currentImages.length > 1){
        currentImgIndex = (currentImgIndex + 1) % currentImages.length;
        updateModalGallery();
      }
    };
    document.addEventListener('keydown', keydownHandler);
  }

  if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if(modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if(modalPrevBtn){
    modalPrevBtn.addEventListener('click', function(e){
      e.stopPropagation();
      if(currentImages.length > 1){
        currentImgIndex = (currentImgIndex - 1 + currentImages.length) % currentImages.length;
        updateModalGallery();
      }
    });
  }
  if(modalNextBtn){
    modalNextBtn.addEventListener('click', function(e){
      e.stopPropagation();
      if(currentImages.length > 1){
        currentImgIndex = (currentImgIndex + 1) % currentImages.length;
        updateModalGallery();
      }
    });
  }

  fetch('/api/case-studies')
    .then(function(res){ return res.json(); })
    .then(function(data){
      var items = (data && data.items) || [];

      if(!items.length){
        return;
      }

      if(empty) empty.style.display = 'none';
      if(grid) grid.style.display = '';

      var isHome = !!document.getElementById('home-work-heading');
      if (isHome) {
        items = items.slice(0, 4);
        var moreBtn = document.getElementById('home-work-more');
        if(moreBtn && data.items.length > 4) {
          moreBtn.style.display = 'block';
        }
      }

      items.forEach(function(item){
        var node = template.content.cloneNode(true);
        var card = node.querySelector('.case-study-card');
        var imageWrap = node.querySelector('.cs-image-wrap');
        var cardImg = node.querySelector('.cs-image');
        var badgePhotos = node.querySelector('.cs-badge-photos');

        // Determine list of images
        var images = Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : (item.imageUrl ? [item.imageUrl] : []);

        // The designated cover image
        var coverImg = item.imageUrl || (images.length > 0 ? images[0] : '');

        // Find cover index in images
        var coverIndex = images.indexOf(coverImg);
        if(coverIndex === -1 && coverImg){
          images.unshift(coverImg);
          coverIndex = 0;
        }

        if(coverImg && cardImg){
          cardImg.src = coverImg;
          cardImg.alt = item.title || 'Case study preview';
          if(images.length > 1 && badgePhotos){
            badgePhotos.textContent = '✦ ' + images.length + ' images';
            badgePhotos.style.display = 'inline-flex';
          }
        } else if(imageWrap){
          imageWrap.remove();
        }

        node.querySelector('.cs-category').textContent = item.category || '';
        node.querySelector('.cs-title').textContent = item.title || '';
        node.querySelector('.cs-challenge').textContent = item.challenge || '\u2014';
        node.querySelector('.cs-whatwedid').textContent = item.whatWeDid || '\u2014';
        node.querySelector('.cs-outcome').textContent = item.outcome || '\u2014';

        var link = node.querySelector('.cs-link');
        if(item.link){
          link.href = item.link;
          link.style.display = 'inline-flex';
          link.addEventListener('click', function(e){
            // Prevent card click modal trigger when clicking direct external link
            e.stopPropagation();
          });
        }

        if(card){
          card.addEventListener('click', function(){
            openModal(item, images, Math.max(0, coverIndex));
          });
          card.addEventListener('keydown', function(e){
            if(e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              openModal(item, images, Math.max(0, coverIndex));
            }
          });
        }

        grid.appendChild(node);
      });
      grid.style.display = 'grid';

      // Re-trigger reveal animation observer for newly inserted elements
      document.dispatchEvent(new CustomEvent('lw:content-inserted'));
    })
    .catch(function(){
      if(loading) loading.style.display = 'none';
      if(empty) empty.style.display = '';
    });
})();
