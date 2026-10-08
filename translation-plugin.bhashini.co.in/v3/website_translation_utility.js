var currentScript = document.currentScript;
// var TRANSLATION_PLUGIN_API_KEY = currentScript.getAttribute('secretKey');
// var posX = currentScript.getAttribute("data-pos-x") || 100;
// var posY = currentScript.getAttribute("data-pos-y") || 5;
var defaultTranslatedLanguage = currentScript.getAttribute(
  "default-translated-language"
);
var languageListAttribute = currentScript.getAttribute(
  "translation-language-list"
);

var initialPreferredLanguage = currentScript.getAttribute(
  "initial_preferred_language"
);

var isRedirection =
  currentScript.getAttribute("is-redirection") === "true" || false;

var isWcagNotification =
  currentScript.getAttribute("wcag-notification") === "true" || false;

var intlLanguageAttribute = currentScript.getAttribute("intl-language");
var languagesAttribute = currentScript.getAttribute("languages");

// Clear the target_lang session flag on actual navigation (not script re-execution)
window.addEventListener('beforeunload', function() {
  sessionStorage.removeItem('bhashini_from_target_lang');
});

/**
 * --------------------------------------------------------------------------
 * Domain Language Detection Configuration
 * 
 * This feature allows language-specific domains to automatically detect
 * which language they should display without hardcoding.
 * 
 * How it works:
 * 1. On page load, check if current domain is a language-specific domain
 * 2. If yes, backend returns the target language (e.g., "hi" for Hindi domain)
 * 3. Page auto-translates to that language
 * 
 * Example:
 * - Original: sandbox.digifootprint.gov.in (shows language selector)
 * - Hindi: सैंडबॉक्स.digifootprint.gov.in (auto-translates to Hindi)
 * 
 * Backend API: GET /redirection/language?domain=<current-domain>
 * Returns: { "targetLang": "hi", "originalUrl": "https://sandbox..." }
 * --------------------------------------------------------------------------
 */
// Answer is a property of origin + pathname, both fixed for the life of the
// document, so the lookup is made once and shared. Priority 2 below and the
// link-prefix keeper at the end of this file both need it, and on pages reached
// through a redirect only one of them runs — memoising by URL keeps either
// order correct without a second round trip.
var _domainLanguageInfoCache = {};

async function fetchDomainLanguageInfo() {
  // Send origin + pathname, not just origin. One hostname can serve several
  // languages by path (india.gov.in's Devanagari site: /hi, /br, /doi, /kok,
  // /mai, /mr, /ne, /sd), and without the path the backend cannot tell which
  // of them this page is — it would have to guess, and Priority 2 below acts
  // on the answer by translating the page and saving the preference. Query
  // and hash are left off: they never identify the language and only add
  // cache-busting noise.
  const currentDomain = window.location.origin + window.location.pathname;
  if (_domainLanguageInfoCache[currentDomain]) return _domainLanguageInfoCache[currentDomain];

  _domainLanguageInfoCache[currentDomain] = (async function () {
    try {
      const response = await fetch(
        `${TRANSLATION_PLUGIN_API_BASE_URL}/redirection/language?domain=${encodeURIComponent(currentDomain)}`
      );

      if (response.ok) {
        const data = await response.json();
        // replacementUrl carries the language marker this site uses. It is a
        // path prefix ('/br') when one host serves many languages, and empty
        // when the language is a whole subdomain.
        let languagePathPrefix = "";
        try {
          languagePathPrefix = new URL(data.replacementUrl).pathname.replace(/\/+$/, "");
        } catch (e) {
          languagePathPrefix = "";
        }
        console.log('[Bhashini] Domain configured for language:', data.targetLang,
          languagePathPrefix ? `(path prefix "${languagePathPrefix}")` : '(whole domain)');
        return {
          targetLang: data.targetLang,
          languagePathPrefix: languagePathPrefix,
          // Every marker this host uses, so the link keeper can recognise a
          // link that already points at another language.
          languagePathPrefixes: Array.isArray(data.languagePathPrefixes)
            ? data.languagePathPrefixes
            : (languagePathPrefix ? [languagePathPrefix] : [])
        };
      }
      if (response.status === 404) {
        // This is the original domain, not a language-specific one
        console.log('[Bhashini] Original domain detected');
        return null;
      }
      return null;
    } catch (error) {
      console.error('[Bhashini] Error detecting domain language:', error);
      return null;
    }
  })();

  return _domainLanguageInfoCache[currentDomain];
}

async function getDomainLanguage() {
  const info = await fetchDomainLanguageInfo();
  return info ? info.targetLang : null;
}

/**
 * Path prefix that marks the current page's language ('/br'), plus every marker
 * in use on this host. `prefix` is "" when this page is not on a path-prefixed
 * translated site.
 */
async function getLanguagePathPrefixInfo() {
  const info = await fetchDomainLanguageInfo();
  if (!info) return { prefix: "", all: [] };
  return { prefix: info.languagePathPrefix, all: info.languagePathPrefixes || [] };
}

/**
 * --------------------------------------------------------------------------
 * Language Ordering Configuration
 *
 * This section reads the `language_order` attribute from the <script> tag
 * used to include the plugin on the host website.
 *
 * Example usage in HTML or React:
 *   <script src="./translation_with_feedback_url.js" language_order="en,hi,ta"></script>
 *
 * The attribute `language_order` defines the preferred display order of languages
 * in the language dropdown menu. If not provided, languages will appear in their
 * default order.
 *
 * The value should be a comma-separated list of language codes:
 *   e.g., "en,hi,mr" → English, Hindi, Marathi shown at the top.
 *
 * Logic:
 *   - `orderLanguageArr` stores the ordered list of language codes.
 *   - The `getOrderedLanguages()` function (later in this file) reorders
 *     the global `supportedTargetLangArr` accordingly.
 *
 * Dependencies:
 *   - Uses `supportedTargetLangArr` to reorder UI display.
 *   - Applied before rendering dropdown in `fetchTranslationSupportedLanguages()`.
 * --------------------------------------------------------------------------
 */
// ------------------------------------------------------------------------------------------------------------------
var orderLanguageAttribute = currentScript.getAttribute("language_order");
var orderLanguageArr = [];
if (orderLanguageAttribute) {
  orderLanguageArr = orderLanguageAttribute
    .split(",")
    .map((lang) => lang.trim());
}
// ------------------------------------------------------------------------------------------------------------------

var TRANSLATION_PLUGIN_API_BASE_URL = (function () {
  var src = currentScript.getAttribute("src") || "";
  try {
    return new URL(src).origin;
  } catch (e) {
    // Relative src (e.g. /v3/website_translation_utility.js) — use current origin
    return window.location.origin;
  }
})();
var languageIconColor =
  currentScript.getAttribute("language-icon-color") || "#1D0A69";

// var TRANSLATION_PLUGIN_API_BASE_URL = "https://translation-plugin.bhashini.co.in/"
var mixedCode = currentScript.getAttribute("mixed-code") || false;
var languageDetection =
  currentScript.getAttribute("language-detection") || false;
var pageSourceLanguage =
  currentScript.getAttribute("page-source-language") || "en";
var isReload = currentScript.getAttribute("isReload") !== "false";
// Reassigned by the PDF translation feature (if enabled) so other parts of the
// plugin can re-check localStorage.preferredLanguage and show/hide the
// "Translate PDF" button without waiting for a page reload or DOM mutation.
var refreshPdfTranslateButtons = function () {};
var supportedTargetLangArr = [
  { code: "en", label: "English" },
  { code: "as", label: "Assamese (অসমীয়া)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "brx", label: "Bodo (बड़ो)" },
  { code: "doi", label: "Dogri (डोगरी)" },
  { code: "gom", label: "Goan Konkani (गोवा कोंकणी)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ks", label: "Kashmiri (कश्मीरी)" },
  { code: "mai", label: "Maithili (मैथिली)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
  { code: "mni", label: "Manipuri (মণিপুরী)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "ne", label: "Nepali (नेपाली)" },
  { code: "or", label: "Odia (ଓଡ଼ିଆ)" },
  { code: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "sa", label: "Sanskrit (संस्कृत)" },
  { code: "sat", label: "Santali (संताली)" },
  { code: "sd", label: "Sindhi (سنڌي)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ur", label: "Urdu (اردو)" },
];

/**
 * --------------------------------------------------------------------------
 * International Language Configuration
 *
 * International (non-Indian) languages are opt-in per site, and only the ones
 * named in the `intl-language` script attribute are added to the dropdown —
 * they appear alongside the Indian languages above.
 *
 * Example:
 *   <script src="./website_translation_utility.js" intl-language="fra,ar"></script>
 *   → dropdown = all Indian languages + French + Arabic
 *
 * The attribute accepts either the ISO 639-3 code the backend expects
 * ("fra", "arb") or the shorter ISO 639-1 code ("fr", "ar"); short codes are
 * normalised via `intlLanguageAliases` before use. Unknown codes are ignored
 * with a console warning.
 *
 * Codes match TranslationServiceId.INTL_SUPPORTED_LANGUAGES on the backend
 * (bhashini/intl/nmt). `en`, `hi` and `urd` are omitted here because they are
 * already served by the Indian language list above.
 * --------------------------------------------------------------------------
 */
var intlLanguageCatalog = [
  { code: "arb", label: "Arabic (العربية)" },
  // Chinese is "cmn", not "zho". The model answers to cmn ("Good morning" ->
  // 您好) and returns DHRUVA-101 for zho, which is why this looked unsupported.
  { code: "cmn", label: "Chinese (中文)" },
  { code: "deu", label: "German (Deutsch)" },
  { code: "est", label: "Estonian (Eesti)" },
  { code: "fin", label: "Finnish (Suomi)" },
  { code: "fra", label: "French (Français)" },
  { code: "ind", label: "Indonesian (Bahasa Indonesia)" },
  { code: "ita", label: "Italian (Italiano)" },
  { code: "jpn", label: "Japanese (日本語)" },
  { code: "kor", label: "Korean (한국어)" },
  { code: "mlt", label: "Maltese (Malti)" },
  { code: "nld", label: "Dutch (Nederlands)" },
  { code: "pes", label: "Persian (فارسی)" },
  { code: "pol", label: "Polish (Polski)" },
  { code: "por", label: "Portuguese (Português)" },
  { code: "ron", label: "Romanian (Română)" },
  { code: "rus", label: "Russian (Русский)" },
  { code: "slk", label: "Slovak (Slovenčina)" },
  { code: "spa", label: "Spanish (Español)" },
  { code: "swe", label: "Swedish (Svenska)" },
  { code: "swh", label: "Swahili (Kiswahili)" },
  { code: "tgk", label: "Tajik (Тоҷикӣ)" },
  { code: "tgl", label: "Tagalog" },
  { code: "tha", label: "Thai (ไทย)" },
  { code: "tur", label: "Turkish (Türkçe)" },
  { code: "ukr", label: "Ukrainian (Українська)" },
  { code: "uzn", label: "Uzbek (Oʻzbek)" },
  { code: "vie", label: "Vietnamese (Tiếng Việt)" },
];

// ISO 639-1 → ISO 639-3 so sites can write "fra,ar" or "fr,arb" interchangeably.
var intlLanguageAliases = {
  ar: "arb",
  zh: "cmn",
  de: "deu",
  et: "est",
  fi: "fin",
  fr: "fra",
  id: "ind",
  it: "ita",
  ja: "jpn",
  ko: "kor",
  mt: "mlt",
  nl: "nld",
  fa: "pes",
  pl: "pol",
  pt: "por",
  ro: "ron",
  ru: "rus",
  sk: "slk",
  es: "spa",
  sv: "swe",
  sw: "swh",
  tg: "tgk",
  tl: "tgl",
  th: "tha",
  tr: "tur",
  uk: "ukr",
  uz: "uzn",
  vi: "vie",
};

/**
 * Resolves the `intl-language` attribute into language objects, keeping the
 * order the site author listed them in and dropping duplicates/unknown codes.
 */
function getSelectedIntlLanguages(attributeValue) {
  if (!attributeValue) {
    return [];
  }

  const selected = [];
  const seen = new Set();

  attributeValue.split(",").forEach((rawCode) => {
    const code = rawCode.trim().toLowerCase();
    if (!code) {
      return;
    }

    const normalisedCode = intlLanguageAliases[code] || code;
    if (seen.has(normalisedCode)) {
      return;
    }

    const language = intlLanguageCatalog.find(
      (lang) => lang.code === normalisedCode
    );
    if (language) {
      seen.add(normalisedCode);
      selected.push(language);
    } else {
      console.warn(
        `[Bhashini] Unsupported international language code in intl-language: "${rawCode.trim()}"`
      );
    }
  });

  return selected;
}

/**
 * --------------------------------------------------------------------------
 * `languages` — one attribute controlling which groups appear in the dropdown
 * --------------------------------------------------------------------------
 * Accepts group names and/or individual international codes, comma-separated:
 *
 *   languages="indian"                  Indian languages only (the default)
 *   languages="indian,international"    Indian + every international language
 *   languages="international"           international only, no Indian
 *   languages="indian,fra,rus"          Indian + French and Russian
 *   languages="fra,rus"                 French and Russian only
 *
 * Group aliases: "indian" / "in", and "international" / "intl" / "all".
 *
 * The older `intl-language` attribute still works and is treated as
 * "indian + the codes listed", so existing sites need no change. When both are
 * present `languages` wins.
 */
var INDIAN_GROUP_TOKENS = ["indian", "in"];
var INTL_GROUP_TOKENS = ["international", "intl", "all"];

function resolveLanguageSelection(languagesValue, legacyIntlValue) {
  // No `languages` attribute — keep the legacy behaviour exactly.
  if (!languagesValue) {
    return {
      includeIndian: true,
      intlLanguages: getSelectedIntlLanguages(legacyIntlValue),
    };
  }

  var includeIndian = false;
  var includeAllIntl = false;
  var explicitCodes = [];

  languagesValue.split(",").forEach(function (rawToken) {
    var token = rawToken.trim().toLowerCase();
    if (!token) {
      return;
    }
    if (INDIAN_GROUP_TOKENS.indexOf(token) !== -1) {
      includeIndian = true;
    } else if (INTL_GROUP_TOKENS.indexOf(token) !== -1) {
      includeAllIntl = true;
    } else {
      explicitCodes.push(rawToken.trim());
    }
  });

  var intlLanguages = includeAllIntl
    ? intlLanguageCatalog.slice()
    : getSelectedIntlLanguages(explicitCodes.join(","));

  // Every token was unusable — fall back to Indian rather than render an
  // empty dropdown, and say why in the console.
  if (!includeIndian && intlLanguages.length === 0) {
    console.warn(
      '[Bhashini] The "languages" attribute matched no languages ' +
        '("' + languagesValue + '") — showing Indian languages instead.'
    );
    return { includeIndian: true, intlLanguages: [] };
  }

  return { includeIndian: includeIndian, intlLanguages: intlLanguages };
}

var languageSelection = resolveLanguageSelection(
  languagesAttribute,
  intlLanguageAttribute
);
var selectedIntlLanguages = languageSelection.intlLanguages;

if (!languageSelection.includeIndian) {
  // International-only: drop the Indian list but keep the page's source
  // language, otherwise the visitor cannot switch back to the original.
  var pageSourceCode = currentScript.getAttribute("page-source-language") || "en";
  supportedTargetLangArr = supportedTargetLangArr.filter(function (lang) {
    return lang.code === pageSourceCode;
  });
}

if (selectedIntlLanguages.length > 0) {
  supportedTargetLangArr = supportedTargetLangArr.concat(selectedIntlLanguages);
}

/**
 * --------------------------------------------------------------------------
 * Function: getOrderedLanguages(languageArray)
 *
 * Description:
 * Reorders the provided array of language objects (`languageArray`) based on
 * a preferred language code sequence defined in the global variable `orderLanguageArr`.
 *
 * This function ensures that preferred languages appear first in the dropdown,
 * while maintaining the order of all remaining languages afterward.
 *
 * Input:
 * - languageArray: Array of language objects with shape { code: string, label: string }
 *   Example:
 *     [
 *       { code: "hi", label: "Hindi" },
 *       { code: "en", label: "English" },
 *       ...
 *     ]
 *
 * Global Dependency:
 * - orderLanguageArr (e.g., ['en', 'hi', 'ta']) which is populated from the
 *   <script order_language="en,hi,ta"> tag attribute earlier in the script.
 *
 * Logic:
 * - Step 1: Create a shallow copy of the input array (`remainingLanguages`).
 * - Step 2: Loop through each code in `orderLanguageArr`:
 *     → If found in `remainingLanguages`, move it to `orderedLanguages`.
 *     → Remove it from `remainingLanguages` to prevent duplication.
 * - Step 3: Append the rest of the `remainingLanguages` to `orderedLanguages`.
 * - Step 4: Return the reordered array.
 *
 * Usage:
 * - Applied to `supportedTargetLangArr` before rendering the UI dropdown.
 *
 * Returns:
 * - A reordered array of languages.
 * --------------------------------------------------------------------------
 */
function getOrderedLanguages(languageArray) {
  if (orderLanguageArr.length === 0) {
    return languageArray;
  }

  const orderedLanguages = [];
  const remainingLanguages = [...languageArray];

  // First, add languages in the specified order
  orderLanguageArr.forEach((code) => {
    const foundIndex = remainingLanguages.findIndex(
      (lang) => lang.code === code
    );
    if (foundIndex !== -1) {
      orderedLanguages.push(remainingLanguages[foundIndex]);
      remainingLanguages.splice(foundIndex, 1);
    }
  });

  // Then add remaining languages
  orderedLanguages.push(...remainingLanguages);

  return orderedLanguages;
}

supportedTargetLangArr = getOrderedLanguages(supportedTargetLangArr);
// ------------------------------------------------------------------------------------------------------------------

var CHUNK_SIZE = 25;

// Define translationCache object to store original text
var translationCache = {};

// Flag to track whether content has been translated initially
var isContentTranslated = false;

// Debug mode - set to false for production
var BHASHINI_DEBUG = false;

// ============================================================================
// INTERSECTION OBSERVER-BASED TRANSLATION OPTIMIZATION
// Uses native browser API for efficient viewport detection
// Translates elements IMMEDIATELY when they become visible (no batching)
// ============================================================================

// Set to track nodes that have already been translated (to avoid duplicates)
var translatedNodesSet = new WeakSet();

// Map to track elements being observed and their associated translation data
// Key: element, Value: array of nodeData objects (supports multiple text nodes per parent)
var observedElementsMap = new Map();

// IntersectionObserver instance for lazy translation
var translationObserver = null;

// Translation queue for buffering API calls
var translationQueue = [];
var translationDebounceTimer = null;
var TRANSLATION_DEBOUNCE_DELAY = 50; // ms to wait for more nodes

// Timer for debounced sessionStorage writes
var sessionStorageWriteTimer = null;
var SESSION_STORAGE_WRITE_DELAY = 500;

/**
 * Debug logger - only logs when BHASHINI_DEBUG is true
 */
function debugLog() {
  if (BHASHINI_DEBUG && console && console.log) {
    console.log.apply(console, ['[Bhashini]'].concat(Array.prototype.slice.call(arguments)));
  }
}

/**
 * Debounced write to sessionStorage to avoid frequent writes
 */
function debouncedSessionStorageWrite() {
  if (sessionStorageWriteTimer) {
    clearTimeout(sessionStorageWriteTimer);
  }
  sessionStorageWriteTimer = setTimeout(function() {
    try {
      sessionStorage.setItem("translationCache", JSON.stringify(translationCache));
    } catch (e) {
      // sessionStorage might be full or disabled
      if (BHASHINI_DEBUG) console.warn('[Bhashini] Failed to write to sessionStorage:', e);
    }
  }, SESSION_STORAGE_WRITE_DELAY);
}

/**
 * Initialize IntersectionObserver for lazy translation
 * Elements are observed and translated when they enter viewport + 20% buffer
 */
function initTranslationObserver() {
  if (translationObserver) {
    return; // Already initialized
  }
  
  // Create observer with 100% bottom margin (rootMargin)
  // This means elements are detected one viewport height before they enter viewport
  translationObserver = new IntersectionObserver(
    handleIntersection,
    {
      root: null, // Use viewport as root
      rootMargin: '0px 0px 100% 0px', // 100% buffer below viewport
      threshold: 0 // Trigger as soon as any part is visible
    }
  );
  
  debugLog('IntersectionObserver initialized for lazy translation');
}

// Initialize observer early so MutationObserver can use it
initTranslationObserver();

/**
 * Handle intersection events - called when observed elements enter/exit viewport
 * IMMEDIATE MODE: Calls API right away for each visible element, no batching
 * @param {IntersectionObserverEntry[]} entries - Array of intersection entries
 */
function handleIntersection(entries) {
  var nodesToTranslate = [];
  
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var element = entry.target;
      
      // Get ALL translation data stored for this element (supports multiple text nodes)
      var translationDataArray = observedElementsMap.get(element);
      
      if (translationDataArray && translationDataArray.length > 0) {
        translationDataArray.forEach(function(translationData) {
          if (!translatedNodesSet.has(translationData.node)) {
            nodesToTranslate.push(translationData);
            // Mark as translated immediately to prevent re-queuing
            translatedNodesSet.add(translationData.node);
          }
        });
      }
      
      // Stop observing this element
      translationObserver.unobserve(element);
      
      // Clean up stored data
      observedElementsMap.delete(element);
    }
  });
  
  // Immediately translate all visible nodes (no batching, no waiting)
  if (nodesToTranslate.length > 0) {
    translateNodesImmediately(nodesToTranslate);
  }
}

