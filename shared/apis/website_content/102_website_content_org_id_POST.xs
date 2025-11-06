// Add website_content record
query "website_content/{org_id}" verb=POST {
  input {
    dblink {
      table = "website_content"
    }
  }

  stack {
    db.add website_content {
      data = {created_at: "now"}
    } as $website_content
  }

  response = $website_content
}