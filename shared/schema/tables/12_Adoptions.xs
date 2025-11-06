table Adoptions {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text? Adopter_Name?
    timestamp? Adoption_Date?
    int[]? Dog?
    decimal? Adoption_Fee?
    enum? Payment_Method? {
      values = ["Cash", "Check", "Credit Card", "Online Payment"]
    }
  
    attachment[]? Adoption_Contract_Photo?
    text? Notes?
    int[]? Shelter? {
      table = "Shelters"
    }
  
    text? Adoption_Fee_Paid?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}