/**
 * Queues nodes for translation and processes them in batches
 * Ensures we send requests of size CHUNK_SIZE whenever possible
 * @param {Array} nodes - Array of node data to translate
 */
function translateNodesImmediately(nodes) {
  if (!selectedTargetLanguageCode || selectedTargetLanguageCode === pageSourceLanguage) {
    return;
  }

  // Add to queue
  translationQueue.push(...nodes);
  
  // Process full chunks immediately
  while (translationQueue.length >= CHUNK_SIZE) {
    var chunk = translationQueue.splice(0, CHUNK_SIZE);
    processTranslationBatch(chunk);
  }
  
  // Schedule remaining nodes
  if (translationQueue.length > 0) {
    if (translationDebounceTimer) {
      clearTimeout(translationDebounceTimer);
    }
    
    translationDebounceTimer = setTimeout(function() {
      if (translationQueue.length > 0) {
        var remaining = translationQueue.splice(0, translationQueue.length);
        processTranslationBatch(remaining);
      }
      translationDebounceTimer = null;
    }, TRANSLATION_DEBOUNCE_DELAY);
  }
}

/**
 * Process a batch of nodes for translation
 * Makes API call for the batch
 * @param {Array} nodes - Array of node data to translate
 */
async function processTranslationBatch(nodes) {
  
  debugLog('Processing batch of', nodes.length, 'nodes');
  
  try {
    var textContentArray = nodes.map(function(item, index) {
      var id = "translation-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      translationCache[id] = item.content;
      
      if (item.node.parentNode && item.node.parentNode.setAttribute) {
        item.node.parentNode.setAttribute("data-translation-id", id);
      }
      
      return { text: item.content, id: id, node: item };
    });
    
    // Nodes are already batched/chunked by translateNodesImmediately logic mostly,
    // but just in case this function is called directly or with larger set
    var textChunks = chunkArray(textContentArray, CHUNK_SIZE);
    
    // Fire all chunk requests in parallel (no waiting between chunks)
    var promises = textChunks.map(async function(chunk) {
      var texts = chunk.map(function(item) { return item.text; });
      var translatedTexts = await translateTextChunks(texts, selectedTargetLanguageCode);
      
      chunk.forEach(function(item, index) {
        var translatedText = translatedTexts[index].target || texts[index];
        
        if (item.node.type === "text") {
          item.node.node.nodeValue = translatedText;
        }
        if (item.node.type === "value") {
          item.node.node.value = translatedText;
        }
        if (item.node.type === "placeholder") {
          item.node.node.placeholder = translatedText;
        }
        if (item.node.type === "title") {
          item.node.node.setAttribute("title", translatedText);
        }
      });
    });
    
    // Don't wait for completion - let all requests run in parallel
    Promise.all(promises).then(function() {
      debouncedSessionStorageWrite();
    }).catch(function(error) {
      console.error('[Bhashini] Error in parallel translation:', error);
    });
    
  } catch (error) {
    console.error('[Bhashini] Error translating nodes immediately:', error);
  }
}

/**
 * Observe a translatable node for visibility
 * Supports multiple text nodes per parent element
 * @param {Object} nodeData - Object with type, node, and content properties
 */
function observeNodeForTranslation(nodeData) {
  // Skip already translated nodes
  if (translatedNodesSet.has(nodeData.node)) {
    return;
  }
  
  // Get the element to observe (parent element for text nodes)
  var elementToObserve = nodeData.node;
  if (nodeData.node.nodeType === Node.TEXT_NODE) {
    elementToObserve = nodeData.node.parentElement;
  }
  
  if (!elementToObserve) {
    return;
  }
  
  // Check if we're already observing this element
  if (observedElementsMap.has(elementToObserve)) {
    // Add this nodeData to existing array (multiple text nodes in same parent)
    observedElementsMap.get(elementToObserve).push(nodeData);
  } else {
    // Start observing new element
    observedElementsMap.set(elementToObserve, [nodeData]);
    translationObserver.observe(elementToObserve);
  }
}

/**
 * Check if an element is currently visible in viewport + buffer
 * Used for initial page load to translate immediately visible content
 * @param {Element} element - The DOM element to check
 * @param {number} bufferPercent - Additional percentage of viewport height to include below
 * @returns {boolean} - True if element is in the extended viewport
 */
function isElementInViewport(element, bufferPercent) {
  bufferPercent = bufferPercent || 20;
  
  var checkElement = element;
  if (element.nodeType === Node.TEXT_NODE) {
    checkElement = element.parentElement;
  }

  if (!checkElement || !checkElement.getBoundingClientRect) {
    return false;
  }

  // <option> elements are hidden inside a collapsed <select> and return zero rect.
  // Use the parent <select>'s rect instead so options get translated with the select.
  if (checkElement.tagName === "OPTION") {
    var selectEl = checkElement.closest("select");
    if (selectEl) {
      // Library-managed selects (Select2, Chosen, etc.) hide the native <select>
      // with aria-hidden="true". Translating their <option> text triggers the
      // library's own MutationObserver on the <select>, causing it to re-render
      // and reset the selection to the first option.
      if (selectEl.getAttribute("aria-hidden") === "true") {
        return false;
      }
      checkElement = selectEl;
    }
  }
  
  var rect = checkElement.getBoundingClientRect();
  var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  var bufferHeight = viewportHeight * (bufferPercent / 100);
  
  return (
    rect.top < (viewportHeight + bufferHeight) &&
    rect.bottom > 0
  );
}

/**
 * Filter translatable content to only include visible elements
 * @param {Array} translatableContent - Array of translatable nodes
 * @param {number} bufferPercent - Buffer percentage below viewport
 * @returns {Array} - Filtered array of visible translatable nodes
 */
function filterVisibleNodes(translatableContent, bufferPercent) {
  bufferPercent = bufferPercent || 20;
  return translatableContent.filter(function(item) {
    if (translatedNodesSet.has(item.node)) {
      return false;
    }
    return isElementInViewport(item.node, bufferPercent);
  });
}

/**
 * Get all translatable nodes (without visibility filter)
 */
function getAllTextNodesToTranslate(rootNode) {
  var translatableContent = [];

  function isSkippableElement(node) {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      (node.classList.contains("dont-translate") ||
        node.classList.contains("bhashini-skip-translation") ||
        node.tagName === "SCRIPT" ||
        node.tagName === "STYLE" ||
        node.tagName === "NOSCRIPT")
    );
  }

  // Walks the FULL ancestor chain — a depth limit here would miss `bhashini-skip-translation`
  // on <body> or another high-level wrapper whenever traversal starts from a deep node
  // (which is what the MutationObserver does for dynamically added content).
  function isNodeOrAncestorsSkippable(node) {
    var currentNode =
      node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;

    while (currentNode) {
      if (isSkippableElement(currentNode)) {
        return true;
      }
      // Skip content inside library-managed selects (aria-hidden="true").
      // Translating <option> text inside these triggers Select2 / Chosen to
      // detect the change and reset the selection to the first option.
      if (currentNode.tagName === "SELECT" &&
          currentNode.getAttribute("aria-hidden") === "true") {
        return true;
      }
      currentNode = currentNode.parentElement;
    }

    return false;
  }

  function traverseNode(node) {
    if (Array.isArray(node)) {
      node.forEach(function(item) {
        if (item && typeof item === "object" && item.node) {
          traverseNode(item.node);
        } else {
          traverseNode(item);
        }
      });
      return;
    }

    if (!node || !node.nodeType) {
      return;
    }

    // Self-check only: traversal is top-down, so skippable ancestors have already
    // been rejected here or by the entry-point check below.
    if (isSkippableElement(node)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.textContent;
      var originalText =
        node.parentElement && node.parentElement.hasAttribute("bhashini-original-text")
          ? node.parentElement.getAttribute("bhashini-original-text")
          : text;
      var isNumeric = /^[\d.]+$/.test(text);
      if (text && !isIgnoredNode(node, originalText) && !isNumeric) {
        translatableContent.push({
          type: "text",
          node: node,
          content: originalText,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute("placeholder")) {
        var originalPlaceholder = node.hasAttribute("bhashini-original-placeholder")
          ? node.getAttribute("bhashini-original-placeholder")
          : node.getAttribute("placeholder");
        translatableContent.push({
          type: "placeholder",
          node: node,
          content: originalPlaceholder,
        });
      }
      if (node.hasAttribute("title")) {
        var originalTitle = node.hasAttribute("bhashini-original-title")
          ? node.getAttribute("bhashini-original-title")
          : node.getAttribute("title");
        translatableContent.push({
          type: "title",
          node: node,
          content: originalTitle,
        });
      }

      for (var i = 0; i < node.childNodes.length; i++) {
        traverseNode(node.childNodes[i]);
      }
    }
  }

  // Entry point: this is the only place the ancestor chain has to be inspected, because
  // `traverseNode` then works downwards from a root already known to be translatable.
  if (Array.isArray(rootNode)) {
    rootNode.forEach(function(item) {
      var candidate = item && typeof item === "object" && item.node ? item.node : item;
      if (!isNodeOrAncestorsSkippable(candidate)) {
        traverseNode(candidate);
      }
    });
  } else if (!isNodeOrAncestorsSkippable(rootNode)) {
    traverseNode(rootNode);
  }

  return translatableContent;
}

function persistOriginalNodeContent(nodeData, translationId) {
  var originalContent = nodeData.content;

  if (nodeData.type === "text" && nodeData.node.parentElement) {
    if (!nodeData.node.parentElement.hasAttribute("bhashini-original-text")) {
      nodeData.node.parentElement.setAttribute(
        "bhashini-original-text",
        originalContent
      );
    }
    nodeData.node.parentElement.setAttribute("data-translation-id", translationId);
    return originalContent;
  }

  if (nodeData.type === "placeholder" && nodeData.node) {
    if (!nodeData.node.hasAttribute("bhashini-original-placeholder")) {
      nodeData.node.setAttribute("bhashini-original-placeholder", originalContent);
    }
    nodeData.node.setAttribute("data-translation-id", translationId);
    return nodeData.node.getAttribute("bhashini-original-placeholder");
  }

  if (nodeData.type === "title" && nodeData.node) {
    if (!nodeData.node.hasAttribute("bhashini-original-title")) {
      nodeData.node.setAttribute("bhashini-original-title", originalContent);
    }
    nodeData.node.setAttribute("data-translation-id", translationId);
    return nodeData.node.getAttribute("bhashini-original-title");
  }

  if (nodeData.node.parentNode && nodeData.node.parentNode.setAttribute) {
    nodeData.node.parentNode.setAttribute("data-translation-id", translationId);
  }

  return originalContent;
}

function resetTranslationStateForInPlaceUpdate() {
  translatedNodesSet = new WeakSet();
  observedElementsMap.clear();
  translationQueue = [];

  if (translationDebounceTimer) {
    clearTimeout(translationDebounceTimer);
    translationDebounceTimer = null;
  }

  if (sessionStorageWriteTimer) {
    clearTimeout(sessionStorageWriteTimer);
    sessionStorageWriteTimer = null;
  }

  if (translationObserver) {
    translationObserver.disconnect();
  }

  initTranslationObserver();
}

/**
 * Setup IntersectionObserver for non-visible nodes
 * Called after initial visible content is translated
 * @param {Array} allNodes - All translatable nodes
 */
function observeHiddenNodes(allNodes) {
  var hiddenNodesCount = 0;
  
  allNodes.forEach(function(nodeData) {
    // Skip already translated nodes
    if (translatedNodesSet.has(nodeData.node)) {
      return;
    }
    
    // Observe for lazy translation
    observeNodeForTranslation(nodeData);
    hiddenNodesCount++;
  });
  
  debugLog('Observing', hiddenNodesCount, 'hidden nodes for lazy translation');
}

// Check for target_lang query param EARLY - before setting selectedTargetLanguageCode
// This prevents the MutationObserver from picking up the wrong language
var _earlyUrlParams = new URLSearchParams(window.location.search);
var _earlyTargetLang = _earlyUrlParams.get('target_lang');

// Selected target language for translation
// If target_lang param exists, use it directly (including the page's source
// language, which means no translation)
// This ensures MutationObserver has the correct language from the start
var selectedTargetLanguageCode;
if (_earlyTargetLang) {
  // Use the target_lang from URL - if it matches the page's source language, no translation needed
  selectedTargetLanguageCode = _earlyTargetLang === pageSourceLanguage ? null : _earlyTargetLang;
  console.log('[Bhashini] Early init: Using target_lang from URL:', _earlyTargetLang, '-> selectedTargetLanguageCode:', selectedTargetLanguageCode);
} else {
  // No target_lang in URL, use saved preference or initial preference
  selectedTargetLanguageCode = localStorage.getItem("preferredLanguage") || initialPreferredLanguage;
  // If saved preference matches the page's source language, also set to null (no translation needed)
  if (selectedTargetLanguageCode === pageSourceLanguage) {
    selectedTargetLanguageCode = null;
  }
  console.log('[Bhashini] Early init: Using localStorage/initial preference:', selectedTargetLanguageCode);
}

// Retrieve translationCache from session storage if available
if (sessionStorage.getItem("translationCache")) {
  translationCache = JSON.parse(sessionStorage.getItem("translationCache"));
}

  var cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = `${TRANSLATION_PLUGIN_API_BASE_URL}/v3/website_translation_utility.css`;
  // cssLink.href = `./plugin.css`;

  // Append link to the head
  document.head.appendChild(cssLink);


var selectedRating = 0;

var getPoweredByText = (lang) => {
  switch (lang) {
    case "kn":
      return "ಮೂಲಕ ನಡೆಸಲ್ಪಡುತ್ತಿದೆ";
    case "te":
      return "ఆధారితం";
    default:
      return "Powered by";
  }
};

/**
 * Returns the localized aria-label for the Language Translator button
 * based on the selected language code.
 */
var getLanguageTranslatorLabel = (lang) => {
  switch (lang) {
    case "as":
      return "ভাষা অনুবাদক";
    case "bn":
      return "ভাষা অনুবাদক";
    case "brx":
      return "रोखा सोलायनाय";
    case "doi":
      return "भाशा अनुवादक";
    case "gom":
      return "भाशा अणकारी";
    case "gu":
      return "ભાષા અનુવાદક";
    case "hi":
      return "भाषा अनुवादक";
    case "kn":
      return "ಭಾಷಾ ಅನುವಾದಕ";
    case "ks":
      return "زَبان ترجمہ کار";
    case "mai":
      return "भाषा अनुवादक";
    case "ml":
      return "ഭാഷാ വിവർത്തകൻ";
    case "mni":
      return "ꯂꯣꯟ ꯍꯟꯗꯣꯛꯄ";
    case "mr":
      return "भाषा अनुवादक";
    case "ne":
      return "भाषा अनुवादक";
    case "or":
      return "ଭାଷା ଅନୁବାଦକ";
    case "pa":
      return "ਭਾਸ਼ਾ ਅਨੁਵਾਦਕ";
    case "sa":
      return "भाषा अनुवादकः";
    case "sat":
      return "ᱯᱟᱹᱨᱥᱤ ᱛᱚᱨᱡᱚᱢᱟ";
    case "sd":
      return "ٻولي ترجمو ڪندڙ";
    case "ta":
      return "மொழி மொழிபெயர்ப்பாளர்";
    case "te":
      return "భాషా అనువాదకుడు";
    case "ur":
      return "زبان مترجم";
    default:
      return "Language Translator";
  }
};

/**
 * Updates the aria-label of the Language Translator button
 * based on the selected language.
 */
var updateTranslatorButtonLabel = (lang) => {
  var button = document.querySelector(".bhashini-dropdown-btn");
  if (button) {
    button.setAttribute("aria-label", getLanguageTranslatorLabel(lang));
  }
};

function toggleDropdown() {
  var dropdown = document.getElementById("bhashiniLanguageDropdown");
  var button = document.querySelector(".bhashini-dropdown-btn");
  var isExpanded = dropdown.style.display === "block";
  dropdown.style.display = isExpanded ? "none" : "block";
  button.setAttribute("aria-expanded", isExpanded ? "false" : "true");

  // Get measurements after showing the dropdown
  var dropdownHeight = dropdown.clientHeight;
  var dropdownWidth = dropdown.clientWidth;
  var windowHeight = window.innerHeight;
  var windowWidth = window.innerWidth;
  var dropdownRect = dropdown.getBoundingClientRect();

  // Handle vertical positioning
  var spaceBelow = windowHeight - dropdownRect.top;
  var spaceAbove = dropdownRect.top;

  if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
    dropdown.style.bottom = "100%";
    dropdown.style.top = "auto";
  } else {
    dropdown.style.top = "100%";
    dropdown.style.bottom = "auto";
  }

  // Handle horizontal positioning - check both left and right space
  var spaceRight = windowWidth - dropdownRect.left;
  var spaceLeft = dropdownRect.right;

  if (spaceRight < dropdownWidth && spaceLeft > spaceRight) {
    // Not enough space on right, and left has more space
    dropdown.style.right = "0";
    dropdown.style.left = "auto";
  } else {
    // Enough space on right, or right has more space than left
    dropdown.style.left = "0";
    dropdown.style.right = "auto";
  }
}

