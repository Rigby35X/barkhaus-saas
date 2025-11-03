table Shelters {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text? Shelter_Name?
    text? Location?
    text? Contact_Name?
    text? Contact_Phone?
    text? Contact_Email?
    decimal? Capacity?
    attachment[]? Photos?
    text? Notes?
    int[]? Dogs? {
      table = "Dogs"
    }
  
    int? Current_Dog_Count?
    text? Occupancy_Rate?
    text? Most_Recent_Intake_Date?
    int[]? Adoptions? {
      table = "Adoptions"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}