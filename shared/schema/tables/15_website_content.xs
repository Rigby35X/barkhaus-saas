table website_content {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  
    // Links to organizations table
    int org_id? {
      table = "organizations"
    }
  
    // Page identifier (homepage, about, contact)
    text page_slug? filters=trim
  
    // Section identifier (hero, about_us, cta, etc.)
    text section_key? filters=trim
  
    // Main headline/title
    text headline? filters=trim
  
    // Subtitle or tagline
    text subheadline? filters=trim
  
    // Main content/description
    text body_text? filters=trim
  
    // Call-to-action button text
    text button_text? filters=trim
  
    // Button URL/link
    text button_link? filters=trim
  
    text button2_text? filters=trim
    text button2_link? filters=trim
  
    // Background image URL
    text background_image_url? filters=trim
  
    // Main featured image URL
    text featured_image_url? filters=trim
  
    // Second image URL
    text secondary_image_url? filters=trim
  
    // Whether section shows on website
    bool is_visible?
  
    // Display order of sections
    int sort_order?
  
    // Timestamp of the last update
    timestamp updated_at?
  
    // Title or name of service 1
    text service_1? filters=trim
  
    // Description for service 1
    text service_1_description? filters=trim
  
    // Title or name of service 2
    text service_2? filters=trim
  
    // Description for service 2
    text service_2_description? filters=trim
  
    // Title or name of service 3
    text service_3? filters=trim
  
    // Description for service 3
    text service_3_description? filters=trim
  
    // First frequently asked question
    text faq_question_1? filters=trim
  
    // Answer to the first FAQ
    text faq_answer_1? filters=trim
  
    // Second frequently asked question
    text faq_question_2? filters=trim
  
    // Answer to the second FAQ
    text faq_answer_2? filters=trim
  
    // Third frequently asked question
    text faq_question_3? filters=trim
  
    // Answer to the third FAQ
    text faq_answer_3? filters=trim
  
    // Fourth frequently asked question
    text faq_question_4? filters=trim
  
    // Answer to the fourth FAQ
    text faq_answer_4? filters=trim
  
    // Fifth frequently asked question
    text faq_question_5? filters=trim
  
    // Answer to the fifth FAQ
    text faq_answer_5? filters=trim
  
    // Indicates if Google Reviews section is enabled
    bool google_reviews_enabled?
  
    // Google My Business ID for reviews integration
    text google_business_id? filters=trim
  
    text footer_organization_name? filters=trim
    text footer_address_line_one? filters=trim
    text footer_address_line_two? filters=trim
    text footer_address_city? filters=trim
    text footer_address_state? filters=trim
    text footer_address_zip? filters=trim
    text footer_phone?
    email footer_email? filters=trim|lower
    text footer_copyright? filters=trim
    text footer_ein? filters=trim
    text meta_title? filters=trim
    text meta_description? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}