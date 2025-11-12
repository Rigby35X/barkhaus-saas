// Add website_content record
query "website_content/{org_id}" verb=POST {
  input {
    int org_id?=1 {
      table = "organizations"
    }
    text page_slug?
    text section_key?
    text headline?
    text subheadline?
    text body_text?
    text button_text?
    text button_link?
    text button2_text?
    text button2_link?
    text background_image_url?
    text featured_image_url?
    text secondary_image_url?
    bool is_visible?=true
    int sort_order?
    text service_1?
    text service_1_description?
    text service_2?
    text service_2_description?
    text service_3?
    text service_3_description?
    text faq_question_1?
    text faq_answer_1?
    text faq_question_2?
    text faq_answer_2?
    text faq_question_3?
    text faq_answer_3?
    text faq_question_4?
    text faq_answer_4?
    text faq_question_5?
    text faq_answer_5?
    bool google_reviews_enabled?
    text google_business_id?
    text footer_organization_name?
    text footer_address_line_one?
    text footer_address_line_two?
    text footer_address_city?
    text footer_address_state?
    text footer_address_zip?
    text footer_phone?
    email footer_email?
    text footer_copyright?
    text footer_ein?
    text meta_title?
    text meta_description?
  }

  stack {
    db.add website_content {
      data = {
        created_at              : "now"
        org_id                  : $input.org_id
        page_slug               : $input.page_slug
        section_key             : $input.section_key
        headline                : $input.headline
        subheadline             : $input.subheadline
        body_text               : $input.body_text
        button_text             : $input.button_text
        button_link             : $input.button_link
        button2_text            : $input.button2_text
        button2_link            : $input.button2_link
        background_image_url    : $input.background_image_url
        featured_image_url      : $input.featured_image_url
        secondary_image_url     : $input.secondary_image_url
        is_visible              : $input.is_visible
        sort_order              : $input.sort_order
        service_1               : $input.service_1
        service_1_description   : $input.service_1_description
        service_2               : $input.service_2
        service_2_description   : $input.service_2_description
        service_3               : $input.service_3
        service_3_description   : $input.service_3_description
        faq_question_1          : $input.faq_question_1
        faq_answer_1            : $input.faq_answer_1
        faq_question_2          : $input.faq_question_2
        faq_answer_2            : $input.faq_answer_2
        faq_question_3          : $input.faq_question_3
        faq_answer_3            : $input.faq_answer_3
        faq_question_4          : $input.faq_question_4
        faq_answer_4            : $input.faq_answer_4
        faq_question_5          : $input.faq_question_5
        faq_answer_5            : $input.faq_answer_5
        google_reviews_enabled  : $input.google_reviews_enabled
        google_business_id      : $input.google_business_id
        footer_organization_name: $input.footer_organization_name
        footer_address_line_one : $input.footer_address_line_one
        footer_address_line_two : $input.footer_address_line_two
        footer_address_city     : $input.footer_address_city
        footer_address_state    : $input.footer_address_state
        footer_address_zip      : $input.footer_address_zip
        footer_phone            : $input.footer_phone
        footer_email            : $input.footer_email
        footer_copyright        : $input.footer_copyright
        footer_ein              : $input.footer_ein
        meta_title              : $input.meta_title
        meta_description        : $input.meta_description
      }
    } as $website_content
  }

  response = $website_content
}