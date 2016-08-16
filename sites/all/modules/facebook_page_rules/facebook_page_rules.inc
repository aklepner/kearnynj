<?php

/**
 * Callback for hook_menu().
 */
function facebook_page_rules_settings_form($form, &$form_state) {
  $form['facebook_page_rules_markup'] = array(
    '#markup' => l('About', 'admin/help/facebook_page_rules'),
  );
  $form['facebook_page_rules_app_id'] = array(
    '#type' => 'textfield',
    '#title' => t('Facebook App ID/API key'),
    '#default_value' => variable_get('facebook_page_rules_app_id', NULL),
    '#description' => t('Enter App ID of your facebook app.'),
	'#required' => TRUE,
  );
  $form['facebook_page_rules_app_secret'] = array(
    '#type' => 'textfield',
    '#title' => t('Facebook App Secret'),
    '#default_value' => variable_get('facebook_page_rules_app_secret', NULL),
    '#description' => t('Enter App Secret of your facebook app.'),
	'#required' => TRUE,
  );
  $form['facebook_page_rules_page_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Facebook Page url'),
    '#default_value' => variable_get('facebook_page_rules_page_url', NULL),
    '#description' => t('Enter the url of the facebook page. (Requires page administrative rights.)<p>The url should be in format <em>http://www.facebook.com/[name]</em> or <em>http://www.facebook.com/pages/[name]/[id]</em>'),
	'#disabled' => variable_get('facebook_page_rules_app_secret', NULL)!= NULL ? FALSE : TRUE,
	'#required' => TRUE,
  );
  $form['facebook_page_rules_submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save configuration'),
    '#submit' => array('facebook_page_rules_page_submit'),
  );
  return $form;
}

/**
 * Submit handler for facebook_page_rules_page_token_submit.
 */
function facebook_page_rules_page_submit(&$form, $form_state) {
  variable_set('facebook_page_rules_app_id', $form_state['values']['facebook_page_rules_app_id']);
  variable_set('facebook_page_rules_app_secret', $form_state['values']['facebook_page_rules_app_secret']);
  variable_set('facebook_page_rules_page_url', $form_state['values']['facebook_page_rules_page_url']);

  facebook_page_rules_store_pageid($form_state['values']['facebook_page_rules_page_url']);
  facebook_page_rules_get_code($form_state['values']['facebook_page_rules_app_id']);

}

function facebook_page_rules_validate($access_token) {
  $f_page_id_list = array();
  $request_user_details = drupal_http_request('https://graph.facebook.com/me?access_token=' . $access_token);
  $returned_user_values = json_decode($request_user_details->data, TRUE);
  $request_account_details = drupal_http_request('https://graph.facebook.com/' . $returned_user_values['id'] . '/accounts?access_token=' . $access_token);
  $returned_account_values = json_decode($request_account_details->data, TRUE);
    foreach ($returned_account_values['data'] as $f_page) {
	  $f_page_id_list[] = $f_page['id'];
	  if ($f_page['id'] == variable_get('facebook_page_rules_pageid', NULL)) {
	    variable_set('facebook_page_rules_page_token', $f_page['access_token']);
		drupal_set_message(t('Configuration saved.'), 'status');
	  }
	}
  
  	if (!in_array(variable_get('facebook_page_rules_pageid', NULL), $f_page_id_list)) {
	  drupal_set_message(t('It seems you are not the admin of !page. To post to this page, you need to have the administrative rights. 
	  Kindly contact the page administrator for permissions.', array('!page' => l(variable_get('facebook_page_rules_page_url', NULL), variable_get('facebook_page_rules_page_url', NULL)))), 'warning');
	  variable_del('facebook_page_rules_page_url');	  
	}
}


/**
 * Store page ID.
 */
function facebook_page_rules_store_pageid($url) {

$url_string = explode('/', $url);
if (in_array('pages', $url_string)) {
  variable_set('facebook_page_rules_pageid', $url_string['5']);
}
else {
  $graph_url = str_replace('www', 'graph', $url);
  $request_value = drupal_http_request($graph_url);
  $returned_value = json_decode($request_value->data, TRUE);
    if ($request_value->code == 200) {
      variable_set('facebook_page_rules_pageid', $returned_value['id']);
    }
	else {
	  watchdog('facebook_page_rules', 'Message: :msg<br />Type: :type<br />Code: :code<br />User: :uid', array(':msg' => $returned_value['error']['message'], 
	  'type' => $returned_value['error']['type'], ':code' => $returned_value['error']['code']), WATCHDOG_ERROR);
	}
}

}
