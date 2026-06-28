/*
  Processes <RT·term> and <RT·neologism> tags.
  - Styles only the first occurrence of a unique term/neologism.
  - The "-em" variants (e.g., <RT·term-em>) are always styled.
  - Automatically generates IDs for first occurrences for future indexing.
*/
(function() {

  if (!window.RT) {
    console.error("RT not defined - was RT-Style_make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){}, warn: function(){}, error: function(){} };
    const DEBUG_TOKEN_S = 'term';

    try {
      // Track seen terms so only the first occurrence is decorated
      const seen_terms_dpa = new Set();

      const apply_style = (el, is_neologism_b) => {
        el.style.fontStyle = 'italic';
        el.style.fontWeight = is_neologism_b ? '600' : '500';
        el.style.color = is_neologism_b
          ? window.RT.theme('read', 'brand', 'secondary')
          : window.RT.theme('read', 'brand', 'primary');
        el.style.paddingRight = '0.1em';
        el.style.display = 'inline';
      };

      const clear_style = (el) => {
        el.style.fontStyle = 'normal';
        el.style.color = 'inherit';
        el.style.fontWeight = 'inherit';
        el.style.paddingRight = '';
        el.style.display = '';
      };

      const selector_s = [
        'rt·term',
        'rt·term-em',
        'rt·neologism',
        'rt·neologism-em'
      ].join(',');

      const tags_dpa = document.querySelectorAll(selector_s);

      debug.log(DEBUG_TOKEN_S, `Scanning ${tags_dpa.length} term tags`);

      tags_dpa.forEach(el => {
        const tag_name_s = el.tagName.toLowerCase();
        const is_neologism_b = tag_name_s.includes('neologism');
        const is_explicit_em_b = tag_name_s.endsWith('-em');

        const term_text_raw_s = (el.textContent || '').trim();
        if (!term_text_raw_s.length) {
          debug.warn(DEBUG_TOKEN_S, `Empty term tag encountered: <${tag_name_s}>`);
          return;
        }

        // Normalize text for uniqueness tracking
        const term_norm_s = term_text_raw_s.toLowerCase();

        // Slug for ID generation (simple + stable)
        const slug_s = term_norm_s.replace(/\s+/g, '-');

        const is_first_occurrence_b = !seen_terms_dpa.has(term_norm_s);

        if (is_explicit_em_b || is_first_occurrence_b) {
          apply_style(el, is_neologism_b);

          if (!is_explicit_em_b && is_first_occurrence_b) {
            seen_terms_dpa.add(term_norm_s);

            if (!el.id) {
              el.id = `def-${is_neologism_b ? 'neo-' : ''}${slug_s}`;
              debug.log(
                DEBUG_TOKEN_S,
                `First occurrence: "${term_norm_s}" -> id="${el.id}"`
              );
            } else {
              debug.log(
                DEBUG_TOKEN_S,
                `First occurrence: "${term_norm_s}" (existing id="${el.id}")`
              );
            }
          } else if (is_explicit_em_b) {
            debug.log(
              DEBUG_TOKEN_S,
              `Emphasized occurrence: "${term_norm_s}" (<${tag_name_s}>)`
            );
          }
        } else {
          // Subsequent mentions render as normal prose
          clear_style(el);
        }
      });

      debug.log(DEBUG_TOKEN_S, `Unique terms defined: ${seen_terms_dpa.size}`);
    } catch (e) {
      debug.error('error', `term failed: ${e && e.message ? e.message : String(e)}`);
    }
  });

})();
