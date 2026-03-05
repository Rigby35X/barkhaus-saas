// DELETE /applications/{id}
// Delete an application by ID

var query = $db.applications.filter($input.id).single()

if (query == null) {
  return {
    status: 404,
    body: {
      error: "Application not found"
    }
  }
}

$db.applications.filter($input.id).delete()

return {
  success: true,
  message: "Application deleted"
}