// Fetch supported translation languages
function fetchTranslationSupportedLanguages() {
  // false check commenting to test
  // if (window.__bhashiniLanguagesRendered) return;
  // window.__bhashiniLanguagesRendered = true;

  var targetLangSelectElement = document.getElementById(
    "bhashiniLanguageDropdown"
  );
  var brandingDiv = document.createElement("div");
  brandingDiv.setAttribute("class", "bhashini-branding");
  var poweredBy = document.createElement("span");
  poweredBy.textContent = getPoweredByText(selectedTargetLanguageCode);
  var bhashiniLogoLink = document.createElement("a");
  bhashiniLogoLink.href = "https://bhashini.gov.in";
  bhashiniLogoLink.target = "_blank";
  bhashiniLogoLink.rel = "noopener noreferrer";
  bhashiniLogoLink.setAttribute("aria-label", "Visit Bhashini website");
  var bhashiniLogo = document.createElement("img");
  bhashiniLogo.src = `${TRANSLATION_PLUGIN_API_BASE_URL}/v3/bhashini-logo.png`;
  bhashiniLogo.alt = "Bhashini Logo";
  bhashiniLogoLink.appendChild(bhashiniLogo);

  // feedback button
  // if (selectedTargetLanguageCode !== "en") {
  var feedbackDiv = document.createElement("div");
  feedbackDiv.setAttribute("class", "bhashini-feedback-div");
  feedbackDiv.setAttribute("title", "Feedback");
  // feedbackButton.innerHTML = `<img src=${TRANSLATION_PLUGIN_API_BASE_URL}/v2/feedback.svg alt="feedback">`;
  var feedbackButton = document.createElement("button");
  feedbackButton.setAttribute("class", "bhashini-feedback-button ");
  feedbackButton.setAttribute("title", "Feedback");
  feedbackButton.addEventListener("click", function () {
    var feedbackModal = document.querySelector(".bhashini-feedback-modal");
    feedbackModal.style.display = "block";

    // document.getElementById("current-page-url").textContent =
    // window.location.href; // This single line updates the URL
  });
  feedbackButton.innerHTML = `<img src=${TRANSLATION_PLUGIN_API_BASE_URL}/v3/feedback.svg alt="feedback">`;
  // feedbackButton.innerHTML = `<img src= feedback.svg alt="feedback">`;
  feedbackDiv.appendChild(feedbackButton);
  brandingDiv.appendChild(feedbackDiv);

  // }

  brandingDiv.appendChild(poweredBy);
  brandingDiv.appendChild(bhashiniLogoLink);

  /**
   * --------------------------------------------------------------------------
   * Language Display Filter and Ordering Logic
   *
   * Description:
   * Determines the final list of languages (`languagesToShow`) to be displayed
   * in the translation dropdown. This process respects both the `order_language`
   * and `translation-language-list` attributes set in the <script> tag.
   *
   * Workflow:
   * 1. By default, `languagesToShow` is initialized with the full list:
   *      → `supportedTargetLangArr` (which may already be reordered).
   *
   * 2. If `translation-language-list` attribute is provided in the script tag:
   *      → The list is filtered to include only the specified languages.
   *      → e.g., <script translation-language-list="en,hi,ta">
   *
   * 3. For each language in the filtered or full list:
   *      → Create a clickable div element with accessibility roles and data attributes.
   *      → Set the first item as `selected` (default language).
   *      → Append all language options to the dropdown container.
   *
   * 4. Accessibility Support:
   *      → Adds keyboard support for language selection via `Enter` key.
   *
   * Example:
   * <script
   *   src="translation_with_feedback_url.js"
   *   order_language="en,hi,ta"
   *   translation-language-list="en,hi,ta,bn,ml"
   * ></script>
   *
   * This will:
   *   - Filter dropdown to only English, Hindi, Tamil, Bengali, Malayalam.
   *   - Reorder those so English, Hindi, Tamil appear first.
   *
   * Dependencies:
   *   - `supportedTargetLangArr` (may already be reordered).
   *   - `languageListAttribute` (optional, filters final list).
   * --------------------------------------------------------------------------
   */
  let languagesToShow = supportedTargetLangArr;

  // Step 1: Filter languages if `translation-language-list` attribute is present
  if (languageListAttribute) {
    const languageList = languageListAttribute
      .split(",")
      .map((lang) => lang.trim());
    languagesToShow = supportedTargetLangArr.filter((lang) =>
      languageList.includes(lang.code)
    );
  }

  // Step 2: Render dropdown options (once, cleanly)
  targetLangSelectElement.innerHTML = ""; // clear before rendering
  var storedLanguage = localStorage.getItem("preferredLanguage");
  languagesToShow.forEach((element, index) => {
    const option_element = document.createElement("li");
    option_element.setAttribute("class", "dont-translate language-option");
    option_element.setAttribute("data-value", element.code);
    option_element.setAttribute("tabindex", "0");
    option_element.setAttribute("role", "option");

    // Parse label to separate English name and native script
    // Format: "Hindi (हिन्दी)" or just "English"
    const labelMatch = element.label.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    if (labelMatch) {
      const englishName = labelMatch[1].trim();
      const nativeScript = labelMatch[2] ? labelMatch[2].trim() : null;
      
      // Add English name as text
      option_element.appendChild(document.createTextNode(englishName + " "));
      
      // Add native script in span with lang attribute if available
      if (nativeScript) {
        const nativeSpan = document.createElement("span");
        nativeSpan.setAttribute("lang", element.code);
        nativeSpan.textContent = "(" + nativeScript + ")";
        option_element.appendChild(nativeSpan);
      }
    } else {
      // Fallback: use label as-is
      option_element.textContent = element.label;
    }

    // Set aria-selected based on stored preference in localStorage
    if (storedLanguage && element.code === storedLanguage) {
      option_element.setAttribute("aria-selected", "true");
    } else {
      option_element.setAttribute("aria-selected", "false");
    }

    targetLangSelectElement.appendChild(option_element);
  });

  // console.log("targetLangSelectElement: ", targetLangSelectElement);

  // Step 3: Accessibility – keyboard support
  targetLangSelectElement.addEventListener("keydown", function (event) {
    const languageOption = event.target.closest(".language-option");
    if (languageOption && event.key === "Enter") {
      event.preventDefault();
      selectLanguage(languageOption.textContent);
    }
  });

  // ------------------------------------------------------------------------------------------------------------------
  targetLangSelectElement.appendChild(brandingDiv);

  // Add single event listener to parent container using event delegation
  targetLangSelectElement.addEventListener("click", function (event) {
    var languageOption = event.target.closest(".language-option");
    if (languageOption) {
      selectLanguage(languageOption.textContent);
    }
  });

  // Update the Language Translator button aria-label for the initial language
  updateTranslatorButtonLabel(selectedTargetLanguageCode);
}

