// Query all website_content records
query "website_content/{org_id}" verb=GET {
  input {
    int id?=1
    int org_id?=1 {
      table = "organizations"
    }
  }

  stack {
    db.query website_content {
      where = $input.id == $input.id
      return = {type: "list"}
    } as $website_content
  }

  response = $website_content|sort:"":"number":true
}