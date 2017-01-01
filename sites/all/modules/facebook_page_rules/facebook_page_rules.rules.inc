<?php
/**
 * @file
 * Provide better intergration with the rules module.
 */

/**
 * Implements hook_rules_action_info().
 */
function facebook_page_rules_rules_action_info() {
  $fields = array();
  $actions = array();
  $fields = array(
            'message' => array(
              'type' => 'text',
		      'optional' => TRUE,
              'label' => t('Message'),
              'description' => t("The message to post on Facebook wall."),
            ),
		    'link' => array(
              'type' => 'text',
		      'optional' => TRUE,
              'label' => t('Link to post'),
              'description' => t("The link to post."),
            ),
		    'name' => array(
              'type' => 'text',
		      'optional' => TRUE,
              'label' => t('Name of the link'),
              'description' => t("The name of the link. If not specified, default would be used."),
            ),
		    'caption' => array(
              'type' => 'text',
		      'optional' => TRUE,
              'label' => t('Caption of the link.'),
              'description' => t("The caption of the link (appears beneath the link name). If not specified, default would be used."),
            ),
		    'description' => array(
              'type' => 'text',
		      'optional' => TRUE,
              'label' => t('Description of the link.'),
              'description' => t("A description of the link (appears beneath the link caption). If not specified, default would be used."),
            ),
            );
	$actions['facebook_page_rules_post_to_wall_as_admin'] = array(
      'label' => t("Post an update on facebook page as admin."),
      'group' => t('Facebook'),
      'parameter' => $fields,
    );
	if (module_exists('facebook_rules')) {
	  $actions['facebook_page_rules_post_to_wall_as_user'] = array(
        'label' => t("Post an update on facebook page as user."),
        'group' => t('Facebook'),
        'parameter' => $fields,
      );
	}
  return $actions;
}

/**
 * Callback for hook_rules_action_info().
 */
function facebook_page_rules_post_to_wall_as_admin($message, $link, $name, $caption, $description) {

  $access_token = variable_get('facebook_page_rules_page_token', NULL);
  facebook_page_rules_post($message, $link, $name, $caption, $description, $access_token);
}

/**
 * Callback for hook_rules_action_info().
 */
function facebook_page_rules_post_to_wall_as_user($message, $link, $name, $caption, $description) {

  if (module_exists('facebook_rules')) {
    global $user;
	$access_token_status = facebook_rules_get_token_status($user->uid);
	if ($access_token_status == 1) {
      $access_token = facebook_rules_get_token($user->uid);
	  facebook_page_rules_post($message, $link, $name, $caption, $description, $access_token);
	}
	else {
	  // Set a variable upon unsuccessful post attempt.
      facebook_rules_set_token_status($user->uid, '1');
      $link = fboauth_action_link_properties('facebook_rules_generate_token');
      $token_url = url($link['href'], array('query' => $link['query']));
      drupal_set_message(t("It seems your access token for Facebook has expired. !link to renew.", array('!link' => l('Click here', $token_url))), 'warning');
      //TODO: store failed message in session. patches welcome :)
	}
  }
  
}