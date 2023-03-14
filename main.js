// To implement this base class, you need to override four methods:
// 1. generateQueryUrk
// - something you can simply fetch and get a response from
// 2. extractSpecificObject
// - when getting the json object from your call, return the data for the query.
// 3. extractExtract
// - get the summary information from your API call
// 4. extractThumbnail
// - get the thumbnail src from your API call
// 5. extractQueryUrl
// - get the url of the thing you're pointing to
class BaseWikiAPICall {
  constructor(url) {
    this.url = url;
    this.summaryHTML;
    this.thumbnailSrc;
    this.queryUrl;
  }

  // returns a URLSearchParams
  generateQueryUrl(query){};

  // returns an object
  extractSpecificObject (responseJson){};

  // returns a string
  extractExtract(responseObject){};

  // returns a string
  extractThumbnail(responseObject){};

  extractQueryUrl(responseObject){};

  // returns URLSearchParams object
  // takes  string
  /* accepts string */
  async generateJsonResponse(query) {
    let response = await fetch(this.generateQueryUrl(query));
    const responseJson = await response.json();
    const responseObject = this.extractSpecificObject(responseJson);

    const extract = this.extractExtract(responseObject);
    if (extract) {
      // FIXME: find better solution???
      // replace breaking newline, just one should be enough... i guess
      // do this because newlines aren't consistent with the rest of the line heights and introduce a weird
      // clipping effect. this allows to have (hopefully) all extracts end at 9 lines
      // JANK
      // idk how the rswiki does it, they get plaintext but their thing has formatting... probably some preprocessing..
      // in plaintext this isn't a problem since it ignores all newlines
      this.summaryHTML = extract.replace('\n</p><p>', ' ');
      this.thumbnailSrc = this.extractThumbnail(responseObject) ?? '';
      this.queryUrl = this.extractQueryUrl(responseObject);
    } else {
      this.summaryHTML = null;
      this.thumbnailSrc = '';
    }
  }
}

class RunescapeAPICall extends BaseWikiAPICall {
  constructor() {
    super("https://runescape.wiki/api.php?");
  }

  // returns an object
  extractSpecificObject (responseJson) {
    return responseJson["query"]["pages"][0];
  }

  // returns a string or undefined
  extractExtract(responseObject) {
    return responseObject["extract"];
  }

  // returns a string or undefined
  extractThumbnail(responseObject) {
    const thumbnailObj = responseObject["thumbnail"];
    return thumbnailObj?.["source"];
  }

  extractQueryUrl(responseObject) {
    return responseObject["fullurl"];
  }

  generateQueryUrl(query) {
    const params = new URLSearchParams({
      "action": "query",
      "format": "json",
      "prop": "info|extracts|pageimages",
      "formatversion": 2,
      "redirects": true,
      "exintro": true,
      "exchars": 425,
      // "explaintext": true,
      // "exsectionformat": "plain",
      "piprop": "thumbnail",
      "pithumbsize": 400,
      "pilicense": "any",
      "inprop": "url",
      "titles": `${query}`,
      "smaxage": 300,
      "maxage": 300,
      "uselang": "content",
    });

    return this.url  + params;
  }
}

class WikipediaAPICall extends BaseWikiAPICall {
  constructor() {
    super("https://en.wikipedia.org/api/rest_v1");
  }

  // returns an object
  extractSpecificObject (responseJson) {
    // does nothing in this case
    // TODO/REVIEW: review the purpose of this function
    return responseJson;
  }

  // returns a string or undefined
  extractExtract(responseObject) {
    return responseObject["extract_html"];
  }

  // returns a string or undefined
  extractThumbnail(responseObject) {
    const thumbnailObj = responseObject["thumbnail"];
    return thumbnailObj?.["source"];
  }

  extractQueryUrl(responseObject) {
    return responseObject["content_urls"]["desktop"]["page"];
  }

  generateQueryUrl(query) {
    return `${this.url}/page/summary/${query}`;
  }
}

import {
  computePosition,
  autoPlacement,
  shift,
  offset,
  arrow,
} from 'https:cdn.jsdelivr.net/npm/@floating-ui/dom@1.2.3/+esm';