// Function to split an array into chunks of a specific size
function chunkArray(array, size) {
  var chunkedArray = [];
  for (var i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}

// Function to get all input and textArea element with placeholders

// Function to translate text chunks using custom API
async function translateTextChunks(chunks, target_lang) {
  // Nothing to translate — don't spend a request on an empty batch. A page that
  // opts out entirely (bhashini-skip-translation on <body>) collects zero nodes
  // and must make no API call at all.
  if (!chunks || chunks.length === 0) {
    return [];
  }

  if (pageSourceLanguage && pageSourceLanguage === target_lang) {
    // If the target language is the same as the page source language, return the original chunks
    return chunks.map((chunk) => ({ source: chunk, target: chunk }));
  }

  var payload = {
    // sourceLanguage: pageSourceLanguage,
    targetLanguage: target_lang,
    textData: chunks,
  };

  if (mixedCode === "true") {
    payload.mixed_code = true;
  }
  if (languageDetection === "true") {
    payload.languageDetection = true;
  } else {
    payload.sourceLanguage = pageSourceLanguage || "en";
  }

  try {
    var response = await fetch(
      `${TRANSLATION_PLUGIN_API_BASE_URL}/v2/translate-text`,
      {
        method: "POST",
        headers: {
          // 'auth-token': TRANSLATION_PLUGIN_API_KEY,
          "Content-Type": "application/json",
          "X-Utility-Version": "v3", // Identify this as v3 utility
        },
        body: JSON.stringify(payload),
      }
    );
    var data = await response.json();
    return data;
  } catch (error) {
    console.error("Error translating text:", error);
    return [];
  }
}

// function to get redirection url
// Sends full URL to backend, which extracts domain and preserves path/query/fragment

async function getRedirectionUrl(targetLang) {
  try {
    const res = await fetch(
      `${TRANSLATION_PLUGIN_API_BASE_URL}/redirection?url=${encodeURIComponent(
        window.location.href
      )}&target_lang=${targetLang}`
    );
    const data = await res.json();
    console.log(data, "redirection data");
    if (data && data.replacementUrl) {
      // Backend returns full URL with domain replaced but path/query preserved
      return data.replacementUrl;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching redirection URL:", error);
    return null;
  }
}

// Function to recursively traverse DOM tree and get text nodes while skipping elements with "dont-translate" class
// function getTextNodesToTranslate(rootNode) {
//   var translatableContent = [];

//   function isSkippableElement(node) {
//     return (
//       node.nodeType === Node.ELEMENT_NODE &&
//       (node.classList.contains("dont-translate") ||
//         node.classList.contains("bhashini-skip-translation") ||
//         node.tagName === "SCRIPT" ||
//         node.tagName === "STYLE" ||
//         node.tagName === "NOSCRIPT")
//     );
//   }

//   function traverseNode(node) {
//     // Skip the entire subtree if this is a skippable element
//     if (isSkippableElement(node)) {
//       return;
//     }

//     // Process this node
//     if (node.nodeType === Node.TEXT_NODE) {
//       var text = node.textContent;
//       var isNumeric = /^[\d.]+$/.test(text);
//       if (text && !isIgnoredNode(node) && !isNumeric) {
//         translatableContent.push({
//           type: "text",
//           node: node,
//           content: text,
//         });
//       }
//     } else if (node.nodeType === Node.ELEMENT_NODE) {
//       if (node.hasAttribute("placeholder")) {
//         translatableContent.push({
//           type: "placeholder",
//           node: node,
//           content: node.getAttribute("placeholder"),
//         });
//       }
//       if (node.hasAttribute("title")) {
//         translatableContent.push({
//           type: "title",
//           node: node,
//           content: node.getAttribute("title"),
//         });
//       }

//       // Process all child nodes
//       for (let i = 0; i < node.childNodes.length; i++) {
//         traverseNode(node.childNodes[i]);
//       }
//     }
//   }

//   traverseNode(rootNode);
//   return translatableContent;
// }

// Consolidated function - use getAllTextNodesToTranslate for consistency
// This wrapper maintains backward compatibility with existing code
function getTextNodesToTranslate(rootNode) {
  return getAllTextNodesToTranslate(rootNode);
}

/**
 * True when `node`, or ANY element above it, opts out of translation.
 *
 * Opting out is inherited: marking <body class="bhashini-skip-translation">
 * excludes the whole page, and marking a <div> excludes that div and
 * everything nested inside it. Checking only node.parentNode (as this file
 * used to) meant a marker on <body> was ignored for every text node deeper
 * than one level — which is most of them — so the page was translated anyway.
 */
function hasSkipTranslationAncestor(node) {
  var current =
    node && node.nodeType === Node.ELEMENT_NODE ? node : node && node.parentElement;

  while (current) {
    if (
      current.classList &&
      (current.classList.contains("bhashini-skip-translation") ||
        current.classList.contains("dont-translate"))
    ) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function isIgnoredNode(node, originalText) {
  var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;
  var isValidGovtEmail = (email) => {
    var normalizedEmail = email.replace(/\[dot]/g, ".").replace(/\[at]/g, "@");
    return emailRegex.test(normalizedEmail);
  };
  var nonEnglishRegex = /^[^A-Za-z0-9]+$/;
  var onlyNewLinesOrWhiteSpaceRegex = /^[\n\s\r\t]*$/;
  
  // Use original text for validation if provided, otherwise use current text
  var textToCheck = originalText || node.textContent;
  
  // Opt-out is inherited from any ancestor, not just the direct parent.
  if (hasSkipTranslationAncestor(node)) {
    return true;
  }

  return (
    (node.parentNode &&
      (node.parentNode.tagName === "STYLE" ||
        node.parentNode.tagName === "SCRIPT" ||
        node.parentNode.tagName === "NOSCRIPT" ||
        emailRegex.test(textToCheck) ||
        isValidGovtEmail(textToCheck) ||
        (languageDetection !== "true" &&
          pageSourceLanguage === "en" &&
          nonEnglishRegex.test(textToCheck)))) ||
    onlyNewLinesOrWhiteSpaceRegex.test(node.textContent)
  );
}

function selectLanguage(language) {
  console.log('[Bhashini] selectLanguage called with:', language);
  // Trim whitespace from language to handle extra spaces in textContent
  language = language.trim();
  // document.querySelector(".bhashini-dropdown-btn-text").textContent = language;
  document.getElementById("bhashiniLanguageDropdown").classList.remove("show");
  
  // Close dropdown and update aria-expanded
  var button = document.querySelector(".bhashini-dropdown-btn");
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
  
  var selectedLang = supportedTargetLangArr.find(
    (lang) => lang.label === language
  );
  console.log('[Bhashini] selectedLang found:', selectedLang);
  if (selectedLang) {
    // Update aria-selected on all language options
    var languageOptions = document.querySelectorAll(".language-option");
    languageOptions.forEach(function(option) {
      if (option.getAttribute("data-value") === selectedLang.code) {
        option.setAttribute("aria-selected", "true");
      } else {
        option.setAttribute("aria-selected", "false");
      }
    });
    
    onDropdownChange({ target: { value: selectedLang.code } });
  } else {
    console.log('[Bhashini] Language not found in supportedTargetLangArr!');
  }
}

window.onclick = function (event) {
  if (!event.target.matches(".bhashini-dropdown-btn")) {
    var dropdowns = document.getElementsByClassName(
      "bhashini-dropdown-content"
    );
    var button = document.querySelector(".bhashini-dropdown-btn");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
      if (openDropdown.style.display === "block") {
        openDropdown.style.display = "none";
        if (button) button.setAttribute("aria-expanded", "false");
      }
    }
  }
};

var handleCloseFeedbackModal = () => {
  var feedbackModal = document.querySelector(".bhashini-feedback-modal");
  feedbackModal.style.display = "none";
  var feedbackTextArea = document.querySelector(".feedback-textarea");
  feedbackTextArea.style.display = "none";
  selectedRating = 0;
  document.querySelectorAll(".star").forEach((star) => {
    star.classList.remove("selected");
  });
  var suggestedResponseCheckbox = document.getElementById(
    "suggested-feedback-checkbox"
  );
  suggestedResponseCheckbox.checked = false;
  var suggestedFeedbackContainer = document.querySelector(
    ".suggested-feedback-container"
  );
  suggestedFeedbackContainer.style.display = "none";
};

var handleFeedbackSubmission = async (rating, feedback, suggestedResponse) => {
  if (!rating) {
    showToast("Please provide rating");
    return;
  }
  if (rating <= 3 && !feedback) {
    showToast("Please describe your issue");
    return;
  }

  var suggestedResponseCheckbox = document.getElementById(
    "suggested-feedback-checkbox"
  );
  if (suggestedResponseCheckbox.checked && !suggestedResponse) {
    showToast("Please provide suggested response");
    return;
  }

  var submitButton = document.querySelector(".submit-feedback");
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  var payload = {
    feedbackTimeStamp: Math.floor(new Date().getTime() / 1000),
    feedbackLanguage: "en",
    pipelineInput: {
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: "en",
              targetLanguage: selectLanguage,
            },
            serviceId: "ai4bharat/indictrans-v2-all-gpu--t4",
          },
        },
      ],
      inputData: {
        input: [
          {
            source: "",
          },
        ],
        audio: [],
      },
    },
    pipelineOutput: {
      pipelineResponse: [
        {
          taskType: "translation",
          config: null,
          output: [
            {
              source: "",
              target: "",
            },
          ],
          audio: null,
        },
      ],
    },
    pipelineFeedback: {
      commonFeedback: [
        {
          question: "Are you satisfied with the pipeline response",
          feedbackType: "rating",
          rating: rating,
        },
        {
          question: "Describe your issue",
          feedbackType: "comment",
          comment: feedback,
        },
        {
          question: "Suggested Response",
          feedbackType: "comment",
          comment: suggestedResponse,
        },
      ],
    },
  };
  try {
    var res = await fetch(`${TRANSLATION_PLUGIN_API_BASE_URL}/v1/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    var data = await res.json();
    console.log(data);
    showToast("Feedback Submitted Successfully");
    submitButton.textContent = "Submit";
    submitButton.disabled = false;
    handleCloseFeedbackModal();
  } catch (err) {
    console.log(err);
    showToast("Error submitting feedback. Please try again later");
  }
};

var showFeedbackdiv = () => {
  var feedbackdiv = document.querySelector(".bhashini-feedback-div");
  feedbackdiv.style.visibility = "visible";
};

var hideFeedbackdiv = () => {
  var feedbackdiv = document.querySelector(".bhashini-feedback-div");
  feedbackdiv.style.visibility = "hidden";
};

var pluginContainer = document.querySelector(".bhashini-plugin-container");

// feedback button

// Create translation popup elements
var wrapperButton = document.createElement("div");
wrapperButton.setAttribute(
  "class",
  "dont-translate bhashini-skip-translation bhashini-dropdown"
);
wrapperButton.setAttribute("id", "bhashini-translation");
wrapperButton.setAttribute("title", "Translate this page!");
// wrapperButton.innerHTML = `<select class="translate-plugin-dropdown" id="translate-plugin-target-language-list"></select><img src=${TRANSLATION_PLUGIN_API_BASE_URL}/bhashini_logo.png alt="toggle translation popup">`;
wrapperButton.innerHTML = `
        <button role="combobox" aria-label="Language Translator" aria-expanded="false" aria-haspopup="listbox" aria-controls="bhashiniLanguageDropdown" class="bhashini-dropdown-btn">
          <div class="bhashini-dropdown-btn-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img"><path d="M14.125 3.735V12H12.91V3.735H11.815V2.67H15.685V3.735H14.125ZM8.47 2.52C9.25 2.52 9.845 2.715 10.255 3.105C10.675 3.495 10.885 3.985 10.885 4.575C10.885 5.005 10.77 5.395 10.54 5.745C10.32 6.085 9.99 6.355 9.55 6.555C9.11 6.755 8.56 6.865 7.9 6.885L7.825 5.835C8.505 5.815 8.985 5.695 9.265 5.475C9.555 5.255 9.7 4.96 9.7 4.59C9.7 4.23 9.58 3.97 9.34 3.81C9.11 3.65 8.84 3.57 8.53 3.57C8.16 3.57 7.825 3.62 7.525 3.72C7.225 3.82 6.905 3.955 6.565 4.125L6.19 3.09C6.45 2.95 6.77 2.82 7.15 2.7C7.54 2.58 7.98 2.52 8.47 2.52ZM11.05 8.73C11.05 9.19 10.945 9.575 10.735 9.885C10.525 10.195 10.24 10.425 9.88 10.575C9.53 10.725 9.13 10.8 8.68 10.8C8.11 10.8 7.58 10.66 7.09 10.38C6.61 10.1 6.15 9.655 5.71 9.045C5.28 8.435 4.855 7.64 4.435 6.66L5.5 6.27C5.79 6.98 6.09 7.595 6.4 8.115C6.72 8.625 7.06 9.02 7.42 9.3C7.78 9.57 8.165 9.705 8.575 9.705C8.955 9.705 9.265 9.62 9.505 9.45C9.745 9.27 9.865 8.985 9.865 8.595C9.865 8.115 9.7 7.7 9.37 7.35C9.04 7 8.64 6.68 8.17 6.39L9.055 6.345L9.7 6.21C9.84 6.33 9.995 6.475 10.165 6.645C10.335 6.815 10.47 6.985 10.57 7.155L10.645 7.44C10.775 7.63 10.875 7.83 10.945 8.04C11.015 8.25 11.05 8.48 11.05 8.73ZM11.29 6.75C11.77 6.75 12.185 6.715 12.535 6.645C12.885 6.565 13.295 6.44 13.765 6.27V7.35C13.335 7.54 12.945 7.665 12.595 7.725C12.255 7.785 11.88 7.815 11.47 7.815C11.32 7.815 11.145 7.805 10.945 7.785C10.745 7.755 10.555 7.725 10.375 7.695C10.205 7.655 10.08 7.62 10 7.59L9.295 6.75L9.385 6.525C9.675 6.595 9.98 6.65 10.3 6.69C10.62 6.73 10.95 6.75 11.29 6.75Z" fill=${languageIconColor}></path><path d="M19.63 22L18.426 18.906H14.464L13.274 22H12L15.906 11.962H17.04L20.932 22H19.63ZM18.048 17.786L16.928 14.762C16.9 14.6873 16.8533 14.552 16.788 14.356C16.7227 14.16 16.6573 13.9593 16.592 13.754C16.536 13.5393 16.4893 13.376 16.452 13.264C16.3773 13.5533 16.298 13.838 16.214 14.118C16.1393 14.3887 16.074 14.6033 16.018 14.762L14.884 17.786H18.048Z" fill="${languageIconColor}"></path></svg>
          </div>
        </button>
        <ul class="bhashini-dropdown-content" id="bhashiniLanguageDropdown" role="listbox" aria-label="Select language">
        </ul>
    `;
pluginContainer.appendChild(wrapperButton);

var modal = document.createElement("div");
modal.setAttribute("class", "bhashini-feedback-modal");
modal.innerHTML = `
  <div class="bhashini-feedback-content">
    <div class="close-modal-container">
        <span class="close-modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <mask id="mask0_10985_128804" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
    <rect width="16" height="16" fill="#D9D9D9"/>
  </mask>
  <g mask="url(#mask0_10985_128804)">
    <path d="M3.11214 13.8657L2.1875 12.9411L7.10099 8.02758L2.1875 3.11409L3.11214 2.18945L8.02562 7.10294L12.9391 2.18945L13.8637 3.11409L8.95026 8.02758L13.8637 12.9411L12.9391 13.8657L8.02562 8.95221L3.11214 13.8657Z" fill="#424242"/>
  </g>
</svg>
        </span>
    </div>
      <div
        class="bhashini-feedback-form"
      >
      <div class="bhashini-feedback-star-container">
      <h2
      class= "bhashini-feedback-heading"
      >Rate this translation</h2>
      <div class="star-rating">
         <span class="star" data-value="1">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="29" viewBox="0 0 30 29" fill="none">
            <path d="M13.0925 1.83921C13.8757 0.262891 16.1243 0.262888 16.9075 1.83921L19.8162 7.69337C20.1263 8.31759 20.7223 8.75057 21.4118 8.85265L27.8783 9.80991C29.6194 10.0677 30.3143 12.2063 29.0572 13.4382L24.3884 18.0136C23.8905 18.5014 23.6629 19.202 23.7789 19.8893L24.8667 26.3351C25.1596 28.0707 23.3404 29.3925 21.7803 28.5775L15.9861 25.5511C15.3683 25.2284 14.6317 25.2284 14.0139 25.5511L8.21972 28.5775C6.65956 29.3925 4.84036 28.0707 5.13328 26.3351L6.22111 19.8893C6.3371 19.202 6.10947 18.5014 5.61164 18.0136L0.942831 13.4382C-0.314316 12.2063 0.380554 10.0677 2.12174 9.80991L8.58821 8.85265C9.27772 8.75057 9.87367 8.31759 10.1838 7.69337L13.0925 1.83921Z" />
          </svg>
        </span>
          <span class="star" data-value="2">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="29" viewBox="0 0 30 29" fill="none">
            <path d="M13.0925 1.83921C13.8757 0.262891 16.1243 0.262888 16.9075 1.83921L19.8162 7.69337C20.1263 8.31759 20.7223 8.75057 21.4118 8.85265L27.8783 9.80991C29.6194 10.0677 30.3143 12.2063 29.0572 13.4382L24.3884 18.0136C23.8905 18.5014 23.6629 19.202 23.7789 19.8893L24.8667 26.3351C25.1596 28.0707 23.3404 29.3925 21.7803 28.5775L15.9861 25.5511C15.3683 25.2284 14.6317 25.2284 14.0139 25.5511L8.21972 28.5775C6.65956 29.3925 4.84036 28.0707 5.13328 26.3351L6.22111 19.8893C6.3371 19.202 6.10947 18.5014 5.61164 18.0136L0.942831 13.4382C-0.314316 12.2063 0.380554 10.0677 2.12174 9.80991L8.58821 8.85265C9.27772 8.75057 9.87367 8.31759 10.1838 7.69337L13.0925 1.83921Z" />
          </svg>
        </span>
         <span class="star" data-value="3">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="29" viewBox="0 0 30 29" fill="none">
            <path d="M13.0925 1.83921C13.8757 0.262891 16.1243 0.262888 16.9075 1.83921L19.8162 7.69337C20.1263 8.31759 20.7223 8.75057 21.4118 8.85265L27.8783 9.80991C29.6194 10.0677 30.3143 12.2063 29.0572 13.4382L24.3884 18.0136C23.8905 18.5014 23.6629 19.202 23.7789 19.8893L24.8667 26.3351C25.1596 28.0707 23.3404 29.3925 21.7803 28.5775L15.9861 25.5511C15.3683 25.2284 14.6317 25.2284 14.0139 25.5511L8.21972 28.5775C6.65956 29.3925 4.84036 28.0707 5.13328 26.3351L6.22111 19.8893C6.3371 19.202 6.10947 18.5014 5.61164 18.0136L0.942831 13.4382C-0.314316 12.2063 0.380554 10.0677 2.12174 9.80991L8.58821 8.85265C9.27772 8.75057 9.87367 8.31759 10.1838 7.69337L13.0925 1.83921Z" />
          </svg>
        </span>
          <span class="star" data-value="4">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="29" viewBox="0 0 30 29" fill="none">
            <path d="M13.0925 1.83921C13.8757 0.262891 16.1243 0.262888 16.9075 1.83921L19.8162 7.69337C20.1263 8.31759 20.7223 8.75057 21.4118 8.85265L27.8783 9.80991C29.6194 10.0677 30.3143 12.2063 29.0572 13.4382L24.3884 18.0136C23.8905 18.5014 23.6629 19.202 23.7789 19.8893L24.8667 26.3351C25.1596 28.0707 23.3404 29.3925 21.7803 28.5775L15.9861 25.5511C15.3683 25.2284 14.6317 25.2284 14.0139 25.5511L8.21972 28.5775C6.65956 29.3925 4.84036 28.0707 5.13328 26.3351L6.22111 19.8893C6.3371 19.202 6.10947 18.5014 5.61164 18.0136L0.942831 13.4382C-0.314316 12.2063 0.380554 10.0677 2.12174 9.80991L8.58821 8.85265C9.27772 8.75057 9.87367 8.31759 10.1838 7.69337L13.0925 1.83921Z" />
          </svg>
        </span>
          <span class="star" data-value="5">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="29" viewBox="0 0 30 29" fill="none">
            <path d="M13.0925 1.83921C13.8757 0.262891 16.1243 0.262888 16.9075 1.83921L19.8162 7.69337C20.1263 8.31759 20.7223 8.75057 21.4118 8.85265L27.8783 9.80991C29.6194 10.0677 30.3143 12.2063 29.0572 13.4382L24.3884 18.0136C23.8905 18.5014 23.6629 19.202 23.7789 19.8893L24.8667 26.3351C25.1596 28.0707 23.3404 29.3925 21.7803 28.5775L15.9861 25.5511C15.3683 25.2284 14.6317 25.2284 14.0139 25.5511L8.21972 28.5775C6.65956 29.3925 4.84036 28.0707 5.13328 26.3351L6.22111 19.8893C6.3371 19.202 6.10947 18.5014 5.61164 18.0136L0.942831 13.4382C-0.314316 12.2063 0.380554 10.0677 2.12174 9.80991L8.58821 8.85265C9.27772 8.75057 9.87367 8.31759 10.1838 7.69337L13.0925 1.83921Z" />
          </svg>
        </span>
      </div>
        </div>

       <!-- <div style="margin-top: 1rem;">
          <p> 
            <strong> Page URL: </strong> 
            <span id="current-page-url" style="text-decoration: underline;"> </span> 
          </p>
        </div> -->


     
      <textarea
      style = "display: none;"
        class="feedback-textarea"
      placeholder="Describe your issues here..."></textarea>
        <div class="suggested-feedback-container"
            style="display: none;"
        >
        <input type="checkbox" id="suggested-feedback-checkbox">

      <label for= "suggested-feedback-checkbox">Do you like to give feedback</label>
       

     
    <!-- <div style="margin-top: 1rem;">
      <span class="feedback-disclaimer">
       <strong style=" margin-right: 0.25rem;">Disclaimer:</strong>Please report any issues related to BHASHINI translated content only.
      </span>
     </div> -->


       <textarea
      style = "display: none;"
        class="feedback-suggested-feedback"
      placeholder="Suggested Feedback"></textarea>
        </div>
      <button class="submit-feedback">Submit</button>
      </div>
  </div>
`;

document.body.appendChild(modal);
console.log(document.querySelector(".close-modal"), "close");

// Close modal on click of close button
document.querySelector(".close-modal").addEventListener("click", () => {
  handleCloseFeedbackModal();
});

// Close modal when clicking outside the modal
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});
var stars = document.querySelectorAll(".star");
// Star Rating Selection
stars.forEach((star, index) => {
  star.addEventListener("mouseenter", function () {
    highlightStars(index, "hovered");
  });

  star.addEventListener("mouseleave", function () {
    removeHoverEffect();
  });

  star.addEventListener("click", function () {
    selectedRating = index + 1; // Store the selected rating
    highlightStars(index, "selected");
    var textArea = document.querySelector(".feedback-textarea");
    var suggestedFeedbackContainer = document.querySelector(
      ".suggested-feedback-container"
    );
    if (selectedRating < 4) {
      textArea.style.display = "block";
      suggestedFeedbackContainer.style.display = "block";
      var suggestedFeedbackCheckbox = document.getElementById(
        "suggested-feedback-checkbox"
      );
      suggestedFeedbackCheckbox.addEventListener("change", function () {
        var suggestedFeedback = document.querySelector(
          ".feedback-suggested-feedback"
        );
        if (this.checked) {
          suggestedFeedback.style.display = "block";
        } else {
          suggestedFeedback.style.display = "none";
        }
      });
    } else {
      textArea.style.display = "none";
      suggestedFeedbackContainer.style.display = "none";
    }
  });
});

function highlightStars(index, className) {
  stars.forEach((s, i) => {
    if (i <= index) {
      s.classList.add(className);
    } else {
      s.classList.remove(className);
    }
  });
}

function removeHoverEffect() {
  stars.forEach((s) => s.classList.remove("hovered"));
}
wrapperButton.addEventListener("click", (e) => {
  e.stopPropagation();
  e.preventDefault();
  toggleDropdown();
});

var submitFeedbackButton = document.querySelector(".submit-feedback");
submitFeedbackButton.addEventListener("click", () => {
  var feedbackText = document.querySelector(".feedback-textarea").value;
  var suggestedResponse = document.querySelector(
    ".feedback-suggested-feedback"
  ).value;
  handleFeedbackSubmission(selectedRating, feedbackText, suggestedResponse);
});

// Fetch supported translation languages
fetchTranslationSupportedLanguages();

// Function to translate dynamically added elements
// OPTIMIZED: Uses IntersectionObserver for hidden elements, translates visible immediately
async function translateElementText(element, target_lang) {
  var promises = [];
  var allTextNodes = getTextNodesToTranslate(element);
  
  // Separate visible and hidden nodes
  var visibleNodes = [];
  var hiddenNodes = [];
  
  allTextNodes.forEach(function(item) {
    // Skip already translated nodes
    if (translatedNodesSet.has(item.node)) {
      return;
    }
    
    if (isElementInViewport(item.node, 20)) {
      visibleNodes.push(item);
    } else {
      hiddenNodes.push(item);
    }
  });
  
  // Translate visible nodes immediately
  if (visibleNodes.length > 0) {
    var textContentArray = visibleNodes.map((node, index) => {
      var id = `translation-${Date.now()}-${index}`;
      var originalText = persistOriginalNodeContent(node, id);
      translationCache[id] = originalText;
      translatedNodesSet.add(node.node);
      return { text: originalText, id, node };
    });
    var textChunks = chunkArray(textContentArray, CHUNK_SIZE);

    // Create an array to hold promises for each chunk translation
    var textNodePromises = textChunks.map(async (chunk) => {
      var texts = chunk.map(({ text }) => text);
      var translatedTexts = await translateTextChunks(texts, target_lang);
      chunk.forEach(({ node }, index) => {
        var translatedText = translatedTexts[index].target || texts[index];

        if (node.type === "text") {
          node.node.nodeValue = translatedText;
        }
        if (node.type === "value") {
          node.node.value = translatedText;
        }
        if (node.type === "placeholder") {
          node.node.placeholder = translatedText;
        }
        if (node.type === "title") {
          node.node.setAttribute("title", translatedText);
        }
      });
    });
    promises.push(textNodePromises);

    await Promise.all(promises);
    
    // Debounced write to session storage
    debouncedSessionStorageWrite();
  }
  
  // Observe hidden nodes for lazy translation via IntersectionObserver
  if (hiddenNodes.length > 0 && translationObserver) {
    hiddenNodes.forEach(function(nodeData) {
      observeNodeForTranslation(nodeData);
    });
    debugLog('Added', hiddenNodes.length, 'dynamic hidden nodes to observer');
  }
}
var nodesToTranslate = []; // Array to store nodes and their associated language codes
var debounceTimer = null;
var DEBOUNCE_DELAY = 250;

function translateElementTextNodes(node, targetLangCode) {
  nodesToTranslate.push({ node, targetLangCode });

  // If we've reached 25 nodes, translate immediately.
  if (nodesToTranslate.length >= 25) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    translateElementText([...nodesToTranslate], targetLangCode);
    nodesToTranslate = [];
    return; // exit early to avoid setting a new timer below
  }

  // If no timer is currently active, set one for the first node.
  if (!debounceTimer) {
    debounceTimer = setTimeout(() => {
      translateElementText([...nodesToTranslate], targetLangCode);
      nodesToTranslate = [];
      debounceTimer = null;
    }, DEBOUNCE_DELAY);
  }
}

/**
 * Returns true when a node is inside a custom dropdown library's "selected display"
 * container (role="combobox") or any element marked bhashini-skip-mutation.
 *
 * Why we skip these:
 *   Searchable dropdown libraries (Select2, Tom Select, Choices.js, …) manage a
 *   role="combobox" area that shows the currently selected value.  When the plugin
 *   translates that text the library detects the DOM change, can't match the
 *   translated string to its internal English option-label cache, and resets the
 *   selection to the first option.
 *
 *   The dropdown *list* items (role="listbox" panel) are normally rendered outside
 *   the combobox container, so they are still translated via childList mutations.
 *
 * Clients can also add `bhashini-skip-mutation` to any container they want to
 * exclude from MutationObserver-triggered translation.
 */
function isInsideDropdownDisplay(node) {
  var el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
  while (el && el !== document.body) {
    if (el.classList && el.classList.contains("bhashini-skip-mutation")) {
      return true;
    }
    // Select2 names its listbox panel "select2-{selectId}-results".
    // If the corresponding <select> has bhashini-skip-translation, skip
    // the <li> items inside this panel too — otherwise translating them
    // causes Select2 to lose its internal state and reset to first option.
    if (el.getAttribute && el.getAttribute("role") === "listbox" && el.id) {
      var m = el.id.match(/^select2-(.+)-results$/);
      if (m) {
        var linkedSelect = document.getElementById(m[1]);
        if (linkedSelect && linkedSelect.classList &&
            linkedSelect.classList.contains("bhashini-skip-translation")) {
          return true;
        }
      }
    }
    el = el.parentElement;
  }
  return false;
}

// Create a new MutationObserver
var observer = new MutationObserver((mutations) => {
  // Skip translation if no target language set or if target matches page source language.
  if (!selectedTargetLanguageCode || selectedTargetLanguageCode === pageSourceLanguage) {
    return;
  }

  var nodesToProcess = new Set();

  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        // Skip nodes inside combobox display areas — translating them causes
        // searchable dropdown libraries to reset the selection (see isInsideDropdownDisplay).
        if (isInsideDropdownDisplay(node)) return;
        if (node.nodeType === Node.ELEMENT_NODE) {
          nodesToProcess.add(node);
        } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          // Frameworks may insert text nodes directly without wrapping element mutations.
          if (!isInsideDropdownDisplay(node.parentElement)) {
            nodesToProcess.add(node.parentElement);
          }
        }
      });
      return;
    }

    if (mutation.type === "characterData") {
      // React/Vue often update text by mutating existing text nodes.
      if (mutation.target && mutation.target.nodeType === Node.TEXT_NODE && mutation.target.parentElement) {
        // Skip combobox display areas (library-managed selected-value text).
        if (!isInsideDropdownDisplay(mutation.target)) {
          nodesToProcess.add(mutation.target.parentElement);
        }
      }
      return;
    }

    if (mutation.type === "attributes" && mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
      nodesToProcess.add(mutation.target);
    }
  });

  nodesToProcess.forEach(function(node) {
    translateElementTextNodes(node, selectedTargetLanguageCode);
  });
});

// Start observing the document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["placeholder", "title", "aria-label", "value"]
});

// check if isSelectedLangEnglish is present in sessionStorage
var isSelectedLang = sessionStorage.getItem("selectedLang");
if (isSelectedLang) {
  sessionStorage.removeItem("selectedLang");
  defaultTranslatedLanguage = null;
}

/**
 * --------------------------------------------------------------------------
 * Auto-Translation Initialization
 * 
 * Priority order for determining which language to use:
 * 1. URL query parameter target_lang (fallback from language-specific domain)
 * 2. Domain-specific language (from backend API) - ONLY if is-redirection="true"
 * 3. default-translated-language attribute (from script tag)
 * 4. initial_preferred_language attribute (from script tag)
 * 5. User's saved preference (localStorage)
 * 
 * This allows language-specific domains to work with the same codebase.
 * --------------------------------------------------------------------------
 */
(async function initializeTranslation() {
  var languageToUse = null;
  var isFromTargetLangParam = sessionStorage.getItem('bhashini_from_target_lang') === 'true';

  console.log('[Bhashini] === initializeTranslation START ===');
  console.log('[Bhashini] Current URL:', window.location.href);
  console.log('[Bhashini] isRedirection:', isRedirection);
  console.log('[Bhashini] defaultTranslatedLanguage:', defaultTranslatedLanguage);
  console.log('[Bhashini] isFromTargetLangParam (from session):', isFromTargetLangParam);

  // Priority 1: target_lang query param (explicit user selection from another domain)
  const urlParams = new URLSearchParams(window.location.search);
  const targetLangParam = urlParams.get('target_lang');
  console.log('[Bhashini] Priority 1 - target_lang param:', targetLangParam);
  if (targetLangParam) {
    console.log('[Bhashini] Priority 1 ACTIVE - Using target_lang:', targetLangParam);
    languageToUse = targetLangParam;
    isFromTargetLangParam = true;
    sessionStorage.setItem('bhashini_from_target_lang', 'true');

    // Save the preference (including 'en') so subsequent page loads remember the choice
    localStorage.setItem("preferredLanguage", targetLangParam);

    urlParams.delete('target_lang');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
    console.log('[Bhashini] URL cleaned, languageToUse:', languageToUse, 'isFromTargetLangParam:', isFromTargetLangParam);
  } else if (isFromTargetLangParam) {
    // We already processed target_lang, use the saved preference
    languageToUse = localStorage.getItem("preferredLanguage") || "en";
    console.log('[Bhashini] Priority 1 - Using saved preference from target_lang:', languageToUse);
  }

  // Priority 2: Domain-configured language (only when isRedirection)
  console.log('[Bhashini] Priority 2 check - languageToUse:', languageToUse, 'isRedirection:', isRedirection);
  if (!languageToUse && isRedirection) {
    console.log('[Bhashini] Priority 2 ENTERING - fetching domain language...');
    try {
      const domainLanguage = await getDomainLanguage();
      console.log('[Bhashini] Priority 2 - domainLanguage result:', domainLanguage);
      if (domainLanguage && domainLanguage !== "en") {
        console.log('[Bhashini] Priority 2 ACTIVE - Using domain-configured language:', domainLanguage);
        languageToUse = domainLanguage;
        localStorage.setItem("preferredLanguage", domainLanguage);
      }
    } catch (err) {
      console.error('[Bhashini] Error getting domain language:', err);
    }
  } else {
    console.log('[Bhashini] Priority 2 SKIPPED');
  }

  // Priority 3: default-translated-language attribute
  // SKIP redirect if we just processed a target_lang param (prevents bounce back)
  console.log('[Bhashini] Priority 3 check - languageToUse:', languageToUse, 'defaultTranslatedLanguage:', defaultTranslatedLanguage);
  if (!languageToUse && defaultTranslatedLanguage && defaultTranslatedLanguage !== "en") {
    console.log('[Bhashini] Priority 3 ENTERING');
    languageToUse = defaultTranslatedLanguage;
    console.log('[Bhashini] Priority 3 redirect check - isRedirection:', isRedirection, 'isFromTargetLangParam:', isFromTargetLangParam);
    if (isRedirection && !isFromTargetLangParam) {
      console.log('[Bhashini] Priority 3 - attempting redirect for:', languageToUse);
      try {
        const redirUrl = await getRedirectionUrl(languageToUse);
        if (redirUrl) {
          const redirHref = new URL(redirUrl).href;
          const currentHref = window.location.href;
          const redirOrigin = new URL(redirUrl).origin;
          const currentOrigin = window.location.origin;

          // Only redirect if origin is different AND URL differs
          if (redirOrigin !== currentOrigin && redirHref !== currentHref) {
            localStorage.setItem("preferredLanguage", languageToUse);
            sessionStorage.setItem('bhashini_redirected', '1');
            console.log('[Bhashini] Redirecting to foreign-origin language URL:', redirHref);
            window.location.href = redirHref;
            return;
          } else {
            console.log('[Bhashini] Skipping redirect — same origin or identical URL.');
          }
        } else {
          console.log('[Bhashini] No mapped URL returned for defaultTranslatedLanguage; falling back to in-place translation.');
        }
      } catch (err) {
        console.error('[Bhashini] Error while fetching redirection URL:', err);
      }
    } else {
      // Save preference even when redirect is skipped so next page load doesn't re-redirect
      localStorage.setItem("preferredLanguage", languageToUse);
      console.log('[Bhashini] Priority 3 redirect SKIPPED - isFromTargetLangParam:', isFromTargetLangParam);
    }
  } else {
    console.log('[Bhashini] Priority 3 SKIPPED - languageToUse already set or no defaultTranslatedLanguage');
  }

  // Priority 4: initial_preferred_language + isRedirection
  // Redirect if: no saved preference, OR saved preference matches initialPreferredLanguage.
  // If user chose a DIFFERENT language (e.g. they selected English explicitly), respect that choice.
  const savedPreference = localStorage.getItem("preferredLanguage");
  console.log('[Bhashini] Priority 4 check - languageToUse:', languageToUse, 'initialPreferredLanguage:', initialPreferredLanguage, 'savedPreference:', savedPreference);
  // Allow redirect if: no saved preference, OR saved preference matches initialPreferredLanguage
  // (i.e. user hasn't chosen a DIFFERENT language — respect site's redirect intent)
  const shouldRedirectForInitialPreference = !savedPreference || savedPreference === initialPreferredLanguage;
  if (!languageToUse && initialPreferredLanguage && initialPreferredLanguage !== "en" && isRedirection && shouldRedirectForInitialPreference) {
    console.log('[Bhashini] Priority 4 ACTIVE - Using initial preferred language:', initialPreferredLanguage);
    languageToUse = initialPreferredLanguage;
    if (isRedirection && !isFromTargetLangParam) {
      console.log('[Bhashini] Priority 4 - attempting redirect for:', languageToUse);
      try {
        const redirUrl = await getRedirectionUrl(languageToUse);
        if (redirUrl) {
          const redirHref = new URL(redirUrl).href;
          const currentHref = window.location.href;
          const redirOrigin = new URL(redirUrl).origin;
          const currentOrigin = window.location.origin;

          if (redirOrigin !== currentOrigin && redirHref !== currentHref) {
            localStorage.setItem("preferredLanguage", languageToUse);
            sessionStorage.setItem('bhashini_redirected', '1');
            console.log('[Bhashini] Priority 4 - Redirecting to foreign-origin language URL:', redirHref);
            window.location.href = redirHref;
            return;
          } else {
            console.log('[Bhashini] Priority 4 - Skipping redirect — same origin or identical URL.');
          }
        } else {
          console.log('[Bhashini] Priority 4 - No mapped URL returned; falling back to in-place translation.');
        }
      } catch (err) {
        console.error('[Bhashini] Priority 4 - Error while fetching redirection URL:', err);
      }
    } else {
      // Save preference even when redirect is skipped so next page load doesn't re-redirect
      localStorage.setItem("preferredLanguage", languageToUse);
      console.log('[Bhashini] Priority 4 redirect SKIPPED - isFromTargetLangParam:', isFromTargetLangParam);
    }
  } else {
    console.log('[Bhashini] Priority 4 SKIPPED - languageToUse:', languageToUse, 'savedPreference:', savedPreference);
  }

  // Priority 5: saved preference or initial preference (no redirect)
  if (!languageToUse) {
    languageToUse = localStorage.getItem("preferredLanguage") || initialPreferredLanguage;
    if (languageToUse) {
      console.log('[Bhashini] Priority 5 - Using saved/initial preference:', languageToUse);
    }
  }

  // If language determined and no redirect executed, do in-place translation
  // Translation is needed when:
  // 1. languageToUse is set AND
  // 2. Either languageToUse is not English, OR pageSourceLanguage is not English (translate TO English)
  if (languageToUse && (languageToUse !== "en" || pageSourceLanguage !== "en")) {
    console.log('[Bhashini] Translation needed - languageToUse:', languageToUse, 'pageSourceLanguage:', pageSourceLanguage);
    selectedTargetLanguageCode = languageToUse;
    isContentTranslated = true;
    translateAllTextNodes(languageToUse);
    scheduleInitialTranslationRescan(languageToUse);
  } else {
    console.log('[Bhashini] No translation needed - English source with English preference or no preference');
  }
})();

// var languageToUse =
//   defaultTranslatedLanguage && defaultTranslatedLanguage !== "en"
//     ? defaultTranslatedLanguage
//     : localStorage.getItem("preferredLanguage");
// if (languageToUse) {
//   selectedTargetLanguageCode = languageToUse;
//   // document.getElementById("translate-plugin-target-language-list").value =
//   //   languageToUse;
//   isContentTranslated = true;
//   translateAllTextNodes(languageToUse);
// }

// Function to handle dropdown change
async function onDropdownChange(event) {
  var selectedValue = event.target.value;
  console.log('[Bhashini] Dropdown changed to:', selectedValue);


  // Resolve human-readable label for notifications (WCAG 3.2.2)
  var selectedLangObj = supportedTargetLangArr.find(function(l) { return l.code === selectedValue; });
  var selectedLangLabel = selectedLangObj ? selectedLangObj.label : selectedValue;

  isContentTranslated = true;
  sessionStorage.setItem("selectedLang", selectedValue);
  if (!isRedirection) {
    localStorage.setItem("preferredLanguage", selectedValue);
  }

  // Notify user before any context change (WCAG 3.2.2), then navigate after a brief delay
  function notifyAndNavigate(message, navigate) {
    if (isWcagNotification) {
      showToast(message);
      setTimeout(navigate, 1500);
    } else {
      navigate();
    }
  }

  // Handle English selection
  if (selectedValue === "en") {
    console.log('[Bhashini] English selected');

    // If page source language is NOT English, we need to translate TO English
    if (pageSourceLanguage !== "en") {
      console.log('[Bhashini] Page source is not English, translating to English');
      localStorage.setItem("preferredLanguage", selectedValue);
      notifyAndNavigate('Translating this page to English.', function() {
        window.location.reload();
      });
      return;
    }

    // Page source is English - save English preference and reload
    console.log('[Bhashini] Page source is English - saving English preference');
    localStorage.setItem("preferredLanguage", "en");
    sessionStorage.removeItem('bhashini_from_target_lang');

    if (isRedirection) {
      // Use the redirection API - it will return original domain
      var redirectionUrl = await getRedirectionUrl(selectedValue);
      console.log('[Bhashini] Redirection URL for English:', redirectionUrl);
      if (redirectionUrl) {
        // Ensure target_lang=en is in the URL (backend may not include it)
        var url = new URL(redirectionUrl);
        if (!url.searchParams.has('target_lang')) {
          url.searchParams.set('target_lang', 'en');
        }
        console.log('[Bhashini] Final redirect URL:', url.href);
        notifyAndNavigate('Redirecting to the original version of this page.', function() {
          window.location.href = url.href;
        });
        return;
      }
    }
    // No redirection or already on original - just reload
    notifyAndNavigate('Reverting to the original language of this page.', function() {
      window.location.reload();
    });
    return;
  }

  // Perform translation for the selected language
  if (isRedirection) {
    // If the current domain is already the language-specific domain for the
    // selected language, skip the redirection lookup entirely. Otherwise
    // /redirection finds no forward mapping for "this domain + this language"
    // and falls back to its reverse-lookup branch, which bounces us back to
    // the original domain — even though we're already showing the right thing.
    console.log('[Bhashini] isRedirection is true, checking current domain language...');
    var currentDomainLanguage = await getDomainLanguage();
    var alreadyOnTargetDomain = !!currentDomainLanguage && currentDomainLanguage === selectedValue;
    console.log('[Bhashini] currentDomainLanguage:', currentDomainLanguage, 'alreadyOnTargetDomain:', alreadyOnTargetDomain);

    var redirectionUrl = alreadyOnTargetDomain ? null : await getRedirectionUrl(selectedValue);
    console.log('[Bhashini] Redirection URL received:', redirectionUrl);
    if (redirectionUrl) {
      console.log('[Bhashini] Redirecting to:', redirectionUrl);
      notifyAndNavigate('Redirecting to the ' + selectedLangLabel + ' version of this page.', function() {
        window.location.href = redirectionUrl;
      });
    } else {
      // Already on the target domain, or no redirection URL returned (404 or error) - translate in place
      console.log('[Bhashini] No redirect needed, translating in place');
      localStorage.setItem("preferredLanguage", selectedValue);
      if (isReload) {
        notifyAndNavigate('Translating this page to ' + selectedLangLabel + '.', function() {
          window.location.reload();
        });
      } else {
        resetTranslationStateForInPlaceUpdate();
        selectedTargetLanguageCode = selectedValue;
        translateAllTextNodes(selectedValue);
        scheduleInitialTranslationRescan(selectedValue);
        refreshPdfTranslateButtons();
      }
    }
  } else {
    if (isReload) {
      notifyAndNavigate('Translating this page to ' + selectedLangLabel + '.', function() {
        window.location.reload();
      });
    } else {
      resetTranslationStateForInPlaceUpdate();
      selectedTargetLanguageCode = selectedValue;
      translateAllTextNodes(selectedValue);
      scheduleInitialTranslationRescan(selectedValue);
      refreshPdfTranslateButtons();
    }
  }
}

// Function to show a toast messages
function showToast(message) {
  var toast = document.createElement("div");
  toast.className = "bhashini-toast";
  toast.textContent = message;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-label", message);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("visible");
    toast.classList.add("bhashini-skip-translation");
  }, 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Function to restore translations from session storage
// function restoreTranslations() {
//   var textNodes = getTextNodesToTranslate(document.body);
//   textNodes.forEach((node) => {
//     var id = node.parentNode.getAttribute("data-translation-id");
//     if (id && translationCache[id]) {
//       node.nodeValue = translationCache[id];
//     }
//   });
//   fetchTranslationSupportedLanguages();
// }

// Function to translate all text nodes in the document
async function translateAllTextNodes(target_lang) {
  var promises = [];
  
  // Get all text nodes from the document
  var allTextNodes = getAllTextNodesToTranslate(document.body);
  
  // Filter to only visible nodes (viewport + 20% buffer below)
  var textNodes = filterVisibleNodes(allTextNodes, 20);
  
  debugLog(' Total nodes:', allTextNodes.length, '| Visible nodes to translate:', textNodes.length);
  
  if (textNodes.length > 0) {
    var textContentArray = textNodes.map((node, index) => {
      var id = `translation-${Date.now()}-${index}`;
      var originalText = persistOriginalNodeContent(node, id);
      translationCache[id] = originalText;
      translatedNodesSet.add(node.node);
      return { text: originalText, id, node };
    });
    var textChunks = chunkArray(textContentArray, CHUNK_SIZE);

    // Create an array to hold promises for each chunk translation
    var textNodePromises = textChunks.map(async (chunk) => {
      var texts = chunk.map(({ text }) => text);
      // if (target_lang === "en") {
      //         return;
      // }
      var translatedTexts = await translateTextChunks(texts, target_lang);
      chunk.forEach(({ node }, index) => {
        var translatedText = translatedTexts[index].target || texts[index];

        if (node.type === "text") {
          node.node.nodeValue = translatedText;
        }
        if (node.type === "value") {
          node.node.value = translatedText;
        }
        if (node.type === "placeholder") {
          node.node.placeholder = translatedText;
        }
        if (node.type === "title") {
          node.node.setAttribute("title", translatedText);
        }
      });
    });
    promises.push(textNodePromises);

    // Wait for all translations to complete
    await Promise.all(promises);

    // var targetLangSelectElement = document.getElementById(
    //   "translate-plugin-target-language-list"
    // );
    // Check if the targetLangSelectElement exists
    // if (targetLangSelectElement) {
    //   // Loop through each option element
    //   Array.from(targetLangSelectElement.options).forEach((option) => {
    //     // Check if the value is not "en", not equal to target_lang, and not an empty string
    //     if (option.value === target_lang) {
    //       // Keep the default selected option if it's the target language
    //       option.selected = true;
    //     }
    //   });
    // } else {
    //   console.error("Target language select element not found.");
    // }
    const preferredLanguage = localStorage.getItem("preferredLanguage");

    if (isWcagNotification && preferredLanguage === "as") {
      showToast(
        `এই পৃষ্ঠাটো ভাষিণীৰ এআই-চালিত মডেল ব্যৱহাৰ কৰি অনুবাদ কৰা হৈছে। উৎসৰ বিষয়বস্তু ইংৰাজীত আছে। অনুবাদ সম্পৰ্কীয় যিকোনো প্ৰশ্নৰ বাবে, অনুগ্ৰহ কৰি ceo-dibd@digitalindia.gov.inত যোগাযোগ কৰক।`
      );
    } else if (preferredLanguage === "bn") {
      showToast(
        `এই পৃষ্ঠাটি ভাষিণীর এআই-পরিচালিত মডেল ব্যবহার করে অনুবাদ করা হয়েছে। উৎস বিষয়বস্তু ইংরেজিতে রয়েছে। অনুবাদ সম্পর্কিত যে কোনও প্রশ্নের জন্য, দয়া করে যোগাযোগ করুন এখানে ceo-dibd@digitalindia.gov.in`
      );
    } else if (preferredLanguage === "brx") {
      showToast(
        `बे पेजखौ भासिनीनि ए.आइ.-पावार मडेलफोरखौ बाहायनानै राव दानस्लायनाय जादों। फुंखा आयदाफोरा इंराजियाव दं। राव दानस्लायनायजों सोमोन्दो थानाय जायखिजाया सोंनायनि थाखाय, अन्नानै ceo-dibd@digitalindia.gov.in आव सोमोन्दो खालाम।`
      );
    } else if (preferredLanguage === "doi") {
      showToast(
        `इस सफे दा अनुवाद भाशिनी दे एआई-संचालत माडलें दा इस्तेमाल करियै कीता गेदा ऐ। स्रोत समग्गरी अंग्रेज़ी च ऐ। अनुवादै कन्नै सरबंधत कुसै बी सोआलै आस्तै, कृपा करियै ceo-dibd@digitalindia.gov.in कन्नै राबता करो।`
      );
    } else if (preferredLanguage === "gu") {
      showToast(
        `આ પૃષ્ઠનું ભાષાંતર ભાષિણીના એ.આઈ. સંચાલિત મોડેલોનો ઉપયોગ કરીને કરવામાં આવ્યું છે. સ્રોત સામગ્રી અંગ્રેજીમાં છે. અનુવાદ સંબંધિત કોઈપણ પ્રશ્નો માટે, કૃપા કરીને ceo-dibd@digitalindia.gov.in નો સંપર્ક કરો.`
      );
    } else if (preferredLanguage === "hi") {
      showToast(
        `इस पृष्ठ का अनुवाद भाषिणी के ए. आई.-संचालित मॉडल का उपयोग करके किया गया है। स्रोत सामग्री अंग्रेजी में है। अनुवाद से संबंधित किसी भी प्रश्न के लिए, कृपया ceo-dibd@digitalindia.gov.in से संपर्क करें।`
      );
    } else if (preferredLanguage === "kn") {
      showToast(
        `ಈ ಪುಟವನ್ನು ಭಾಷಿಣಿಯ ಎಐ-ಚಾಲಿತ ಮಾದರಿಗಳನ್ನು ಬಳಸಿ ಅನುವಾದಿಸಲಾಗಿದೆ. ಮೂಲ ವಿಷಯವು ಇಂಗ್ಲಿಷ್ನಲ್ಲಿದೆ. ಯಾವುದೇ ಅನುವಾದ-ಸಂಬಂಧಿತ ಪ್ರಶ್ನೆಗಳಿಗೆ, ದಯವಿಟ್ಟು ceo-dibd@digitalindia.gov.in ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`
      );
    } else if (preferredLanguage === "mai") {
      showToast(
        `एहि पृष्ठक अनुवाद भाषिणीक एआइ-सञ्चालित मॉडलक उपयोग करैत कयल गेल अछि। स्रोत सामग्री अङ्ग्रेजीमे अछि। अनुवादसँ सम्बन्धित कोनो प्रश्नक लेल कृपया ceo-dibd@digitalindia.gov.in सँ सम्पर्क करू।`
      );
    } else if (preferredLanguage === "ml") {
      showToast(
        `ഭാഷിണിയുടെ എഐ പവേഡ് മോഡലുകൾ ഉപയോഗിച്ചാണ് ഈ പേജ് വിവർത്തനം ചെയ്തിരിക്കുന്നത്. ഉറവിട ഉള്ളടക്കം ഇംഗ്ലീഷിലാണ്. വിവർത്തനവുമായി ബന്ധപ്പെട്ട എന്തെങ്കിലും ചോദ്യങ്ങൾക്ക് ദയവായി ceo-dibd@digitalindia.gov.in-മായി ബന്ധപ്പെടുക.`
      );
    } else if (preferredLanguage === "mr") {
      showToast(
        `हे पृष्ठ भाषिणीच्या ए. आय.-संचालित मॉडेल्सचा वापर करून अनुवादित केले गेले आहे. स्त्रोत मजकूर इंग्रजीत आहे. भाषांतराशी संबंधित कोणत्याही प्रश्नांसाठी, कृपया ceo-dibd@digitalindia.gov.in शी संपर्क साधा`
      );
    } else if (preferredLanguage === "ne") {
      showToast(
        `यो पृष्ठ भासिनीको एआई-संचालित मोडेलहरू प्रयोग गरेर अनुवाद गरिएको छ। स्रोत सामग्री अङ्ग्रेजीमा छ। कुनै पनि अनुवाद-सम्बन्धित प्रश्नहरूका लागि, कृपया ceo-dibd@digitalindia.gov.in मा सम्पर्क गर्नुहोस्।`
      );
    } else if (preferredLanguage === "or") {
      showToast(
        `ଏହି ପୃଷ୍ଠାଟିକୁ 'ଭାଷିଣୀ'ର ଏ.ଆଇ.-ଚାଳିତ ମଡେଲ୍‌ ବ୍ୟବହାର କରି ଅନୁବାଦ କରାଯାଇଛି। ମୂଳ ବିଷୟବସ୍ତୁ ଇଂରାଜୀରେ ଅଛି । ଅନୁବାଦ ସମ୍ବନ୍ଧୀୟ ଯେକୌଣସି ପ୍ରଶ୍ନ ପାଇଁ, ଦୟାକରି ceo-dibd@digitalindia.gov.in ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ ।`
      );
    } else if (preferredLanguage === "pa") {
      showToast(
        `ਇਸ ਪੰਨੇ ਦਾ ਅਨੁਵਾਦ ਭਾਸ਼ਣੀ ਦੇ ਏਆਈ-ਸੰਚਾਲਿਤ ਮਾਡਲਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਕੀਤਾ ਗਿਆ ਹੈ।  ਸਰੋਤ ਸਮੱਗਰੀ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਹੈ।  ਕਿਸੇ ਵੀ ਅਨੁਵਾਦ ਨਾਲ ਸਬੰਧਤ ਸਵਾਲਾਂ ਲਈ, ਕਿਰਪਾ ਕਰਕੇ ceo-dibd@digitalindia.gov.in 'ਤੇ ਸੰਪਰਕ ਕਰੋ।`
      );
    } else if (preferredLanguage === "sa") {
      showToast(
        `अस्य पृष्ठस्य अनुवादः भशिन्याः ए. ऐ.-शक्तियुक्तानि प्रतिरूपाणि उपयुज्य कृतः अस्ति। मूलविषयः आङ्ग्लभाषायाम् अस्ति। अनुवादसम्बद्धानां प्रश्नानां कृते कृपया ceo-dibd@digitalindia.gov.in सम्पर्कं करोतु।`
      );
    } else if (preferredLanguage === "sat") {
      showToast(
        `ᱱᱚᱣᱟ ᱯᱮᱡᱽ ᱫᱚ ᱵᱷᱟᱥᱤᱱᱤ ᱨᱮᱭᱟᱜ ᱮ ᱟᱭᱼᱯᱟᱣᱟᱨᱰ ᱢᱚᱰᱮᱞ ᱵᱮᱵᱷᱟᱨ ᱠᱟᱛᱮᱫ ᱛᱚᱨᱡᱚᱢᱟ ᱟᱠᱟᱱᱟ ᱾ ᱯᱷᱮᱰᱟᱛ ᱠᱚᱱᱴᱮᱱᱴ ᱫᱚ ᱤᱝᱜᱽᱞᱤᱥᱛᱮ ᱢᱮᱱᱟᱜᱼᱟ ᱾ ᱛᱚᱨᱡᱚᱢᱟ ᱤᱫᱤ ᱠᱟᱛᱮᱫ ᱡᱟᱦᱟᱱ ᱵᱟᱰᱟᱭ ᱞᱟᱹᱜᱤᱫ, ᱫᱟᱭᱟ ᱠᱟᱛᱮᱫ ceo-dibd@digitalindia.gov.in ᱥᱟᱶ ᱡᱳᱜᱟᱡᱳᱜᱽ ᱢᱮ ᱾ `
      );
    } else if (preferredLanguage === "ta") {
      showToast(
        `இந்தப் பக்கம் பாஷிணியின் செயற்கை நுண்ணறிவுடன் இயங்கும் மாதிரிகளைப் பயன்படுத்தி மொழிபெயர்க்கப்பட்டுள்ளது. மூல உள்ளடக்கம் ஆங்கிலத்தில் உள்ளது. மொழிபெயர்ப்பு தொடர்பான கேள்விகளுக்கு, தயவுசெய்து ceo-dibd@digitalindia.gov.in ஐ தொடர்பு கொள்ளவும்.`
      );
    } else if (preferredLanguage === "te") {
      showToast(
        `ఈ పేజీ భాషిణి యొక్క ఏఐ-ఆధారిత నమూనాలను ఉపయోగించి అనువదించబడింది. మూలం ఆంగ్లంలో ఉంది. అనువాదానికి సంబంధించిన ఏవైనా ప్రశ్నల కోసం, దయచేసి ceo-dibd@digitalindia.gov.in ను సంప్రదించండి.`
      );
    } else if (preferredLanguage === "ur") {
      showToast(
        `اس صفحے کا ترجمہ بھاشینی کے اے آئی سے چلنے والے ماڈلز کا استعمال کرتے ہوئے کیا گیا ہے۔ اصل مواد انگریزی میں ہے۔ ترجمے سے متعلق کسی بھی سوال کے لیے، براہ کرم ceo-dibd@digitalindia.gov.in سے رابطہ کریں۔`
      );
    } else if (preferredLanguage === "mni") {
      showToast(
        `ꯃꯁꯤꯒꯤ ꯆꯦꯐꯣꯡ ꯑꯁꯤ ꯚꯥꯁꯤꯅꯤꯒꯤ ꯑꯦ. ꯑꯥꯏ. ꯅ ꯆꯂꯥꯏꯕ ꯃꯣꯗꯦꯜꯁꯤꯡ ꯁꯤꯖꯤꯟꯅꯗꯨꯅ ꯍꯟꯗꯣꯛꯈ꯭ꯔꯦ ꯫ ꯁꯣꯔꯁꯀꯤ ꯃꯆꯥꯛ ꯑꯁꯤ ꯏꯪꯂꯤꯁꯇ ꯂꯩ ꯫ ꯍꯟꯗꯣꯛꯄꯒ ꯃꯔꯤ ꯂꯩꯅꯕ ꯆꯤꯡꯅꯕ ꯑꯃꯍꯦꯛꯇꯒꯤꯗꯃꯛ, ꯆꯥꯟꯕꯤꯗꯨꯅ ceo-dibd@digitalindia.gov.in ꯗ ꯀꯣꯟꯇꯦꯛ ꯇꯧꯕꯤꯌꯨ`
      );
    } else if (preferredLanguage === "sd") {
      showToast(
        `ھن صفحی جو ترجمو ڀاسنی جی ای-پاور ماڊل استعمال ڪندی ڪیو ویو آھی ذریعو مواد انگریزی ۾ آھی ترجمی سان لاڳاپیل ڪنھن بہ سوال لاء، مہربانی ڪری ceo-dibd@digitalindia.gov.in سان رابطو ڪریو`
      );
    } else if (preferredLanguage === "gom") {
      showToast(
        `भाशिनीचो एआय- संचालित मॉडेल वापरून ह्या पानाचें भाशांतर केलां. स्रोत मजकूर इंग्लीश भाशेंत आसा. भाशांतरा संबंदीत खंयच्याय प्रस्नां खातीर, उपकार करून ceo-dibd@digitalindia.gov.in कडेन संपर्क सादचो.`
      );
    } else if (preferredLanguage === "ks") {
      showToast(
        `امہِ صفُک ترجُمہٕ چھُ باشنی ہنٛد اے آیۍ پاور ماڈل استعمال کٔرتھ کرنہٕ آمُت۔ ماخذُک مواد چھُ انگریزی پٲٹھۍ۔ کُنہِ تہِ ترجمس مُتعلِق سوالَن باپتھ کٔرِو مہربٲنی کٔرِتھ ceo-dibd@digitalindia.gov.in پٮ۪ٹھ رٲبطہٕ۔`
      );
    } else {
      // No toast
    }

    // Update the Language Translator button aria-label for the selected language
    updateTranslatorButtonLabel(target_lang);
  }

  // Always observe remaining nodes, even if the first visible scan found nothing.
  observeHiddenNodes(allTextNodes);
}

