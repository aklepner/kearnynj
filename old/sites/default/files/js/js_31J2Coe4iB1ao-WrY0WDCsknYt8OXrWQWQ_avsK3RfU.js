(function ($) {
  $(document).ready(function(){
    $('a.service-links-facebook-widget').each(function(){
      $(this).attr('share_url', $(this).attr('rel'));
      $(this).attr('expr:share_url', $(this).attr('rel'));
      $(this).attr('type', Drupal.settings.ws_fs.type);
      $(this).attr('name', 'fb_share');
    });

    if (Drupal.settings.ws_fs.fix_count) {
      fix_no_count = function() {
        $(".fb_share_no_count .fb_share_count_inner").text("0");
        $(".fb_share_no_count").removeClass("fb_share_no_count");
      }
      var to = window.setTimeout(fix_no_count, 1500);
    }
  });
})(jQuery);
;
(function ($) {
  $(document).ready(function(){
    $('a.service-links-linkedin-share-button').each(function(){
      var script_obj = document.createElement('script');
      script_obj.type = 'IN/Share';
      script_obj.setAttribute("data-url", $(this).attr('href'));
      if (Drupal.settings.ws_lsb.countmode != '') {
        script_obj.setAttribute("data-counter", Drupal.settings.ws_lsb.countmode);
      }

      $(this).replaceWith(script_obj);
    });
  });
})(jQuery);
;
;
