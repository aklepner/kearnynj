(function($) {

/**
 * jQuery debugging helper.
 *
 * Invented for Dreditor.
 *
 * @usage
 *   $.debug(var [, name]);
 *   $variable.debug( [name] );
 */
jQuery.extend({
  debug: function () {
    // Setup debug storage in global window. We want to look into it.
    window.debug = window.debug || [];

    args = jQuery.makeArray(arguments);
    // Determine data source; this is an object for $variable.debug().
    // Also determine the identifier to store data with.
    if (typeof this == 'object') {
      var name = (args.length ? args[0] : window.debug.length);
      var data = this;
    }
    else {
      var name = (args.length > 1 ? args.pop() : window.debug.length);
      var data = args[0];
    }
    // Store data.
    window.debug[name] = data;
    // Dump data into Firebug console.
    if (typeof console != 'undefined') {
      console.log(name, data);
    }
    return this;
  }
});
// @todo Is this the right way?
jQuery.fn.debug = jQuery.debug;

})(jQuery);
;
(function ($) {
  Drupal.behaviors.contextBreakpoint = {
    width: null,
    height: null,

    breakpointsCookie: 'context_breakpoints',
    activeBreakpoints: null,

    saveResolutionCookie: false,
    resolutionCookie: 'context_breakpoint_resolution',

    reloadActive: false,

    // settings
    settings: null,
    contexts: null,

    // Whether user is on an admin page.
    isAdminPage: null,

    arrayDiff: function(a1, a2) {
      return $(a1).not(a2).get().concat($(a2).not(a1).get());
    },

    preInit: function() {
      if (!('context_breakpoint' in Drupal.settings)) {
        return;
      }

      var config = Drupal.settings.context_breakpoint;

      // Set settings that we need later on.
      this.settings = config.settings;
      this.contexts = config.contexts;
      this.isAdminPage = config.is_admin;

      this.breakpointsInUrl = this.settings.breakpoints_in_url;
      this.autoReload = this.isReloadEnabled();

      var cookieFlag = this.checkForCookie();
      var flagUrl  = this.checkForUrlDiscrepancy();

      if (flagUrl) {
        window.location.href = flagUrl;
      }
      else if (cookieFlag) {
        this.doReload();
      }
    },

    checkForCookie: function() {
      if ($.cookie(this.breakpointsCookie) === null) {
        this.saveCookie(this.checkBreakpoints());
        return true;
      }

      return false;
    },

    checkForUrlDiscrepancy: function() {
      if (this.breakpointsInUrl && this.autoReload) {
        var href = window.location.href;

        var currentCookie = $.cookie(this.breakpointsCookie);

        var pattern = new RegExp('context\-breakpoints\=([^\&\?]+)');
        var result = pattern.exec(href);

        var newUrl = null;

        if (result === null) {
          if (currentCookie === '') {
            // do nothing, since no context is set anyway
          }
          else {
            var newUrl = href + (href.search(/\?/) === -1 ? '?' : '&') + 'context-breakpoints=' + currentCookie;
          }
        }
        else {
          if (result[1] !== currentCookie) {
            if (currentCookie === '') {
              // Strip out the whole parameter, since we do not need it
              newUrl = href.replace('&context-breakpoints=' + result[1], '');
              newUrl = newUrl.replace('?context-breakpoints=' + result[1], '');
            }
            else {
              newUrl = href.replace(result[1], currentCookie);
            }
          }
        }

        return newUrl;
      }

      return false;
    },

    attach: function (context, settings) {
      if (!this.contexts) {
        // Nothing to do if no contexts available.
        return;
      }

      // Do not do anything if reload is already triggered
      // to prevent messing with the cookie again.
      if (this.checkForCookieReload) {
        return;
      }

      var that = this;

      // Update cookies on each resize.
      $(window).resize(function() {
        that.onResize();
      });

      // Check if cookie with resolution should also be saved.
      this.saveResolutionCookie = this.settings.save_resolution;
      if (!this.saveResolutionCookie) {
        // Otherwise, delete if it exists.
        $.cookie(this.resolutionCookie, '', {'expires': new Date(0)});
      }

      // Retrieve active breakpoints from cookie.
      this.activeBreakpoints = this.getCookieBreakpoints();

      // Do a first manual cookie update to catch the current state.
      this.onResize();
    },

    // Set the cookie with screen and browser width + height.
    // Then check if we need to reload.
    onResize: function() {
      // Compute currently active breakpoints.
      var newActiveBreakpoints = this.checkBreakpoints();

      // If required, update resolution cookie.
      if (this.saveResolutionCookie) {
        $window = $(window);
        var value = $window.width() + 'x' + $window.height()
           + '|' + screen.width + 'x' + screen.height;

        $.cookie(this.resolutionCookie, value);
      }

      // Check if any breakpoint has become active or inactive
      var diff = this.arrayDiff(this.activeBreakpoints, newActiveBreakpoints);

      if (diff.length) {
        // Update the cookie.
        this.saveCookie(newActiveBreakpoints);
        this.activeBreakpoints = newActiveBreakpoints;

        // If url auto-change is enabled, we have to do it now.
        var newUrl = this.checkForUrlDiscrepancy();
        if (newUrl) {
          window.location.href = newUrl;
        }
        else {
          // Check if we have to reload.
          for (var key in diff) {
            if (this.isReloadEnabled(diff[key])) {
              this.doReload();
              break;
            }
          }
        }
      }
    },

    isReloadEnabled: function(context) {
      // On admin pages, do not reload.
      if (this.isAdminPage && this.settings.admin_disable_reload) {
        return false;
      }
      // Check for specific context.
      else if (context) {
        return this.contexts[context].autoreload;
      }
      // Check if any context has reload enabled.
      else {
        var contexts = this.contexts;

        for (var key in contexts) {
          if (contexts[key].autoreload) {
            return true;
          }
        }

        return false;
      }
    },

    saveCookie: function(activeBreakpoints) {
      var points = activeBreakpoints.length ? activeBreakpoints.join(',') : 'none';
      $.cookie(this.breakpointsCookie, points);
    },

    getCookieBreakpoints: function() {
      var value = $.cookie(this.breakpointsCookie);
      if (value === 'none') {
        value = null;
      }

      var breakpoints = value ? value.split(',') : [];

      return breakpoints;
    },

    checkBreakpoints: function(curWidth, curHeight) {
      var contexts = this.contexts;
      var $window = $(window);

      var activeBreakpoints = [];

      for (var contextName in contexts) {
        var context = contexts[contextName];

        isActive = true;

        for (var key in context.breakpoints) {

          for (var cmd in context.breakpoints[key]) {
            var value = context.breakpoints[key][cmd];

            // If the result changes, the condition has changed, so we need
            // to reload.
            var deviceCheck = cmd.search('device') !== -1;

            var width = height = null;
            if (deviceCheck) {
              width = screen.width;
              height = screen.height;
            }
            else {
              width = $window.width();
              height = $window.height();
            }

            var flag = this.checkCondition(cmd, width, height, value);

            if (!flag) {
              isActive = false;
              break;
            }
          }

        }

        if (isActive) {
          activeBreakpoints.push(contextName);
        }
      }

      return activeBreakpoints;
    },

    doReload: function() {
      window.location.reload(true);

      // FF prevents reload in onRsize event, so we need to do it
      // in a timeout. See issue #1859058
      if ('mozilla' in $.browser)  {
        setTimeout(function() {
          window.location.reload(true);
        }, 10);
      }
      return;
    },

    checkCondition: function(condition, width, height, value) {
      var flag = null;

      switch (condition) {
        case 'width':
        case 'device-width':
          flag = width === value;
          break;

        case 'min-width':
        case 'min-device-width':
          flag = width >= value;
          break;

        case 'max-width':
        case 'max-device-width':
          flag = width <= value;
          break;

        case 'height':
        case 'device-height':
          flag = height === value;
          break;

        case 'min-height':
        case 'min-device-height':
          flag = height >= value;
          break;

        case 'max-height':
        case 'max-device-height':
          flag = height <= value;
          break;

        case 'aspect-ratio':
        case 'device-aspect-ratio':
          flag = width / height === value;
          break;

        case 'min-aspect-ratio':
        case 'min-device-aspect-ratio':
          flag = width / height >= value;
          break;

        case 'max-aspect-ratio':
        case 'max-device-aspect-ratio':
          flag = width / height <= value;
          break;

        default:
          break;
      }

      return flag;
    }
  };
})(jQuery);
;
(function($) {

Drupal.admin = Drupal.admin || {};
Drupal.admin.behaviors = Drupal.admin.behaviors || {};
Drupal.admin.hashes = Drupal.admin.hashes || {};

/**
 * Core behavior for Administration menu.
 *
 * Test whether there is an administration menu is in the output and execute all
 * registered behaviors.
 */
Drupal.behaviors.adminMenu = {
  attach: function (context, settings) {
    // Initialize settings.
    settings.admin_menu = $.extend({
      suppress: false,
      margin_top: false,
      position_fixed: false,
      tweak_modules: false,
      tweak_permissions: false,
      tweak_tabs: false,
      destination: '',
      basePath: settings.basePath,
      hash: 0,
      replacements: {}
    }, settings.admin_menu || {});
    // Check whether administration menu should be suppressed.
    if (settings.admin_menu.suppress) {
      return;
    }
    var $adminMenu = $('#admin-menu:not(.admin-menu-processed)', context);
    // Client-side caching; if administration menu is not in the output, it is
    // fetched from the server and cached in the browser.
    if (!$adminMenu.length && settings.admin_menu.hash) {
      Drupal.admin.getCache(settings.admin_menu.hash, function (response) {
          if (typeof response == 'string' && response.length > 0) {
            $('body', context).append(response);
          }
          var $adminMenu = $('#admin-menu:not(.admin-menu-processed)', context);
          // Apply our behaviors.
          Drupal.admin.attachBehaviors(context, settings, $adminMenu);
          // Allow resize event handlers to recalculate sizes/positions.
          $(window).triggerHandler('resize');
      });
    }
    // If the menu is in the output already, this means there is a new version.
    else {
      // Apply our behaviors.
      Drupal.admin.attachBehaviors(context, settings, $adminMenu);
    }
  }
};

/**
 * Collapse fieldsets on Modules page.
 */
Drupal.behaviors.adminMenuCollapseModules = {
  attach: function (context, settings) {
    if (settings.admin_menu.tweak_modules) {
      $('#system-modules fieldset:not(.collapsed)', context).addClass('collapsed');
    }
  }
};

/**
 * Collapse modules on Permissions page.
 */
Drupal.behaviors.adminMenuCollapsePermissions = {
  attach: function (context, settings) {
    if (settings.admin_menu.tweak_permissions) {
      // Freeze width of first column to prevent jumping.
      $('#permissions th:first', context).css({ width: $('#permissions th:first', context).width() });
      // Attach click handler.
      $modules = $('#permissions tr:has(td.module)', context).once('admin-menu-tweak-permissions', function () {
        var $module = $(this);
        $module.bind('click.admin-menu', function () {
          // @todo Replace with .nextUntil() in jQuery 1.4.
          $module.nextAll().each(function () {
            var $row = $(this);
            if ($row.is(':has(td.module)')) {
              return false;
            }
            $row.toggleClass('element-hidden');
          });
        });
      });
      // Collapse all but the targeted permission rows set.
      if (window.location.hash.length) {
        $modules = $modules.not(':has(' + window.location.hash + ')');
      }
      $modules.trigger('click.admin-menu');
    }
  }
};

/**
 * Apply margin to page.
 *
 * Note that directly applying marginTop does not work in IE. To prevent
 * flickering/jumping page content with client-side caching, this is a regular
 * Drupal behavior.
 */
Drupal.behaviors.adminMenuMarginTop = {
  attach: function (context, settings) {
    if (!settings.admin_menu.suppress && settings.admin_menu.margin_top) {
      $('body:not(.admin-menu)', context).addClass('admin-menu');
    }
  }
};

/**
 * Retrieve content from client-side cache.
 *
 * @param hash
 *   The md5 hash of the content to retrieve.
 * @param onSuccess
 *   A callback function invoked when the cache request was successful.
 */
Drupal.admin.getCache = function (hash, onSuccess) {
  if (Drupal.admin.hashes.hash !== undefined) {
    return Drupal.admin.hashes.hash;
  }
  $.ajax({
    cache: true,
    type: 'GET',
    dataType: 'text', // Prevent auto-evaluation of response.
    global: false, // Do not trigger global AJAX events.
    url: Drupal.settings.admin_menu.basePath.replace(/admin_menu/, 'js/admin_menu/cache/' + hash),
    success: onSuccess,
    complete: function (XMLHttpRequest, status) {
      Drupal.admin.hashes.hash = status;
    }
  });
};

/**
 * TableHeader callback to determine top viewport offset.
 *
 * @see toolbar.js
 */
Drupal.admin.height = function() {
  var $adminMenu = $('#admin-menu');
  var height = $adminMenu.outerHeight();
  // In IE, Shadow filter adds some extra height, so we need to remove it from
  // the returned height.
  if ($adminMenu.css('filter') && $adminMenu.css('filter').match(/DXImageTransform\.Microsoft\.Shadow/)) {
    height -= $adminMenu.get(0).filters.item("DXImageTransform.Microsoft.Shadow").strength;
  }
  return height;
};

/**
 * @defgroup admin_behaviors Administration behaviors.
 * @{
 */

/**
 * Attach administrative behaviors.
 */
Drupal.admin.attachBehaviors = function (context, settings, $adminMenu) {
  if ($adminMenu.length) {
    $adminMenu.addClass('admin-menu-processed');
    $.each(Drupal.admin.behaviors, function() {
      this(context, settings, $adminMenu);
    });
  }
};

/**
 * Apply 'position: fixed'.
 */
Drupal.admin.behaviors.positionFixed = function (context, settings, $adminMenu) {
  if (settings.admin_menu.position_fixed) {
    $adminMenu.addClass('admin-menu-position-fixed');
    $adminMenu.css('position', 'fixed');
  }
};

/**
 * Move page tabs into administration menu.
 */
Drupal.admin.behaviors.pageTabs = function (context, settings, $adminMenu) {
  if (settings.admin_menu.tweak_tabs) {
    var $tabs = $(context).find('ul.tabs.primary');
    $adminMenu.find('#admin-menu-wrapper > ul').eq(1)
      .append($tabs.find('li').addClass('admin-menu-tab'));
    $(context).find('ul.tabs.secondary')
      .appendTo('#admin-menu-wrapper > ul > li.admin-menu-tab.active')
      .removeClass('secondary');
    $tabs.remove();
  }
};

/**
 * Perform dynamic replacements in cached menu.
 */
Drupal.admin.behaviors.replacements = function (context, settings, $adminMenu) {
  for (var item in settings.admin_menu.replacements) {
    $(item, $adminMenu).html(settings.admin_menu.replacements[item]);
  }
};

/**
 * Inject destination query strings for current page.
 */
Drupal.admin.behaviors.destination = function (context, settings, $adminMenu) {
  if (settings.admin_menu.destination) {
    $('a.admin-menu-destination', $adminMenu).each(function() {
      this.search += (!this.search.length ? '?' : '&') + Drupal.settings.admin_menu.destination;
    });
  }
};

/**
 * Apply JavaScript-based hovering behaviors.
 *
 * @todo This has to run last.  If another script registers additional behaviors
 *   it will not run last.
 */
Drupal.admin.behaviors.hover = function (context, settings, $adminMenu) {
  // Hover emulation for IE 6.
  if ($.browser.msie && parseInt(jQuery.browser.version) == 6) {
    $('li', $adminMenu).hover(
      function () {
        $(this).addClass('iehover');
      },
      function () {
        $(this).removeClass('iehover');
      }
    );
  }

  // Delayed mouseout.
  $('li.expandable', $adminMenu).hover(
    function () {
      // Stop the timer.
      clearTimeout(this.sfTimer);
      // Display child lists.
      $('> ul', this)
        .css({left: 'auto', display: 'block'})
        // Immediately hide nephew lists.
        .parent().siblings('li').children('ul').css({left: '-999em', display: 'none'});
    },
    function () {
      // Start the timer.
      var uls = $('> ul', this);
      this.sfTimer = setTimeout(function () {
        uls.css({left: '-999em', display: 'none'});
      }, 400);
    }
  );
};

/**
 * Apply the search bar functionality.
 */
Drupal.admin.behaviors.search = function (context, settings, $adminMenu) {
  // @todo Add a HTML ID.
  var $input = $('input.admin-menu-search', $adminMenu);
  // Initialize the current search needle.
  var needle = $input.val();
  // Cache of all links that can be matched in the menu.
  var links;
  // Minimum search needle length.
  var needleMinLength = 2;
  // Append the results container.
  var $results = $('<div />').insertAfter($input);

  /**
   * Executes the search upon user input.
   */
  function keyupHandler() {
    var matches, $html, value = $(this).val();
    // Only proceed if the search needle has changed.
    if (value !== needle) {
      needle = value;
      // Initialize the cache of menu links upon first search.
      if (!links && needle.length >= needleMinLength) {
        // @todo Limit to links in dropdown menus; i.e., skip menu additions.
        links = buildSearchIndex($adminMenu.find('li:not(.admin-menu-action, .admin-menu-action li) > a'));
      }
      // Empty results container when deleting search text.
      if (needle.length < needleMinLength) {
        $results.empty();
      }
      // Only search if the needle is long enough.
      if (needle.length >= needleMinLength && links) {
        matches = findMatches(needle, links);
        // Build the list in a detached DOM node.
        $html = buildResultsList(matches);
        // Display results.
        $results.empty().append($html);
      }
    }
  }

  /**
   * Builds the search index.
   */
  function buildSearchIndex($links) {
    return $links
      .map(function () {
        var text = (this.textContent || this.innerText);
        // Skip menu entries that do not contain any text (e.g., the icon).
        if (typeof text === 'undefined') {
          return;
        }
        return {
          text: text,
          textMatch: text.toLowerCase(),
          element: this
        };
      });
  }

  /**
   * Searches the index for a given needle and returns matching entries.
   */
  function findMatches(needle, links) {
    var needleMatch = needle.toLowerCase();
    // Select matching links from the cache.
    return $.grep(links, function (link) {
      return link.textMatch.indexOf(needleMatch) !== -1;
    });
  }

  /**
   * Builds the search result list in a detached DOM node.
   */
  function buildResultsList(matches) {
    var $html = $('<ul class="dropdown admin-menu-search-results" />');
    $.each(matches, function () {
      var result = this.text;
      var $element = $(this.element);

      // Check whether there is a top-level category that can be prepended.
      var $category = $element.closest('#admin-menu-wrapper > ul > li');
      var categoryText = $category.find('> a').text()
      if ($category.length && categoryText) {
        result = categoryText + ': ' + result;
      }

      var $result = $('<li><a href="' + $element.attr('href') + '">' + result + '</a></li>');
      $result.data('original-link', $(this.element).parent());
      $html.append($result);
    });
    return $html;
  }

  /**
   * Highlights selected result.
   */
  function resultsHandler(e) {
    var $this = $(this);
    var show = e.type === 'mouseenter' || e.type === 'focusin';
    $this.trigger(show ? 'showPath' : 'hidePath', [this]);
  }

  /**
   * Closes the search results and clears the search input.
   */
  function resultsClickHandler(e, link) {
    var $original = $(this).data('original-link');
    $original.trigger('mouseleave');
    $input.val('').trigger('keyup');
  }

  /**
   * Shows the link in the menu that corresponds to a search result.
   */
  function highlightPathHandler(e, link) {
    if (link) {
      var $original = $(link).data('original-link');
      var show = e.type === 'showPath';
      // Toggle an additional CSS class to visually highlight the matching link.
      // @todo Consider using same visual appearance as regular hover.
      $original.toggleClass('highlight', show);
      $original.trigger(show ? 'mouseenter' : 'mouseleave');
    }
  }

  // Attach showPath/hidePath handler to search result entries.
  $results.delegate('li', 'mouseenter mouseleave focus blur', resultsHandler);
  // Hide the result list after a link has been clicked, useful for overlay.
  $results.delegate('li', 'click', resultsClickHandler);
  // Attach hover/active highlight behavior to search result entries.
  $adminMenu.delegate('.admin-menu-search-results li', 'showPath hidePath', highlightPathHandler);
  // Attach the search input event handler.
  $input.bind('keyup search', keyupHandler);
};

/**
 * @} End of "defgroup admin_behaviors".
 */

})(jQuery);
;
(function($) {

Drupal.admin = Drupal.admin || {};
Drupal.admin.behaviors = Drupal.admin.behaviors || {};

/**
 * @ingroup admin_behaviors
 * @{
 */

/**
 * Apply active trail highlighting based on current path.
 *
 * @todo Not limited to toolbar; move into core?
 */
Drupal.admin.behaviors.toolbarActiveTrail = function (context, settings, $adminMenu) {
  if (settings.admin_menu.toolbar && settings.admin_menu.toolbar.activeTrail) {
    $adminMenu.find('> div > ul > li > a[href="' + settings.admin_menu.toolbar.activeTrail + '"]').addClass('active-trail');
  }
};

/**
 * Toggles the shortcuts bar.
 */
Drupal.admin.behaviors.shortcutToggle = function (context, settings, $adminMenu) {
  var $shortcuts = $adminMenu.find('.shortcut-toolbar');
  if (!$shortcuts.length) {
    return;
  }
  var storage = window.localStorage || false;
  var storageKey = 'Drupal.admin_menu.shortcut';
  var $body = $(context).find('body');
  var $toggle = $adminMenu.find('.shortcut-toggle');
  $toggle.click(function () {
    var enable = !$shortcuts.hasClass('active');
    $shortcuts.toggleClass('active', enable);
    $toggle.toggleClass('active', enable);
    if (settings.admin_menu.margin_top) {
      $body.toggleClass('admin-menu-with-shortcuts', enable);
    }
    // Persist toggle state across requests.
    storage && enable ? storage.setItem(storageKey, 1) : storage.removeItem(storageKey);
    this.blur();
    return false;
  });

  if (!storage || storage.getItem(storageKey)) {
    $toggle.trigger('click');
  }
};

/**
 * @} End of "ingroup admin_behaviors".
 */

})(jQuery);
;
