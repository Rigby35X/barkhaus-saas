table Dogs {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int org? {
      table = "organizations"
    }
  
    text? Code?
    text? Main_Photo?
    image? main_image?
    image? additional_image_1?
    image? additional_image_2?
    image? additional_image_3?
    image? additional_image_4?
    text? Dog_Name?
    text? Microchip_Number?
    bool? Is_Dog_Fixed?
    text? Reason_for_Delay_in_Spaying_Neutering?
    bool? Required_Spay_Neuter?
    text? SpayNeuterVoucher_Signature?
    text? Spay_Neuter_Voucher_Date?
    bool? Deposit_Waived?
    bool? Deposit_Received?
    bool? Deposit_Returned?
    text? Vaccinations?
    text? Veterinary_Approval?
    int[]? Shelter? {
      table = "Shelters"
    }
  
    int[]? Health? {
      table = "Health Records"
    }
  
    text? Financial_Responsibility?
    text? Microchip?
    text? Bathing?
    text? Introductions?
    text? Food?
    text? Treats?
    text? Frozen_Marrow_Bones?
    text? Acceptable_Toys?
    text? Kennel?
    text? Fecal_Test_Poop?
    text? Warning_Signs?
    text? Call_Us?
    text? AdoptionContract_Signature?
    text? AdoptionContract_Date?
    text? Dog_s_Original_Name?
    text? Kennel_Shelter_ID_Information?
    text? DogID?
    text? Litter_Name?
    text? Chip_Manufacturer?
    bool? Registered?
    timestamp? Pup_Birthday?
    decimal? Pup_is_currently_this_many_weeks_old?
    timestamp? Estimated_Adoption_Date?
    timestamp? Adoption_Date_Calculation?
    timestamp? Today_s_Date?
    timestamp? Intake_Date?
    enum? Gender? {
      values = ["Female", "Male"]
    }
  
    enum? Estimated_Size_When_Grown? {
      values = ["Large: 50-80 lbs", "Medium: 25-50 lbs"]
    }
  
    text? Breed?
    text? Markings?
    text? My_Story?
    int[]? Adoption_Record?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}