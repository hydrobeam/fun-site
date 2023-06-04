import {
  computePosition,
  autoPlacement,
  shift,
  offset,
} from 'https:cdn.jsdelivr.net/npm/@floating-ui/dom@1.2.3/+esm';

import {
  RunescapeAPICall,
  WikipediaAPICall,
  UncyclopediaAPICall,
} from "./wiki.js"

const linkTransTime = parseInt(getComputedStyle(document.body).getPropertyValue("--link-trans-time"));

let tooltip = document.querySelector('#tooltip');
let tooltipText = document.querySelector('#tooltip-text');
let tooltipThumb = document.querySelector('#tooltip-thumb');
let wikiLinks = document.querySelectorAll('.wiki-link');
let changeElement = document.getElementById('update-wiki-link');

const linkWaitTime = 700;

tooltip.addEventListener('transitionend', () => {
  if (tooltip.classList.contains('animEnd')) {
    tooltip.classList.remove('animEnd');
    tooltip.style.display = '';
  }
})

changeElement.addEventListener('input', (e) => {
  wikiLinks.forEach((elem) => {
    elem.innerHTML = e.target.value;
  })
})

function showTooltip() {
  tooltip.classList.add('animBegin');
}

// prevElement is set to the target element of the event when displayed
// when it is succesffuly hidden, we set it to null so that an animation can play
//
// we bother with this so enable it so that if you mouse off the tooltip, and back
// onto the previous element you were on, the tooltip remains
//
// however, if you were to mouse on to /another/ tooltip, the tooltip would disappear
// and reanimate in the other location
function hideTooltip() {
  // console.log(!(tooltip.classList.contains('tooltip-hover') || tooltip.classList.contains('link-hover')));
  if (!(tooltipHover
    // check for link hover to not remove the element
    // if a link is being overed.
    // if it's not the same as the previous element, the link
    // will still fadeaway since we remove animEnd unconditionally
    //
    // if it's the same as the previou element, nothing changes. as desired.
    // going back and hovering the link u were hovering shouldn't influence the tooltip
    // we re-add the link-hover class before the timer runs out on the pointerleave
    // event, so it gets caught here.
    || linkHover
  )) {
    if (tooltip.classList.contains('animBegin')) {
      console.log("setting prevElement");
      prevElement = null;
      tooltip.classList.remove('animBegin');
      tooltip.classList.add('animEnd');
    }

  }
  // if (tooltip.classList.contains('animEnd')) {
  //   tooltip.classList.remove('animEnd');
  // }
}

// uses a timeoout do induce a delay event. helps potentially prevents
// a simple mouse drag from sending dozens of requests
// keeping our load down
// TODO: store calls to requests per session so multiple calls aren't made for the same thing.,


// NOTE: how animating tooltip animation works:
// 0. tooltip starts with display = 'none' & opacity 0
// 1. set tooltip display to '(something-visible)' to prepare to get animated
// 2. fetch content
// 3. in showTooltip(), add beginAnim class, which triggers an animation.
// 3.1 tooltip is now visibile after var(--link-trans-time).
//
// to hide tooltip:
// 4. call hideTooltip on mouseleave, which checks for the presence of animBegin (basically if the tooltip is currently visible)
// 4.1 this is to account for the case where someone has hovered the link, but not long enough for the tooltip to appear
// 5. remove the anim begin class, and add the animEnd class to set the opacity to 0
// 6. at the end of the animation, return the display attribute to '' ('none'), to prevent it from covering content.
//
//
// there's some extra code for to check if the tooltip/link is being hovered, so that the user can click and view the popup.
// add a class to represent an animation to the tooltip (toolttip-begin)
//

let timer = null;
let prevElement = null;
let linkHover = false;
let tooltipHover = false;
wikiLinks.forEach(function (elem) {
  // inspired by (taken from..?)
  // https://stackoverflow.com/questions/6231052/how-to-have-a-mouseover-event-fire-only-if-the-mouse-is-hovered-over-an-element
  elem.addEventListener('pointerover', (actionEvent) => {
    linkHover = true;
    if (actionEvent.target != prevElement) {
      // have remove all animation instances to induce an animate off effect
      // as opposed to having the tooltip teleport
      tooltip.classList.remove('animBegin');
      // animEnd cause sometimes it can get glitchy out here
      tooltip.classList.remove('animEnd');


      timer = setTimeout(async () => {
        let queryWiki = await getWikiExtract(actionEvent);
        tooltip.style.display = 'grid';
        moveTooltip(actionEvent);
        tooltip.href = queryWiki.queryUrl;
        tooltipText.innerHTML = queryWiki.summaryHTML ?? `<p>Query "<b>${link}</b>" not found.</p>`;
        tooltipThumb.setAttribute('src', queryWiki.thumbnailSrc);

        prevElement = actionEvent.target;
        showTooltip();
      }, linkTransTime)
    }
  });

  elem.addEventListener('pointerleave', () => {
    linkHover = false;
    clearTimeout(timer)
    setTimeout(() => {
      hideTooltip();
    }, linkTransTime);
  });

  elem.addEventListener('focus', (actionEvent) => {
    linkHover = true;
    timer = setTimeout(async () => {
      tooltip.style.display = 'grid';
      await getWikiExtract(actionEvent);
      showTooltip();
    }, linkWaitTime)
  });

  elem.addEventListener('blur', () => {
    linkHover = false;
    clearTimeout(timer)
    setTimeout(() => {
      hideTooltip();
    }, linkTransTime);
  });
})

tooltip.addEventListener('pointerover', () => {
  tooltipHover = true;
})

tooltip.addEventListener('pointerleave', () => {
  tooltipHover = false;
  // add delay on fadeout to see if  user is hovering tooltip/link
  setTimeout(() => {
    hideTooltip();
  }, linkTransTime);
})

const wikiQueryMap = {
  "runescape": new RunescapeAPICall(),
  "wikipedia": new WikipediaAPICall(),
  "uncyclopedia": new UncyclopediaAPICall(),
};

async function getWikiExtract(domElement) {
  const link = domElement.target.innerHTML;
  // set src to blank to reset previous image in case it doens't laod in time
  tooltipThumb.setAttribute('src', ' ');

  // REVIEW: consider using revisions to cache dom changes.
  // for now, just TODO: aggressively cache.
  // rvprop: timestamp + prop: revisions

  let queryWiki = wikiQueryMap[domElement.target.getAttribute("query-wiki")];

  //
  await queryWiki.generateJsonResponse(link);
  return queryWiki;

}


function moveTooltip(domElement) {
  computePosition(domElement.target, tooltip, {
    middleware: [shift({ padding: 5 }), autoPlacement(),
    offset(6),
    ]
  }).then(({ x, y }) => {

    Object.assign(tooltip.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  });

}