const linkTransTime = parseInt(getComputedStyle(document.body).getPropertyValue("--link-trans-time"));

let tooltip = document.querySelector('#tooltip');
let tooltipText = document.querySelector('#tooltip-text');
let tooltipThumb = document.querySelector('#tooltip-thumb');
let arrowElement = document.querySelector('#arrow');
let wikiLinks = document.querySelectorAll('.wiki-link');
let changeElement = document.getElementById('update-wiki-link');

tooltip.addEventListener('transitionend', () => {
  if (tooltip.classList.contains('animEnd')) {
    tooltip.classList.remove('animEnd');
    tooltip.style.display = '';
  }
})

changeElement.addEventListener('input', (e) => {
  wikiLinks[0].innerHTML = e.target.value;
  wikiLinks[1].innerHTML = e.target.value;
})

function showTooltip() {
  tooltip.classList.add('animBegin');
}

function hideTooltip() {
  // console.log(!(tooltip.classList.contains('tooltip-hover') || tooltip.classList.contains('link-hover')));
  if (!(tooltip.classList.contains('tooltip-hover') || tooltip.classList.contains('link-hover')))
    if (tooltip.classList.contains('animBegin')) {
      tooltip.classList.remove('animBegin');
      tooltip.classList.add('animEnd');
    }
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
wikiLinks.forEach(function (elem) {
  // inspired by (taken from..?)
  // https://stackoverflow.com/questions/6231052/how-to-have-a-mouseover-event-fire-only-if-the-mouse-is-hovered-over-an-element
  elem.addEventListener('pointerover', (actionEvent) => {
    tooltip.classList.add('link-hover');
    timer = setTimeout(async () => {
      tooltip.style.display = 'grid';
      await getWikiExtract(actionEvent);
      showTooltip();
    }, linkTransTime)
  });

  elem.addEventListener('pointerleave', () => {
    tooltip.classList.remove('link-hover');
    clearTimeout(timer)
    setTimeout(() => {
      hideTooltip();
    }, linkTransTime);
  });

  elem.addEventListener('focus', (actionEvent) => {
    tooltip.classList.add('link-hover');
    timer = setTimeout(async () => {
      tooltip.style.display = 'grid';
      await getWikiExtract(actionEvent);
      showTooltip();
    }, linkTransTime)
  });

  elem.addEventListener('blur', () => {
    tooltip.classList.remove('link-hover');
    clearTimeout(timer)
    setTimeout(() => {
      hideTooltip();
    }, linkTransTime);
  });
})

tooltip.addEventListener('pointerover', () => {
  tooltip.classList.add('tooltip-hover');
})

tooltip.addEventListener('pointerleave', () => {
  tooltip.classList.remove('tooltip-hover');
  // add delay on fadeout to see if  user is hovering tooltip/link
  setTimeout(() => {
    hideTooltip();
  }, linkTransTime);
})

const wikiQueryMap = {
  "runescape": new RunescapeAPICall(),
  "wikipedia": new WikipediaAPICall()
};

async function getWikiExtract(domElement) {
  const link = domElement.target.innerHTML;

  // REVIEW: consider using revisions to cache dom changes.
  // for now, just TODO: aggressively cache.
  // rvprop: timestamp + prop: revisions

  let queryWiki = wikiQueryMap[domElement.target.getAttribute("query-wiki")];

  //
  await queryWiki.generateJsonResponse(link);
  domElement.target.href = queryWiki.queryUrl;
  tooltipText.innerHTML = queryWiki.summaryHTML ?? `<p>Query "<b>${link}</b>" not found.</p>`;
  tooltipThumb.setAttribute('src', queryWiki.thumbnailSrc);


  computePosition(domElement.target, tooltip, {
    middleware: [shift({ padding: 5 }), autoPlacement(),
    offset(6),
    arrow({ element: arrowElement })
    ]
  }).then(({ x, y, placement, middlewareData }) => {

    Object.assign(tooltip.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    const { x: arrowX, y: arrowY } = middlewareData.arrow;

    const staticSide = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right',
    }[placement.split('-')[0]];

    Object.assign(arrowElement.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
      right: '',
      bottom: '',
      [staticSide]: '-4px',
    });
  });
}
