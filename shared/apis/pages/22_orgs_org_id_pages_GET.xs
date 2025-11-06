// Query all Pages records
query "orgs/{orgId}/pages" verb=GET {
  input {
    int tenant_id {
      table = "pages"
    }
  
    text slug? filters=trim
  }

  stack {
    db.query pages {
      where = $db.pages.tenant_id ==? $input.tenant_id && $db.pages.slug ==? $input.slug
      return = {type: "list"}
    } as $pages
  }

  response = $pages
}