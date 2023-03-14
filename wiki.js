export {
  ClassicMediaWikiAPICall,
  BaseWikiAPICall,
  RunescapeAPICall,
  WikipediaAPICall,
  UncyclopediaAPICall,
};


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
  generateQueryUrl(query) {};

  // returns an object
  extractSpecificObject(responseJson) {};

  // returns a string
  extractExtract(responseObject) {};

  // returns a string
  extractThumbnail(responseObject) {};

  extractQueryUrl(responseObject) {};

  // fills the needed attrs with what they're supposed to be
  // takes string
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

class ClassicMediaWikiAPICall extends BaseWikiAPICall {
  constructor(url) {
    super(url);
  }

  // returns an object
  extractSpecificObject(responseJson) {
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
      "origin": "*",
    });

    return this.url + params;
  }
}
class RunescapeAPICall extends ClassicMediaWikiAPICall {
  constructor() {
    super("https://runescape.wiki/api.php?");
  }
}


class UncyclopediaAPICall extends ClassicMediaWikiAPICall {
  constructor() {
    super("https://en.uncyclopedia.co/w/api.php?");
  }
}

class WikipediaAPICall extends BaseWikiAPICall {
  constructor() {
    super("https://en.wikipedia.org/api/rest_v1");
  }

  // returns an object
  extractSpecificObject(responseJson) {
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