function scheduleInitialTranslationRescan(target_lang) {
  function rescan() {
    if (!target_lang || target_lang === pageSourceLanguage) {
      return;
    }
    translateAllTextNodes(target_lang);
  }

  // Catch content that renders just after the initial scan during SPA mount.
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(function() {
      window.requestAnimationFrame(rescan);
    });
  }

  setTimeout(rescan, 800);
}

// Store translationCache in session storage
sessionStorage.setItem("translationCache", JSON.stringify(translationCache));

// Function to adjust widget position based on device width
var adjustWidgetPosition = () => {
  var wrapperButton = document.getElementById("bhashini-translation");
  if (window.innerWidth <= 768) {
    // Position for mobile devices
    wrapperButton.style.left = `calc(100vw - ${
      wrapperButton.offsetWidth + 10
    }px)`;
    wrapperButton.style.bottom = `10px`;
  } else if (window.innerWidth <= 1024) {
    // Position for tabvar devices
    wrapperButton.style.left = `calc(100vw - ${
      wrapperButton.offsetWidth + 20
    }px)`;
    wrapperButton.style.bottom = `20px`;
  }
};

// CSS for toast message and dropdown list
var toastStyles = `
    .bhashini-toast {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        opacity: 0;
        transition: opacity 0.3s ease, bottom 0.3s ease;
        z-index: 10000;
    }
    .bhashini-toast.visible {
        opacity: 1;
        bottom: 40px;
    }
  
    #bhashiniLanguageDropdown .language-option {
        list-style: none;
    }
`;

