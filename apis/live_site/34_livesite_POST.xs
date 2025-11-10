// Add LiveSite record
query livesite verb=POST {
  input {
    dblink {
      table = "site_content"
    }
  }

  stack {
    db.add site_content {
      data = {created_at: "now"}
    } as $livesite
  }

  response = $livesite
}