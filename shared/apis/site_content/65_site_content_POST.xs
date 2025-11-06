// Add site_content record
query site_content verb=POST {
  input {
    dblink {
      table = "site_content"
    }
  }

  stack {
    db.add site_content {
      data = {
        created_at         : "now"
        site_name          : $input.site_name
        tagline            : $input.tagline
        phone              : $input.phone
        email              : $input.email
        hours_json         : $input.hours_json
        facebook_url       : $input.facebook_url
        instagram_url      : $input.instagram_url
        donation_link      : $input.donation_link
        petfinder_enabled  : $input.petfinder_enabled
        adoptapet_enabled  : $input.adoptapet_enabled
        givebutter_enabled : $input.givebutter_enabled
        givebutter_url     : $input.givebutter_url
        donorbox_enabled   : $input.donorbox_enabled
        donorbox_url       : $input.donorbox_url
        gofundme_enabled   : $input.gofundme_enabled
        gofundme_url       : $input.gofundme_url
        bloomerang_enabled : $input.bloomerang_enabled
        petfundr_enabled   : $input.petfundr_enabled
        cuddly_enabled     : $input.cuddly_enabled
        tenant_id          : $input.tenant_id
        mission_statement  : $input.mission_statement
        address_line1      : $input.address_line1
        address_line2      : $input.address_line2
        twitter_url        : $input.twitter_url
        tiktok_url         : $input.tiktok_url
        google_analytics_id: $input.google_analytics_id
        meta_description   : $input.meta_description
        meta_keywords      : $input.meta_keywords
      }
    } as $model
  }

  response = $model
}