var styleSheet = document.createElement("style");
styleSheet.innerText = toastStyles;
document.head.appendChild(styleSheet);

// ─────────────────────────────────────────────────────────────────────────────
// PDF Translation Feature
//
// Scans the page for <a href="*.pdf"> links and injects a "Translate PDF"
// button next to each one.  On click:
//   1. Fetches the PDF (same-origin or via plugin backend for cross-origin)
//   2. POSTs to /pdf-translate on the plugin backend
//   3. Triggers a browser download of the translated PDF
//
// The target language is read from localStorage.preferredLanguage (already set
// by the language selector above).  If no preference is set, the button is
// hidden.  If the preferred language is the source language (English), the
// button is also hidden — no translation needed.
// ─────────────────────────────────────────────────────────────────────────────

(function initPdfTranslation() {
  var PDF_TRANSLATE_ENABLED = currentScript.getAttribute("pdf-translation") === "true";
  if (!PDF_TRANSLATE_ENABLED) return;

  var PDF_BTN_STYLE = [
    "display:inline-flex",
    "align-items:center",
    "gap:7px",
    "margin-left:8px",
    "padding:6px 13px",
    "font-size:12.5px",
    "font-weight:600",
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    "letter-spacing:0.2px",
    "border:1px solid rgba(255,255,255,0.12)",
    "border-radius:8px",
    "background:#1D0A69",
    "color:#fff",
    "cursor:pointer",
    "vertical-align:middle",
    "text-decoration:none",
    "box-shadow:0 1px 2px rgba(16,24,40,0.10),0 1px 3px rgba(16,24,40,0.08)",
    "transition:transform .12s ease,box-shadow .12s ease,background .12s ease",
    "white-space:nowrap",
    "line-height:1.3",
    "width:fit-content",
    "align-self:flex-start",
    "-webkit-font-smoothing:antialiased",
  ].join(";");

  // "languages" translate glyph — clearly signals translation (vs the old pencil).
  // Devanagari "अ" paired with Latin "A". The previous icon was Lucide's
  // "languages" glyph, whose left character is 文 — Chinese, which misrepresents
  // an Indian-languages service. "अ" is drawn as text rather than paths so it
  // stays correct at any size and uses the reader's own Devanagari font.
  var PDF_BTN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true" focusable="false"><text x="0" y="14" font-size="15" fill="currentColor" stroke="none" font-family="\'Noto Sans Devanagari\',\'Nirmala UI\',\'Mangal\',\'Kohinoor Devanagari\',sans-serif">&#2309;</text><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';

  function _applyBtnRest(btn) {
    btn.style.transform = "translateY(0)";
    btn.style.background = "#1D0A69";
    btn.style.boxShadow = "0 1px 2px rgba(16,24,40,0.10),0 1px 3px rgba(16,24,40,0.08)";
  }

  function createTranslateBtn() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("style", PDF_BTN_STYLE);
    btn.innerHTML = PDF_BTN_SVG + "Translate PDF";
    btn.className = "bhashini-pdf-translate-btn dont-translate bhashini-skip-translation";
    btn.onmouseover = function() {
      btn.style.background = "#2a149a";
      btn.style.transform = "translateY(-1px)";
      btn.style.boxShadow = "0 4px 10px rgba(29,10,105,0.28)";
    };
    btn.onmouseout = function() { _applyBtnRest(btn); };
    return btn;
  }

  function showPdfStatus(btn, msg, isError) {
    btn.innerHTML = msg;
    btn.disabled = !isError;
    // Stay in the indigo brand family; dim while working, solid when actionable.
    btn.style.background = isError ? "#1D0A69" : "#6b5ca6";
    btn.style.cursor = isError ? "pointer" : "default";
  }

  // ── Progress popup ─────────────────────────────────────────────────────────
  // A blocking modal shown while a PDF translation runs: warns the user not to
  // navigate away and displays live percentage. While it is active a
  // beforeunload handler also nudges the browser to confirm tab close/navigation.
  var _pdfModal = null;
  var _pdfJobActive = false;

  function _pdfBeforeUnload(e) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }

  function ensurePdfModal() {
    if (_pdfModal) return _pdfModal;
    var overlay = document.createElement("div");
    overlay.className = "dont-translate bhashini-skip-translation";
    overlay.setAttribute("style", [
      "position:fixed", "inset:0", "z-index:2147483647",
      "display:none", "align-items:center", "justify-content:center",
      "background:rgba(0,0,0,0.5)",
    ].join(";"));
    overlay.innerHTML = '<div style="' + PDF_CARD_STYLE + '">' + PDF_PROGRESS_HTML + '</div>';
    document.body.appendChild(overlay);
    _pdfModal = overlay;
    return overlay;
  }

  function showPdfModal(msg) {
    var m = ensurePdfModal();
    m.style.display = "flex";
    updatePdfModal(0, msg || "Starting…");
    if (!_pdfJobActive) {
      _pdfJobActive = true;
      window.addEventListener("beforeunload", _pdfBeforeUnload);
    }
  }

  function updatePdfModal(pct, msg) {
    if (!_pdfModal) return;
    var bar = _pdfModal.querySelector(".bhashini-pdf-modal-bar");
    var pctEl = _pdfModal.querySelector(".bhashini-pdf-modal-pct");
    var msgEl = _pdfModal.querySelector(".bhashini-pdf-modal-msg");
    if (bar) bar.style.width = (pct || 0) + "%";
    if (pctEl) pctEl.textContent = (pct || 0) + "%";
    if (msgEl && msg) msgEl.textContent = msg;
  }

  function hidePdfModal() {
    if (_pdfModal) _pdfModal.style.display = "none";
    if (_pdfJobActive) {
      _pdfJobActive = false;
      window.removeEventListener("beforeunload", _pdfBeforeUnload);
    }
  }

  var PDF_CARD_STYLE = 'background:#fff;border-radius:8px;padding:28px;max-width:400px;width:90%;' +
    'box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'max-height:92vh;overflow-y:auto;';

  // Wider card for the document-preview screen (embeds the PDF).
  var PDF_WIDE_CARD_STYLE = 'background:#fff;border-radius:8px;padding:24px;max-width:620px;width:94%;' +
    'box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'max-height:92vh;overflow-y:auto;';

  // Stepper: Document → Details → Verify → Done. `activeIdx` is 0-based; earlier
  // steps render as completed (green check), the active one orange, later ones grey.
  var PDF_STEPS = ["Document", "Details", "Verify", "Done"];
  function _pdfStepperHtml(activeIdx) {
    var out = '<div class="dont-translate" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">';
    for (var i = 0; i < PDF_STEPS.length; i++) {
      var done = i < activeIdx, active = i === activeIdx;
      var bg = done ? "#138808" : (active ? "#FF6F00" : "#e2e8f0");
      var fg = (done || active) ? "#fff" : "#94a3b8";
      var content = done ? "&#10003;" : (i + 1);
      var labelColor = active ? "#0f172a" : (done ? "#475569" : "#94a3b8");
      out +=
        '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:0 0 auto;width:56px;">' +
          '<div style="width:26px;height:26px;border-radius:50%;background:' + bg + ';color:' + fg + ';' +
            'font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">' + content + '</div>' +
          '<span style="font-size:9.5px;line-height:1.1;color:' + labelColor + ';text-align:center;">' + PDF_STEPS[i] + '</span>' +
        '</div>';
      if (i < PDF_STEPS.length - 1) {
        out += '<div style="flex:1 1 auto;height:2px;background:' + (i < activeIdx ? "#138808" : "#e2e8f0") + ';margin:13px 2px 0;"></div>';
      }
    }
    return out + '</div>';
  }

  var PDF_POWERED_BY_HTML =
    '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #f1f5f9;text-align:center;">' +
      '<a href="https://bhashini.gov.in" target="_blank" rel="noopener noreferrer" ' +
        'style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;">' +
        '<span style="font-size:10px;color:#94a3b8;letter-spacing:.04em;">Powered by</span>' +
        '<img src="' + TRANSLATION_PLUGIN_API_BASE_URL + '/v3/bhashini-logo.png" alt="BHASHINI" ' +
          'style="height:16px;vertical-align:middle;opacity:.8;">' +
      '</a>' +
    '</div>';

  var PDF_PROGRESS_HTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
      '<div style="font-size:13px;font-weight:600;color:#0f172a;letter-spacing:.01em;">Translating PDF</div>' +
      '<div class="bhashini-pdf-modal-pct" style="font-size:13px;font-weight:600;color:#1D0A69;font-variant-numeric:tabular-nums;">0%</div>' +
    '</div>' +
    '<div style="background:#e2e8f0;border-radius:2px;height:3px;overflow:hidden;margin-bottom:14px;">' +
      '<div class="bhashini-pdf-modal-bar" style="background:#FF6F00;height:100%;width:0%;transition:width .3s ease;"></div>' +
    '</div>' +
    '<div class="bhashini-pdf-modal-msg" style="font-size:12px;color:#64748b;line-height:1.5;">Starting…</div>' +
    '<div style="font-size:11px;color:#94a3b8;margin-top:8px;">Please keep this tab open.</div>' +
    PDF_POWERED_BY_HTML;

  // ── Remembered identity (email/name/purpose prefill only) ─────────────────
  // Convenience prefill for repeat users. OTP verification is ALWAYS required
  // for every full translation — identity is never a verification shortcut.
  var PDF_IDENTITY_KEY = "bhashini_pdf_identity";

  function _loadPdfIdentity() {
    try {
      return JSON.parse(localStorage.getItem(PDF_IDENTITY_KEY)) || {};
    } catch (e) { return {}; }
  }

  function _savePdfIdentity(email, name, purpose) {
    try {
      var cur = _loadPdfIdentity();
      localStorage.setItem(PDF_IDENTITY_KEY, JSON.stringify({
        email: email || cur.email, name: name || cur.name,
        purpose: purpose || cur.purpose,
      }));
    } catch (e) { /* storage full/blocked — non-fatal */ }
  }

  // ── Identity capture modal ──────────────────────────────────────────────────
  // ── OTP helper ─────────────────────────────────────────────────────────────
  function _sendOtp(email, filename, onSuccess, onError, srcLang, tgtLang, pdfUrl) {
    var fd = new FormData();
    fd.append("email", email);
    fd.append("filename", filename || "");
    if (srcLang) fd.append("source_lang", srcLang);
    if (tgtLang) fd.append("target_lang", tgtLang);
    // Lets the backend resolve whitelist status — whitelisted docs are
    // quota-exempt, so the pre-send quota check must not block them.
    if (pdfUrl) fd.append("pdf_url", pdfUrl);
    fetch(TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-translate/send-otp", { method: "POST", body: fd })
      .then(function(r) {
        if (r.ok) { onSuccess(); return; }
        r.json().then(function(d) { onError(d); })
          .catch(function() { onError({ message: "Failed to send code. Please try again." }); });
      })
      .catch(function() { onError({ message: "Network error. Please try again." }); });
  }

  // ── Identity capture modal (2-step: form → OTP; OTP skipped when a valid ────
  // device token is stored from a previous verification)
  // onSubmit signature: (email, name, purpose, otp, sourceLang, onOtpError)
  function showIdentityModal(approved, filename, pdfUrl, targetLang, onSubmit, onPreview) {
    var m = ensurePdfModal();
    // Only an explicitly whitelisted URL is delivered in the browser. "approved"
    // is also true when the domain has no whitelist at all, and those are
    // emailed — promising a direct download there is what misled users.
    var deliveryNote = isPriority(pdfUrl)
      ? 'Your translated PDF will be available for direct download.'
      : 'The translated PDF will be sent to your email address within 24 hours.';
    var _saved = _loadPdfIdentity();
    var _email = _saved.email || "", _name = _saved.name || "", _purpose = _saved.purpose || "";
    var _sourceLang = pageSourceLanguage || "en";

    // The PDF is fetched ONCE in the browser (where it's reachable — it's a link
    // on the page) and reused for both the preview iframe and the inspect call.
    // This avoids asking the backend to re-fetch a URL it may not be able to
    // reach (the source of the earlier 400s).
    var _pdfBlob = null, _pdfBlobUrl = null, _blobPromise = null;
    function _ensureBlob() {
      if (_blobPromise) return _blobPromise;
      _blobPromise = fetchPdfBlob(pdfUrl).then(function (b) {
        _pdfBlob = b;
        _pdfBlobUrl = URL.createObjectURL(b);
        return b;
      });
      return _blobPromise;
    }

    // Pre-submission inspection — page count, time estimate, scanned warning.
    var _inspectInfo = null;
    function _applyInspect(d, elId) {
      _inspectInfo = d;
      var el = document.getElementById(elId || "_bhashini_id_info");
      if (!el) return;
      var parts = [];
      if (d.total_pages) {
        parts.push(d.total_pages + (d.total_pages === 1 ? " page" : " pages"));
        parts.push(d.runs_immediately ? "processed shortly" : "delivered by email within 24 hours");
      }
      el.textContent = parts.join(" · ");
      if (!d.has_text_layer) {
        el.innerHTML = '<span style="color:#b45309;">&#9888; This looks like a scanned document — translation may take longer or fail.</span>'
          + (parts.length ? '<br>' + parts.join(" · ") : "");
      }
      el.style.display = (parts.length || !d.has_text_layer) ? "block" : "none";
    }

    function _fetchInspect(elId) {
      if (_inspectInfo) { _applyInspect(_inspectInfo, elId); return; }
      // Prefer sending the already-fetched bytes; fall back to URL if the blob
      // isn't available (e.g. cross-origin fetch blocked and no proxy).
      _ensureBlob().then(function (blob) {
        var fd = new FormData();
        fd.append("file", blob, filename || "document.pdf");
        fd.append("source_lang", _sourceLang);
        if (targetLang) fd.append("target_lang", targetLang);
        // Send the URL too. The bytes are what get inspected, but the backend
        // needs the URL to tell whether this document is whitelisted — a
        // whitelisted PDF runs immediately, and without this the modal claims
        // "delivered by email within 24 hours" and then downloads seconds later.
        if (pdfUrl) fd.append("pdf_url", pdfUrl);
        return fetch(TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-translate/inspect", { method: "POST", body: fd });
      }).then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) { if (d) _applyInspect(d, elId); })
        .catch(function () { /* inspect is best-effort — never blocks the flow */ });
    }

    function _srcLangLabel(code) {
      var found = supportedTargetLangArr.find(function(l) { return l.code === code; });
      return found ? found.label : code;
    }

    function _renderSrcLangOptions(query) {
      var listEl = document.getElementById("_bhashini_id_srclang_list");
      if (!listEl) return;
      var q = (query || "").trim().toLowerCase();
      var matches = !q ? supportedTargetLangArr : supportedTargetLangArr.filter(function(l) {
        return l.label.toLowerCase().indexOf(q) !== -1 || l.code.toLowerCase().indexOf(q) !== -1;
      });
      listEl.innerHTML = matches.length ? matches.map(function(l) {
        return '<div class="_bhashini_srclang_opt dont-translate" data-code="' + l.code + '" role="option" ' +
          'style="padding:8px 12px;font-size:13px;color:#0f172a;cursor:pointer;">' + l.label + '</div>';
      }).join("") : '<div style="padding:8px 12px;font-size:12px;color:#94a3b8;">No matching language</div>';
      listEl.style.display = "block";
    }

    function _renderForm() {
      m.querySelector("div").setAttribute("style", PDF_CARD_STYLE);
      m.querySelector("div").innerHTML =
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<button id="_bhashini_id_back" title="Back" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:16px;line-height:1;padding:2px 4px;">&#8592;</button>' +
            '<div style="font-size:15px;font-weight:600;color:#0f172a;">Your details</div>' +
          '</div>' +
          '<button id="_bhashini_id_close" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;line-height:1;padding:2px 4px;margin-top:2px;">&#10005;</button>' +
        '</div>' +
        _pdfStepperHtml(1) +
        '<div style="font-size:12px;color:#64748b;margin-bottom:20px;line-height:1.55;">' + deliveryNote + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div id="_bhashini_id_info" style="display:none;font-size:11px;color:#64748b;line-height:1.5;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;"></div>' +
          '<div style="position:relative;">' +
            '<label style="display:block;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Source language of the PDF</label>' +
            '<input id="_bhashini_id_srclang" type="text" role="combobox" aria-expanded="false" autocomplete="off" ' +
              'placeholder="Search language…" value="' + _srcLangLabel(_sourceLang) + '" ' +
              'style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;color:#0f172a;box-sizing:border-box;outline:none;">' +
            '<div id="_bhashini_id_srclang_list" role="listbox" class="dont-translate" style="display:none;position:absolute;top:calc(100% + 4px);' +
              'left:0;right:0;max-height:180px;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;' +
              'border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:10;"></div>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Email address</label>' +
            '<input id="_bhashini_id_email" type="email" placeholder="you@example.com" value="' + _email + '" ' +
              'style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;color:#0f172a;box-sizing:border-box;outline:none;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Full name</label>' +
            '<input id="_bhashini_id_name" type="text" placeholder="Your full name" value="' + _name + '" ' +
              'style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;color:#0f172a;box-sizing:border-box;outline:none;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Purpose</label>' +
            '<input id="_bhashini_id_purpose" type="text" placeholder="e.g. Research, Official use" value="' + _purpose + '" ' +
              'style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;color:#0f172a;box-sizing:border-box;outline:none;">' +
          '</div>' +
          '<div id="_bhashini_id_err" style="color:#dc2626;font-size:12px;display:none;"></div>' +
          '<button id="_bhashini_id_submit" ' +
            'style="width:100%;padding:11px 0;border-radius:4px;border:none;background:#FF6F00;color:#fff;' +
            'font-weight:600;font-size:13px;cursor:pointer;letter-spacing:.02em;">Send Verification Code</button>' +
        '</div>' +
        PDF_POWERED_BY_HTML;
      m.style.display = "flex";

      document.getElementById("_bhashini_id_back").onclick = function() { _renderPreview(); };

      var srcInput = document.getElementById("_bhashini_id_srclang");
      var srcList  = document.getElementById("_bhashini_id_srclang_list");
      srcInput.addEventListener("focus", function() { srcInput.setAttribute("aria-expanded", "true"); _renderSrcLangOptions(""); });
      srcInput.addEventListener("input", function() { srcInput.setAttribute("aria-expanded", "true"); _renderSrcLangOptions(srcInput.value); });
      srcInput.addEventListener("blur", function() { srcInput.setAttribute("aria-expanded", "false"); srcList.style.display = "none"; });
      // mousedown (not click) fires before the input's blur, and preventDefault keeps
      // focus on the input so the selection registers before the list is hidden.
      srcList.addEventListener("mousedown", function(e) {
        var opt = e.target.closest("._bhashini_srclang_opt");
        if (!opt) return;
        e.preventDefault();
        _sourceLang = opt.getAttribute("data-code");
        srcInput.value = _srcLangLabel(_sourceLang);
        srcList.style.display = "none";
      });

      document.getElementById("_bhashini_id_close").onclick = function() { hidePdfModal(); };
      _fetchInspect();
      document.getElementById("_bhashini_id_submit").onclick = function() {
        _email   = document.getElementById("_bhashini_id_email").value.trim();
        _name    = document.getElementById("_bhashini_id_name").value.trim();
        _purpose = document.getElementById("_bhashini_id_purpose").value.trim();
        var errEl = document.getElementById("_bhashini_id_err");
        var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!_email || !emailRe.test(_email)) { errEl.textContent = "Please enter a valid email address."; errEl.style.display = "block"; return; }
        if (!_name)    { errEl.textContent = "Please enter your name."; errEl.style.display = "block"; return; }
        if (!_purpose) { errEl.textContent = "Please describe the purpose."; errEl.style.display = "block"; return; }
        errEl.style.display = "none";
        var btn = document.getElementById("_bhashini_id_submit");

        // OTP is always required — send a code and move to the verify step.
        btn.textContent = "Sending…"; btn.disabled = true;
        _sendOtp(_email, filename, function() { _renderOtp(); }, function(d) {
          btn.textContent = "Send Verification Code"; btn.disabled = false;
          if (d.error === "quota_exceeded") { showQuotaBlockedModal(d.retry_after); return; }
          if (d.error === "unsupported_language" || d.error === "same_language") {
            errEl.textContent = d.message; errEl.style.display = "block"; return;
          }
          errEl.textContent = d.detail || d.message || "Failed to send code."; errEl.style.display = "block";
        }, _sourceLang, targetLang, pdfUrl);
      };
    }

    function _renderOtp() {
      m.querySelector("div").setAttribute("style", PDF_CARD_STYLE);
      m.querySelector("div").innerHTML =
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
          '<div style="font-size:15px;font-weight:600;color:#0f172a;">Verify your email</div>' +
          '<button id="_bhashini_otp_close" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;line-height:1;padding:2px 4px;margin-top:2px;">&#10005;</button>' +
        '</div>' +
        _pdfStepperHtml(2) +
        '<div style="font-size:12px;color:#64748b;margin-bottom:20px;line-height:1.55;">' +
          'Enter the 6-digit code sent to <strong style="color:#0f172a;">' + _email + '</strong>.' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div>' +
            '<label style="display:block;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Verification code</label>' +
            '<input id="_bhashini_otp_input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" ' +
              'style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:22px;font-weight:600;' +
              'color:#0f172a;letter-spacing:.35em;text-align:center;box-sizing:border-box;outline:none;font-variant-numeric:tabular-nums;">' +
          '</div>' +
          '<div id="_bhashini_otp_err" style="color:#dc2626;font-size:12px;display:none;"></div>' +
          '<button id="_bhashini_otp_submit" ' +
            'style="width:100%;padding:11px 0;border-radius:4px;border:none;background:#FF6F00;color:#fff;' +
            'font-weight:600;font-size:13px;cursor:pointer;letter-spacing:.02em;">Verify &amp; Submit</button>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<button id="_bhashini_otp_back" style="background:none;border:none;color:#64748b;font-size:12px;cursor:pointer;padding:0;text-decoration:underline;">Back</button>' +
            '<span id="_bhashini_otp_timer" style="font-size:11px;color:#94a3b8;"></span>' +
            '<button id="_bhashini_otp_resend" style="display:none;background:none;border:none;color:#FF6F00;font-size:12px;cursor:pointer;padding:0;font-weight:600;">Resend code</button>' +
          '</div>' +
        '</div>' +
        PDF_POWERED_BY_HTML;
      m.style.display = "flex";

      document.getElementById("_bhashini_otp_close").onclick = function() { hidePdfModal(); };
      document.getElementById("_bhashini_otp_back").onclick  = function() { _renderForm(); };

      var secs = 60;
      var timerEl  = document.getElementById("_bhashini_otp_timer");
      var resendEl = document.getElementById("_bhashini_otp_resend");
      timerEl.textContent = "Resend in 1:00";
      var _ct = setInterval(function() {
        secs--;
        if (!document.getElementById("_bhashini_otp_timer")) { clearInterval(_ct); return; }
        if (secs > 0) {
          timerEl.textContent = "Resend in 0:" + (secs < 10 ? "0" : "") + secs;
        } else {
          clearInterval(_ct);
          timerEl.style.display = "none";
          resendEl.style.display = "inline";
        }
      }, 1000);

      document.getElementById("_bhashini_otp_resend").onclick = function() {
        resendEl.style.display = "none"; timerEl.style.display = "inline"; timerEl.textContent = "Resend in 1:00";
        secs = 60;
        _ct = setInterval(function() {
          secs--;
          if (!document.getElementById("_bhashini_otp_timer")) { clearInterval(_ct); return; }
          if (secs > 0) {
            timerEl.textContent = "Resend in 0:" + (secs < 10 ? "0" : "") + secs;
          } else { clearInterval(_ct); timerEl.style.display = "none"; resendEl.style.display = "inline"; }
        }, 1000);
        _sendOtp(_email, filename, function() {}, function(d) {
          if (d.error === "quota_exceeded") { showQuotaBlockedModal(d.retry_after); return; }
          var e = document.getElementById("_bhashini_otp_err");
          if (e) { e.textContent = d.detail || d.message || "Failed to send code."; e.style.display = "block"; }
        }, _sourceLang, targetLang, pdfUrl);
      };

      document.getElementById("_bhashini_otp_submit").onclick = function() {
        var otp = document.getElementById("_bhashini_otp_input").value.replace(/\s/g, "");
        var errEl = document.getElementById("_bhashini_otp_err");
        var submitBtn = document.getElementById("_bhashini_otp_submit");
        if (!/^\d{6}$/.test(otp)) { errEl.textContent = "Please enter the 6-digit code."; errEl.style.display = "block"; return; }
        errEl.style.display = "none";
        submitBtn.textContent = "Verifying…"; submitBtn.disabled = true;
        // Don't replace the modal yet — wait until OTP is confirmed valid
        onSubmit(_email, _name, _purpose, otp, _sourceLang, function(msg) {
          // OTP was wrong — stay on this screen, show error + resend immediately
          submitBtn.textContent = "Verify & Submit"; submitBtn.disabled = false;
          errEl.textContent = msg || "Invalid or expired code."; errEl.style.display = "block";
          clearInterval(_ct); timerEl.style.display = "none"; resendEl.style.display = "inline";
        });
      };
    }

    // ── Screen 0: Document preview ────────────────────────────────────────────
    // Shows the actual PDF, its name, target language, and a Translate button.
    // This is the engaging entry point; the stepper sits at "Document".
    function _renderPreview() {
      var tgtLabel = _srcLangLabel(targetLang);
      m.querySelector("div").setAttribute("style", PDF_WIDE_CARD_STYLE);
      m.querySelector("div").innerHTML =
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">' +
          '<div style="font-size:16px;font-weight:700;color:#0f172a;">Translate PDF</div>' +
          '<button id="_bhashini_id_close" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1;padding:2px 4px;">&#10005;</button>' +
        '</div>' +
        _pdfStepperHtml(0) +
        '<div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px;word-break:break-word;">' + filename + '</div>' +
        '<div id="_bhashini_pv_meta" style="font-size:12px;color:#64748b;margin-bottom:14px;">Translate to <strong style="color:#1D0A69;">' + tgtLabel + '</strong></div>' +
        '<div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;height:340px;background:#f8fafc;margin-bottom:16px;position:relative;">' +
          '<div id="_bhashini_pv_loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#94a3b8;">Loading preview…</div>' +
          '<iframe id="_bhashini_pv_frame" style="width:100%;height:100%;border:none;position:relative;display:none;" title="Document preview"></iframe>' +
        '</div>' +
        '<button id="_bhashini_pv_translate" ' +
          'style="width:100%;padding:12px 0;border-radius:6px;border:none;background:#FF6F00;color:#fff;' +
          'font-weight:600;font-size:14px;cursor:pointer;letter-spacing:.02em;">Translate this PDF &rarr;</button>' +
        (onPreview ?
          '<button id="_bhashini_pv_preview" ' +
            'style="width:100%;margin-top:10px;padding:9px 0;border-radius:6px;border:1px solid #e2e8f0;background:transparent;' +
            'color:#475569;font-weight:500;font-size:12px;cursor:pointer;">Preview first page free (no sign-in)</button>' : '') +
        PDF_POWERED_BY_HTML;
      m.style.display = "flex";

      document.getElementById("_bhashini_id_close").onclick = function() { hidePdfModal(); };
      document.getElementById("_bhashini_pv_translate").onclick = function() { _renderForm(); };
      if (onPreview) {
        document.getElementById("_bhashini_pv_preview").onclick = function() { hidePdfModal(); onPreview(_sourceLang); };
      }

      // Render the PDF from the client-fetched blob (same-origin blob: URL, so no
      // cross-origin X-Frame-Options issues). Fall back to the direct URL.
      var frame = document.getElementById("_bhashini_pv_frame");
      var loading = document.getElementById("_bhashini_pv_loading");
      function _showFrame(src) {
        if (!frame) return;
        frame.onload = function() { if (loading) loading.style.display = "none"; frame.style.display = "block"; };
        frame.src = src + "#toolbar=0&navpanes=0&view=FitH";
        // Safety: reveal even if onload doesn't fire (some PDF viewers)
        setTimeout(function() { if (loading) loading.style.display = "none"; frame.style.display = "block"; }, 1500);
      }
      _ensureBlob().then(function() { _showFrame(_pdfBlobUrl); })
        .catch(function() { _showFrame(pdfUrl); });

      // Enrich the meta line with page count / scanned warning once inspect returns.
      _fetchInspect();
      var poll = setInterval(function() {
        var meta = document.getElementById("_bhashini_pv_meta");
        if (!meta) { clearInterval(poll); return; }
        if (_inspectInfo) {
          clearInterval(poll);
          var bits = ['Translate to <strong style="color:#1D0A69;">' + tgtLabel + '</strong>'];
          if (_inspectInfo.total_pages) bits.push(_inspectInfo.total_pages + (_inspectInfo.total_pages === 1 ? " page" : " pages"));
          meta.innerHTML = bits.join(" · ");
          if (!_inspectInfo.has_text_layer) {
            meta.innerHTML += '<br><span style="color:#b45309;">&#9888; Scanned document — translation may take longer.</span>';
          }
        }
      }, 400);
    }

    _renderPreview();
  }

  function showEmailSentModal(email, filename) {
    var m = ensurePdfModal();
    m.querySelector("div").setAttribute("style", PDF_CARD_STYLE + 'text-align:center;');
    m.querySelector("div").innerHTML =
      '<div style="margin-bottom:20px;">' +
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="20" cy="20" r="19" stroke="#138808" stroke-width="1.5"/>' +
          '<polyline points="12,20 17,26 28,13" stroke="#138808" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px;">Request Received</div>' +
      '<div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:24px;">' +
        '<strong style="color:#0f172a;">' + filename + '</strong> is queued for translation.<br>' +
        'The translated document will be emailed to<br><span style="color:#1D0A69;font-weight:500;">' + email + '</span> within 24 hours.' +
      '</div>' +
      '<button id="_bhashini_email_ok" ' +
        'style="padding:10px 28px;border-radius:4px;border:none;background:#1D0A69;color:#fff;' +
        'font-weight:600;font-size:13px;cursor:pointer;letter-spacing:.02em;">Done</button>' +
      PDF_POWERED_BY_HTML;
    m.style.display = "flex";
    document.getElementById("_bhashini_email_ok").onclick = function () { hidePdfModal(); };
  }

  function showQuotaBlockedModal(retryAfter) {
    var m = ensurePdfModal();
    m.querySelector("div").setAttribute("style", PDF_CARD_STYLE + 'text-align:center;');
    m.querySelector("div").innerHTML =
      '<div style="margin-bottom:20px;">' +
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="20" cy="20" r="19" stroke="#1D0A69" stroke-width="1.5"/>' +
          '<line x1="20" y1="13" x2="20" y2="23" stroke="#1D0A69" stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="20" cy="28" r="1.75" fill="#1D0A69"/>' +
        '</svg>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px;">Monthly Limit Reached</div>' +
      '<div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:24px;">' +
        'You have used your free full-PDF translation for this month.<br>' +
        (retryAfter ? 'Available again after <strong style="color:#0f172a;">' + retryAfter + '</strong>.' : 'Please try again next month.') +
      '</div>' +
      '<button id="_bhashini_quota_ok" ' +
        'style="padding:10px 28px;border-radius:4px;border:none;background:#1D0A69;color:#fff;' +
        'font-weight:600;font-size:13px;cursor:pointer;letter-spacing:.02em;">OK</button>' +
      PDF_POWERED_BY_HTML;
    m.style.display = "flex";
    document.getElementById("_bhashini_quota_ok").onclick = function () { hidePdfModal(); };
  }

  function _resetPdfModalToProgress() {
    var m = ensurePdfModal();
    m.querySelector("div").setAttribute("style", PDF_CARD_STYLE);
    m.querySelector("div").innerHTML = PDF_PROGRESS_HTML;
    showPdfModal("Starting…");
  }

  async function fetchPdfBlob(pdfUrl) {
    // For same-origin PDFs fetch directly; cross-origin will be caught and
    // re-fetched server-side via a helper query param.
    try {
      var resp = await fetch(pdfUrl);
      if (!resp.ok) throw new Error("fetch failed");
      return await resp.blob();
    } catch (e) {
      // Cross-origin: ask plugin backend to fetch on our behalf
      var proxyUrl =
        TRANSLATION_PLUGIN_API_BASE_URL +
        "/pdf-proxy?url=" +
        encodeURIComponent(pdfUrl);
      var resp2 = await fetch(proxyUrl);
      if (!resp2.ok) throw new Error("proxy fetch failed");
      return await resp2.blob();
    }
  }

  async function translatePdf(pdfUrl, targetLang, btn, originalFilename) {
    var approved = isApproved(pdfUrl);

    showIdentityModal(
      approved,
      originalFilename,
      pdfUrl,
      targetLang,
      function onSubmit(email, name, purpose, otp, sourceLang, onOtpError) {
        _runTranslation(pdfUrl, targetLang, btn, originalFilename, email, name, purpose, otp, sourceLang, onOtpError);
      },
      approved ? null : function onPreview(sourceLang) {
        showPdfModal("Starting translation…");
        _runTranslation(pdfUrl, targetLang, btn, originalFilename, null, null, null, null, sourceLang, null);
      }
    );
  }

  // email/name/purpose/otp are null for preview-only path
  async function _runTranslation(pdfUrl, targetLang, btn, originalFilename, email, name, purpose, otp, sourceLang, onOtpError) {
    var isFullRequest = !!(email && name && purpose);
    if (!isFullRequest) {
      // Preview path — show progress modal immediately
      showPdfStatus(btn, "&#8987; Starting translation...");
      updatePdfModal(0, "Starting translation…");
    }
    // Full request: keep modal open (OTP screen) until we know the result
    try {
      var form = new FormData();
      form.append("pdf_url", pdfUrl);
      form.append("target_lang", targetLang);
      form.append("source_lang", sourceLang || pageSourceLanguage || "en");
      if (isFullRequest) {
        form.append("full_requested", "true");
        form.append("email",   email);
        form.append("name",    name);
        form.append("purpose", purpose);
        if (otp) form.append("otp", otp);
      }

      var startResp = await fetch(TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-translate", {
        method: "POST",
        body: form,
      });

      if (!startResp.ok) {
        var errData = await startResp.json().catch(function () { return {}; });
        // OTP wrong — stay on OTP screen, show error + resend
        if ((errData.error === "otp_invalid" || errData.error === "otp_locked") && onOtpError) {
          onOtpError(errData.message);
          return;
        }
        // Quota blocked — show quota modal
        if (errData.error === "quota_exceeded" || startResp.status === 429 || startResp.status === 403) {
          hidePdfModal();
          showQuotaBlockedModal(errData.retry_after || null);
          showPdfStatus(btn, "&#9203; Limit reached", true);
          setTimeout(function () { btn.innerHTML = PDF_BTN_SVG + "Translate PDF"; btn.disabled = false; btn.style.cursor = "pointer"; _applyBtnRest(btn); }, 3000);
          return;
        }
        throw new Error(errData.message || "Failed to start translation (" + startResp.status + ")");
      }
      var startData = await startResp.json();

      // Remember identity for prefill next time (email/name/purpose only —
      // OTP is still required on every future request).
      if (isFullRequest) {
        _savePdfIdentity(email, name, purpose);
      }

      var jobId = startData.job_id;

      // Cache hit — the translated file already exists; download it right now
      // (?stream=1 keeps it same-origin). Email still arrives as a receipt.
      if (startData.status === "done" && startData.download_url) {
        _resetPdfModalToProgress();
        showPdfStatus(btn, "&#8987; Downloading...");
        updatePdfModal(100, "Downloading…");
        var directResp = await fetch(startData.download_url + (startData.download_url.indexOf("?") === -1 ? "?stream=1" : "&stream=1"));
        if (!directResp.ok) throw new Error("Download failed");
        var directBlob = await directResp.blob();
        _triggerDownload(directBlob, false, originalFilename);
        hidePdfModal();
        if (typeof showToast === "function") showToast("Translated PDF downloaded. A copy was also sent to your email.");
        showPdfStatus(btn, "&#10003; Done — Translate again", true);
        setTimeout(function () { btn.innerHTML = PDF_BTN_SVG + "Translate PDF"; btn.disabled = false; }, 3000);
        return;
      }

      // Deferred overnight job — email is genuinely the delivery channel
      if (isFullRequest && startData.mode === "email" && !startData.run_now) {
        hidePdfModal();
        showEmailSentModal(email, originalFilename || "document.pdf");
        showPdfStatus(btn, "&#128231; Queued for email", true);
        setTimeout(function () { btn.innerHTML = PDF_BTN_SVG + "Translate PDF"; btn.disabled = false; }, 3000);
        return;
      }

      if (!jobId && startData.status !== "done") throw new Error("No job ID returned");

      // Live path — preview jobs AND run-now full jobs: show progress, poll,
      // download in-browser the moment it's ready. (Full jobs also email a copy.)
      var isPreview = !!startData.preview;
      if (isFullRequest) _resetPdfModalToProgress();
      var statusUrl = TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-translate/status/" + jobId;
      var dlUrl     = TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-translate/download/" + jobId + "?stream=1";
      if (startData.status !== "done") {
        for (var i = 0; i < 150; i++) {
          await new Promise(function (r) { setTimeout(r, 4000); });
          var pollResp = await fetch(statusUrl);
          if (!pollResp.ok) throw new Error("Status check failed");
          var pollData = await pollResp.json();
          if (pollData.status === "error" || pollData.status === "dead") throw new Error(pollData.message || "Translation failed");
          if (pollData.status === "done") { isPreview = !!pollData.preview; break; }
          var pct = pollData.progress || 0;
          showPdfStatus(btn, "&#8987; " + (pollData.message || "Translating...") + " " + pct + "%");
          updatePdfModal(pct, pollData.message || "Translating…");
        }
      }

      showPdfStatus(btn, "&#8987; Downloading...");
      updatePdfModal(100, "Downloading…");
      var dlResp = await fetch(dlUrl);
      if (!dlResp.ok) throw new Error("Download failed (" + dlResp.status + ")");
      var translatedBlob = await dlResp.blob();
      _triggerDownload(translatedBlob, isPreview, originalFilename);

      hidePdfModal();
      if (isFullRequest && typeof showToast === "function") {
        showToast("Translated PDF downloaded. A copy was also sent to your email.");
      }
      var doneLabel = isPreview ? "&#128196; Translate PDF (Preview)" : "&#10003; Done — Translate again";
      showPdfStatus(btn, doneLabel, true);
      setTimeout(function () {
        btn.innerHTML = PDF_BTN_SVG + (isApproved(pdfUrl) ? "Translate PDF" : "Translate PDF (Preview)");
        btn.disabled = false; btn.style.cursor = "pointer"; _applyBtnRest(btn);
      }, 3000);
    } catch (e) {
      hidePdfModal();
      console.error("[Bhashini PDF] Translation error:", e);
      showPdfStatus(btn, "&#10060; " + (e.message || "Failed"), true);
      setTimeout(function () {
        btn.innerHTML = PDF_BTN_SVG + (isApproved(pdfUrl) ? "Translate PDF" : "Translate PDF (Preview)");
        btn.disabled = false; btn.style.cursor = "pointer"; _applyBtnRest(btn);
      }, 4000);
    }
  }

  function _triggerDownload(blob, isPreview, originalFilename) {
    var blobUrl = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = (isPreview ? "preview_" : "translated_") + (originalFilename || "document.pdf");
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  }

  // _pdfEnabled: whether PDF translation is active for this domain (backend-controlled)
  // _pdfWhitelist: null=loading, false=no URL restriction, [...]= approved URLs only
  var _pdfEnabled = null;
  var _pdfWhitelist = null;

  function fetchPdfWhitelist() {
    return fetch(
      TRANSLATION_PLUGIN_API_BASE_URL + "/pdf-whitelist?domain=" + window.location.hostname
    )
      .then(function (resp) { return resp.ok ? resp.json() : null; })
      .then(function (data) {
        _pdfEnabled = !!(data && data.enabled);
        if (data && Array.isArray(data.urls)) {
          _pdfWhitelist = data.urls;
        } else {
          // null urls = no URL restriction → full translation on all PDFs
          _pdfWhitelist = false;
        }
      })
      .catch(function () {
        _pdfEnabled = false;
        _pdfWhitelist = [];
      });
  }

  // The backend draws two separate conclusions from the whitelist, and the UI
  // has to mirror both or it promises delivery it cannot make:
  //
  //   isPriority     the URL is EXPLICITLY whitelisted. Only these translate
  //                  immediately and download in the browser.
  //   isFullAllowed  full-document translation is permitted at all. True when
  //                  explicitly whitelisted, and also when the domain has no
  //                  whitelist configured — but that case is NOT priority, so
  //                  it is still quota'd and delivered by email within 24h.
  //
  // Treating "no whitelist configured" as approved is what made unwhitelisted
  // documents promise a direct download and then arrive by email.
  function isPriority(pdfUrl) {
    if (!Array.isArray(_pdfWhitelist)) return false;
    var normalized = pdfUrl ? pdfUrl.split("?")[0] : "";
    return _pdfWhitelist.indexOf(normalized) !== -1;
  }

  function isFullAllowed(pdfUrl) {
    if (_pdfWhitelist === false) return true; // no URL restriction configured
    return isPriority(pdfUrl);
  }

  // Back-compat alias: "approved" has always meant "can request the full
  // document", which is isFullAllowed.
  function isApproved(pdfUrl) {
    return isFullAllowed(pdfUrl);
  }

  function removePdfButtons() {
    document.querySelectorAll(".bhashini-pdf-translate-btn").forEach(function (btn) {
      btn.remove();
    });
  }

  function injectPdfButtons() {
    if (_pdfEnabled === null) return; // wait until config is loaded
    if (!_pdfEnabled) return;         // PDF translation disabled for this domain
    var targetLang = localStorage.getItem("preferredLanguage");
    // No language selected or source language selected — nothing to translate
    if (!targetLang || targetLang === (pageSourceLanguage || "en")) {
      removePdfButtons();
      return;
    }

    // Anchors: ".pdf" anywhere in the URL (covers /file.pdf, ?doc=x.pdf, #…).
    // Embedded viewers: iframe/embed/object pointing at a PDF get a button too.
    var targets = [];
    document.querySelectorAll('a[href*=".pdf"]').forEach(function (el) {
      if (el.href) targets.push({ el: el, url: el.href });
    });
    document.querySelectorAll('iframe[src*=".pdf"], embed[src*=".pdf"], object[data*=".pdf"]').forEach(function (el) {
      var url = el.src || el.data;
      if (url) targets.push({ el: el, url: url });
    });

    targets.forEach(function (t) {
      var el = t.el;
      var nextEl = el.nextElementSibling;
      var existingBtn = (nextEl && nextEl.classList.contains("bhashini-pdf-translate-btn")) ? nextEl : null;
      if (existingBtn) {
        // Already up to date for the current target language — nothing to do
        if (existingBtn.dataset.targetLang === targetLang) return;
        // Target language changed since this button was injected — recreate it
        existingBtn.remove();
      }

      var href = t.url;
      var filename = href.split("/").pop().split("?")[0] || "document.pdf";
      if (!filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
      // Whitelist matching is URL-based (see isApproved) — pass the href, not the filename.
      var approved = isApproved(href);

      var btn = createTranslateBtn();
      btn.dataset.targetLang = targetLang;
      btn.innerHTML = PDF_BTN_SVG + (approved ? "Translate PDF" : "Translate PDF (Preview)");

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        translatePdf(href, targetLang, btn, filename);
      });

      el.insertAdjacentElement("afterend", btn);
    });
  }

  // Let the rest of the plugin (e.g. the language dropdown handler) trigger a
  // re-check after localStorage.preferredLanguage changes without a reload.
  refreshPdfTranslateButtons = injectPdfButtons;

  // Fetch whitelist first, then inject buttons
  fetchPdfWhitelist().then(function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectPdfButtons);
    } else {
      injectPdfButtons();
    }
  });

  // Re-run when new PDF links are added dynamically
  var pdfObserver = new MutationObserver(function () {
    injectPdfButtons();
  });
  pdfObserver.observe(document.body, { childList: true, subtree: true });
})();

