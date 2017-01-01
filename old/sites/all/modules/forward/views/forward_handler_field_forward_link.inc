<?php

/**
 * @file
 * Definition of forward_handler_field_forward_link.
 */

/**
 * Field handler to present a "forward this node" link
 *
 * @ingroup views_field_handlers
 */
class forward_handler_field_forward_link extends views_handler_field_node_link {
  function construct() {
    parent::construct();
  }

  function options_form(&$form, &$form_state) {
    parent::options_form($form, $form_state);

    // The link text is set by the render function
    $form['text']['#access'] = FALSE;
    // Prevent rewrite
    $form['alter']['#access'] = FALSE;
  }

  function render($values) {
    $content = '';
    if (user_access('access forward')) {
      $node = NULL;
      if ($this->entity_type == 'node') {
        foreach($this->entities as $node) {
          if ($values->nid == $node->nid) {
            break;
          }
        }
      }

      if (isset($node->type) && variable_get('forward_display_' . $node->type, 1)) {
        $content = theme('forward_link', array('node' => $node));
      }
    }
    return $content;
  }
}
