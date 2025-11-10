// Add Pages record
query "orgs/{orgId}/pages/{id}" verb=POST {
  input {
    dblink {
      table = "pages"
    }
  }

  stack {
    db.add pages {
      data = {created_at: "now"}
    } as $pages
  }

  response = $pages
}