// ─────────────────────────────────────────────────────────────────────────────
// Language Path Prefix Keeper
//
// Some sites publish every language on ONE hostname and tell them apart by a
// path prefix — india.gov.in's Devanagari site serves Bodo at /br, Dogri at
// /doi, Hindi at /hi and so on. Those sites render their own navigation with
// root-relative hrefs ("/category/agriculture-rural-environment"), which are
// language-agnostic by construction: following one from /br/category lands the
// reader on /category/agriculture-rural-environment and the language marker is
// gone from the URL. The page still translates (the saved preference survives),
// but the URL no longer names the language, so it cannot be shared, bookmarked
// or crawled, and the reader's language is only one cache-miss from being lost.
//
// So on a path-prefixed translated page, in-site links are re-pointed through
// the same prefix before the reader clicks them. The href is rewritten so
// hover targets, middle-click and "copy link address" agree with what a left
// click does — but on a client-rendered site (india.gov.in is Next.js App
// Router) rewriting the attribute alone is not enough: the framework's router
// intercepts the click and navigates using the href it captured in its own
// component props, never reading the DOM attribute back. So a left click is
// also taken over, in the capture phase on `document` (capture reaches here
// before any listener the framework attached on a descendant container, no
// matter which phase it used), and sent through a real `window.location.assign`
// to the corrected URL — the only way to correct a destination closed over
// inside the framework's own handler. That makes navigation a full page load
// instead of an SPA transition; slower, but correct, and it needs no
// knowledge of the framework's internals.
//
// Deliberately left alone: other origins, assets (a prefixed /…/x.pdf would
// 404), download links, non-navigational schemes, and anything already sitting
// under a language prefix.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  if (!isRedirection) return;

  // Extensions that name a PAGE. Anything else with a dot in its last segment
  // is treated as an asset and left untouched — the language prefix belongs to
  // the site's routing, not to its file storage.
  var PAGE_EXTENSIONS = ["html", "htm", "php", "asp", "aspx", "jsp", "shtml", "cfm"];
  var SKIP_SCHEMES = /^(javascript|mailto|tel|sms|data|blob|file|ftp):/i;

  var languagePathPrefix = "";
  var allLanguagePathPrefixes = [];

  function isUnderAnyLanguagePrefix(pathname) {
    return allLanguagePathPrefixes.some(function (prefix) {
      return pathname === prefix || pathname.indexOf(prefix + "/") === 0;
    });
  }

  function needsPrefix(pathname) {
    // Already under our own prefix
    if (pathname === languagePathPrefix ||
        pathname.indexOf(languagePathPrefix + "/") === 0) return false;

    // Already under SOME language's marker — a link the site renders to another
    // language version. Prefixing it again would produce /br/kok/…  The markers
    // come from the mapping data because a marker is not a language code:
    // india.gov.in serves 'brx' at /br and 'gom' at /kok.
    if (isUnderAnyLanguagePrefix(pathname)) return false;

    var lastSegment = pathname.split("/").pop();
    var dot = lastSegment.lastIndexOf(".");
    if (dot > 0) {
      var ext = lastSegment.slice(dot + 1).toLowerCase();
      if (PAGE_EXTENSIONS.indexOf(ext) === -1) return false;   // asset
    }
    return true;
  }

  function prefixInSiteLinks() {
    if (!languagePathPrefix) return;

    document.querySelectorAll("a[href]").forEach(function (anchor) {
      // Already handled for this prefix
      if (anchor.dataset.bhashiniLangPrefix === languagePathPrefix) return;
      if (anchor.hasAttribute("download")) return;

      var raw = anchor.getAttribute("href");
      if (!raw || raw.charAt(0) === "#" || SKIP_SCHEMES.test(raw)) return;

      var resolved;
      try {
        resolved = new URL(anchor.href, window.location.href);
      } catch (e) {
        return;
      }
      if (resolved.origin !== window.location.origin) return;
      if (!needsPrefix(resolved.pathname)) return;

      anchor.setAttribute(
        "href",
        languagePathPrefix + resolved.pathname + resolved.search + resolved.hash
      );
      anchor.dataset.bhashiniLangPrefix = languagePathPrefix;
    });
  }

  // Only anchors the keeper itself marked are taken over — a link the site
  // authored under a prefix keeps its normal client-side navigation. The href
  // attribute is NOT trusted here even though prefixInSiteLinks just set it:
  // a framework re-render can restore an anchor's href from its own component
  // props (resetting the DOM attribute) while leaving our data-* marker
  // intact, so the destination is recomputed fresh with needsPrefix() rather
  // than assumed from whatever the attribute currently shows.
  function takeOverClick(e) {
    if (!languagePathPrefix) return;
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var anchor = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!anchor || anchor.dataset.bhashiniLangPrefix === undefined) return;
    if (anchor.hasAttribute("download")) return;
    if (anchor.target && anchor.target !== "_self") return;

    var raw = anchor.getAttribute("href");
    if (!raw || raw.charAt(0) === "#" || SKIP_SCHEMES.test(raw)) return;

    var resolved;
    try {
      resolved = new URL(anchor.href, window.location.href);
    } catch (err) {
      return;
    }
    if (resolved.origin !== window.location.origin) return;

    var pathname = needsPrefix(resolved.pathname)
      ? languagePathPrefix + resolved.pathname
      : resolved.pathname;

    e.preventDefault();
    e.stopPropagation();
    window.location.assign(resolved.origin + pathname + resolved.search + resolved.hash);
  }

  getLanguagePathPrefixInfo().then(function (info) {
    if (!info.prefix) return;     // language is a whole domain — nothing to keep
    languagePathPrefix = info.prefix;
    allLanguagePathPrefixes = info.all.length ? info.all : [info.prefix];
    console.log('[Bhashini] Keeping language path prefix on in-site links:', info.prefix,
      '(markers on this host:', allLanguagePathPrefixes.join(', ') + ')');

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", prefixInSiteLinks);
    } else {
      prefixInSiteLinks();
    }

    // Re-run for navigation rendered after load (menus, listings, infinite scroll)
    var linkObserver = new MutationObserver(function () {
      prefixInSiteLinks();
    });
    linkObserver.observe(document.body, { childList: true, subtree: true });

    // Capture phase: fires before any listener the framework attached on a
    // descendant container, so it can override the click before the
    // framework's own router handler ever runs.
    document.addEventListener("click", takeOverClick, true);
  });
})();
