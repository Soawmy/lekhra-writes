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
  var workHeading = document.getElementById('work-heading');
  var workSubtitle = document.getElementById('work-subtitle');
  var homeHeading = document.getElementById('home-work-heading');
  var homeMore = document.getElementById('home-work-more');

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

  function hideEmptyState(){
    if(!empty) return;
    empty.classList.add('is-hidden');
    empty.style.setProperty('display', 'none', 'important');
    empty.hidden = true;
  }

  function showEmptyState(){
    if(!empty) return;
    empty.classList.remove('is-hidden');
    empty.style.setProperty('display', 'block', 'important');
    empty.hidden = false;
  }

  fetch('/api/case-studies')
    .then(function(res){
      if(!res.ok) throw new Error('API request failed with status ' + res.status);
      return res.json();
    })
    .then(function(data){
      var items = (data && Array.isArray(data.items)) ? data.items : [];

      if(items.length > 0){
        // 1. Permanently hide the empty state
        hideEmptyState();

        // 2. Update page headings to reflect active work
        if(workHeading){
          workHeading.textContent = 'SELECTED WORK.';
        }
        if(workSubtitle){
          workSubtitle.textContent = 'Every project here is real \u2014 a real brief, a real challenge, a real outcome. Delivered across content, scripting, video, and design.';
        }
        if(homeHeading){
          homeHeading.textContent = 'SELECTED WORK.';
        }

        // 3. Prepare items for display (Home page displays up to 4 items)
        var isHome = !!homeHeading;
        var displayItems = items;
        if(isHome){
          displayItems = items.slice(0, 4);
          if(homeMore){
            if(items.length > 4){
              homeMore.style.setProperty('display', 'block', 'important');
            } else {
              homeMore.style.setProperty('display', 'none', 'important');
            }
          }
        }

        // 4. Clear grid before populating
        grid.innerHTML = '';

        // 5. Populate cards
        displayItems.forEach(function(item){
          var node = template.content.cloneNode(true);
          var card = node.querySelector('.case-study-card');
          var imageWrap = node.querySelector('.cs-image-wrap');
          var cardImg = node.querySelector('.cs-image');
          var badgePhotos = node.querySelector('.cs-badge-photos');

          // Determine list of images
          var images = Array.isArray(item.images) && item.images.length > 0
            ? item.images
            : (item.imageUrl ? [item.imageUrl] : []);

          // Designated cover image
          var coverImg = item.imageUrl || (images.length > 0 ? images[0] : '');
          var coverIndex = images.indexOf(coverImg);
          if(coverIndex === -1 && coverImg){
            images.unshift(coverImg);
            coverIndex = 0;
          }

          if(coverImg && cardImg){
            cardImg.src = coverImg;
            cardImg.alt = item.title || 'Case study preview';
            if(images.length > 1 && badgePhotos){
              badgePhotos.textContent = '\u2726 ' + images.length + ' images';
              badgePhotos.style.display = 'inline-flex';
            }
          } else if(imageWrap){
            imageWrap.remove();
          }

          var catEl = node.querySelector('.cs-category');
          if(catEl) catEl.textContent = item.category || '';

          var titleEl = node.querySelector('.cs-title');
          if(titleEl) titleEl.textContent = item.title || '';

          var challengeEl = node.querySelector('.cs-challenge');
          if(challengeEl) challengeEl.textContent = item.challenge || '\u2014';

          var whatwedidEl = node.querySelector('.cs-whatwedid');
          if(whatwedidEl) whatwedidEl.textContent = item.whatWeDid || '\u2014';

          var outcomeEl = node.querySelector('.cs-outcome');
          if(outcomeEl) outcomeEl.textContent = item.outcome || '\u2014';

          var link = node.querySelector('.cs-link');
          if(link){
            if(item.link){
              link.href = item.link;
              link.style.display = 'inline-flex';
              link.addEventListener('click', function(e){
                e.stopPropagation();
              });
            } else {
              link.style.display = 'none';
            }
          }

          if(card){
            // Ensure card is visible immediately
            card.classList.add('in-view');

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

        // 6. Display grid
        grid.style.setProperty('display', 'grid', 'important');

        // Trigger reveal event for any listeners
        document.dispatchEvent(new CustomEvent('lw:content-inserted'));
      } else {
        // No case studies available
        showEmptyState();
        grid.style.setProperty('display', 'none', 'important');
        if(homeMore) homeMore.style.display = 'none';
        if(workHeading) workHeading.textContent = 'THE PORTFOLIO IS BEING WRITTEN.';
        if(homeHeading) homeHeading.textContent = 'THE PORTFOLIO IS BEING WRITTEN.';
      }
    })
    .catch(function(err){
      console.warn('Unable to load case studies:', err);
      showEmptyState();
      grid.style.setProperty('display', 'none', 'important');
      if(homeMore) homeMore.style.display = 'none';
    });
})();
