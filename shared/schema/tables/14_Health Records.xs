table "Health Records" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text? Name?
    int[]? Dog? {
      table = "Dogs"
    }
  
    timestamp? Health_Check_Date?
    bool? Veterinary_Approval?
    enum? Spay_Neuter_Status? {
      values = ["Intact", "Spayed"]
    }
  
    enum[]? Vaccinations? {
      values = ["Distemper", "Leptospirosis", "Parvovirus", "Rabies"]
    }
  
    text? Medical_Notes?
    attachment[]? Health_Photos?
    timestamp? Next_Checkup_Due?
    text? Allergies_Chronic_Conditions?
    text? Upcoming_Checkup_in_Days?
    text? Is_Overdue_for_Checkup?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}